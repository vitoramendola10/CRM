export const TEMAS = ["escuro", "claro"] as const;
export type Tema = (typeof TEMAS)[number];

export const TEMA_PADRAO: Tema = "escuro";
export const TEMA_CHAVE = "crm_tema";

/**
 * Roda antes da primeira pintura, injetado no <head>. Sem isto a pagina
 * apareceria no tema padrao e trocaria depois que o React hidratasse - o
 * "flash" branco que denuncia tema mal implementado.
 *
 * Fica como string porque precisa ser sincrono e sem dependencia de bundle.
 */
export const SCRIPT_TEMA = `
try {
  var t = localStorage.getItem(${JSON.stringify(TEMA_CHAVE)});
  document.documentElement.dataset.tema = t === "claro" || t === "escuro" ? t : ${JSON.stringify(TEMA_PADRAO)};
} catch (e) {}
`.trim();
