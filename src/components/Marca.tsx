import { MARCA } from "@/domain/marca";

/**
 * A marca do sistema.
 *
 * O simbolo e geometrico e nao a inicial num quadradinho - inicial em caixa
 * arredondada e o placeholder que todo projeto tem no primeiro dia e que
 * denuncia que ninguem voltou para resolver.
 *
 * Sao tres barras de alturas diferentes: as colunas do board, com trabalho
 * parando em pontos diferentes do processo. Diz o que o sistema faz, funciona
 * a 16px e a 64px, e nao depende de ilustrador nenhum para existir.
 */
export function Simbolo({ tamanho = 20 }: { tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      aria-hidden
      className="shrink-0"
      fill="none"
    >
      {/* As tres colunas, sempre presentes, em tom de linha. */}
      <rect x="2" y="3" width="5" height="18" rx="1.5" className="fill-linha-forte" />
      <rect x="9.5" y="3" width="5" height="18" rx="1.5" className="fill-linha-forte" />
      <rect x="17" y="3" width="5" height="18" rx="1.5" className="fill-linha-forte" />
      {/* O que ja andou, no acento. Alturas diferentes = fluxo, nao enfeite. */}
      <rect x="2" y="3" width="5" height="11" rx="1.5" className="fill-acento" />
      <rect x="9.5" y="3" width="5" height="16" rx="1.5" className="fill-acento" />
      <rect x="17" y="3" width="5" height="6" rx="1.5" className="fill-acento" />
    </svg>
  );
}

/**
 * Simbolo + nome. `tom` controla a hierarquia entre o nome da casa e o nome do
 * produto: na entrada a casa manda, na lateral o produto e que orienta.
 */
export function Marca({
  tamanho = "normal",
}: {
  tamanho?: "normal" | "grande";
}) {
  if (tamanho === "grande") {
    return (
      <div className="flex items-center gap-3">
        <Simbolo tamanho={38} />
        <div className="leading-none">
          <p className="text-[30px] font-semibold tracking-[0.14em] text-tinta">{MARCA.nome}</p>
          <p className="mt-1.5 text-[13px] tracking-[0.16em] text-tinta-fraca">
            {MARCA.produto.toUpperCase()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Simbolo tamanho={20} />
      <div className="min-w-0 leading-none">
        <p className="truncate text-[13px] font-semibold tracking-[0.12em]">{MARCA.nome}</p>
        <p className="mt-0.5 truncate text-[10px] tracking-[0.1em] text-tinta-fraca">
          {MARCA.produto.toUpperCase()}
        </p>
      </div>
    </div>
  );
}
