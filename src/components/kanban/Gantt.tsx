"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { COR_PRIORIDADE, ROTULO_PRIORIDADE, type TaskCard } from "@/domain";
import { deMysql, formatarData } from "@/lib/datas";

/**
 * Gantt das rotinas. A barra vai do INICIO ate o PRAZO.
 *
 * Como nem toda rotina tem os dois, a regra e explicita e mostrada na tela:
 *  - inicio  = iniciadoEm (quando entrou em andamento); sem ele, o proprio prazo
 *  - fim     = prazo; sem ele, hoje (barra aberta, ainda correndo)
 * Rotina sem nenhum dos dois nao tem o que desenhar e sai listada a parte.
 */

const DIA_MS = 86_400_000;

function soData(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/** "2026-08-04" -> epoch UTC do dia, sem passar por fuso. */
function deIso(iso: string): number {
  const [a, m, d] = iso.split("-").map(Number);
  return Date.UTC(a!, m! - 1, d!);
}

interface Barra {
  card: TaskCard;
  inicio: number;
  fim: number;
  estimado: boolean;
  atrasada: boolean;
}

/** Altura fixa da linha. E o que permite desenhar as setas por cima em SVG. */
const LINHA_PX = 32;

export function Gantt({
  cards,
  arestas,
}: {
  cards: TaskCard[];
  /** `taskId depende de dependeDeId` - a seta vai do segundo para o primeiro. */
  arestas: { taskId: string; dependeDeId: string }[];
}) {
  const [escala, setEscala] = useState<number>(18); // px por dia
  const hoje = soData(new Date());

  const { barras, semDatas } = useMemo(() => {
    const barras: Barra[] = [];
    const semDatas: TaskCard[] = [];

    for (const c of cards) {
      const temInicio = c.inicio !== null;
      const temPrazo = c.prazo !== null;
      if (!temInicio && !temPrazo) {
        semDatas.push(c);
        continue;
      }

      const inicio = temInicio ? soData(deMysql(c.inicio!)) : deIso(c.prazo!);
      const fim = temPrazo ? deIso(c.prazo!) : hoje;
      const concluida = c.status.categoria === "concluido";

      barras.push({
        card: c,
        inicio: Math.min(inicio, fim),
        fim: Math.max(inicio, fim),
        estimado: !temInicio || !temPrazo,
        atrasada: temPrazo && deIso(c.prazo!) < hoje && !concluida,
      });
    }

    barras.sort((a, b) => a.inicio - b.inicio || a.fim - b.fim);
    return { barras, semDatas };
  }, [cards, hoje]);

  if (barras.length === 0) {
    return (
      <p className="rounded-sm border border-dashed border-linha px-4 py-8 text-center text-[13px] text-tinta-fraca">
        Nenhuma rotina tem inicio ou prazo definido. O Gantt precisa de pelo menos um dos dois.
      </p>
    );
  }

  // Uma folga de 2 dias de cada lado para as barras nao encostarem na borda.
  const de = Math.min(...barras.map((b) => b.inicio), hoje) - 2 * DIA_MS;
  const ate = Math.max(...barras.map((b) => b.fim), hoje) + 2 * DIA_MS;
  const totalDias = Math.round((ate - de) / DIA_MS) + 1;
  const larguraPx = totalDias * escala;

  const dias = Array.from({ length: totalDias }, (_, i) => de + i * DIA_MS);
  const posicao = (t: number) => Math.round((t - de) / DIA_MS) * escala;

  /**
   * Setas de dependencia.
   *
   * Gantt sem dependencia e uma lista com barras coloridas: o que faz o grafico
   * valer e ver que uma rotina nao pode comecar antes da outra terminar. So
   * entram as arestas cujas DUAS pontas estao desenhadas - depender de rotina
   * sem data nenhuma nao tem como virar linha, e inventar posicao seria mentir.
   *
   * A seta fica VERMELHA quando a dependencia termina depois do inicio de quem
   * espera: isso e um conflito de cronograma, e e a unica coisa que o grafico
   * consegue apontar sozinho.
   */
  const linhaDe = new Map(barras.map((b, i) => [b.card.id, i]));
  const setas = arestas.flatMap((a) => {
    const iAlvo = linhaDe.get(a.taskId);
    const iOrigem = linhaDe.get(a.dependeDeId);
    if (iAlvo === undefined || iOrigem === undefined) return [];

    const origem = barras[iOrigem]!;
    const alvo = barras[iAlvo]!;
    return [
      {
        chave: `${a.dependeDeId}-${a.taskId}`,
        x1: posicao(origem.fim) + escala,
        y1: iOrigem * LINHA_PX + LINHA_PX / 2,
        x2: posicao(alvo.inicio),
        y2: iAlvo * LINHA_PX + LINHA_PX / 2,
        conflito: origem.fim > alvo.inicio,
      },
    ];
  });

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-[12px] text-tinta-media">
          Zoom
          <input
            type="range"
            min={8}
            max={40}
            step={2}
            value={escala}
            onChange={(e) => setEscala(Number(e.target.value))}
            className="w-32"
          />
        </label>
        <span className="num text-[12px] text-tinta-fraca">
          {barras.length} {barras.length === 1 ? "rotina" : "rotinas"} no periodo
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-tinta-fraca">
          <span className="inline-block h-2 w-4 rounded-full bg-tinta-fraca/50" />
          barra tracejada = data estimada
        </span>
      </div>

      <div className="overflow-x-auto rounded-sm border border-linha bg-papel-alto">
        <div style={{ width: larguraPx + 260, minWidth: "100%" }}>
          {/* Regua de dias */}
          <div className="sticky top-0 z-10 flex border-b border-linha bg-papel-baixo">
            <div className="w-[260px] shrink-0 border-r border-linha px-2 py-1 text-[11px] uppercase tracking-[0.06em] text-tinta-fraca">
              Rotina
            </div>
            <div className="relative" style={{ width: larguraPx }}>
              {dias.map((t, i) => {
                const d = new Date(t);
                const primeiroDoMes = d.getUTCDate() === 1;
                const seg = d.getUTCDay() === 1;
                if (!primeiroDoMes && !seg) return null;
                return (
                  <span
                    key={t}
                    className={`num absolute top-0 whitespace-nowrap px-1 py-1 text-[10px] ${
                      primeiroDoMes ? "font-medium text-tinta" : "text-tinta-fraca"
                    }`}
                    style={{ left: i * escala }}
                  >
                    {primeiroDoMes
                      ? d.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
                      : d.getUTCDate()}
                  </span>
                );
              })}
              <div className="h-6" />
            </div>
          </div>

          {/* Linhas. `relative` para o SVG das setas se posicionar por cima. */}
          <ul className="relative">
            {setas.length > 0 && (
              <svg
                aria-hidden
                className="pointer-events-none absolute z-10"
                style={{ left: 260, top: 0, width: larguraPx, height: barras.length * LINHA_PX }}
              >
                <defs>
                  <marker
                    id="seta-dep"
                    viewBox="0 0 8 8"
                    refX="7"
                    refY="4"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto"
                  >
                    <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
                  </marker>
                </defs>
                {/* Cotovelo em vez de reta: a diagonal cruzaria as barras do
                    meio e viraria emaranhado assim que houvesse tres setas. */}
                {setas.map((s) => (
                  <path
                    key={s.chave}
                    d={`M ${s.x1} ${s.y1} H ${Math.max(s.x1 + 6, s.x2 - 10)} V ${s.y2} H ${s.x2}`}
                    fill="none"
                    strokeWidth={1.5}
                    strokeDasharray={s.conflito ? undefined : "3 3"}
                    markerEnd="url(#seta-dep)"
                    className={s.conflito ? "text-prio-urgente" : "text-tinta-fraca"}
                    stroke="currentColor"
                  />
                ))}
              </svg>
            )}

            {barras.map(({ card, inicio, fim, estimado, atrasada }) => {
              const esquerda = posicao(inicio);
              // Minimo de 1 dia para uma rotina que comeca e vence no mesmo dia
              // nao virar uma barra invisivel.
              const largura = Math.max(escala, posicao(fim) - esquerda + escala);
              const cor = COR_PRIORIDADE[card.prioridade];

              return (
                // Altura fixa: e dela que o SVG das setas tira o Y de cada
                // linha. Deixar a altura seguir o conteudo desalinharia as
                // setas no dia em que um titulo quebrasse em duas linhas.
                <li
                  key={card.id}
                  style={{ height: LINHA_PX }}
                  className="flex border-b border-linha last:border-0"
                >
                  <div className="flex w-[260px] shrink-0 items-center gap-2 border-r border-linha px-2 py-1.5">
                    <Avatar nome={card.responsavel?.nome ?? null} tamanho={18} />
                    <Link
                      href={`/kanban/${card.codigo}`}
                      className="min-w-0 flex-1 truncate text-[12px] hover:text-acento"
                      title={card.assunto}
                    >
                      {card.assunto}
                    </Link>
                    <span className="num shrink-0 text-[10px] text-tinta-fraca">
                      {card.codigo}
                    </span>
                  </div>

                  <div className="relative py-1.5" style={{ width: larguraPx }}>
                    {/* Hoje: a referencia que faz o grafico significar alguma coisa. */}
                    <span
                      aria-hidden
                      className="absolute inset-y-0 w-px bg-acento/40"
                      style={{ left: posicao(hoje) + escala / 2 }}
                    />
                    <span
                      title={`${formatarData(card.inicio)} ate ${card.prazo ?? "sem prazo"} - ${ROTULO_PRIORIDADE[card.prioridade]}`}
                      className={`absolute top-1.5 flex h-5 items-center rounded-xs px-1.5 text-[10px] leading-none text-papel-alto ${
                        estimado ? "border border-dashed" : ""
                      }`}
                      style={{
                        left: esquerda,
                        width: largura,
                        backgroundColor: estimado
                          ? `color-mix(in srgb, ${cor} 25%, transparent)`
                          : cor,
                        borderColor: cor,
                        color: estimado ? cor : undefined,
                      }}
                    >
                      {atrasada && <span className="num font-medium">atrasada</span>}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {semDatas.length > 0 && (
        <p className="mt-3 text-[12px] text-tinta-fraca">
          <span className="num">{semDatas.length}</span>{" "}
          {semDatas.length === 1
            ? "rotina ficou de fora por nao ter inicio nem prazo"
            : "rotinas ficaram de fora por nao terem inicio nem prazo"}
          : {semDatas.map((c) => `DEV-${c.codigo}`).join(", ")}.
        </p>
      )}
    </>
  );
}
