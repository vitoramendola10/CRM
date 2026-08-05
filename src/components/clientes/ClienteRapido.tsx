"use client";

import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Modal } from "@/components/ui/Modal";
import { chamar } from "@/lib/api";
import type { CamposComErro } from "@/lib/rota";

/**
 * Cadastro de cliente no meio da ligacao.
 *
 * O suporte nao entra em /config/clientes (so admin e gestor), mas
 * POST /api/clientes aceita qualquer papel logado justamente por causa disto:
 * quando alguem liga pela primeira vez, o atendente cadastra aqui e segue.
 *
 * De proposito NAO e o formulario de /config/clientes: `clienteSchema` so exige
 * `razaoSocial` - CNPJ, e-mail, cidade e UF tem default null. Pedir isso agora
 * seria segurar o telefone na mao esperando o cliente achar o cartao. O telefone
 * fica porque e o unico dado que o atendente ja tem na tela; o resto se completa
 * depois em Configuracao > Clientes.
 */

/** O minimo que a tela de chamado precisa para ja deixar o cliente selecionado. */
export type ClienteCriado = { id: string; razaoSocial: string };

const VAZIO = { razaoSocial: "", telefone: "" };

export function ClienteRapido({
  aoCriar,
  aoAlternar,
}: {
  aoCriar: (cliente: ClienteCriado) => void;
  /**
   * Avisa o host que este modal abriu ou fechou. So interessa a quem ja e um
   * modal: o evento `cancel` do <dialog> de dentro sobe pela arvore do React
   * ate o `onCancel` do <dialog> de fora, entao o Esc fecharia os dois se o
   * host nao ignorasse o pedido enquanto este cadastro esta aberto.
   */
  aoAlternar?: ((aberto: boolean) => void) | undefined;
}) {
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<CamposComErro>({});
  const [salvando, setSalvando] = useState(false);

  function alternar(v: boolean) {
    setAberto(v);
    aoAlternar?.(v);
  }

  function abrir() {
    setF(VAZIO);
    setErro(null);
    setCampos({});
    alternar(true);
  }

  function fechar() {
    alternar(false);
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    setCampos({});

    // A razao social vai aparada porque a rota devolve so `{ id }`: o rotulo que
    // colocamos no seletor tem de ser igual ao que o schema gravou.
    const razaoSocial = f.razaoSocial.trim();
    const r = await chamar<{ id: string }>("/api/clientes", "POST", {
      razaoSocial,
      telefone: f.telefone,
    });

    setSalvando(false);
    if (!r.ok) {
      setErro(r.erro);
      setCampos(r.campos ?? {});
      return;
    }

    aoCriar({ id: r.dados.id, razaoSocial });
    alternar(false);
  }

  return (
    <>
      <Botao tamanho="pequeno" variante="fantasma" className="px-1" onClick={abrir}>
        + novo cliente
      </Botao>

      <Modal
        aberto={aberto}
        aoFechar={fechar}
        titulo="Novo cliente"
        descricao="So o essencial para atender agora. O cadastro completo fica em Configuracao."
        rodape={
          <>
            <Botao onClick={fechar} disabled={salvando}>
              Cancelar
            </Botao>
            <Botao variante="primario" onClick={() => void salvar()} disabled={salvando}>
              {salvando ? "Cadastrando..." : "Cadastrar"}
            </Botao>
          </>
        }
      >
        <div
          className="grid gap-3"
          // Enter cadastra. O preventDefault nao e enfeite: no FormTicket este
          // modal nasce dentro do <form> do chamado e o <dialog> nao muda o dono
          // dos campos, entao sem isto o Enter dispararia o submit do formulario
          // de cima em vez de criar o cliente.
          onKeyDown={(e) => {
            if (e.key === "Enter" && !salvando) {
              e.preventDefault();
              void salvar();
            }
          }}
        >
          <Campo
            rotulo="Razao social"
            obrigatorio
            autoFocus
            erro={campos.razaoSocial}
            value={f.razaoSocial}
            onChange={(e) => setF({ ...f, razaoSocial: e.target.value })}
          />
          <Campo
            rotulo="Telefone"
            mono
            dica="Opcional"
            erro={campos.telefone}
            value={f.telefone}
            onChange={(e) => setF({ ...f, telefone: e.target.value })}
          />

          {erro && <p className="text-[13px] text-cat-cancelado">{erro}</p>}
        </div>
      </Modal>
    </>
  );
}
