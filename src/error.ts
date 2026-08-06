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
