"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { AreaTextoMencao } from "@/components/ui/AreaTextoMencao";
import { Campo, Selecao } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import {
  PRIORIDADES,
  ROTULO_PRIORIDADE,
  type Board,
  type Cliente,
  type Prioridade,
  type TaskType,
  type Usuario,
} from "@/domain";
import { chamar } from "@/lib/api";
import type { CamposComErro } from "@/lib/rota";

/**
 * Rotina sem chamado: bug que o dev achou, atualizacao de biblioteca, refactor.
 *
 * Antes disso a unica porta era escalar um chamado, e quem precisasse registrar
 * trabalho interno teria de inventar um atendimento - sujando o indicador do
 * suporte com o que nunca foi suporte.
 */
export function NovaRotina({
  boards,
  tipos,
  clientes,
  usuarios,
  euId,
}: {
  boards: Board[];
  tipos: TaskType[];
  clientes: Cliente[];
  usuarios: Usuario[];
  euId: string;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<CamposComErro>({});
  const [enviando, setEnviando] = useState(false);

  const vazio = {
    boardId: boards[0]?.id ?? "",
    typeId: "",
    clientId: "",
    // Ja nasce com quem criou: trabalho interno normalmente e de quem registrou,
    // e um card sem dono a mais no board e exatamente o que se quer evitar.
    assigneeId: euId,
    titulo: "",
    descricao: "",
    prioridade: "media" as Prioridade,
    estimativaH: "",
    prazo: "",
  };
  const [f, setF] = useState(vazio);

  function fechar() {
    setAberto(false);
    setErro(null);
    setCampos({});
  }

  async function salvar() {
    setEnviando(true);
    setErro(null);
    setCampos({});

    const r = await chamar<{ codigo: number }>("/api/tasks", "POST", {
      ...f,
      typeId: f.typeId === "" ? null : f.typeId,
      clientId: f.clientId === "" ? null : f.clientId,
      assigneeId: f.assigneeId === "" ? null : f.assigneeId,
      estimativaH: f.estimativaH.trim() === "" ? null : Number(f.estimativaH),
      prazo: f.prazo === "" ? null : f.prazo,
    });

    setEnviando(false);
    if (!r.ok) {
      setErro(r.erro);
      setCampos(r.campos ?? {});
      return;
    }

    // Fica no board e so atualiza: a rotina nova aparece no fim do Backlog, e
    // quem acabou de registrar um bug normalmente vai registrar o proximo.
    setF(vazio);
    fechar();
    router.refresh();
  }

  return (
    <>
      <Botao
        variante="primario"
        onClick={() => {
          setF(vazio);
          setAberto(true);
        }}
      >
        Nova rotina
      </Botao>

      <Modal
        aberto={aberto}
        aoFechar={fechar}
        titulo="Nova rotina"
        descricao="Para o que nao veio de chamado: bug interno, refactor, atualizacao."
        largura="larga"
        rodape={
          <>
            <Botao onClick={fechar} disabled={enviando}>
              Cancelar
            </Botao>
            <Botao variante="primario" onClick={() => void salvar()} disabled={enviando}>
              {enviando ? "Criando..." : "Criar"}
            </Botao>
          </>
        }
      >
        <div className="grid gap-3">
          <Campo
            rotulo="Assunto"
            obrigatorio
            autoFocus
            erro={campos.titulo}
            value={f.titulo}
            onChange={(e) => setF({ ...f, titulo: e.target.value })}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <Selecao
              rotulo="Board"
              obrigatorio
              erro={campos.boardId}
              value={f.boardId}
              onChange={(e) => setF({ ...f, boardId: e.target.value })}
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </Selecao>

            <Selecao
              rotulo="Tipo"
              value={f.typeId}
              onChange={(e) => setF({ ...f, typeId: e.target.value })}
            >
              <option value="">Sem tipo</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
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

            <Selecao
              rotulo="Responsavel"
              value={f.assigneeId}
              onChange={(e) => setF({ ...f, assigneeId: e.target.value })}
            >
              <option value="">Sem responsavel</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </Selecao>

            <Selecao
              rotulo="Cliente"
              value={f.clientId}
              onChange={(e) => setF({ ...f, clientId: e.target.value })}
            >
              <option value="">Interno, sem cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razaoSocial}
                </option>
              ))}
            </Selecao>

            <Campo
              rotulo="Prazo"
              type="date"
              erro={campos.prazo}
              value={f.prazo}
              onChange={(e) => setF({ ...f, prazo: e.target.value })}
            />
          </div>

          <Campo
            rotulo="Estimativa (horas)"
            mono
            inputMode="decimal"
            dica="Opcional. Aparece no card e soma no cabecalho da etapa."
            erro={campos.estimativaH}
            value={f.estimativaH}
            onChange={(e) => setF({ ...f, estimativaH: e.target.value })}
          />

          <AreaTextoMencao
            rotulo="Descricao"
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
