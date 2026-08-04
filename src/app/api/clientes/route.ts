import { clienteSchema } from "@/domain";
import { exigirSessaoApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { novoCliente } from "@/services/cliente";

export async function POST(req: Request) {
  const v = await validarCorpo(req, clienteSchema);
  if (!v.ok) return v.resposta;

  try {
    // Qualquer papel cadastra: o suporte precisa criar cliente no meio do atendimento.
    await exigirSessaoApi();
    const id = await novoCliente(v.dados);
    return respostaOk({ id }, 201);
  } catch (e) {
    return tratarErro(e);
  }
}
