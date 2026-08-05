"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClienteRapido, type ClienteCriado } from "@/components/clientes/ClienteRapido";
import { Botao } from "@/components/ui/Botao";
import { AreaTextoMencao } from "@/components/ui/AreaTextoMencao";
import { Campo, Selecao } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import {
  CANAIS_TICKET,
  PRIORIDADES,
  ROTULO_CANAL,
  ROTULO_PRIORIDADE,
  type CanalTicket,
  type Cliente,
  type Prioridade,
  type Usuario,
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

export function NovoTicket({
  clientes,
  usuarios,
}: {
  clientes: Cliente[];
  usuarios: Usuario[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<CamposComErro>({});
  const [enviando, setEnviando] = useState(false);
  // A lista chega pronta do server component, mas o cadastro rapido precisa
  // aparecer no seletor na hora - sem recarregar a pagina no meio da ligacao.
  const [opcoes, setOpcoes] = useState<ClienteCriado[]>(clientes);
  const [cadastrando, setCadastrando] = useState(false);

  function fechar() {
    // Modal dentro de modal: o `cancel` do <dialog> do cadastro rapido sobe pela
    // arvore do React ate o `onCancel` deste <dialog>, e um Esc la dentro
    // fecharia o chamado inteiro junto (o clique no veu nao tem esse problema:
    // o Modal so fecha quando o alvo e o proprio <dialog>). Enquanto o cadastro
    // rapido estiver aberto, ele e quem responde pelo Esc.
    if (cadastrando) return;
    setAberto(false);
    setErro(null);
    setCampos({});
  }

  function usarNovoCliente(c: ClienteCriado) {
    setOpcoes([c, ...opcoes]);
    setF({ ...f, clientId: c.id });
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
            <div>
              <Selecao
                rotulo="Cliente"
                value={f.clientId}
                onChange={(e) => setF({ ...f, clientId: e.target.value })}
              >
                <option value="">Sem cliente</option>
                {opcoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razaoSocial}
                  </option>
                ))}
              </Selecao>
              <div className="mt-1 flex justify-end">
                <ClienteRapido aoCriar={usarNovoCliente} aoAlternar={setCadastrando} />
              </div>
            </div>

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

          <AreaTextoMencao
            rotulo="O que foi relatado"
            rows={5}
            usuarios={usuarios.map((u) => u.username)}
            dica="Cite alguem com @ para avisar."
            erro={campos.descricao}
            value={f.descricao}
            aoMudar={(v) => setF({ ...f, descricao: v })}
          />

          {erro && <p className="text-[13px] text-cat-cancelado">{erro}</p>}
        </div>
      </Modal>
    </>
  );
}
