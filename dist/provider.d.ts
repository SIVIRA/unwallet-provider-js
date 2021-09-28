import { Config, Eip1193EventType, Eip1193Provider, Eip1193RequestArguments } from "./types";
export declare class DAuthProvider implements Eip1193Provider {
    private config;
    private dAuthConfig;
    private eventEmitter;
    private jsonRpcProvider;
    private signerMethods;
    private ws;
    private connectionID;
    private accounts;
    private resolve;
    private reject;
    constructor(config: Config);
    private initPromiseArgs;
    private setJsonRpcProvider;
    request<T = unknown>(args: Eip1193RequestArguments): Promise<T>;
    enable(): Promise<string[]>;
    private connect;
    private requestAccounts;
    private ethSign;
    private ethSignTypedData;
    private ethSignTransaction;
    private ethSendTransaction;
    private getConnectionID;
    private sendWSMessage;
    private handleWSMessage;
    private openSignerWindow;
    on(eventType: Eip1193EventType, listener: (...args: any[]) => void): void;
    removeListener(eventType: Eip1193EventType, listener: (...args: any[]) => void): void;
    private parseEthSignParams;
    private parseEthSignTypedDataParams;
    private parseEthSignTransactionParams;
    private parseEthSendTransactionParams;
    private parseEthTransactionParams;
}
//# sourceMappingURL=provider.d.ts.map