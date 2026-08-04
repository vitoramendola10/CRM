import { atualizarEtiqueta, removerEtiqueta } from "@/db/queries/etiquetas";
import { PAPEIS_POR_ROTA, ROTAS, etiquetaSchema } from "@/domain";
import { exigirPapelApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const v = await validarCorpo(req, etiquetaSchema);
  if (!v.ok) return v.resposta;

  try {
    await exigirPapelApi(PAPEIS_POR_ROTA[ROTAS.config]!);
    await atualizarEtiqueta((await params).id, v.dados);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await exigirPapelApi(PAPEIS_POR_ROTA[ROTAS.config]!);
    await removerEtiqueta((await params).id);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
