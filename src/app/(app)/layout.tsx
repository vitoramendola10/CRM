import { Navegacao } from "@/components/Navegacao";
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

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Navegacao usuario={usuario} />
      <div className="min-w-0 flex-1 md:h-dvh md:overflow-y-auto">{children}</div>
    </div>
  );
}
