/**
 * Alcancabilidade num grafo dirigido. Existe para uma pergunta so: antes de
 * gravar "X depende de Y", Y ja alcanca X? Se alcanca, a aresta nova fecharia
 * um circulo e as rotinas envolvidas nunca mais andariam.
 *
 * Fica em lib/ e nao no service porque e logica pura - e porque service importa
 * o cliente do banco, o que tornaria isto impossivel de testar sem conexao.
 */
export interface Aresta {
  taskId: string;
  dependeDeId: string;
}

/** Andando pelas arestas a partir de `de`, chega-se em `ate`? */
export function alcanca(arestas: readonly Aresta[], de: string, ate: string): boolean {
  if (de === ate) return true;

  const saidas = new Map<string, string[]>();
  for (const a of arestas) {
    const lista = saidas.get(a.taskId);
    if (lista) lista.push(a.dependeDeId);
    else saidas.set(a.taskId, [a.dependeDeId]);
  }

  /**
   * Busca em largura com conjunto de visitados. O conjunto nao e otimizacao: e
   * o que impede a propria busca entrar em loop se ja existir um ciclo gravado
   * - por import, por SQL na mao, ou por uma versao anterior sem esta trava.
   */
  const vistos = new Set<string>([de]);
  const fila = [de];

  while (fila.length > 0) {
    const atual = fila.shift()!;
    for (const proximo of saidas.get(atual) ?? []) {
      if (proximo === ate) return true;
      if (vistos.has(proximo)) continue;
      vistos.add(proximo);
      fila.push(proximo);
    }
  }
  return false;
}
