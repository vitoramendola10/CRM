import { randomUUID } from "node:crypto";
import { criarRegra } from "@/db/queries/notifications";
import { PAPEIS_POR_ROTA, ROTAS, notificationRuleSchema } from "@/domain";
import { exigirPapelApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";

export async function POST(req: Request) {
  const v = await validarCorpo(req, notificationRuleSchema);
  if (!v.ok) return v.resposta;

  try {
    await exigirPapelApi(PAPEIS_POR_ROTA[ROTAS.config]!);
    const id = randomUUID();
    await criarRegra(id, v.dados);
    return respostaOk({ id }, 201);
  } catch (e) {
    return tratarErro(e);
  }
}
