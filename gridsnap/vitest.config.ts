import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts so the app build config stays untouched.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
