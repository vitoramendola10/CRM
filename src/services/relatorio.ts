import { movimentosDeColuna } from "@/db/queries/dashboard";
import { deMysql } from "@/lib/datas";

/**
 * Lead time por etapa: quanto tempo, em media, um card fica em cada coluna.
 *
 * A serie de eventos precisa ser costurada aqui e nao em SQL porque a primeira
 * coluna nao gera linha de historico - a tarefa nasce nela. O `valor_antigo` do
 * primeiro movimento e o unico registro de qual era essa coluna.
 */

export interface LeadTimeDaColuna {
  columnId: string;
  /** Quantas passagens de card por esta coluna entraram na conta. */
  passagens: number;
  mediaDias: number;
  medianaDias: number;
}

export async function leadTimePorColuna(
  boardId: string,
  agora: Date = new Date(),
): Promise<LeadTimeDaColuna[]> {
  const { criacao, historico } = await movimentosDeColuna(boardId);

  const porTask = new Map<string, typeof historico>();
  for (const h of historico) {
    const lista = porTask.get(h.taskId);
    if (lista) lista.push(h);
    else porTask.set(h.taskId, [h]);
  }

  // columnId -> duracoes em ms
  const duracoes = new Map<string, number[]>();

  for (const task of criacao) {
    const movs = porTask.get(task.id) ?? [];

    // Coluna inicial: o `valor_antigo` do primeiro movimento; se a tarefa nunca
    // saiu do lugar, e a coluna onde ela esta agora.
    const inicial = movs[0]?.valorAntigo ?? task.columnId;

    const eventos: { columnId: string; em: number }[] = [
      { columnId: inicial, em: deMysql(task.createdAt).getTime() },
    ];
    for (const m of movs) {
      if (m.valorNovo === null) continue;
      eventos.push({ columnId: m.valorNovo, em: deMysql(m.createdAt).getTime() });
    }

    for (const [i, ev] of eventos.entries()) {
      // A ultima etapa ainda esta correndo: conta ate agora.
      const fim = eventos[i + 1]?.em ?? agora.getTime();
      const ms = fim - ev.em;
      if (ms < 0) continue;

      const lista = duracoes.get(ev.columnId);
      if (lista) lista.push(ms);
      else duracoes.set(ev.columnId, [ms]);
    }
  }

  return [...duracoes.entries()]
    .map(([columnId, ms]) => ({
      columnId,
      passagens: ms.length,
      mediaDias: media(ms) / 86_400_000,
      // A mediana e o numero honesto aqui: um card esquecido por 3 meses
      // distorce a media de uma coluna inteira.
      medianaDias: mediana(ms) / 86_400_000,
    }))
    .sort((a, b) => b.mediaDias - a.mediaDias);
}

function media(v: number[]): number {
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function mediana(v: number[]): number {
  const ord = [...v].sort((a, b) => a - b);
  const meio = Math.floor(ord.length / 2);
  return ord.length % 2 === 0 ? (ord[meio - 1]! + ord[meio]!) / 2 : ord[meio]!;
}
