import { Navegacao } from "@/components/Navegacao";
import { boardPadrao } from "@/db/queries/config";
import { contarSemResponsavel } from "@/db/queries/tasks";
import { exigirSessao } from "@/lib/auth";

/**
 * Casca de tudo que exige login. O middleware ja barrou quem nao tem cookie;
 * `exigirSessao` confere no banco - e por isso que desativar um usuario derruba
 * a navegacao dele no proximo carregamento, sem esperar o cookie vencer.
 *
 * A lateral e fixa e so o conteudo rola: o board e largo e rola na horizontal,
 * e perder o menu ao chegar na ultima etapa seria irritante.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await exigirSessao();

  /**
   * Aviso de trabalho sem dono, no proprio menu.
   *
   * Rotina escalada nasce sem responsavel, entao este numero e "chegou coisa
   * nova e ninguem pegou". Existe porque notificacao por e-mail depende de SMTP
   * configurado - e mesmo com SMTP, e-mail se perde e o board nao. Uma contagem
   * por carregamento e barata perto de alguem descobrir dias depois que havia
   * chamado esperando.
   */
  const board = await boardPadrao();
  const semDono = board ? await contarSemResponsavel(board.id) : 0;

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Navegacao usuario={usuario} semDono={semDono} />
      <div className="min-w-0 flex-1 md:h-dvh md:overflow-y-auto">{children}</div>
    </div>
  );
}
