import type { Papel } from "@/domain";

/**
 * Cookie de sessao: `payload.assinatura`, ambos base64url.
 *
 * Existe para o middleware conseguir decidir acesso por papel SEM tocar o banco -
 * ele roda no Edge, onde o mysql2 nao existe. Por isso tudo aqui usa Web Crypto,
 * que esta disponivel tanto no Edge quanto no Node.
 *
 * A assinatura prova que o payload nao foi adulterado, mas NAO prova que a sessao
 * continua valida: quem revoga e a tabela `sessions`, conferida em lib/auth.ts a
 * cada render de pagina. O middleware e um filtro barato, nao a autoridade.
 */

export interface SessaoPayload {
  /** Token opaco. O banco guarda apenas o sha256 dele. */
  t: string;
  /** userId */
  u: string;
  p: Papel;
  /** expiracao em epoch ms */
  e: number;
}

const enc = new TextEncoder();

function segredo(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET ausente ou curto demais (minimo 32 caracteres).");
  }
  return s;
}

function paraB64u(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// O ArrayBuffer explicito e exigencia do TS 5.9: Uint8Array virou generico e
// crypto.subtle nao aceita a variante que poderia estar sobre SharedArrayBuffer.
function deB64u(txt: string): Uint8Array<ArrayBuffer> {
  const norm = txt.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(norm.padEnd(Math.ceil(norm.length / 4) * 4, "="));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function chaveHmac(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(segredo()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

/** Token aleatorio de 32 bytes. E o que o usuario carrega; o banco so ve o hash. */
export function gerarToken(): string {
  return paraB64u(crypto.getRandomValues(new Uint8Array(32)));
}

/** id da linha em `sessions`. Vazar o banco nao vaza sessao utilizavel. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function assinarSessao(payload: SessaoPayload): Promise<string> {
  const corpo = paraB64u(enc.encode(JSON.stringify(payload)));
  const assinatura = await crypto.subtle.sign("HMAC", await chaveHmac(), enc.encode(corpo));
  return `${corpo}.${paraB64u(new Uint8Array(assinatura))}`;
}

/** null para qualquer defeito: assinatura invalida, formato estranho ou vencida. */
export async function lerSessao(cookie: string | undefined): Promise<SessaoPayload | null> {
  if (!cookie) return null;
  const [corpo, assinatura] = cookie.split(".");
  if (!corpo || !assinatura) return null;

  try {
    // crypto.subtle.verify compara em tempo constante - nao trocar por ===.
    const ok = await crypto.subtle.verify(
      "HMAC",
      await chaveHmac(),
      deB64u(assinatura),
      enc.encode(corpo),
    );
    if (!ok) return null;

    const p = JSON.parse(new TextDecoder().decode(deB64u(corpo))) as SessaoPayload;
    if (typeof p.t !== "string" || typeof p.u !== "string" || typeof p.e !== "number") return null;
    if (p.e <= Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}
