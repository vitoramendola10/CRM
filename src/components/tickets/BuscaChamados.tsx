"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";

/** Mesmo teto do `busca` em filtroTicketsSchema: cortar aqui evita um envio que o parse recusaria. */
const MAX = 120;

/** Como o filtro de situacao, o termo vive na URL: o link compartilhado ja abre buscado. */
export function BuscaChamados() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const aplicada = params.get("busca") ?? "";
  const [texto, setTexto] = useState(aplicada);

  /**
   * Submit em vez de debounce: a pagina e `force-dynamic`, entao cada mudanca de URL
   * refaz a consulta no banco. Buscando no enter/clique sai uma consulta por intencao
   * do usuario, e nao uma a cada pausa da digitacao - alem de nao ter timer para
   * cancelar quando o componente some.
   */
  function ir(valor: string) {
    const p = new URLSearchParams(params.toString());
    // Preserva os demais parametros (hoje `situacao`): buscar nao troca de aba.
    if (valor) p.set("busca", valor);
    else p.delete("busca");
    // Menos a pagina: buscar na pagina 4 e cair num resultado de 2 paginas
    // mostraria uma lista vazia com o rodape dizendo que ha 30 chamados.
    p.delete("pagina");
    // A rota vem do proprio pathname; o typedRoutes so nao consegue provar a query string.
    router.push(`${pathname}${p.size > 0 ? `?${p}` : ""}` as Route);
  }

  function limpar() {
    setTexto("");
    ir("");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ir(texto.trim());
      }}
      className="flex gap-1.5"
    >
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        // Esc limpa sem tirar a mao do teclado; o botao cobre quem usa o mouse.
        onKeyDown={(e) => {
          if (e.key === "Escape") limpar();
        }}
        maxLength={MAX}
        aria-label="Buscar chamados"
        placeholder="Buscar por assunto ou solicitante"
        className="transicao h-8 w-64 rounded-sm border border-linha-forte bg-papel-alto px-2.5 text-[13px] text-tinta placeholder:text-tinta-fraca hover:border-tinta-fraca"
      />
      <Botao type="submit">Buscar</Botao>
      {(texto !== "" || aplicada !== "") && (
        <Botao variante="fantasma" onClick={limpar}>
          Limpar
        </Botao>
      )}
    </form>
  );
}
