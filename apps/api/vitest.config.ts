import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    deps: {
      interopDefault: true,
    },
  },
  resolve: {
    alias: {
      "@allinle/shared": resolve(__dirname, "../../packages/shared/src"),
    },
  },
});
