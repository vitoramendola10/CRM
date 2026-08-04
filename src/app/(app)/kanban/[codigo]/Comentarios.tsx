"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Botao } from "@/components/ui/Botao";
import type { TaskComment } from "@/domain";
import { chamar } from "@/lib/api";
import { formatarDataHora } from "@/lib/datas";

export function Comentarios({
  taskId,
  comentarios,
}: {
  taskId: string;
  comentarios: (TaskComment & { autor: string | null })[];
}) {
  const router = useRouter();
  const [corpo, setCorpo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (corpo.trim() === "") return;

    setEnviando(true);
    setErro(null);
    const r = await chamar(`/api/tasks/${taskId}/comentarios`, "POST", { corpo });
    setEnviando(false);

    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setCorpo("");
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      {comentarios.length === 0 ? (
        <p className="text-[13px] text-tinta-fraca">
          Nenhum comentario. O primeiro costuma ser o mais util.
        </p>
      ) : (
        <ol className="grid gap-2.5">
          {comentarios.map((c) => (
            <li key={c.id} className="flex gap-2">
              <Avatar nome={c.autor} tamanho={22} />
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 flex items-baseline gap-2">
                  <span className="text-[13px] font-medium">{c.autor ?? "Usuario removido"}</span>
                  <span className="num text-[11px] text-tinta-fraca">
                    {formatarDataHora(c.createdAt)}
                  </span>
                </p>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{c.corpo}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={enviar} className="grid gap-2 border-t border-linha pt-3">
        <textarea
          rows={3}
          value={corpo}
          onChange={(e) => setCorpo(e.target.value)}
          placeholder="Escreva um comentario"
          className="transicao w-full resize-y rounded-sm border border-linha-forte bg-papel-alto px-2.5 py-1.5 text-[13px] leading-relaxed placeholder:text-tinta-fraca hover:border-tinta-fraca"
        />
        {erro && <p className="text-[13px] text-cat-cancelado">{erro}</p>}
        <Botao
          type="submit"
          variante="primario"
          disabled={enviando || corpo.trim() === ""}
          className="justify-self-start"
        >
          {enviando ? "Enviando..." : "Comentar"}
        </Botao>
      </form>
    </div>
  );
}
