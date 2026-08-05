/**
 * Termo digitado pelo usuario virando padrao de LIKE.
 *
 * O drizzle parametriza o valor, entao nao ha risco de injecao - mas `%` e `_`
 * continuam sendo curinga DENTRO do padrao. Sem isto, procurar por "%" lista a
 * tabela inteira e procurar por "100_00" casa "1000000", que nao e o que a
 * pessoa pediu. O `\` vem primeiro na troca, senao ele reescaparia os proprios
 * escapes que acabamos de inserir.
 *
 * MySQL usa `\` como escape padrao do LIKE; nenhum ESCAPE explicito e preciso.
 */
export function contem(termo: string): string {
  const escapado = termo.replace(/\\/g, "\\\\").replace(/[%_]/g, "\\$&");
  return `%${escapado}%`;
}
