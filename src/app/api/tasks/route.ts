import { criarTaskSchema } from "@/domain";
import { exigirSessaoApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { novaTask } from "@/services/task";

/**
 * Rotina que nasce no board, sem chamado. Qualquer papel logado cria: quem
 * achou o problema e quem sabe descreve-lo, e obrigar a passar pelo suporte
 * so faria aparecer chamado inventado para dar entrada em trabalho interno.
 */
export async function POST(req: Request) {
  const v = await validarCorpo(req, criarTaskSchema);
  if (!v.ok) return v.resposta;

  try {
    const usuario = await exigirSessaoApi();
    const r = await novaTask(v.dados, usuario);
    return respostaOk(r, 201);
  } catch (e) {
    return tratarErro(e);
  }
}
