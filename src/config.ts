export type Env = "prod" | "dev";

export type Persistence = "local" | "none";

export interface Config {
  env?: Env;
  persistence?: Persistence;
  initialChainID?: number;
  publicRPC?: PublicRPCConfig;
}

export interface PublicRPCConfig {
  [chainID: number]: {
    url: string;
  };
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
