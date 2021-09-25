"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAuthProvider = void 0;
const ethers_1 = require("ethers");
const events_1 = require("events");
const configs_1 = require("./configs");
const types_1 = require("./types");
const signerMethods = [
    "eth_accounts",
    "eth_chainId",
    "eth_requestAccounts",
    "eth_sendTransaction",
    "eth_sign",
    "eth_signTransaction",
    "eth_signTypedData",
];
class DAuthProvider {
    constructor(config) {
        this.jsonRpcProvider = null;
        this.signerMethods = signerMethods;
        this.ws = null;
        this.connectionID = null;
        this.accounts = null;
        if (!config.env) {
            config.env = "prod";
        }
        if (!(config.env in configs_1.dAuthConfigs)) {
            throw new Error("invalid env");
        }
        this.config = config;
        this.dAuthConfig = configs_1.dAuthConfigs[config.env];
        this.eventEmitter = new events_1.EventEmitter();
        this.setJsonRpcProvider(config.chainId);
        this.resolve = (result) => { };
        this.reject = (reason) => { };
    }
    initPromiseArgs() {
        this.resolve = (result) => { };
        this.reject = (reason) => { };
    }
    setJsonRpcProvider(chainId) {
        if (!this.config.rpc || !(chainId in this.config.rpc)) {
            this.jsonRpcProvider = null;
            return;
        }
        this.jsonRpcProvider = new types_1.JsonRpcProvider(this.config.rpc[chainId]);
    }
    request(args) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            if (this.signerMethods.includes(args.method)) {
                switch (args.method) {
                    case "eth_accounts":
                        resolve(this.accounts);
                        return;
                    case "eth_chainId":
                        resolve(this.config.chainId);
                        return;
                    case "eth_requestAccounts":
                        try {
                            yield this.connect();
                            this.accounts = yield this.requestAccounts();
                            const connectInfo = {
                                chainId: `${this.config.chainId}`,
                            };
                            this.eventEmitter.emit("connect", connectInfo);
                            resolve(this.accounts);
                        }
                        catch (e) {
                            reject(e);
                        }
                        return;
                    case "eth_sign":
                        try {
                            const params = this.parseEthSignParams(args.params);
                            resolve((yield this.ethSign(params[1])));
                        }
                        catch (e) {
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
            resolve(yield this.jsonRpcProvider.send(args.method, args.params ? args.params : []));
        }));
    }
    enable() {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.request({
                method: "eth_requestAccounts",
            }));
        });
    }
    connect() {
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
    requestAccounts() {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
            const url = new URL(`${this.dAuthConfig.baseURL}/x/eth/requestAccounts`);
            url.searchParams.set("connectionID", this.connectionID);
            this.openWindow(url);
        });
    }
    ethSign(message) {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
            const url = new URL(`${this.dAuthConfig.baseURL}/x/eth/sign`);
            url.searchParams.set("connectionID", this.connectionID);
            url.searchParams.set("message", message);
            this.openWindow(url);
        });
    }
    getConnectionID() {
        this.sendWSMessage({
            action: "getConnectionID",
        });
    }
    sendWSMessage(msg) {
        var _a;
        (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify(msg));
    }
    handleWSMessage(msg) {
        switch (msg.type) {
            case "accounts":
            case "signature":
                if (msg.data.value === null) {
                    this.reject("canceled");
                }
                else {
                    this.resolve(msg.data.value);
                }
                this.initPromiseArgs();
                break;
        }
    }
    openWindow(url) {
        const width = screen.width / 2;
        const height = screen.height;
        const left = screen.width / 4;
        const top = 0;
        window.open(url.toString(), "_blank", `width=${width},height=${height},left=${left},top=${top}`);
    }
    on(eventType, listener) {
        this.eventEmitter.on(eventType, listener);
    }
    removeListener(eventType, listener) {
        this.eventEmitter.removeListener(eventType, listener);
    }
    parseEthSignParams(params) {
        if (this.accounts === null) {
            throw new Error("not connected");
        }
        if (params === undefined) {
            throw new Error("params undefined");
        }
        if (!Array.isArray(params) || params.length !== 2) {
            throw new Error("invalid params");
        }
        if (!ethers_1.ethers.utils.isAddress(params[0]) ||
            ethers_1.ethers.utils.getAddress(params[0]) !== this.accounts[0]) {
            throw new Error("invalid account");
        }
        if (!ethers_1.ethers.utils.isHexString(params[1])) {
            throw new Error("invalid message");
        }
        return [params[0], params[1]];
    }
}
exports.DAuthProvider = DAuthProvider;
