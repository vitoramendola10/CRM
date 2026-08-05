"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { ROTAS } from "@/domain";

/** Submit e nao debounce: cada busca varre cinco tabelas, nao vale por tecla. */
export function CampoBusca({ inicial }: { inicial: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState(inicial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = texto.trim();
        router.push((t === "" ? ROTAS.busca : `${ROTAS.busca}?q=${encodeURIComponent(t)}`) as Route);
      }}
      className="flex gap-1.5"
    >
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={120}
        autoFocus
        aria-label="Buscar em todo o sistema"
        placeholder="Protocolo, assunto, cliente, trecho de um comentario..."
        className="transicao h-9 flex-1 rounded-sm border border-linha-forte bg-papel-alto px-3 text-[14px] text-tinta placeholder:text-tinta-fraca hover:border-tinta-fraca"
      />
      <Botao type="submit" variante="primario">
        Buscar
      </Botao>
    </form>
  );
}
