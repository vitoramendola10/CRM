"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Botao } from "@/components/ui/Botao";
import {
  ROTULO_SITUACAO_TICKET,
  SITUACOES_TICKET,
  type Resposta,
  type SituacaoTicket,
  type TicketMessage,
  type Usuario,
} from "@/domain";
import { AreaTextoMencao } from "@/components/ui/AreaTextoMencao";
import { ComCitacoes } from "@/components/ui/ComCitacoes";
import { chamar } from "@/lib/api";
import { formatarDataHora } from "@/lib/datas";
import { preencher, type Contexto } from "@/lib/template";

export function Timeline({
  ticketId,
  situacao,
  mensagens,
  respostas,
  usuarios,
  contexto,
}: {
  ticketId: number;
  situacao: SituacaoTicket;
  mensagens: (TicketMessage & { autor: string | null })[];
  respostas: Resposta[];
  /** Para citar com @ no registro e realcar quem foi citado. */
  usuarios: Usuario[];
  /** Dados do chamado para trocar os `{{campo}}` da resposta pronta. */
  contexto: Contexto;
}) {
  const nomesValidos = new Set(usuarios.map((u) => u.username.toLowerCase()));
  const router = useRouter();
  const [corpo, setCorpo] = useState("");
  const [interno, setInterno] = useState(true);
  /** "" = deixar como esta. Registrar sem mexer no estado continua valendo. */
  const [novaSituacao, setNovaSituacao] = useState<SituacaoTicket | "">("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  /**
   * Aplica a resposta pronta na caixa. Substitui o texto em vez de emendar:
   * emendar geraria uma colcha de duas respostas quando alguem clica na errada,
   * e o desfazer natural aqui e clicar na outra.
   */
  function aplicar(r: Resposta) {
    setCorpo(preencher(r.corpo, contexto));
    setInterno(r.interno);
    // A situacao da resposta so entra se ela nao for a situacao atual - o select
    // de "e passar para" nem oferece a atual, e mandar a mesma seria um no-op
    // que ainda assim escreveria uma linha no historico.
    setNovaSituacao(r.situacao !== null && r.situacao !== situacao ? r.situacao : "");
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (corpo.trim() === "") return;

    setEnviando(true);
    setErro(null);
    // As duas coisas no mesmo pedido: o servidor grava numa transacao so, entao
    // nao existe o meio-termo de a anotacao entrar e a situacao nao mudar.
    const r = await chamar(`/api/tickets/${ticketId}/mensagens`, "POST", {
      corpo,
      interno,
      situacao: novaSituacao === "" ? null : novaSituacao,
    });
    setEnviando(false);

    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setCorpo("");
    setNovaSituacao("");
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
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
                  <ComCitacoes texto={m.corpo} validos={nomesValidos} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={enviar} className="grid gap-2 border-t border-linha pt-3">
        {/* Preenche a caixa em vez de enviar direto: a resposta pronta e um
            ponto de partida, e quase sempre falta uma linha do caso especifico.
            Enviar no clique tiraria a chance de ler o que vai para o cliente. */}
        {respostas.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] uppercase tracking-[0.08em] text-tinta-fraca">
              Respostas
            </span>
            {respostas.map((r) => (
              <button
                key={r.id}
                type="button"
                title={r.situacao ? `Preenche o texto e passa para ${ROTULO_SITUACAO_TICKET[r.situacao]}` : "Preenche o texto"}
                onClick={() => aplicar(r)}
                className="transicao rounded-sm border border-linha-forte px-2 py-0.5 text-[12px] text-tinta-media hover:bg-papel-baixo hover:text-tinta"
              >
                {r.nome}
              </button>
            ))}
          </div>
        )}

        <AreaTextoMencao
          rows={3}
          usuarios={usuarios.map((u) => u.username)}
          value={corpo}
          aoMudar={setCorpo}
          placeholder="Registrar no atendimento. Use @ para citar alguem."
        />

        {erro && <p className="text-[13px] text-cat-cancelado">{erro}</p>}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Botao
            type="submit"
            variante="primario"
            disabled={enviando || corpo.trim() === ""}
          >
            {enviando ? "Registrando..." : "Registrar"}
          </Botao>

          {/* Anotar e mudar o estado sao um gesto so para quem atende:
              "liguei, cliente vai testar" e aguardando cliente saem juntos. */}
          <label className="flex items-center gap-1.5 text-[12px] text-tinta-media">
            e passar para
            <select
              value={novaSituacao}
              onChange={(e) => setNovaSituacao(e.target.value as SituacaoTicket | "")}
              className="transicao h-7 cursor-pointer rounded-sm border border-linha-forte bg-papel-alto px-1.5 text-[12px] text-tinta hover:border-tinta-fraca"
            >
              <option value="">deixar como esta</option>
              {SITUACOES_TICKET.filter((s) => s !== situacao).map((s) => (
                <option key={s} value={s}>
                  {ROTULO_SITUACAO_TICKET[s]}
                </option>
              ))}
            </select>
          </label>

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
