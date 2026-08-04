"use client";

import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Vazio } from "@/components/ui/Cabecalho";
import { Campo, Selecao } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import type { ClienteDaLista } from "@/db/queries/clientes";
import { chamar } from "@/lib/api";
import type { CamposComErro } from "@/lib/rota";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR",
  "PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

type Rascunho = {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  email: string;
  cidade: string;
  uf: string;
  ativo: boolean;
};

const VAZIO: Rascunho = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  telefone: "",
  email: "",
  cidade: "",
  uf: "",
  ativo: true,
};

export function ListaClientes({
  clientes,
  podeExcluir,
}: {
  clientes: ClienteDaLista[];
  podeExcluir: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [busca, setBusca] = useState(params.get("busca") ?? "");
  const [editando, setEditando] = useState<ClienteDaLista | null>(null);
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

  function procurar(e: React.FormEvent) {
    e.preventDefault();
    router.push(
      busca.trim() === ""
        ? "/config/clientes"
        : (`/config/clientes?busca=${encodeURIComponent(busca)}` as Route),
    );
  }

  async function salvar() {
    setOcupado(true);
    setErro(null);
    setCampos({});

    const r = editando
      ? await chamar(`/api/clientes/${editando.id}`, "PATCH", f)
      : await chamar("/api/clientes", "POST", f);

    setOcupado(false);
    if (!r.ok) {
      setErro(r.erro);
      setCampos(r.campos ?? {});
      return;
    }
    fechar();
    router.refresh();
  }

  async function excluir(c: ClienteDaLista) {
    if (!confirm(`Excluir o cliente "${c.razaoSocial}"?`)) return;
    const r = await chamar(`/api/clientes/${c.id}`, "DELETE");
    if (!r.ok) {
      alert(r.erro);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form onSubmit={procurar} className="flex gap-1.5">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por razao social, fantasia ou CNPJ"
            className="transicao h-8 w-72 rounded-sm border border-linha-forte bg-papel-alto px-2.5 text-[13px] placeholder:text-tinta-fraca hover:border-tinta-fraca"
          />
          <Botao type="submit">Buscar</Botao>
        </form>

        <Botao
          variante="primario"
          className="ml-auto"
          onClick={() => {
            setF(VAZIO);
            setCriando(true);
            setErro(null);
          }}
        >
          Novo cliente
        </Botao>
      </div>

      {clientes.length === 0 ? (
        <Vazio
          titulo={params.get("busca") ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}
          detalhe={params.get("busca") ? undefined : "Cadastre o primeiro para vincular aos chamados."}
        />
      ) : (
        <ul className="grid gap-1">
          {clientes.map((c) => (
            <li
              key={c.id}
              className={`transicao flex items-center gap-3 rounded-sm border border-linha bg-papel-alto px-3 py-2 hover:shadow-hover ${
                c.ativo ? "" : "opacity-55"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{c.razaoSocial}</span>
                <span className="block truncate text-[12px] text-tinta-fraca">
                  {c.nomeFantasia ?? "sem nome fantasia"}
                  {c.cidade && ` - ${c.cidade}${c.uf ? `/${c.uf}` : ""}`}
                </span>
              </span>

              <span className="num hidden w-36 shrink-0 text-[12px] text-tinta-fraca md:block">
                {c.cnpj ? formatarCnpj(c.cnpj) : "sem CNPJ"}
              </span>

              <span className="num hidden w-32 shrink-0 text-right text-[11px] text-tinta-fraca sm:block">
                {c.chamados} chamado{c.chamados === 1 ? "" : "s"}
                {" / "}
                {c.rotinas} rotina{c.rotinas === 1 ? "" : "s"}
              </span>

              {!c.ativo && <span className="text-[12px] text-tinta-fraca">inativo</span>}

              <span className="flex shrink-0 gap-0.5">
                <Botao
                  tamanho="pequeno"
                  variante="fantasma"
                  onClick={() => {
                    setF({
                      razaoSocial: c.razaoSocial,
                      nomeFantasia: c.nomeFantasia ?? "",
                      cnpj: c.cnpj ?? "",
                      telefone: c.telefone ?? "",
                      email: c.email ?? "",
                      cidade: c.cidade ?? "",
                      uf: c.uf ?? "",
                      ativo: c.ativo,
                    });
                    setEditando(c);
                    setErro(null);
                  }}
                >
                  Editar
                </Botao>
                {podeExcluir && (
                  <Botao tamanho="pequeno" variante="perigo" onClick={() => void excluir(c)}>
                    Excluir
                  </Botao>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Modal
        aberto={criando || editando !== null}
        aoFechar={fechar}
        titulo={editando ? "Editar cliente" : "Novo cliente"}
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
            rotulo="Razao social"
            obrigatorio
            autoFocus
            erro={campos.razaoSocial}
            value={f.razaoSocial}
            onChange={(e) => setF({ ...f, razaoSocial: e.target.value })}
          />
          <Campo
            rotulo="Nome fantasia"
            erro={campos.nomeFantasia}
            value={f.nomeFantasia}
            onChange={(e) => setF({ ...f, nomeFantasia: e.target.value })}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo
              rotulo="CNPJ"
              mono
              inputMode="numeric"
              dica="So os digitos; a mascara e da tela"
              erro={campos.cnpj}
              value={f.cnpj}
              onChange={(e) => setF({ ...f, cnpj: e.target.value })}
            />
            <Campo
              rotulo="Telefone"
              mono
              erro={campos.telefone}
              value={f.telefone}
              onChange={(e) => setF({ ...f, telefone: e.target.value })}
            />
            <Campo
              rotulo="E-mail"
              type="email"
              erro={campos.email}
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
            />
            <Campo
              rotulo="Cidade"
              erro={campos.cidade}
              value={f.cidade}
              onChange={(e) => setF({ ...f, cidade: e.target.value })}
            />
            <Selecao
              rotulo="UF"
              erro={campos.uf}
              value={f.uf}
              onChange={(e) => setF({ ...f, uf: e.target.value })}
            >
              <option value="">--</option>
              {UFS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Selecao>
          </div>

          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={f.ativo}
              onChange={(e) => setF({ ...f, ativo: e.target.checked })}
            />
            Cliente ativo
          </label>

          {erro && <p className="text-[13px] text-cat-cancelado">{erro}</p>}
        </div>
      </Modal>
    </>
  );
}

function formatarCnpj(d: string): string {
  return d.length === 14
    ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
    : d;
}
