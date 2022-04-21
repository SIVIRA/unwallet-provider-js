import { ethers } from "ethers";
import { TransactionRequest } from "@ethersproject/abstract-provider";
import { EventEmitter } from "events";

import { unWalletConfigs } from "./configs";
import {
  providerRpcErrorRejected,
  providerRpcErrorUnsupported,
  providerRpcErrorDisconnected,
} from "./errors";
import {
  Accounts,
  Config,
  Eip712TypedData,
  Eip1193EventType,
  Eip1193Provider,
  Eip1193ProviderConnectInfo,
  Eip1193RequestArguments,
  Eip3326SwitchEthereumChainParameter,
  JsonRpcProvider,
  UnWalletConfig,
} from "./types";
import { WindowOpener } from "./window-opener";

const signerMethods = [
  "eth_requestAccounts",
  "eth_accounts",
  "eth_chainId",
  "personal_sign",
  "eth_sign",
  "eth_signTypedData",
  "eth_signTypedData_v4",
  "eth_signTransaction",
  "eth_sendTransaction",
  "wallet_switchEthereumChain",
];

export class UnWalletProvider implements Eip1193Provider {
  protected ACCOUNTS_CACHE_KEY = "unwallet_accounts";

  protected config: Config;
  protected unWalletConfig: UnWalletConfig;

  protected eventEmitter: EventEmitter;
  protected signerMethods: string[] = signerMethods;

  protected ws: WebSocket | null = null;
  protected connectionId: string | null = null;
  protected accounts: Accounts | null = null;
  protected jsonRpcProvider: JsonRpcProvider | null = null;

  protected resolve: ((result: any) => void) | null = null;
  protected reject: ((reason: any) => void) | null = null;

  protected windowOpener: WindowOpener | null = null;

  constructor(config?: Config) {
    if (config === undefined) {
      config = {};
    }

    if (config.env === undefined) {
      config.env = "prod";
    }
    if (config.allowAccountsCaching === undefined) {
      config.allowAccountsCaching = false;
    }

    if (!(config.env in unWalletConfigs)) {
      throw new Error("invalid env");
    }

    this.config = config;
    this.unWalletConfig = unWalletConfigs[config.env!];

    this.eventEmitter = new EventEmitter();

    if (config.allowAccountsCaching) {
      this.accounts = this.getAccountsCache();
    }

    this.initPromiseArgs();
    this.initWindowOpener();
  }

  protected initPromiseArgs(): void {
    this.resolve = (result: any) => {};
    this.reject = (reason: any) => {};
  }

  protected initWindowOpener(): void {
    if (typeof window === "undefined") {
      return;
    }

    this.windowOpener = new WindowOpener();
  }

