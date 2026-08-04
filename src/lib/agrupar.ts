import {
  COR_NEUTRA_COLUNA,
  COR_PRIORIDADE,
  PRIORIDADES,
  ROTULO_PRIORIDADE,
  type AgrupamentoKanban,
  type BoardColumn,
  type TaskCard,
} from "@/domain";

/**
 * Uma coluna do board, ja resolvida. Vale tanto para o agrupamento por etapa
 * (onde vem de board_columns) quanto para os demais, que sao derivados dos cards.
 */
export interface GrupoDoQuadro {
  /** id real da coluna quando o agrupamento e por etapa; senao, uma chave sintetica. */
  id: string;
  nome: string;
  cor: string;
  wipLimit: number | null;
  cards: TaskCard[];
}

function porRank(a: TaskCard, b: TaskCard): number {
  return a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0;
}

/**
 * Divide os cards em colunas conforme o eixo escolhido.
 *
 * So o agrupamento por etapa devolve colunas vindas do banco - inclusive as
 * vazias, que precisam existir para se poder arrastar um card para dentro delas.
 * Os outros eixos derivam as colunas dos proprios cards, entao um responsavel
 * sem nada atribuido simplesmente nao aparece.
 */
export function agruparCards(
  cards: TaskCard[],
  colunas: BoardColumn[],
  eixo: AgrupamentoKanban,
): GrupoDoQuadro[] {
  if (eixo === "etapa") {
    return colunas.map((c) => ({
      id: c.id,
      nome: c.nome,
      cor: c.cor,
      wipLimit: c.wipLimit,
      cards: cards.filter((k) => k.columnId === c.id).sort(porRank),
    }));
  }

  if (eixo === "prioridade") {
    // Ordem fixa e da mais urgente para a menos: e a leitura util aqui.
    return [...PRIORIDADES]
      .reverse()
      .map((p) => ({
        id: `prio:${p}`,
        nome: ROTULO_PRIORIDADE[p],
        cor: COR_PRIORIDADE[p],
        wipLimit: null,
        cards: cards.filter((k) => k.prioridade === p).sort(porRank),
      }))
      .filter((g) => g.cards.length > 0);
  }

  if (eixo === "etiqueta") {
    const grupos = new Map<string, GrupoDoQuadro>();
    for (const card of cards) {
      // Um card com tres etiquetas aparece nas tres colunas. E o comportamento
      // esperado num agrupamento N:N - a soma das colunas nao e o total de cards.
      for (const e of card.etiquetas) {
        const g = grupos.get(e.id) ?? {
          id: `etq:${e.id}`,
          nome: e.nome,
          cor: e.cor,
          wipLimit: null,
          cards: [],
        };
        g.cards.push(card);
        grupos.set(e.id, g);
      }
    }
    const semEtiqueta = cards.filter((k) => k.etiquetas.length === 0);
    const lista = [...grupos.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    if (semEtiqueta.length > 0) {
      lista.push(grupoSem("Sem etiqueta", semEtiqueta));
    }
    return lista.map((g) => ({ ...g, cards: g.cards.sort(porRank) }));
  }

  // Responsavel e cliente seguem a mesma forma: chave + rotulo vindos do card.
  const chave = (k: TaskCard) =>
    eixo === "responsavel" ? k.responsavel?.id : (k.clienteId ?? undefined);
  const rotulo = (k: TaskCard) =>
    eixo === "responsavel" ? (k.responsavel?.nome ?? "") : (k.cliente ?? "");

  const grupos = new Map<string, GrupoDoQuadro>();
  const semDono: TaskCard[] = [];

  for (const card of cards) {
    const id = chave(card);
    if (id === undefined) {
      semDono.push(card);
      continue;
    }
    const g = grupos.get(id) ?? {
      id: `${eixo}:${id}`,
      nome: rotulo(card),
      cor: COR_NEUTRA_COLUNA,
      wipLimit: null,
      cards: [],
    };
    g.cards.push(card);
    grupos.set(id, g);
  }

  const lista = [...grupos.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  if (semDono.length > 0) {
    lista.push(grupoSem(eixo === "responsavel" ? "Sem responsavel" : "Sem cliente", semDono));
  }
  return lista.map((g) => ({ ...g, cards: g.cards.sort(porRank) }));
}

/** A coluna do que falta preencher fica sempre por ultimo, com cor de alerta suave. */
function grupoSem(nome: string, cards: TaskCard[]): GrupoDoQuadro {
  return { id: `sem:${nome}`, nome, cor: "var(--prio-media)", wipLimit: null, cards };
}
