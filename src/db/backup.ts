import "./load-env";

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { delimiter, join, resolve } from "node:path";
import { pastaDeAnexos } from "@/lib/anexos-pasta";

/**
 * Dump logico do banco `crm` em backups/crm-AAAA-MM-DD-HHmm.sql, com rotacao.
 *
 * -------------------------------------------------------------------------
 * ESTRATEGIA: mysqldump externo, nao dump escrito em TypeScript.
 * -------------------------------------------------------------------------
 * A maquina tem o `mysqldump.exe` 9.5.0 em
 * "C:\Program Files\MySQL\MySQL Server 9.5\bin" - mesma versao exata do
 * servidor. Existindo o binario, gerar o dump a mao pelo Drizzle/mysql2 so
 * traria risco sem beneficio: seria preciso reimplementar DDL (indices,
 * FK circular entre boards/tasks, charset e collation por coluna), escape de
 * string, `--hex-blob`, tipos de data e ordem de restauracao. Cada um desses
 * pontos e uma chance de gerar um backup que parece bom e nao restaura -
 * o pior tipo de defeito num backup. O mysqldump ja resolve todos, sai
 * consistente (`--single-transaction`, snapshot InnoDB sem travar a app) e o
 * arquivo e restauravel pelo cliente `mysql` padrao, sem depender deste repo.
 *
 * Preco da escolha: dependencia de binario externo. Mitigado por procurar o
 * mysqldump em varios lugares (MYSQLDUMP_PATH, PATH, instalacoes padrao) e
 * falhar com mensagem explicita em vez de gerar arquivo vazio.
 *
 * -------------------------------------------------------------------------
 * SENHA: vai por `MYSQL_PWD` no ambiente do processo filho, nunca por
 * argumento (`-pSENHA`), que ficaria visivel para qualquer processo na lista
 * de tarefas. Tambem nao vai para disco - nada de arquivo de opcoes temporario
 * que possa sobreviver a um crash. Nenhum log deste script imprime a senha
 * nem a DATABASE_URL inteira.
 * -------------------------------------------------------------------------
 *
 * Uso: npm run db:backup
 * Ajustes por ambiente:
 *   BACKUP_KEEP=14        quantos dumps manter (rotacao)
 *   MYSQLDUMP_PATH=...    caminho explicito do mysqldump
 */

/** Quantos dumps manter. Duas semanas de backup diario. */
const MANTER_PADRAO = 14;

/** Pasta de destino, sempre na raiz do projeto. */
const PASTA_BACKUPS = resolve(process.cwd(), "backups");

/**
 * Nome dos arquivos que ESTE script gera. A rotacao so apaga o que casa com
 * isto - qualquer outra coisa na pasta (dump manual, README, .zip) fica.
 */
const PADRAO_NOME = /^crm-\d{4}-\d{2}-\d{2}-\d{4}\.sql$/;

/**
 * O segundo pedaco do backup. Os anexos ficam em disco e nao no banco (a razao
 * esta em db/schema.ts, na tabela `attachments`), entao o dump sozinho NAO e um
 * backup completo: restaurar so o .sql devolve chamados apontando para arquivos
 * que nao existem mais. Os dois saem juntos, com o mesmo carimbo de hora.
 */
const PADRAO_ANEXOS = /^anexos-\d{4}-\d{2}-\d{2}-\d{4}\.tar\.gz$/;

type Conexao = {
  host: string;
  porta: string;
  usuario: string;
  senha: string;
  banco: string;
};

