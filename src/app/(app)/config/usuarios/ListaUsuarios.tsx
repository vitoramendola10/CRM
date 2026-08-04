"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Botao } from "@/components/ui/Botao";
import { Campo, Selecao } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import { PAPEIS, ROTULO_PAPEL, type Papel, type Usuario } from "@/domain";
import { chamar } from "@/lib/api";
import type { CamposComErro } from "@/lib/rota";

type Rascunho = {
  username: string;
  nome: string;
  email: string;
  papel: Papel;
  senha: string;
  ativo: boolean;
};

const VAZIO: Rascunho = {
  username: "",
  nome: "",
  email: "",
  papel: "suporte",
  senha: "",
  ativo: true,
};

export function ListaUsuarios({
  usuarios,
  souAdmin,
}: {
  usuarios: Usuario[];
  souAdmin: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [criando, setCriando] = useState(false);
  const [rascunho, setRascunho] = useState<Rascunho>(VAZIO);
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

    const email = rascunho.email.trim() === "" ? null : rascunho.email.trim();

    const r = editando
      ? await chamar(`/api/config/usuarios/${editando.id}`, "PATCH", {
          nome: rascunho.nome,
          email,
          papel: rascunho.papel,
          ativo: rascunho.ativo,
        })
      : await chamar("/api/config/usuarios", "POST", {
          username: rascunho.username,
          nome: rascunho.nome,
          email,
          papel: rascunho.papel,
          senha: rascunho.senha,
        });

    setOcupado(false);
    if (!r.ok) {
      setErro(r.erro);
      setCampos(r.campos ?? {});
      return;
    }
    fechar();
    router.refresh();
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] text-tinta-media">
          O login e por usuario, nunca por e-mail. O e-mail so serve para receber notificacao.
        </p>
        {souAdmin && (
          <Botao
            variante="primario"
            onClick={() => {
              setRascunho(VAZIO);
              setCriando(true);
              setErro(null);
            }}
          >
            Novo usuario
          </Botao>
        )}
      </div>

      <ul className="grid gap-1">
        {usuarios.map((u) => (
          <li
            key={u.id}
            className={`transicao flex items-center gap-3 rounded-sm border border-linha bg-papel-alto px-3 py-2 hover:shadow-hover ${
              u.ativo ? "" : "opacity-55"
            }`}
          >
            <Avatar nome={u.nome} tamanho={26} />
            <span className="flex-1">
              <span className="block text-[13px] font-medium">{u.nome}</span>
              <span className="num block text-[12px] text-tinta-fraca">{u.username}</span>
            </span>

            <span className="hidden w-52 truncate text-[12px] text-tinta-fraca sm:block">
              {u.email ?? "sem e-mail - nao recebe notificacao"}
            </span>

            <span className="w-32 text-[12px] text-tinta-media">{ROTULO_PAPEL[u.papel]}</span>
            {!u.ativo && <span className="text-[12px] text-tinta-fraca">inativo</span>}

            {souAdmin && (
              <Botao
                tamanho="pequeno"
                variante="fantasma"
                onClick={() => {
                  setRascunho({
                    username: u.username,
                    nome: u.nome,
                    email: u.email ?? "",
                    papel: u.papel,
                    senha: "",
                    ativo: u.ativo,
                  });
                  setEditando(u);
                  setErro(null);
                }}
              >
                Editar
              </Botao>
            )}
          </li>
        ))}
      </ul>

      <Modal
        aberto={criando || editando !== null}
        aoFechar={fechar}
        titulo={editando ? `Editar ${editando.username}` : "Novo usuario"}
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
          {!editando && (
            <Campo
              rotulo="Usuario"
              obrigatorio
              autoFocus
              mono
              autoComplete="off"
              dica="Letras, numeros, ponto, hifen ou underline"
              erro={campos.username}
              value={rascunho.username}
              onChange={(e) => setRascunho({ ...rascunho, username: e.target.value })}
            />
          )}

          <Campo
            rotulo="Nome"
            obrigatorio
            erro={campos.nome}
            value={rascunho.nome}
            onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })}
          />

          <Campo
            rotulo="E-mail"
            type="email"
            autoComplete="off"
            dica="Opcional. Sem ele, a pessoa nao recebe notificacao."
            erro={campos.email}
            value={rascunho.email}
            onChange={(e) => setRascunho({ ...rascunho, email: e.target.value })}
          />

          <Selecao
            rotulo="Papel"
            obrigatorio
            erro={campos.papel}
            value={rascunho.papel}
            onChange={(e) => setRascunho({ ...rascunho, papel: e.target.value as Papel })}
          >
            {PAPEIS.map((p) => (
              <option key={p} value={p}>
                {ROTULO_PAPEL[p]}
              </option>
            ))}
          </Selecao>

          {editando ? (
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={rascunho.ativo}
                onChange={(e) => setRascunho({ ...rascunho, ativo: e.target.checked })}
              />
              Pode entrar no sistema
            </label>
          ) : (
            <Campo
              rotulo="Senha"
              type="password"
              obrigatorio
              autoComplete="new-password"
              dica="Minimo de 8 caracteres"
              erro={campos.senha}
              value={rascunho.senha}
              onChange={(e) => setRascunho({ ...rascunho, senha: e.target.value })}
            />
          )}

          {erro && <p className="text-[13px] text-cat-cancelado">{erro}</p>}
        </div>
      </Modal>
    </>
  );
}
