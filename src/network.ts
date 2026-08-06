import { PublicClient } from "viem";
import { z } from "zod";

export const chainIDSchema = z.number().int().positive();

export type ChainID = z.infer<typeof chainIDSchema>;

export type Network = {
  readonly chainID: ChainID;
  readonly publicRPCClient: PublicClient | null;
};
