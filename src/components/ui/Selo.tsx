/**
 * Marcador de categoria/prioridade. A cor vem do banco ou de src/domain,
 * nunca de uma classe fixa: renomear ou recolorir um status na tela de config
 * nao pode exigir deploy.
 *
 * O texto usa `.cor-legivel`, que puxa a cor na direcao do texto do tema atual.
 * Os valores gravados foram escolhidos para fundo claro; no tema escuro eles
 * ficariam abafados, e um selo ilegivel some da tela. A bolinha e a borda ficam
 * com a cor crua, que e o que identifica o status de relance.
 */
export function Selo({ texto, cor, mono = false }: { texto: string; cor: string; mono?: boolean }) {
  return (
    <span
      className={`cor-legivel inline-flex items-center gap-1.5 rounded-xs border px-1.5 py-0.5 text-[11px] leading-none ${
        mono ? "num" : ""
      }`}
      style={
        {
          "--cor-base": cor,
          borderColor: `color-mix(in srgb, ${cor} 40%, transparent)`,
          backgroundColor: `color-mix(in srgb, ${cor} 12%, transparent)`,
        } as React.CSSProperties
      }
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
      {texto}
    </span>
  );
}
