export type EIP1193ProviderRPCErrorCode = 4001 | 4100 | 4200 | 4900 | 4901;

export class EIP1193ProviderRPCError extends Error {
  static {
    this.prototype.name = "ProviderRpcError";
  }

  public readonly code: EIP1193ProviderRPCErrorCode;
  public readonly data?: unknown;

  constructor(code: EIP1193ProviderRPCErrorCode, msg: string, data?: unknown) {
    super(msg);
    this.code = code;
    this.data = data;
  }

  public static userRejectedRequest(
    msg?: string,
    data?: unknown,
  ): EIP1193ProviderRPCError {
    return new EIP1193ProviderRPCError(
      4001,
      msg ?? "the user rejected the request",
      data,
    );
  }

  public static unauthorized(
    msg?: string,
    data?: unknown,
  ): EIP1193ProviderRPCError {
    return new EIP1193ProviderRPCError(
      4100,
      msg ??
        "the requested method and/or account has not been authorized by the user",
      data,
    );
  }

  public static unsupportedMethod(
    msg?: string,
    data?: unknown,
  ): EIP1193ProviderRPCError {
    return new EIP1193ProviderRPCError(
      4200,
      msg ?? "the provider does not support the requested method",
      data,
    );
  }

  public static disconnected(
    msg?: string,
    data?: unknown,
  ): EIP1193ProviderRPCError {
    return new EIP1193ProviderRPCError(
      4900,
      msg ?? "the provider is disconnected from all chains",
      data,
    );
  }

  public static chainDisconnected(
    msg?: string,
    data?: unknown,
  ): EIP1193ProviderRPCError {
    return new EIP1193ProviderRPCError(
      4901,
      msg ?? "the provider is not connected to the requested chain",
      data,
    );
  }
}
