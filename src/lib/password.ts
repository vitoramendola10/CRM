import { hash, verify } from "@node-rs/argon2";

/**
 * Parametros do OWASP para argon2id (2024): 19 MiB, 2 iteracoes, 1 thread.
 * Ficam aqui e nao no .env porque mudar isso invalida o custo de hashes antigos
 * e precisa ser uma decisao versionada.
 */
const ARGON2ID = 2; // Algorithm.Argon2id - o enum do pacote e `const enum`,
// inacessivel com verbatimModuleSyntax. O valor e conferido no hash gerado.

const OPCOES = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function gerarHash(senha: string): Promise<string> {
  const h = await hash(senha, OPCOES);
  // Trava contra o valor do enum mudar numa atualizacao do pacote.
  if (!h.startsWith("$argon2id$")) {
    throw new Error(`Esperava argon2id, veio "${h.slice(0, 12)}"`);
  }
  return h;
}

export async function conferirSenha(senhaHash: string, senha: string): Promise<boolean> {
  try {
    return await verify(senhaHash, senha);
  } catch {
    // Hash corrompido ou em formato desconhecido nao derruba o login: e senha errada.
    return false;
  }
}
