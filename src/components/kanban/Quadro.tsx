"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Selo } from "@/components/ui/Selo";
import {
  AGRUPAMENTOS_KANBAN,
  ROTULO_AGRUPAMENTO,
  type AgrupamentoKanban,
  type BoardColumn,
  type Etiqueta,
  type TaskCard,
} from "@/domain";
import { agruparCards } from "@/lib/agrupar";
import { chamar } from "@/lib/api";
import { Card } from "./Card";

/**
 * Drag & drop com HTML5 nativo - sem biblioteca. O card arrastado carrega o id
 * no dataTransfer; a coluna calcula onde ele cairia e manda os VIZINHOS para o
 * servidor, nunca a posicao: e o servidor que decide o rank.
 *
 * Arrastar so existe no agrupamento por etapa. Nos outros eixos as colunas sao
 * derivadas dos cards, e mover um card entre elas significaria editar um campo
 * (trocar o responsavel, o cliente) - o que se faz no detalhe da rotina, com
 * historico, e nao por arrasto silencioso.
 */

interface Alvo {
  columnId: string;
  indice: number;
}

/**
 * Onde o card vai cair. Fica em absolute, dentro do vao de 6px entre os cards:
 * ocupar espaco no fluxo faria a coluna inteira pular a cada movimento do mouse.
 */
