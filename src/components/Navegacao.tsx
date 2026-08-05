"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BotaoTema } from "@/components/BotaoTema";
import { Avatar } from "@/components/ui/Avatar";
import { NAVEGACAO, ROTAS, ROTULO_PAPEL, podeAcessar, type Rota, type UsuarioSessao } from "@/domain";
import { chamar } from "@/lib/api";

/**
 * Barra lateral. Em telas estreitas vira uma faixa horizontal rolavel no topo -
 * mesmo markup, so muda a direcao do flex, sem duplicar a lista de rotas.
 */
export function Navegacao({
  usuario,
  semDono,
}: {
  usuario: UsuarioSessao;
  /** Rotinas sem responsavel. Vira o aviso ao lado de "Kanban". */
  semDono: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  const itens = NAVEGACAO.filter((i) => podeAcessar(usuario.papel, i.href));

  async function sair() {
    setSaindo(true);
    const r = await chamar<{ destino: Rota }>("/api/auth/logout", "POST");
    if (r.ok) {
      router.replace(r.dados.destino);
      router.refresh();
    } else {
      setSaindo(false);
    }
  }

  return (
    <aside className="flex shrink-0 flex-col border-b border-linha bg-papel-alto md:h-dvh md:w-52 md:border-b-0 md:border-r">
      <div className="flex items-center gap-2 px-3 py-3 md:py-4">
        <span
          aria-hidden
          className="num grid size-6 place-items-center rounded-sm bg-acento text-[11px] font-semibold text-papel"
        >
          C
        </span>
        <span className="text-[13px] font-semibold tracking-tight">CRM</span>
      </div>

      <nav className="flex gap-0.5 overflow-x-auto px-2 pb-2 md:flex-1 md:flex-col md:overflow-x-visible md:pb-0">
        {itens.map((i) => {
          const ativo = pathname === i.href || pathname.startsWith(`${i.href}/`);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={ativo ? "page" : undefined}
              className={`transicao relative shrink-0 rounded-sm px-2.5 py-1.5 text-[13px] ${
                ativo
                  ? "bg-papel-baixo font-medium text-tinta"
                  : "text-tinta-media hover:bg-papel-baixo hover:text-tinta"
              }`}
            >
              {/* Marca de item ativo so na vertical: na horizontal ela viraria
                  um risco solto do lado do texto. */}
              {ativo && (
                <span
                  aria-hidden
                  className="absolute inset-y-1 -left-2 hidden w-0.5 rounded-full bg-acento md:block"
                />
              )}
              {i.rotulo}

              {/* Numero, e nao bolinha: "3 esperando" e uma informacao,
                  "tem coisa la" e so ansiedade. */}
              {i.href === ROTAS.kanban && semDono > 0 && (
                <span
                  title={`${semDono} rotina${semDono === 1 ? "" : "s"} sem responsavel`}
                  className="num ml-1.5 rounded-xs bg-prio-alta px-1 text-[10px] font-medium text-papel"
                >
                  {semDono}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-1 border-linha px-2 pb-2 md:flex-col md:items-stretch md:border-t md:pt-2">
        <div className="hidden md:block">
          <BotaoTema />
        </div>
        <div className="md:hidden">
          <BotaoTema recolhido />
        </div>

        {/* O bloco de identidade e o caminho para a propria conta - e onde a
            pessoa procura quando quer trocar a senha. Fora de NAVEGACAO de
            proposito: nao e uma area do sistema, e o canto de quem esta logado. */}
        <Link
          href={ROTAS.conta}
          aria-current={pathname === ROTAS.conta ? "page" : undefined}
          title="Minha conta"
          className={`transicao ml-auto flex items-center gap-2 rounded-sm px-1 py-1 md:ml-0 ${
            pathname === ROTAS.conta
              ? "bg-papel-baixo text-tinta"
              : "text-tinta hover:bg-papel-baixo"
          }`}
        >
          <Avatar nome={usuario.nome} />
          <span className="hidden min-w-0 flex-1 text-[12px] leading-tight md:block">
            <span className="block truncate">{usuario.nome}</span>
            <span className="block text-tinta-fraca">{ROTULO_PAPEL[usuario.papel]}</span>
          </span>
        </Link>

        <button
          type="button"
          onClick={sair}
          disabled={saindo}
          className="transicao shrink-0 rounded-sm px-2 py-1.5 text-left text-[12px] text-tinta-fraca hover:bg-papel-baixo hover:text-tinta disabled:opacity-45"
        >
          {saindo ? "Saindo..." : "Sair"}
        </button>
      </div>
    </aside>
  );
}
