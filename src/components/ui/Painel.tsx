/**
 * Bloco de conteudo, em duas variantes - e a razao e hierarquia.
 *
 * Antes TODA tela era uma pilha de caixas identicas com rotulo de 11px, entao
 * o assunto principal da pagina tinha exatamente a mesma cara do painel lateral
 * de apoio. Quando tudo tem o mesmo peso, nada e importante.
 *
 * - `principal`: o que a pessoa veio ver. Sem caixa, titulo maior, respirando
 *   na propria pagina.
 * - `apoio` (padrao): contexto ao lado. Continua a caixa discreta de antes.
 */
export function Painel({
  titulo,
  contagem,
  variante = "apoio",
  children,
}: {
  titulo: string;
  contagem?: number;
  variante?: "principal" | "apoio";
  children: React.ReactNode;
}) {
  if (variante === "principal") {
    return (
      <section>
        <header className="mb-3 flex items-baseline gap-2 border-b border-linha pb-2">
          <h2 className="text-[15px] font-semibold tracking-tight">{titulo}</h2>
          {contagem !== undefined && (
            <span className="num text-[12px] text-tinta-fraca">{contagem}</span>
          )}
        </header>
        {children}
      </section>
    );
  }

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
      <div className="px-3 py-2.5">{children}</div>
    </section>
  );
}
