import { isAddress, isHex } from "viem";
import { z } from "zod";

export const evmAddressSchema = z.string().nonempty().refine(isAddress, {
  error: "Invalid EVM address",
});

export const hexStringSchema = z.string().nonempty().refine(isHex, {
  error: "Invalid hex string",
});
