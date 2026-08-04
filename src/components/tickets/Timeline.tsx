"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Botao } from "@/components/ui/Botao";
import type { TicketMessage } from "@/domain";
import { chamar } from "@/lib/api";
import { formatarDataHora } from "@/lib/datas";

export function Timeline({
  ticketId,
  mensagens,
}: {
  ticketId: number;
  mensagens: (TicketMessage & { autor: string | null })[];
}) {
  const router = useRouter();
  const [corpo, setCorpo] = useState("");
  const [interno, setInterno] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (corpo.trim() === "") return;

    setEnviando(true);
    setErro(null);
    const r = await chamar(`/api/tickets/${ticketId}/mensagens`, "POST", { corpo, interno });
    setEnviando(false);

    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setCorpo("");
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      {mensagens.length === 0 ? (
        <p className="text-[13px] text-tinta-fraca">
          Nenhum registro ainda. Anote aqui o que foi conversado.
        </p>
      ) : (
        <ol className="grid gap-2.5">
          {mensagens.map((m) => (
            <li key={m.id} className="flex gap-2">
              <Avatar nome={m.autor} tamanho={22} />
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 flex flex-wrap items-baseline gap-2">
                  <span className="text-[13px] font-medium">{m.autor ?? "Usuario removido"}</span>
                  <span className="num text-[11px] text-tinta-fraca">
                    {formatarDataHora(m.createdAt)}
                  </span>
                  {!m.interno && (
                    <span className="rounded-xs border border-linha-forte px-1 text-[10px] uppercase tracking-wide text-tinta-fraca">
                      visivel ao cliente
                    </span>
                  )}
                </p>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{m.corpo}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={enviar} className="grid gap-2 border-t border-linha pt-3">
        <textarea
          rows={3}
          value={corpo}
          onChange={(e) => setCorpo(e.target.value)}
          placeholder="Registrar no atendimento"
          className="transicao w-full resize-y rounded-sm border border-linha-forte bg-papel-alto px-2.5 py-1.5 text-[13px] leading-relaxed placeholder:text-tinta-fraca hover:border-tinta-fraca"
        />

        {erro && <p className="text-[13px] text-cat-cancelado">{erro}</p>}

        <div className="flex items-center gap-3">
          <Botao
            type="submit"
            variante="primario"
            disabled={enviando || corpo.trim() === ""}
          >
            {enviando ? "Registrando..." : "Registrar"}
          </Botao>
          <label className="flex items-center gap-1.5 text-[12px] text-tinta-media">
            <input
              type="checkbox"
              checked={!interno}
              onChange={(e) => setInterno(!e.target.checked)}
            />
            Visivel ao cliente
          </label>
        </div>
      </form>
    </div>
  );
}
