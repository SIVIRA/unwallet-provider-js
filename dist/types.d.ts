import { ethers } from "ethers";
import { Listener } from "events";
export interface Eip1193RequestArguments {
    readonly method: string;
    readonly params?: readonly unknown[] | object;
}
export interface Eip1193ProviderConnectInfo {
    readonly chainId: string;
}
export interface Eip1193ProviderRpcError extends Error {
    code: number;
    data?: unknown;
}
export interface Eip1193ProviderMessage {
    readonly type: string;
    readonly data: unknown;
}
export declare type Eip1193EventType = "message" | "connect" | "disconnect" | "chainChanged" | "accountsChanged";
export interface Eip1193Provider {
    request(args: Eip1193RequestArguments): Promise<unknown>;
    on(eventType: Eip1193EventType, listener: Listener): void;
    removeListener(eventType: Eip1193EventType, listener: Listener): void;
}
export interface RpcConfig {
    [chainId: number]: string;
}
export interface ProviderConfig {
    chainId: number;
    rpc?: RpcConfig;
}
export declare class JsonRpcProvider extends ethers.providers.JsonRpcProvider {
}
//# sourceMappingURL=types.d.ts.map