"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VISOES_KANBAN } from "@/domain";

/**
 * Quadro, Calendario e Gantt sao a mesma consulta exibida de tres jeitos.
 * As rotas ficam sob /kanban - o Next resolve segmento estatico antes de
 * dinamico, entao /kanban/gantt nao colide com /kanban/[codigo].
 */
export function AbasVisao() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-0.5">
      {VISOES_KANBAN.map((v) => {
        const ativo = pathname === v.href;
        return (
          <Link
            key={v.href}
            href={v.href}
            aria-current={ativo ? "page" : undefined}
            className={`transicao rounded-sm border px-2.5 py-1 text-[12px] ${
              ativo
                ? "border-tinta bg-tinta text-papel-alto"
                : "border-linha-forte text-tinta-media hover:bg-papel-baixo hover:text-tinta"
            }`}
          >
            {v.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
