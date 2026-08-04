import { buscarPorUsername } from "@/db/queries/users";
import type { LoginInput, Papel } from "@/domain";
import { abrirSessao } from "@/lib/auth";
import { conferirSenha, gerarHash } from "@/lib/password";
import { ErroDeNegocio } from "@/lib/rota";

/**
 * Hash descartavel, calculado uma vez por processo. Serve para gastar o mesmo
 * tempo de argon2 quando o usuario nao existe: sem isso, a diferenca de latencia
 * entre "nao existe" e "senha errada" enumera os logins validos do sistema.
 */
let hashFantasma: Promise<string> | null = null;
function fantasma(): Promise<string> {
  hashFantasma ??= gerarHash("senha-que-nao-existe-para-igualar-o-tempo");
  return hashFantasma;
}

export async function autenticar(dados: LoginInput): Promise<Papel> {
  const usuario = await buscarPorUsername(dados.username);

  if (!usuario || !usuario.ativo) {
    await conferirSenha(await fantasma(), dados.senha);
    throw new ErroDeNegocio("Usuario ou senha invalidos.", 401);
  }

  if (!(await conferirSenha(usuario.senhaHash, dados.senha))) {
    // Mensagem identica de proposito: nao contamos qual das duas coisas falhou.
    throw new ErroDeNegocio("Usuario ou senha invalidos.", 401);
  }

  await abrirSessao(usuario.id, usuario.papel);
  return usuario.papel;
}