function Indicador({ alerta = false, noFim = false }: { alerta?: boolean; noFim?: boolean }) {
  const cor = alerta ? "bg-prio-alta" : "bg-acento";
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 z-10 h-0.5 rounded-full ${cor} ${
        noFim ? "-bottom-1" : "-top-1"
      }`}
    >
      <span className={`absolute -left-0.5 -top-[3px] size-2 rounded-full ${cor}`} />
    </span>
  );
}

export function Quadro({
  colunas,
  cards,
  euId,
  etiquetas,
}: {
  colunas: BoardColumn[];
  cards: TaskCard[];
  euId: string;
  etiquetas: Etiqueta[];
}) {
  const router = useRouter();
  const [eixo, setEixo] = useState<AgrupamentoKanban>("etapa");
  const [apenasMinhas, setApenasMinhas] = useState(false);
  const [filtroEtiqueta, setFiltroEtiqueta] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<TaskCard | null>(null);
  const [alvo, setAlvo] = useState<Alvo | null>(null);
  const [otimista, setOtimista] = useState<TaskCard[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const todos = otimista ?? cards;
  const podeArrastar = eixo === "etapa";

  const visiveis = useMemo(() => {
    let v = todos;
    if (apenasMinhas) v = v.filter((c) => c.responsavel?.id === euId);
    if (filtroEtiqueta) v = v.filter((c) => c.etiquetas.some((e) => e.id === filtroEtiqueta));
    return v;
  }, [todos, apenasMinhas, filtroEtiqueta, euId]);

  const grupos = useMemo(
    () => agruparCards(visiveis, colunas, eixo),
    [visiveis, colunas, eixo],
  );

  async function soltar(columnId: string, indice: number) {
    const card = arrastando;
    setArrastando(null);
    setAlvo(null);
    if (!card || !podeArrastar) return;

    const grupo = grupos.find((g) => g.id === columnId);
    // Vizinhos calculados sem o proprio card: mover dentro da mesma coluna
    // desloca todo mundo que vem depois dele.
    const lista = (grupo?.cards ?? []).filter((c) => c.id !== card.id);
    const antesDeId = lista[indice - 1]?.id ?? null;
    const depoisDeId = lista[indice] ?.id ?? null;

    if (card.columnId === columnId && antesDeId === null && depoisDeId === null) return;

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
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="flex items-center gap-1.5 text-[12px] text-tinta-media">
          Agrupar por
          <select
            value={eixo}
            onChange={(e) => setEixo(e.target.value as AgrupamentoKanban)}
            className="transicao h-7 cursor-pointer rounded-sm border border-linha-forte bg-papel-alto px-1.5 text-[12px] text-tinta hover:border-tinta-fraca"
          >
            {AGRUPAMENTOS_KANBAN.map((a) => (
              <option key={a} value={a}>
                {ROTULO_AGRUPAMENTO[a]}
              </option>
            ))}
          </select>
        </label>

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

        {etiquetas.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {etiquetas.map((e) => {
              const ativa = filtroEtiqueta === e.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  aria-pressed={ativa}
                  onClick={() => setFiltroEtiqueta(ativa ? null : e.id)}
                  className={`transicao rounded-xs ${ativa ? "" : "opacity-40 hover:opacity-80"}`}
                >
                  <Selo texto={e.nome} cor={e.cor} />
                </button>
              );
            })}
          </div>
        )}

        <span className="num text-[12px] text-tinta-fraca">
          {visiveis.length} {visiveis.length === 1 ? "rotina" : "rotinas"}
        </span>

        {!podeArrastar && (
          <span className="text-[12px] text-tinta-fraca">
            Arrastar so no agrupamento por etapa.
          </span>
        )}

        {erro && (
          <span role="alert" className="ml-auto text-[12px] text-cat-cancelado">
            {erro}
          </span>
        )}
      </div>

      {grupos.length === 0 ? (
        <p className="rounded-sm border border-dashed border-linha px-4 py-8 text-center text-[13px] text-tinta-fraca">
          Nenhuma rotina para este filtro.
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {grupos.map((grupo) => {
            const lista = grupo.cards;
            const estourou = grupo.wipLimit !== null && lista.length > grupo.wipLimit;
            const recebendo = podeArrastar && arrastando !== null && alvo?.columnId === grupo.id;
            const vaiEstourar =
              recebendo &&
              grupo.wipLimit !== null &&
              arrastando.columnId !== grupo.id &&
              lista.length + 1 > grupo.wipLimit;

            return (
              <section
                key={grupo.id}
                className="flex w-72 shrink-0 flex-col"
                onDragOver={(e) => {
                  if (!podeArrastar) return;
                  e.preventDefault();
                  // Largar na area vazia abaixo dos cards = ir para o fim.
                  setAlvo({ columnId: grupo.id, indice: lista.length });
                }}
                onDrop={(e) => {
                  if (!podeArrastar) return;
                  e.preventDefault();
                  void soltar(grupo.id, alvo?.columnId === grupo.id ? alvo.indice : lista.length);
                }}
              >
                <header
                  className="mb-1.5 flex items-baseline gap-2 border-b-2 pb-1.5"
                  style={{ borderColor: vaiEstourar ? "var(--color-prio-alta)" : grupo.cor }}
                >
                  <h2 className="truncate text-[12px] font-semibold uppercase tracking-[0.06em]">
                    {grupo.nome}
                  </h2>
                  <span
                    className={`num ml-auto text-[11px] ${
                      estourou || vaiEstourar ? "font-medium text-prio-alta" : "text-tinta-fraca"
                    }`}
                    title={grupo.wipLimit === null ? undefined : `Limite de ${grupo.wipLimit}`}
                  >
                    {lista.length}
                    {grupo.wipLimit !== null && `/${grupo.wipLimit}`}
                  </span>
                </header>

                <div
                  className={`transicao flex min-h-24 flex-1 flex-col gap-1.5 rounded-sm ${
                    recebendo
                      ? "bg-papel-alto/70 outline-1 outline-linha-forte"
                      : "outline-transparent"
                  }`}
                >
                  {lista.map((card, i) => (
                    <div
                      key={card.id}
                      draggable={podeArrastar}
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
                        if (!podeArrastar) return;
                        e.preventDefault();
                        e.stopPropagation();
                        // Metade de cima = entrar antes dele; metade de baixo = depois.
                        const r = e.currentTarget.getBoundingClientRect();
                        const acima = e.clientY < r.top + r.height / 2;
                        setAlvo({ columnId: grupo.id, indice: acima ? i : i + 1 });
                      }}
                      onDrop={(e) => {
                        if (!podeArrastar) return;
                        e.preventDefault();
                        e.stopPropagation();
                        void soltar(grupo.id, alvo?.indice ?? i);
                      }}
                      /* `relative` para o indicador poder ficar em absolute: uma
                         linha no fluxo empurraria a coluna a cada movimento. */
                      className="relative"
                    >
                      {recebendo && alvo.indice === i && <Indicador alerta={vaiEstourar} />}
                      <Card
                        card={card}
                        arrastando={arrastando?.id === card.id}
                        arrastavel={podeArrastar}
                      />
                      {recebendo && alvo.indice === lista.length && i === lista.length - 1 && (
                        <Indicador alerta={vaiEstourar} noFim />
                      )}
                    </div>
                  ))}

                  {lista.length === 0 && (
                    <p
                      className={`transicao rounded-sm border border-dashed px-2 py-4 text-center text-[12px] ${
                        recebendo ? "border-acento text-acento" : "border-linha text-tinta-fraca"
                      }`}
                    >
                      {recebendo ? "Soltar aqui" : "Nada aqui."}
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
