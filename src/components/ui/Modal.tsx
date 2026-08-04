"use client";

import { useEffect, useRef } from "react";

/**
 * <dialog> nativo: da foco preso, Esc e camada de topo sem gerenciar z-index.
 * Sem animacao de entrada - o modal aparece pronto, como toda a interface.
 */
export function Modal({
  aberto,
  aoFechar,
  titulo,
  descricao,
  largura = "normal",
  children,
  rodape,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  largura?: "normal" | "larga";
  children: React.ReactNode;
  rodape?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        aoFechar();
      }}
      // Clique no backdrop fecha; clique no conteudo nao sobe ate aqui.
      onClick={(e) => {
        if (e.target === ref.current) aoFechar();
      }}
      // O veu e preto nos dois temas: `bg-tinta/35` viraria um veu claro no
      // tema escuro, porque la a tinta e clara.
      className={`m-auto w-[calc(100vw-2rem)] rounded-sm border border-linha-forte bg-papel p-0 text-tinta shadow-arrasto backdrop:bg-black/55 ${
        largura === "larga" ? "max-w-2xl" : "max-w-md"
      }`}
    >
      {aberto && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="border-b border-linha px-4 py-3">
            <h2 className="text-[15px] font-semibold tracking-tight">{titulo}</h2>
            {descricao && <p className="mt-0.5 text-[13px] text-tinta-media">{descricao}</p>}
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
          {rodape && (
            <footer className="flex justify-end gap-2 border-t border-linha bg-papel-baixo px-4 py-2.5">
              {rodape}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
