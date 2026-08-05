"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { chamar } from "@/lib/api";

/**
 * "Pegar para mim". Antes, para trocar o atendente era preciso abrir o chamado,
 * achar o proprio nome num select de todos os usuarios e salvar o formulario
 * inteiro - tres passos para dizer "sou eu que estou cuidando disto".
 *
 * Some quando o chamado ja e seu: botao que nao faz nada e ruido na lista.
 */
export function Assumir({
  ticketId,
  atendenteId,
  euId,
  tamanho = "pequeno",
}: {
  ticketId: number;
  atendenteId: string | null;
  euId: string;
  tamanho?: "normal" | "pequeno";
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (atendenteId === euId) return null;

  async function assumir() {
    setOcupado(true);
    setErro(null);
    const r = await chamar(`/api/tickets/${ticketId}/assumir`, "POST");
    setOcupado(false);

    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    router.refresh();
  }

  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <Botao
        tamanho={tamanho}
        disabled={ocupado}
        title={erro ?? (atendenteId === null ? "Ninguem esta cuidando deste" : "Passar para mim")}
        onClick={(e) => {
          // A linha da lista inteira e um link para o chamado.
          e.preventDefault();
          e.stopPropagation();
          void assumir();
        }}
      >
        {ocupado ? "..." : "Assumir"}
      </Botao>
      {erro && <span className="text-[11px] text-cat-cancelado">{erro}</span>}
    </span>
  );
}
