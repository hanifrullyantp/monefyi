import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    setupFiles: ["src/test/setup.ts"],
    testTimeout: 20000,
  },
});
