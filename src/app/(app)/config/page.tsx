import { redirect } from "next/navigation";

/** /config nao tem tela propria: cai na primeira aba. */
export default function ConfigRaiz() {
  redirect("/config/colunas");
}
