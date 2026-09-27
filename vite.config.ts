/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/idlewizard_item_calc/",
  plugins: [react()],
  worker: { format: "es" },
  // The page and the worker each bundle the full item and spell database.
  build: { chunkSizeWarningLimit: 1000 },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    environment: "node",
    testTimeout: 120_000,
  },
});
