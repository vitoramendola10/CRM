"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Vazio } from "@/components/ui/Cabecalho";
import { Campo, CampoCor } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import { Selo } from "@/components/ui/Selo";
import { COR_NEUTRA_COLUNA, type Etiqueta } from "@/domain";
import { chamar } from "@/lib/api";
import type { CamposComErro } from "@/lib/rota";

type Rascunho = { nome: string; cor: string; ativo: boolean };
const VAZIO: Rascunho = { nome: "", cor: COR_NEUTRA_COLUNA, ativo: true };

export function ListaEtiquetas({
  etiquetas,
  emUso,
}: {
  etiquetas: Etiqueta[];
  emUso: Record<string, number>;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<Etiqueta | null>(null);
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
    const r = editando
      ? await chamar(`/api/config/etiquetas/${editando.id}`, "PATCH", f)
      : await chamar("/api/config/etiquetas", "POST", f);
    setOcupado(false);
    if (!r.ok) {
      setErro(r.erro);
      setCampos(r.campos ?? {});
      return;
    }
    fechar();
    router.refresh();
  }

  async function excluir(e: Etiqueta) {
    const n = emUso[e.id] ?? 0;
    const aviso =
      n > 0
        ? `A etiqueta "${e.nome}" esta em ${n} ${n === 1 ? "rotina" : "rotinas"} e sera removida delas. Continuar?`
        : `Excluir a etiqueta "${e.nome}"?`;
    if (!confirm(aviso)) return;

    const r = await chamar(`/api/config/etiquetas/${e.id}`, "DELETE");
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
          Marcadores que se acumulam numa rotina, ao contrario do{" "}
          <strong className="font-medium">tipo</strong>, que e um so. Servem para cortar o board
          por outro eixo: <span className="num">fiscal</span>,{" "}
          <span className="num">regressao</span>, <span className="num">cliente-chave</span>.
        </p>
        <Botao
          variante="primario"
          onClick={() => {
            setF(VAZIO);
            setCriando(true);
            setErro(null);
          }}
        >
          Nova etiqueta
        </Botao>
      </div>

      {etiquetas.length === 0 ? (
        <Vazio
          titulo="Nenhuma etiqueta cadastrada."
          detalhe="Sem etiquetas, o agrupamento por etiqueta no Kanban fica vazio."
        />
      ) : (
        <ul className="grid gap-1">
          {etiquetas.map((e) => (
            <li
              key={e.id}
              className={`transicao flex items-center gap-3 rounded-sm border border-linha bg-papel-alto px-3 py-2 hover:shadow-hover ${
                e.ativo ? "" : "opacity-55"
              }`}
            >
              <Selo texto={e.nome} cor={e.cor} />
              <span className="flex-1" />
              {!e.ativo && <span className="text-[12px] text-tinta-fraca">inativa</span>}
              <span className="num w-24 text-right text-[12px] text-tinta-fraca">
                {emUso[e.id] ?? 0} rotina{(emUso[e.id] ?? 0) === 1 ? "" : "s"}
              </span>
              <span className="flex gap-0.5">
                <Botao
                  tamanho="pequeno"
                  variante="fantasma"
                  onClick={() => {
                    setF({ nome: e.nome, cor: e.cor, ativo: e.ativo });
                    setEditando(e);
                    setErro(null);
                  }}
                >
                  Editar
                </Botao>
                <Botao tamanho="pequeno" variante="perigo" onClick={() => void excluir(e)}>
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
        titulo={editando ? "Editar etiqueta" : "Nova etiqueta"}
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
            erro={campos.nome}
            value={f.nome}
            onChange={(e) => setF({ ...f, nome: e.target.value })}
          />
          <CampoCor rotulo="Cor" valor={f.cor} aoMudar={(cor) => setF({ ...f, cor })} />
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={f.ativo}
              onChange={(e) => setF({ ...f, ativo: e.target.checked })}
            />
            Disponivel para uso
          </label>
          {erro && <p className="text-[13px] text-cat-cancelado">{erro}</p>}
        </div>
      </Modal>
    </>
  );
}