/** Le a DATABASE_URL e separa as partes. Nada aqui e chumbado. */
function lerConexao(): Conexao {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL ausente. Copie .env.example para .env.local e preencha.");
  }

  const u = new URL(url);
  const banco = decodeURIComponent(u.pathname.replace(/^\//, ""));
  if (!banco) throw new Error("DATABASE_URL precisa terminar com o nome do banco.");

  const usuario = decodeURIComponent(u.username);
  if (!usuario) throw new Error("DATABASE_URL sem usuario.");

  return {
    // "localhost" no Windows resolve para named pipe em alguns clientes;
    // 127.0.0.1 forca TCP, que e como a aplicacao ja conecta.
    host: u.hostname === "localhost" ? "127.0.0.1" : u.hostname,
    porta: u.port || "3306",
    usuario,
    senha: decodeURIComponent(u.password),
    banco,
  };
}

/**
 * Acha o mysqldump. Ordem: variavel de ambiente, PATH, instalacoes padrao do
 * Windows (versao mais nova primeiro), caminhos comuns de Linux/macOS.
 */
function acharMysqldump(): string {
  const explicito = process.env.MYSQLDUMP_PATH?.trim();
  if (explicito) {
    if (!existsSync(explicito)) {
      throw new Error(`MYSQLDUMP_PATH aponta para um arquivo que nao existe: ${explicito}`);
    }
    return explicito;
  }

  const executavel = process.platform === "win32" ? "mysqldump.exe" : "mysqldump";
  const candidatos: string[] = [];

  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (dir) candidatos.push(join(dir, executavel));
  }

  if (process.platform === "win32") {
    for (const raiz of ["C:\\Program Files\\MySQL", "C:\\Program Files (x86)\\MySQL"]) {
      if (!existsSync(raiz)) continue;
      const versoes = readdirSync(raiz)
        .filter((d) => d.startsWith("MySQL Server"))
        // "MySQL Server 9.5" antes de "MySQL Server 8.0": a mais nova primeiro.
        .sort((a, b) => b.localeCompare(a, "en", { numeric: true }));
      for (const v of versoes) candidatos.push(join(raiz, v, "bin", executavel));
    }
  } else {
    candidatos.push("/usr/bin/mysqldump", "/usr/local/bin/mysqldump", "/opt/homebrew/bin/mysqldump");
  }

  for (const c of candidatos) {
    if (existsSync(c)) return c;
  }

  throw new Error(
    "mysqldump nao encontrado. Instale o MySQL client ou aponte MYSQLDUMP_PATH " +
      "para o executavel (ex.: MYSQLDUMP_PATH=\"C:\\Program Files\\MySQL\\MySQL Server 9.5\\bin\\mysqldump.exe\").",
  );
}

/** "2026-08-04-0942" - hora local, que e como o usuario pensa no backup. */
function carimboDeHora(agora: Date): string {
  const p = (n: number, casas = 2): string => String(n).padStart(casas, "0");
  return (
    `${p(agora.getFullYear(), 4)}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}` +
    `-${p(agora.getHours())}${p(agora.getMinutes())}`
  );
}

function executarDump(binario: string, conexao: Conexao, destino: string): Promise<void> {
  const args = [
    `--host=${conexao.host}`,
    `--port=${conexao.porta}`,
    `--user=${conexao.usuario}`,
    // Snapshot consistente sem LOCK TABLES: a app continua escrevendo durante o dump.
    "--single-transaction",
    // Evita precisar do privilegio global PROCESS - crm_app so tem grant em crm.*.
    "--no-tablespaces",
    // Sem metadado de replicacao: este dump e para restaurar, nao para clonar replica.
    "--set-gtid-purged=OFF",
    "--default-character-set=utf8mb4",
    // Binario sai como 0x..., imune a problema de encoding no arquivo.
    "--hex-blob",
    // Escreve direto no arquivo em vez de passar por pipe: no Windows o
    // redirecionamento do shell converteria LF em CRLF e sujaria o dump.
    `--result-file=${destino}`,
    // UM banco so, e o nome vem da DATABASE_URL. O servidor hospeda outros
    // bancos que nao sao deste projeto e nao podem entrar aqui.
    "--databases",
    conexao.banco,
  ];

  return new Promise((ok, falha) => {
    const filho = spawn(binario, args, {
      // A senha entra so aqui. Nao aparece em args nem em disco.
      env: { ...process.env, MYSQL_PWD: conexao.senha },
      stdio: ["ignore", "inherit", "pipe"],
      windowsHide: true,
    });

    let erro = "";
    filho.stderr.on("data", (chunk: Buffer) => {
      erro += chunk.toString();
    });

    filho.on("error", (e) => falha(new Error(`nao consegui executar o mysqldump: ${e.message}`)));

    filho.on("close", (codigo) => {
      if (codigo === 0) return ok();
      const detalhe = erro.trim();
      falha(new Error(`mysqldump saiu com codigo ${codigo}${detalhe ? `:\n${detalhe}` : ""}`));
    });
  });
}

/**
 * Mantem os `manter` dumps mais recentes e apaga o resto. So considera arquivos
 * cujo nome casa com PADRAO_NOME - a pasta nunca e varrida por inteiro.
 * O nome ordena cronologicamente, entao ordenacao alfabetica basta.
 */
function rotacionar(manter: number, padrao = PADRAO_NOME): string[] {
  const dumps = readdirSync(PASTA_BACKUPS)
    .filter((nome) => padrao.test(nome))
    .filter((nome) => statSync(join(PASTA_BACKUPS, nome)).isFile())
    .sort()
    .reverse();

  const apagados: string[] = [];
  for (const antigo of dumps.slice(manter)) {
    unlinkSync(join(PASTA_BACKUPS, antigo));
    apagados.push(antigo);
  }
  return apagados;
}

