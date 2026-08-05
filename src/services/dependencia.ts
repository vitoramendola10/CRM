import { db } from "@/db/client";
import { desvincular, todasAsArestas, vincular } from "@/db/queries/dependencias";
import { buscarTask, buscarTaskPorCodigo, registrarHistorico } from "@/db/queries/tasks";
import type { UsuarioSessao } from "@/domain";
import { alcanca } from "@/lib/grafo";
import { ehDuplicata, ErroDeNegocio } from "@/lib/rota";

/**
 * Uma rotina passa a esperar outra.
 *
 * O que o banco garante sozinho: nao duplicar a aresta (chave composta) e nao
 * depender de si mesma (CHECK). O que ele NAO tem como ver e o ciclo mais
 * longo - A espera B, B espera C, C espera A - e um ciclo desses trava as tres
 * para sempre, sem nenhuma mensagem de erro que explique por que.
 */
export async function criarDependencia(
  taskId: string,
  codigoDependeDe: number,
  usuario: UsuarioSessao,
): Promise<void> {
  const task = await buscarTask(taskId);
  if (!task) throw new ErroDeNegocio("Esta rotina nao existe mais.", 404);

  // Pelo codigo (DEV-7) e nao pelo id: e o que a pessoa tem na frente dela.
  const alvo = await buscarTaskPorCodigo(codigoDependeDe);
  if (!alvo) throw new ErroDeNegocio(`Nao existe DEV-${codigoDependeDe}.`, 404);
  if (alvo.id === taskId) throw new ErroDeNegocio("Uma rotina nao depende dela mesma.");

  await db.transaction(async (tx) => {
    const arestas = await todasAsArestas(tx);
    if (alcanca(arestas, alvo.id, taskId)) {
      throw new ErroDeNegocio(
        `DEV-${codigoDependeDe} ja espera esta rotina, direta ou indiretamente. ` +
          "Fechar o circulo deixaria as duas travadas para sempre.",
      );
    }

    try {
      await vincular(tx, taskId, alvo.id);
    } catch (e) {
      if (ehDuplicata(e)) {
        throw new ErroDeNegocio(`Esta rotina ja depende de DEV-${codigoDependeDe}.`);
      }
      throw e;
    }

    await registrarHistorico(tx, [
      {
        taskId,
        userId: usuario.id,
        campo: "depende_de",
        valorAntigo: null,
        valorNovo: `DEV-${codigoDependeDe}`,
      },
    ]);
  });
}

export async function removerDependencia(
  taskId: string,
  dependeDeId: string,
  usuario: UsuarioSessao,
): Promise<void> {
  const alvo = await buscarTask(dependeDeId);
  await desvincular(taskId, dependeDeId);
  await db.transaction(async (tx) => {
    await registrarHistorico(tx, [
      {
        taskId,
        userId: usuario.id,
        campo: "depende_de",
        valorAntigo: alvo ? `DEV-${alvo.codigo}` : null,
        valorNovo: null,
      },
    ]);
  });
}

