import { defineConfig } from "vitest/config";

/**
 * Separada da vite.config.js de propósito: o que roda no navegador e o que
 * roda nos testes não têm por que compartilhar configuração.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.teste.{js,ts}"],
    environment: "node",
    reporters: "verbose",
  },
});
