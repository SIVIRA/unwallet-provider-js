"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEST_PROVIDER_RPC_CONFIG = exports.TEST_JSON_RPC_SERVER_PORT = exports.TEST_CHAIN_ID = void 0;
const TEST_CHAIN_ID = 1337;
exports.TEST_CHAIN_ID = TEST_CHAIN_ID;
const TEST_JSON_RPC_SERVER_PORT = 8545;
exports.TEST_JSON_RPC_SERVER_PORT = TEST_JSON_RPC_SERVER_PORT;
const TEST_PROVIDER_RPC_CONFIG = {
    [TEST_CHAIN_ID]: `http://localhost:${TEST_JSON_RPC_SERVER_PORT}`,
};
exports.TEST_PROVIDER_RPC_CONFIG = TEST_PROVIDER_RPC_CONFIG;
