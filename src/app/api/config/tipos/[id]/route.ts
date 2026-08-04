import { PAPEIS_POR_ROTA, ROTAS, taskTypeSchema } from "@/domain";
import { exigirPapelApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { editarTipo, excluirTipo } from "@/services/config";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const v = await validarCorpo(req, taskTypeSchema);
  if (!v.ok) return v.resposta;

  try {
    await exigirPapelApi(PAPEIS_POR_ROTA[ROTAS.config]!);
    await editarTipo((await params).id, v.dados);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await exigirPapelApi(PAPEIS_POR_ROTA[ROTAS.config]!);
    await excluirTipo((await params).id);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
