import { listarBoards, listarColunas, listarStatus, listarTipos } from "@/db/queries/config";
import type { Board, BoardColumn, TaskStatus, TaskType } from "@/domain";

/**
 * Estado da configuracao base do sistema. Existe para a etapa 1 ter uma tela
 * que prove que dominio, banco e seed conversam - e sai quando /config chegar.
 */

export type Diagnostico =
  | { ok: true; board: Board | null; colunas: BoardColumn[]; status: TaskStatus[]; tipos: TaskType[] }
  | { ok: false; motivo: "sem_banco" | "sem_migration"; detalhe: string };

export async function carregarDiagnostico(): Promise<Diagnostico> {
  try {
    const boards = await listarBoards();
    const board = boards[0] ?? null;
    const [colunas, status, tipos] = await Promise.all([
      board ? listarColunas(board.id) : Promise.resolve([]),
      listarStatus(),
      listarTipos(),
    ]);
    return { ok: true, board, colunas, status, tipos };
  } catch (e: unknown) {
    const detalhe = e instanceof Error ? e.message : String(e);
    // ER_NO_SUCH_TABLE / ER_BAD_DB_ERROR = banco existe mas nao migrou.
    const semMigration = /ER_NO_SUCH_TABLE|ER_BAD_DB_ERROR|doesn't exist|Unknown database/i.test(
      detalhe,
    );
    return { ok: false, motivo: semMigration ? "sem_migration" : "sem_banco", detalhe };
  }
}
