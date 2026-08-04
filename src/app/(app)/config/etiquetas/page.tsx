import { contagemPorEtiqueta, listarEtiquetas } from "@/db/queries/etiquetas";
import { ListaEtiquetas } from "./ListaEtiquetas";

export const dynamic = "force-dynamic";

export default async function EtiquetasPage() {
  const [etiquetas, emUso] = await Promise.all([listarEtiquetas(), contagemPorEtiqueta()]);
  return <ListaEtiquetas etiquetas={etiquetas} emUso={emUso} />;
}
