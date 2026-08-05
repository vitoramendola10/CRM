import { describe, expect, it } from "vitest";
import { ANEXO_TIPOS, anexoEhImagem, extensaoDoTipo, formatarTamanho } from "@/domain";
import { assinaturaConfere, limparNome } from "@/lib/anexos";

/**
 * As decisoes de anexo que dao para testar sem tocar em disco. Tres delas sao
 * de seguranca, e nenhuma falha de forma visivel: um SVG aceito por engano so
 * vira problema no dia em que alguem anexar um com <script> dentro.
 */

function bytes(...b: number[]): Uint8Array {
  // 16 bytes como a rota le: o WEBP so se identifica na posicao 8.
  const u = new Uint8Array(16);
  u.set(b);
  return u;
}

const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const JPG = bytes(0xff, 0xd8, 0xff, 0xe0);
const PDF = bytes(0x25, 0x50, 0x44, 0x46, 0x2d);
const ZIP = bytes(0x50, 0x4b, 0x03, 0x04);
const EXE = bytes(0x4d, 0x5a, 0x90, 0x00);

describe("lista de tipos aceitos", () => {
  it("nao aceita o que o navegador executaria no nosso dominio", () => {
    // SVG e XML e aceita <script>; HTML nem se discute. Os dois seriam servidos
    // com Content-Type legitimo e rodariam no dominio da aplicacao.
    expect(extensaoDoTipo("image/svg+xml")).toBeNull();
    expect(extensaoDoTipo("text/html")).toBeNull();
    expect(extensaoDoTipo("application/javascript")).toBeNull();
    expect(extensaoDoTipo("application/x-msdownload")).toBeNull();
    expect(extensaoDoTipo("")).toBeNull();
  });

  it("aceita o que um atendimento produz", () => {
    expect(extensaoDoTipo("image/png")).toBe("png");
    expect(extensaoDoTipo("application/pdf")).toBe("pdf");
    expect(extensaoDoTipo("text/plain")).toBe("txt");
  });

  it("so imagem abre dentro da pagina", () => {
    expect(anexoEhImagem("image/png")).toBe(true);
    expect(anexoEhImagem("image/webp")).toBe(true);
    expect(anexoEhImagem("application/pdf")).toBe(false);
    // Nao esta na lista: mesmo comecando com image/, nao abre inline.
    expect(anexoEhImagem("image/svg+xml")).toBe(false);
  });

  it("toda extensao e simples, sem ponto nem caminho", () => {
    for (const ext of Object.values(ANEXO_TIPOS)) {
      expect(ext).toMatch(/^[a-z0-9]+$/);
    }
  });
});

describe("assinaturaConfere", () => {
  it("aceita o arquivo que e o que diz ser", () => {
    expect(assinaturaConfere("image/png", PNG)).toBe(true);
    expect(assinaturaConfere("image/jpeg", JPG)).toBe(true);
    expect(assinaturaConfere("application/pdf", PDF)).toBe(true);
    expect(assinaturaConfere("application/zip", ZIP)).toBe(true);
    // docx e xlsx sao zip por dentro.
    const docx = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    expect(assinaturaConfere(docx, ZIP)).toBe(true);
  });

  it("recusa executavel renomeado para imagem", () => {
    // O caso que a checagem existe para pegar: virus.exe -> foto.png.
    expect(assinaturaConfere("image/png", EXE)).toBe(false);
    expect(assinaturaConfere("image/jpeg", EXE)).toBe(false);
    expect(assinaturaConfere("application/pdf", EXE)).toBe(false);
  });

  it("recusa uma imagem passando por outra", () => {
    expect(assinaturaConfere("image/png", JPG)).toBe(false);
    expect(assinaturaConfere("image/jpeg", PNG)).toBe(false);
  });

  it("WEBP exige RIFF no inicio E WEBP na posicao 8", () => {
    const webp = new Uint8Array(16);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(assinaturaConfere("image/webp", webp)).toBe(true);

    // RIFF sozinho tambem e WAV e AVI - nao basta.
    const soRiff = bytes(0x52, 0x49, 0x46, 0x46);
    expect(assinaturaConfere("image/webp", soRiff)).toBe(false);
  });

  it("deixa passar o que nao tem assinatura confiavel", () => {
    // Texto e CSV nao tem numero magico. Sao aceitos pelo tipo declarado, e o
    // risco fica baixo porque a rota nunca os serve dentro da pagina.
    expect(assinaturaConfere("text/plain", bytes(0x6f, 0x69))).toBe(true);
    expect(assinaturaConfere("text/csv", bytes(0x61, 0x2c, 0x62))).toBe(true);
  });

  it("nao estoura com arquivo menor que a assinatura", () => {
    expect(assinaturaConfere("image/png", new Uint8Array([0x89]))).toBe(false);
    expect(assinaturaConfere("image/png", new Uint8Array(0))).toBe(false);
  });
});

describe("limparNome", () => {
  it("tira o caminho que alguns navegadores mandam junto", () => {
    expect(limparNome("C:\\Users\\vitor\\Desktop\\erro.png")).toBe("erro.png");
    expect(limparNome("/home/vitor/erro.png")).toBe("erro.png");
  });

  it("tira caractere de controle", () => {
    // \r\n no meio do nome permitiria emendar cabecalho na resposta HTTP.
    expect(limparNome("nota\r\nX-Injetado: 1.pdf")).toBe("notaX-Injetado: 1.pdf");
    expect(limparNome("a\u0000b.txt")).toBe("ab.txt");
  });

  it("preserva acento, espaco e hifen, que sao nome legitimo", () => {
    expect(limparNome("relatorio final - marco.pdf")).toBe("relatorio final - marco.pdf");
    expect(limparNome("Não conformidade.pdf")).toBe("Não conformidade.pdf");
  });

  it("nunca devolve vazio", () => {
    expect(limparNome("")).toBe("arquivo");
    expect(limparNome("   ")).toBe("arquivo");
    expect(limparNome("/")).toBe("arquivo");
  });

  it("corta no tamanho da coluna", () => {
    expect(limparNome("a".repeat(400))).toHaveLength(255);
  });
});

describe("formatarTamanho", () => {
  it("escolhe a unidade que a pessoa consegue ler", () => {
    expect(formatarTamanho(0)).toBe("0 B");
    expect(formatarTamanho(900)).toBe("900 B");
    expect(formatarTamanho(1536)).toBe("1,5 KB");
    expect(formatarTamanho(500 * 1024)).toBe("500 KB");
    expect(formatarTamanho(15 * 1024 * 1024)).toBe("15,0 MB");
  });

  it("usa virgula decimal, que e como se escreve numero aqui", () => {
    expect(formatarTamanho(1536)).not.toContain(".");
  });
});
