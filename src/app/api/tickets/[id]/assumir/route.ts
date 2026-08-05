import { exigirSessaoApi } from "@/lib/auth";
import { protocoloDaUrl, respostaOk, tratarErro } from "@/lib/rota";
import { assumirChamado } from "@/services/ticket";

/** Sem corpo de proposito: o unico atendente que esta rota aceita e quem chamou. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const usuario = await exigirSessaoApi();
    await assumirChamado(protocoloDaUrl((await params).id), usuario);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
