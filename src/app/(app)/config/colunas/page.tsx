import { Vazio } from "@/components/ui/Cabecalho";
import { boardPadrao, contagemPorColuna, listarColunas } from "@/db/queries/config";
import { ListaColunas } from "./ListaColunas";

export const dynamic = "force-dynamic";

export default async function ColunasPage() {
  const board = await boardPadrao();
  if (!board) {
    return (
      <Vazio titulo="Nenhum board de desenvolvimento." detalhe="Rode o seed: npm run db:seed" />
    );
  }

  const [colunas, emUso] = await Promise.all([
    listarColunas(board.id),
    contagemPorColuna(board.id),
  ]);

  return <ListaColunas boardId={board.id} colunas={colunas} emUso={emUso} />;
}
