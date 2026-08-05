"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { DIRECAO, alvoDoTeclado, type Direcao } from "./alvo-teclado";
import { Card } from "./Card";
import { useArrasto } from "./useArrasto";
import { usePreferencia } from "./usePreferencia";

/**
 * O card arrastado acompanha o cursor, inclinado e com sombra; o lugar de origem
 * fica como um vao tracejado. O calculo de posicao nao muda: o cliente manda os
 * VIZINHOS para o servidor, nunca o indice - e o servidor que decide o rank.
 *
 * Arrastar so existe no agrupamento por etapa. Nos outros eixos as colunas sao
 * derivadas dos cards, e mover um card entre elas significaria editar um campo
 * (trocar o responsavel, o cliente) - o que se faz no detalhe da rotina, com
 * historico, e nao por arrasto silencioso.
 *
 * Todo movimento tem tambem caminho por teclado (Alt + setas). Nao e enfeite de
 * acessibilidade: arrastar era a UNICA forma de avancar uma rotina de etapa, e
 * quem nao usa mouse ficava sem conseguir tocar o processo.
 */

function orfas(cards: TaskCard[]): number {
  return cards.filter((c) => c.responsavel === null).length;
}

function Indicador({ alerta = false }: { alerta?: boolean }) {
  const cor = alerta ? "bg-prio-alta" : "bg-acento";
  return (
    <span
      aria-hidden
      /* Absolute dentro do vao de 6px entre os cards: ocupar espaco no fluxo
         faria a coluna inteira pular a cada movimento do mouse. */
      className={`pointer-events-none absolute inset-x-0 -top-1 z-10 h-0.5 rounded-full ${cor}`}
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
  // Como a pessoa gosta de olhar o board fica guardado no navegador dela.
  const [eixo, setEixo] = usePreferencia<AgrupamentoKanban>(
    "kanban.eixo",
    "etapa",
    AGRUPAMENTOS_KANBAN,
  );
  const [quem, setQuem] = usePreferencia<"todas" | "minhas">("kanban.quem", "todas", [
    "todas",
    "minhas",
  ]);
  const apenasMinhas = quem === "minhas";
  const [filtroEtiqueta, setFiltroEtiqueta] = useState<string | null>(null);
  const [soSemDono, setSoSemDono] = useState(false);
  const [otimista, setOtimista] = useState<TaskCard[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  /** Card que acabou de ser movido pelo teclado, para nao perder o foco. */
  const [foco, setFoco] = useState<string | null>(null);
  /** O que o leitor de tela anuncia depois de um movimento por teclado. */
  const [aviso, setAviso] = useState("");

  const todos = otimista ?? cards;
  const podeArrastar = eixo === "etapa";

  const visiveis = useMemo(() => {
    let v = todos;
    if (apenasMinhas) v = v.filter((c) => c.responsavel?.id === euId);
    if (soSemDono) v = v.filter((c) => c.responsavel === null);
    if (filtroEtiqueta) v = v.filter((c) => c.etiquetas.some((e) => e.id === filtroEtiqueta));
    return v;
  }, [todos, apenasMinhas, soSemDono, filtroEtiqueta, euId]);

  /**
   * Conta sobre TODOS os cards, e nao sobre os visiveis: o botao precisa dizer
   * quanto trabalho esta sem dono no board, mesmo quando o filtro em uso
   * escondeu tudo. Um "Sem responsavel 0" enquanto ha cinco orfaos em outra
   * etiqueta seria pior do que nao ter contador.
   */
  const totalSemDono = useMemo(() => todos.filter((c) => c.responsavel === null).length, [todos]);

  const grupos = useMemo(() => agruparCards(visiveis, colunas, eixo), [visiveis, colunas, eixo]);

  const soltar = useCallback(
    async (colunaId: string, indice: number, card: TaskCard) => {
      const grupo = agruparCards(visiveis, colunas, "etapa").find((g) => g.id === colunaId);
      // Vizinhos calculados sem o proprio card: mover dentro da mesma coluna
      // desloca todo mundo que vem depois dele.
      const lista = (grupo?.cards ?? []).filter((c) => c.id !== card.id);
      const posicao = Math.min(indice, lista.length);
      const antesDeId = lista[posicao - 1]?.id ?? null;
      const depoisDeId = lista[posicao]?.id ?? null;

      // Largado exatamente onde estava: nada a fazer.
      if (card.columnId === colunaId && antesDeId === null && depoisDeId === null) return;

      const anterior = todos;
      setOtimista(todos.map((c) => (c.id === card.id ? { ...c, columnId: colunaId } : c)));
      setErro(null);

      const r = await chamar("/api/kanban/mover", "POST", {
        taskId: card.id,
        columnId: colunaId,
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
    },
    [visiveis, colunas, todos, router],
  );

  const { arrasto, comecar } = useArrasto(
    (colunaId, indice, card) => void soltar(colunaId, indice, card),
    podeArrastar,
  );

  /**
   * Mesma operacao do arrasto, pelo teclado. Reaproveita `soltar`, entao o
   * calculo de vizinhos e o otimismo da UI sao exatamente os mesmos - nao ha um
   * segundo caminho de movimento para manter em dia.
   */
  const moverPorTeclado = useCallback(
    (card: TaskCard, direcao: Direcao) => {
      const alvo = alvoDoTeclado(grupos, card, direcao);
      if (!alvo) return; // Ponta do board ou da coluna: nada a fazer, em silencio.
      setFoco(card.id);
      setAviso(alvo.aviso);
      void soltar(alvo.colunaId, alvo.indice, card);
    },
    [grupos, soltar],
  );

  /**
   * Mover troca o card de coluna, entao o React desmonta e remonta o elemento e
   * o foco cairia no <body> - quem estava movendo com o teclado perderia o card
   * a cada tecla. Devolve o foco ao mesmo card no lugar novo.
   */
  useEffect(() => {
    if (!foco) return;
    const alvo = document.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(foco)}"] a`);
    if (alvo && document.activeElement !== alvo) alvo.focus();
  }, [foco, grupos]);

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
          {(["todas", "minhas"] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setQuem(o)}
              className={`transicao rounded-xs px-2.5 py-0.5 text-[12px] capitalize ${
                quem === o ? "bg-tinta text-papel-alto" : "text-tinta-media hover:text-tinta"
              }`}
            >
              {o}
            </button>
          ))}
        </div>

        {/* Vale para qualquer eixo: e o filtro do trabalho que ninguem pegou. */}
        <button
          type="button"
          aria-pressed={soSemDono}
          onClick={() => setSoSemDono(!soSemDono)}
          className={`transicao rounded-sm border px-2.5 py-1 text-[12px] ${
            soSemDono
              ? "border-prio-alta bg-prio-alta text-papel"
              : "border-linha-forte text-tinta-media hover:bg-papel-baixo hover:text-tinta"
          }`}
        >
          Sem responsavel
          <span className="num ml-1.5 text-[11px] opacity-75">{totalSemDono}</span>
        </button>

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

        <span className="text-[12px] text-tinta-fraca">
          {podeArrastar
            ? "Arraste ou use Alt + setas no card em foco."
            : "Arrastar so no agrupamento por etapa."}
        </span>

        {/* Movimento por teclado nao muda nada visivel perto do foco: sem isto,
            quem usa leitor de tela nao saberia se a tecla fez efeito. */}
        <span aria-live="polite" className="sr-only">
          {aviso}
        </span>

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
        <div data-board-rolagem className="flex gap-2 overflow-x-auto pb-2">
          {grupos.map((grupo) => {
            const lista = grupo.cards;
            const estourou = grupo.wipLimit !== null && lista.length > grupo.wipLimit;
            const recebendo = arrasto?.alvo?.colunaId === grupo.id;
            const vaiEstourar =
              recebendo &&
              grupo.wipLimit !== null &&
              arrasto.card.columnId !== grupo.id &&
              lista.length + 1 > grupo.wipLimit;

            return (
              <section
                key={grupo.id}
                data-coluna-id={podeArrastar ? grupo.id : undefined}
                data-coluna-total={lista.length}
                className="flex w-72 shrink-0 flex-col"
              >
                <header
                  className="mb-1.5 flex items-baseline gap-2 border-b-2 pb-1.5"
                  style={{ borderColor: vaiEstourar ? "var(--color-prio-alta)" : grupo.cor }}
                >
                  <h2 className="truncate text-[12px] font-semibold uppercase tracking-[0.06em]">
                    {grupo.nome}
                  </h2>

                  {/* Trabalho sem dono, por etapa. Cinco orfaos no Backlog e
                      uma fila; um orfao em Homologacao e alguem que largou algo
                      no meio - o mesmo numero total esconde os dois casos. */}
                  {orfas(lista) > 0 && (
                    <span
                      title={`${orfas(lista)} sem responsavel nesta etapa`}
                      className="num rounded-xs border border-dashed border-tinta-fraca px-1 text-[10px] text-tinta-fraca"
                    >
                      {orfas(lista)} s/ dono
                    </span>
                  )}

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
                  {lista.map((card, i) => {
                    const saindo = arrasto?.card.id === card.id;
                    return (
                      <div
                        key={card.id}
                        data-coluna-id={podeArrastar ? grupo.id : undefined}
                        data-card-indice={podeArrastar ? i : undefined}
                        data-card-id={card.id}
                        onPointerDown={(e) => comecar(e, card)}
                        onKeyDown={(e) => {
                          if (!podeArrastar || !e.altKey) return;
                          const direcao = DIRECAO[e.key as keyof typeof DIRECAO];
                          if (!direcao) return;
                          // Alt+Seta esquerda e "voltar" no navegador; sem isto
                          // o card mudaria de coluna e a pagina sairia junto.
                          e.preventDefault();
                          moverPorTeclado(card, direcao);
                        }}
                        /* `relative` para o indicador ficar em absolute sem
                           empurrar a coluna a cada movimento do mouse. */
                        className="relative"
                      >
                        {recebendo && arrasto.alvo?.indice === i && (
                          <Indicador alerta={vaiEstourar} />
                        )}
                        {saindo ? (
                          // O card nao some: ele esta na mao. Aqui fica o vao do
                          // tamanho exato dele, para a coluna nao encolher.
                          <div
                            style={{ height: arrasto.altura }}
                            className="rounded-sm border border-dashed border-linha-forte bg-papel-baixo/30"
                          />
                        ) : (
                          <Card card={card} arrastavel={podeArrastar} />
                        )}
                      </div>
                    );
                  })}

                  {recebendo && arrasto.alvo?.indice === lista.length && lista.length > 0 && (
                    <div className="relative">
                      <Indicador alerta={vaiEstourar} />
                    </div>
                  )}

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

      {/* O card na mao. pointer-events:none para o elementsFromPoint enxergar a
          coluna por baixo dele. */}
      {arrasto && (
        <div
          className="pointer-events-none fixed left-0 top-0 z-50"
          style={{
            width: arrasto.largura,
            transform: `translate3d(${arrasto.x}px, ${arrasto.y}px, 0) rotate(1.5deg) scale(1.02)`,
            filter: "var(--arrasto-filtro)",
          }}
        >
          <Card card={arrasto.card} arrastavel />
        </div>
      )}
    </>
  );
}
