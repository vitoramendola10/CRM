import { NextResponse } from "next/server";
import type { ZodType } from "zod";

/**
 * Contrato unico das rotas de API: toda entrada passa por um zod de src/domain
 * e todo erro sai no mesmo formato `{ erro, campos? }`, que o cliente sabe ler.
 */

/** Erro previsto, com mensagem escrita para o usuario final ler. */
export class ErroDeNegocio extends Error {
  constructor(
    message: string,
    readonly status = 409,
  ) {
    super(message);
    this.name = "ErroDeNegocio";
  }
}

export type CamposComErro = Record<string, string>;

export function respostaErro(erro: string, status = 400, campos?: CamposComErro) {
  return NextResponse.json(campos ? { erro, campos } : { erro }, { status });
}

export function respostaOk<T>(dados: T, status = 200) {
  return NextResponse.json(dados, { status });
}

/**
 * Devolve os dados validados ou a resposta 400 pronta - nunca lanca.
 * Quem chama decide o que fazer, sem try/catch em volta de cada rota.
 */
export async function validarCorpo<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<{ ok: true; dados: T } | { ok: false; resposta: NextResponse }> {
  let bruto: unknown;
  try {
    bruto = await req.json();
  } catch {
    return { ok: false, resposta: respostaErro("Corpo da requisicao invalido.") };
  }

  const r = schema.safeParse(bruto);
  if (!r.success) {
    const campos: CamposComErro = {};
    for (const issue of r.error.issues) {
      const campo = issue.path.join(".") || "_";
      campos[campo] ??= issue.message;
    }
    return {
      ok: false,
      resposta: respostaErro("Confira os campos destacados.", 400, campos),
    };
  }
  return { ok: true, dados: r.data };
}

/**
 * Violacao de UNIQUE. Precisa andar pela cadeia de `cause`: o Drizzle embrulha o
 * erro do driver numa DrizzleQueryError cuja `message` e so "Failed query: ...",
 * e o ER_DUP_ENTRY original fica no erro de origem.
 */
export function ehDuplicata(e: unknown): boolean {
  let atual: unknown = e;
  for (let i = 0; atual !== null && atual !== undefined && i < 5; i++) {
    const err = atual as { code?: unknown; message?: unknown; cause?: unknown };
    if (err.code === "ER_DUP_ENTRY") return true;
    if (typeof err.message === "string" && /duplicate entry/i.test(err.message)) return true;
    atual = err.cause;
  }
  return false;
}

/** Protocolo vindo da URL como texto. So inteiro positivo passa. */
export function protocoloDaUrl(bruto: string): number {
  const n = Number(bruto);
  if (!Number.isInteger(n) || n <= 0) throw new ErroDeNegocio("Protocolo invalido.", 400);
  return n;
}

/** Traduz a excecao para resposta. O que nao for previsto vira 500 sem vazar detalhe. */
export function tratarErro(e: unknown) {
  if (e instanceof ErroDeNegocio) return respostaErro(e.message, e.status);
  console.error("[api]", e);
  return respostaErro("Nao consegui completar a operacao. Tente de novo.", 500);
}
