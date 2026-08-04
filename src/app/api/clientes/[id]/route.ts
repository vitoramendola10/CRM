import { clienteSchema } from "@/domain";
import { exigirPapelApi, exigirSessaoApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { editarCliente, excluirCliente } from "@/services/cliente";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const v = await validarCorpo(req, clienteSchema);
  if (!v.ok) return v.resposta;

  try {
    await exigirSessaoApi();
    await editarCliente((await params).id, v.dados);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    // Excluir e mais destrutivo que editar: fica com quem administra.
    await exigirPapelApi(["admin", "gestor"]);
    await excluirCliente((await params).id);
    return respostaOk({ ok: true });
  } catch (e) {
    return tratarErro(e);
  }
}
