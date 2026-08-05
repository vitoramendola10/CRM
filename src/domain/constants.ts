import type {
  AgrupamentoKanban,
  BoardColumn,
  CanalTicket,
  CategoriaStatus,
  DestinoNotificacao,
  EventoNotificacao,
  Papel,
  Prioridade,
  SituacaoOutbox,
  SituacaoTicket,
  TipoBoard,
} from "./types";

/**
 * Estas listas sao a unica fonte de valores de enum do sistema.
 * Elas alimentam o zod, o schema do banco e os selects da UI ao mesmo tempo:
 * acrescentar um valor aqui e um erro de compilacao em todo lugar que faltar tratar.
 */

export const PAPEIS = ["admin", "gestor", "suporte", "dev"] as const satisfies readonly Papel[];

export const CATEGORIAS_STATUS = [
  "aberto",
  "andamento",
  "concluido",
  "cancelado",
] as const satisfies readonly CategoriaStatus[];

export const PRIORIDADES = [
  "baixa",
  "media",
  "alta",
  "urgente",
] as const satisfies readonly Prioridade[];

export const SITUACOES_TICKET = [
  "aberto",
  "em_atendimento",
  "aguardando_cliente",
  "aguardando_dev",
  "resolvido",
  "cancelado",
] as const satisfies readonly SituacaoTicket[];

/**
 * Situacoes que contam como chamado encerrado. E o que decide se `fechado_em`
 * recebe carimbo, e por consequencia o que entra em qualquer medida de tempo de
 * atendimento. Fica no dominio para o banco, o relatorio e a tela lerem a mesma
 * lista - somar "resolvido" e esquecer "cancelado" e o jeito classico de um
 * indicador ficar 10% otimista sem ninguem notar.
 */
export const SITUACOES_FECHADAS = [
  "resolvido",
  "cancelado",
] as const satisfies readonly SituacaoTicket[];

export function situacaoEhFechada(s: SituacaoTicket): boolean {
  return (SITUACOES_FECHADAS as readonly SituacaoTicket[]).includes(s);
}

export const CANAIS_TICKET = [
  "manual",
  "telefone",
  "whatsapp",
  "email",
] as const satisfies readonly CanalTicket[];

export const TIPOS_BOARD = ["dev", "suporte"] as const satisfies readonly TipoBoard[];

export const EVENTOS_NOTIFICACAO = [
  "task_criada",
  "task_concluida",
  "task_atribuida",
  "task_comentada",
  "ticket_aberto",
  "ticket_mencionado",
] as const satisfies readonly EventoNotificacao[];

export const DESTINOS_NOTIFICACAO = [
  "papel",
  "usuarios",
  "responsavel",
  /**
   * Quem foi citado com @ no texto. Diferente dos outros: o destinatario nao
   * esta na regra, esta no CONTEUDO do que acabou de ser escrito - por isso a
   * regra so diz "avise quem foi citado" e quem resolve os nomes e o service.
   */
  "mencionados",
] as const satisfies readonly DestinoNotificacao[];

/**
 * Quem passou a ser citado de um texto para o outro.
 *
 * Existe por causa de campo que se edita muitas vezes: descricao e passos sao
 * salvos junto com o formulario inteiro, e avisar todos os citados a cada
 * salvamento mandaria cinco e-mails da MESMA citacao para a mesma pessoa. Aqui
 * so entra quem ainda nao estava la.
 */
export function mencoesNovas(antes: string | null, depois: string | null): string[] {
  const antigas = new Set(extrairMencoes(antes ?? ""));
  return extrairMencoes(depois ?? "").filter((u) => !antigas.has(u));
}

/**
 * Quem foi citado num texto. Aceita o `@` colado no nome de usuario, do jeito
 * que se escreve: "@vitor, qual versao?" - a virgula nao entra no nome.
 *
 * Devolve em minusculas e sem repetir: citar a mesma pessoa duas vezes no
 * mesmo comentario nao manda dois e-mails.
 */
