import { apagarSessoesDoUsuario, buscarHashDoUsuario, trocarSenhaHash } from "@/db/queries/users";
import type { Papel, TrocarSenhaInput } from "@/domain";
import { abrirSessao } from "@/lib/auth";
import { conferirSenha, gerarHash } from "@/lib/password";
import { ErroDeNegocio } from "@/lib/rota";

/**
 * O que a pessoa mexe na propria conta. Separado de services/auth.ts de proposito:
 * la e o portao de entrada, aqui e quem ja entrou.
 */

export async function trocarSenha(
  usuarioId: string,
  papel: Papel,
  dados: TrocarSenhaInput,
): Promise<void> {
  const hash = await buscarHashDoUsuario(usuarioId);
  // Sessao valida com usuario que sumiu do banco: nao da para seguir.
  if (!hash) throw new ErroDeNegocio("Sessao expirada. Entre novamente.", 401);

  if (!(await conferirSenha(hash, dados.senhaAtual))) {
    // 400 e nao 401: a sessao continua boa, quem errou foi o campo. Um 401 aqui
    // faria o cliente achar que precisa logar de novo.
    throw new ErroDeNegocio("A senha atual nao confere.", 400);
  }

  await trocarSenhaHash(usuarioId, await gerarHash(dados.senhaNova));

  // Ordem importa: derruba TUDO primeiro, inclusive a sessao de quem esta aqui,
  // e so entao abre uma nova. Assim nao existe instante em que uma sessao antiga
  // convive com a senha nova - que e justamente o que se quer evitar ao trocar.
  await apagarSessoesDoUsuario(usuarioId);
  await abrirSessao(usuarioId, papel);
}
