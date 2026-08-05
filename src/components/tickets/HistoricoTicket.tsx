import { formatarDataHora } from "@/lib/datas";

/**
 * O que mudou no chamado, quem mudou e quando - separado da timeline de
 * proposito: a mensagem conta o que foi CONVERSADO, isto conta o que foi
 * DECIDIDO. Misturar as duas faz a decisao se perder no meio do relato.
 */

export interface LinhaDeHistorico {
  id: number;
  campo: string;
  valorAntigo: string | null;
  valorNovo: string | null;
  autor: string | null;
  createdAt: string;
}

/** O campo cru vira frase. O que nao estiver aqui aparece pelo proprio nome. */
const ROTULO: Record<string, string> = {
  situacao: "Situacao",
  prioridade: "Prioridade",
  atendente: "Atendente",
  assunto: "Assunto",
  reaberto: "Reaberto",
  dev_entregue: "Desenvolvimento entregue",
};

/** Os que merecem destaque: sao os que explicam a qualidade do atendimento. */
const NOTAVEIS = new Set(["reaberto", "dev_entregue"]);

export function HistoricoTicket({ registros }: { registros: LinhaDeHistorico[] }) {
  if (registros.length === 0) {
    return (
      <p className="text-[13px] text-tinta-fraca">
        Nada mudou ainda. Situacao, prioridade e atendente aparecem aqui quando alguem mexer.
      </p>
    );
  }

  return (
    <ol className="grid gap-1.5">
      {registros.map((r) => {
        const notavel = NOTAVEIS.has(r.campo);
        return (
          <li key={r.id} className="text-[12px] leading-snug">
            <p className={notavel ? "font-medium text-prio-alta" : ""}>
              {ROTULO[r.campo] ?? r.campo}
              {r.campo === "reaberto" ? (
                <span className="font-normal text-tinta-media"> depois de {r.valorAntigo}</span>
              ) : (
                <span className="font-normal text-tinta-media">
                  {r.valorAntigo !== null && `: ${r.valorAntigo} `}
                  {r.valorAntigo !== null ? "→ " : ": "}
                  {r.valorNovo ?? "vazio"}
                </span>
              )}
            </p>
            <p className="num text-[11px] text-tinta-fraca">
              {r.autor ?? "Usuario removido"} - {formatarDataHora(r.createdAt)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
