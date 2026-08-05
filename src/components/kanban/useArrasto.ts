"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TaskCard } from "@/domain";

/**
 * Arrasto com pointer events, sem biblioteca.
 *
 * O HTML5 drag-and-drop nativo nao serve aqui: a imagem que ele arrasta e um
 * snapshot translucido feito pelo navegador, sem controle de estilo - da para
 * ver que algo esta se movendo, mas o card nao parece estar na mao de ninguem.
 * Com pointer events, quem desenha o card flutuante somos nos.
 *
 * Pointer events cobrem mouse, toque e caneta com o mesmo codigo.
 */

export interface Alvo {
  colunaId: string;
  indice: number;
}

export interface Arrasto {
  card: TaskCard;
  /** Canto superior esquerdo do card flutuante, em coordenadas de viewport. */
  x: number;
  y: number;
  largura: number;
  altura: number;
  alvo: Alvo | null;
}

/** Distancia antes de virar arrasto. Abaixo disso e clique, e o link precisa funcionar. */
const LIMIAR_PX = 5;

/**
 * Onde o arrasto NAO pode comecar.
 *
 * `a` de fora desta lista de proposito. O titulo do card e um link de largura
 * inteira: barrar o arrasto em cima dele criava uma zona morta bem no lugar
 * mais natural para pegar o card - era so o que dava para agarrar sem cair no
 * texto. Quem separa clique de arrasto e o LIMIAR_PX, e nao o tipo do elemento;
 * o clique que sobra depois de um arrasto e engolido em `cliqueDepoisDoArrasto`.
 *
 * Botao continua fora: ele executa uma acao, e uma acao nao deve nascer de um
 * gesto que a pessoa comecou querendo mover o card.
 */
const NAO_ARRASTA = "button,input,select,textarea";

/** Exportada para teste: e a regra que ja errou uma vez. */
export function podeIniciarArrasto(alvo: Element | null): boolean {
  return alvo !== null && alvo.closest(NAO_ARRASTA) === null;
}

/** Faixa da borda que dispara rolagem automatica do board. */
const BORDA_AUTOSCROLL = 72;
const VELOCIDADE_AUTOSCROLL = 18;

