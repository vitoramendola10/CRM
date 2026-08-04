import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Cabecalho, Vazio } from "@/components/ui/Cabecalho";
import { Painel } from "@/components/ui/Painel";
import { boardPadrao } from "@/db/queries/config";
import {
  backlogPorCliente,
  chamadosAguardandoDev,
  nomesDeColunas,
  resumo,
} from "@/db/queries/dashboard";
import { COR_PRIORIDADE, DIAS_CARD_ENVELHECIDO, ROTULO_PRIORIDADE } from "@/domain";
import { diasCorridos, formatarData, humanizarDias } from "@/lib/datas";
import { leadTimePorColuna } from "@/services/relatorio";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const board = await boardPadrao();
  if (!board) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-5">
        <Cabecalho titulo="Dashboard" />
        <Vazio titulo="Nenhum board cadastrado." detalhe="Rode o seed com npm run db:seed." />
      </main>
    );
  }

  const [r, leadTime, backlog, aguardando] = await Promise.all([
    resumo(board.id),
    leadTimePorColuna(board.id),
    backlogPorCliente(board.id),
    chamadosAguardandoDev(),
  ]);

  const colunas = await nomesDeColunas(leadTime.map((l) => l.columnId));
  const piorLead = Math.max(1, ...leadTime.map((l) => l.medianaDias));

  return (
    <main className="mx-auto max-w-6xl px-4 py-5">
      <Cabecalho titulo="Dashboard" descricao={`Board ${board.nome}.`} />

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        <Indicador rotulo="Na fila" valor={r.emAberto} />
        <Indicador rotulo="Em andamento" valor={r.emAndamento} />
        <Indicador rotulo="Entregues (30 dias)" valor={r.concluidasNoMes} />
        <Indicador rotulo="Sem responsavel" valor={r.semResponsavel} alerta={r.semResponsavel > 0} />
        <Indicador
          rotulo="Cycle time medio"
          valor={r.cycleTimeMedioDias === null ? "--" : `${r.cycleTimeMedioDias.toFixed(1)}d`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Lead time por etapa" contagem={leadTime.length}>
          {leadTime.length === 0 ? (
            <p className="py-1 text-[13px] text-tinta-fraca">
              Ainda nao ha movimento suficiente para medir.
            </p>
          ) : (
            <ul className="grid gap-2">
              {leadTime.map((l) => {
                const col = colunas[l.columnId];
                return (
                  <li key={l.columnId} className="grid gap-1">
                    <div className="flex items-baseline gap-2">
                      <span className="flex-1 truncate text-[13px]">
                        {col?.nome ?? "Etapa removida"}
                      </span>
                      <span className="num text-[12px] font-medium">
                        {l.medianaDias.toFixed(1)}d
                      </span>
                      <span className="num w-24 text-right text-[11px] text-tinta-fraca">
                        {l.passagens} passagem{l.passagens === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-papel-baixo">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(2, (l.medianaDias / piorLead) * 100)}%`,
                          backgroundColor: col?.cor ?? "#8d8577",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-2 border-t border-linha pt-2 text-[11px] text-tinta-fraca">
            Mediana, nao media: um card esquecido distorce a media da etapa inteira.
          </p>
        </Painel>

        <Painel titulo="Backlog por cliente" contagem={backlog.length}>
          {backlog.length === 0 ? (
            <p className="py-1 text-[13px] text-tinta-fraca">Nada em aberto. Raro e bom.</p>
          ) : (
            <ul className="grid gap-1">
              {backlog.map((b) => {
                const dias = diasCorridos(b.maisAntigaEm) ?? 0;
                return (
                  <li
                    key={b.clientId ?? "sem-cliente"}
                    className="flex items-baseline gap-2 border-b border-linha py-1 last:border-0"
                  >
                    <span className="flex-1 truncate text-[13px]">{b.cliente}</span>
                    {b.urgentes > 0 && (
                      <span className="num text-[11px] text-prio-alta">{b.urgentes} urgente</span>
                    )}
                    <span
                      title={`Mais antiga aberta em ${formatarData(b.maisAntigaEm)}`}
                      className={`num text-[11px] ${dias > DIAS_CARD_ENVELHECIDO ? "text-prio-alta" : "text-tinta-fraca"}`}
                    >
                      {humanizarDias(dias)}
                    </span>
                    <span className="num w-8 text-right text-[13px] font-medium">{b.total}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Painel>
      </div>

      <div className="mt-4">
        <Painel titulo="Chamados aguardando o desenvolvimento" contagem={aguardando.length}>
          {aguardando.length === 0 ? (
            <p className="py-1 text-[13px] text-tinta-fraca">
              Nenhum chamado parado esperando o dev.
            </p>
          ) : (
            <ul className="grid gap-1">
              {aguardando.map((c) => {
                const dias = diasCorridos(c.abertoEm) ?? 0;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/atendimentos/${c.id}`}
                      className="transicao flex items-center gap-3 rounded-sm py-1.5 pl-2 pr-1 hover:bg-papel-baixo"
                    >
                      <span
                        aria-hidden
                        title={ROTULO_PRIORIDADE[c.prioridade]}
                        className="h-6 w-[3px] shrink-0 rounded-full"
                        style={{ backgroundColor: COR_PRIORIDADE[c.prioridade] }}
                      />
                      <span className="num w-12 shrink-0 text-[11px] text-tinta-fraca">#{c.id}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px]">{c.assunto}</span>
                      <span className="hidden w-40 shrink-0 truncate text-[12px] text-tinta-fraca sm:block">
                        {c.cliente ?? "sem cliente"}
                      </span>
                      <Avatar nome={c.responsavel} tamanho={20} />
                      {c.codigoTask !== null && (
                        <span className="num w-16 shrink-0 text-[11px] text-acento">
                          DEV-{c.codigoTask}
                        </span>
                      )}
                      <span
                        className={`num w-16 shrink-0 text-right text-[11px] ${
                          dias > DIAS_CARD_ENVELHECIDO
                            ? "font-medium text-prio-alta"
                            : "text-tinta-fraca"
                        }`}
                      >
                        {humanizarDias(dias)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Painel>
      </div>
    </main>
  );
}

function Indicador({
  rotulo,
  valor,
  alerta = false,
}: {
  rotulo: string;
  valor: number | string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-sm border border-linha bg-papel-alto px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.06em] text-tinta-fraca">{rotulo}</p>
      <p className={`num text-[20px] font-medium ${alerta ? "text-prio-alta" : ""}`}>{valor}</p>
    </div>
  );
}
