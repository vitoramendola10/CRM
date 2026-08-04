import { listarUsuarios } from "@/db/queries/users";
import { exigirSessao } from "@/lib/auth";
import { ListaUsuarios } from "./ListaUsuarios";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  // Gestor enxerga o quadro de gente, mas so admin mexe em acesso.
  const [usuarios, eu] = await Promise.all([listarUsuarios(), exigirSessao()]);
  return <ListaUsuarios usuarios={usuarios} souAdmin={eu.papel === "admin"} />;
}
