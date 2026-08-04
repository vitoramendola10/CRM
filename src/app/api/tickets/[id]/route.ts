import { atualizarTicketSchema } from "@/domain";
import { exigirSessaoApi } from "@/lib/auth";
import { protocoloDaUrl, respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { editarTicket } from "@/services/ticket";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const v = await validarCorpo(req, atualizarTicketSchema);
  if (!v.ok) return v.resposta;

  try {
    await exigirSessaoApi();
    await editarTicket(protocoloDaUrl((await params).id), v.dados);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
