import { db } from "@/db/client";
import { marcarEnviado, marcarFalha, reservarLote } from "@/db/queries/notifications";
import { OUTBOX_LOTE, OUTBOX_MAX_TENTATIVAS } from "@/domain";
import { agoraMysql, paraMysql, somarMinutos } from "@/lib/datas";
import { enviarEmail } from "@/lib/mailer";

/**
 * Consumidor da fila de e-mail. Roda fora do request - o request so escreve na
 * outbox, dentro da transacao do fato que gerou a notificacao.
 *
 * SELECT ... FOR UPDATE SKIP LOCKED permite mais de um worker em paralelo sem
 * que dois peguem a mesma linha e sem que um espere o lock do outro.
 */

export interface ResultadoRodada {
  enviados: number;
  falhas: number;
  desistencias: number;
}

export async function processarFila(limite = OUTBOX_LOTE): Promise<ResultadoRodada> {
  const r: ResultadoRodada = { enviados: 0, falhas: 0, desistencias: 0 };

  await db.transaction(async (tx) => {
    const lote = await reservarLote(tx, agoraMysql(), limite);

    for (const msg of lote) {
      try {
        await enviarEmail({
          destinatarios: msg.destinatarios,
          assunto: msg.assunto,
          corpo: msg.corpo,
        });
        await marcarEnviado(tx, msg.id, agoraMysql());
        r.enviados++;
      } catch (e) {
        const tentativas = msg.tentativas + 1;
        const desistiu = tentativas >= OUTBOX_MAX_TENTATIVAS;

        await marcarFalha(tx, msg.id, {
          situacao: desistiu ? "erro" : "pendente",
          // Backoff exponencial: 2, 4, 8, 16 minutos.
          proximaTentativa: paraMysql(somarMinutos(2 ** tentativas)),
          erro: e instanceof Error ? e.message : String(e),
        });

        if (desistiu) r.desistencias++;
        else r.falhas++;
      }
    }
  });

  return r;
}
