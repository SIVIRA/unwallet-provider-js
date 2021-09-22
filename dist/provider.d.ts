import { Listener } from "events";
import { Eip1193EventType, Eip1193Provider, Eip1193RequestArguments, ProviderConfig } from "./types";
export declare class DAuthProvider implements Eip1193Provider {
    private config;
    private eventEmitter;
    private jsonRpcProvider;
    constructor(config: ProviderConfig);
    enable(): Promise<string[]>;
    request<T = unknown>(args: Eip1193RequestArguments): Promise<T>;
    on(eventType: Eip1193EventType, listener: Listener): void;
    removeListener(eventType: Eip1193EventType, listener: Listener): void;
    private setJsonRpcProvider;
}
//# sourceMappingURL=provider.d.ts.map