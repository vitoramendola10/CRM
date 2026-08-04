"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BoardColumn, TaskCard } from "@/domain";
import { chamar } from "@/lib/api";
import { Card } from "./Card";

/**
 * Drag & drop com HTML5 nativo - sem biblioteca. O card arrastado carrega o id
 * no dataTransfer; a coluna calcula onde ele cairia e manda os VIZINHOS para o
 * servidor, nunca a posicao: e o servidor que decide o rank.
 */

interface Alvo {
  columnId: string;
  indice: number;
}

export function Quadro({
  colunas,
  cards,
  euId,
}: {
  colunas: BoardColumn[];
  cards: TaskCard[];
  euId: string;
}) {
  const router = useRouter();
  const [apenasMinhas, setApenasMinhas] = useState(false);
  const [arrastando, setArrastando] = useState<TaskCard | null>(null);
  const [alvo, setAlvo] = useState<Alvo | null>(null);
  const [otimista, setOtimista] = useState<TaskCard[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const todos = otimista ?? cards;
  const visiveis = apenasMinhas ? todos.filter((c) => c.responsavel?.id === euId) : todos;

  function daColuna(columnId: string): TaskCard[] {
    return visiveis
      .filter((c) => c.columnId === columnId)
      .sort((a, b) => (a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0));
  }

  async function soltar(columnId: string, indice: number) {
    const card = arrastando;
    setArrastando(null);
    setAlvo(null);
    if (!card) return;

    // Vizinhos calculados sem o proprio card: mover dentro da mesma coluna
    // desloca todo mundo que vem depois dele.
    const lista = daColuna(columnId).filter((c) => c.id !== card.id);
    const antesDeId = lista[indice - 1]?.id ?? null;
    const depoisDeId = lista[indice]?.id ?? null;

    if (card.columnId === columnId && antesDeId === null && depoisDeId === null && lista.length === 0) {
      return; // unico card da coluna, largado nela mesma
    }

    const anterior = todos;
    setOtimista(todos.map((c) => (c.id === card.id ? { ...c, columnId } : c)));
    setErro(null);

    const r = await chamar("/api/kanban/mover", "POST", {
      taskId: card.id,
      columnId,
      antesDeId,
      depoisDeId,
    });

    if (!r.ok) {
      setOtimista(anterior);
      setErro(r.erro);
      return;
    }
    setOtimista(null);
    router.refresh();
  }

  return (
    <>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex rounded-sm border border-linha-forte p-0.5">
          {[
            { valor: false, rotulo: "Todas" },
            { valor: true, rotulo: "Minhas" },
          ].map((o) => (
            <button
              key={o.rotulo}
              type="button"
              onClick={() => setApenasMinhas(o.valor)}
              className={`transicao rounded-xs px-2.5 py-0.5 text-[12px] ${
                apenasMinhas === o.valor
                  ? "bg-tinta text-papel-alto"
                  : "text-tinta-media hover:text-tinta"
              }`}
            >
              {o.rotulo}
            </button>
          ))}
        </div>

        <span className="num text-[12px] text-tinta-fraca">
          {visiveis.length} {visiveis.length === 1 ? "rotina" : "rotinas"}
        </span>

        {erro && (
          <span role="alert" className="ml-auto text-[12px] text-cat-cancelado">
            {erro}
          </span>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {colunas.map((coluna) => {
          const lista = daColuna(coluna.id);
          const estourou = coluna.wipLimit !== null && lista.length > coluna.wipLimit;

          return (
            <section
              key={coluna.id}
              className="flex w-72 shrink-0 flex-col"
              onDragOver={(e) => {
                e.preventDefault();
                // Largar na area vazia da coluna = ir para o fim.
                if (e.target === e.currentTarget) {
                  setAlvo({ columnId: coluna.id, indice: lista.length });
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                void soltar(coluna.id, alvo?.columnId === coluna.id ? alvo.indice : lista.length);
              }}
            >
              <header className="mb-1.5 flex items-baseline gap-2 border-b-2 pb-1.5" style={{ borderColor: coluna.cor }}>
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.06em]">
                  {coluna.nome}
                </h2>
                <span
                  className={`num ml-auto text-[11px] ${estourou ? "font-medium text-prio-alta" : "text-tinta-fraca"}`}
                  title={coluna.wipLimit === null ? undefined : `Limite de ${coluna.wipLimit}`}
                >
                  {lista.length}
                  {coluna.wipLimit !== null && `/${coluna.wipLimit}`}
                </span>
              </header>

              <div className="flex min-h-24 flex-1 flex-col gap-1.5">
                {lista.map((card, i) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", card.id);
                      setArrastando(card);
                    }}
                    onDragEnd={() => {
                      setArrastando(null);
                      setAlvo(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Metade de cima do card = entrar antes dele; metade de baixo = depois.
                      const r = e.currentTarget.getBoundingClientRect();
                      const acima = e.clientY < r.top + r.height / 2;
                      setAlvo({ columnId: coluna.id, indice: acima ? i : i + 1 });
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void soltar(coluna.id, alvo?.indice ?? i);
                    }}
                    className={
                      alvo?.columnId === coluna.id && alvo.indice === i
                        ? "border-t-2 border-acento pt-1"
                        : ""
                    }
                  >
                    <Card card={card} arrastando={arrastando?.id === card.id} />
                  </div>
                ))}

                {alvo?.columnId === coluna.id && alvo.indice === lista.length && (
                  <div className="h-0.5 rounded-full bg-acento" />
                )}

                {lista.length === 0 && (
                  <p className="rounded-sm border border-dashed border-linha px-2 py-4 text-center text-[12px] text-tinta-fraca">
                    Nada aqui.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
