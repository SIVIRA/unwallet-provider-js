import { Eip1193ProviderRpcError } from "./types";

export const providerRpcErrorDisconnected: Eip1193ProviderRpcError = {
  name: "ProviderRpcError",
  message: "the provider is disconnected from all chains",
  code: 4900,
};
