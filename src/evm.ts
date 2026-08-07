import { isAddress, isHash, isHex } from "viem";
import { z } from "zod";

export const addressSchema = z.string().refine(isAddress, {
  error: "Invalid address",
});

export const hashSchema = z.string().refine(isHash, {
  error: "Invalid hash",
});

export const hexSchema = z.string().refine(isHex, {
  error: "Invalid hex",
});
