import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  // Runtime de JSX automatico (React 19): los tsconfig de Next usan
  // `jsx: preserve`, que dejaria JSX sin transformar en los tests .tsx.
  esbuild: { jsx: "automatic" },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
});
