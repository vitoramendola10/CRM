import { atualizarTaskSchema } from "@/domain";
import { exigirSessaoApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { editarTask } from "@/services/task";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const v = await validarCorpo(req, atualizarTaskSchema);
  if (!v.ok) return v.resposta;

  try {
    const usuario = await exigirSessaoApi();
    await editarTask((await params).id, v.dados, usuario);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