export function extrairMencoes(texto: string): string[] {
  const achados = texto.match(/@[a-zA-Z0-9._-]+/g) ?? [];
  const nomes = achados
    .map((m) =>
      m
        .slice(1)
        /**
         * Tira ponto, hifen e underline do FIM. Eles valem dentro do nome
         * ("ana.paula", "jose-luis"), mas "@ana." no fim da frase e a pessoa
         * ana seguida de um ponto final - e ninguem escreve "@ana ." so para
         * o sistema entender.
         */
        .replace(/[._-]+$/, "")
        .toLowerCase(),
    )
    .filter((n) => n !== "");
  return [...new Set(nomes)];
}

export const SITUACOES_OUTBOX = [
  "pendente",
  "enviado",
  "erro",
] as const satisfies readonly SituacaoOutbox[];

// ------------------------------------------------------------------
// Rotulos de tela. A UI nunca escreve o texto de um enum na mao.
// ------------------------------------------------------------------

export const ROTULO_PAPEL: Record<Papel, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  suporte: "Suporte",
  dev: "Desenvolvimento",
};

export const ROTULO_CATEGORIA: Record<CategoriaStatus, string> = {
  aberto: "Aberto",
  andamento: "Em andamento",
  concluido: "Concluido",
  cancelado: "Cancelado",
};

export const ROTULO_PRIORIDADE: Record<Prioridade, string> = {
  baixa: "Baixa",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
};

export const ROTULO_SITUACAO_TICKET: Record<SituacaoTicket, string> = {
  aberto: "Aberto",
  em_atendimento: "Em atendimento",
  aguardando_cliente: "Aguardando cliente",
  aguardando_dev: "Aguardando desenvolvimento",
  resolvido: "Resolvido",
  cancelado: "Cancelado",
};

export const ROTULO_CANAL: Record<CanalTicket, string> = {
  manual: "Manual",
  telefone: "Telefone",
  whatsapp: "WhatsApp",
  email: "E-mail",
};

export const ROTULO_EVENTO: Record<EventoNotificacao, string> = {
  task_criada: "Rotina criada",
  task_concluida: "Rotina concluida",
  task_atribuida: "Rotina atribuida",
  task_comentada: "Alguem citado num comentario",
  ticket_aberto: "Chamado aberto",
  ticket_mencionado: "Alguem citado num chamado",
};

// ------------------------------------------------------------------
// Cores semanticas. Cor so aparece onde significa alguma coisa.
// Sao os valores gravados no banco (board_columns.cor, task_statuses.cor),
// por isso vivem aqui e nao no CSS.
// ------------------------------------------------------------------

/**
 * Prioridade e enum fixo, entao a cor aponta para a variavel do tema em vez de
 * um hex - assim ela acompanha claro/escuro sem cada tela saber disso.
 * O mesmo NAO vale para COR_CATEGORIA e COR_NEUTRA_COLUNA logo abaixo: aquelas
 * sao gravadas no banco pelo seed e precisam ser um valor de verdade.
 */
export const COR_PRIORIDADE: Record<Prioridade, string> = {
  baixa: "var(--prio-baixa)",
  media: "var(--prio-media)",
  alta: "var(--prio-alta)",
  urgente: "var(--prio-urgente)",
};

export const COR_CATEGORIA: Record<CategoriaStatus, string> = {
  aberto: "#8d8577",
  andamento: "#3f6ea8",
  concluido: "#4a7c59",
  cancelado: "#9b5b52",
};

/** Situacao de chamado e enum fixo: cor do tema, nunca do banco. */
export const COR_SITUACAO_TICKET: Record<SituacaoTicket, string> = {
  aberto: "var(--cat-aberto)",
  em_atendimento: "var(--cat-andamento)",
  aguardando_cliente: "var(--prio-media)",
  aguardando_dev: "var(--acento)",
  resolvido: "var(--cat-concluido)",
  cancelado: "var(--cat-cancelado)",
};

export const COR_NEUTRA_COLUNA = "#8d8577";

