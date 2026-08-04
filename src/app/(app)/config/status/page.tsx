import { contagemPorStatus, listarStatus } from "@/db/queries/config";
import { ListaStatus } from "./ListaStatus";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const status = await listarStatus();
  const emUso = await contagemPorStatus(status.map((s) => s.id));
  return <ListaStatus status={status} emUso={emUso} />;
}
