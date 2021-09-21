import { EventEmitter, Listener } from "events";

import {
  Eip1193EventType,
  Eip1193Provider,
  Eip1193RequestArguments,
} from "./types";

export class DAuthProvider implements Eip1193Provider {
  public eventEmitter: EventEmitter = new EventEmitter();

  public async enable(): Promise<string[]> {
    return [];
  }

  public async request<T = unknown>(args: Eip1193RequestArguments): Promise<T> {
    return null as any;
  }

  public on(eventType: Eip1193EventType, listener: Listener): void {
    this.eventEmitter.on(eventType, listener);
  }

  public removeListener(eventType: Eip1193EventType, listener: Listener): void {
    this.eventEmitter.removeListener(eventType, listener);
  }
}
