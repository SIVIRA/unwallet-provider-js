import { expect } from "chai";
import { ethers } from "ethers";

import { Accounts, UnWalletProvider } from "../src";

import * as constants from "./constants";
import * as utils from "./utils";

class TestUnWalletProvider extends UnWalletProvider {
  public setAccountsForTest(accounts: Accounts) {
    this.setAccounts(accounts);
  }
}

describe("UnWalletProvider", () => {
  let server: utils.TestJsonRpcServer;

  before(async () => {
    server = new utils.TestJsonRpcServer();
    await server.start();
  });

  describe("request", () => {
    it("failure: provider RPC URL not found", async () => {
      const provider = new TestUnWalletProvider({
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
      const provider = new TestUnWalletProvider({
        rpc: constants.TEST_PROVIDER_RPC_CONFIG,
      });
      provider.setAccountsForTest({
        chainId: constants.TEST_CHAIN_ID,
        addresses: [],
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
      const provider = new TestUnWalletProvider({
        rpc: constants.TEST_PROVIDER_RPC_CONFIG,
      });
      provider.setAccountsForTest({
        chainId: constants.TEST_CHAIN_ID,
        addresses: [],
      });

      const web3Provider = new ethers.providers.Web3Provider(provider);

      expect(
        await web3Provider.getTransactionCount(ethers.constants.AddressZero)
      ).to.equal(0);
    });
  });

  after(async () => {
    await server.stop();
  });
});
