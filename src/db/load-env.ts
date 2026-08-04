import { config } from "dotenv";

/**
 * Modulo so de efeito colateral. Scripts de CLI (seed, workers) precisam do
 * .env.local carregado ANTES de qualquer import que leia process.env no topo -
 * caso do client.ts. Como ESM avalia os imports na ordem em que aparecem,
 * `import "./load-env"` na primeira linha garante isso; um loadEnv() no corpo
 * do modulo rodaria tarde demais.
 *
 * O Next carrega .env.local sozinho, entao isto nao entra no runtime da app.
 */
config({ path: ".env.local", quiet: true });