export function useArrasto(
  aoSoltar: (colunaId: string, indice: number, card: TaskCard) => void,
  ativo: boolean,
) {
  const [arrasto, setArrasto] = useState<Arrasto | null>(null);

  // Refs porque os handlers globais sao registrados uma vez e nao devem
  // recriar-se a cada movimento do mouse.
  const inicio = useRef<{ x: number; y: number; card: TaskCard; alvoEl: HTMLElement } | null>(null);
  const deslocamento = useRef({ x: 0, y: 0 });
  const arrastoRef = useRef<Arrasto | null>(null);
  const rolagem = useRef(0);
  /** Este gesto virou arrasto? Decide se o clique que vem depois vale. */
  const arrastou = useRef(false);

  arrastoRef.current = arrasto;

  const comecar = useCallback(
    (e: React.PointerEvent<HTMLElement>, card: TaskCard) => {
      if (!ativo || e.button !== 0) return;
      if (!podeIniciarArrasto(e.target as Element)) return;

      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      deslocamento.current = { x: e.clientX - r.left, y: e.clientY - r.top };
      inicio.current = { x: e.clientX, y: e.clientY, card, alvoEl: el };
    },
    [ativo],
  );

  const cancelar = useCallback(() => {
    inicio.current = null;
    setArrasto(null);
  }, []);

  useEffect(() => {
    function localizar(x: number, y: number): Alvo | null {
      // elementsFromPoint atravessa o card flutuante (que e pointer-events:none)
      // e enxerga a coluna por baixo.
      for (const el of document.elementsFromPoint(x, y)) {
        const cardEl = (el as HTMLElement).closest<HTMLElement>("[data-card-indice]");
        if (cardEl) {
          const colunaId = cardEl.dataset.colunaId!;
          const i = Number(cardEl.dataset.cardIndice);
          const r = cardEl.getBoundingClientRect();
          // Metade de cima = antes dele; metade de baixo = depois.
          return { colunaId, indice: y < r.top + r.height / 2 ? i : i + 1 };
        }
        const colunaEl = (el as HTMLElement).closest<HTMLElement>("[data-coluna-id]");
        if (colunaEl) {
          return {
            colunaId: colunaEl.dataset.colunaId!,
            indice: Number(colunaEl.dataset.colunaTotal),
          };
        }
      }
      return null;
    }

    function mover(e: PointerEvent) {
      const ini = inicio.current;
      if (!ini) return;

      const atual = arrastoRef.current;
      if (!atual) {
        const dist = Math.hypot(e.clientX - ini.x, e.clientY - ini.y);
        if (dist < LIMIAR_PX) return;

        // Passou do limiar: o que vier depois e arrasto, nao clique.
        arrastou.current = true;

        const r = ini.alvoEl.getBoundingClientRect();
        setArrasto({
          card: ini.card,
          x: e.clientX - deslocamento.current.x,
          y: e.clientY - deslocamento.current.y,
          largura: r.width,
          altura: r.height,
          alvo: localizar(e.clientX, e.clientY),
        });
        return;
      }

      setArrasto({
        ...atual,
        x: e.clientX - deslocamento.current.x,
        y: e.clientY - deslocamento.current.y,
        alvo: localizar(e.clientX, e.clientY),
      });

      // Board largo: chegar na borda com o card na mao precisa rolar sozinho.
      const faixa = document.querySelector<HTMLElement>("[data-board-rolagem]");
      if (faixa) {
        const r = faixa.getBoundingClientRect();
        if (e.clientX > r.right - BORDA_AUTOSCROLL) rolagem.current = VELOCIDADE_AUTOSCROLL;
        else if (e.clientX < r.left + BORDA_AUTOSCROLL) rolagem.current = -VELOCIDADE_AUTOSCROLL;
        else rolagem.current = 0;
      }
    }

    function soltar() {
      const atual = arrastoRef.current;
      inicio.current = null;
      rolagem.current = 0;

      if (atual?.alvo) aoSoltar(atual.alvo.colunaId, atual.alvo.indice, atual.card);
      setArrasto(null);
    }

    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") cancelar();
    }

    /**
     * O navegador dispara `click` depois do pointerup, no ancestral comum entre
     * onde o gesto comecou e onde terminou. Sem isto, arrastar um card pelo
     * titulo abriria a rotina ao soltar - e o card teria se movido no caminho.
     *
     * Na fase de CAPTURA e antes de qualquer handler: o <Link> do Next escuta
     * na fase de bolha, e ai ja seria tarde para impedir a navegacao.
     */
    function cliqueDepoisDoArrasto(e: MouseEvent) {
      if (!arrastou.current) return;
      arrastou.current = false;
      e.preventDefault();
      e.stopPropagation();
    }

    /**
     * Zera a marca a cada aperto novo, em qualquer lugar da pagina. Soltar o
     * botao fora da janela nao gera clique nenhum, e sem isto a marca ficaria
     * presa em `true` e engoliria o proximo clique legitimo - num filtro, num
     * botao, onde fosse. Na captura, para rodar antes do `comecar`.
     */
    function novoGesto() {
      arrastou.current = false;
    }

    /**
     * `<a>` e arrastavel por padrao. Quando o gesto comeca no titulo, o
     * navegador quer levar o link com a imagem-fantasma dele e manda
     * pointercancel, matando o nosso arrasto pela metade.
     */
    function semArrastoNativo(e: DragEvent) {
      if (inicio.current) e.preventDefault();
    }

    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", cancelar);
    window.addEventListener("keydown", tecla);
    window.addEventListener("click", cliqueDepoisDoArrasto, true);
    window.addEventListener("pointerdown", novoGesto, true);
    window.addEventListener("dragstart", semArrastoNativo);
    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", cancelar);
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("click", cliqueDepoisDoArrasto, true);
      window.removeEventListener("pointerdown", novoGesto, true);
      window.removeEventListener("dragstart", semArrastoNativo);
    };
  }, [aoSoltar, cancelar]);

  // Rolagem automatica num loop proprio: presa ao pointermove, ela pararia
  // sempre que o cursor ficasse parado na borda.
  useEffect(() => {
    if (!arrasto) return;
    let id = 0;
    const passo = () => {
      if (rolagem.current !== 0) {
        document
          .querySelector<HTMLElement>("[data-board-rolagem]")
          ?.scrollBy({ left: rolagem.current });
      }
      id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [arrasto]);

  // Arrastar nao pode selecionar texto nem virar gesto de rolagem no toque.
  useEffect(() => {
    if (!arrasto) return;
    const corpo = document.body.style;
    const anterior = { userSelect: corpo.userSelect, cursor: corpo.cursor, touch: corpo.touchAction };
    corpo.userSelect = "none";
    corpo.cursor = "grabbing";
    corpo.touchAction = "none";
    return () => {
      corpo.userSelect = anterior.userSelect;
      corpo.cursor = anterior.cursor;
      corpo.touchAction = anterior.touch;
    };
  }, [arrasto]);

  return { arrasto, comecar, cancelar };
}
