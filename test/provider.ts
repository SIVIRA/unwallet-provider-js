import { expect } from "chai";
import { ethers } from "ethers";

import { DAuthProvider } from "../src";

import * as constants from "./constants";
import * as utils from "./utils";

describe("DAuthProvider", () => {
  let server: utils.MockJsonRpcServer;
  let provider: DAuthProvider;

  before(async () => {
    server = new utils.MockJsonRpcServer();
    await server.start();
  });

  describe("request", () => {
    it("failure: provider RPC URL not found", async () => {
      provider = new DAuthProvider({
        chainId: 0,
        rpc: constants.MOCK_PROVIDER_RPC_CONFIG,
      });

      await utils.expectToBeRejected(
        provider.request({
          method: "eth_chainId",
        }),
        "provider RPC URL not found"
      );
    });

    it("success", async () => {
      provider = new DAuthProvider({
        chainId: constants.MOCK_CHAIN_ID,
        rpc: constants.MOCK_PROVIDER_RPC_CONFIG,
      });

      expect(
        ethers.BigNumber.from(
          await provider.request({
            method: "eth_chainId",
          })
        ).toNumber()
      ).to.equal(constants.MOCK_CHAIN_ID);
    });
  });

  after(async () => {
    await server.stop();
  });
});
