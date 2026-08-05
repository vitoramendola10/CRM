import { AbasVisao } from "@/components/kanban/AbasVisao";
import { NovaRotina } from "@/components/kanban/NovaRotina";
import { Quadro } from "@/components/kanban/Quadro";
import { Cabecalho, Vazio } from "@/components/ui/Cabecalho";
import { boardPadrao, listarBoards, listarColunas, listarTipos } from "@/db/queries/config";
import { listarEtiquetas } from "@/db/queries/etiquetas";
import { listarCards } from "@/db/queries/tasks";
import { listarClientes } from "@/db/queries/tickets";
import { listarUsuarios } from "@/db/queries/users";
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

  const [colunas, cards, etiquetas, boards, tipos, clientes, usuarios] = await Promise.all([
    listarColunas(board.id),
    listarCards(board.id),
    listarEtiquetas(true),
    listarBoards(),
    listarTipos(true),
    listarClientes(),
    listarUsuarios(true),
  ]);

  return (
    <main className="px-6 py-7">
      <Cabecalho titulo={board.nome} descricao="Arraste os cards entre as etapas do processo.">
        <AbasVisao />
        <NovaRotina
          boards={boards.filter((b) => b.ativo)}
          tipos={tipos}
          clientes={clientes}
          usuarios={usuarios}
          euId={usuario.id}
        />
      </Cabecalho>
      {colunas.length === 0 ? (
        <Vazio titulo="Este board ainda nao tem etapas." detalhe="Cadastre-as em Configuracao." />
      ) : (
        <Quadro colunas={colunas} cards={cards} euId={usuario.id} etiquetas={etiquetas} />
      )}
    </main>
  );
}
