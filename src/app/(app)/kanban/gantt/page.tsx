import { AbasVisao } from "@/components/kanban/AbasVisao";
import { Gantt } from "@/components/kanban/Gantt";
import { Cabecalho, Vazio } from "@/components/ui/Cabecalho";
import { boardPadrao } from "@/db/queries/config";
import { arestasDoBoard } from "@/db/queries/dependencias";
import { listarCards } from "@/db/queries/tasks";

export const dynamic = "force-dynamic";

export default async function GanttPage() {
  const board = await boardPadrao();
  if (!board) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-5">
        <Cabecalho titulo="Gantt" />
        <Vazio titulo="Nenhum board cadastrado." detalhe="Rode o seed com npm run db:seed." />
      </main>
    );
  }

  const [cards, arestas] = await Promise.all([listarCards(board.id), arestasDoBoard(board.id)]);

  return (
    <main className="px-6 py-7">
      <Cabecalho titulo="Gantt" descricao="Do inicio ao prazo de cada rotina.">
        <AbasVisao />
      </Cabecalho>
      <Gantt cards={cards} arestas={arestas} />
    </main>
  );
}
