import { z } from "zod";
import { isAddress } from "viem";

import { Persistence } from "./config";

export const sessionSchema = z.object({
  chainID: z.number().int().positive(),
  addresses: z.array(
    z.string().refine((val) => isAddress(val), {
      abort: true,
      error: "Invalid EVM address",
    }),
  ),
});

export const sessionPayloadSchema = z
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
  .pipe(sessionSchema);

export type Session = z.infer<typeof sessionSchema>;

export class SessionManager {
  public readonly key: string;
  public readonly persistence: Persistence;

  constructor(args: { key: string; persistence: Persistence }) {
    this.key = args.key;
    this.persistence = args.persistence;
  }

  public load(): Session | null {
    switch (this.persistence) {
      case "local": {
        let sessionPayload: string | null;
        {
          try {
            sessionPayload = localStorage.getItem(this.key);
          } catch {
            sessionPayload = null; // best-effort
          }
        }
        if (sessionPayload === null) {
          return null;
        }

        let session: Session | null;
        {
          const result = sessionPayloadSchema.safeParse(sessionPayload);
          if (result.success) {
            session = result.data;
          } else {
            session = null;
            this.remove();
          }
        }

        return session;
      }
      case "none":
        return null;
    }
  }

  public save(session: Session): void {
    switch (this.persistence) {
      case "local":
        try {
          localStorage.setItem(this.key, JSON.stringify(session));
        } catch {
          // best-effort
        }
        return;
      case "none":
        return;
    }
  }

  public remove(): void {
    switch (this.persistence) {
      case "local":
        try {
          localStorage.removeItem(this.key);
        } catch {
          // best-effort
        }
        return;
      case "none":
        return;
    }
  }
}
