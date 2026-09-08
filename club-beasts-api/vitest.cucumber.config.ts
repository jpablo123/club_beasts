import { defineConfig } from "vitest/config";
import { cucumber } from "@lotun/vitest-cucumber";

export default defineConfig({
  plugins: [
    cucumber({
      import: ["features/support/**/*.ts", "features/steps/**/*.ts"],
    }),
  ],
  test: {
    include: ["features/**/*.feature"],
  },
});
