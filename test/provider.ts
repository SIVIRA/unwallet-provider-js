import { expect } from "chai";
import { ethers } from "ethers";

import { UnWalletProvider } from "../src";

import * as constants from "./constants";
import * as utils from "./utils";

describe("UnWalletProvider", () => {
  let server: utils.TestJsonRpcServer;

  before(async () => {
    server = new utils.TestJsonRpcServer();
    await server.start();
  });

  describe("request", () => {
    it("failure: provider RPC URL not found", async () => {
      const provider = new UnWalletProvider({
        chainId: 0,
        rpc: constants.TEST_PROVIDER_RPC_CONFIG,
      });

      await utils.expectToBeRejected(
        provider.request({
          method: "eth_getTransactionCount",
          params: [ethers.constants.AddressZero],
        }),
        "provider RPC URL not found"
      );
    });

    it("success", async () => {
      const provider = new UnWalletProvider({
        chainId: constants.TEST_CHAIN_ID,
        rpc: constants.TEST_PROVIDER_RPC_CONFIG,
      });

      expect(
        ethers.BigNumber.from(
          await provider.request({
            method: "eth_getTransactionCount",
            params: [ethers.constants.AddressZero],
          })
        ).toNumber()
      ).to.equal(0);
    });

    it("success: with ethers", async () => {
      const provider = new ethers.providers.Web3Provider(
        new UnWalletProvider({
          chainId: constants.TEST_CHAIN_ID,
          rpc: constants.TEST_PROVIDER_RPC_CONFIG,
        })
      );

      expect(
        await provider.getTransactionCount(ethers.constants.AddressZero)
      ).to.equal(0);
    });
  });

  after(async () => {
    await server.stop();
  });
});
