import Link from "next/link";
import { notFound } from "next/navigation";
import { Anexos } from "@/components/anexos/Anexos";
import { AssumirTask } from "@/components/kanban/AssumirTask";
import { dependenciasDe, dependentesDe } from "@/db/queries/dependencias";
import { apontamentosDaTask } from "@/db/queries/worklog";
import { Painel } from "@/components/ui/Painel";
import { Recolhivel } from "@/components/ui/Recolhivel";
import { Selo } from "@/components/ui/Selo";
import { buscarColuna, listarColunas, listarStatus, listarTipos } from "@/db/queries/config";
import {
  buscarTaskPorCodigo,
  dicionarioDeNomes,
  listarComentarios,
  listarHistorico,
} from "@/db/queries/tasks";
import { etiquetasDaTask, listarEtiquetas } from "@/db/queries/etiquetas";
import { listarClientes } from "@/db/queries/tickets";
import { listarUsuarios } from "@/db/queries/users";
import { COR_PRIORIDADE, ROTULO_PRIORIDADE } from "@/domain";
import { exigirSessao } from "@/lib/auth";
import { formatarDataHora } from "@/lib/datas";
import { formatarMinutos } from "@/lib/horas";
import { anexosDaTask } from "@/services/anexo";
import { Comentarios } from "./Comentarios";
import { Dependencias } from "./Dependencias";
import { EtapaRapida } from "./EtapaRapida";
import { FormTask } from "./FormTask";
import { Historico } from "./Historico";
import { Horas } from "./Horas";
import { SeletorEtiquetas } from "./SeletorEtiquetas";

export const dynamic = "force-dynamic";

