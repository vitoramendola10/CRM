"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Vazio } from "@/components/ui/Cabecalho";
import { Campo, CampoCor } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import { Selo } from "@/components/ui/Selo";
import { COR_NEUTRA_COLUNA, type BoardColumn } from "@/domain";
import { chamar } from "@/lib/api";

type Rascunho = { nome: string; cor: string; wipLimit: string; isDone: boolean };

const VAZIO: Rascunho = { nome: "", cor: COR_NEUTRA_COLUNA, wipLimit: "", isDone: false };

export function ListaColunas({
  boardId,
  colunas,
  emUso,
}: {
  boardId: string;
  colunas: BoardColumn[];
  emUso: Record<string, number>;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<BoardColumn | null>(null);
  const [criando, setCriando] = useState(false);
  const [rascunho, setRascunho] = useState<Rascunho>(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  // Ordem otimista: o usuario ve o movimento antes do servidor confirmar.
  const [ordem, setOrdem] = useState<BoardColumn[] | null>(null);

  const lista = ordem ?? colunas;

  function abrirNova() {
    setRascunho(VAZIO);
    setCriando(true);
    setErro(null);
  }

  function abrirEdicao(c: BoardColumn) {
    setRascunho({
      nome: c.nome,
      cor: c.cor,
      wipLimit: c.wipLimit === null ? "" : String(c.wipLimit),
      isDone: c.isDone,
    });
    setEditando(c);
    setErro(null);
  }

  function fechar() {
    setCriando(false);
    setEditando(null);
    setErro(null);
  }

  async function salvar() {
    setOcupado(true);
    setErro(null);

    const corpo = {
      nome: rascunho.nome,
      cor: rascunho.cor,
      wipLimit: rascunho.wipLimit.trim() === "" ? null : Number(rascunho.wipLimit),
      isDone: rascunho.isDone,
    };

    const r = editando
      ? await chamar(`/api/config/colunas/${editando.id}`, "PATCH", corpo)
      : await chamar("/api/config/colunas", "POST", { ...corpo, boardId });

    setOcupado(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    fechar();
    router.refresh();
  }

  async function excluir(c: BoardColumn) {
    if (!confirm(`Excluir a etapa "${c.nome}"?`)) return;
    setOcupado(true);
    const r = await chamar(`/api/config/colunas/${c.id}`, "DELETE");
    setOcupado(false);
    if (!r.ok) {
      alert(r.erro);
      return;
    }
    router.refresh();
  }

  async function mover(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= lista.length) return;

    const nova = [...lista];
    const [item] = nova.splice(indice, 1);
    nova.splice(destino, 0, item!);
    setOrdem(nova);

    const r = await chamar("/api/config/colunas/ordem", "PUT", {
      boardId,
      ids: nova.map((c) => c.id),
    });
    if (!r.ok) {
      setOrdem(null); // desfaz o otimismo
      alert(r.erro);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] text-tinta-media">
          A ordem aqui e a ordem das colunas no Kanban.
        </p>
        <Botao variante="primario" onClick={abrirNova}>
          Nova etapa
        </Botao>
      </div>

      {lista.length === 0 ? (
        <Vazio
          titulo="Nenhuma etapa cadastrada."
          detalhe="Crie a primeira para o Kanban ter onde colocar as rotinas."
        />
      ) : (
        <ul className="grid gap-1">
          {lista.map((c, i) => (
            <li
              key={c.id}
              className="transicao flex items-center gap-3 rounded-sm border border-linha bg-papel-alto px-3 py-2 hover:shadow-hover"
            >
              <span
                aria-hidden
                className="h-7 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: c.cor }}
              />
              <span className="num w-6 text-[12px] text-tinta-fraca">{i + 1}</span>

              <span className="flex-1">
                <span className="block text-[13px] font-medium">{c.nome}</span>
                <span className="text-[12px] text-tinta-fraca">
                  <span className="num">{emUso[c.id] ?? 0}</span>{" "}
                  {(emUso[c.id] ?? 0) === 1 ? "rotina" : "rotinas"}
                  {c.wipLimit !== null && (
                    <>
                      {" - limite "}
                      <span className="num">{c.wipLimit}</span>
                    </>
                  )}
                </span>
              </span>

              {c.isDone && <Selo texto="devolve ao suporte" cor="#4a7c59" />}

              <span className="flex items-center gap-0.5">
                <BotaoSeta
                  rotulo="Subir"
                  seta="↑"
                  disabled={i === 0}
                  onClick={() => void mover(i, -1)}
                />
                <BotaoSeta
                  rotulo="Descer"
                  seta="↓"
                  disabled={i === lista.length - 1}
                  onClick={() => void mover(i, 1)}
                />
                <Botao tamanho="pequeno" variante="fantasma" onClick={() => abrirEdicao(c)}>
                  Editar
                </Botao>
                <Botao
                  tamanho="pequeno"
                  variante="perigo"
                  disabled={ocupado}
                  onClick={() => void excluir(c)}
                >
                  Excluir
                </Botao>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Modal
        aberto={criando || editando !== null}
        aoFechar={fechar}
        titulo={editando ? "Editar etapa" : "Nova etapa"}
        descricao="O nome e livre. A posicao voce ajusta com as setas na lista."
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
          <Campo
            rotulo="Nome"
            obrigatorio
            autoFocus
            value={rascunho.nome}
            onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <CampoCor
              rotulo="Cor"
              valor={rascunho.cor}
              aoMudar={(cor) => setRascunho({ ...rascunho, cor })}
            />
            <Campo
              rotulo="Limite de rotinas"
              type="number"
              min={1}
              mono
              placeholder="sem limite"
              dica="Aviso visual, nao trava"
              value={rascunho.wipLimit}
              onChange={(e) => setRascunho({ ...rascunho, wipLimit: e.target.value })}
            />
          </div>

          <label className="flex items-start gap-2 rounded-sm border border-linha bg-papel-baixo px-2.5 py-2">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={rascunho.isDone}
              onChange={(e) => setRascunho({ ...rascunho, isDone: e.target.checked })}
            />
            <span className="text-[13px] leading-snug">
              Etapa de entrega
              <span className="mt-0.5 block text-[12px] text-tinta-fraca">
                Ao arrastar um card para ca, o chamado que originou a rotina volta para o
                suporte e o atendente e avisado.
              </span>
            </span>
          </label>

          {erro && <p className="text-[13px] text-cat-cancelado">{erro}</p>}
        </div>
      </Modal>
    </>
  );
}

function BotaoSeta({
  rotulo,
  seta,
  disabled,
  onClick,
}: {
  rotulo: string;
  seta: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={rotulo}
      aria-label={rotulo}
      disabled={disabled}
      onClick={onClick}
      className="transicao size-7 rounded-sm text-tinta-fraca hover:bg-papel-baixo hover:text-tinta disabled:pointer-events-none disabled:opacity-25"
    >
      {seta}
    </button>
  );
}
