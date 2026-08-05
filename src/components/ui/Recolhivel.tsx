/**
 * Painel que abre e fecha, com um resumo visivel quando fechado.
 *
 * `<details>` nativo: guarda o estado de aberto sozinho, funciona sem
 * JavaScript, e ja vem com o teclado e o leitor de tela certos - `<div>` com
 * `onClick` daria trabalho para chegar no mesmo lugar e chegaria pior.
 *
 * O resumo e a razao de existir: um painel fechado que so diz "Horas" obriga a
 * abrir para saber se tem alguma coisa dentro. Dizendo "Horas - 1h30 de 8h",
 * na maioria das vezes nao precisa abrir.
 */
export function Recolhivel({
  titulo,
  resumo,
  aberto = false,
  destaque = false,
  children,
}: {
  titulo: string;
  resumo?: string | undefined;
  aberto?: boolean;
  /** Puxa atencao quando ha algo que a pessoa precisa ver (rotina travada). */
  destaque?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={aberto}
      className={`group rounded-sm border bg-papel-alto ${
        destaque ? "border-prio-alta/45" : "border-linha"
      }`}
    >
      <summary className="transicao flex cursor-pointer list-none items-baseline gap-2 px-3 py-2 hover:bg-papel-baixo">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tinta-fraca">
          {titulo}
        </span>
        {resumo && (
          <span className={`num text-[12px] ${destaque ? "text-prio-alta" : "text-tinta-media"}`}>
            {resumo}
          </span>
        )}
        {/* Gira ao abrir. `marker:hidden` nao basta no Safari, dai o list-none
            no summary mais o triangulo proprio. */}
        <span
          aria-hidden
          className="ml-auto text-[11px] text-tinta-fraca transition-transform group-open:rotate-90"
        >
          ▸
        </span>
      </summary>
      <div className="border-t border-linha px-3 py-2">{children}</div>
    </details>
  );
}
