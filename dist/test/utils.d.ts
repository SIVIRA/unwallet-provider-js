declare class MockJsonRpcServer {
    private server;
    constructor();
    start: () => Promise<void>;
    stop: () => Promise<void>;
}
declare const expectToBeRejected: (f: Promise<any>, message?: string | undefined) => Promise<void>;
export { MockJsonRpcServer, expectToBeRejected };
//# sourceMappingURL=utils.d.ts.map