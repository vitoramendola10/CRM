import { PAPEIS_POR_ROTA, ROTAS, renomearStatusSchema } from "@/domain";
import { exigirPapelApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { editarStatus, excluirStatus } from "@/services/config";

type Ctx = { params: Promise<{ id: string }> };

/**
 * `renomearStatusSchema` nao tem `categoria`: mesmo que o cliente mande o campo,
 * o zod descarta. E o que garante que renomear nunca quebra relatorio.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const v = await validarCorpo(req, renomearStatusSchema);
  if (!v.ok) return v.resposta;

  try {
    await exigirPapelApi(PAPEIS_POR_ROTA[ROTAS.config]!);
    await editarStatus((await params).id, v.dados);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await exigirPapelApi(PAPEIS_POR_ROTA[ROTAS.config]!);
    await excluirStatus((await params).id);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
