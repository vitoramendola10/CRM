import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  apagarSessao,
  buscarSessaoValida,
  gravarSessao,
  limparSessoesVencidas,
} from "@/db/queries/users";
import { ROTAS, SESSAO_COOKIE, SESSAO_DURACAO_DIAS, type Papel, type UsuarioSessao } from "@/domain";
import { paraMysql, somarDias } from "./datas";
import { ErroDeNegocio } from "./rota";
import { assinarSessao, gerarToken, hashToken, lerSessao } from "./session-token";

/**
 * Sessao do lado do servidor. O middleware ja barrou quem nao tem cookie valido,
 * mas quem manda de verdade e aqui: o cookie pode estar assinado e integro e ainda
 * assim referenciar uma sessao encerrada ou um usuario desativado.
 */

const opcoesCookie = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
} as const;

export async function abrirSessao(userId: string, papel: Papel): Promise<void> {
  await limparSessoesVencidas();

  const token = gerarToken();
  const expira = somarDias(SESSAO_DURACAO_DIAS);
  await gravarSessao(await hashToken(token), userId, paraMysql(expira));

  const cookie = await assinarSessao({ t: token, u: userId, p: papel, e: expira.getTime() });
  (await cookies()).set(SESSAO_COOKIE, cookie, { ...opcoesCookie, expires: expira });
}

export async function encerrarSessao(): Promise<void> {
  const jar = await cookies();
  const payload = await lerSessao(jar.get(SESSAO_COOKIE)?.value);
  if (payload) await apagarSessao(await hashToken(payload.t));
  jar.delete(SESSAO_COOKIE);
}

export async function sessaoAtual(): Promise<UsuarioSessao | null> {
  const payload = await lerSessao((await cookies()).get(SESSAO_COOKIE)?.value);
  if (!payload) return null;
  return buscarSessaoValida(await hashToken(payload.t));
}

/** Para paginas e rotas que exigem alguem logado. Nao volta se nao houver sessao. */
export async function exigirSessao(): Promise<UsuarioSessao> {
  const u = await sessaoAtual();
  if (!u) redirect(ROTAS.login);
  return u;
}

/**
 * Segunda barreira do controle por papel. O middleware ja filtrou pela URL;
 * isto protege quem chama o service por outro caminho (rota de API, por exemplo).
 */
export async function exigirPapel(papeis: readonly Papel[]): Promise<UsuarioSessao> {
  const u = await exigirSessao();
  if (!papeis.includes(u.papel)) redirect(ROTAS.kanban);
  return u;
}

/**
 * Mesma checagem para rotas de API. Nao usa redirect(): quem chama e fetch,
 * e um 303 no meio de um POST vira um erro confuso do lado do cliente.
 */
export async function exigirSessaoApi(): Promise<UsuarioSessao> {
  const u = await sessaoAtual();
  if (!u) throw new ErroDeNegocio("Sessao expirada. Entre novamente.", 401);
  return u;
}

export async function exigirPapelApi(papeis: readonly Papel[]): Promise<UsuarioSessao> {
  const u = await exigirSessaoApi();
  if (!papeis.includes(u.papel)) {
    throw new ErroDeNegocio("Voce nao tem permissao para esta acao.", 403);
  }
  return u;
}
