import { taskCommentSchema } from "@/domain";
import { exigirSessaoApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { comentar } from "@/services/task";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const v = await validarCorpo(req, taskCommentSchema);
  if (!v.ok) return v.resposta;

  try {
    const usuario = await exigirSessaoApi();
    const id = await comentar((await params).id, v.dados.corpo, usuario);
    return respostaOk({ id }, 201);
  } catch (e) {
    return tratarErro(e);
  }
}
