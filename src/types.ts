import { ethers } from "ethers";
import {
  TypedDataDomain,
  TypedDataField,
} from "@ethersproject/abstract-signer";

export interface Eip712TypedData {
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  message: Record<string, any>;
}

export interface Eip1193RequestArguments {
  readonly method: string;
  readonly params?: readonly unknown[] | object;
}

export interface Eip1193ProviderConnectInfo {
  readonly chainId: string;
}

export interface Eip1193ProviderRpcError extends Error {
  code: number;
  data?: unknown;
}

export interface Eip1193ProviderMessage {
  readonly type: string;
  readonly data: unknown;
}

export type Eip1193EventType =
  | "message"
  | "connect"
  | "disconnect"
  | "chainChanged"
  | "accountsChanged";

export interface Eip1193Provider {
  request(args: Eip1193RequestArguments): Promise<unknown>;
  on(eventType: Eip1193EventType, listener: (...args: any[]) => void): void;
  removeListener(
    eventType: Eip1193EventType,
    listener: (...args: any[]) => void
  ): void;
}

export interface Eip3326SwitchEthereumChainParameter {
  chainId: string;
}

export interface UnWalletConfig {
  frontend: UnWalletFrontendConfig;
  xapi: UnWalletXAPIConfig;
}

export interface UnWalletFrontendConfig {
  baseURL: string;
}

export interface UnWalletXAPIConfig {
  url: string;
}

export interface RpcConfig {
  [chainId: number]: string;
}

export interface Config {
  env?: string;
  rpc?: RpcConfig;
  allowAccountsCaching?: boolean;
}

export interface Accounts {
  chainId: ethers.BigNumber;
  addresses: string[];
}

export class JsonRpcProvider extends ethers.providers.JsonRpcProvider {}
