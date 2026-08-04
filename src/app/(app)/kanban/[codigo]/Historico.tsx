import { ROTULO_PRIORIDADE, type Prioridade, type TaskHistory } from "@/domain";
import { formatarDataHora } from "@/lib/datas";

/** Nomes dos campos como o usuario os conhece na tela, nao como colunas do banco. */
const ROTULO_CAMPO: Record<string, string> = {
  column_id: "Etapa",
  status_id: "Status",
  assignee_id: "Responsavel",
  type_id: "Tipo",
  prioridade: "Prioridade",
  prazo: "Prazo",
  client_id: "Cliente",
  iniciado_em: "Inicio",
  origem: "Origem",
};

export function Historico({
  registros,
  nomes,
}: {
  registros: (TaskHistory & { autor: string | null })[];
  nomes: Record<string, string>;
}) {
  if (registros.length === 0) {
    return <p className="py-1 text-[13px] text-tinta-fraca">Nada aconteceu ainda.</p>;
  }

  return (
    <ol className="grid gap-2">
      {registros.map((h) => (
        <li key={h.id} className="grid gap-0.5 border-l-2 border-linha pl-2.5">
          <span className="text-[13px]">
            <strong className="font-medium">{ROTULO_CAMPO[h.campo] ?? h.campo}</strong>
            {h.valorAntigo !== null && (
              <>
                {": "}
                <span className="text-tinta-fraca line-through">
                  {legivel(h.campo, h.valorAntigo, nomes)}
                </span>
                {" -> "}
              </>
            )}
            {h.valorAntigo === null && ": "}
            <span>{legivel(h.campo, h.valorNovo, nomes)}</span>
          </span>
          <span className="num text-[11px] text-tinta-fraca">
            {formatarDataHora(h.createdAt)}
            {h.autor && ` - ${h.autor}`}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** O historico guarda id cru; a leitura precisa do nome que estava na tela. */
function legivel(campo: string, valor: string | null, nomes: Record<string, string>): string {
  if (valor === null) return "vazio";
  if (campo === "prioridade") return ROTULO_PRIORIDADE[valor as Prioridade] ?? valor;
  if (campo === "iniciado_em") return formatarDataHora(valor);
  // Id de algo que foi apagado depois: melhor mostrar o id do que sumir com a linha.
  return nomes[valor] ?? valor;
}
