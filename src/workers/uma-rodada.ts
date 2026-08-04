import "../db/load-env";

import { pool } from "@/db/client";
import { processarFila } from "@/services/outbox";

/**
 * Uma rodada so e sai: `npm run outbox:once`.
 * Serve para testar as regras de notificacao sem deixar o worker no ar, e para
 * quem preferir agendar a fila no Agendador de Tarefas em vez de manter processo.
 */
const r = await processarFila();
console.log(`enviados=${r.enviados} falhas=${r.falhas} desistencias=${r.desistencias}`);
await pool.end();
