import { PAPEIS_POR_ROTA, ROTAS, taskTypeSchema } from "@/domain";
import { exigirPapelApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { novoTipo } from "@/services/config";

export async function POST(req: Request) {
  const v = await validarCorpo(req, taskTypeSchema);
  if (!v.ok) return v.resposta;

  try {
    await exigirPapelApi(PAPEIS_POR_ROTA[ROTAS.config]!);
    const id = await novoTipo(v.dados);
    return respostaOk({ id }, 201);
  } catch (e) {
    return tratarErro(e);
  }
}
