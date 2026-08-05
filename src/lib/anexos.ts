import "server-only";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { ANEXO_MAX_BYTES, extensaoDoTipo } from "@/domain";
import { pastaDeAnexos } from "./anexos-pasta";
import { ErroDeNegocio } from "./rota";

/**
 * O arquivo do anexo em disco. O banco guarda so o registro (ver `attachments`
 * em db/schema.ts); o conteudo mora aqui.
 *
 * Tres regras que sustentam a seguranca deste modulo:
 *
 * 1. O nome em disco NUNCA vem do nome enviado. E `<uuid>.<ext>`, com a extensao
 *    saindo da tabela de tipos aceitos. O nome original vira coluna no banco,
 *    onde e so texto, e volta apenas no cabecalho do download.
 * 2. Todo caminho lido do banco passa por `absoluto()`, que confere que ele cai
 *    mesmo dentro da pasta base. O caminho e nosso, mas um registro adulterado
 *    ou um bug futuro nao pode virar "../../.env.local" no download.
 * 3. O tipo declarado pelo navegador e conferido contra a assinatura do proprio
 *    arquivo. Renomear um .exe para .png para de funcionar aqui.
 */

/** Resolvida em anexos-pasta.ts, que o script de backup tambem le. */
const BASE = pastaDeAnexos();

/** Resolve o caminho relativo e recusa qualquer coisa que escape da pasta base. */
function absoluto(relativo: string): string {
  const alvo = resolve(BASE, relativo);
  if (alvo !== BASE && !alvo.startsWith(BASE + sep)) {
    throw new ErroDeNegocio("Anexo invalido.", 400);
  }
  return alvo;
}

/**
 * Assinatura no inicio do arquivo. `offset` existe por causa do WEBP, que e um
 * contêiner RIFF: os quatro bytes que identificam o formato ficam na posicao 8.
 */
interface Assinatura {
  offset: number;
  bytes: readonly number[];
}

