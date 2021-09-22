import { expect } from "chai";
import { ethers } from "ethers";

import { DAuthProvider } from "../src";

import * as constants from "./constants";
import * as utils from "./utils";

describe("DAuthProvider", () => {
  let server: utils.TestJsonRpcServer;

  before(async () => {
    server = new utils.TestJsonRpcServer();
    await server.start();
  });

  describe("request", () => {
    it("failure: provider RPC URL not found", async () => {
      const provider = new DAuthProvider({
        chainId: 0,
        rpc: constants.TEST_PROVIDER_RPC_CONFIG,
      });

      await utils.expectToBeRejected(
        provider.request({
          method: "eth_chainId",
        }),
        "provider RPC URL not found"
      );
    });

    it("success", async () => {
      const provider = new DAuthProvider({
        chainId: constants.TEST_CHAIN_ID,
        rpc: constants.TEST_PROVIDER_RPC_CONFIG,
      });

      expect(
        ethers.BigNumber.from(
          await provider.request({
            method: "eth_chainId",
          })
        ).toNumber()
      ).to.equal(constants.TEST_CHAIN_ID);
    });

    it("success: with ethers", async () => {
      const provider = new ethers.providers.Web3Provider(
        new DAuthProvider({
          chainId: constants.TEST_CHAIN_ID,
          rpc: constants.TEST_PROVIDER_RPC_CONFIG,
        })
      );

      const network = await provider.getNetwork();
      expect(network.chainId).to.equal(constants.TEST_CHAIN_ID);
    });
  });

  after(async () => {
    await server.stop();
  });
});
