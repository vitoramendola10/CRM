"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import type { Rota } from "@/domain";
import { chamar } from "@/lib/api";

export function FormLogin({ de }: { de: string | null }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);

    const r = await chamar<{ destino: Rota }>("/api/auth/login", "POST", { username, senha });
    if (!r.ok) {
      setErro(r.erro);
      setEnviando(false);
      return;
    }

    // `de` e o caminho que o middleware guardou ao barrar a navegacao. Pode ser
    // uma rota dinamica (/kanban/DEV-12), que o typedRoutes nao consegue provar;
    // a pagina ja garantiu que e caminho interno.
    router.replace((de ?? r.dados.destino) as Route);
    router.refresh();
  }

  return (
    <form onSubmit={entrar} className="grid gap-3">
      <Campo
        rotulo="Usuario"
        name="username"
        autoComplete="username"
        autoFocus
        required
        mono
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <Campo
        rotulo="Senha"
        name="senha"
        type="password"
        autoComplete="current-password"
        required
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
      />

      {erro && (
        <p
          role="alert"
          className="rounded-sm border border-cat-cancelado/30 bg-cat-cancelado/8 px-2.5 py-2 text-[13px] text-cat-cancelado"
        >
          {erro}
        </p>
      )}

      <Botao type="submit" variante="primario" disabled={enviando} className="mt-1 w-full">
        {enviando ? "Entrando..." : "Entrar"}
      </Botao>
    </form>
  );
}
