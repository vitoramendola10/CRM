import { ROTA_INICIAL, loginSchema } from "@/domain";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { autenticar } from "@/services/auth";

export async function POST(req: Request) {
  const v = await validarCorpo(req, loginSchema);
  if (!v.ok) return v.resposta;

  try {
    const papel = await autenticar(v.dados);
    return respostaOk({ destino: ROTA_INICIAL[papel] });
  } catch (e) {
    return tratarErro(e);
  }
}
