import type { CamposComErro } from "./rota";

/**
 * Cliente das rotas de API. Nunca lanca: todo componente trata sucesso e falha
 * pelo mesmo `if`, sem try/catch espalhado pela UI.
 */

export type Resultado<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string; campos?: CamposComErro };

export async function chamar<T>(
  url: string,
  metodo: "POST" | "PATCH" | "PUT" | "DELETE",
  corpo?: unknown,
): Promise<Resultado<T>> {
  // Montado por ramo em vez de com `undefined`: exactOptionalPropertyTypes
  // distingue "propriedade ausente" de "propriedade igual a undefined".
  const init: RequestInit =
    corpo === undefined
      ? { method: metodo }
      : {
          method: metodo,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(corpo),
        };

  let resp: Response;
  try {
    resp = await fetch(url, init);
  } catch {
    return { ok: false, erro: "Sem conexao com o servidor." };
  }

  // 204 e resposta legitima sem corpo.
  if (resp.status === 204) return { ok: true, dados: undefined as T };

  let json: unknown = null;
  try {
    json = await resp.json();
  } catch {
    json = null;
  }

  if (!resp.ok) {
    const e = json as { erro?: string; campos?: CamposComErro } | null;
    const erro = e?.erro ?? "Nao consegui completar a operacao.";
    return e?.campos ? { ok: false, erro, campos: e.campos } : { ok: false, erro };
  }
  return { ok: true, dados: json as T };
}
