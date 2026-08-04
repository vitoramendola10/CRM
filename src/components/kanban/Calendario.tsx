"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { COR_PRIORIDADE, ROTULO_PRIORIDADE, type TaskCard } from "@/domain";

/**
 * Mes de prazos. Usa `prazo` (date, sem hora) - por isso as contas sao feitas
 * em componentes de data, e nao com Date + fuso: o dia 5 e o dia 5 em qualquer
 * lugar, e converter para UTC poderia jogar o card para o dia anterior.
 */

const DIAS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
const MESES = [
  "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function hojeIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function Calendario({ cards }: { cards: TaskCard[] }) {
  const hoje = hojeIso();
  const mesAtual = useMemo(() => {
    const d = new Date();
    return { ano: d.getFullYear(), mes: d.getMonth() };
  }, []);

  const [cursor, setCursor] = useState(mesAtual);

  const comPrazo = cards.filter((c) => c.prazo !== null);
  const primeiro = new Date(cursor.ano, cursor.mes, 1);
  const diasNoMes = new Date(cursor.ano, cursor.mes + 1, 0).getDate();
  // getDay(): 0=domingo. Aqui a semana comeca na segunda.
  const deslocamento = (primeiro.getDay() + 6) % 7;

  const porDia = new Map<string, TaskCard[]>();
  for (const c of comPrazo) {
    const lista = porDia.get(c.prazo!);
    if (lista) lista.push(c);
    else porDia.set(c.prazo!, [c]);
  }

  const semPrazo = cards.filter((c) => c.prazo === null);

  function andar(delta: number) {
    const d = new Date(cursor.ano, cursor.mes + delta, 1);
    setCursor({ ano: d.getFullYear(), mes: d.getMonth() });
  }

  const celulas: (string | null)[] = [
    ...Array.from({ length: deslocamento }, () => null),
    ...Array.from(
      { length: diasNoMes },
      (_, i) =>
        `${cursor.ano}-${String(cursor.mes + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
    ),
  ];

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => andar(-1)}
          aria-label="Mes anterior"
          className="transicao size-7 rounded-sm border border-linha-forte text-tinta-media hover:bg-papel-baixo hover:text-tinta"
        >
          ‹
        </button>
        <span className="w-44 text-[13px] font-medium">
          {MESES[cursor.mes]} <span className="num">{cursor.ano}</span>
        </span>
        <button
          type="button"
          onClick={() => andar(1)}
          aria-label="Proximo mes"
          className="transicao size-7 rounded-sm border border-linha-forte text-tinta-media hover:bg-papel-baixo hover:text-tinta"
        >
          ›
        </button>
        <button
          type="button"
          onClick={() => setCursor(mesAtual)}
          className="transicao rounded-sm border border-linha-forte px-2 py-1 text-[12px] text-tinta-media hover:bg-papel-baixo hover:text-tinta"
        >
          Hoje
        </button>
        <span className="num ml-auto text-[12px] text-tinta-fraca">
          {comPrazo.length} com prazo, {semPrazo.length} sem
        </span>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-sm border border-linha bg-linha">
        {DIAS.map((d) => (
          <div
            key={d}
            className="bg-papel-baixo px-2 py-1 text-[11px] uppercase tracking-[0.06em] text-tinta-fraca"
          >
            {d}
          </div>
        ))}

        {celulas.map((iso, i) => {
          if (iso === null) return <div key={`v${i}`} className="min-h-24 bg-papel-alto/40" />;
          const doDia = porDia.get(iso) ?? [];
          const ehHoje = iso === hoje;
          const atrasado = iso < hoje;

          return (
            <div
              key={iso}
              className={`min-h-24 bg-papel-alto px-1.5 py-1 ${ehHoje ? "ring-1 ring-inset ring-acento" : ""}`}
            >
              <span
                className={`num mb-1 block text-[11px] ${
                  ehHoje ? "font-medium text-acento" : "text-tinta-fraca"
                }`}
              >
                {Number(iso.slice(8))}
              </span>

              <ul className="grid gap-0.5">
                {doDia.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/kanban/${c.codigo}`}
                      title={`DEV-${c.codigo} - ${c.assunto} (${ROTULO_PRIORIDADE[c.prioridade]})`}
                      className="transicao flex items-center gap-1 rounded-xs border-l-2 bg-papel-baixo/60 px-1 py-0.5 hover:bg-papel-baixo"
                      style={{ borderColor: COR_PRIORIDADE[c.prioridade] }}
                    >
                      <span
                        className={`num shrink-0 text-[10px] ${atrasado && c.status.categoria !== "concluido" ? "text-prio-alta" : "text-tinta-fraca"}`}
                      >
                        {c.codigo}
                      </span>
                      <span className="truncate text-[11px] leading-tight">{c.assunto}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {semPrazo.length > 0 && (
        <p className="mt-3 text-[12px] text-tinta-fraca">
          <span className="num">{semPrazo.length}</span>{" "}
          {semPrazo.length === 1 ? "rotina nao tem prazo" : "rotinas nao tem prazo"} e por isso nao
          aparecem aqui. O prazo se define no detalhe da rotina.
        </p>
      )}
    </>
  );
}
