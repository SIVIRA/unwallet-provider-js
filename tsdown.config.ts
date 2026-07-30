import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/index.ts",
  format: ["esm", "cjs"],
  platform: "browser",
  publint: {
    strict: true,
  },
});
