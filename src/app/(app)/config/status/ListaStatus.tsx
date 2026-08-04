"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Vazio } from "@/components/ui/Cabecalho";
import { Campo, CampoCor, Selecao } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import { Selo } from "@/components/ui/Selo";
import {
  CATEGORIAS_STATUS,
  COR_CATEGORIA,
  ROTULO_CATEGORIA,
  type CategoriaStatus,
  type TaskStatus,
} from "@/domain";
import { chamar } from "@/lib/api";

type Rascunho = {
  nome: string;
  categoria: CategoriaStatus;
  cor: string;
  ordem: string;
  ativo: boolean;
};

export function ListaStatus({
  status,
  emUso,
}: {
  status: TaskStatus[];
  emUso: Record<string, number>;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<TaskStatus | null>(null);
  const [criando, setCriando] = useState(false);
  const [rascunho, setRascunho] = useState<Rascunho>(novoRascunho(status));
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  function abrirNovo() {
    setRascunho(novoRascunho(status));
    setCriando(true);
    setErro(null);
  }

  function abrirEdicao(s: TaskStatus) {
    setRascunho({
      nome: s.nome,
      categoria: s.categoria,
      cor: s.cor,
      ordem: String(s.ordem),
      ativo: s.ativo,
    });
    setEditando(s);
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

    const base = {
      nome: rascunho.nome,
      cor: rascunho.cor,
      ordem: Number(rascunho.ordem) || 0,
      ativo: rascunho.ativo,
    };

    // Na edicao a categoria nem e enviada: o zod da rota tambem a descarta.
    const r = editando
      ? await chamar(`/api/config/status/${editando.id}`, "PATCH", base)
      : await chamar("/api/config/status", "POST", { ...base, categoria: rascunho.categoria });

    setOcupado(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    fechar();
    router.refresh();
  }

  async function excluir(s: TaskStatus) {
    if (!confirm(`Excluir o status "${s.nome}"?`)) return;
    setOcupado(true);
    const r = await chamar(`/api/config/status/${s.id}`, "DELETE");
    setOcupado(false);
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
          O <strong className="font-medium">nome</strong> voce muda a vontade. A{" "}
          <strong className="font-medium">categoria</strong> e o que o relatorio e a automacao
          leem, por isso ela e definida na criacao e nunca muda depois.
        </p>
        <Botao variante="primario" onClick={abrirNovo}>
          Novo status
        </Botao>
      </div>

      {status.length === 0 ? (
        <Vazio titulo="Nenhum status cadastrado." />
      ) : (
        <ul className="grid gap-1">
          {status.map((s) => (
            <li
              key={s.id}
              className={`transicao flex items-center gap-3 rounded-sm border border-linha bg-papel-alto px-3 py-2 hover:shadow-hover ${
                s.ativo ? "" : "opacity-55"
              }`}
            >
              <span className="num w-8 text-[12px] text-tinta-fraca">{s.ordem}</span>
              <span className="flex-1 text-[13px] font-medium">{s.nome}</span>

              <Selo texto={ROTULO_CATEGORIA[s.categoria]} cor={COR_CATEGORIA[s.categoria]} />
              {!s.ativo && <span className="text-[12px] text-tinta-fraca">inativo</span>}

              <span className="num w-16 text-right text-[12px] text-tinta-fraca">
                {emUso[s.id] ?? 0} uso{(emUso[s.id] ?? 0) === 1 ? "" : "s"}
              </span>

              <span className="flex gap-0.5">
                <Botao tamanho="pequeno" variante="fantasma" onClick={() => abrirEdicao(s)}>
                  Editar
                </Botao>
                <Botao
                  tamanho="pequeno"
                  variante="perigo"
                  disabled={ocupado}
                  onClick={() => void excluir(s)}
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
        titulo={editando ? "Editar status" : "Novo status"}
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

          {editando ? (
            <div>
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-tinta-fraca">
                Categoria
              </span>
              <div className="flex items-center gap-2">
                <Selo
                  texto={ROTULO_CATEGORIA[editando.categoria]}
                  cor={COR_CATEGORIA[editando.categoria]}
                />
                <span className="text-[12px] text-tinta-fraca">
                  fixa - mudar aqui alteraria o significado do historico
                </span>
              </div>
            </div>
          ) : (
            <Selecao
              rotulo="Categoria"
              obrigatorio
              value={rascunho.categoria}
              onChange={(e) =>
                setRascunho({ ...rascunho, categoria: e.target.value as CategoriaStatus })
              }
            >
              {CATEGORIAS_STATUS.map((c) => (
                <option key={c} value={c}>
                  {ROTULO_CATEGORIA[c]}
                </option>
              ))}
            </Selecao>
          )}

          <div className="grid grid-cols-2 gap-3">
            <CampoCor
              rotulo="Cor"
              valor={rascunho.cor}
              aoMudar={(cor) => setRascunho({ ...rascunho, cor })}
            />
            <Campo
              rotulo="Ordem"
              type="number"
              min={0}
              mono
              value={rascunho.ordem}
              onChange={(e) => setRascunho({ ...rascunho, ordem: e.target.value })}
            />
          </div>

          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={rascunho.ativo}
              onChange={(e) => setRascunho({ ...rascunho, ativo: e.target.checked })}
            />
            Disponivel para uso
          </label>

          {erro && <p className="text-[13px] text-cat-cancelado">{erro}</p>}
        </div>
      </Modal>
    </>
  );
}

function novoRascunho(status: TaskStatus[]): Rascunho {
  const proxima = Math.max(0, ...status.map((s) => s.ordem)) + 1;
  return {
    nome: "",
    categoria: "andamento",
    cor: COR_CATEGORIA.andamento,
    ordem: String(proxima),
    ativo: true,
  };
}
