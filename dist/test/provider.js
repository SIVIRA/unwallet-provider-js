"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const chai_1 = require("chai");
const ethers_1 = require("ethers");
const src_1 = require("../src");
const constants = __importStar(require("./constants"));
const utils = __importStar(require("./utils"));
describe("DAuthProvider", () => {
    let server;
    let provider;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        server = new utils.TestJsonRpcServer();
        yield server.start();
    }));
    describe("request", () => {
        it("failure: provider RPC URL not found", () => __awaiter(void 0, void 0, void 0, function* () {
            provider = new src_1.DAuthProvider({
                chainId: 0,
                rpc: constants.TEST_PROVIDER_RPC_CONFIG,
            });
            yield utils.expectToBeRejected(provider.request({
                method: "eth_chainId",
            }), "provider RPC URL not found");
        }));
        it("success", () => __awaiter(void 0, void 0, void 0, function* () {
            provider = new src_1.DAuthProvider({
                chainId: constants.TEST_CHAIN_ID,
                rpc: constants.TEST_PROVIDER_RPC_CONFIG,
            });
            (0, chai_1.expect)(ethers_1.ethers.BigNumber.from(yield provider.request({
                method: "eth_chainId",
            })).toNumber()).to.equal(constants.TEST_CHAIN_ID);
        }));
    });
    after(() => __awaiter(void 0, void 0, void 0, function* () {
        yield server.stop();
    }));
});
