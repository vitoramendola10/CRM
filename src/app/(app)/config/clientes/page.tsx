import { listarClientesCompleto } from "@/db/queries/clientes";
import { exigirSessao } from "@/lib/auth";
import { ListaClientes } from "./ListaClientes";

export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>;
}) {
  const { busca } = await searchParams;
  const [clientes, eu] = await Promise.all([listarClientesCompleto(busca), exigirSessao()]);

  return (
    <ListaClientes clientes={clientes} podeExcluir={eu.papel === "admin" || eu.papel === "gestor"} />
  );
}
