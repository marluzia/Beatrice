import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.teste.{js,jsx,ts,tsx}"],
    environment: "node",
    reporters: "verbose",
  },
});