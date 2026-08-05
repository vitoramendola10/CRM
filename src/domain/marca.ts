/**
 * Identidade do produto, num lugar so.
 *
 * ATENCAO: `nome` esta como "MOR" por inferencia da pasta do projeto, e nao
 * porque alguem confirmou. Trocar aqui muda a barra lateral, a tela de entrada
 * e o titulo da aba de uma vez - e o unico lugar que precisa mudar.
 */
export const MARCA = {
  /** O nome da casa. Aparece grande na entrada e pequeno na lateral. */
  nome: "MOR",
  /** O que este sistema e, dentro da casa. */
  produto: "Suporte + Dev",
  /** Uma frase, nao um slogan: o que o sistema faz de fato. */
  descricao: "O atendimento do suporte e o board do desenvolvimento no mesmo lugar.",
  versao: "1.0",
} as const;

/**
 * "producao" / "desenvolvimento". Aparece na tela de entrada porque, num
 * sistema interno, saber em qual ambiente se esta e a diferenca entre testar
 * a vontade e mexer no dado do cliente.
 */
export function ambiente(): string {
  return process.env.NODE_ENV === "production" ? "producao" : "desenvolvimento";
}
