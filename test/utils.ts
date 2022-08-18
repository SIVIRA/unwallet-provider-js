import { expect } from "chai";
import ganache, { Server } from "ganache";

import * as constants from "./constants";

class TestJsonRpcServer {
  private server: Server;

  constructor() {
    this.server = ganache.server();
  }

  public start = async (): Promise<void> => {
    await this.server.listen(constants.TEST_JSON_RPC_SERVER_PORT);
  };

  public stop = async (): Promise<void> => {
    await this.server.close();
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
