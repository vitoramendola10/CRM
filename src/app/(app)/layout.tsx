import { Navegacao } from "@/components/Navegacao";
import { exigirSessao } from "@/lib/auth";

/**
 * Casca de tudo que exige login. O middleware ja barrou quem nao tem cookie;
 * `exigirSessao` confere no banco - e por isso que desativar um usuario derruba
 * a navegacao dele no proximo carregamento, sem esperar o cookie vencer.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await exigirSessao();

  return (
    <div className="min-h-dvh">
      <Navegacao usuario={usuario} />
      {children}
    </div>
  );
}
