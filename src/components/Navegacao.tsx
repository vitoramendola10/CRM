"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { NAVEGACAO, ROTULO_PAPEL, podeAcessar, type Rota, type UsuarioSessao } from "@/domain";
import { chamar } from "@/lib/api";

export function Navegacao({ usuario }: { usuario: UsuarioSessao }) {
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
    <header className="sticky top-0 z-10 border-b border-linha-forte bg-papel-alto">
      <div className="flex h-11 items-center gap-1 px-4">
        <span className="mr-3 text-[13px] font-semibold tracking-tight">CRM</span>

        <nav className="flex items-center gap-0.5">
          {itens.map((i) => {
            const ativo = pathname === i.href || pathname.startsWith(`${i.href}/`);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={ativo ? "page" : undefined}
                className={`transicao rounded-sm px-2.5 py-1 text-[13px] ${
                  ativo
                    ? "bg-papel-baixo font-medium text-tinta"
                    : "text-tinta-media hover:bg-papel-baixo hover:text-tinta"
                }`}
              >
                {i.rotulo}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <span className="flex items-center gap-1.5">
            <Avatar nome={usuario.nome} />
            <span className="hidden text-[12px] leading-tight sm:block">
              <span className="block">{usuario.nome}</span>
              <span className="block text-tinta-fraca">{ROTULO_PAPEL[usuario.papel]}</span>
            </span>
          </span>
          <button
            type="button"
            onClick={sair}
            disabled={saindo}
            className="transicao rounded-sm px-2 py-1 text-[12px] text-tinta-fraca hover:bg-papel-baixo hover:text-tinta disabled:opacity-45"
          >
            {saindo ? "Saindo..." : "Sair"}
          </button>
        </div>
      </div>
    </header>
  );
}
