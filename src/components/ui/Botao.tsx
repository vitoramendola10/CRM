type Variante = "primario" | "secundario" | "fantasma" | "perigo";

const BASE =
  "transicao inline-flex items-center justify-center gap-1.5 rounded-sm border text-[13px] font-medium " +
  "disabled:cursor-not-allowed disabled:opacity-45";

const VARIANTE: Record<Variante, string> = {
  primario: "border-tinta bg-tinta text-papel-alto hover:bg-tinta-media hover:border-tinta-media",
  secundario: "border-linha-forte bg-papel-alto text-tinta hover:bg-papel-baixo",
  fantasma: "border-transparent bg-transparent text-tinta-media hover:bg-papel-baixo hover:text-tinta",
  perigo: "border-transparent bg-transparent text-cat-cancelado hover:bg-cat-cancelado/10",
};

const TAMANHO = { normal: "h-8 px-3", pequeno: "h-7 px-2 text-[12px]" } as const;

export function Botao({
  variante = "secundario",
  tamanho = "normal",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamanho?: keyof typeof TAMANHO;
}) {
  return (
    <button
      type="button"
      {...props}
      className={`${BASE} ${VARIANTE[variante]} ${TAMANHO[tamanho]} ${className}`}
    />
  );
}
