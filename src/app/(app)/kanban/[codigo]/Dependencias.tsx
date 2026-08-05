"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import type { RotinaVinculada } from "@/db/queries/dependencias";
import { chamar } from "@/lib/api";

/**
 * O que esta rotina espera, e quem espera por ela.
 *
 * Sao a mesma aresta lida dos dois lados, e por isso so o lado "depende de" e
 * editavel aqui: quem quiser dizer "DEV-9 espera esta" abre a DEV-9 e diz la.
 * Dois pontos de edicao para o mesmo fato so gerariam duvida sobre qual manda.
 */
export function Dependencias({
  taskId,
  dependeDe,
  bloqueia,
}: {
  taskId: string;
  dependeDe: RotinaVinculada[];
  bloqueia: RotinaVinculada[];
}) {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const pendentes = dependeDe.filter((d) => !d.concluida).length;

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(codigo.replace(/\D/g, ""));
    if (!Number.isInteger(n) || n <= 0) {
      setErro("Informe o numero da rotina, como em DEV-7.");
      return;
    }

    setOcupado(true);
    setErro(null);
    const r = await chamar(`/api/tasks/${taskId}/dependencias`, "POST", { codigo: n });
    setOcupado(false);

    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setCodigo("");
    router.refresh();
  }

  async function remover(d: RotinaVinculada) {
    setErro(null);
    const r = await chamar(
      `/api/tasks/${taskId}/dependencias?dependeDeId=${encodeURIComponent(d.id)}`,
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
      {pendentes > 0 && (
        <p className="rounded-sm border border-prio-alta/40 bg-prio-alta/8 px-2 py-1.5 text-[12px]">
          Travada por <span className="num font-medium">{pendentes}</span> rotina
          {pendentes === 1 ? "" : "s"} que ainda nao foi entregue.
        </p>
      )}

      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-tinta-fraca">
          Depende de
        </p>
        {dependeDe.length === 0 ? (
          <p className="text-[12px] text-tinta-fraca">Nao espera nenhuma outra rotina.</p>
        ) : (
          <ul className="grid gap-1">
            {dependeDe.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-[12px]">
                <Vinculo rotina={d} />
                <Botao
                  tamanho="pequeno"
                  variante="fantasma"
                  className="ml-auto"
                  onClick={() => void remover(d)}
                >
                  Tirar
                </Botao>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={adicionar} className="mt-2 flex gap-1.5">
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="DEV-7"
            aria-label="Numero da rotina de que esta depende"
            className="transicao num h-7 w-24 rounded-sm border border-linha-forte bg-papel-alto px-2 text-[12px] placeholder:text-tinta-fraca hover:border-tinta-fraca"
          />
          <Botao type="submit" tamanho="pequeno" disabled={ocupado}>
            {ocupado ? "..." : "Adicionar"}
          </Botao>
        </form>

        {erro && (
          <p role="alert" className="mt-1 text-[12px] text-cat-cancelado">
            {erro}
          </p>
        )}
      </div>

      {bloqueia.length > 0 && (
        <div className="border-t border-linha pt-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-tinta-fraca">
            Esperam por esta
          </p>
          <ul className="grid gap-1">
            {bloqueia.map((d) => (
              <li key={d.id} className="text-[12px]">
                <Vinculo rotina={d} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Vinculo({ rotina }: { rotina: RotinaVinculada }) {
  return (
    <span className="flex min-w-0 items-baseline gap-1.5">
      <Link
        href={`/kanban/${rotina.codigo}`}
        className="num shrink-0 text-tinta-fraca hover:text-acento"
      >
        DEV-{rotina.codigo}
      </Link>
      <span className={`truncate ${rotina.concluida ? "text-tinta-fraca line-through" : ""}`}>
        {rotina.titulo}
      </span>
      <span
        className={`shrink-0 text-[11px] ${rotina.concluida ? "text-cat-concluido" : "text-tinta-fraca"}`}
      >
        {rotina.etapa}
      </span>
    </span>
  );
}
