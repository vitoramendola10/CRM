import { randomUUID } from "node:crypto";
import {
  buscarAnexo,
  inserirAnexo,
  listarAnexosDaTask,
  listarAnexosDoTicket,
  removerAnexo,
  type AnexoNoBanco,
} from "@/db/queries/anexos";
import { buscarTask } from "@/db/queries/tasks";
import { buscarTicket } from "@/db/queries/tickets";
import type { Anexo, UsuarioSessao } from "@/domain";
import { apagarAnexo, gravarAnexo, limparNome } from "@/lib/anexos";
import { agoraMysql } from "@/lib/datas";
import { ErroDeNegocio } from "@/lib/rota";

/** Onde o anexo cola. Exatamente um dos dois, como o CHECK do banco exige. */
export type Destino = { ticketId: number; taskId: null } | { ticketId: null; taskId: string };

export async function anexosDoTicket(ticketId: number): Promise<Anexo[]> {
  return listarAnexosDoTicket(ticketId);
}

export async function anexosDaTask(taskId: string, ticketId: number | null): Promise<Anexo[]> {
  return listarAnexosDaTask(taskId, ticketId);
}

/**
 * Grava o arquivo e registra.
 *
 * A ordem e disco primeiro, banco depois, e nao ha transacao que cubra os dois.
 * Se o INSERT falhar, o arquivo e apagado na hora - senao sobraria um orfao que
 * ninguem mais consegue enxergar para limpar. O contrario (banco primeiro) seria
 * pior: um registro apontando para arquivo que nunca existiu quebra a tela de
 * quem abre o chamado, e nao so a limpeza.
 */
export async function enviarAnexo(
  destino: Destino,
  arquivo: File,
  usuario: UsuarioSessao,
): Promise<Anexo> {
  await conferirDestino(destino);

  const { caminho, tamanhoBytes } = await gravarAnexo(arquivo);
  const id = randomUUID();
  const nomeOriginal = limparNome(arquivo.name);

  try {
    await inserirAnexo({
      id,
      ticketId: destino.ticketId,
      taskId: destino.taskId,
      nomeOriginal,
      tipoMime: arquivo.type,
      tamanhoBytes,
      caminho,
      enviadoPor: usuario.id,
    });
  } catch (e) {
    await apagarAnexo(caminho);
    throw e;
  }

  return {
    id,
    nomeOriginal,
    tipoMime: arquivo.type,
    tamanhoBytes,
    autor: usuario.nome,
    autorId: usuario.id,
    createdAt: agoraMysql(),
    herdado: false,
  };
}

/**
 * Apaga registro e arquivo. Banco primeiro: se o unlink falhar, sobra um arquivo
 * sem registro - invisivel e inofensivo. Na ordem inversa sobraria um registro
 * apontando para nada, e isso a tela mostra.
 */
export async function excluirAnexo(id: string, usuario: UsuarioSessao): Promise<void> {
  const anexo = await buscarAnexo(id);
  if (!anexo) throw new ErroDeNegocio("Este anexo nao existe mais.", 404);

  // Quem enviou pode desfazer o proprio engano; gestao pode tirar o que nao
  // devia estar ali. Ninguem mais: anexo e prova do que foi relatado, e apagar
  // o print de outra pessoa no meio de um atendimento nao conserta nada.
  const dono = anexo.enviadoPor !== null && anexo.enviadoPor === usuario.id;
  const gestao = usuario.papel === "admin" || usuario.papel === "gestor";
  if (!dono && !gestao) {
    throw new ErroDeNegocio("So quem enviou o anexo, ou a gestao, pode apaga-lo.", 403);
  }

  await removerAnexo(anexo.id);
  await apagarAnexo(anexo.caminho);
}

/** Para a rota de download: valida o id e devolve o registro com o caminho. */
export async function anexoParaDownload(id: string): Promise<AnexoNoBanco> {
  const anexo = await buscarAnexo(id);
  if (!anexo) throw new ErroDeNegocio("Este anexo nao existe mais.", 404);
  return anexo;
}

/**
 * O dono precisa existir ANTES de o arquivo ir para o disco. Sem isto, um id
 * inventado no formulario gravaria arquivo que nenhuma tela mostraria - e o
 * erro so apareceria no INSERT, com o arquivo ja escrito.
 */
async function conferirDestino(destino: Destino): Promise<void> {
  if (destino.ticketId !== null) {
    if (!(await buscarTicket(destino.ticketId))) {
      throw new ErroDeNegocio("Este chamado nao existe mais.", 404);
    }
    return;
  }
  if (!(await buscarTask(destino.taskId))) {
    throw new ErroDeNegocio("Esta rotina nao existe mais.", 404);
  }
}