// ------------------------------------------------------------------
// Rotas e permissoes
// ------------------------------------------------------------------

export const ROTAS = {
  login: "/login",
  kanban: "/kanban",
  atendimentos: "/atendimentos",
  dashboard: "/dashboard",
  config: "/config",
  conta: "/conta",
  busca: "/busca",
} as const;

/**
 * O literal de cada rota, nao `string`. E o que faz o typedRoutes do Next
 * conseguir conferir <Link> e redirect() mesmo com a rota vindo do dominio.
 */
export type Rota = (typeof ROTAS)[keyof typeof ROTAS];

/** Para onde cada papel cai depois do login. */
export const ROTA_INICIAL: Record<Papel, Rota> = {
  admin: ROTAS.dashboard,
  gestor: ROTAS.dashboard,
  suporte: ROTAS.atendimentos,
  dev: ROTAS.kanban,
};

/** Quem enxerga cada area. O middleware da etapa 2 le exatamente isto. */
export const PAPEIS_POR_ROTA: Record<string, readonly Papel[]> = {
  [ROTAS.kanban]: ["admin", "gestor", "suporte", "dev"],
  [ROTAS.atendimentos]: ["admin", "gestor", "suporte", "dev"],
  [ROTAS.dashboard]: ["admin", "gestor"],
  // Inclui /config/clientes: o cadastro de cliente e configuracao do sistema.
  [ROTAS.config]: ["admin", "gestor"],
  // Listada mesmo liberando todo mundo: `podeAcessar` deixa passar o que nao
  // esta aqui, entao sem esta linha a permissao de /conta seria um silencio, e
  // nao uma decisao. Vale para /api/conta/* pelo espelhamento do middleware.
  [ROTAS.conta]: PAPEIS,
  // A busca e aberta a todos, mas devolve so o que cada papel ja poderia ver:
  // cliente e cadastro de configuracao e fica de fora para suporte e dev.
  [ROTAS.busca]: PAPEIS,
};

export const AGRUPAMENTOS_KANBAN = [
  "etapa",
  "responsavel",
  "prioridade",
  "cliente",
  "etiqueta",
] as const satisfies readonly AgrupamentoKanban[];

export const ROTULO_AGRUPAMENTO: Record<AgrupamentoKanban, string> = {
  etapa: "Etapa",
  responsavel: "Responsavel",
  prioridade: "Prioridade",
  cliente: "Cliente",
  etiqueta: "Etiqueta",
};

/** Abas de visualizacao do board. Sao a mesma consulta, exibida de tres jeitos. */
export const VISOES_KANBAN = [
  { href: "/kanban", rotulo: "Quadro" },
  { href: "/kanban/calendario", rotulo: "Calendario" },
  { href: "/kanban/gantt", rotulo: "Gantt" },
] as const;

/** A barra de navegacao e isto filtrado por `podeAcessar`. Ordem = ordem de exibicao. */
export const NAVEGACAO: readonly { href: Rota; rotulo: string }[] = [
  { href: ROTAS.kanban, rotulo: "Kanban" },
  { href: ROTAS.atendimentos, rotulo: "Atendimentos" },
  { href: ROTAS.dashboard, rotulo: "Dashboard" },
  { href: ROTAS.config, rotulo: "Configuracao" },
];

/** Abas de /config. Sao sub-rotas, entao herdam a permissao de ROTAS.config. */
export const ABAS_CONFIG = [
  { href: "/config/clientes", rotulo: "Clientes" },
  { href: "/config/colunas", rotulo: "Etapas do processo" },
  { href: "/config/status", rotulo: "Status" },
  { href: "/config/tipos", rotulo: "Tipos de rotina" },
  { href: "/config/etiquetas", rotulo: "Etiquetas" },
  { href: "/config/respostas", rotulo: "Respostas prontas" },
  { href: "/config/usuarios", rotulo: "Usuarios" },
  { href: "/config/notificacoes", rotulo: "Notificacoes" },
] as const;

