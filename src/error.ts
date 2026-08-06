import { Eip1193ProviderRpcError } from "./types";

export type UWErrorCode = "INVALID_RESPONSE";

export class UWError extends Error {
  static {
    this.prototype.name = "UWError";
  }

  public readonly code: UWErrorCode;

  constructor(code: UWErrorCode, msg?: string) {
    super(msg !== undefined ? `${code}: ${msg}` : code);
    this.code = code;
  }
}

export const providerRpcErrorRejected: Eip1193ProviderRpcError = {
  name: "ProviderRpcError",
  message: "the user rejected the request",
  code: 4001,
};

export const providerRpcErrorUnsupported: Eip1193ProviderRpcError = {
  name: "ProviderRpcError",
  message: "the provider does not support the requested method",
  code: 4200,
};

export const providerRpcErrorDisconnected: Eip1193ProviderRpcError = {
  name: "ProviderRpcError",
  message: "the provider is disconnected from all chains",
  code: 4900,
};
