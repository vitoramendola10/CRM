import { join, resolve } from "node:path";

/**
 * Onde os arquivos anexados moram.
 *
 * Separado de lib/anexos.ts porque aquele modulo e `server-only` - importa-lo
 * de um script de CLI (o `db:backup`) estouraria na hora. Aqui e so caminho, e
 * os dois lados precisam concordar sobre ele: se o backup olhasse uma pasta e a
 * aplicacao escrevesse em outra, o backup sairia vazio sem reclamar de nada.
 *
 * Fica FORA de `public/`: la o Next serviria os arquivos direto, sem passar por
 * sessao nenhuma, e qualquer pessoa com o link leria anexo de cliente.
 */
export function pastaDeAnexos(): string {
  return resolve(process.env.ANEXOS_DIR ?? join(process.cwd(), "anexos"));
}
