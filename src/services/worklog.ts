import { randomUUID } from "node:crypto";
import { buscarTask } from "@/db/queries/tasks";
import {
  buscarApontamento,
  inserirApontamento,
  removerApontamento,
} from "@/db/queries/worklog";
import type { ApontamentoInput, UsuarioSessao } from "@/domain";
import { ErroDeNegocio } from "@/lib/rota";

export async function apontarHoras(
  taskId: string,
  dados: ApontamentoInput,
  usuario: UsuarioSessao,
): Promise<string> {
  if (!(await buscarTask(taskId))) throw new ErroDeNegocio("Esta rotina nao existe mais.", 404);

  // Data no futuro nao e apontamento, e planejamento - e planejamento ja tem
  // campo proprio (prazo). Deixar passar sujaria o relatorio do mes que vem.
  const hoje = new Date().toISOString().slice(0, 10);
  if (dados.data > hoje) {
    throw new ErroDeNegocio("Nao da para apontar horas numa data futura.");
  }

  const id = randomUUID();
  await inserirApontamento({
    id,
    taskId,
    userId: usuario.id,
    minutos: dados.minutos,
    data: dados.data,
    nota: dados.nota,
  });
  return id;
}

/**
 * So quem apontou apaga - nem a gestao. Hora apontada e declaracao de quem
 * trabalhou; corrigir a declaracao de outra pessoa por cima, sem ela saber, e
 * pior do que deixar o erro. Se a gestao precisar mexer, conversa e a pessoa
 * corrige.
 */
export async function apagarApontamento(id: string, usuario: UsuarioSessao): Promise<void> {
  const a = await buscarApontamento(id);
  if (!a) throw new ErroDeNegocio("Este apontamento nao existe mais.", 404);
  if (a.userId !== usuario.id) {
    throw new ErroDeNegocio("So quem apontou pode apagar o proprio apontamento.", 403);
  }
  await removerApontamento(id);
}
