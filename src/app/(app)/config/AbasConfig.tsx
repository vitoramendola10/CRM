"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ABAS_CONFIG } from "@/domain";

export function AbasConfig() {
  const pathname = usePathname();

  return (
    <nav className="mb-4 flex flex-wrap gap-0.5 border-b border-linha">
      {ABAS_CONFIG.map((a) => {
        const ativo = pathname === a.href;
        return (
          <Link
            key={a.href}
            href={a.href}
            aria-current={ativo ? "page" : undefined}
            className={`transicao -mb-px border-b-2 px-3 py-1.5 text-[13px] ${
              ativo
                ? "border-acento font-medium text-tinta"
                : "border-transparent text-tinta-media hover:text-tinta"
            }`}
          >
            {a.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
