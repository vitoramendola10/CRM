import { atualizarRegra, removerRegra } from "@/db/queries/notifications";
import { PAPEIS_POR_ROTA, ROTAS, notificationRuleSchema } from "@/domain";
import { exigirPapelApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const v = await validarCorpo(req, notificationRuleSchema);
  if (!v.ok) return v.resposta;

  try {
    await exigirPapelApi(PAPEIS_POR_ROTA[ROTAS.config]!);
    await atualizarRegra((await params).id, v.dados);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await exigirPapelApi(PAPEIS_POR_ROTA[ROTAS.config]!);
    await removerRegra((await params).id);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
