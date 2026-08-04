import { PAPEIS_POR_ROTA, ROTAS, reordenarColunasSchema } from "@/domain";
import { exigirPapelApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { ordenarColunas } from "@/services/config";

export async function PUT(req: Request) {
  const v = await validarCorpo(req, reordenarColunasSchema);
  if (!v.ok) return v.resposta;

  try {
    await exigirPapelApi(PAPEIS_POR_ROTA[ROTAS.config]!);
    await ordenarColunas(v.dados);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
