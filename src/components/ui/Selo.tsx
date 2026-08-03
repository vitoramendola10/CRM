/**
 * Marcador de categoria/prioridade. A cor vem do banco ou de src/domain,
 * nunca de uma classe fixa: renomear ou recolorir um status na tela de config
 * nao pode exigir deploy.
 */
export function Selo({ texto, cor, mono = false }: { texto: string; cor: string; mono?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xs border px-1.5 py-0.5 text-[11px] leading-none ${
        mono ? "num" : ""
      }`}
      style={{
        color: cor,
        borderColor: `color-mix(in srgb, ${cor} 35%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${cor} 8%, transparent)`,
      }}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ backgroundColor: cor }}
      />
      {texto}
    </span>
  );
}
