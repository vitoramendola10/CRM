import { Quadro } from "@/components/kanban/Quadro";
import { Cabecalho, Vazio } from "@/components/ui/Cabecalho";
import { boardPadrao, listarColunas } from "@/db/queries/config";
import { listarCards } from "@/db/queries/tasks";
import { exigirSessao } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  const usuario = await exigirSessao();
  const board = await boardPadrao();

  if (!board) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-5">
        <Cabecalho titulo="Kanban" />
        <Vazio
          titulo="Nenhum board de desenvolvimento cadastrado."
          detalhe="Rode o seed com npm run db:seed."
        />
      </main>
    );
  }

  const [colunas, cards] = await Promise.all([listarColunas(board.id), listarCards(board.id)]);

  return (
    <main className="px-4 py-5">
      <Cabecalho titulo={board.nome} descricao="Arraste os cards entre as etapas do processo." />
      {colunas.length === 0 ? (
        <Vazio titulo="Este board ainda nao tem etapas." detalhe="Cadastre-as em Configuracao." />
      ) : (
        <Quadro colunas={colunas} cards={cards} euId={usuario.id} />
      )}
    </main>
  );
}
