"use client";

import { useRef, useState } from "react";
import { CONTROLE } from "./Campo";
import { aplicarMencao, filtrarNomes, tokenDeMencao } from "@/lib/mencao";

/**
 * Campo de texto longo que sugere nomes ao digitar `@`.
 *
 * Antes, citar alguem exigia saber o nome de usuario de cor - o que na pratica
 * significa nao citar ninguem. Aqui `@` abre a lista, as setas escolhem e
 * Enter completa.
 *
 * A lista fica ANCORADA ABAIXO DO CAMPO, e nao flutuando no cursor. Descobrir
 * a posicao do cursor dentro de um <textarea> exige espelhar o conteudo num
 * elemento invisivel e medir - fragil com quebra de linha, rolagem e zoom.
 * Ancorar embaixo sempre funciona, e a lista e curta o bastante para a pessoa
 * nao perder o texto de vista.
 */

function Rotulo({ texto, obrigatorio }: { texto: string; obrigatorio?: boolean | undefined }) {
  return (
    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-tinta-fraca">
      {texto}
      {obrigatorio && <span className="ml-0.5 text-cat-cancelado">*</span>}
    </span>
  );
}

export function AreaTextoMencao({
  rotulo,
  erro,
  dica,
  obrigatorio,
  usuarios,
  value,
  aoMudar,
  rows = 4,
  placeholder,
  aoEnviar,
}: {
  rotulo?: string | undefined;
  erro?: string | undefined;
  dica?: string | undefined;
  obrigatorio?: boolean | undefined;
  /** Nomes de usuario que podem ser citados. */
  usuarios: readonly string[];
  value: string;
  aoMudar: (v: string) => void;
  rows?: number;
  placeholder?: string | undefined;
  /** Ctrl+Enter envia, quando o campo esta dentro de um formulario de envio. */
  aoEnviar?: (() => void) | undefined;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [token, setToken] = useState<{ inicio: number; termo: string } | null>(null);
  const [escolhido, setEscolhido] = useState(0);

  const sugestoes = token ? filtrarNomes(usuarios, token.termo).slice(0, 6) : [];
  const aberta = sugestoes.length > 0;

  function reavaliar(texto: string, cursor: number) {
    const t = tokenDeMencao(texto, cursor);
    setToken(t);
    setEscolhido(0);
  }

  function escolher(username: string) {
    if (!token) return;
    const r = aplicarMencao(value, token, username);
    aoMudar(r.texto);
    setToken(null);
    // O cursor tem de voltar para depois do nome; sem isto ele pula para o fim
    // do texto e quem estava editando no meio perde o lugar.
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(r.cursor, r.cursor);
    });
  }

  return (
    <label className="relative block">
      {rotulo && <Rotulo texto={rotulo} obrigatorio={obrigatorio} />}

      <textarea
        ref={ref}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          aoMudar(e.target.value);
          reavaliar(e.target.value, e.target.selectionStart);
        }}
        // Clicar ou navegar com as setas tambem muda onde o cursor esta.
        onClick={(e) => reavaliar(value, e.currentTarget.selectionStart)}
        onBlur={() => setToken(null)}
        onKeyDown={(e) => {
          if (aberta) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setEscolhido((i) => (i + 1) % sugestoes.length);
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setEscolhido((i) => (i - 1 + sugestoes.length) % sugestoes.length);
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              escolher(sugestoes[escolhido]!);
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setToken(null);
              return;
            }
          }
          // Fora da lista, as setas so movem o cursor - e o token muda com ele.
          if (e.key.startsWith("Arrow")) {
            requestAnimationFrame(() =>
              reavaliar(value, ref.current?.selectionStart ?? value.length),
            );
          }
          if (aoEnviar && e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            aoEnviar();
          }
        }}
        className={`${CONTROLE} resize-y py-1.5 leading-relaxed ${erro ? "border-cat-cancelado" : ""}`}
      />

      {aberta && (
        <ul
          // Sem `pointer-events` no blur seria impossivel clicar: o blur do
          // textarea fecharia a lista antes do clique chegar. `onMouseDown`
          // com preventDefault resolve porque roda antes do blur.
          className="absolute left-0 right-0 z-30 mt-0.5 overflow-hidden rounded-sm border border-linha-forte bg-papel-alto shadow-arrasto"
        >
          {sugestoes.map((u, i) => (
            <li key={u}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  escolher(u);
                }}
                onMouseEnter={() => setEscolhido(i)}
                className={`num block w-full px-2.5 py-1.5 text-left text-[12px] ${
                  i === escolhido ? "bg-papel-baixo text-tinta" : "text-tinta-media"
                }`}
              >
                @{u}
              </button>
            </li>
          ))}
        </ul>
      )}

      {dica && !erro && <span className="mt-1 block text-[12px] text-tinta-fraca">{dica}</span>}
      {erro && <span className="mt-1 block text-[12px] text-cat-cancelado">{erro}</span>}
    </label>
  );
}
