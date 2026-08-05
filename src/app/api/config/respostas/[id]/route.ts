import { atualizarResposta, removerResposta } from "@/db/queries/respostas";
import { PAPEIS_POR_ROTA, ROTAS, respostaSchema } from "@/domain";
import { exigirPapelApi } from "@/lib/auth";
import { ErroDeNegocio, ehDuplicata, respostaOk, tratarErro, validarCorpo } from "@/lib/rota";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const v = await validarCorpo(req, respostaSchema);
  if (!v.ok) return v.resposta;

  try {
    await exigirPapelApi(PAPEIS_POR_ROTA[ROTAS.config]!);
    await atualizarResposta((await params).id, v.dados);
    return respostaOk({ ok: true });
  } catch (e) {
    if (ehDuplicata(e)) {
      return tratarErro(new ErroDeNegocio(`Ja existe uma resposta "${v.dados.nome}".`));
    }
    return tratarErro(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await exigirPapelApi(PAPEIS_POR_ROTA[ROTAS.config]!);
    await removerResposta((await params).id);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
