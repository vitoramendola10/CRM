/** Superficie elevada padrao: card, bloco de config, painel de lista. */
export function Painel({
  titulo,
  contagem,
  children,
}: {
  titulo: string;
  contagem?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-sm border border-linha bg-papel-alto">
      <header className="flex items-baseline justify-between border-b border-linha px-3 py-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tinta-fraca">
          {titulo}
        </h2>
        {contagem !== undefined && (
          <span className="num text-[11px] text-tinta-fraca">{contagem}</span>
        )}
      </header>
      <div className="px-3 py-2">{children}</div>
    </section>
  );
}
