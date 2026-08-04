import { db } from "@/db/client";
import { definirEtiquetasDaTask } from "@/db/queries/etiquetas";
import { buscarTask } from "@/db/queries/tasks";
import { etiquetasDaTaskSchema } from "@/domain";
import { exigirSessaoApi } from "@/lib/auth";
import { ErroDeNegocio, respostaOk, tratarErro, validarCorpo } from "@/lib/rota";

/** PUT e nao POST: a lista enviada substitui a atual por inteiro. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const v = await validarCorpo(req, etiquetasDaTaskSchema);
  if (!v.ok) return v.resposta;

  try {
    await exigirSessaoApi();
    const id = (await params).id;
    if (!(await buscarTask(id))) throw new ErroDeNegocio("Esta rotina nao existe mais.", 404);

    await db.transaction(async (tx) => {
      await definirEtiquetasDaTask(tx, id, [...new Set(v.dados.etiquetaIds)]);
    });
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
