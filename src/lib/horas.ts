/**
 * Tempo digitado por gente, convertido para minutos.
 *
 * Ninguem aponta "0.75": aponta "45m", "1h30", "1:30" ou "2". Obrigar decimal
 * e o jeito mais rapido de fazer as pessoas pararem de apontar - e apontamento
 * que ninguem preenche nao vira relatorio nenhum.
 *
 * Numero solto e HORA, nao minuto: "2" e duas horas. E a leitura que quase
 * todo mundo faz, e a minoria que queria dois minutos escreve "2m".
 */
export function paraMinutos(bruto: string): number | null {
  const t = bruto.trim().toLowerCase().replace(",", ".");
  if (t === "") return null;

  // "1:30"
  const doisPontos = /^(\d+):([0-5]?\d)$/.exec(t);
  if (doisPontos) return Number(doisPontos[1]) * 60 + Number(doisPontos[2]);

  // "1h30", "1h", "1h 30m"
  const comH = /^(\d+)\s*h\s*(\d+)?\s*m?$/.exec(t);
  if (comH) return Number(comH[1]) * 60 + Number(comH[2] ?? 0);

  // "45m"
  const soM = /^(\d+)\s*m$/.exec(t);
  if (soM) return Number(soM[1]);

  // "2" ou "1.5" - em horas.
  const soNumero = /^(\d+(?:\.\d+)?)$/.exec(t);
  if (soNumero) return Math.round(Number(soNumero[1]) * 60);

  return null;
}

/** Minutos -> "1h30", "45min", "8h". O que se le num relatorio. */
export function formatarMinutos(minutos: number): string {
  if (minutos < 60) return `${minutos}min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}
