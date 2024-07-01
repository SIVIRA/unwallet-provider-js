import { UnWalletConfig } from "./types";

export const unWalletConfigs: { [env: string]: UnWalletConfig } = {
  prod: {
    frontend: {
      baseURL: "https://id.unwallet.world",
    },
    xapi: {
      url: "wss://xapi.id.unwallet.world",
    },
  },
  dev: {
    frontend: {
      baseURL: "http://localhost:4200",
    },
    xapi: {
      url: "wss://xapi.id.test.unwallet.dev",
    },
  },
};
