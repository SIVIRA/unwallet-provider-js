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
  JsonRpcProvider,
  UnWalletConfig,
} from "./types";
import { WindowOpener } from "./window-opener";

const signerMethods = [
  "eth_requestAccounts",
  "eth_accounts",
  "eth_chainId",
  "eth_sign",
  "eth_signTypedData",
  "eth_signTypedData_v4",
  "eth_signTransaction",
  "eth_sendTransaction",
];

export class UnWalletProvider implements Eip1193Provider {
  private ACCOUNTS_CACHE_KEY = "unwallet_accounts";

  private config: Config;
  private unWalletConfig: UnWalletConfig;

  private eventEmitter: EventEmitter;
  private signerMethods: string[] = signerMethods;

  private ws: WebSocket | null = null;
  private connectionID: string | null = null;
  private accounts: Accounts | null = null;
  private jsonRpcProvider: JsonRpcProvider | null = null;

  private resolve: ((result: any) => void) | null = null;
  private reject: ((reason: any) => void) | null = null;

  private windowOpener: WindowOpener | null = null;

  constructor(config: Config) {
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

  private initPromiseArgs(): void {
    this.resolve = (result: any) => {};
    this.reject = (reason: any) => {};
  }

  private initWindowOpener(): void {
    if (typeof window === "undefined") {
      return;
    }

    this.windowOpener = new WindowOpener();
  }

  public _setAccounts(accounts: Accounts): void {
    this.accounts = accounts;
    this.setJsonRpcProvider(this.accounts.chainId);
  }

  public request<T = unknown>(args: Eip1193RequestArguments): Promise<T> {
    return new Promise(async (resolve, reject) => {
      if (this.signerMethods.includes(args.method)) {
        switch (args.method) {
          case "eth_requestAccounts":
            try {
              await this.connect();

              this.accounts = await this.requestAccounts();
              this.setJsonRpcProvider(this.accounts.chainId);
              if (this.config.allowAccountsCaching) {
                this.setAccountsCache(this.accounts);
              }

              const connectInfo: Eip1193ProviderConnectInfo = {
                chainId: `${this.accounts.chainId}`,
              };
              this.eventEmitter.emit("connect", connectInfo);

              resolve(this.accounts.addresses as any);
            } catch (e) {
              reject(e);
            }
            return;

          case "eth_accounts":
            resolve(this.accounts?.addresses as any);
            return;

          case "eth_chainId":
            resolve(this.accounts?.chainId as any);
            return;

          case "eth_sign":
            try {
              if (!this.isConnected()) {
                await this.connect();
              }
              const params = this.parseEthSignParams(args.params);
              resolve((await this.ethSign(params[1])) as any);
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
              resolve((await this.ethSignTypedData(params[1])) as any);
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
              resolve((await this.ethSignTypedDataV4(params[1])) as any);
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
              resolve((await this.ethSendTransaction(params[0])) as any);
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

  private isConnected(): boolean {
    return this.ws !== null && this.connectionID !== null;
  }

  private setJsonRpcProvider(chainId: number): void {
    if (!this.config.rpc || !(chainId in this.config.rpc)) {
      this.jsonRpcProvider = null;
      return;
    }

    this.jsonRpcProvider = new JsonRpcProvider(this.config.rpc[chainId]);
  }

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.unWalletConfig.wsAPIURL);
      this.ws.onerror = (event) => {
        reject("websocket connection failed");
      };
      this.ws.onopen = (event) => {
        this.getConnectionID();
      };
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "connectionID") {
          this.connectionID = msg.data.value;
          resolve();
          return;
        }
        this.handleWSMessage(msg);
      };
    });
  }

  private disconnect(): void {
    this.ws = null;
    this.connectionID = null;
    this.accounts = null;
  }

  private requestAccounts(): Promise<Accounts> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.openSignerWindow("/x/eth/requestAccounts");
    });
  }

  private ethSign(message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.openSignerWindow("/x/eth/sign", {
        message: message,
      });
    });
  }

  private ethSignTypedData(data: Eip712TypedData): Promise<string> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.openSignerWindow("/x/eth/signTypedData", {
        data: JSON.stringify(data),
      });
    });
  }

  private ethSignTypedDataV4(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.openSignerWindow("/x/eth/signTypedData", {
        data: data,
      });
    });
  }

  private ethSendTransaction(
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

  private getConnectionID(): void {
    this.sendWSMessage({
      action: "getConnectionID",
    });
  }

  private sendWSMessage(msg: any): void {
    this.ws!.send(JSON.stringify(msg));
  }

  private handleWSMessage(msg: any): void {
    switch (msg.type) {
      case "accounts":
      case "signature":
      case "transactionHash":
        if (msg.data.value === null) {
          this.reject!(providerRpcErrorRejected);
        } else {
          this.resolve!(msg.data.value);
        }
        this.initPromiseArgs();
        break;

      default:
        throw new Error(`unknown message type: ${msg.type}`);
    }
  }

  private openSignerWindow(path: string, params?: any): void {
    const width = screen.width / 2;
    const height = screen.height;
    const left = screen.width / 4;
    const top = 0;

    const url = new URL(`${this.unWalletConfig.baseURL}${path}`);
    url.searchParams.set("connectionID", this.connectionID!);
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

  private parseEthSignParams(
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

  private parseEthSignTypedDataParams(
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

  private parseEthSignTypedDataV4Params(
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

  private parseEthSendTransactionParams(
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

  private getAccountsCache(): Accounts | null {
    const accounts = localStorage.getItem(this.ACCOUNTS_CACHE_KEY);

    return accounts !== null ? JSON.parse(accounts) : null;
  }

  private setAccountsCache(accounts: Accounts): void {
    localStorage.setItem(this.ACCOUNTS_CACHE_KEY, JSON.stringify(accounts));
  }

  private removeAccountsCache(): void {
    localStorage.removeItem(this.ACCOUNTS_CACHE_KEY);
  }
}