const ZIP: Assinatura[] = [
  { offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
  // Zip vazio e zip dividido em volumes. docx/xlsx sao zip, entao herdam isto.
  { offset: 0, bytes: [0x50, 0x4b, 0x05, 0x06] },
  { offset: 0, bytes: [0x50, 0x4b, 0x07, 0x08] },
];

/** Formato antigo do Office (.doc/.xls): contêiner OLE2. */
const OLE: Assinatura[] = [{ offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }];

/**
 * So os formatos com assinatura confiavel entram aqui. Texto puro e CSV nao tem
 * nenhuma - e nao ha o que inventar: sao aceitos pelo tipo declarado, e o risco
 * e baixo justamente porque a rota de download nunca os serve dentro da pagina.
 */
const ASSINATURAS: Readonly<Record<string, readonly Assinatura[]>> = {
  "image/png": [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  "image/jpeg": [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  "image/gif": [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }],
  "image/webp": [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  ],
  "application/pdf": [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }],
  "application/zip": ZIP,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ZIP,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ZIP,
  "application/msword": OLE,
  "application/vnd.ms-excel": OLE,
};

/**
 * WEBP exige TODAS as assinaturas (RIFF e WEBP); ZIP aceita QUALQUER uma das
 * tres variantes. A diferenca esta em serem partes de um mesmo cabecalho ou
 * alternativas do mesmo formato - dai o teste ser por tipo, e nao global.
 */
export function assinaturaConfere(tipoMime: string, inicio: Uint8Array): boolean {
  const esperadas = ASSINATURAS[tipoMime];
  if (!esperadas) return true; // Sem assinatura conhecida: nada a conferir.

  const casa = (a: Assinatura): boolean =>
    a.bytes.every((b, i) => inicio[a.offset + i] === b);

  return tipoMime === "image/webp" ? esperadas.every(casa) : esperadas.some(casa);
}

/**
 * Nome so para exibir e para o cabecalho do download - nunca para o disco.
 *
 * Tira o caminho, porque navegador antigo mandava "C:\pasta\foto.png" inteiro,
 * e os caracteres de controle: num cabecalho HTTP, um \r\n no meio do nome
 * permitiria emendar outro cabecalho na resposta.
 */
export function limparNome(bruto: string): string {
  const semCaminho = bruto.split(/[/\\]/).pop() ?? "";
  const limpo = semCaminho.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (limpo.length > 0 ? limpo : "arquivo").slice(0, 255);
}

export interface ArquivoGravado {
  /** Relativo a pasta base: "2026/08/<uuid>.png". */
  caminho: string;
  tamanhoBytes: number;
}

/**
 * Confere e grava. Devolve o caminho relativo para o banco.
 *
 * O arquivo inteiro entra na memoria antes de ir para o disco. Com teto de
 * 15 MB e uma equipe de dez pessoas isso e barato, e em troca da para conferir
 * a assinatura ANTES de escrever qualquer byte - com stream seria preciso
 * gravar primeiro e apagar depois de descobrir que nao servia.
 */
export async function gravarAnexo(arquivo: File): Promise<ArquivoGravado> {
  const extensao = extensaoDoTipo(arquivo.type);
  if (!extensao) {
    throw new ErroDeNegocio(
      `Tipo de arquivo nao aceito${arquivo.type ? ` (${arquivo.type})` : ""}. ` +
        "Envie imagem, PDF, texto, planilha, documento do Word ou zip.",
      415,
    );
  }

  // Confere antes de ler: `arquivo.size` ja vem do multipart, sem custo.
  if (arquivo.size > ANEXO_MAX_BYTES) {
    throw new ErroDeNegocio(
      `Arquivo muito grande. O limite e ${Math.floor(ANEXO_MAX_BYTES / 1024 / 1024)} MB.`,
      413,
    );
  }
  if (arquivo.size === 0) throw new ErroDeNegocio("Arquivo vazio.", 400);

  const conteudo = new Uint8Array(await arquivo.arrayBuffer());
  if (!assinaturaConfere(arquivo.type, conteudo.subarray(0, 16))) {
    throw new ErroDeNegocio(
      `O conteudo do arquivo nao corresponde a um ${extensao.toUpperCase()}. ` +
        "Renomear a extensao nao muda o formato.",
      415,
    );
  }

  // Pastas por ano/mes: uma pasta unica com dezenas de milhares de arquivos
  // fica lenta de listar e impossivel de inspecionar na mao.
  const agora = new Date();
  const subpasta = `${agora.getFullYear()}/${String(agora.getMonth() + 1).padStart(2, "0")}`;
  const caminho = `${subpasta}/${randomUUID()}.${extensao}`;

  const destino = absoluto(caminho);
  await mkdir(resolve(BASE, subpasta), { recursive: true });
  await writeFile(destino, conteudo, { flag: "wx" }); // wx: nunca sobrescreve.

  return { caminho, tamanhoBytes: conteudo.byteLength };
}

/** Stream para a resposta HTTP. Nao carrega o arquivo na memoria. */
export async function abrirAnexo(relativo: string): Promise<ReadableStream<Uint8Array>> {
  const alvo = absoluto(relativo);
  try {
    await stat(alvo);
  } catch {
    // Registro no banco sem arquivo em disco: alguem mexeu na pasta na mao.
    throw new ErroDeNegocio("O arquivo deste anexo nao esta mais no servidor.", 404);
  }
  return Readable.toWeb(createReadStream(alvo)) as ReadableStream<Uint8Array>;
}

/**
 * Apaga o arquivo. Arquivo que ja nao existe nao e erro: o objetivo e que ele
 * deixe de existir, e isso ja esta satisfeito.
 */
export async function apagarAnexo(relativo: string): Promise<void> {
  try {
    await unlink(absoluto(relativo));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}
