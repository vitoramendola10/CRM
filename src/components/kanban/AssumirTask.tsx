"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { chamar } from "@/lib/api";

/**
 * "Pegar para mim" na propria rotina.
 *
 * Fica dentro do card, e por isso e um <button>: o `useArrasto` nao inicia
 * arrasto a partir de botao, entao clicar aqui nao move o card por engano.
 *
 * So aparece em rotina sem dono. Trocar responsavel de quem ja pegou continua
 * sendo no formulario da rotina, onde a mudanca e deliberada e fica no historico.
 */
export function AssumirTask({
  taskId,
  compacto = false,
}: {
  taskId: string;
  compacto?: boolean;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function assumir() {
    setOcupado(true);
    setErro(null);
    const r = await chamar(`/api/tasks/${taskId}/assumir`, "POST");
    setOcupado(false);

    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={ocupado}
      title={erro ?? "Assumir esta rotina"}
      onClick={(e) => {
        // O titulo do card e um link; sem isto o clique subiria ate ele.
        e.preventDefault();
        e.stopPropagation();
        void assumir();
      }}
      className={`transicao shrink-0 rounded-xs border border-dashed text-[10px] uppercase tracking-wide disabled:opacity-45 ${
        erro
          ? "border-cat-cancelado text-cat-cancelado"
          : "border-tinta-fraca text-tinta-fraca hover:border-acento hover:text-acento"
      } ${compacto ? "px-1.5 py-0.5" : "px-2 py-1 text-[11px]"}`}
    >
      {ocupado ? "..." : "pegar"}
    </button>
  );
}
