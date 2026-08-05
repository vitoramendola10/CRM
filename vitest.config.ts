import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Os testes cobrem as regras puras: rank, agrupamento, limitador de login,
 * escape de LIKE, paginacao, datas e as decisoes do dominio. Nenhum deles fala
 * com o banco - dai `environment: "node"` e nenhum setup.
 *
 * O que ficou de fora, e de proposito: a transacao de escalar chamado, o
 * SKIP LOCKED do worker e as consultas do dashboard. Testar isso de verdade
 * exige um banco de teste separado (nao o `crm` de desenvolvimento, que tem
 * dado real), e essa e uma decisao de infraestrutura, nao de teste.
 */
export default defineConfig({
  resolve: {
    alias: {
      // Mesmo `@/` do tsconfig; o vitest nao le paths do TypeScript sozinho.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      /**
       * `server-only` estoura ao ser importado fora do bundle de servidor do
       * Next, e o teste roda em Node puro. O proprio pacote ja traz o modulo
       * vazio que o Next usa na condicao "react-server" - apontar para ele
       * mantem a marcacao valendo no build e destrava o import aqui.
       */
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
