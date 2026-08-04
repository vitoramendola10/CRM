import { ticketMessageSchema } from "@/domain";
import { exigirSessaoApi } from "@/lib/auth";
import { protocoloDaUrl, respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { registrarMensagem } from "@/services/ticket";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const v = await validarCorpo(req, ticketMessageSchema);
  if (!v.ok) return v.resposta;

  try {
    const usuario = await exigirSessaoApi();
    const id = await registrarMensagem(protocoloDaUrl((await params).id), v.dados, usuario);
    return respostaOk({ id }, 201);
  } catch (e) {
    return tratarErro(e);
  }
}
