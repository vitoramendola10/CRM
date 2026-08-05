import { listarRespostas } from "@/db/queries/respostas";
import { ListaRespostas } from "./ListaRespostas";

export const dynamic = "force-dynamic";

export default async function RespostasPage() {
  return <ListaRespostas respostas={await listarRespostas()} />;
}
