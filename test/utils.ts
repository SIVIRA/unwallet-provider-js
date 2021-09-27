import { expect } from "chai";
import ganache from "ganache-core";

import * as constants from "./constants";

class TestJsonRpcServer {
  private server: ganache.Server;

  constructor() {
    this.server = ganache.server();
  }

  public start = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.server.on("error", (err) => {
        reject(err);
      });
      this.server.listen(constants.TEST_JSON_RPC_SERVER_PORT, () => {
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
  try {
    await f;
    expect.fail("succeeded");
  } catch (e) {
    if (message) {
      if (e instanceof Error) {
        expect(e.message).to.equal(message);
      } else if (typeof e === "string") {
        expect(e).to.equal(message);
      } else {
        expect.fail("unexpected error");
      }
    }
  }
};

export { TestJsonRpcServer, expectToBeRejected };
