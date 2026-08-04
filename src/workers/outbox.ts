import "../db/load-env";

import { pool } from "@/db/client";
import { OUTBOX_INTERVALO_MS } from "@/domain";
import { smtpConfigurado } from "@/lib/mailer";
import { processarFila } from "@/services/outbox";

/**
 * Processo separado do servidor web: `npm run worker`.
 * Uma rodada a cada 30s, sem sobrepor rodadas - se uma demorar, a proxima espera.
 */

let rodando = true;

async function rodada(): Promise<void> {
  try {
    const r = await processarFila();
    if (r.enviados || r.falhas || r.desistencias) {
      console.log(
        `[outbox] enviados=${r.enviados} falhas=${r.falhas} desistencias=${r.desistencias}`,
      );
    }
  } catch (e) {
    // Uma rodada ruim nao derruba o worker: a proxima tenta de novo.
    console.error("[outbox] rodada falhou:", e instanceof Error ? e.message : e);
  }
}

async function main(): Promise<void> {
  console.log(
    smtpConfigurado()
      ? `[outbox] worker no ar - rodada a cada ${OUTBOX_INTERVALO_MS / 1000}s`
      : `[outbox] worker no ar SEM SMTP - as mensagens sao registradas no console e marcadas como enviadas`,
  );

  while (rodando) {
    await rodada();
    await new Promise((r) => setTimeout(r, OUTBOX_INTERVALO_MS));
  }

  await pool.end();
  console.log("[outbox] worker encerrado");
}

for (const sinal of ["SIGINT", "SIGTERM"] as const) {
  process.on(sinal, () => {
    console.log(`\n[outbox] ${sinal} recebido, terminando a rodada atual...`);
    rodando = false;
  });
}

void main();
