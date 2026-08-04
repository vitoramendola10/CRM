import { escalarTicketSchema } from "@/domain";
import { exigirSessaoApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { escalarTicket } from "@/services/escalar";

export async function POST(req: Request) {
  const v = await validarCorpo(req, escalarTicketSchema);
  if (!v.ok) return v.resposta;

  try {
    const usuario = await exigirSessaoApi();
    const r = await escalarTicket(v.dados, usuario);
    return respostaOk(r, 201);
  } catch (e) {
    return tratarErro(e);
  }
}
