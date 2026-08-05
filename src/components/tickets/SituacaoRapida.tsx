"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  COR_SITUACAO_TICKET,
  ROTULO_SITUACAO_TICKET,
  SITUACOES_TICKET,
  type SituacaoTicket,
} from "@/domain";
import { chamar } from "@/lib/api";

/**
 * Troca de situacao em um clique.
 *
 * Antes isso exigia rolar ate o formulario do chamado, abrir um select, salvar,
 * e o PATCH reescrevia os oito campos - dois atendentes no mesmo chamado se
 * sobrescreviam inteiros. Aqui vai so o campo que mudou, por uma rota propria.
 *
 * `botoes` no cabecalho do chamado, onde ha espaco e a acao e a principal da
 * tela; `select` na lista, onde cada linha tem uma altura para respeitar.
 */
export function SituacaoRapida({
  ticketId,
  situacao,
  formato = "botoes",
}: {
  ticketId: number;
  situacao: SituacaoTicket;
  formato?: "botoes" | "select";
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Otimista: a situacao pintada e a escolhida, antes da resposta do servidor.
  const [atual, setAtual] = useState(situacao);

  async function trocar(nova: SituacaoTicket) {
    if (nova === atual || ocupado) return;

    const anterior = atual;
    setAtual(nova);
    setOcupado(true);
    setErro(null);

    const r = await chamar(`/api/tickets/${ticketId}/situacao`, "PATCH", { situacao: nova });
    setOcupado(false);

    if (!r.ok) {
      // A trava da rotina de dev cai aqui. Desfaz e mostra o motivo, que e uma
      // frase inteira - por isso ela nao vira `alert`.
      setAtual(anterior);
      setErro(r.erro);
      return;
    }
    router.refresh();
  }

  if (formato === "select") {
    return (
      <select
        value={atual}
        disabled={ocupado}
        title={erro ?? "Mudar situacao"}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => void trocar(e.target.value as SituacaoTicket)}
        className={`transicao h-6 cursor-pointer rounded-sm border bg-papel-alto px-1 text-[11px] disabled:opacity-50 ${
          erro ? "border-cat-cancelado" : "border-linha-forte hover:border-tinta-fraca"
        }`}
        style={{ color: COR_SITUACAO_TICKET[atual] }}
      >
        {SITUACOES_TICKET.map((s) => (
          <option key={s} value={s} className="text-tinta">
            {ROTULO_SITUACAO_TICKET[s]}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap gap-0.5">
        {SITUACOES_TICKET.map((s) => {
          const ativa = s === atual;
          return (
            <button
              key={s}
              type="button"
              disabled={ocupado}
              aria-pressed={ativa}
              onClick={() => void trocar(s)}
              className={`transicao rounded-sm border px-2.5 py-1 text-[12px] disabled:opacity-50 ${
                ativa
                  ? "font-medium text-papel-alto"
                  : "border-linha-forte text-tinta-media hover:bg-papel-baixo hover:text-tinta"
              }`}
              style={
                ativa
                  ? {
                      backgroundColor: COR_SITUACAO_TICKET[s],
                      borderColor: COR_SITUACAO_TICKET[s],
                    }
                  : undefined
              }
            >
              {ROTULO_SITUACAO_TICKET[s]}
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
