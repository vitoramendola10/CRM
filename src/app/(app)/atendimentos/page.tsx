import Link from "next/link";
import { FiltroSituacao } from "@/components/tickets/FiltroSituacao";
import { NovoTicket } from "@/components/tickets/NovoTicket";
import { Cabecalho, Vazio } from "@/components/ui/Cabecalho";
import { Selo } from "@/components/ui/Selo";
import { contarPorSituacao, listarClientes, listarTickets } from "@/db/queries/tickets";
import {
  COR_PRIORIDADE,
  COR_SITUACAO_TICKET,
  ROTULO_PRIORIDADE,
  ROTULO_SITUACAO_TICKET,
  SITUACOES_TICKET,
  filtroTicketsSchema,
  type SituacaoTicket,
} from "@/domain";
import { formatarDataHora } from "@/lib/datas";

export const dynamic = "force-dynamic";

export default async function AtendimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ situacao?: string }>;
}) {
  const { situacao } = await searchParams;
  // Valor da URL nao e confiavel: so entra no filtro se for uma situacao real.
  const valida = SITUACOES_TICKET.includes(situacao as SituacaoTicket)
    ? (situacao as SituacaoTicket)
    : null;

  const filtro = filtroTicketsSchema.parse({
    situacao: valida,
    clientId: null,
    atendenteId: null,
    busca: "",
  });

  const [tickets, contagem, clientes] = await Promise.all([
    listarTickets(filtro),
    contarPorSituacao(),
    listarClientes(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-5">
      <Cabecalho titulo="Atendimentos" descricao="O que o suporte registrou.">
        <NovoTicket clientes={clientes} />
      </Cabecalho>

      <FiltroSituacao contagem={contagem} />

      {tickets.length === 0 ? (
        <Vazio
          titulo={valida ? "Nenhum chamado nesta situacao." : "Nenhum chamado registrado ainda."}
          detalhe={valida ? undefined : "Abra o primeiro em Novo atendimento."}
        />
      ) : (
        <ul className="grid gap-1">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={`/atendimentos/${t.id}`}
                className="transicao flex items-center gap-3 rounded-sm border border-linha bg-papel-alto py-2 pl-3 pr-2.5 hover:border-linha-forte hover:shadow-hover"
              >
                <span
                  aria-hidden
                  title={ROTULO_PRIORIDADE[t.prioridade]}
                  className="h-8 w-[3px] shrink-0 rounded-full"
                  style={{ backgroundColor: COR_PRIORIDADE[t.prioridade] }}
                />
                <span className="num w-14 shrink-0 text-[12px] text-tinta-fraca">#{t.id}</span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{t.assunto}</span>
                  <span className="block truncate text-[12px] text-tinta-fraca">
                    {t.cliente ?? "sem cliente"}
                    {t.solicitante && ` - ${t.solicitante}`}
                  </span>
                </span>

                {t.codigoTask !== null && (
                  <span className="num hidden shrink-0 text-[11px] text-acento sm:block">
                    DEV-{t.codigoTask}
                  </span>
                )}

                <Selo
                  texto={ROTULO_SITUACAO_TICKET[t.situacao]}
                  cor={COR_SITUACAO_TICKET[t.situacao]}
                />

                <span className="num hidden w-32 shrink-0 text-right text-[11px] text-tinta-fraca md:block">
                  {formatarDataHora(t.abertoEm)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
