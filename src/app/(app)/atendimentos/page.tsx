import Link from "next/link";
import { Assumir } from "@/components/tickets/Assumir";
import { BuscaChamados } from "@/components/tickets/BuscaChamados";
import { FiltroSituacao } from "@/components/tickets/FiltroSituacao";
import { NovoTicket } from "@/components/tickets/NovoTicket";
import { SituacaoRapida } from "@/components/tickets/SituacaoRapida";
import { Cabecalho, Vazio } from "@/components/ui/Cabecalho";
import { contarPorSituacao, listarClientes, listarTickets } from "@/db/queries/tickets";
import { listarUsuarios } from "@/db/queries/users";
import {
  COR_PRIORIDADE,
  DIAS_CHAMADO_PARADO,
  ROTULO_PRIORIDADE,
  SITUACOES_TICKET,
  filtroTicketsSchema,
  situacaoEhFechada,
  type SituacaoTicket,
} from "@/domain";
import { exigirSessao } from "@/lib/auth";
import { diasCorridos, formatarData, formatarDataHora, humanizarDias } from "@/lib/datas";
import { paginaDaUrl } from "@/lib/paginacao";
import { Paginacao } from "@/components/ui/Paginacao";

export const dynamic = "force-dynamic";

export default async function AtendimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ situacao?: string; busca?: string; pagina?: string }>;
}) {
  const { situacao, busca, pagina } = await searchParams;
  // Valor da URL nao e confiavel: so entra no filtro se for uma situacao real.
  const valida = SITUACOES_TICKET.includes(situacao as SituacaoTicket)
    ? (situacao as SituacaoTicket)
    : null;
  // Pelo mesmo motivo, o termo e cortado no teto do schema: uma URL editada na mao
  // com 5 mil caracteres derrubaria o parse em vez de simplesmente nao achar nada.
  const termo = (busca ?? "").trim().slice(0, 120);

  const filtro = filtroTicketsSchema.parse({
    situacao: valida,
    clientId: null,
    atendenteId: null,
    busca: termo,
  });

  const [lista, contagem, clientes, eu, usuarios] = await Promise.all([
    listarTickets(filtro, paginaDaUrl(pagina)),
    contarPorSituacao(),
    listarClientes(),
    exigirSessao(),
    listarUsuarios(true),
  ]);
  const tickets = lista.itens;

  return (
    <main className="mx-auto max-w-6xl px-6 py-7">
      <Cabecalho titulo="Atendimentos" descricao="O que o suporte registrou.">
        <NovoTicket clientes={clientes} usuarios={usuarios} />
      </Cabecalho>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <FiltroSituacao contagem={contagem} />
        <BuscaChamados />
      </div>

      {tickets.length === 0 ? (
        <Vazio
          titulo={
            filtro.busca !== null
              ? `Nenhum chamado encontrado para "${filtro.busca}".`
              : valida
                ? "Nenhum chamado nesta situacao."
                : "Nenhum chamado registrado ainda."
          }
          detalhe={
            filtro.busca !== null
              ? valida
                ? "Talvez esteja em outra situacao: veja em Todos."
                : undefined
              : valida
                ? undefined
                : "Abra o primeiro em Novo atendimento."
          }
        />
      ) : (
        <ul className="grid gap-1">
          {tickets.map((t) => {
            // Chamado encerrado nao fica "parado": ele acabou.
            const parado = situacaoEhFechada(t.situacao)
              ? null
              : diasCorridos(t.ultimaAtividade);
            const esquecido = parado !== null && parado > DIAS_CHAMADO_PARADO;

            return (
              /*
                O link cobre a linha inteira como camada invisivel, e os
                controles ficam ACIMA dele. A versao anterior reservava uma
                largura fixa dentro do <a> para os controles absolutos caberem -
                e quando o botao "Assumir" aparecia (so em chamado que nao e
                seu) ele passava por cima da coluna de "parado ha N dias".
                Assim nao ha largura magica para acertar.
              */
              <li
                key={t.id}
                className={`transicao relative flex items-center gap-3 rounded-sm border bg-papel-alto py-2 pl-3 pr-2.5 hover:shadow-hover ${
                  esquecido
                    ? "border-prio-alta/45 hover:border-prio-alta"
                    : "border-linha hover:border-linha-forte"
                }`}
              >
                <Link
                  href={`/atendimentos/${t.id}`}
                  aria-label={`Chamado ${t.id}: ${t.assunto}`}
                  className="absolute inset-0 rounded-sm"
                />

                {/* `pointer-events-none` para o clique atravessar ate o link. */}
                <div className="pointer-events-none flex min-w-0 flex-1 items-center gap-3">
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
                      {t.atendente ? ` - ${t.atendente}` : " - sem atendente"}
                    </span>
                  </span>

                  {t.codigoTask !== null && (
                    <span className="num hidden shrink-0 text-[11px] text-acento sm:block">
                      DEV-{t.codigoTask}
                    </span>
                  )}

                  {/* O que separa "aberto ha 9 dias e andando" de "esquecido". */}
                  <span
                    title={`Ultimo movimento em ${formatarDataHora(t.ultimaAtividade)}`}
                    className={`num hidden w-24 shrink-0 text-right text-[11px] md:block ${
                      esquecido ? "font-medium text-prio-alta" : "text-tinta-fraca"
                    }`}
                  >
                    {parado === null
                      ? formatarData(t.fechadoEm)
                      : `parado ${humanizarDias(parado)}`}
                  </span>
                </div>

                {/* Acima do link, e por isso clicaveis. Botao dentro de <a> e
                    HTML invalido; aqui eles sao irmaos, nao filhos. */}
                <span className="relative flex shrink-0 items-center gap-1.5">
                  <Assumir ticketId={t.id} atendenteId={t.atendenteId} euId={eu.id} />
                  <SituacaoRapida ticketId={t.id} situacao={t.situacao} formato="select" />
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {tickets.length > 0 && (
        <Paginacao
          pagina={lista.pagina}
          paginas={lista.paginas}
          total={lista.total}
          substantivo="chamado"
        />
      )}
    </main>
  );
}
