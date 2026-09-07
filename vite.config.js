import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { host: true, port: 5173 },
  build: {
    rollupOptions: {
      onwarn(aviso, avisar) {
        if (aviso.code === "MISSING_EXPORT") {
          throw new Error(
            `Import quebrado: ${aviso.message}\n` +
              "O build parou de propósito, vira tela branca em produção.",
          );
        }
        avisar(aviso);
      },
    },
  },
});
