import { exigirSessaoApi } from "@/lib/auth";
import { respostaOk, tratarErro } from "@/lib/rota";
import { assumirTask } from "@/services/task";

/** Sem corpo: o unico responsavel que esta rota aceita e quem chamou. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const usuario = await exigirSessaoApi();
    await assumirTask((await params).id, usuario);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
