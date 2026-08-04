import { atualizarUsuarioSchema } from "@/domain";
import { exigirPapelApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { editarUsuario } from "@/services/config";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const v = await validarCorpo(req, atualizarUsuarioSchema);
  if (!v.ok) return v.resposta;

  try {
    await exigirPapelApi(["admin"]);
    await editarUsuario((await params).id, v.dados);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
