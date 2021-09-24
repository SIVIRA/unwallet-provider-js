import { DAuthConfig } from "./types";

export const dAuthConfigs: { [env: string]: DAuthConfig } = {
  prod: {
    baseURL: "https://id.dauth.world",
    wsAPIURL: "wss://ws-api.admin.id.dauth.world",
  },
  dev: {
    baseURL: "https://id-dev.dauth.world",
    wsAPIURL: "wss://ws-api.admin.id-dev.dauth.world",
  },
  local: {
    baseURL: "http://localhost:4200",
    wsAPIURL: "wss://ws-api.admin.id-dev.dauth.world",
  },
};
