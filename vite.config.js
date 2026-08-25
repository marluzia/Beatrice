import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { host: true, port: 5173 },
  build: {
    rollupOptions: {
      /**
       * Import quebrado passa a derrubar o build.
       *
       * Importar um nome que o módulo não exporta é só um aviso no Rollup: o
       * valor vira `undefined` e o build sai normalmente. Se esse valor for um
       * componente e alguém o renderizar, o React derruba a tela inteira — e o
       * erro só aparece no navegador de quem está usando. O `tsc` não pega,
       * porque não checa arquivos .jsx, e os testes só pegam o que renderizam.
       * Melhor falhar aqui.
       */
      onwarn(aviso, avisar) {
        if (aviso.code === "MISSING_EXPORT") {
          throw new Error(
            `Import quebrado: ${aviso.message}\n` +
              "O build parou de propósito — isso vira tela branca em produção.",
          );
        }
        avisar(aviso);
      },
    },
  },
});
