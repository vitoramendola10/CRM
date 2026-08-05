import { randomUUID } from "node:crypto";
import { criarResposta } from "@/db/queries/respostas";
import { PAPEIS_POR_ROTA, ROTAS, respostaSchema } from "@/domain";
import { exigirPapelApi } from "@/lib/auth";
import { ErroDeNegocio, ehDuplicata, respostaOk, tratarErro, validarCorpo } from "@/lib/rota";

export async function POST(req: Request) {
  const v = await validarCorpo(req, respostaSchema);
  if (!v.ok) return v.resposta;

  try {
    await exigirPapelApi(PAPEIS_POR_ROTA[ROTAS.config]!);
    const id = randomUUID();
    await criarResposta(id, v.dados);
    return respostaOk({ id }, 201);
  } catch (e) {
    if (ehDuplicata(e)) {
      return tratarErro(new ErroDeNegocio(`Ja existe uma resposta "${v.dados.nome}".`));
    }
    return tratarErro(e);
  }
}
