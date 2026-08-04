"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Selo } from "@/components/ui/Selo";
import type { Etiqueta } from "@/domain";
import { chamar } from "@/lib/api";

/**
 * Salva a cada clique, sem botao: sao dados de marcacao, nao um formulario.
 * Otimista, porque o custo de errar e uma etiqueta piscando de volta.
 */
export function SeletorEtiquetas({
  taskId,
  disponiveis,
  atuais,
}: {
  taskId: string;
  disponiveis: Etiqueta[];
  atuais: Etiqueta[];
}) {
  const router = useRouter();
  const [marcadas, setMarcadas] = useState<string[]>(atuais.map((e) => e.id));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function alternar(id: string) {
    const anterior = marcadas;
    const nova = marcadas.includes(id) ? marcadas.filter((x) => x !== id) : [...marcadas, id];

    setMarcadas(nova);
    setSalvando(true);
    setErro(null);

    const r = await chamar(`/api/tasks/${taskId}/etiquetas`, "PUT", { etiquetaIds: nova });
    setSalvando(false);

    if (!r.ok) {
      setMarcadas(anterior);
      setErro(r.erro);
      return;
    }
    router.refresh();
  }

  if (disponiveis.length === 0) {
    return (
      <p className="text-[12px] text-tinta-fraca">
        Nenhuma etiqueta cadastrada. Crie em Configuracao &gt; Etiquetas.
      </p>
    );
  }

  return (
    <div className="grid gap-1.5">
      <span className="flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-tinta-fraca">
        Etiquetas
        {salvando && <span className="font-normal normal-case tracking-normal">salvando...</span>}
      </span>

      <div className="flex flex-wrap gap-1.5">
        {disponiveis.map((e) => {
          const ativa = marcadas.includes(e.id);
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => void alternar(e.id)}
              aria-pressed={ativa}
              className={`transicao rounded-xs ${ativa ? "" : "opacity-40 hover:opacity-75"}`}
            >
              <Selo texto={e.nome} cor={e.cor} />
            </button>
          );
        })}
      </div>

      {erro && <p className="text-[12px] text-cat-cancelado">{erro}</p>}
    </div>
  );
}
