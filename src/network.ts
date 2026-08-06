import { PublicClient } from "viem";

export type Network = {
  readonly chainID: number;
  readonly publicRPCClient: PublicClient | null;
};
