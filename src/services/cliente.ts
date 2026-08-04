import { randomUUID } from "node:crypto";
import {
  atualizarCliente,
  buscarCliente,
  cnpjEmUso,
  contarVinculos,
  inserirCliente,
  removerCliente,
} from "@/db/queries/clientes";
import type { ClienteInput } from "@/domain";
import { ErroDeNegocio } from "@/lib/rota";

export async function novoCliente(dados: ClienteInput): Promise<string> {
  if (dados.cnpj && (await cnpjEmUso(dados.cnpj))) {
    throw new ErroDeNegocio("Ja existe um cliente com este CNPJ.");
  }
  const id = randomUUID();
  await inserirCliente(id, dados);
  return id;
}

export async function editarCliente(id: string, dados: ClienteInput): Promise<void> {
  if (!(await buscarCliente(id))) throw new ErroDeNegocio("Este cliente nao existe mais.", 404);
  if (dados.cnpj && (await cnpjEmUso(dados.cnpj, id))) {
    throw new ErroDeNegocio("Ja existe outro cliente com este CNPJ.");
  }
  await atualizarCliente(id, dados);
}

export async function excluirCliente(id: string): Promise<void> {
  const vinculos = await contarVinculos(id);
  if (vinculos > 0) {
    // Apagar levaria junto o historico de quem pediu o que. Desativar preserva.
    throw new ErroDeNegocio(
      `Este cliente tem ${vinculos} ${vinculos === 1 ? "registro" : "registros"} entre chamados e rotinas. ` +
        "Desative em vez de excluir, para nao perder o historico.",
    );
  }
  await removerCliente(id);
}
