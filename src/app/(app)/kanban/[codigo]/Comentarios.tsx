"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { AreaTextoMencao } from "@/components/ui/AreaTextoMencao";
import { Botao } from "@/components/ui/Botao";
import { ComCitacoes } from "@/components/ui/ComCitacoes";
import { extrairMencoes, type TaskComment, type Usuario } from "@/domain";
import { chamar } from "@/lib/api";
import { formatarDataHora } from "@/lib/datas";

export function Comentarios({
  taskId,
  comentarios,
  usuarios,
}: {
  taskId: string;
  comentarios: (TaskComment & { autor: string | null })[];
  /** Para citar com @ e para saber quais citacoes existem de verdade. */
  usuarios: Usuario[];
}) {
  const nomesValidos = new Set(usuarios.map((u) => u.username.toLowerCase()));
  const router = useRouter();
  const [corpo, setCorpo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Separa o que sera avisado do que a pessoa digitou errado.
  const mencionados = extrairMencoes(corpo);
  const citados = mencionados.filter((u) => nomesValidos.has(u));
  const errados = mencionados.filter((u) => !nomesValidos.has(u));

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
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
                  <ComCitacoes texto={c.corpo} validos={nomesValidos} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={enviar} className="grid gap-2 border-t border-linha pt-3">
        <AreaTextoMencao
          rows={3}
          usuarios={usuarios.map((u) => u.username)}
          value={corpo}
          aoMudar={setCorpo}
          placeholder="Escreva um comentario. Use @ para citar alguem."
        />
        {erro && <p className="text-[13px] text-cat-cancelado">{erro}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <Botao type="submit" variante="primario" disabled={enviando || corpo.trim() === ""}>
            {enviando ? "Enviando..." : "Comentar"}
          </Botao>

          {/* Diz quem VAI ser avisado, e nao apenas que da para citar. Uma
              citacao com o nome errado passa despercebida - e a pessoa fica
              esperando resposta de alguem que nunca soube da pergunta. */}
          {citados.length > 0 ? (
            <span className="text-[12px] text-tinta-media">
              avisa {citados.map((u) => `@${u}`).join(", ")}
            </span>
          ) : (
            <span className="text-[12px] text-tinta-fraca">
              Cite alguem com @ para avisar: {usuarios.map((u) => `@${u.username}`).join(", ")}
            </span>
          )}

          {errados.length > 0 && (
            <span className="text-[12px] text-prio-alta">
              {errados.map((u) => `@${u}`).join(", ")} nao existe e nao sera avisado
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

