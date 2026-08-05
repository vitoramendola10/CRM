/**
 * `{{campo}}` trocado pelo valor. Sem motor de template: e um replace e so.
 *
 * Vive em lib/ e nao no service de notificacao porque os dois lados usam - o
 * worker, para montar o e-mail no servidor, e a tela de atendimento, para
 * mostrar a resposta pronta ja preenchida ANTES de enviar. Preencher so no
 * servidor faria a pessoa apertar "registrar" sem ver o que vai gravar.
 *
 * Chave ausente vira string vazia, e nao `{{cliente}}` cru na tela: chamado sem
 * cliente e caso normal, nao erro de template.
 */
export type Contexto = Record<string, string | number | null>;

export function preencher(tpl: string, ctx: Contexto): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, chave: string) => {
    const v = ctx[chave];
    return v === null || v === undefined ? "" : String(v);
  });
}
