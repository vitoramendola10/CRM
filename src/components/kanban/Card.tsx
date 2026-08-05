import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { COR_PRIORIDADE, DIAS_CARD_ENVELHECIDO, type TaskCard } from "@/domain";
import { diasCorridos, formatarData, humanizarDias } from "@/lib/datas";
import { AssumirTask } from "./AssumirTask";

/**
 * A ordem dos campos e a ordem de leitura pedida: Solicitacao, Assunto, Cliente,
 * Responsavel, Status, Inicio. O assunto e o que se le primeiro; o resto e contexto.
 */
export function Card({
  card,
  arrastavel = true,
}: {
  card: TaskCard;
  arrastavel?: boolean;
}) {
  const dias = diasCorridos(card.inicio);
  const velho = dias !== null && dias > DIAS_CARD_ENVELHECIDO;

  return (
    <article
      /* O card continua inteiro enquanto e arrastado - quem o desenha na mao e
         o Quadro, com este mesmo componente. O cursor de mao so aparece quando
         arrastar de fato faz alguma coisa. */
      /* `select-none` so quando arrastavel: o gesto comeca em cima de texto, e
         sem isso o navegador comeca a marcar o texto antes de o arrasto passar
         do limiar - a marcacao azul aparece por um instante e o card parece
         travado. Onde nao se arrasta, o texto continua selecionavel. */
      className={`transicao relative rounded-sm border border-linha bg-papel-alto py-2 pl-3 pr-2.5 hover:border-linha-forte hover:shadow-hover ${
        arrastavel ? "cursor-grab select-none active:cursor-grabbing" : ""
      }`}
    >
      {/* Barra lateral = prioridade. Unica cor sempre presente no card. */}
      <span
        aria-label={`Prioridade ${card.prioridade}`}
        className="absolute inset-y-0 left-0 w-[3px] rounded-l-sm"
        style={{ backgroundColor: COR_PRIORIDADE[card.prioridade] }}
      />

      <header className="mb-1 flex items-baseline gap-2">
        <span className="num text-[11px] text-tinta-fraca">
          {card.solicitacao === null ? (
            <span title="Rotina criada direto no board, sem chamado">DEV-{card.codigo}</span>
          ) : (
            <span title={`Chamado ${card.solicitacao}`}>#{card.solicitacao}</span>
          )}
        </span>

        {/* Bloqueio antes de tudo: uma rotina travada nao deve ser puxada, e
            descobrir isso so ao abrir o card e descobrir tarde demais. */}
        {card.bloqueios > 0 && (
          <span
            title={`Espera ${card.bloqueios} rotina${card.bloqueios === 1 ? "" : "s"} que ainda nao foi entregue`}
            className="num shrink-0 rounded-xs bg-prio-urgente/15 px-1 text-[10px] font-medium text-prio-urgente"
          >
            travada {card.bloqueios > 1 && `(${card.bloqueios})`}
          </span>
        )}
        {card.cliente && (
          <span className="ml-auto truncate text-[11px] text-tinta-fraca" title={card.cliente}>
            {card.cliente}
          </span>
        )}
      </header>

      <Link
        href={`/kanban/${card.codigo}`}
        /* Link e arrastavel por padrao no navegador. Como o titulo ocupa a
           largura toda do card, e por ele que quase todo arrasto comeca - e o
           arrasto nativo do link roubaria o gesto. */
        draggable={false}
        className="mb-2 block text-[13px] font-medium leading-snug hover:text-acento"
      >
        {card.assunto}
      </Link>

      {/* So a cor e o nome curto: o card ja e denso, etiqueta aqui e referencia
          rapida, nao informacao para ler com atencao. */}
      {card.etiquetas.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1">
          {card.etiquetas.map((e) => (
            <li
              key={e.id}
              title={e.nome}
              className="cor-legivel rounded-xs px-1 text-[10px] leading-[14px]"
              style={
                {
                  "--cor-base": e.cor,
                  backgroundColor: `color-mix(in srgb, ${e.cor} 14%, transparent)`,
                } as React.CSSProperties
              }
            >
              {e.nome}
            </li>
          ))}
        </ul>
      )}

      <footer className="flex items-center gap-2">
        {/* Rotina sem dono ganha um botao no lugar do avatar tracejado. O
            tracejado sozinho era discreto demais numa coluna cheia, e nao
            oferecia saida: dava para ver o problema e nao para resolver. */}
        {card.responsavel === null ? (
          <AssumirTask taskId={card.id} compacto />
        ) : (
          <Avatar nome={card.responsavel.nome} tamanho={20} />
        )}

        <span
          className="cor-legivel truncate text-[11px]"
          style={{ "--cor-base": card.status.cor } as React.CSSProperties}
          title={card.status.nome}
        >
          {card.status.nome}
        </span>

        {card.estimativaH !== null && (
          <span
            title={`Estimativa de ${card.estimativaH}h`}
            className="num shrink-0 text-[11px] text-tinta-fraca"
          >
            {card.estimativaH}h
          </span>
        )}

        <span
          className={`num ml-auto shrink-0 text-[11px] ${
            velho ? "font-medium text-prio-alta" : "text-tinta-fraca"
          }`}
          title={
            card.inicio === null
              ? "Ainda nao entrou em andamento"
              : `Iniciado em ${formatarData(card.inicio)}`
          }
        >
          {dias === null ? "--" : `${formatarData(card.inicio)} · ${humanizarDias(dias)}`}
        </span>
      </footer>
    </article>
  );
}
