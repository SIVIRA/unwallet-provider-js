import { ethers } from "ethers";
import { TransactionRequest } from "@ethersproject/abstract-provider";
import { EventEmitter } from "events";

import { dAuthConfigs } from "./configs";
import {
  Config,
  DAuthConfig,
  Eip712TypedData,
  Eip1193EventType,
  Eip1193Provider,
  Eip1193ProviderConnectInfo,
  Eip1193RequestArguments,
  JsonRpcProvider,
} from "./types";

const signerMethods = [
  "eth_requestAccounts",
  "eth_accounts",
  "eth_chainId",
  "eth_sign",
  "eth_signTypedData",
  "eth_signTransaction",
  "eth_sendTransaction",
];

export class DAuthProvider implements Eip1193Provider {
  private config: Config;
  private dAuthConfig: DAuthConfig;

  private eventEmitter: EventEmitter;
  private jsonRpcProvider: JsonRpcProvider | null = null;
  private signerMethods: string[] = signerMethods;

  private ws: WebSocket | null = null;
  private connectionID: string | null = null;
  private accounts: string[] | null = null;

  private resolve: (result: any) => void;
  private reject: (reason: any) => void;

  constructor(config: Config) {
    if (!config.env) {
      config.env = "prod";
    }
    if (!(config.env in dAuthConfigs)) {
      throw new Error("invalid env");
    }

    this.config = config;
    this.dAuthConfig = dAuthConfigs[config.env!];
    this.eventEmitter = new EventEmitter();
    this.setJsonRpcProvider(config.chainId);
    this.resolve = (result: any) => {};
    this.reject = (reason: any) => {};
  }

  private initPromiseArgs(): void {
    this.resolve = (result: string) => {};
    this.reject = (reason: any) => {};
  }

  private setJsonRpcProvider(chainId: number): void {
    if (!this.config.rpc || !(chainId in this.config.rpc)) {
      this.jsonRpcProvider = null;
      return;
    }

    this.jsonRpcProvider = new JsonRpcProvider(this.config.rpc[chainId]);
  }

  public request<T = unknown>(args: Eip1193RequestArguments): Promise<T> {
    return new Promise(async (resolve, reject) => {
      if (this.signerMethods.includes(args.method)) {
        switch (args.method) {
          case "eth_requestAccounts":
            try {
              await this.connect();
              this.accounts = await this.requestAccounts();
              const connectInfo: Eip1193ProviderConnectInfo = {
                chainId: `${this.config.chainId}`,
              };
              this.eventEmitter.emit("connect", connectInfo);
              resolve(this.accounts as any);
            } catch (e) {
              reject(e);
            }
            return;

          case "eth_accounts":
            resolve(this.accounts as any);
            return;

          case "eth_chainId":
            resolve(this.config.chainId as any);
            return;

          case "eth_sign":
            try {
              if (this.accounts === null) {
                throw new Error("not connected");
              }
              const params = this.parseEthSignParams(args.params);
              if (params[0] !== this.accounts[0]) {
                throw new Error("invalid account");
              }
              resolve((await this.ethSign(params[1])) as any);
            } catch (e) {
              reject(e);
            }
            return;

          case "eth_signTypedData":
            try {
              if (this.accounts === null) {
                throw new Error("not connected");
              }
              const params = this.parseEthSignTypedDataParams(args.params);
              if (params[0] !== this.accounts[0]) {
                throw new Error("invalid account");
              }
              resolve((await this.ethSignTypedData(params[1])) as any);
            } catch (e) {
              reject(e);
            }
            return;

          case "eth_signTransaction":
            try {
              if (this.accounts === null) {
                throw new Error("not connected");
              }
              const params = this.parseEthSignTransactionParams(args.params);
              resolve((await this.ethSignTransaction(params[0])) as any);
            } catch (e) {
              reject(e);
            }
            return;

          case "eth_sendTransaction":
            try {
              if (this.accounts === null) {
                throw new Error("not connected");
              }
              const params = this.parseEthSendTransactionParams(args.params);
              resolve((await this.ethSendTransaction(params[0])) as any);
            } catch (e) {
              reject(e);
            }
            return;

          default:
            reject("unsupported method");
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

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.dAuthConfig.wsAPIURL);
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

  private requestAccounts(): Promise<string[]> {
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

  private ethSignTransaction(
    transaction: ethers.providers.TransactionRequest
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.openSignerWindow("/x/eth/signTransaction", {
        transaction: JSON.stringify(transaction),
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
    this.ws?.send(JSON.stringify(msg));
  }

  private handleWSMessage(msg: any): void {
    switch (msg.type) {
      case "accounts":
      case "signature":
      case "transaction":
      case "transactionHash":
        if (msg.data.value === null) {
          this.reject("canceled");
        } else {
          this.resolve(msg.data.value);
        }
        this.initPromiseArgs();
        break;
    }
  }

  private openSignerWindow(path: string, params?: any): void {
    const width = screen.width / 2;
    const height = screen.height;
    const left = screen.width / 4;
    const top = 0;

    const url = new URL(`${this.dAuthConfig.baseURL}${path}`);
    url.searchParams.set("connectionID", this.connectionID!);
    if (params !== undefined) {
      for (const key of Object.keys(params)) {
        url.searchParams.set(key, params[key]);
      }
    }

    window.open(
      url.toString(),
      "_blank",
      `width=${width},height=${height},left=${left},top=${top}`
    );
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

  private parseEthSignTransactionParams(
    params?: object | readonly unknown[]
  ): [TransactionRequest] {
    return this.parseEthTransactionParams(params);
  }

  private parseEthSendTransactionParams(
    params?: object | readonly unknown[]
  ): [TransactionRequest] {
    return this.parseEthTransactionParams(params);
  }

  private parseEthTransactionParams(
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

    return [params[0]];
  }
}
