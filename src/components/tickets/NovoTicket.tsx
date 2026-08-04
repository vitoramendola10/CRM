"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { AreaTexto, Campo, Selecao } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import {
  CANAIS_TICKET,
  PRIORIDADES,
  ROTULO_CANAL,
  ROTULO_PRIORIDADE,
  type CanalTicket,
  type Cliente,
  type Prioridade,
} from "@/domain";
import { chamar } from "@/lib/api";
import type { CamposComErro } from "@/lib/rota";

const VAZIO = {
  clientId: "",
  solicitante: "",
  canal: "manual" as CanalTicket,
  assunto: "",
  descricao: "",
  prioridade: "media" as Prioridade,
};

export function NovoTicket({ clientes }: { clientes: Cliente[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<CamposComErro>({});
  const [enviando, setEnviando] = useState(false);

  function fechar() {
    setAberto(false);
    setErro(null);
    setCampos({});
  }

  async function salvar() {
    setEnviando(true);
    setErro(null);
    setCampos({});

    const r = await chamar<{ id: number }>("/api/tickets", "POST", {
      ...f,
      clientId: f.clientId === "" ? null : f.clientId,
    });

    setEnviando(false);
    if (!r.ok) {
      setErro(r.erro);
      setCampos(r.campos ?? {});
      return;
    }
    setF(VAZIO);
    fechar();
    router.push(`/atendimentos/${r.dados.id}`);
  }

  return (
    <>
      <Botao
        variante="primario"
        onClick={() => {
          setF(VAZIO);
          setAberto(true);
        }}
      >
        Novo atendimento
      </Botao>

      <Modal
        aberto={aberto}
        aoFechar={fechar}
        titulo="Novo atendimento"
        descricao="O protocolo e gerado ao salvar."
        largura="larga"
        rodape={
          <>
            <Botao onClick={fechar} disabled={enviando}>
              Cancelar
            </Botao>
            <Botao variante="primario" onClick={() => void salvar()} disabled={enviando}>
              {enviando ? "Abrindo..." : "Abrir chamado"}
            </Botao>
          </>
        }
      >
        <div className="grid gap-3">
          <Campo
            rotulo="Assunto"
            obrigatorio
            autoFocus
            erro={campos.assunto}
            value={f.assunto}
            onChange={(e) => setF({ ...f, assunto: e.target.value })}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Selecao
              rotulo="Cliente"
              value={f.clientId}
              onChange={(e) => setF({ ...f, clientId: e.target.value })}
            >
              <option value="">Sem cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razaoSocial}
                </option>
              ))}
            </Selecao>

            <Campo
              rotulo="Quem falou"
              dica="Nome de quem ligou ou escreveu"
              erro={campos.solicitante}
              value={f.solicitante}
              onChange={(e) => setF({ ...f, solicitante: e.target.value })}
            />

            <Selecao
              rotulo="Canal"
              value={f.canal}
              onChange={(e) => setF({ ...f, canal: e.target.value as CanalTicket })}
            >
              {CANAIS_TICKET.map((c) => (
                <option key={c} value={c}>
                  {ROTULO_CANAL[c]}
                </option>
              ))}
            </Selecao>

            <Selecao
              rotulo="Prioridade"
              value={f.prioridade}
              onChange={(e) => setF({ ...f, prioridade: e.target.value as Prioridade })}
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>
                  {ROTULO_PRIORIDADE[p]}
                </option>
              ))}
            </Selecao>
          </div>

          <AreaTexto
            rotulo="O que foi relatado"
            rows={5}
            erro={campos.descricao}
            value={f.descricao}
            onChange={(e) => setF({ ...f, descricao: e.target.value })}
          />

          {erro && <p className="text-[13px] text-cat-cancelado">{erro}</p>}
        </div>
      </Modal>
    </>
  );
}
