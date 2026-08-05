"use client";

import { useEffect, useState } from "react";

/**
 * Preferencia de visualizacao guardada no proprio navegador.
 *
 * Por que localStorage e nao a URL: isto e como a PESSOA gosta de olhar o
 * board, nao o que ela quer mostrar para alguem. Quem trabalha sempre na
 * propria fila espera achar "Minhas" ligado ao voltar amanha, inclusive
 * clicando no menu - e um parametro de URL se perderia nesse clique.
 *
 * O preco e uma piscada: o servidor nao tem como saber a preferencia, entao a
 * primeira pintura sai no padrao e o valor guardado entra logo depois. Para um
 * filtro de lista isso e aceitavel; para o tema nao seria, e por isso o tema
 * usa outro caminho (o script em lib/tema.ts, que roda antes da pintura).
 */
export function usePreferencia<T extends string>(
  chave: string,
  inicial: T,
  valido: readonly T[],
): [T, (v: T) => void] {
  const [valor, setValor] = useState<T>(inicial);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(`crm.${chave}`);
      // Confere contra a lista: valor de uma versao antiga do sistema, ou
      // editado na mao no devtools, nao pode quebrar a tela.
      if (guardado !== null && (valido as readonly string[]).includes(guardado)) {
        setValor(guardado as T);
      }
    } catch {
      // localStorage bloqueado (aba anonima, politica do navegador): segue no
      // padrao. Preferencia de tela nao vale derrubar o board.
    }
  }, [chave, valido]);

  return [
    valor,
    (v: T) => {
      setValor(v);
      try {
        localStorage.setItem(`crm.${chave}`, v);
      } catch {
        // Idem: nao lembrar e pior que nada, mas nao e erro para o usuario.
      }
    },
  ];
}
