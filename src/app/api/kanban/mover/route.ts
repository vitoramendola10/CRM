import { moverTaskSchema } from "@/domain";
import { exigirSessaoApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { moverTask } from "@/services/mover-task";

export async function POST(req: Request) {
  const v = await validarCorpo(req, moverTaskSchema);
  if (!v.ok) return v.resposta;

  try {
    // Qualquer papel logado move card - o board e a ferramenta comum da equipe.
    const usuario = await exigirSessaoApi();
    await moverTask(v.dados, usuario);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
