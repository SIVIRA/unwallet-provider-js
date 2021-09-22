"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOCK_PROVIDER_RPC_CONFIG = exports.MOCK_JSON_RPC_SERVER_PORT = exports.MOCK_CHAIN_ID = void 0;
const MOCK_CHAIN_ID = 1337;
exports.MOCK_CHAIN_ID = MOCK_CHAIN_ID;
const MOCK_JSON_RPC_SERVER_PORT = 8545;
exports.MOCK_JSON_RPC_SERVER_PORT = MOCK_JSON_RPC_SERVER_PORT;
const MOCK_PROVIDER_RPC_CONFIG = {
    [MOCK_CHAIN_ID]: `http://localhost:${MOCK_JSON_RPC_SERVER_PORT}`,
};
exports.MOCK_PROVIDER_RPC_CONFIG = MOCK_PROVIDER_RPC_CONFIG;
