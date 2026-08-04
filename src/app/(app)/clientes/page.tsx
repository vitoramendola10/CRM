import { Cabecalho } from "@/components/ui/Cabecalho";
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
  const [clientes, eu] = await Promise.all([
    listarClientesCompleto(busca),
    exigirSessao(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-5">
      <Cabecalho
        titulo="Clientes"
        descricao="Cadastro proprio do CRM. E o que amarra chamado e rotina a quem pediu."
      />
      <ListaClientes
        clientes={clientes}
        podeExcluir={eu.papel === "admin" || eu.papel === "gestor"}
      />
    </main>
  );
}
