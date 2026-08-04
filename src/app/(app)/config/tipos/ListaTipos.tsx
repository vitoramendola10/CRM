"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Vazio } from "@/components/ui/Cabecalho";
import { Campo, CampoCor } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import { Selo } from "@/components/ui/Selo";
import { COR_NEUTRA_COLUNA, type TaskType } from "@/domain";
import { chamar } from "@/lib/api";

type Rascunho = { nome: string; cor: string; ativo: boolean };
const VAZIO: Rascunho = { nome: "", cor: COR_NEUTRA_COLUNA, ativo: true };

export function ListaTipos({
  tipos,
  emUso,
}: {
  tipos: TaskType[];
  emUso: Record<string, number>;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<TaskType | null>(null);
  const [criando, setCriando] = useState(false);
  const [rascunho, setRascunho] = useState<Rascunho>(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  function fechar() {
    setCriando(false);
    setEditando(null);
    setErro(null);
  }

  async function salvar() {
    setOcupado(true);
    setErro(null);
    const r = editando
      ? await chamar(`/api/config/tipos/${editando.id}`, "PATCH", rascunho)
      : await chamar("/api/config/tipos", "POST", rascunho);
    setOcupado(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    fechar();
    router.refresh();
  }

  async function excluir(t: TaskType) {
    if (!confirm(`Excluir o tipo "${t.nome}"?`)) return;
    setOcupado(true);
    const r = await chamar(`/api/config/tipos/${t.id}`, "DELETE");
    setOcupado(false);
    if (!r.ok) {
      alert(r.erro);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] text-tinta-media">
          A natureza da rotina: bug, melhoria, ajuste fiscal.
        </p>
        <Botao
          variante="primario"
          onClick={() => {
            setRascunho(VAZIO);
            setCriando(true);
            setErro(null);
          }}
        >
          Novo tipo
        </Botao>
      </div>

      {tipos.length === 0 ? (
        <Vazio titulo="Nenhum tipo cadastrado." />
      ) : (
        <ul className="grid gap-1">
          {tipos.map((t) => (
            <li
              key={t.id}
              className={`transicao flex items-center gap-3 rounded-sm border border-linha bg-papel-alto px-3 py-2 hover:shadow-hover ${
                t.ativo ? "" : "opacity-55"
              }`}
            >
              <Selo texto={t.nome} cor={t.cor} />
              <span className="flex-1" />
              {!t.ativo && <span className="text-[12px] text-tinta-fraca">inativo</span>}
              <span className="num w-16 text-right text-[12px] text-tinta-fraca">
                {emUso[t.id] ?? 0} uso{(emUso[t.id] ?? 0) === 1 ? "" : "s"}
              </span>
              <span className="flex gap-0.5">
                <Botao
                  tamanho="pequeno"
                  variante="fantasma"
                  onClick={() => {
                    setRascunho({ nome: t.nome, cor: t.cor, ativo: t.ativo });
                    setEditando(t);
                    setErro(null);
                  }}
                >
                  Editar
                </Botao>
                <Botao
                  tamanho="pequeno"
                  variante="perigo"
                  disabled={ocupado}
                  onClick={() => void excluir(t)}
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
        titulo={editando ? "Editar tipo" : "Novo tipo"}
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
          <CampoCor
            rotulo="Cor"
            valor={rascunho.cor}
            aoMudar={(cor) => setRascunho({ ...rascunho, cor })}
          />
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
