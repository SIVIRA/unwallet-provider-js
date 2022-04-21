import { ethers } from "ethers";

const TEST_CHAIN_ID = ethers.BigNumber.from(1337);
const TEST_JSON_RPC_SERVER_PORT = 8545;
const TEST_PROVIDER_RPC_CONFIG = {
  [TEST_CHAIN_ID.toNumber()]: `http://localhost:${TEST_JSON_RPC_SERVER_PORT}`,
};

export { TEST_CHAIN_ID, TEST_JSON_RPC_SERVER_PORT, TEST_PROVIDER_RPC_CONFIG };
