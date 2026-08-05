"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BoardColumn } from "@/domain";
import { chamar } from "@/lib/api";

/**
 * Avancar a rotina de etapa sem voltar ao board.
 *
 * Antes, a unica forma de mover era arrastar no Kanban: o dev abria a rotina,
 * lia tudo, terminava o trabalho - e tinha de voltar e procurar o card para
 * marcar como pronta. A acao mais frequente ficava na tela errada.
 *
 * Chama a MESMA rota do arrasto de proposito. Mover coluna dispara efeitos
 * (carimba o inicio, troca o status ao entrar na etapa final, devolve o chamado
 * ao suporte) e ter um segundo caminho que fizesse "quase isso" seria a forma
 * mais rapida de as duas versoes divergirem.
 *
 * `antesDeId`/`depoisDeId` nulos = fim da coluna. Numa tela sem o board a mao,
 * escolher a posicao exata nao e uma pergunta que a pessoa consegue responder.
 */
export function EtapaRapida({
  taskId,
  colunaAtual,
  colunas,
}: {
  taskId: string;
  colunaAtual: string;
  colunas: BoardColumn[];
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [atual, setAtual] = useState(colunaAtual);

  async function mover(colunaId: string) {
    if (colunaId === atual || ocupado) return;

    const anterior = atual;
    setAtual(colunaId);
    setOcupado(true);
    setErro(null);

    const r = await chamar("/api/kanban/mover", "POST", {
      taskId,
      columnId: colunaId,
      antesDeId: null,
      depoisDeId: null,
    });

    setOcupado(false);
    if (!r.ok) {
      setAtual(anterior);
      setErro(r.erro);
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap gap-0.5">
        {colunas.map((c) => {
          const ativa = c.id === atual;
          return (
            <button
              key={c.id}
              type="button"
              disabled={ocupado}
              aria-pressed={ativa}
              title={c.isDone ? "Etapa de entrega: devolve o chamado ao suporte" : undefined}
              onClick={() => void mover(c.id)}
              className={`transicao rounded-sm border px-2.5 py-1 text-[12px] disabled:opacity-50 ${
                ativa
                  ? "font-medium text-papel-alto"
                  : "border-linha-forte text-tinta-media hover:bg-papel-baixo hover:text-tinta"
              }`}
              style={ativa ? { backgroundColor: c.cor, borderColor: c.cor } : undefined}
            >
              {c.nome}
            </button>
          );
        })}
      </div>

      {erro && (
        <p role="alert" className="text-[12px] text-cat-cancelado">
          {erro}
        </p>
      )}
    </div>
  );
}
