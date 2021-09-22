import { EventEmitter } from "events";

import {
  Eip1193EventType,
  Eip1193Provider,
  Eip1193RequestArguments,
  JsonRpcProvider,
  ProviderConfig,
} from "./types";

export class DAuthProvider implements Eip1193Provider {
  private config: ProviderConfig;
  private eventEmitter: EventEmitter;
  private jsonRpcProvider: JsonRpcProvider | null = null;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.eventEmitter = new EventEmitter();

    this.setJsonRpcProvider(this.config.chainId);
  }

  public async request<T = unknown>(args: Eip1193RequestArguments): Promise<T> {
    if (!this.jsonRpcProvider) {
      throw new Error("provider RPC URL not found");
    }

    return this.jsonRpcProvider.send(
      args.method,
      args.params ? (args.params as any) : []
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

  private setJsonRpcProvider(chainId: number): void {
    if (!this.config.rpc || !(chainId in this.config.rpc)) {
      this.jsonRpcProvider = null;
      return;
    }

    this.jsonRpcProvider = new JsonRpcProvider(this.config.rpc[chainId]);
  }
}
