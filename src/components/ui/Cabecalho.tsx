/** Titulo de area. Mantem a mesma altura e ritmo em toda tela interna. */
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
    <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-linha-forte pb-3">
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight">{titulo}</h1>
        {descricao && <p className="mt-0.5 text-[13px] text-tinta-media">{descricao}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
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
    <div className="rounded-sm border border-dashed border-linha-forte px-4 py-8 text-center">
      <p className="text-[13px] font-medium">{titulo}</p>
      {detalhe && <p className="mt-0.5 text-[13px] text-tinta-fraca">{detalhe}</p>}
    </div>
  );
}
