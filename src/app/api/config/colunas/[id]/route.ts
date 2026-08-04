import { PAPEIS_POR_ROTA, ROTAS, boardColumnSchema } from "@/domain";
import { exigirPapelApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { editarColuna, excluirColuna } from "@/services/config";

/** boardId nao se altera: mover uma etapa de board mudaria o board de toda tarefa nela. */
const editarSchema = boardColumnSchema.omit({ boardId: true });

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const v = await validarCorpo(req, editarSchema);
  if (!v.ok) return v.resposta;

  try {
    await exigirPapelApi(PAPEIS_POR_ROTA[ROTAS.config]!);
    await editarColuna((await params).id, v.dados);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await exigirPapelApi(PAPEIS_POR_ROTA[ROTAS.config]!);
    await excluirColuna((await params).id);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
