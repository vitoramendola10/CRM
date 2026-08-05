"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Botao } from "./Botao";

/**
 * Rodape de lista paginada. Como o filtro, a pagina mora na URL: recarregar,
 * voltar no historico ou mandar o link para alguem cai no mesmo lugar.
 */
export function Paginacao({
  pagina,
  paginas,
  total,
  substantivo,
}: {
  pagina: number;
  paginas: number;
  total: number;
  /** No singular: "chamado", "cliente". O plural sai daqui com "s". */
  substantivo: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function ir(destino: number) {
    const p = new URLSearchParams(params.toString());
    // A primeira pagina nao carrega parametro: a URL limpa e a URL canonica.
    if (destino <= 1) p.delete("pagina");
    else p.set("pagina", String(destino));
    router.push(`${pathname}${p.size > 0 ? `?${p}` : ""}` as Route);
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-linha pt-2">
      <span className="num text-[12px] text-tinta-fraca">
        {total} {substantivo}
        {total === 1 ? "" : "s"}
      </span>

      {paginas > 1 && (
        <span className="ml-auto flex items-center gap-1.5">
          <Botao tamanho="pequeno" onClick={() => ir(pagina - 1)} disabled={pagina <= 1}>
            Anterior
          </Botao>
          <span className="num px-1 text-[12px] text-tinta-media">
            {pagina} de {paginas}
          </span>
          <Botao tamanho="pequeno" onClick={() => ir(pagina + 1)} disabled={pagina >= paginas}>
            Proxima
          </Botao>
        </span>
      )}
    </div>
  );
}
