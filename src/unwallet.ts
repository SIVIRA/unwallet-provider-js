import { ethers } from "ethers";
import { TransactionRequest } from "@ethersproject/abstract-provider";
import { EventEmitter } from "events";
import {
  Address,
  createPublicClient,
  fromHex,
  http,
  isAddress,
  isHex,
  toHex,
} from "viem";
import { z } from "zod";

import {
  Config,
  Env,
  PublicRPCConfig,
  UnWalletConfig,
  envToUnWalletConfig,
} from "./config";
import { EIP1193ProviderRPCError } from "./eip1193";
import { UWError } from "./error";
import { Network } from "./network";
import { SnapshotManager } from "./snapshot";
import {
  Eip712TypedData,
  Eip1193EventType,
  Eip1193Provider,
  Eip1193ProviderConnectInfo,
  Eip1193RequestArguments,
  Eip3326SwitchEthereumChainParameter,
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

const ethRequestAccountsResponseSchema = z.object({
  chainID: z
    .string()
    .refine((val) => isHex(val), {
      abort: true,
      error: "Invalid hex string",
    })
    .transform((val) => fromHex(val, "number"))
    .pipe(z.number().int().positive()),
  addresses: z.array(
    z.string().refine((val) => isAddress(val), {
      abort: true,
      error: "Invalid EVM address",
    }),
  ),
});

type EthRequestAccountsResponse = z.infer<
  typeof ethRequestAccountsResponseSchema
>;

export class UnWalletProvider implements Eip1193Provider {
  private readonly env: Env;
  private readonly initialChainID: number | null;
  private readonly publicRPCConfig: PublicRPCConfig;

  private readonly snapshotManager: SnapshotManager;

  private network: Network | null = null;
  private addresses: Address[];

  protected eventEmitter: EventEmitter;
  protected signerMethods: string[] = signerMethods;

  protected ws: WebSocket | null = null;
  protected connectionId: string | null = null;

  protected resolve: ((result: any) => void) | null = null;
  protected reject: ((reason: any) => void) | null = null;

  protected windowOpener: WindowOpener | null = null;

  constructor(config?: Config) {
    const initialChainID = config?.initialChainID ?? null;

    this.env = config?.env ?? "prod";
    this.initialChainID = initialChainID;
    this.publicRPCConfig = config?.publicRPC ?? {};

    this.snapshotManager = new SnapshotManager({
      persistence: config?.persistence ?? "none",
      onPersistenceError: config?.onPersistenceError,
    });

    const snapshot = this.snapshotManager.load();

    const chainID = snapshot?.chainID ?? initialChainID;

    this.setUpNetwork(chainID);
    this.addresses = snapshot?.addresses ?? [];

    this.eventEmitter = new EventEmitter();

    this.initPromiseArgs();
    this.initWindowOpener();
  }

  private get unWalletConfig(): UnWalletConfig {
    return envToUnWalletConfig[this.env];
  }

  private setUpNetwork(chainID: number | null): void {
    if (chainID === null) {
      this.network = null;
      return;
    }

    const publicRPCClientConfig = this.publicRPCConfig[chainID];

    this.network = {
      chainID,
      publicRPCClient:
        publicRPCClientConfig !== undefined
          ? createPublicClient({
              transport: http(publicRPCClientConfig.url),
            })
          : null,
    };
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

              const resp = await this.requestAccounts();

              this.setUpNetwork(resp.chainID);
              this.addresses = resp.addresses;

              this.snapshotManager.save({
                chainID: resp.chainID,
                addresses: resp.addresses,
              });

              this.eventEmitter.emit("connect", {
                chainId: toHex(resp.chainID),
              } satisfies Eip1193ProviderConnectInfo);

              resolve(resp.addresses as T);
            } catch (e) {
              reject(e);
            }
            return;

          case "eth_accounts":
            resolve(this.addresses as T);
            return;

          case "eth_chainId":
            if (this.network === null) {
              reject(EIP1193ProviderRPCError.disconnected());
              return;
            }

            resolve(toHex(this.network.chainID) as T);
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
              resolve(sig as T);
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
              resolve(sig as T);
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
              resolve(sig as T);
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
              resolve(sig as T);
            } catch (e) {
              reject(e);
            }
            return;

          case "eth_signTransaction":
            reject(
              EIP1193ProviderRPCError.unsupportedMethod(
                "the provider does not support eth_signTransaction; use eth_sendTransaction instead",
                {
                  reference:
                    "https://github.com/MetaMask/metamask-extension/issues/2506#issuecomment-388575922",
                },
              ),
            );
            return;

          case "eth_sendTransaction":
            try {
              if (!this.isConnected()) {
                await this.connect();
              }
              const params = this.parseEthSendTransactionParams(args.params);
              const txHash = await this.ethSendTransaction(params[0]);
              resolve(txHash as T);
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
                args.params,
              );

              const chainId = fromHex(params[0].chainId, "number");

              await this.walletSwitchEthereumChain(chainId);

              this.setUpNetwork(chainId);

              this.snapshotManager.save({
                chainID: chainId,
                addresses: this.addresses,
              });

              this.eventEmitter.emit("chainChanged", toHex(chainId));

              resolve(null as T);
            } catch (e) {
              reject(e);
            }
            return;

          default:
            reject(
              EIP1193ProviderRPCError.unsupportedMethod(
                `the provider does not support ${args.method}`,
              ),
            );
            return;
        }
      }

      if (this.network === null) {
        reject(EIP1193ProviderRPCError.disconnected());
        return;
      }
      if (this.network.publicRPCClient === null) {
        reject(EIP1193ProviderRPCError.chainDisconnected());
        return;
      }

      resolve(
        await this.network.publicRPCClient.request<{ ReturnType: T }>({
          method: args.method,
          params: args.params ?? [],
        }),
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
    this.snapshotManager.remove();
    this.eventEmitter.emit(
      "disconnect",
      EIP1193ProviderRPCError.disconnected(),
    );
  }

  protected isConnected(): boolean {
    return this.ws !== null && this.connectionId !== null;
  }

  protected connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.unWalletConfig.xAPI.url);
      this.ws.onerror = (event) => {
        reject("websocket connection failed");
      };
      this.ws.onopen = (event) => {
        this.getConnectionId();
      };
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "connectionID") {
          this.connectionId = msg.value;
          resolve();
          return;
        }
        this.handleWSMessage(msg);
      };
    });
  }

  protected disconnect(): void {
    this.setUpNetwork(this.initialChainID);
    this.addresses = [];

    this.ws = null;
    this.connectionId = null;
  }

  protected requestAccounts(): Promise<EthRequestAccountsResponse> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.openWallet("/x/eth/requestAccounts");
    });
  }

  protected ethSign(args: {
    account: string;
    message: string;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.openWallet("/x/eth/sign", {
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
      this.openWallet("/x/eth/signTypedData", {
        account: args.account,
        data: args.data,
      });
    });
  }

  protected ethSendTransaction(
    transaction: ethers.providers.TransactionRequest,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.openWallet("/x/eth/sendTransaction", {
        transaction: JSON.stringify(transaction),
      });
    });
  }

  protected walletSwitchEthereumChain(chainId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.openWallet("/x/wallet/switchEthereumChain", {
        chainID: toHex(chainId),
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
        let resp: EthRequestAccountsResponse;
        {
          const result = ethRequestAccountsResponseSchema.safeParse(msg.value);
          if (!result.success) {
            this.reject!(
              new UWError(
                "INVALID_RESPONSE",
                `invalid payload: ${z.prettifyError(result.error)}`,
              ),
            );
            return;
          }

          resp = result.data;
        }

        this.resolve!(resp);
        break;

      case "signature":
        this.resolve!(msg.value);
        break;

      case "transactionHash":
        this.resolve!(msg.value);
        break;

      case "null":
        this.resolve!(msg.value);
        break;

      case "error":
        switch (msg.value) {
          case "rejected":
            this.reject!(EIP1193ProviderRPCError.userRejectedRequest());
            break;

          default:
            throw new Error(msg.value);
        }
        break;

      default:
        throw new Error(`unknown message type: ${msg.type}`);
    }

    this.initPromiseArgs();
  }

  protected openWallet(path: string, params?: any): void {
    const width = screen.width / 2;
    const height = screen.height;
    const left = screen.width / 4;
    const top = 0;

    const url = new URL(path, this.unWalletConfig.frontend.origin);
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
      this.windowOpener!.showDialog(url, target, features);
    }
  }

  public on(
    eventType: Eip1193EventType,
    listener: (...args: any[]) => void,
  ): void {
    this.eventEmitter.on(eventType, listener);
  }

  public removeListener(
    eventType: Eip1193EventType,
    listener: (...args: any[]) => void,
  ): void {
    this.eventEmitter.removeListener(eventType, listener);
  }

  protected parsePersonalSignParams(
    params?: object | readonly unknown[],
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
    params?: object | readonly unknown[],
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
    params?: object | readonly unknown[],
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
    params?: object | readonly unknown[],
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
    params?: object | readonly unknown[],
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
    params?: object | readonly unknown[],
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
