import { ethers } from "ethers";
import { EventEmitter } from "events";

import { dAuthConfigs } from "./configs";
import {
  Config,
  DAuthConfig,
  Eip1193EventType,
  Eip1193Provider,
  Eip1193ProviderConnectInfo,
  Eip1193RequestArguments,
  JsonRpcProvider,
} from "./types";

const signerMethods = [
  "eth_accounts",
  "eth_chainId",
  "eth_requestAccounts",
  "eth_sendTransaction",
  "eth_sign",
  "eth_signTransaction",
  "eth_signTypedData",
  "personal_sign",
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
          case "eth_accounts":
            resolve(this.accounts as any);
            return;

          case "eth_chainId":
            resolve(this.config.chainId as any);
            return;

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

          case "eth_sign":
            try {
              const params = this.parseEthSignParams(args.params);
              resolve((await this.ethSign(params[1])) as any);
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

      const url = new URL(`${this.dAuthConfig.baseURL}/x/eth/requestAccounts`);
      url.searchParams.set("connectionID", this.connectionID!);
      this.openWindow(url);
    });
  }

  private ethSign(message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;

      const url = new URL(`${this.dAuthConfig.baseURL}/x/eth/sign`);
      url.searchParams.set("connectionID", this.connectionID!);
      url.searchParams.set("message", message);
      this.openWindow(url);
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
        if (msg.data.value === null) {
          this.reject("canceled");
        } else {
          this.resolve(msg.data.value);
        }
        this.initPromiseArgs();
        break;
    }
  }

  private openWindow(url: URL): void {
    const width = screen.width / 2;
    const height = screen.height;
    const left = screen.width / 4;
    const top = 0;

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
    if (this.accounts === null) {
      throw new Error("not connected");
    }
    if (params === undefined) {
      throw new Error("params undefined");
    }
    if (!Array.isArray(params) || params.length !== 2) {
      throw new Error("invalid params");
    }
    if (
      !ethers.utils.isAddress(params[0]) ||
      ethers.utils.getAddress(params[0]) !== this.accounts[0]
    ) {
      throw new Error("invalid account");
    }
    if (!ethers.utils.isHexString(params[1])) {
      throw new Error("invalid message");
    }

    return [params[0], params[1]];
  }
}
