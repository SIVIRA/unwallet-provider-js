export type Env = "prod" | "dev";

export type Persistence = "local" | "none";

export interface Config {
  env?: Env;
  persistence?: Persistence;
  onPersistenceError?: (err: unknown) => void;
  initialChainID?: number;
  publicRPC?: PublicRPCConfig;
}

export interface PublicRPCConfig {
  [chainID: number]: PublicRPCClientConfig;
}

export interface PublicRPCClientConfig {
  url: string;
}

export interface UnWalletConfig {
  frontend: UnWalletFrontendConfig;
  xAPI: UnWalletXAPIConfig;
}

export interface UnWalletFrontendConfig {
  origin: string;
}

export interface UnWalletXAPIConfig {
  url: string;
  connectionTimeout: number; // msec
}

export const envToUnWalletConfig: Record<Env, UnWalletConfig> = {
  prod: {
    frontend: {
      origin: "https://id.unwallet.world",
    },
    xAPI: {
      url: "wss://xapi.id.unwallet.world",
      connectionTimeout: 10_000,
    },
  },
  dev: {
    frontend: {
      origin: "http://localhost:4200",
    },
    xAPI: {
      url: "wss://xapi.id.test.unwallet.dev",
      connectionTimeout: 10_000,
    },
  },
};
