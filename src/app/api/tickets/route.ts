import { abrirTicketSchema } from "@/domain";
import { exigirSessaoApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { novoTicket } from "@/services/ticket";

export async function POST(req: Request) {
  const v = await validarCorpo(req, abrirTicketSchema);
  if (!v.ok) return v.resposta;

  try {
    const usuario = await exigirSessaoApi();
    const id = await novoTicket(v.dados, usuario);
    return respostaOk({ id }, 201);
  } catch (e) {
    return tratarErro(e);
  }
}
