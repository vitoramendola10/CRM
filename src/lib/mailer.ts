import nodemailer, { type Transporter } from "nodemailer";

/**
 * Envio de e-mail. Sem SMTP configurado o transporte vira console: em dev a fila
 * roda de verdade, marca `enviado` e voce ve a mensagem no terminal - assim da
 * para testar as regras de notificacao sem servidor de e-mail nenhum.
 */

export interface Mensagem {
  destinatarios: string[];
  assunto: string;
  corpo: string;
}

const REMETENTE = process.env.SMTP_FROM ?? "CRM Suporte + Dev <crm@localhost>";

/**
 * O worker envia dentro de uma transacao aberta. Um SMTP que nao responde
 * seguraria os locks da fila, entao o timeout e curto de proposito.
 */
const TIMEOUT_MS = 10_000;

let transporte: Transporter | null = null;

export function smtpConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

function obterTransporte(): Transporter {
  if (transporte) return transporte;

  if (!smtpConfigurado()) {
    transporte = nodemailer.createTransport({ jsonTransport: true });
    return transporte;
  }

  const porta = Number(process.env.SMTP_PORT ?? 587);
  const usuario = process.env.SMTP_USER;

  transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: porta,
    secure: porta === 465,
    auth: usuario ? { user: usuario, pass: process.env.SMTP_PASS ?? "" } : undefined,
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  });
  return transporte;
}

/**
 * Todos em BCC: a equipe nao precisa ver a lista de quem mais recebeu, e isso
 * evita que um "responder a todos" vire discussao por e-mail em vez de comentario
 * na rotina.
 */
export async function enviarEmail(msg: Mensagem): Promise<void> {
  if (msg.destinatarios.length === 0) return;

  const envelope = {
    from: REMETENTE,
    to: REMETENTE,
    bcc: msg.destinatarios,
    subject: msg.assunto,
    text: msg.corpo,
  };

  if (!smtpConfigurado()) {
    console.log(
      `[email nao enviado - SMTP_HOST ausente] para ${msg.destinatarios.length} destinatario(s): ${msg.assunto}`,
    );
    return;
  }

  await obterTransporte().sendMail(envelope);
}
