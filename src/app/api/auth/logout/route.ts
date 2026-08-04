import { ROTAS } from "@/domain";
import { encerrarSessao } from "@/lib/auth";
import { respostaOk, tratarErro } from "@/lib/rota";

export async function POST() {
  try {
    await encerrarSessao();
    return respostaOk({ destino: ROTAS.login });
  } catch (e) {
    return tratarErro(e);
  }
}
