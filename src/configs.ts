import { UnWalletConfig } from "./types";

export const unWalletConfigs: { [env: string]: UnWalletConfig } = {
  prod: {
    baseURL: "https://id.unwallet.world",
    wsAPIURL: "wss://ws-api.admin.id.dauth.world",
  },
  dev: {
    baseURL: "https://id.unwallet.dev",
    wsAPIURL: "wss://ws-api.admin.id-dev.dauth.world",
  },
  local: {
    baseURL: "http://localhost:4200",
    wsAPIURL: "wss://ws-api.admin.id-dev.dauth.world",
  },
};
