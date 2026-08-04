"use client";

import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { ROTAS, ROTULO_SITUACAO_TICKET, SITUACOES_TICKET } from "@/domain";

/** O filtro vive na URL: recarregar ou compartilhar o link mantem a visao. */
export function FiltroSituacao({ contagem }: { contagem: Record<string, number> }) {
  const router = useRouter();
  const params = useSearchParams();
  const atual = params.get("situacao");

  function ir(situacao: string | null) {
    const p = new URLSearchParams(params.toString());
    if (situacao) p.set("situacao", situacao);
    else p.delete("situacao");
    // A rota e literal; o typedRoutes so nao consegue provar a query string.
    router.push(`${ROTAS.atendimentos}${p.size > 0 ? `?${p}` : ""}` as Route);
  }

  const total = Object.values(contagem).reduce((a, b) => a + b, 0);

  return (
    <div className="mb-3 flex flex-wrap gap-0.5">
      <Aba rotulo="Todos" n={total} ativo={atual === null} onClick={() => ir(null)} />
      {SITUACOES_TICKET.map((s) => (
        <Aba
          key={s}
          rotulo={ROTULO_SITUACAO_TICKET[s]}
          n={contagem[s] ?? 0}
          ativo={atual === s}
          onClick={() => ir(s)}
        />
      ))}
    </div>
  );
}

function Aba({
  rotulo,
  n,
  ativo,
  onClick,
}: {
  rotulo: string;
  n: number;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`transicao flex items-baseline gap-1.5 rounded-sm border px-2.5 py-1 text-[12px] ${
        ativo
          ? "border-tinta bg-tinta text-papel-alto"
          : "border-linha-forte text-tinta-media hover:bg-papel-baixo hover:text-tinta"
      }`}
    >
      {rotulo}
      <span className={`num text-[11px] ${ativo ? "opacity-70" : "text-tinta-fraca"}`}>{n}</span>
    </button>
  );
}
