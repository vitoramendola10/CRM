import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { primeiraColuna, statusPorCategoria } from "@/db/queries/config";
import { emailsDosIds } from "@/db/queries/notifications";
import { emailsPorUsernames } from "@/db/queries/users";
import {
  atribuirResponsavel,
  atualizarTaskCampos,
  buscarTask,
  codigoDaTask,
  inserirComentario,
  inserirTask,
  registrarHistorico,
  ultimoRankDaColuna,
} from "@/db/queries/tasks";
import { extrairMencoes, mencoesNovas } from "@/domain";
import type { AtualizarTaskInput, CriarTaskInput, Task, UsuarioSessao } from "@/domain";
import { RANK_INICIAL, rankEntre } from "@/lib/rank";
import { ErroDeNegocio } from "@/lib/rota";
import { enfileirarEvento } from "./notificacoes";

/**
 * Campos cuja mudanca vale uma linha de historico - sao os que respondem
 * "por que esta rotina demorou". Titulo e descricao mudam demais para render
 * timeline util; ficam de fora de proposito.
 */
const RASTREADOS = [
  ["statusId", "status_id"],
  ["assigneeId", "assignee_id"],
  ["typeId", "type_id"],
  ["prioridade", "prioridade"],
  ["prazo", "prazo"],
  ["clientId", "client_id"],
] as const;

export async function editarTask(
  id: string,
  dados: AtualizarTaskInput,
  usuario: UsuarioSessao,
): Promise<void> {
  const atual = await buscarTask(id);
  if (!atual) throw new ErroDeNegocio("Esta rotina nao existe mais.", 404);

  const mudancas = RASTREADOS.filter(([campo]) => valorDe(atual, campo) !== valorDe(dados, campo));
  const novoResponsavel =
    dados.assigneeId !== null && dados.assigneeId !== atual.assigneeId ? dados.assigneeId : null;

  await db.transaction(async (tx) => {
    await atualizarTaskCampos(tx, id, dados);

    await registrarHistorico(
      tx,
      mudancas.map(([campo, coluna]) => ({
        taskId: id,
        userId: usuario.id,
        campo: coluna,
        valorAntigo: texto(valorDe(atual, campo)),
        valorNovo: texto(valorDe(dados, campo)),
      })),
    );

    /**
     * Avisa quem passou a ser citado na descricao ou nos passos.
     *
     * So as citacoes NOVAS. Descricao e salva junto com o formulario inteiro,
     * varias vezes ao longo do dia; avisar todos os citados a cada salvamento
     * mandaria o mesmo e-mail cinco vezes para a mesma pessoa - e a pessoa
     * pararia de ler.
     */
    const citados = [
      ...mencoesNovas(atual.descricao, dados.descricao),
      ...mencoesNovas(atual.passosRepro, dados.passosRepro),
    ].filter((u) => u !== usuario.username.toLowerCase());

    if (citados.length > 0) {
      const emails = await emailsPorUsernames(tx, [...new Set(citados)]);
      if (emails.length > 0) {
        await enfileirarEvento(tx, {
          evento: "task_comentada",
          boardId: atual.boardId,
          taskId: id,
          ticketId: atual.ticketId,
          emailsMencionados: emails,
          contexto: {
            codigo: atual.codigo,
            titulo: dados.titulo,
            protocolo: atual.ticketId,
            autor: usuario.nome,
            comentario: `${dados.descricao ?? ""}\n\n${dados.passosRepro ?? ""}`.trim().slice(0, 2000),
          },
        });
      }
    }

    if (novoResponsavel) {
      const [email] = await emailsDosIds(tx, [novoResponsavel]);
      await enfileirarEvento(tx, {
        evento: "task_atribuida",
        boardId: atual.boardId,
        taskId: id,
        ticketId: atual.ticketId,
        emailResponsavel: email ?? null,
        contexto: {
          codigo: atual.codigo,
          titulo: dados.titulo,
          protocolo: atual.ticketId,
          responsavel: usuario.nome,
        },
      });
    }
  });
}

/**
 * Cria rotina direto no board, sem chamado de origem.
 *
 * Mesmas regras da escalacao - primeira coluna, status da categoria "aberto",
 * rank no fim da fila -, so que sem ticket. O que muda e a origem registrada no
 * historico: "criada no board" e a informacao que, meses depois, separa
 * trabalho interno do que veio de cliente.
 */
