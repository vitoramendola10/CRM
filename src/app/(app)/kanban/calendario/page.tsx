import { AbasVisao } from "@/components/kanban/AbasVisao";
import { Calendario } from "@/components/kanban/Calendario";
import { Cabecalho, Vazio } from "@/components/ui/Cabecalho";
import { boardPadrao } from "@/db/queries/config";
import { listarCards } from "@/db/queries/tasks";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const board = await boardPadrao();
  if (!board) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-5">
        <Cabecalho titulo="Calendario" />
        <Vazio titulo="Nenhum board cadastrado." detalhe="Rode o seed com npm run db:seed." />
      </main>
    );
  }

  const cards = await listarCards(board.id);

  return (
    <main className="mx-auto max-w-6xl px-4 py-5">
      <Cabecalho titulo="Calendario" descricao="As rotinas pelo prazo de entrega.">
        <AbasVisao />
      </Cabecalho>
      <Calendario cards={cards} />
    </main>
  );
}
