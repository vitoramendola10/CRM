import { trocarSenhaSchema } from "@/domain";
import { exigirSessaoApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { trocarSenha } from "@/services/conta";

/** Qualquer papel troca a propria senha. Ninguem troca a senha de outro por aqui. */
export async function PATCH(req: Request) {
  const v = await validarCorpo(req, trocarSenhaSchema);
  if (!v.ok) return v.resposta;

  try {
    const u = await exigirSessaoApi();
    await trocarSenha(u.id, u.papel, v.dados);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
