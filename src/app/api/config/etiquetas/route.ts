import { randomUUID } from "node:crypto";
import { criarEtiqueta } from "@/db/queries/etiquetas";
import { PAPEIS_POR_ROTA, ROTAS, etiquetaSchema } from "@/domain";
import { exigirPapelApi } from "@/lib/auth";
import { ErroDeNegocio, ehDuplicata, respostaOk, tratarErro, validarCorpo } from "@/lib/rota";

export async function POST(req: Request) {
  const v = await validarCorpo(req, etiquetaSchema);
  if (!v.ok) return v.resposta;

  try {
    await exigirPapelApi(PAPEIS_POR_ROTA[ROTAS.config]!);
    const id = randomUUID();
    await criarEtiqueta(id, v.dados);
    return respostaOk({ id }, 201);
  } catch (e) {
    // O UNIQUE do nome e quem decide, nao um SELECT antes: duas telas podem
    // criar a mesma etiqueta ao mesmo tempo.
    if (ehDuplicata(e)) {
      return tratarErro(new ErroDeNegocio(`Ja existe uma etiqueta "${v.dados.nome}".`));
    }
    return tratarErro(e);
  }
}