export function podeAcessar(papel: Papel, pathname: string): boolean {
  const rota = Object.keys(PAPEIS_POR_ROTA).find(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
  if (!rota) return true;
  return PAPEIS_POR_ROTA[rota]!.includes(papel);
}

// ------------------------------------------------------------------
// Etapas do processo -> categoria
// ------------------------------------------------------------------

/**
 * Coluna nao tem campo `categoria` - so status tem. A posicao dela no board e
 * que diz o significado: a primeira e a fila de entrada, a marcada com `isDone`
 * e a entrega, e tudo entre as duas e trabalho em andamento.
 *
 * E isto que decide quando `iniciadoEm` e preenchido, entao vive no dominio e
 * nao dentro do service: relatorio e Kanban precisam ler a mesma regra.
 */
export function categoriaDaColuna(
  coluna: Pick<BoardColumn, "id" | "ordem" | "isDone">,
  todas: readonly Pick<BoardColumn, "id" | "ordem" | "isDone">[],
): CategoriaStatus {
  if (coluna.isDone) return "concluido";
  const primeira = todas.reduce((a, b) => (a.ordem <= b.ordem ? a : b));
  return coluna.id === primeira.id ? "aberto" : "andamento";
}

// ------------------------------------------------------------------
// Regras de negocio numericas
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Anexos
// ------------------------------------------------------------------

/**
 * Teto por arquivo. Serve print, log e planilha - que e o que aparece num
 * atendimento. Video e instalador nao entram aqui: para isso existe link.
 *
 * O `max_allowed_packet` do MySQL nao limita nada disto (o arquivo nao passa
 * pelo banco), mas um proxy na frente da aplicacao pode ter limite proprio -
 * se um dia entrar nginx, `client_max_body_size` precisa acompanhar este valor.
 */
export const ANEXO_MAX_BYTES = 15 * 1024 * 1024;

/**
 * Tipos aceitos, e a extensao com que o arquivo e gravado em disco.
 *
 * E uma lista fechada, nao uma lista de bloqueio, porque o perigo aqui e servir
 * de volta um arquivo que o navegador execute no dominio da aplicacao. Por isso
 * ficam de fora `text/html` e `image/svg+xml`: SVG e XML, aceita <script>
 * dentro, e seria servido como imagem legitima.
 *
 * A extensao vem DAQUI e nunca do nome enviado: e o mapeamento que decide como
 * o arquivo se chama no disco.
 */
export const ANEXO_TIPOS: Readonly<Record<string, string>> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/zip": "zip",
  "application/msword": "doc",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

/** So imagem abre dentro da pagina; o resto sempre baixa. */
export function anexoEhImagem(tipoMime: string): boolean {
  return tipoMime.startsWith("image/") && tipoMime in ANEXO_TIPOS;
}

export function extensaoDoTipo(tipoMime: string): string | null {
  return ANEXO_TIPOS[tipoMime] ?? null;
}

/** "1,4 MB". Tamanho de arquivo em byte cru nao diz nada a ninguem. */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0).replace(".", ",")} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1).replace(".", ",")} MB`;
}

/** Card parado ha mais dias que isto ganha destaque de envelhecido no Kanban. */
export const DIAS_CARD_ENVELHECIDO = 14;

/**
 * Chamado aberto sem nenhum movimento ha mais dias que isto aparece destacado
 * na lista. Bem menor que o do Kanban de proposito: rotina de desenvolvimento
 * leva semanas por natureza, chamado de suporte parado tres dias e alguem
 * esperando resposta.
 */
export const DIAS_CHAMADO_PARADO = 3;

/** Worker de e-mail: quantidade por rodada e teto de tentativas antes de marcar erro. */
export const OUTBOX_LOTE = 20;
export const OUTBOX_MAX_TENTATIVAS = 5;
export const OUTBOX_INTERVALO_MS = 30_000;

export const SESSAO_DURACAO_DIAS = 7;
export const SESSAO_COOKIE = "crm_sessao";
