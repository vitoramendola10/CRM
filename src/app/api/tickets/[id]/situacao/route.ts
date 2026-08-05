import { trocarSituacaoSchema } from "@/domain";
import { exigirSessaoApi } from "@/lib/auth";
import { protocoloDaUrl, respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { trocarSituacao } from "@/services/ticket";

/**
 * A acao mais frequente do suporte, sozinha numa rota. Mandar so o campo que
 * mudou tambem evita que dois atendentes no mesmo chamado sobrescrevam um ao
 * outro em campos que nenhum dos dois tocou.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const v = await validarCorpo(req, trocarSituacaoSchema);
  if (!v.ok) return v.resposta;

  try {
    const usuario = await exigirSessaoApi();
    await trocarSituacao(protocoloDaUrl((await params).id), v.dados.situacao, usuario);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
