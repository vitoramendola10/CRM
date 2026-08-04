import { criarUsuarioSchema } from "@/domain";
import { exigirPapelApi } from "@/lib/auth";
import { respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { novoUsuario } from "@/services/config";

export async function POST(req: Request) {
  const v = await validarCorpo(req, criarUsuarioSchema);
  if (!v.ok) return v.resposta;

  try {
    // Criar gente e so do admin: gestor configura o processo, nao o acesso.
    await exigirPapelApi(["admin"]);
    const id = await novoUsuario(v.dados);
    return respostaOk({ id }, 201);
  } catch (e) {
    return tratarErro(e);
  }
}
