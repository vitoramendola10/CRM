import Link from "next/link";
import { notFound } from "next/navigation";
import { Anexos } from "@/components/anexos/Anexos";
import { Assumir } from "@/components/tickets/Assumir";
import { Escalar } from "@/components/tickets/Escalar";
import { HistoricoTicket } from "@/components/tickets/HistoricoTicket";
import { SituacaoRapida } from "@/components/tickets/SituacaoRapida";
import { FormTicket } from "@/components/tickets/FormTicket";
import { Timeline } from "@/components/tickets/Timeline";
import { Painel } from "@/components/ui/Painel";
import { Selo } from "@/components/ui/Selo";
import { listarBoards, listarTipos } from "@/db/queries/config";
import {
  buscarTicket,
  listarClientes,
  listarHistoricoTicket,
  listarMensagens,
} from "@/db/queries/tickets";
import { listarRespostas } from "@/db/queries/respostas";
import { listarUsuarios } from "@/db/queries/users";
import {
  COR_PRIORIDADE,
  COR_SITUACAO_TICKET,
  ROTULO_CANAL,
  ROTULO_PRIORIDADE,
  ROTULO_SITUACAO_TICKET,
} from "@/domain";
import { exigirSessao } from "@/lib/auth";
import { formatarDataHora } from "@/lib/datas";
import { anexosDoTicket } from "@/services/anexo";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();

  const ticket = await buscarTicket(n);
  if (!ticket) notFound();

  const [mensagens, clientes, usuarios, boards, tipos, anexos, historico, eu, respostas] =
    await Promise.all([
      listarMensagens(ticket.id),
      listarClientes(),
      listarUsuarios(true),
      listarBoards(),
      listarTipos(true),
      anexosDoTicket(ticket.id),
      listarHistoricoTicket(ticket.id),
      exigirSessao(),
      listarRespostas(true),
    ]);

  const boardsDev = boards.filter((b) => b.tipo === "dev" && b.ativo);

  return (
    <main className="mx-auto max-w-5xl px-6 py-7">
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
            <h1 className="titulo-pagina">{ticket.assunto}</h1>
            <p className="num mt-0.5 text-[11px] text-tinta-fraca">
              Aberto em {formatarDataHora(ticket.abertoEm)}
              {ticket.atendente ? ` - ${ticket.atendente}` : " - sem atendente"}
              {ticket.fechadoEm && ` - fechado em ${formatarDataHora(ticket.fechadoEm)}`}
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
                usuarios={usuarios}
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

        {/* A acao mais frequente da tela fica na primeira dobra, e nao no fundo
            de um formulario de oito campos. */}
        <div className="mt-3 flex flex-wrap items-start gap-x-3 gap-y-2">
          <SituacaoRapida ticketId={ticket.id} situacao={ticket.situacao} />
          <Assumir
            ticketId={ticket.id}
            atendenteId={ticket.atendenteId}
            euId={eu.id}
            tamanho="normal"
          />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="grid gap-4">
          <Painel titulo="Atendimento" variante="principal">
            <FormTicket ticket={ticket} clientes={clientes} usuarios={usuarios} />
          </Painel>

          <Painel titulo="Anexos" contagem={anexos.length}>
            <Anexos
              destino={{ ticketId: ticket.id }}
              iniciais={anexos}
              euId={eu.id}
              papel={eu.papel}
            />
          </Painel>
        </div>

        <div className="grid gap-4">
          <Painel titulo="Registro" contagem={mensagens.length}>
            <Timeline
              ticketId={ticket.id}
              situacao={ticket.situacao}
              mensagens={mensagens}
              respostas={respostas}
              usuarios={usuarios}
              contexto={{
                protocolo: ticket.id,
                assunto: ticket.assunto,
                cliente: ticket.cliente,
                solicitante: ticket.solicitante,
                atendente: eu.nome,
              }}
            />
          </Painel>

          <Painel titulo="O que mudou" contagem={historico.length}>
            <HistoricoTicket registros={historico} />
          </Painel>
        </div>
      </div>
    </main>
  );
}
