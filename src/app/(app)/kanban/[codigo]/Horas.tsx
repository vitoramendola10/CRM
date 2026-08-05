"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import type { Apontamento } from "@/db/queries/worklog";
import { chamar } from "@/lib/api";
import { formatarData } from "@/lib/datas";
import { formatarMinutos, paraMinutos } from "@/lib/horas";

/**
 * Apontamento de horas da rotina.
 *
 * A estimativa aparece do lado do realizado de proposito: os dois numeros
 * sozinhos nao dizem nada, e a comparacao e a unica coisa que serve para
 * aprender a estimar melhor na proxima.
 */
export function Horas({
  taskId,
  estimativaH,
  apontamentos,
  euId,
}: {
  taskId: string;
  estimativaH: number | null;
  apontamentos: Apontamento[];
  euId: string;
}) {
  const router = useRouter();
  const [tempo, setTempo] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const total = apontamentos.reduce((n, a) => n + a.minutos, 0);
  const minutos = paraMinutos(tempo);
  const estimado = estimativaH === null ? null : Math.round(estimativaH * 60);
  const estourou = estimado !== null && total > estimado;

  async function apontar(e: React.FormEvent) {
    e.preventDefault();
    if (minutos === null) {
      setErro('Nao entendi o tempo. Escreva "1h30", "45m", "1:30" ou "2".');
      return;
    }

    setOcupado(true);
    setErro(null);
    const r = await chamar(`/api/tasks/${taskId}/horas`, "POST", { minutos, data, nota });
    setOcupado(false);

    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setTempo("");
    setNota("");
    router.refresh();
  }

  async function apagar(a: Apontamento) {
    setErro(null);
    const r = await chamar(
      `/api/tasks/${taskId}/horas?apontamentoId=${encodeURIComponent(a.id)}`,
      "DELETE",
    );
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-baseline gap-3 text-[13px]">
        <span>
          <span className="num font-medium">{formatarMinutos(total)}</span>
          <span className="text-tinta-fraca"> apontadas</span>
        </span>
        {estimado !== null && (
          <span className={estourou ? "text-prio-alta" : "text-tinta-fraca"}>
            de <span className="num">{formatarMinutos(estimado)}</span> estimadas
            {estourou && ` (${formatarMinutos(total - estimado)} acima)`}
          </span>
        )}
      </div>

      {apontamentos.length > 0 && (
        <ul className="grid gap-1 border-t border-linha pt-2">
          {apontamentos.map((a) => (
            <li key={a.id} className="flex items-baseline gap-2 text-[12px]">
              <span className="num w-16 shrink-0 text-tinta-fraca">{formatarData(a.data)}</span>
              <span className="num w-14 shrink-0 font-medium">{formatarMinutos(a.minutos)}</span>
              <span className="min-w-0 flex-1 truncate text-tinta-media">
                {a.nota ?? <span className="text-tinta-fraca">sem nota</span>}
              </span>
              <span className="shrink-0 text-[11px] text-tinta-fraca">{a.autor ?? "?"}</span>
              {a.autorId === euId && (
                <Botao tamanho="pequeno" variante="fantasma" onClick={() => void apagar(a)}>
                  Apagar
                </Botao>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={apontar} className="flex flex-wrap items-end gap-1.5 border-t border-linha pt-2">
        <label className="grid gap-0.5">
          <span className="text-[11px] uppercase tracking-[0.08em] text-tinta-fraca">Tempo</span>
          <input
            value={tempo}
            onChange={(e) => setTempo(e.target.value)}
            placeholder="1h30"
            aria-label="Tempo trabalhado"
            className="transicao num h-7 w-20 rounded-sm border border-linha-forte bg-papel-alto px-2 text-[12px] placeholder:text-tinta-fraca hover:border-tinta-fraca"
          />
        </label>

        <label className="grid gap-0.5">
          <span className="text-[11px] uppercase tracking-[0.08em] text-tinta-fraca">Dia</span>
          <input
            type="date"
            value={data}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setData(e.target.value)}
            className="transicao num h-7 rounded-sm border border-linha-forte bg-papel-alto px-2 text-[12px] hover:border-tinta-fraca"
          />
        </label>

        <label className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-[11px] uppercase tracking-[0.08em] text-tinta-fraca">
            No que trabalhou
          </span>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={200}
            placeholder="opcional"
            className="transicao h-7 w-full rounded-sm border border-linha-forte bg-papel-alto px-2 text-[12px] placeholder:text-tinta-fraca hover:border-tinta-fraca"
          />
        </label>

        <Botao type="submit" tamanho="pequeno" disabled={ocupado}>
          {ocupado ? "..." : "Apontar"}
        </Botao>

        {/* Mostra a leitura antes de gravar: "1h30" virando 90min na frente da
            pessoa evita o apontamento de 1,3h que ninguem percebe. */}
        {tempo !== "" && (
          <span className={`text-[11px] ${minutos === null ? "text-cat-cancelado" : "text-tinta-fraca"}`}>
            {minutos === null ? "nao entendi" : `= ${formatarMinutos(minutos)}`}
          </span>
        )}
      </form>

      {erro && (
        <p role="alert" className="text-[12px] text-cat-cancelado">
          {erro}
        </p>
      )}
    </div>
  );
}
