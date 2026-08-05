import Link from "next/link";
import { notFound } from "next/navigation";
import { Anexos } from "@/components/anexos/Anexos";
import { AssumirTask } from "@/components/kanban/AssumirTask";
import { Painel } from "@/components/ui/Painel";
import { Selo } from "@/components/ui/Selo";
import { buscarColuna, listarStatus, listarTipos } from "@/db/queries/config";
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
import { anexosDaTask } from "@/services/anexo";
import { Comentarios } from "./Comentarios";
import { FormTask } from "./FormTask";
import { Historico } from "./Historico";
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
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-5">
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

        <h1 className="text-[17px] font-semibold leading-snug tracking-tight">{task.titulo}</h1>
        <p className="num mt-0.5 text-[11px] text-tinta-fraca">
          Criada em {formatarDataHora(task.createdAt)}
          {task.iniciadoEm && ` - iniciada em ${formatarDataHora(task.iniciadoEm)}`}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="grid gap-4">
          <Painel titulo="Rotina">
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

          <Painel titulo="Anexos" contagem={anexos.length}>
            <Anexos
              destino={{ taskId: task.id }}
              iniciais={anexos}
              euId={eu.id}
              papel={eu.papel}
            />
          </Painel>

          <Painel titulo="Comentarios" contagem={comentarios.length}>
            <Comentarios taskId={task.id} comentarios={comentarios} />
          </Painel>
        </div>

        <Painel titulo="Historico" contagem={historico.length}>
          <Historico registros={historico} nomes={nomes} />
        </Painel>
      </div>
    </main>
  );
}
