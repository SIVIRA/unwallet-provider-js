import { expect } from "chai";
import ganache from "ganache-core";

import * as constants from "./constants";

class MockJsonRpcServer {
  private server: ganache.Server;

  constructor() {
    this.server = ganache.server();
  }

  public start = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.server.on("error", (err) => {
        reject(err);
      });
      this.server.listen(constants.MOCK_JSON_RPC_SERVER_PORT, () => {
        resolve();
      });
    });
  };

  public stop = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  };
}

const expectToBeRejected = async (
  f: Promise<any>,
  message?: string
): Promise<void> => {
  let err;
  try {
    await f;
  } catch (e) {
    err = e;
  }
  expect(err).to.be.an("Error");
  if (message) {
    expect(message).to.equal(message);
  }
};

export { MockJsonRpcServer, expectToBeRejected };