/**
 * Empacota a pasta de anexos. `tar` esta no Windows 11 (bsdtar, em System32) e
 * em qualquer Linux/macOS, entao nao vale trazer dependencia de zip para isso.
 *
 * `-C base .` guarda os caminhos relativos ("2026/08/uuid.png") e nao o caminho
 * absoluto da maquina: um backup so restaura em outro lugar se ele nao carregar
 * junto onde nasceu.
 *
 * Devolve null quando nao ha anexo nenhum - nao adianta guardar catorze copias
 * de um pacote vazio.
 */
function empacotarAnexos(nomeDoPacote: string): Promise<boolean> {
  const base = pastaDeAnexos();
  if (!existsSync(base) || readdirSync(base).length === 0) return Promise.resolve(false);

  return new Promise((ok, falha) => {
    /**
     * O nome do pacote vai RELATIVO, com o `cwd` apontando para backups/. Um
     * caminho absoluto do Windows quebraria: o GNU tar le "C:\..." como
     * `host:caminho` e tenta abrir conexao com uma maquina chamada "C"
     * ("Cannot connect to C: resolve failed"). O `-C` nao sofre disso - a
     * heuristica de host so vale para o nome do arquivo de saida.
     */
    const filho = spawn("tar", ["-czf", nomeDoPacote, "-C", base, "."], {
      cwd: PASTA_BACKUPS,
      stdio: ["ignore", "inherit", "pipe"],
      windowsHide: true,
    });

    let erro = "";
    filho.stderr.on("data", (c: Buffer) => {
      erro += c.toString();
    });
    filho.on("error", (e) => falha(new Error(`nao consegui executar o tar: ${e.message}`)));
    filho.on("close", (codigo) => {
      if (codigo === 0) return ok(true);
      falha(new Error(`tar saiu com codigo ${codigo}${erro.trim() ? `:\n${erro.trim()}` : ""}`));
    });
  });
}

function lerQuantosManter(): number {
  const bruto = process.env.BACKUP_KEEP?.trim();
  if (!bruto) return MANTER_PADRAO;
  const n = Number(bruto);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`BACKUP_KEEP invalido: "${bruto}". Use um inteiro >= 1.`);
  }
  return n;
}

async function main(): Promise<void> {
  const conexao = lerConexao();
  const manter = lerQuantosManter();
  const binario = acharMysqldump();

  mkdirSync(PASTA_BACKUPS, { recursive: true });

  // Um carimbo so para os dois arquivos: e o que permite dizer, olhando a
  // pasta, qual pacote de anexos corresponde a qual dump.
  const carimbo = carimboDeHora(new Date());
  const destino = join(PASTA_BACKUPS, `crm-${carimbo}.sql`);
  const nomeAnexos = `anexos-${carimbo}.tar.gz`;
  const destinoAnexos = join(PASTA_BACKUPS, nomeAnexos);

  // Nunca logamos a URL inteira - ela carrega a senha.
  console.log(`banco  ${conexao.banco} @ ${conexao.host}:${conexao.porta} (usuario ${conexao.usuario})`);
  console.log(`dump   ${destino}`);

  try {
    await executarDump(binario, conexao, destino);
  } catch (e) {
    // Dump pela metade e pior que dump nenhum: some com ele para a rotacao
    // nao contar um arquivo corrompido como backup bom.
    if (existsSync(destino)) unlinkSync(destino);
    throw e;
  }

  const tamanho = statSync(destino).size;
  if (tamanho === 0) {
    unlinkSync(destino);
    throw new Error("mysqldump gerou um arquivo vazio; nada foi guardado.");
  }
  console.log(`ok     ${(tamanho / 1024).toFixed(1)} KB`);

  // Os anexos vem depois do dump de proposito: se o banco falhar, nao adianta
  // ter o pacote de arquivos. Se o pacote falhar com o dump pronto, o dump fica.
  try {
    if (await empacotarAnexos(nomeAnexos)) {
      console.log(`anexos ${(statSync(destinoAnexos).size / 1024).toFixed(1)} KB`);
    } else {
      console.log("anexos nenhum arquivo anexado ainda - nada a empacotar");
    }
  } catch (e) {
    if (existsSync(destinoAnexos)) unlinkSync(destinoAnexos);
    // Nao derruba o backup do banco, que ja esta em disco e valido. Mas grita:
    // um backup pela metade que se anuncia como completo e pior que nenhum.
    console.error(`AVISO: o dump do banco saiu, mas os anexos NAO foram empacotados.`);
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }

  const apagados = [...rotacionar(manter), ...rotacionar(manter, PADRAO_ANEXOS)];
  if (apagados.length > 0) {
    console.log(`rotacao (mantendo ${manter}): ${apagados.length} apagado(s)`);
    for (const a of apagados) console.log(`  - ${a}`);
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
