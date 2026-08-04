/**
 * A conexao fixa time_zone='+00:00' e as colunas sao datetime(3) com
 * `dateStrings: true`. Entao tudo que atravessa a fronteira do banco e a string
 * "YYYY-MM-DD HH:MM:SS.mmm" em UTC - nunca um Date, nunca fuso local.
 * Formatar para o fuso do usuario e trabalho da camada de apresentacao.
 */

export function paraMysql(d: Date = new Date()): string {
  return d.toISOString().slice(0, 23).replace("T", " ");
}

export function agoraMysql(): string {
  return paraMysql();
}

export function somarDias(dias: number, base: Date = new Date()): Date {
  return new Date(base.getTime() + dias * 86_400_000);
}

export function somarMinutos(min: number, base: Date = new Date()): Date {
  return new Date(base.getTime() + min * 60_000);
}

/** String do banco -> Date. Sem o "Z" o JS interpretaria como horario local. */
export function deMysql(v: string): Date {
  return new Date(`${v.replace(" ", "T")}Z`);
}

const FUSO = "America/Sao_Paulo";

export function formatarData(v: string | null): string {
  if (!v) return "--";
  return deMysql(v).toLocaleDateString("pt-BR", { timeZone: FUSO });
}

export function formatarDataHora(v: string | null): string {
  if (!v) return "--";
  return deMysql(v).toLocaleString("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Dias corridos desde a data. E o contador de card envelhecido no Kanban. */
export function diasCorridos(v: string | null, ate: Date = new Date()): number | null {
  if (!v) return null;
  return Math.floor((ate.getTime() - deMysql(v).getTime()) / 86_400_000);
}

export function humanizarDias(dias: number): string {
  if (dias <= 0) return "hoje";
  if (dias === 1) return "1 dia";
  return `${dias} dias`;
}
