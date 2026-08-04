"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { AreaTexto, Campo, Selecao } from "@/components/ui/Campo";
import {
  CANAIS_TICKET,
  PRIORIDADES,
  ROTULO_CANAL,
  ROTULO_PRIORIDADE,
  ROTULO_SITUACAO_TICKET,
  SITUACOES_TICKET,
  type CanalTicket,
  type Cliente,
  type Prioridade,
  type SituacaoTicket,
  type Ticket,
  type Usuario,
} from "@/domain";
import { chamar } from "@/lib/api";
import type { CamposComErro } from "@/lib/rota";

export function FormTicket({
  ticket,
  clientes,
  usuarios,
}: {
  ticket: Ticket;
  clientes: Cliente[];
  usuarios: Usuario[];
}) {
  const router = useRouter();
  const [f, setF] = useState({
    clientId: ticket.clientId ?? "",
    solicitante: ticket.solicitante ?? "",
    canal: ticket.canal,
    assunto: ticket.assunto,
    descricao: ticket.descricao ?? "",
    situacao: ticket.situacao,
    prioridade: ticket.prioridade,
    atendenteId: ticket.atendenteId ?? "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<CamposComErro>({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF({ ...f, [k]: v });
    setSalvo(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    setCampos({});

    const r = await chamar(`/api/tickets/${ticket.id}`, "PATCH", {
      ...f,
      clientId: f.clientId === "" ? null : f.clientId,
      atendenteId: f.atendenteId === "" ? null : f.atendenteId,
    });

    setSalvando(false);
    if (!r.ok) {
      setErro(r.erro);
      setCampos(r.campos ?? {});
      return;
    }
    setSalvo(true);
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="grid gap-3">
      <Campo
        rotulo="Assunto"
        obrigatorio
        erro={campos.assunto}
        value={f.assunto}
        onChange={(e) => set("assunto", e.target.value)}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Selecao
          rotulo="Situacao"
          value={f.situacao}
          onChange={(e) => set("situacao", e.target.value as SituacaoTicket)}
        >
          {SITUACOES_TICKET.map((s) => (
            <option key={s} value={s}>
              {ROTULO_SITUACAO_TICKET[s]}
            </option>
          ))}
        </Selecao>

        <Selecao
          rotulo="Prioridade"
          value={f.prioridade}
          onChange={(e) => set("prioridade", e.target.value as Prioridade)}
        >
          {PRIORIDADES.map((p) => (
            <option key={p} value={p}>
              {ROTULO_PRIORIDADE[p]}
            </option>
          ))}
        </Selecao>

        <Selecao
          rotulo="Cliente"
          value={f.clientId}
          onChange={(e) => set("clientId", e.target.value)}
        >
          <option value="">Sem cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.razaoSocial}
            </option>
          ))}
        </Selecao>

        <Selecao
          rotulo="Atendente"
          value={f.atendenteId}
          onChange={(e) => set("atendenteId", e.target.value)}
        >
          <option value="">Sem atendente</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </Selecao>

        <Campo
          rotulo="Quem falou"
          erro={campos.solicitante}
          value={f.solicitante}
          onChange={(e) => set("solicitante", e.target.value)}
        />

        <Selecao
          rotulo="Canal"
          value={f.canal}
          onChange={(e) => set("canal", e.target.value as CanalTicket)}
        >
          {CANAIS_TICKET.map((c) => (
            <option key={c} value={c}>
              {ROTULO_CANAL[c]}
            </option>
          ))}
        </Selecao>
      </div>

      <AreaTexto
        rotulo="O que foi relatado"
        rows={5}
        erro={campos.descricao}
        value={f.descricao}
        onChange={(e) => set("descricao", e.target.value)}
      />

      {erro && <p className="text-[13px] text-cat-cancelado">{erro}</p>}

      <div className="flex items-center gap-3">
        <Botao type="submit" variante="primario" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </Botao>
        {salvo && <span className="text-[12px] text-cat-concluido">Salvo.</span>}
      </div>
    </form>
  );
}
