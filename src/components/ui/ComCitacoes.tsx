/**
 * Realca as citacoes num texto ja gravado.
 *
 * So realca quem existe: `@fulano` escrito errado aparece como texto comum, e
 * isso e informacao - quem le percebe que aquela pessoa nao foi avisada.
 *
 * Sem `dangerouslySetInnerHTML`: o texto vem do usuario e passa por aqui
 * inteiro, entao ele e partido em pedacos e cada um vira um no de texto que o
 * React escapa sozinho. Nao ha por onde injetar marcacao.
 */
export function ComCitacoes({ texto, validos }: { texto: string; validos: Set<string> }) {
  const pedacos = texto.split(/(@[a-zA-Z0-9._-]+)/g);
  return (
    <>
      {pedacos.map((p, i) =>
        p.startsWith("@") && validos.has(p.slice(1).toLowerCase()) ? (
          <span key={i} className="rounded-xs bg-acento/15 px-0.5 font-medium text-acento">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}
