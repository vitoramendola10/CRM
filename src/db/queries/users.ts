import { and, asc, eq, gt, inArray, lt, or } from "drizzle-orm";
import { db, type Tx } from "../client";
import { sessions, users } from "../schema";
import type { Papel, Usuario, UsuarioSessao } from "@/domain";

const colunasPublicas = {
  id: users.id,
  username: users.username,
  nome: users.nome,
  email: users.email,
  papel: users.papel,
  ativo: users.ativo,
};

/** Traz o hash junto - so o service de login usa. */
export async function buscarPorUsername(
  username: string,
): Promise<(Usuario & { senhaHash: string }) | null> {
  // A collation utf8mb4_0900_ai_ci ja resolve o case-insensitive do citext.
  const [linha] = await db
    .select({ ...colunasPublicas, senhaHash: users.senhaHash })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return linha ?? null;
}

/** Idem, pelo id. So a troca de senha usa: e la que se confere a senha atual. */
export async function buscarHashDoUsuario(id: string): Promise<string | null> {
  const [linha] = await db
    .select({ senhaHash: users.senhaHash })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return linha?.senhaHash ?? null;
}

export async function buscarUsuario(id: string): Promise<Usuario | null> {
  const [linha] = await db.select(colunasPublicas).from(users).where(eq(users.id, id)).limit(1);
  return linha ?? null;
}

export async function listarUsuarios(apenasAtivos = false): Promise<Usuario[]> {
  return db
    .select(colunasPublicas)
    .from(users)
    .where(apenasAtivos ? eq(users.ativo, true) : undefined)
    .orderBy(asc(users.nome));
}

/** Destinatarios de notificacao: sem e-mail cadastrado nao entra na lista. */
export async function listarEmailsPorPapel(papel: Papel): Promise<string[]> {
  const linhas = await db
    .select({ email: users.email })
    .from(users)
    .where(and(eq(users.papel, papel), eq(users.ativo, true)));
  return linhas.map((l) => l.email).filter((e): e is string => e !== null && e.length > 0);
}

export async function listarEmailsPorIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const linhas = await db
    .select({ email: users.email })
    .from(users)
    .where(and(or(...ids.map((id) => eq(users.id, id))), eq(users.ativo, true)));
  return linhas.map((l) => l.email).filter((e): e is string => e !== null && e.length > 0);
}

/**
 * E-mails de quem foi citado com @. Nome que nao existe simplesmente nao
 * aparece no resultado - errar o @ nao pode ser erro de formulario, ou escrever
 * um comentario viraria um exercicio de acertar a grafia.
 */
export async function emailsPorUsernames(tx: Tx, usernames: string[]): Promise<string[]> {
  if (usernames.length === 0) return [];
  const linhas = await tx
    .select({ email: users.email })
    .from(users)
    .where(and(inArray(users.username, usernames), eq(users.ativo, true)));
  return linhas.map((l) => l.email).filter((e): e is string => e !== null && e.length > 0);
}

export async function criarUsuario(dados: {
  id: string;
  username: string;
  nome: string;
  email: string | null;
  papel: Papel;
  senhaHash: string;
}): Promise<void> {
  await db.insert(users).values(dados);
}

export async function atualizarUsuario(
  id: string,
  dados: { nome: string; email: string | null; papel: Papel; ativo: boolean },
): Promise<void> {
  await db.update(users).set(dados).where(eq(users.id, id));
}

export async function trocarSenhaHash(id: string, senhaHash: string): Promise<void> {
  await db.update(users).set({ senhaHash }).where(eq(users.id, id));
}

export async function contarAdminsAtivos(exceto: string): Promise<number> {
  const linhas = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.papel, "admin"), eq(users.ativo, true)));
  return linhas.filter((l) => l.id !== exceto).length;
}

// ------------------------------------------------------------------
// Sessoes
// ------------------------------------------------------------------

export async function gravarSessao(id: string, userId: string, expiraEm: string): Promise<void> {
  await db.insert(sessions).values({ id, userId, expiraEm });
}

/**
 * Autoridade sobre "esta sessao ainda vale": o cookie assinado prova integridade,
 * isto prova que ninguem deslogou nem desativou o usuario no meio do caminho.
 */
export async function buscarSessaoValida(id: string): Promise<UsuarioSessao | null> {
  const agora = new Date().toISOString().slice(0, 23).replace("T", " ");
  const [linha] = await db
    .select({
      id: users.id,
      username: users.username,
      nome: users.nome,
      papel: users.papel,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiraEm, agora), eq(users.ativo, true)))
    .limit(1);
  return linha ?? null;
}

export async function apagarSessao(id: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, id));
}

/**
 * Derruba tudo que estava aberto em nome do usuario. Chamado na troca de senha:
 * quem trocou a senha porque desconfiou de alguem espera exatamente isso - que a
 * sessao do outro pare de valer no mesmo instante, e nao daqui a trinta dias.
 */
export async function apagarSessoesDoUsuario(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Chamado no login: impede a tabela de crescer com sessao morta. */
export async function limparSessoesVencidas(): Promise<void> {
  const agora = new Date().toISOString().slice(0, 23).replace("T", " ");
  await db.delete(sessions).where(lt(sessions.expiraEm, agora));
}
