import { AbasVisao } from "@/components/kanban/AbasVisao";
import { Gantt } from "@/components/kanban/Gantt";
import { Cabecalho, Vazio } from "@/components/ui/Cabecalho";
import { boardPadrao } from "@/db/queries/config";
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

  const cards = await listarCards(board.id);

  return (
    <main className="px-4 py-5">
      <Cabecalho titulo="Gantt" descricao="Do inicio ao prazo de cada rotina.">
        <AbasVisao />
      </Cabecalho>
      <Gantt cards={cards} />
    </main>
  );
}
