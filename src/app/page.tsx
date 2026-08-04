import { redirect } from "next/navigation";
import { ROTAS, ROTA_INICIAL } from "@/domain";
import { sessaoAtual } from "@/lib/auth";

/**
 * A raiz nao tem tela propria: cada papel comeca o dia num lugar diferente.
 * O middleware ja resolve isto na maioria dos casos; aqui e a rede de seguranca
 * para quando a sessao do cookie nao existe mais no banco.
 */
export default async function Raiz() {
  const usuario = await sessaoAtual();
  redirect(usuario ? ROTA_INICIAL[usuario.papel] : ROTAS.login);
}
