import { fromHex, isAddress, isHex } from "viem";
import { z } from "zod";

import { UnWalletXAPIConfig } from "./config";
import { UWError } from "./error";

const X_ACTIONS = ["getConnectionID"] as const;

const X_RESPONSE_TYPES = [
  "connectionID",
  "accounts",
  "signature",
  "transactionHash",
  "null",
  "error",
] as const;

export const xRequestSchema = z
  .object({
    action: z.enum(X_ACTIONS),
  })
  .readonly();

export const xRequestPayloadSchema = z
  .string()
  .transform((val, ctx) => {
    try {
      return JSON.parse(val);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Invalid JSON string",
      });
      return z.NEVER;
    }
  })
  .pipe(xRequestSchema);

export const xResponseSchema = z
  .union([
    z.object({
      type: z.literal("accounts"),
      value: z.object({
        chainID: z
          .string()
          .refine((val) => isHex(val), {
            abort: true,
            error: "Invalid hex string",
          })
          .transform((val) => fromHex(val, "number"))
          .pipe(z.number().int().positive()),
        addresses: z.array(
          z.string().refine((val) => isAddress(val), {
            abort: true,
            error: "Invalid EVM address",
          }),
        ),
      }),
    }),
    z.object({
      type: z.literal("null"),
      value: z.null(),
    }),
    z.object({
      type: z.enum(
        X_RESPONSE_TYPES.filter((t) => t !== "accounts" && t !== "null"),
      ),
      value: z.string(),
    }),
  ])
  .readonly();

export const xResponsePayloadSchema = z
  .string()
  .transform((val, ctx) => {
    try {
      return JSON.parse(val);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Invalid JSON string",
      });
      return z.NEVER;
    }
  })
  .pipe(xResponseSchema);

export type XAction = (typeof X_ACTIONS)[number];

export type XRequest = z.infer<typeof xRequestSchema>;

export type XResponseType = (typeof X_RESPONSE_TYPES)[number];

export type XResponse = z.infer<typeof xResponseSchema>;

export type XResponseHandler = {
  readonly resolve: (resp: XResponse) => void;
  readonly reject: (err: UWError) => void;
};

export type XConnectionOptions = {
  readonly debugHandlers?: XConnectionDebugHandlers;
};

export type XConnectionDebugHandlers = {
  readonly onMessageEventDropped?: (event: MessageEvent) => void;
  readonly onCloseEventDropped?: (event: CloseEvent) => void;
};

export class XConnection {
  public readonly id: string;

  private readonly socket: WebSocket;
  private readonly options: XConnectionOptions;

  private responseHandler: XResponseHandler | null = null;

  constructor(args: {
    id: string;
    socket: WebSocket;
    options?: XConnectionOptions | undefined;
  }) {
    this.id = args.id;
    this.socket = args.socket;
    this.options = args.options ?? {};
    this.initListeners();
  }

  public static async init(
    config: UnWalletXAPIConfig,
    opts?: XConnectionOptions,
  ): Promise<XConnection> {
    const socket = new WebSocket(config.url);

    const id = await new Promise<string>((resolve, reject) => {
      const timeoutID = setTimeout(
        () => abortHandshake(new UWError("CONNECTION_TIMEOUT")),
        config.connectionTimeout,
      );

      const detachListeners = () => {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
      };

      const completeHandshake = (id: string) => {
        clearTimeout(timeoutID);
        detachListeners();
        resolve(id);
      };
      const abortHandshake = (err: UWError) => {
        clearTimeout(timeoutID);
        detachListeners();
        socket.close();
        reject(err);
      };

      socket.onopen = () =>
        socket.send(
          JSON.stringify({ action: "getConnectionID" } satisfies XRequest),
        );

      socket.onmessage = (event) => {
        let resp: XResponse;
        {
          const result = safeParseXResponsePayload(event.data);
          if (!result.success) {
            abortHandshake(result.error);
            return;
          }

          resp = result.data;
        }
        if (resp.type !== "connectionID") {
          abortHandshake(newUnexpectedXResponseTypeError(resp));
          return;
        }

        completeHandshake(resp.value);
      };

      socket.onerror = () => abortHandshake(new UWError("CONNECTION_FAILED"));

      socket.onclose = (event) =>
        abortHandshake(newConnectionClosedError(event));
    });

    return new XConnection({
      id,
      socket,
      options: opts,
    });
  }

  private initListeners(): void {
    this.socket.onopen = null;

    this.socket.onmessage = (event) => {
      if (this.responseHandler === null) {
        this.options.debugHandlers?.onMessageEventDropped?.(event);
        return;
      }

      let resp: XResponse;
      {
        const result = safeParseXResponsePayload(event.data);
        if (!result.success) {
          this.responseHandler.reject(result.error);
          return;
        }

        resp = result.data;
      }

      switch (resp.type) {
        case "error":
          switch (resp.value) {
            case "rejected":
              this.responseHandler.reject(new UWError("REQUEST_REJECTED"));
              break;
            default:
              this.responseHandler.reject(
                new UWError(
                  "INVALID_RESPONSE",
                  `unexpected error value: ${resp.value}`,
                ),
              );
          }
          break;
        default:
          this.responseHandler.resolve(resp);
      }
    };

    this.socket.onerror = null;

    this.socket.onclose = (event) => {
      if (this.responseHandler === null) {
        this.options.debugHandlers?.onCloseEventDropped?.(event);
        return;
      }

      this.responseHandler.reject(newConnectionClosedError(event));
    };
  }

  public get readyState(): number {
    return this.socket.readyState;
  }

  public get hasResponseHandler(): boolean {
    return this.responseHandler !== null;
  }

  public setResponseHandler(respHandler: XResponseHandler | null): void {
    this.responseHandler = respHandler;
  }

  public close(): void {
    this.socket.close();
  }
}

function safeParseXResponsePayload(
  data: unknown,
): { success: true; data: XResponse } | { success: false; error: UWError } {
  const result = xResponsePayloadSchema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      error: new UWError(
        "INVALID_RESPONSE",
        `invalid payload: ${z.prettifyError(result.error)}`,
      ),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

export function newUnexpectedXResponseTypeError(resp: XResponse): UWError {
  const msgs = [];
  {
    msgs.push(`unexpected type: ${resp.type}`);
    if (resp.type === "error") {
      msgs.push(`(value: ${resp.value})`);
    }
  }

  return new UWError("INVALID_RESPONSE", msgs.join(" "));
}

export function newConnectionClosedError(event: CloseEvent): UWError {
  return new UWError(
    "CONNECTION_CLOSED",
    event.reason.length > 0 ? event.reason : undefined,
  );
}
