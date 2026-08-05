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
  type Prioridade,
  type TaskType,
  type Usuario,
} from "@/domain";
import { chamar } from "@/lib/api";
import type { CamposComErro } from "@/lib/rota";

export function Escalar({
  ticketId,
  assunto,
  descricao,
  prioridade,
  boards,
  tipos,
  usuarios,
}: {
  ticketId: number;
  assunto: string;
  descricao: string | null;
  prioridade: Prioridade;
  boards: Board[];
  tipos: TaskType[];
  usuarios: Usuario[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState({
    boardId: boards[0]?.id ?? "",
    typeId: "",
    // O titulo ja vem do chamado: quem escala normalmente so ajusta.
    titulo: assunto,
    descricao: descricao ?? "",
    passosRepro: "",
    versaoSistema: "",
    prioridade,
  });
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<CamposComErro>({});
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setEnviando(true);
    setErro(null);
    setCampos({});

    const r = await chamar<{ codigo: number }>("/api/tickets/escalar", "POST", {
      ticketId,
      boardId: f.boardId,
      typeId: f.typeId === "" ? null : f.typeId,
      titulo: f.titulo,
      descricao: f.descricao,
      passosRepro: f.passosRepro,
      versaoSistema: f.versaoSistema,
      prioridade: f.prioridade,
    });

    if (!r.ok) {
      setEnviando(false);
      setErro(r.erro);
      setCampos(r.campos ?? {});
      return;
    }

    /**
     * Fica no chamado, e nao vai para a rotina criada.
     *
     * Escalar e ENTREGAR: quem envia para o desenvolvimento terminou a parte
     * dele e o chamado continua sendo dele - ele volta em "aguardando dev" e
     * retorna ao suporte quando o dev entregar. Jogar o atendente dentro do
     * board era tirar ele do lugar onde ainda tem trabalho (registrar o que
     * falou com o cliente, anexar print) e largar numa tela que e do dev.
     *
     * Abrir um chamado novo e o caso contrario, e por isso continua navegando:
     * ali o protocolo acabou de nascer e ainda falta detalhar tudo.
     *
     * O `refresh` e a confirmacao: o cabecalho passa a mostrar "Aguardando
     * desenvolvimento" e o proprio botao vira "Ver rotina DEV-x", que e o
     * caminho de um clique para quem QUISER ver o card.
     */
    setAberto(false);
    setEnviando(false);
    router.refresh();
  }

  return (
    <>
      <Botao variante="primario" onClick={() => setAberto(true)}>
        Enviar para desenvolvimento
      </Botao>

      <Modal
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo="Enviar para desenvolvimento"
        descricao="Cria a rotina no board e volta para o chamado, que continua com voce aguardando o dev."
        largura="larga"
        rodape={
          <>
            <Botao onClick={() => setAberto(false)} disabled={enviando}>
              Cancelar
            </Botao>
            <Botao variante="primario" onClick={() => void enviar()} disabled={enviando}>
              {enviando ? "Enviando..." : "Criar rotina"}
            </Botao>
          </>
        }
      >
        <div className="grid gap-3">
          <Campo
            rotulo="Assunto da rotina"
            obrigatorio
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
          </div>

          <Campo
            rotulo="Versao do sistema"
            mono
            dica="Em qual versao o cliente viu o problema"
            erro={campos.versaoSistema}
            value={f.versaoSistema}
            onChange={(e) => setF({ ...f, versaoSistema: e.target.value })}
          />

          <AreaTextoMencao
            rotulo="Passos para reproduzir"
            rows={4}
            usuarios={usuarios.map((u) => u.username)}
            dica="O que fazer, nesta ordem, para o problema aparecer. E o que mais economiza tempo do dev."
            erro={campos.passosRepro}
            value={f.passosRepro}
            aoMudar={(v) => setF({ ...f, passosRepro: v })}
          />

          <AreaTextoMencao
            rotulo="Descricao"
            rows={4}
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
