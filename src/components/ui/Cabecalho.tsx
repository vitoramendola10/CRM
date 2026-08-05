/**
 * Titulo de area.
 *
 * O titulo era 17px - quase o mesmo tamanho do texto do conteudo, o que
 * achatava a pagina inteira. Agora e um degrau de verdade acima, com o mesmo
 * traco de acento que marca o item ativo da barra lateral: repetir um sinal
 * e o que faz virar sistema em vez de colecao de telas parecidas.
 */
export function Cabecalho({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-linha-forte pb-4">
      <div className="relative pl-3">
        <span aria-hidden className="absolute inset-y-0.5 left-0 w-[3px] rounded-full bg-acento" />
        <h1 className="titulo-pagina">{titulo}</h1>
        {descricao && <p className="mt-1 text-[13px] text-tinta-media">{descricao}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

/** Estado vazio escrito como frase de gente, nunca "No data available". */
export function Vazio({
  titulo,
  detalhe,
}: {
  titulo: string;
  detalhe?: string | undefined;
}) {
  return (
    <div className="rounded-sm border border-dashed border-linha-forte px-4 py-10 text-center">
      <p className="text-[13px] font-medium">{titulo}</p>
      {detalhe && <p className="mt-1 text-[13px] text-tinta-fraca">{detalhe}</p>}
    </div>
  );
}