export default async function TaskPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const n = Number(codigo);
  if (!Number.isInteger(n) || n <= 0) notFound();

  const task = await buscarTaskPorCodigo(n);
  if (!task) notFound();

  const [
    status,
    tipos,
    usuarios,
    clientes,
    comentarios,
    historico,
    nomes,
    coluna,
    etiquetas,
    minhasEtiquetas,
    anexos,
    eu,
    dependeDe,
    bloqueia,
    apontamentos,
    colunas,
  ] = await Promise.all([
    listarStatus(true),
    listarTipos(true),
    listarUsuarios(true),
    listarClientes(),
    listarComentarios(task.id),
    listarHistorico(task.id),
    dicionarioDeNomes(),
    buscarColuna(task.columnId),
    listarEtiquetas(true),
    etiquetasDaTask(task.id),
    // Traz junto os anexos do chamado de origem, se a rotina veio de um.
    anexosDaTask(task.id, task.ticketId),
    exigirSessao(),
    dependenciasDe(task.id),
    dependentesDe(task.id),
    apontamentosDaTask(task.id),
    listarColunas(task.boardId),
  ]);

  const statusAtual = status.find((s) => s.id === task.statusId);
  const statusConcluido = statusAtual?.categoria === "concluido";
  const etapaFinal = colunas.find((c) => c.isDone);

  const minutosApontados = apontamentos.reduce((n, a) => n + a.minutos, 0);
  const dependenciasAbertas = dependeDe.filter((d) => !d.concluida).length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-7">
      <header className="mb-4 border-b border-linha-forte pb-3">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Link href="/kanban" className="text-[12px] text-tinta-fraca hover:text-acento">
            Kanban
          </Link>
          <span className="text-tinta-fraca">/</span>
          <span className="num text-[12px] text-tinta-fraca">DEV-{task.codigo}</span>

          {coluna && <Selo texto={coluna.nome} cor={coluna.cor} />}
          <Selo
            texto={ROTULO_PRIORIDADE[task.prioridade]}
            cor={COR_PRIORIDADE[task.prioridade]}
          />

          {task.assigneeId === null && (
            <span className="flex items-center gap-1.5 text-[12px] text-tinta-fraca">
              sem responsavel
              <AssumirTask taskId={task.id} />
            </span>
          )}

          {task.ticketId !== null && (
            <Link
              href={`/atendimentos/${task.ticketId}`}
              className="num ml-auto text-[12px] text-acento hover:underline"
            >
              Chamado #{task.ticketId}
            </Link>
          )}
        </div>

        <h1 className="titulo-pagina">{task.titulo}</h1>
        <p className="num mt-0.5 text-[11px] text-tinta-fraca">
          Criada em {formatarDataHora(task.createdAt)}
          {task.iniciadoEm && ` - iniciada em ${formatarDataHora(task.iniciadoEm)}`}
        </p>

        {/* A acao mais frequente do dev, na primeira dobra. */}
        <div className="mt-3">
          <EtapaRapida taskId={task.id} colunaAtual={task.columnId} colunas={colunas} />
        </div>

        {/*
          Status e etapa sao duas coisas parecidas, e so a ETAPA conclui. Quem
          marca o status "Concluido" e vai embora deixa o card parado no meio do
          board e o chamado de origem preso em "aguardando dev" para sempre -
          sem nenhuma tela dizendo por que. Este aviso e essa tela.
        */}
        {statusConcluido && coluna && !coluna.isDone && (
          <p className="mt-2 rounded-sm border border-prio-alta/40 bg-prio-alta/8 px-3 py-2 text-[13px]">
            O status desta rotina e <strong className="font-medium">{statusAtual?.nome}</strong>,
            mas ela ainda esta em <strong className="font-medium">{coluna.nome}</strong>. Quem
            conclui e a etapa, nao o status: enquanto ela nao chegar em{" "}
            <strong className="font-medium">{etapaFinal?.nome ?? "a etapa final"}</strong>
            {task.ticketId !== null && ", o chamado de origem continua esperando"}.
          </p>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="grid gap-4">
          <Painel titulo="Rotina" variante="principal">
            <div className="mb-3 border-b border-linha pb-3">
              <SeletorEtiquetas
                taskId={task.id}
                disponiveis={etiquetas}
                atuais={minhasEtiquetas}
              />
            </div>
            <FormTask
              task={task}
              status={status}
              tipos={tipos}
              usuarios={usuarios}
              clientes={clientes}
            />
          </Painel>

          {/*
            Recolhidos e lado a lado: sao tres painéis que na maioria das
            rotinas estao vazios, e empilhados abertos empurravam os
            comentarios - que sao lidos sempre - para fora da tela. O resumo no
            cabecalho responde a pergunta sem precisar abrir.
          */}
          <div className="grid gap-2 sm:grid-cols-2">
            <Recolhivel
              titulo="Dependencias"
              destaque={dependenciasAbertas > 0}
              aberto={dependenciasAbertas > 0}
              resumo={
                dependenciasAbertas > 0
                  ? `travada por ${dependenciasAbertas}`
                  : dependeDe.length + bloqueia.length > 0
                    ? `${dependeDe.length + bloqueia.length} vinculo(s)`
                    : "nenhuma"
              }
            >
              <Dependencias taskId={task.id} dependeDe={dependeDe} bloqueia={bloqueia} />
            </Recolhivel>

            <Recolhivel
              titulo="Horas"
              resumo={
                minutosApontados === 0 && task.estimativaH === null
                  ? "nada apontado"
                  : `${formatarMinutos(minutosApontados)}${
                      task.estimativaH === null
                        ? ""
                        : ` de ${formatarMinutos(Math.round(task.estimativaH * 60))}`
                    }`
              }
            >
              <Horas
                taskId={task.id}
                estimativaH={task.estimativaH}
                apontamentos={apontamentos}
                euId={eu.id}
              />
            </Recolhivel>

            <Recolhivel
              titulo="Anexos"
              resumo={anexos.length === 0 ? "nenhum" : `${anexos.length} arquivo(s)`}
              aberto={anexos.length > 0}
            >
              <Anexos
                destino={{ taskId: task.id }}
                iniciais={anexos}
                euId={eu.id}
                papel={eu.papel}
              />
            </Recolhivel>
          </div>

          <Painel titulo="Comentarios" contagem={comentarios.length}>
            <Comentarios taskId={task.id} comentarios={comentarios} usuarios={usuarios} />
          </Painel>
        </div>

        <Painel titulo="Historico" contagem={historico.length}>
          <Historico registros={historico} nomes={nomes} />
        </Painel>
      </div>
    </main>
  );
}
