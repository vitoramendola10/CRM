"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Vazio } from "@/components/ui/Cabecalho";
import { AreaTexto, Campo, Selecao } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import { Selo } from "@/components/ui/Selo";
import {
  COR_SITUACAO_TICKET,
  ROTULO_SITUACAO_TICKET,
  SITUACOES_TICKET,
  type Resposta,
  type SituacaoTicket,
} from "@/domain";
import { chamar } from "@/lib/api";
import type { CamposComErro } from "@/lib/rota";

/**
 * Respostas prontas do atendimento.
 *
 * Suporte de software house responde as mesmas vinte perguntas. Aqui elas ficam
 * escritas uma vez, com a situacao que costuma acompanhar cada uma - aplicar o
 * texto e ainda ter de escolher a situacao a mao e meio trabalho feito.
 */

const CAMPOS_DISPONIVEIS = ["protocolo", "assunto", "cliente", "solicitante", "atendente"];

type Rascunho = {
  nome: string;
  corpo: string;
  situacao: SituacaoTicket | "";
  interno: boolean;
  ordem: string;
  ativo: boolean;
};

const VAZIO: Rascunho = {
  nome: "",
  corpo: "",
  situacao: "",
  interno: true,
  ordem: "0",
  ativo: true,
};

export function ListaRespostas({ respostas }: { respostas: Resposta[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<Resposta | null>(null);
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

  function abrir(r: Resposta | null) {
    setF(
      r === null
        ? VAZIO
        : {
            nome: r.nome,
            corpo: r.corpo,
            situacao: r.situacao ?? "",
            interno: r.interno,
            ordem: String(r.ordem),
            ativo: r.ativo,
          },
    );
    setErro(null);
    setCampos({});
    if (r === null) setCriando(true);
    else setEditando(r);
  }

  async function salvar() {
    setOcupado(true);
    setErro(null);
    setCampos({});

    const corpo = {
      ...f,
      situacao: f.situacao === "" ? null : f.situacao,
      ordem: Number(f.ordem) || 0,
    };

    const r = editando
      ? await chamar(`/api/config/respostas/${editando.id}`, "PATCH", corpo)
      : await chamar("/api/config/respostas", "POST", corpo);

    setOcupado(false);
    if (!r.ok) {
      setErro(r.erro);
      setCampos(r.campos ?? {});
      return;
    }
    fechar();
    router.refresh();
  }

  async function excluir(r: Resposta) {
    if (!confirm(`Excluir a resposta "${r.nome}"?`)) return;
    const resp = await chamar(`/api/config/respostas/${r.id}`, "DELETE");
    if (!resp.ok) {
      alert(resp.erro);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[12px] text-tinta-fraca">
          O texto aceita {CAMPOS_DISPONIVEIS.map((c) => `{{${c}}}`).join(", ")} — trocados pelos
          dados do chamado no momento de aplicar.
        </p>
        <Botao variante="primario" onClick={() => abrir(null)}>
          Nova resposta
        </Botao>
      </div>

      {respostas.length === 0 ? (
        <Vazio
          titulo="Nenhuma resposta pronta."
          detalhe="Cadastre as que o suporte repete todo dia."
        />
      ) : (
        <ul className="grid gap-1">
          {respostas.map((r) => (
            <li
              key={r.id}
              className={`transicao rounded-sm border border-linha bg-papel-alto px-3 py-2 hover:shadow-hover ${
                r.ativo ? "" : "opacity-55"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="num w-8 shrink-0 text-[11px] text-tinta-fraca">{r.ordem}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{r.nome}</span>

                {r.situacao && (
                  <Selo
                    texto={`→ ${ROTULO_SITUACAO_TICKET[r.situacao]}`}
                    cor={COR_SITUACAO_TICKET[r.situacao]}
                  />
                )}
                <span className="shrink-0 rounded-xs border border-linha px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-tinta-fraca">
                  {r.interno ? "interna" : "visivel ao cliente"}
                </span>
                {!r.ativo && <span className="text-[12px] text-tinta-fraca">inativa</span>}

                <span className="flex shrink-0 gap-0.5">
                  <Botao tamanho="pequeno" variante="fantasma" onClick={() => abrir(r)}>
                    Editar
                  </Botao>
                  <Botao tamanho="pequeno" variante="perigo" onClick={() => void excluir(r)}>
                    Excluir
                  </Botao>
                </span>
              </div>
              <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-[12px] text-tinta-media">
                {r.corpo}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Modal
        aberto={criando || editando !== null}
        aoFechar={fechar}
        titulo={editando ? "Editar resposta" : "Nova resposta"}
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
          <Campo
            rotulo="Nome"
            obrigatorio
            autoFocus
            dica="Como ela aparece na lista do atendimento"
            erro={campos.nome}
            value={f.nome}
            onChange={(e) => setF({ ...f, nome: e.target.value })}
          />

          <AreaTexto
            rotulo="Texto"
            obrigatorio
            rows={7}
            erro={campos.corpo}
            value={f.corpo}
            onChange={(e) => setF({ ...f, corpo: e.target.value })}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Selecao
              rotulo="Ao aplicar, passar para"
              value={f.situacao}
              onChange={(e) => setF({ ...f, situacao: e.target.value as SituacaoTicket | "" })}
            >
              <option value="">Nao mudar a situacao</option>
              {SITUACOES_TICKET.map((s) => (
                <option key={s} value={s}>
                  {ROTULO_SITUACAO_TICKET[s]}
                </option>
              ))}
            </Selecao>

            <Campo
              rotulo="Ordem"
              mono
              inputMode="numeric"
              dica="Menor aparece primeiro"
              erro={campos.ordem}
              value={f.ordem}
              onChange={(e) => setF({ ...f, ordem: e.target.value })}
            />
          </div>

          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={!f.interno}
              onChange={(e) => setF({ ...f, interno: !e.target.checked })}
            />
            Nasce marcada como visivel ao cliente
          </label>

          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={f.ativo}
              onChange={(e) => setF({ ...f, ativo: e.target.checked })}
            />
            Resposta ativa
          </label>

          {erro && <p className="text-[13px] text-cat-cancelado">{erro}</p>}
        </div>
      </Modal>
    </>
  );
}
