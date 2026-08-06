import { z } from "zod";
import { isAddress } from "viem";

import { Persistence } from "./config";
import { chainIDSchema } from "./network";

export const sessionSchema = z
  .object({
    chainID: chainIDSchema,
    addresses: z.array(
      z.string().refine(isAddress, {
        error: "Invalid EVM address",
      }),
    ),
  })
  .readonly();

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
  private readonly key = "uw.session";
  private readonly legacyKey = "unwallet_accounts"; // will be removed in v1

  private readonly persistence: Persistence;
  private readonly onPersistenceError: ((err: unknown) => void) | null;

  constructor(args: {
    persistence: Persistence;
    onPersistenceError?: ((err: unknown) => void) | undefined;
  }) {
    this.persistence = args.persistence;
    this.onPersistenceError = args.onPersistenceError ?? null;

    switch (this.persistence) {
      case "local":
        break;
      case "none":
        this.removeFrom("local");
        break;
    }

    // will be removed in v1
    try {
      localStorage.removeItem(this.legacyKey);
    } catch {
      // this cleanup is unrelated to the configured persistence,
      // so it must not be reported via `onPersistenceError`.
    }
  }

  private get storage(): Storage | null {
    return this.storageFor(this.persistence);
  }

  private storageFor(persistence: Persistence): Storage | null {
    let storage: Storage | null;
    {
      try {
        switch (persistence) {
          case "local":
            storage = localStorage;
            break;
          case "none":
            storage = null;
            break;
        }
      } catch (e) {
        storage = null;
        this.handlePersistenceError(e);
      }
    }

    return storage;
  }

  public load(): Session | null {
    const storage = this.storage;
    if (storage === null) {
      return null;
    }

    let sessionPayload: string | null;
    {
      try {
        sessionPayload = storage.getItem(this.key);
      } catch (e) {
        sessionPayload = null;
        this.handlePersistenceError(e);
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

  public save(session: Session): void {
    const storage = this.storage;
    if (storage === null) {
      return;
    }

    try {
      storage.setItem(this.key, JSON.stringify(session));
    } catch (e) {
      this.handlePersistenceError(e);
    }
  }

  public remove(): void {
    this.removeFrom(this.persistence);
  }

  private removeFrom(persistence: Persistence): void {
    const storage = this.storageFor(persistence);
    if (storage === null) {
      return;
    }

    try {
      storage.removeItem(this.key);
    } catch (e) {
      this.handlePersistenceError(e);
    }
  }

  private handlePersistenceError(err: unknown): void {
    if (this.onPersistenceError === null) {
      console.warn(
        "[unwallet] session persistence is not working. specify `onPersistenceError` to handle this.",
        err,
      );
      return;
    }

    this.onPersistenceError(err);
  }
}
