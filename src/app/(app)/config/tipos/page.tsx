import { contagemPorTipo, listarTipos } from "@/db/queries/config";
import { ListaTipos } from "./ListaTipos";

export const dynamic = "force-dynamic";

export default async function TiposPage() {
  const tipos = await listarTipos();
  const emUso = await contagemPorTipo(tipos.map((t) => t.id));
  return <ListaTipos tipos={tipos} emUso={emUso} />;
}
