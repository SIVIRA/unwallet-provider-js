import { EventEmitter, Listener } from "events";
import { Eip1193EventType, Eip1193Provider, Eip1193RequestArguments } from "./types";
export declare class DAuthProvider implements Eip1193Provider {
    eventEmitter: EventEmitter;
    enable(): Promise<string[]>;
    request<T = unknown>(args: Eip1193RequestArguments): Promise<T>;
    on(eventType: Eip1193EventType, listener: Listener): void;
    removeListener(eventType: Eip1193EventType, listener: Listener): void;
}
//# sourceMappingURL=provider.d.ts.map