export async function novaTask(
  dados: CriarTaskInput,
  usuario: UsuarioSessao,
): Promise<{ taskId: string; codigo: number }> {
  return db.transaction(async (tx) => {
    const coluna = await primeiraColuna(dados.boardId);
    if (!coluna) {
      throw new ErroDeNegocio(
        "O board escolhido nao tem nenhuma etapa. Cadastre as etapas em Configuracao.",
      );
    }

    const aberto = await statusPorCategoria("aberto");
    if (!aberto) {
      throw new ErroDeNegocio(
        "Nao ha status ativo da categoria Aberto. Cadastre um em Configuracao > Status.",
      );
    }

    const ultimo = await ultimoRankDaColuna(tx, coluna.id);
    const taskId = randomUUID();

    await inserirTask(tx, {
      id: taskId,
      boardId: dados.boardId,
      columnId: coluna.id,
      statusId: aberto.id,
      typeId: dados.typeId,
      titulo: dados.titulo,
      descricao: dados.descricao,
      prioridade: dados.prioridade,
      assigneeId: dados.assigneeId,
      criadoPor: usuario.id,
      clientId: dados.clientId,
      ticketId: null,
      estimativaH: dados.estimativaH,
      prazo: dados.prazo,
      rank: ultimo === null ? RANK_INICIAL : rankEntre(ultimo, null),
    });

    const codigo = await codigoDaTask(tx, taskId);

    await registrarHistorico(tx, [
      {
        taskId,
        userId: usuario.id,
        campo: "origem",
        valorAntigo: null,
        valorNovo: "Criada no board",
      },
    ]);

    await enfileirarEvento(tx, {
      evento: "task_criada",
      boardId: dados.boardId,
      taskId,
      ticketId: null,
      emailResponsavel: null,
      contexto: {
        codigo,
        titulo: dados.titulo,
        // Sem chamado: `{{protocolo}}` vira string vazia no template, e a linha
        // some sozinha do e-mail em vez de sair "Chamado de origem: #".
        protocolo: null,
        prioridade: dados.prioridade,
        etapa: coluna.nome,
        solicitante: null,
        autor: usuario.nome,
      },
    });

    return { taskId, codigo };
  });
}

/**
 * "Pegar para mim" no board.
 *
 * Antes, para assumir uma rotina era preciso abrir o card, achar o proprio nome
 * num select com todos os usuarios e salvar o formulario inteiro - o mesmo
 * atrito que o suporte tinha e que ja foi tirado de la. Manda so o campo que
 * muda, entao dois devs olhando a mesma rotina nao se sobrescrevem no resto.
 *
 * Recusa roubar de quem ja esta com ela: pegar para si o que outro pegou nao e
 * um clique acidental que valha desfazer depois, e a conversa sobre quem faz o
 * que nao se resolve no botao.
 */
export async function assumirTask(id: string, usuario: UsuarioSessao): Promise<void> {
  const atual = await buscarTask(id);
  if (!atual) throw new ErroDeNegocio("Esta rotina nao existe mais.", 404);
  if (atual.assigneeId === usuario.id) return;

  if (atual.assigneeId !== null) {
    throw new ErroDeNegocio(
      "Esta rotina ja tem responsavel. Para trocar, abra a rotina e mude o campo Responsavel.",
    );
  }

  await db.transaction(async (tx) => {
    await atribuirResponsavel(tx, id, usuario.id);
    await registrarHistorico(tx, [
      {
        taskId: id,
        userId: usuario.id,
        campo: "assignee_id",
        valorAntigo: null,
        valorNovo: usuario.id,
      },
    ]);
    // Sem enfileirar "task_atribuida": o destinatario dessa notificacao e o
    // proprio responsavel, e avisar alguem por e-mail do que ele acabou de
    // clicar e ruido.
  });
}

/**
 * Comentario, e o aviso de quem foi citado com @.
 *
 * Antes o comentario so gravava a linha: o dev escrevia "@vitor, qual versao o
 * cliente usa?" e a pergunta ficava esperando alguem abrir aquela rotina por
 * acaso. Agora o texto e lido, os nomes viram destinatarios e o outbox cuida.
 *
 * Tudo numa transacao com o insert - se a fila falhar, o comentario tambem nao
 * entra, e a pessoa reescreve. O contrario seria pior: comentario gravado com
 * a promessa de aviso que nunca saiu.
 */
export async function comentar(
  taskId: string,
  corpo: string,
  usuario: UsuarioSessao,
): Promise<string> {
  const task = await buscarTask(taskId);
  if (!task) throw new ErroDeNegocio("Esta rotina nao existe mais.", 404);

  const id = randomUUID();

  await db.transaction(async (tx) => {
    await inserirComentario(id, taskId, usuario.id, corpo, tx);

    const citados = extrairMencoes(corpo);
    if (citados.length === 0) return;

    // Citar a si mesmo nao gera e-mail: a pessoa acabou de escrever o texto.
    const emails = await emailsPorUsernames(
      tx,
      citados.filter((u) => u !== usuario.username.toLowerCase()),
    );
    if (emails.length === 0) return;

    await enfileirarEvento(tx, {
      evento: "task_comentada",
      boardId: task.boardId,
      taskId,
      ticketId: task.ticketId,
      emailsMencionados: emails,
      contexto: {
        codigo: task.codigo,
        titulo: task.titulo,
        protocolo: task.ticketId,
        autor: usuario.nome,
        // O comentario inteiro no e-mail: quem foi citado precisa saber do que
        // se trata sem ter de abrir o sistema so para ler duas linhas.
        comentario: corpo.slice(0, 2000),
      },
    });
  });

  return id;
}

function valorDe(o: Task | AtualizarTaskInput, campo: string): unknown {
  return (o as unknown as Record<string, unknown>)[campo];
}

function texto(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}
