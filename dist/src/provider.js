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
const events_1 = require("events");
const types_1 = require("./types");
class DAuthProvider {
    constructor(config) {
        this.jsonRpcProvider = null;
        this.config = config;
        this.eventEmitter = new events_1.EventEmitter();
        this.setJsonRpcProvider(this.config.chainId);
    }
    request(args) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.jsonRpcProvider) {
                throw new Error("provider RPC URL not found");
            }
            return this.jsonRpcProvider.send(args.method, args.params ? args.params : []);
        });
    }
    on(eventType, listener) {
        this.eventEmitter.on(eventType, listener);
    }
    removeListener(eventType, listener) {
        this.eventEmitter.removeListener(eventType, listener);
    }
    setJsonRpcProvider(chainId) {
        if (!this.config.rpc || !(chainId in this.config.rpc)) {
            this.jsonRpcProvider = null;
            return;
        }
        this.jsonRpcProvider = new types_1.JsonRpcProvider(this.config.rpc[chainId]);
    }
}
exports.DAuthProvider = DAuthProvider;
