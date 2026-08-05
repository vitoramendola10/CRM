"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Vazio } from "@/components/ui/Cabecalho";
import { AreaTexto, Campo, Selecao } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import { Selo } from "@/components/ui/Selo";
import {
  DESTINOS_NOTIFICACAO,
  EVENTOS_NOTIFICACAO,
  PAPEIS,
  ROTULO_EVENTO,
  ROTULO_PAPEL,
  type Board,
  type DestinoNotificacao,
  type EventoNotificacao,
  type NotificationRule,
  type Papel,
  type Usuario,
} from "@/domain";
import { chamar } from "@/lib/api";
import type { CamposComErro } from "@/lib/rota";

/** Campos que cada evento oferece ao template. A UI mostra para nao virar adivinhacao. */
const VARIAVEIS: Record<EventoNotificacao, string[]> = {
  task_criada: ["codigo", "titulo", "protocolo", "prioridade", "etapa", "solicitante", "autor"],
  task_concluida: ["codigo", "titulo", "protocolo", "etapa", "responsavel"],
  task_atribuida: ["codigo", "titulo", "protocolo", "responsavel"],
  task_comentada: ["codigo", "titulo", "protocolo", "autor", "comentario"],
  ticket_aberto: ["protocolo", "assunto", "solicitante", "prioridade", "atendente"],
  ticket_mencionado: ["protocolo", "assunto", "autor", "onde", "trecho"],
};

const ROTULO_DESTINO: Record<DestinoNotificacao, string> = {
  papel: "Todos de um papel",
  usuarios: "Pessoas escolhidas",
  responsavel: "Quem e responsavel pelo caso",
  // Nao ha quem escolher aqui: os nomes saem do texto que acabou de ser escrito.
  mencionados: "Quem foi citado com @ no texto",
};

type Rascunho = {
  evento: EventoNotificacao;
  boardId: string;
  destinoTipo: DestinoNotificacao;
  destinoPapel: Papel;
  destinoUsers: string[];
  assuntoTpl: string;
  corpoTpl: string;
  ativo: boolean;
};

const VAZIO: Rascunho = {
  evento: "task_criada",
  boardId: "",
  destinoTipo: "papel",
  destinoPapel: "dev",
  destinoUsers: [],
  assuntoTpl: "[DEV-{{codigo}}] {{titulo}}",
  corpoTpl:
    "Chamado #{{protocolo}} virou rotina.\n\nPrioridade: {{prioridade}}\nEtapa: {{etapa}}\nEnviado por: {{autor}}",
  ativo: true,
};

