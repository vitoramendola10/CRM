import { randomUUID } from "node:crypto";
import {
  atualizarColuna,
  atualizarStatus,
  atualizarTipo,
  buscarColuna,
  buscarStatus,
  contarColunas,
  contarStatusDaCategoria,
  contarTasksComStatus,
  contarTasksComTipo,
  contarTasksNaColuna,
  criarColuna,
  criarStatus,
  criarTipo,
  idsDeColunas,
  removerColuna,
  removerStatus,
  removerTipo,
  reordenarColunas,
} from "@/db/queries/config";
import {
  atualizarUsuario,
  buscarUsuario,
  contarAdminsAtivos,
  criarUsuario,
} from "@/db/queries/users";
import type {
  AtualizarUsuarioInput,
  BoardColumnInput,
  CriarUsuarioInput,
  RenomearStatusInput,
  ReordenarColunasInput,
  TaskStatusInput,
  TaskTypeInput,
} from "@/domain";
import { ROTULO_CATEGORIA } from "@/domain";
import { gerarHash } from "@/lib/password";
import { ErroDeNegocio, ehDuplicata } from "@/lib/rota";

/**
 * Regras de configuracao. O tema comum: renomear e recolorir sao livres, mas
 * apagar algo que ja esta em uso - ou deixar o sistema sem uma peca que a
 * automacao precisa - e barrado com mensagem explicando o porque.
 */

// ------------------------------------------------------------------
// Colunas
// ------------------------------------------------------------------

export async function novaColuna(dados: BoardColumnInput): Promise<string> {
  const id = randomUUID();
  await criarColuna(id, dados);
  return id;
}

export async function editarColuna(
  id: string,
  dados: Omit<BoardColumnInput, "boardId">,
): Promise<void> {
  if (!(await buscarColuna(id))) throw new ErroDeNegocio("Esta etapa nao existe mais.", 404);
  await atualizarColuna(id, dados);
}

export async function excluirColuna(id: string): Promise<void> {
  const coluna = await buscarColuna(id);
  if (!coluna) throw new ErroDeNegocio("Esta etapa nao existe mais.", 404);

  const emUso = await contarTasksNaColuna(id);
  if (emUso > 0) {
    throw new ErroDeNegocio(
      `Esta etapa tem ${emUso} ${emUso === 1 ? "rotina" : "rotinas"}. Mova o que esta nela antes de excluir.`,
    );
  }
  if ((await contarColunas(coluna.boardId)) <= 1) {
    throw new ErroDeNegocio("O board precisa de pelo menos uma etapa.");
  }
  await removerColuna(id);
}

export async function ordenarColunas(dados: ReordenarColunasInput): Promise<void> {
  const existentes = await idsDeColunas(dados.boardId);
  const enviados = new Set(dados.ids);

  // A reordenacao reescreve a coluna inteira: receber uma lista parcial deixaria
  // as ausentes com a ordem negativa da primeira fase.
  if (enviados.size !== dados.ids.length) {
    throw new ErroDeNegocio("A lista de etapas veio com repeticao.");
  }
  if (existentes.length !== enviados.size || !existentes.every((id) => enviados.has(id))) {
    throw new ErroDeNegocio("A lista de etapas nao confere com o board. Recarregue a pagina.");
  }
  await reordenarColunas(dados.boardId, dados.ids);
}

// ------------------------------------------------------------------
// Status
// ------------------------------------------------------------------

export async function novoStatus(dados: TaskStatusInput): Promise<string> {
  const id = randomUUID();
  await criarStatus(id, dados);
  return id;
}

/**
 * Sem `categoria` no payload: a tela comum renomeia e recolore, nunca reclassifica.
 * Trocar categoria mudaria o significado historico de toda tarefa que ja usa o status.
 */
export async function editarStatus(id: string, dados: RenomearStatusInput): Promise<void> {
  const atual = await buscarStatus(id);
  if (!atual) throw new ErroDeNegocio("Este status nao existe mais.", 404);

  if (atual.ativo && !dados.ativo) {
    const sobram = await contarStatusDaCategoria(atual.categoria, id);
    if (sobram === 0) {
      throw new ErroDeNegocio(
        `Este e o unico status ativo da categoria "${ROTULO_CATEGORIA[atual.categoria]}". ` +
          "Crie outro antes de desativar - a automacao precisa de um para cada categoria.",
      );
    }
  }
  await atualizarStatus(id, dados);
}

export async function excluirStatus(id: string): Promise<void> {
  const atual = await buscarStatus(id);
  if (!atual) throw new ErroDeNegocio("Este status nao existe mais.", 404);

  const emUso = await contarTasksComStatus(id);
  if (emUso > 0) {
    throw new ErroDeNegocio(
      `${emUso} ${emUso === 1 ? "rotina usa" : "rotinas usam"} este status. Desative em vez de excluir, para nao perder o historico.`,
    );
  }
  if ((await contarStatusDaCategoria(atual.categoria, id)) === 0) {
    throw new ErroDeNegocio(
      `Este e o unico status da categoria "${ROTULO_CATEGORIA[atual.categoria]}". Crie outro antes de excluir.`,
    );
  }
  await removerStatus(id);
}

// ------------------------------------------------------------------
// Tipos
// ------------------------------------------------------------------

export async function novoTipo(dados: TaskTypeInput): Promise<string> {
  const id = randomUUID();
  await criarTipo(id, dados);
  return id;
}

export async function editarTipo(id: string, dados: TaskTypeInput): Promise<void> {
  await atualizarTipo(id, dados);
}

export async function excluirTipo(id: string): Promise<void> {
  const emUso = await contarTasksComTipo(id);
  if (emUso > 0) {
    throw new ErroDeNegocio(
      `${emUso} ${emUso === 1 ? "rotina usa" : "rotinas usam"} este tipo. Desative em vez de excluir.`,
    );
  }
  await removerTipo(id);
}

// ------------------------------------------------------------------
// Usuarios
// ------------------------------------------------------------------

export async function novoUsuario(dados: CriarUsuarioInput): Promise<string> {
  const id = randomUUID();
  try {
    await criarUsuario({
      id,
      username: dados.username,
      nome: dados.nome,
      email: dados.email,
      papel: dados.papel,
      senhaHash: await gerarHash(dados.senha),
    });
  } catch (e) {
    // Corrida entre duas telas: o UNIQUE do banco e quem decide, nao um SELECT antes.
    if (ehDuplicata(e)) throw new ErroDeNegocio(`O usuario "${dados.username}" ja existe.`);
    throw e;
  }
  return id;
}

export async function editarUsuario(id: string, dados: AtualizarUsuarioInput): Promise<void> {
  const atual = await buscarUsuario(id);
  if (!atual) throw new ErroDeNegocio("Este usuario nao existe mais.", 404);

  // Sem admin ativo ninguem mais entra em /config: e uma porta que tranca por fora.
  const perdeAdmin = atual.papel === "admin" && atual.ativo && (dados.papel !== "admin" || !dados.ativo);
  if (perdeAdmin && (await contarAdminsAtivos(id)) === 0) {
    throw new ErroDeNegocio(
      "Este e o unico administrador ativo. Promova outra pessoa antes de alterar este cadastro.",
    );
  }
  await atualizarUsuario(id, dados);
}