  public request<T = unknown>(args: Eip1193RequestArguments): Promise<T> {
    return new Promise(async (resolve, reject) => {
      if (this.signerMethods.includes(args.method)) {
        switch (args.method) {
          case "eth_requestAccounts":
            try {
              await this.connect();

              const accounts = await this.requestAccounts();
              this.setAccounts(accounts);

              const connectInfo: Eip1193ProviderConnectInfo = {
                chainId: accounts.chainId.toHexString(),
              };
              this.eventEmitter.emit("connect", connectInfo);

              resolve(accounts.addresses as any);
            } catch (e) {
              reject(e);
            }
            return;

          case "eth_accounts":
            resolve(this.accounts?.addresses as any);
            return;

          case "eth_chainId":
            resolve(this.accounts?.chainId.toHexString() as any);
            return;

          case "personal_sign":
            try {
              if (!this.isConnected()) {
                await this.connect();
              }
              const params = this.parsePersonalSignParams(args.params);
              const sig = await this.ethSign({
                account: params[1],
                message: params[0],
              });
              resolve(sig as any);
            } catch (e) {
              reject(e);
            }
            return;

          case "eth_sign":
            try {
              if (!this.isConnected()) {
                await this.connect();
              }
              const params = this.parseEthSignParams(args.params);
              const sig = await this.ethSign({
                account: params[0],
                message: params[1],
              });
              resolve(sig as any);
            } catch (e) {
              reject(e);
            }
            return;

          case "eth_signTypedData":
            try {
              if (!this.isConnected()) {
                await this.connect();
              }
              const params = this.parseEthSignTypedDataParams(args.params);
              const sig = await this.ethSignTypedData({
                account: params[0],
                data: JSON.stringify(params[1]),
              });
              resolve(sig as any);
            } catch (e) {
              reject(e);
            }
            return;

          case "eth_signTypedData_v4":
            try {
              if (!this.isConnected()) {
                await this.connect();
              }
              const params = this.parseEthSignTypedDataV4Params(args.params);
              const sig = await this.ethSignTypedData({
                account: params[0],
                data: params[1],
              });
              resolve(sig as any);
            } catch (e) {
              reject(e);
            }
            return;

          case "eth_signTransaction":
            const err = providerRpcErrorUnsupported;
            err.message +=
              " (see https://github.com/MetaMask/metamask-extension/issues/2506#issuecomment-388575922)";
            reject(err);
            return;

          case "eth_sendTransaction":
            try {
              if (!this.isConnected()) {
                await this.connect();
              }
              const params = this.parseEthSendTransactionParams(args.params);
              const txHash = await this.ethSendTransaction(params[0]);
              resolve(txHash as any);
            } catch (e) {
              reject(e);
            }
            return;

          case "wallet_switchEthereumChain":
            try {
              if (!this.isConnected()) {
                await this.connect();
              }
              const params = this.parseWalletSwitchEthereumChainParams(
                args.params
              );

              const chainId = ethers.BigNumber.from(params[0].chainId);
              await this.walletSwitchEthereumChain(chainId);
              this.setAccounts({
                chainId: chainId,
                addresses: this.accounts!.addresses,
              });

              this.eventEmitter.emit("chainChanged", chainId.toHexString());

              resolve(null as any);
            } catch (e) {
              reject(e);
            }
            return;

          default:
            reject(providerRpcErrorUnsupported);
            return;
        }
      }

      if (!this.jsonRpcProvider) {
        reject("provider RPC URL not found");
        return;
      }

      resolve(
        await this.jsonRpcProvider.send(
          args.method,
          args.params ? (args.params as any) : []
        )
      );
    });
  }

  public async enable(): Promise<string[]> {
    return (await this.request({
      method: "eth_requestAccounts",
    })) as string[];
  }

  public async disable(): Promise<void> {
    this.disconnect();
    this.removeAccountsCache();
    this.eventEmitter.emit("disconnect", providerRpcErrorDisconnected);
  }

  protected isConnected(): boolean {
    return this.ws !== null && this.connectionId !== null;
  }

  protected setAccounts(accounts: Accounts): void {
    this.accounts = accounts;
    this.setJsonRpcProvider(accounts.chainId);
    if (this.config.allowAccountsCaching) {
      this.setAccountsCache(accounts);
    }
  }

  protected setJsonRpcProvider(chainId: ethers.BigNumber): void {
    if (!this.config.rpc || !(chainId.toNumber() in this.config.rpc)) {
      this.jsonRpcProvider = null;
      return;
    }

    this.jsonRpcProvider = new JsonRpcProvider(
      this.config.rpc[chainId.toNumber()]
    );
  }

  protected getAccountsCache(): Accounts | null {
    const accounts = localStorage.getItem(this.ACCOUNTS_CACHE_KEY);

    return accounts !== null ? JSON.parse(accounts) : null;
  }

  protected setAccountsCache(accounts: Accounts): void {
    localStorage.setItem(this.ACCOUNTS_CACHE_KEY, JSON.stringify(accounts));
  }

  protected removeAccountsCache(): void {
    localStorage.removeItem(this.ACCOUNTS_CACHE_KEY);
  }

