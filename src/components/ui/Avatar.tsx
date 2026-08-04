/**
 * Iniciais em vez de foto: e cadastro interno, ninguem vai subir imagem.
 * Sem nome, o contorno tracejado sinaliza "falta responsavel" sem precisar de texto.
 */
export function Avatar({ nome, tamanho = 22 }: { nome: string | null; tamanho?: number }) {
  const estilo = { width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.42) };

  if (!nome) {
    return (
      <span
        title="Sem responsavel"
        style={estilo}
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-tinta-fraca text-tinta-fraca"
      />
    );
  }

  return (
    <span
      title={nome}
      style={{ ...estilo, backgroundColor: corDoNome(nome) }}
      className="num inline-flex shrink-0 items-center justify-center rounded-full font-medium text-papel-alto"
    >
      {iniciais(nome)}
    </span>
  );
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes.at(-1)?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

/**
 * Tons terrosos dessaturados, dentro da paleta de papel. Nada de cor viva:
 * cor viva na interface significa prioridade ou categoria, nao identidade.
 */
const TONS = ["#6b5f4e", "#5b6b5f", "#6b5b5b", "#4f5f6b", "#6b654e", "#5f5468"];

function corDoNome(nome: string): string {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  return TONS[h % TONS.length]!;
}
