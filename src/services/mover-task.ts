import { db, type Tx } from "@/db/client";
import { listarColunas, statusPorCategoria } from "@/db/queries/config";
import {
  gravarRank,
  moverTaskNaColuna,
  ranksDaColuna,
  ranksDeVizinhos,
  registrarHistorico,
  travarTask,
} from "@/db/queries/tasks";
import {
  devolverAoSuporte,
  emailDoAtendente,
  registrarHistoricoTicket,
} from "@/db/queries/tickets";
import {
  ROTULO_SITUACAO_TICKET,
  categoriaDaColuna,
  type MoverTaskInput,
  type UsuarioSessao,
} from "@/domain";
import { agoraMysql } from "@/lib/datas";
import { RANK_INICIAL, rankEntre, ranksDistribuidos } from "@/lib/rank";
import { ErroDeNegocio } from "@/lib/rota";
import { enfileirarEvento } from "./notificacoes";

/**
 * Arrastar um card. Tudo numa transacao porque mover pode disparar tres efeitos
 * de uma vez: mudar status, devolver o chamado ao suporte e enfileirar e-mail.
 * Se qualquer um falhar, nada acontece.
 */
export async function moverTask(dados: MoverTaskInput, usuario: UsuarioSessao): Promise<void> {
  await db.transaction(async (tx) => {
    const task = await travarTask(tx, dados.taskId);
    if (!task) throw new ErroDeNegocio("Esta rotina nao existe mais.", 404);

    const colunas = await listarColunas(task.boardId);
    const destino = colunas.find((c) => c.id === dados.columnId);
    if (!destino) throw new ErroDeNegocio("Etapa de destino invalida.", 400);

    const mudouDeColuna = task.columnId !== destino.id;
    const alteracoes: Parameters<typeof moverTaskNaColuna>[2] = {
      columnId: destino.id,
      rank: await calcularRank(tx, dados),
    };
    const historico: Parameters<typeof registrarHistorico>[1] = [];

    if (mudouDeColuna) {
      historico.push({
        taskId: task.id,
        userId: usuario.id,
        campo: "column_id",
        valorAntigo: task.columnId,
        valorNovo: destino.id,
      });
    }

    const categoria = categoriaDaColuna(destino, colunas);

    // Cycle time comeca aqui e nunca mais e reescrito: voltar o card para tras
    // e depois avancar de novo nao pode zerar o relogio.
    if (categoria === "andamento" && task.iniciadoEm === null) {
      const agora = agoraMysql();
      alteracoes.iniciadoEm = agora;
      historico.push({
        taskId: task.id,
        userId: usuario.id,
        campo: "iniciado_em",
        valorAntigo: null,
        valorNovo: agora,
      });
    }

    if (destino.isDone && mudouDeColuna) {
      const concluido = await statusPorCategoria("concluido");
      if (!concluido) {
        throw new ErroDeNegocio(
          "Nao ha status ativo da categoria Concluido. Cadastre um em Configuracao > Status.",
        );
      }
      alteracoes.statusId = concluido.id;
      historico.push({
        taskId: task.id,
        userId: usuario.id,
        campo: "status_id",
        valorAntigo: task.statusId,
        valorNovo: concluido.id,
      });

      if (task.ticketId !== null) {
        // So devolve o que ainda estava esperando o dev. O chamado que o
        // atendente ja tinha encerrado fica como esta - reabri-lo sozinho aqui
        // surpreenderia quem dava o assunto por resolvido.
        const devolvido = await devolverAoSuporte(tx, task.ticketId);
        if (devolvido) {
          // Do lado do chamado, isto aparece como uma mudanca de situacao que
          // ninguem fez a mao. Sem a linha no historico, some a explicacao.
          await registrarHistoricoTicket(tx, task.ticketId, usuario.id, [
            {
              campo: "situacao",
              valorAntigo: ROTULO_SITUACAO_TICKET.aguardando_dev,
              valorNovo: ROTULO_SITUACAO_TICKET.em_atendimento,
            },
            {
              campo: "dev_entregue",
              valorAntigo: null,
              valorNovo: `DEV-${task.codigo} em ${destino.nome}`,
            },
          ]);
        }

        await enfileirarEvento(tx, {
          evento: "task_concluida",
          boardId: task.boardId,
          taskId: task.id,
          ticketId: task.ticketId,
          emailResponsavel: await emailDoAtendente(tx, task.ticketId),
          contexto: {
            codigo: task.codigo,
            titulo: task.titulo,
            protocolo: task.ticketId,
            etapa: destino.nome,
            responsavel: usuario.nome,
          },
        });
      }
    }

    await moverTaskNaColuna(tx, task.id, alteracoes);
    await registrarHistorico(tx, historico);
  });
}

/**
 * Um UPDATE, sem tocar nos vizinhos. Se o intervalo entre os dois cards ficou
 * sem espaco (so acontece depois de ~315 largadas no mesmo ponto), reindexa a
 * coluna e tenta de novo - o usuario nunca ve o erro.
 */
async function calcularRank(tx: Tx, dados: MoverTaskInput): Promise<string> {
  const { antes, depois } = await ranksDeVizinhos(tx, dados);
  if (antes === null && depois === null) return RANK_INICIAL;

  try {
    return rankEntre(antes, depois);
  } catch {
    await reindexarColuna(tx, dados.columnId);
    const novos = await ranksDeVizinhos(tx, dados);
    return rankEntre(novos.antes, novos.depois);
  }
}

/** Redistribui os ranks da coluna mantendo exatamente a ordem visual atual. */
async function reindexarColuna(tx: Tx, columnId: string): Promise<void> {
  const atuais = await ranksDaColuna(tx, columnId);
  const novos = ranksDistribuidos(atuais.length);
  for (const [i, linha] of atuais.entries()) {
    await gravarRank(tx, linha.id, novos[i]!);
  }
}
