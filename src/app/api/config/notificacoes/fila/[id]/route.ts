import { reenfileirar } from "@/db/queries/notifications";
import { PAPEIS_POR_ROTA, ROTAS } from "@/domain";
import { exigirPapelApi } from "@/lib/auth";
import { agoraMysql } from "@/lib/datas";
import { ErroDeNegocio, respostaOk, tratarErro } from "@/lib/rota";

/** Reenvio manual: zera as tentativas e devolve a mensagem para a fila. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await exigirPapelApi(PAPEIS_POR_ROTA[ROTAS.config]!);

    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw new ErroDeNegocio("Mensagem invalida.", 400);

    await reenfileirar(id, agoraMysql());
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
