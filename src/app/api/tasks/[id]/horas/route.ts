import { apontamentoSchema } from "@/domain";
import { exigirSessaoApi } from "@/lib/auth";
import { respostaErro, respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { apagarApontamento, apontarHoras } from "@/services/worklog";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const v = await validarCorpo(req, apontamentoSchema);
  if (!v.ok) return v.resposta;

  try {
    const usuario = await exigirSessaoApi();
    const id = await apontarHoras((await params).id, v.dados, usuario);
    return respostaOk({ id }, 201);
  } catch (e) {
    return tratarErro(e);
  }
}

/** O apontamento vem na query - DELETE com corpo nao atravessa bem todo proxy. */
export async function DELETE(req: Request) {
  const apontamento = new URL(req.url).searchParams.get("apontamentoId");
  if (!apontamento) return respostaErro("Informe qual apontamento apagar.", 400);

  try {
    const usuario = await exigirSessaoApi();
    await apagarApontamento(apontamento, usuario);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
