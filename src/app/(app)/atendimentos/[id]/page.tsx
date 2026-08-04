import Link from "next/link";
import { notFound } from "next/navigation";
import { Escalar } from "@/components/tickets/Escalar";
import { FormTicket } from "@/components/tickets/FormTicket";
import { Timeline } from "@/components/tickets/Timeline";
import { Painel } from "@/components/ui/Painel";
import { Selo } from "@/components/ui/Selo";
import { listarBoards, listarTipos } from "@/db/queries/config";
import { buscarTicket, listarClientes, listarMensagens } from "@/db/queries/tickets";
import { listarUsuarios } from "@/db/queries/users";
import {
  COR_PRIORIDADE,
  COR_SITUACAO_TICKET,
  ROTULO_CANAL,
  ROTULO_PRIORIDADE,
  ROTULO_SITUACAO_TICKET,
} from "@/domain";
import { formatarDataHora } from "@/lib/datas";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();

  const ticket = await buscarTicket(n);
  if (!ticket) notFound();

  const [mensagens, clientes, usuarios, boards, tipos] = await Promise.all([
    listarMensagens(ticket.id),
    listarClientes(),
    listarUsuarios(true),
    listarBoards(),
    listarTipos(true),
  ]);

  const boardsDev = boards.filter((b) => b.tipo === "dev" && b.ativo);

  return (
    <main className="mx-auto max-w-5xl px-4 py-5">
      <header className="mb-4 border-b border-linha-forte pb-3">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Link href="/atendimentos" className="text-[12px] text-tinta-fraca hover:text-acento">
            Atendimentos
          </Link>
          <span className="text-tinta-fraca">/</span>
          <span className="num text-[12px] text-tinta-fraca">#{ticket.id}</span>

          <Selo
            texto={ROTULO_SITUACAO_TICKET[ticket.situacao]}
            cor={COR_SITUACAO_TICKET[ticket.situacao]}
          />
          <Selo
            texto={ROTULO_PRIORIDADE[ticket.prioridade]}
            cor={COR_PRIORIDADE[ticket.prioridade]}
          />
          <span className="text-[12px] text-tinta-fraca">{ROTULO_CANAL[ticket.canal]}</span>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[17px] font-semibold leading-snug tracking-tight">
              {ticket.assunto}
            </h1>
            <p className="num mt-0.5 text-[11px] text-tinta-fraca">
              Aberto em {formatarDataHora(ticket.abertoEm)}
              {ticket.atendente && ` - ${ticket.atendente}`}
            </p>
          </div>

          {ticket.taskId === null ? (
            boardsDev.length > 0 && (
              <Escalar
                ticketId={ticket.id}
                assunto={ticket.assunto}
                descricao={ticket.descricao}
                prioridade={ticket.prioridade}
                boards={boardsDev}
                tipos={tipos}
              />
            )
          ) : (
            <Link
              href={`/kanban/${ticket.codigoTask}`}
              className="transicao inline-flex h-8 items-center rounded-sm border border-linha-forte bg-papel-alto px-3 text-[13px] hover:bg-papel-baixo"
            >
              Ver rotina <span className="num ml-1.5">DEV-{ticket.codigoTask}</span>
            </Link>
          )}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Painel titulo="Atendimento">
          <FormTicket ticket={ticket} clientes={clientes} usuarios={usuarios} />
        </Painel>

        <Painel titulo="Registro" contagem={mensagens.length}>
          <Timeline ticketId={ticket.id} mensagens={mensagens} />
        </Painel>
      </div>
    </main>
  );
}
