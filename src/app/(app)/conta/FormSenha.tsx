"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { chamar } from "@/lib/api";
import type { CamposComErro } from "@/lib/rota";

const VAZIO = { senhaAtual: "", senhaNova: "", confirmacao: "" };

export function FormSenha() {
  const router = useRouter();
  const [f, setF] = useState(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<CamposComErro>({});
  const [pronto, setPronto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function salvar() {
    // A confirmacao nao vai para o servidor: ela existe so para pegar erro de
    // digitacao num campo que a pessoa nao consegue ler enquanto digita.
    if (f.senhaNova !== f.confirmacao) {
      setErro(null);
      setCampos({ confirmacao: "As duas nao batem" });
      return;
    }

    setEnviando(true);
    setErro(null);
    setCampos({});
    setPronto(false);

    const r = await chamar("/api/conta/senha", "PATCH", {
      senhaAtual: f.senhaAtual,
      senhaNova: f.senhaNova,
    });

    setEnviando(false);
    if (!r.ok) {
      setErro(r.erro);
      setCampos(r.campos ?? {});
      return;
    }

    setF(VAZIO);
    setPronto(true);
    // O servidor trocou o cookie de sessao. O refresh faz o servidor reler a
    // sessao nova; sem ele a proxima navegacao ainda carregaria o estado antigo.
    router.refresh();
  }

  return (
    <form
      className="grid max-w-sm gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void salvar();
      }}
    >
      {/* O navegador precisa do campo de usuario para oferecer salvar a senha
          nova no gerenciador. Escondido, porque quem esta aqui ja se identificou. */}
      <input type="text" autoComplete="username" hidden readOnly value="" />

      <Campo
        rotulo="Senha atual"
        type="password"
        obrigatorio
        autoComplete="current-password"
        erro={campos.senhaAtual}
        value={f.senhaAtual}
        onChange={(e) => setF({ ...f, senhaAtual: e.target.value })}
      />

      <Campo
        rotulo="Senha nova"
        type="password"
        obrigatorio
        autoComplete="new-password"
        dica="Minimo de 8 caracteres"
        erro={campos.senhaNova}
        value={f.senhaNova}
        onChange={(e) => setF({ ...f, senhaNova: e.target.value })}
      />

      <Campo
        rotulo="Repita a senha nova"
        type="password"
        obrigatorio
        autoComplete="new-password"
        erro={campos.confirmacao}
        value={f.confirmacao}
        onChange={(e) => setF({ ...f, confirmacao: e.target.value })}
      />

      {erro && (
        <p role="alert" className="text-[13px] text-cat-cancelado">
          {erro}
        </p>
      )}

      {pronto && (
        <p role="status" className="text-[13px] text-cat-concluido">
          Senha trocada. As sessoes abertas em outros aparelhos foram encerradas.
        </p>
      )}

      <div>
        <Botao type="submit" variante="primario" disabled={enviando}>
          {enviando ? "Trocando..." : "Trocar senha"}
        </Botao>
      </div>
    </form>
  );
}
