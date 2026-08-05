import { Avatar } from "@/components/ui/Avatar";
import { Cabecalho } from "@/components/ui/Cabecalho";
import { Painel } from "@/components/ui/Painel";
import { ROTULO_PAPEL } from "@/domain";
import { exigirSessao } from "@/lib/auth";
import { FormSenha } from "./FormSenha";

export const dynamic = "force-dynamic";

/**
 * A unica area que todo papel enxerga. Nome, usuario e papel sao cadastro - quem
 * muda e o admin, em /config/usuarios. A senha e a excecao: so o dono troca.
 */
export default async function ContaPage() {
  const eu = await exigirSessao();

  return (
    <main className="mx-auto max-w-3xl px-6 py-7">
      <Cabecalho titulo="Minha conta" descricao="Seus dados de acesso." />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Painel titulo="Quem voce e">
          <div className="flex items-center gap-2.5 py-1">
            <Avatar nome={eu.nome} tamanho={34} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">{eu.nome}</p>
              <p className="num truncate text-[12px] text-tinta-fraca">{eu.username}</p>
              <p className="text-[12px] text-tinta-media">{ROTULO_PAPEL[eu.papel]}</p>
            </div>
          </div>
          <p className="mt-2 border-t border-linha pt-2 text-[12px] text-tinta-fraca">
            Nome, usuario e papel sao alterados pelo administrador.
          </p>
        </Painel>

        <Painel titulo="Trocar senha">
          <FormSenha />
        </Painel>
      </div>
    </main>
  );
}
