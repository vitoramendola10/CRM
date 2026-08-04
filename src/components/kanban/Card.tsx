import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { COR_PRIORIDADE, DIAS_CARD_ENVELHECIDO, type TaskCard } from "@/domain";
import { diasCorridos, formatarData, humanizarDias } from "@/lib/datas";

/**
 * A ordem dos campos e a ordem de leitura pedida: Solicitacao, Assunto, Cliente,
 * Responsavel, Status, Inicio. O assunto e o que se le primeiro; o resto e contexto.
 */
export function Card({
  card,
  arrastando = false,
  arrastavel = true,
}: {
  card: TaskCard;
  arrastando?: boolean;
  arrastavel?: boolean;
}) {
  const dias = diasCorridos(card.inicio);
  const velho = dias !== null && dias > DIAS_CARD_ENVELHECIDO;

  return (
    <article
      /* Enquanto arrasta, o lugar de origem vira um contorno tracejado vazio -
         le como "isto esta saindo daqui", nao como card meio apagado. O cursor
         de mao so aparece quando arrastar de fato faz alguma coisa. */
      className={`transicao relative rounded-sm border py-2 pl-3 pr-2.5 ${
        arrastavel ? "cursor-grab active:cursor-grabbing" : ""
      } ${
        arrastando
          ? "border-dashed border-linha-forte bg-papel-baixo/40 opacity-45 [&_*]:invisible"
          : "border-linha bg-papel-alto hover:border-linha-forte hover:shadow-hover"
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
        {card.cliente && (
          <span className="ml-auto truncate text-[11px] text-tinta-fraca" title={card.cliente}>
            {card.cliente}
          </span>
        )}
      </header>

      <Link
        href={`/kanban/${card.codigo}`}
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
              className="rounded-xs px-1 text-[10px] leading-[14px]"
              style={{
                color: e.cor,
                backgroundColor: `color-mix(in srgb, ${e.cor} 12%, transparent)`,
              }}
            >
              {e.nome}
            </li>
          ))}
        </ul>
      )}

      <footer className="flex items-center gap-2">
        <Avatar nome={card.responsavel?.nome ?? null} tamanho={20} />

        <span
          className="truncate text-[11px]"
          style={{ color: card.status.cor }}
          title={card.status.nome}
        >
          {card.status.nome}
        </span>

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
