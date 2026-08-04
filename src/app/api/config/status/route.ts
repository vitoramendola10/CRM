import { PAPEIS_POR_ROTA, ROTAS, taskStatusSchema } from "@/domain";
import { exigirPapelApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { novoStatus } from "@/services/config";

export async function POST(req: Request) {
  const v = await validarCorpo(req, taskStatusSchema);
  if (!v.ok) return v.resposta;

  try {
    await exigirPapelApi(PAPEIS_POR_ROTA[ROTAS.config]!);
    const id = await novoStatus(v.dados);
    return respostaOk({ id }, 201);
  } catch (e) {
    return tratarErro(e);
  }
}
