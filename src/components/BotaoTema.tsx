"use client";

import { useEffect, useState } from "react";
import { TEMA_CHAVE, TEMA_PADRAO, type Tema } from "@/lib/tema";

/**
 * Alterna o tema. O icone e desenhado em SVG, nao emoji: o brief pede icone de
 * verdade, e emoji muda de forma conforme o sistema operacional.
 */
export function BotaoTema({ recolhido = false }: { recolhido?: boolean }) {
  const [tema, setTema] = useState<Tema>(TEMA_PADRAO);
  const [montado, setMontado] = useState(false);

  // O tema real so e conhecido no cliente: quem o define antes da pintura e o
  // script do <head>, lendo o localStorage.
  useEffect(() => {
    const atual = document.documentElement.dataset.tema;
    setTema(atual === "claro" ? "claro" : "escuro");
    setMontado(true);
  }, []);

  function alternar() {
    const novo: Tema = tema === "escuro" ? "claro" : "escuro";
    document.documentElement.dataset.tema = novo;
    setTema(novo);
    try {
      localStorage.setItem(TEMA_CHAVE, novo);
    } catch {
      // Navegador com armazenamento bloqueado: o tema vale so nesta aba.
    }
  }

  const rotulo = tema === "escuro" ? "Mudar para tema claro" : "Mudar para tema escuro";

  return (
    <button
      type="button"
      onClick={alternar}
      title={rotulo}
      aria-label={rotulo}
      className={`transicao flex items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] text-tinta-media hover:bg-papel-baixo hover:text-tinta ${
        recolhido ? "justify-center" : "w-full"
      }`}
    >
      {/* Antes de montar nao sabemos o tema; o icone neutro evita piscar o errado. */}
      <span className="shrink-0">{montado && tema === "escuro" ? <IconeSol /> : <IconeLua />}</span>
      {!recolhido && <span>{tema === "escuro" ? "Tema claro" : "Tema escuro"}</span>}
    </button>
  );
}

function IconeSol() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function IconeLua() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
