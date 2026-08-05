/** Exportado para o campo com mencao reusar a mesma aparencia. */
export const CONTROLE =
  "transicao w-full rounded-sm border border-linha-forte bg-papel-alto px-2.5 text-[13px] " +
  "text-tinta placeholder:text-tinta-fraca hover:border-tinta-fraca " +
  "disabled:cursor-not-allowed disabled:bg-papel-baixo disabled:text-tinta-fraca";

function Rotulo({ texto, obrigatorio }: { texto: string; obrigatorio?: boolean | undefined }) {
  return (
    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-tinta-fraca">
      {texto}
      {obrigatorio && <span className="ml-0.5 text-cat-cancelado">*</span>}
    </span>
  );
}

function Erro({ texto }: { texto?: string | undefined }) {
  if (!texto) return null;
  return <span className="mt-1 block text-[12px] text-cat-cancelado">{texto}</span>;
}

export function Campo({
  rotulo,
  erro,
  dica,
  mono = false,
  obrigatorio,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string;
  // `| undefined` explicito: com exactOptionalPropertyTypes, quem passa
  // `erro={campos.nome}` de um Record esta passando `string | undefined`.
  erro?: string | undefined;
  dica?: string | undefined;
  mono?: boolean | undefined;
  obrigatorio?: boolean | undefined;
}) {
  return (
    <label className="block">
      <Rotulo texto={rotulo} obrigatorio={obrigatorio} />
      <input
        {...props}
        className={`${CONTROLE} h-8 ${mono ? "num" : ""} ${erro ? "border-cat-cancelado" : ""} ${className}`}
      />
      {dica && !erro && <span className="mt-1 block text-[12px] text-tinta-fraca">{dica}</span>}
      <Erro texto={erro} />
    </label>
  );
}

export function AreaTexto({
  rotulo,
  erro,
  dica,
  obrigatorio,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  rotulo: string;
  erro?: string | undefined;
  dica?: string | undefined;
  obrigatorio?: boolean | undefined;
}) {
  return (
    <label className="block">
      <Rotulo texto={rotulo} obrigatorio={obrigatorio} />
      <textarea
        rows={4}
        {...props}
        className={`${CONTROLE} resize-y py-1.5 leading-relaxed ${erro ? "border-cat-cancelado" : ""} ${className}`}
      />
      {dica && !erro && <span className="mt-1 block text-[12px] text-tinta-fraca">{dica}</span>}
      <Erro texto={erro} />
    </label>
  );
}

export function Selecao({
  rotulo,
  erro,
  obrigatorio,
  children,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  rotulo: string;
  erro?: string | undefined;
  obrigatorio?: boolean | undefined;
}) {
  return (
    <label className="block">
      <Rotulo texto={rotulo} obrigatorio={obrigatorio} />
      <select
        {...props}
        className={`${CONTROLE} h-8 cursor-pointer ${erro ? "border-cat-cancelado" : ""} ${className}`}
      >
        {children}
      </select>
      <Erro texto={erro} />
    </label>
  );
}

/** Seletor de cor com o hex ao lado: a cor e um dado do banco, e util ver o valor. */
export function CampoCor({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
}) {
  return (
    <label className="block">
      <Rotulo texto={rotulo} />
      <span className="flex h-8 items-center gap-2 rounded-sm border border-linha-forte bg-papel-alto px-1.5">
        <input
          type="color"
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          className="size-5 cursor-pointer rounded-xs border-0 bg-transparent p-0"
        />
        <span className="num text-[12px] uppercase text-tinta-media">{valor}</span>
      </span>
    </label>
  );
}
