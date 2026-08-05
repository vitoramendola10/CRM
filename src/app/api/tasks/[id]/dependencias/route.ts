import { dependenciaSchema } from "@/domain";
import { exigirSessaoApi } from "@/lib/auth";
import { respostaErro, respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { criarDependencia, removerDependencia } from "@/services/dependencia";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const v = await validarCorpo(req, dependenciaSchema);
  if (!v.ok) return v.resposta;

  try {
    const usuario = await exigirSessaoApi();
    await criarDependencia((await params).id, v.dados.codigo, usuario);
    return respostaOk({ ok: true }, 201);
  } catch (e) {
    return tratarErro(e);
  }
}

/** O alvo vem na query: DELETE com corpo nao e bem suportado no caminho todo. */
export async function DELETE(req: Request, { params }: Ctx) {
  const dependeDeId = new URL(req.url).searchParams.get("dependeDeId");
  if (!dependeDeId) return respostaErro("Informe qual dependencia remover.", 400);

  try {
    const usuario = await exigirSessaoApi();
    await removerDependencia((await params).id, dependeDeId, usuario);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