export function ListaRegras({
  regras,
  boards,
  usuarios,
}: {
  regras: NotificationRule[];
  boards: Board[];
  usuarios: Usuario[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<NotificationRule | null>(null);
  const [criando, setCriando] = useState(false);
  const [f, setF] = useState<Rascunho>(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<CamposComErro>({});
  const [ocupado, setOcupado] = useState(false);

  function fechar() {
    setCriando(false);
    setEditando(null);
    setErro(null);
    setCampos({});
  }

  async function salvar() {
    setOcupado(true);
    setErro(null);
    setCampos({});

    const corpo = {
      evento: f.evento,
      boardId: f.boardId === "" ? null : f.boardId,
      destinoTipo: f.destinoTipo,
      destinoPapel: f.destinoTipo === "papel" ? f.destinoPapel : null,
      destinoUsers: f.destinoTipo === "usuarios" ? f.destinoUsers : null,
      assuntoTpl: f.assuntoTpl,
      corpoTpl: f.corpoTpl,
      ativo: f.ativo,
    };

    const r = editando
      ? await chamar(`/api/config/notificacoes/${editando.id}`, "PATCH", corpo)
      : await chamar("/api/config/notificacoes", "POST", corpo);

    setOcupado(false);
    if (!r.ok) {
      setErro(r.erro);
      setCampos(r.campos ?? {});
      return;
    }
    fechar();
    router.refresh();
  }

  async function excluir(regra: NotificationRule) {
    if (!confirm("Excluir esta regra?")) return;
    const r = await chamar(`/api/config/notificacoes/${regra.id}`, "DELETE");
    if (!r.ok) {
      alert(r.erro);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-4">
        <p className="max-w-xl text-[13px] text-tinta-media">
          Quando o evento acontece, a mensagem entra na fila dentro da mesma transacao. Quem
          envia e o worker, depois - nenhum e-mail sai durante o clique.
        </p>
        <Botao
          variante="primario"
          onClick={() => {
            setF(VAZIO);
            setCriando(true);
            setErro(null);
          }}
        >
          Nova regra
        </Botao>
      </div>

      {regras.length === 0 ? (
        <Vazio
          titulo="Nenhuma regra de notificacao."
          detalhe="Sem regra, os eventos acontecem mas ninguem e avisado por e-mail."
        />
      ) : (
        <ul className="grid gap-1">
          {regras.map((r) => (
            <li
              key={r.id}
              className={`transicao grid gap-1 rounded-sm border border-linha bg-papel-alto px-3 py-2 hover:shadow-hover ${
                r.ativo ? "" : "opacity-55"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Selo texto={ROTULO_EVENTO[r.evento]} cor="#3f6ea8" />
                <span className="text-[12px] text-tinta-media">
                  {ROTULO_DESTINO[r.destinoTipo]}
                  {r.destinoTipo === "papel" && r.destinoPapel && `: ${ROTULO_PAPEL[r.destinoPapel]}`}
                  {r.destinoTipo === "usuarios" && `: ${r.destinoUsers?.length ?? 0} pessoa(s)`}
                </span>
                <span className="text-[12px] text-tinta-fraca">
                  {r.boardId ? boards.find((b) => b.id === r.boardId)?.nome : "todos os boards"}
                </span>
                {!r.ativo && <span className="text-[12px] text-tinta-fraca">inativa</span>}

                <span className="ml-auto flex gap-0.5">
                  <Botao
                    tamanho="pequeno"
                    variante="fantasma"
                    onClick={() => {
                      setF({
                        evento: r.evento,
                        boardId: r.boardId ?? "",
                        destinoTipo: r.destinoTipo,
                        destinoPapel: r.destinoPapel ?? "dev",
                        destinoUsers: r.destinoUsers ?? [],
                        assuntoTpl: r.assuntoTpl,
                        corpoTpl: r.corpoTpl,
                        ativo: r.ativo,
                      });
                      setEditando(r);
                      setErro(null);
                    }}
                  >
                    Editar
                  </Botao>
                  <Botao tamanho="pequeno" variante="perigo" onClick={() => void excluir(r)}>
                    Excluir
                  </Botao>
                </span>
              </div>
              <p className="num truncate text-[12px] text-tinta-fraca">{r.assuntoTpl}</p>
            </li>
          ))}
        </ul>
      )}

      <Modal
        aberto={criando || editando !== null}
        aoFechar={fechar}
        titulo={editando ? "Editar regra" : "Nova regra"}
        largura="larga"
        rodape={
          <>
            <Botao onClick={fechar} disabled={ocupado}>
              Cancelar
            </Botao>
            <Botao variante="primario" onClick={() => void salvar()} disabled={ocupado}>
              {ocupado ? "Salvando..." : "Salvar"}
            </Botao>
          </>
        }
      >
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Selecao
              rotulo="Quando acontecer"
              value={f.evento}
              onChange={(e) => setF({ ...f, evento: e.target.value as EventoNotificacao })}
            >
              {EVENTOS_NOTIFICACAO.map((ev) => (
                <option key={ev} value={ev}>
                  {ROTULO_EVENTO[ev]}
                </option>
              ))}
            </Selecao>

            <Selecao
              rotulo="No board"
              value={f.boardId}
              onChange={(e) => setF({ ...f, boardId: e.target.value })}
            >
              <option value="">Todos os boards</option>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </Selecao>

            <Selecao
              rotulo="Avisar"
              value={f.destinoTipo}
              onChange={(e) =>
                setF({ ...f, destinoTipo: e.target.value as DestinoNotificacao })
              }
            >
              {DESTINOS_NOTIFICACAO.map((d) => (
                <option key={d} value={d}>
                  {ROTULO_DESTINO[d]}
                </option>
              ))}
            </Selecao>

            {f.destinoTipo === "papel" && (
              <Selecao
                rotulo="Papel"
                erro={campos.destinoPapel}
                value={f.destinoPapel}
                onChange={(e) => setF({ ...f, destinoPapel: e.target.value as Papel })}
              >
                {PAPEIS.map((p) => (
                  <option key={p} value={p}>
                    {ROTULO_PAPEL[p]}
                  </option>
                ))}
              </Selecao>
            )}
          </div>

          {f.destinoTipo === "usuarios" && (
            <div>
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-tinta-fraca">
                Pessoas
              </span>
              <div className="grid max-h-40 gap-0.5 overflow-y-auto rounded-sm border border-linha-forte p-2">
                {usuarios.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={f.destinoUsers.includes(u.id)}
                      onChange={(e) =>
                        setF({
                          ...f,
                          destinoUsers: e.target.checked
                            ? [...f.destinoUsers, u.id]
                            : f.destinoUsers.filter((x) => x !== u.id),
                        })
                      }
                    />
                    {u.nome}
                    {!u.email && (
                      <span className="text-[11px] text-tinta-fraca">sem e-mail, nao recebe</span>
                    )}
                  </label>
                ))}
              </div>
              {campos.destinoUsers && (
                <p className="mt-1 text-[12px] text-cat-cancelado">{campos.destinoUsers}</p>
              )}
            </div>
          )}

          <Campo
            rotulo="Assunto do e-mail"
            obrigatorio
            mono
            erro={campos.assuntoTpl}
            value={f.assuntoTpl}
            onChange={(e) => setF({ ...f, assuntoTpl: e.target.value })}
          />

          <AreaTexto
            rotulo="Corpo do e-mail"
            obrigatorio
            rows={6}
            erro={campos.corpoTpl}
            value={f.corpoTpl}
            onChange={(e) => setF({ ...f, corpoTpl: e.target.value })}
          />

          <p className="rounded-sm border border-linha bg-papel-baixo px-2.5 py-2 text-[12px]">
            <span className="mb-1 block text-tinta-media">
              Campos disponiveis para {ROTULO_EVENTO[f.evento]}:
            </span>
            <span className="num flex flex-wrap gap-1.5 text-tinta-fraca">
              {VARIAVEIS[f.evento].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setF({ ...f, corpoTpl: `${f.corpoTpl}{{${v}}}` })}
                  className="transicao rounded-xs border border-linha-forte px-1 hover:bg-papel-alto hover:text-tinta"
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </span>
          </p>

          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={f.ativo}
              onChange={(e) => setF({ ...f, ativo: e.target.checked })}
            />
            Regra ativa
          </label>

          {erro && <p className="text-[13px] text-cat-cancelado">{erro}</p>}
        </div>
      </Modal>
    </>
  );
}
