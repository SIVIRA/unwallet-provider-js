import { z } from "zod";
import { isAddress } from "viem";

import { Persistence } from "./config";

export const snapshotSchema = z
  .object({
    chainID: z.number().int().positive(),
    addresses: z.array(
      z.string().refine((val) => isAddress(val), {
        abort: true,
        error: "Invalid EVM address",
      }),
    ),
  })
  .readonly();

export const snapshotPayloadSchema = z
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
  .pipe(snapshotSchema);

export type Snapshot = z.infer<typeof snapshotSchema>;

export class SnapshotManager {
  private readonly key = "uw.snapshot";
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

  public load(): Snapshot | null {
    const storage = this.storage;
    if (storage === null) {
      return null;
    }

    let snapshotPayload: string | null;
    {
      try {
        snapshotPayload = storage.getItem(this.key);
      } catch (e) {
        snapshotPayload = null;
        this.handlePersistenceError(e);
      }
    }
    if (snapshotPayload === null) {
      return null;
    }

    let snapshot: Snapshot | null;
    {
      const result = snapshotPayloadSchema.safeParse(snapshotPayload);
      if (result.success) {
        snapshot = result.data;
      } else {
        snapshot = null;
        this.remove();
      }
    }

    return snapshot;
  }

  public save(snapshot: Snapshot): void {
    const storage = this.storage;
    if (storage === null) {
      return;
    }

    try {
      storage.setItem(this.key, JSON.stringify(snapshot));
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
        "[unwallet] snapshot persistence is not working. specify `onPersistenceError` to handle this.",
        err,
      );
      return;
    }

    this.onPersistenceError(err);
  }
}
