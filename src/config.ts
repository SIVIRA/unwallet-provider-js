export type Env = "prod" | "dev";

export type Persistance = "local" | "none";

export interface Config {
  env?: Env;
  persistance?: Persistance;
  rpc?: RPCConfig;
}

export interface RPCConfig {
  [chainID: number]: string;
}

export interface UnWalletConfig {
  frontend: UnWalletFrontendConfig;
  xAPI: UnWalletXAPIConfig;
}

export interface UnWalletFrontendConfig {
  baseURL: string;
}

export interface UnWalletXAPIConfig {
  url: string;
  connectionTimeout: number; // msec
}

export function getUnWalletConfigByEnv(env: Env): UnWalletConfig {
  switch (env) {
    case "prod":
      return {
        frontend: {
          baseURL: "https://id.unwallet.world",
        },
        xAPI: {
          url: "wss://xapi.id.unwallet.world",
          connectionTimeout: 10_000,
        },
      };
    case "dev":
      return {
        frontend: {
          baseURL: "http://localhost:4200",
        },
        xAPI: {
          url: "wss://xapi.id.test.unwallet.dev",
          connectionTimeout: 10_000,
        },
      };
  }
}
