import { listarClientesCompleto } from "@/db/queries/clientes";
import { exigirSessao } from "@/lib/auth";
import { paginaDaUrl } from "@/lib/paginacao";
import { ListaClientes } from "./ListaClientes";

export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; pagina?: string }>;
}) {
  const { busca, pagina } = await searchParams;
  const [lista, eu] = await Promise.all([
    listarClientesCompleto(busca, paginaDaUrl(pagina)),
    exigirSessao(),
  ]);

  return (
    <ListaClientes
      clientes={lista.itens}
      pagina={lista.pagina}
      paginas={lista.paginas}
      total={lista.total}
      podeExcluir={eu.papel === "admin" || eu.papel === "gestor"}
    />
  );
}