  protected connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.unWalletConfig.wsAPIURL);
      this.ws.onerror = (event) => {
        reject("websocket connection failed");
      };
      this.ws.onopen = (event) => {
        this.getConnectionId();
      };
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "connectionID") {
          this.connectionId = msg.data.value;
          resolve();
          return;
        }
        this.handleWSMessage(msg);
      };
    });
  }

  protected disconnect(): void {
    this.ws = null;
    this.connectionId = null;
    this.accounts = null;
  }

  protected requestAccounts(): Promise<Accounts> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.openSignerWindow("/x/eth/requestAccounts");
    });
  }

  protected ethSign(args: {
    account: string;
    message: string;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.openSignerWindow("/x/eth/sign", {
        account: args.account,
        message: args.message,
      });
    });
  }

  protected ethSignTypedData(args: {
    account: string;
    data: string;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.openSignerWindow("/x/eth/signTypedData", {
        account: args.account,
        data: args.data,
      });
    });
  }

  protected ethSendTransaction(
    transaction: ethers.providers.TransactionRequest
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.openSignerWindow("/x/eth/sendTransaction", {
        transaction: JSON.stringify(transaction),
      });
    });
  }

  protected walletSwitchEthereumChain(
    chainId: ethers.BigNumber
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.openSignerWindow("/x/wallet/switchEthereumChain", {
        chainID: chainId.toHexString(),
      });
    });
  }

  protected getConnectionId(): void {
    this.sendWSMessage({
      action: "getConnectionID",
    });
  }

  protected sendWSMessage(msg: any): void {
    this.ws!.send(JSON.stringify(msg));
  }

  protected handleWSMessage(msg: any): void {
    switch (msg.type) {
      case "accounts":
        if (msg.data.value === null) {
          this.reject!(providerRpcErrorRejected);
        } else {
          this.resolve!({
            chainId: ethers.BigNumber.from(msg.data.value.chainID),
            addresses: msg.data.value.addresses,
          });
        }
        this.initPromiseArgs();
        break;

      case "signature":
      case "transactionHash":
        if (msg.data.value === null) {
          this.reject!(providerRpcErrorRejected);
        } else {
          this.resolve!(msg.data.value);
        }
        this.initPromiseArgs();
        break;

      case "success":
        if (msg.data.value === false) {
          this.reject!(providerRpcErrorRejected);
        } else {
          this.resolve!(true);
        }
        this.initPromiseArgs();
        break;

      default:
        throw new Error(`unknown message type: ${msg.type}`);
    }
  }

  protected openSignerWindow(path: string, params?: any): void {
    const width = screen.width / 2;
    const height = screen.height;
    const left = screen.width / 4;
    const top = 0;

    const url = new URL(`${this.unWalletConfig.baseURL}${path}`);
    url.searchParams.set("connectionID", this.connectionId!);
    if (params !== undefined) {
      for (const key of Object.keys(params)) {
        url.searchParams.set(key, params[key]);
      }
    }

    const target = "_blank";
    const features = `width=${width},height=${height},left=${left},top=${top}`;

    const signerWindowRef = window.open(url, target, features);
    if (signerWindowRef === null) {
      this.windowOpener!.showDialog();
      this.windowOpener!.setDestination(url, target, features);
    }
  }

  public on(
    eventType: Eip1193EventType,
    listener: (...args: any[]) => void
  ): void {
    this.eventEmitter.on(eventType, listener);
  }

  public removeListener(
    eventType: Eip1193EventType,
    listener: (...args: any[]) => void
  ): void {
    this.eventEmitter.removeListener(eventType, listener);
  }

  protected parsePersonalSignParams(
    params?: object | readonly unknown[]
  ): [string, string] {
    if (params === undefined) {
      throw new Error("params undefined");
    }
    if (!Array.isArray(params) || params.length !== 2) {
      throw new Error("invalid params");
    }
    if (!ethers.utils.isHexString(params[0])) {
      throw new Error("invalid message");
    }
    if (!ethers.utils.isAddress(params[1])) {
      throw new Error("invalid account");
    }

    return [params[0], params[1]];
  }

  protected parseEthSignParams(
    params?: object | readonly unknown[]
  ): [string, string] {
    if (params === undefined) {
      throw new Error("params undefined");
    }
    if (!Array.isArray(params) || params.length !== 2) {
      throw new Error("invalid params");
    }
    if (!ethers.utils.isAddress(params[0])) {
      throw new Error("invalid account");
    }
    if (!ethers.utils.isHexString(params[1])) {
      throw new Error("invalid message");
    }

    return [params[0], params[1]];
  }

  protected parseEthSignTypedDataParams(
    params?: object | readonly unknown[]
  ): [string, Eip712TypedData] {
    if (params === undefined) {
      throw new Error("params undefined");
    }
    if (!Array.isArray(params) || params.length !== 2) {
      throw new Error("invalid params");
    }
    if (!ethers.utils.isAddress(params[0])) {
      throw new Error("invalid account");
    }
    if (typeof params[1] !== "object" || Array.isArray(params[1])) {
      throw new Error("invalid typed data");
    }
    for (const field of ["types", "domain", "message"]) {
      if (!(field in params[1])) {
        throw new Error(`invalid type data: "${field}" undefined`);
      }
    }
    if ("EIP712Domain" in params[1].types) {
      delete params[1].types.EIP712Domain;
    }

    return [params[0], params[1]];
  }

  protected parseEthSignTypedDataV4Params(
    params?: object | readonly unknown[]
  ): [string, string] {
    if (params === undefined) {
      throw new Error("params undefined");
    }
    if (!Array.isArray(params) || params.length !== 2) {
      throw new Error("invalid params");
    }
    if (!ethers.utils.isAddress(params[0])) {
      throw new Error("invalid account");
    }
    if (typeof params[1] !== "string") {
      throw new Error("invalid typed data");
    }

    let typedData;
    try {
      typedData = JSON.parse(params[1]);
    } catch (e) {
      throw new Error("invalid typed data");
    }

    for (const field of ["types", "domain", "message"]) {
      if (!(field in typedData)) {
        throw new Error(`invalid type data: "${field}" undefined`);
      }
    }
    if ("EIP712Domain" in typedData.types) {
      delete typedData.types.EIP712Domain;
    }

    return [params[0], JSON.stringify(typedData)];
  }

  protected parseEthSendTransactionParams(
    params?: object | readonly unknown[]
  ): [TransactionRequest] {
    if (params === undefined) {
      throw new Error("params undefined");
    }
    if (!Array.isArray(params) || params.length !== 1) {
      throw new Error("invalid params");
    }
    if (typeof params[0] !== "object" || Array.isArray(params[0])) {
      throw new Error("invalid transaction");
    }
    if (!("to" in params[0])) {
      throw new Error(`invalid transaction: "to" undefined`);
    }
    if (!ethers.utils.isAddress(params[0].to)) {
      throw new Error(`invalid transaction: invalid "to"`);
    }
    for (const field of ["gas", "gasPrice", "value"]) {
      if (field in params[0] && !ethers.utils.isHexString(params[0][field])) {
        throw new Error(`invalid transaction: invalid "${field}"`);
      }
    }

    return [params[0]];
  }

  protected parseWalletSwitchEthereumChainParams(
    params?: object | readonly unknown[]
  ): [Eip3326SwitchEthereumChainParameter] {
    if (params === undefined) {
      throw new Error("params undefined");
    }
    if (!Array.isArray(params) || params.length !== 1) {
      throw new Error("invalid params");
    }
    if (typeof params[0] !== "object" || Array.isArray(params[0])) {
      throw new Error("invalid network");
    }
    if (!("chainId" in params[0])) {
      throw new Error(`invalid network: "chainId" undefined`);
    }
    if (!ethers.utils.isHexString(params[0].chainId)) {
      throw new Error(`invalid network: invalid "chainId"`);
    }

    return [params[0]];
  }
}
