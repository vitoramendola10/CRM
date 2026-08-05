import Link from "next/link";
import type { Route } from "next";
import { Cabecalho, Vazio } from "@/components/ui/Cabecalho";
import { buscar, type Resultado, type TipoResultado } from "@/db/queries/busca";
import { PAPEIS_POR_ROTA, ROTAS } from "@/domain";
import { exigirSessao } from "@/lib/auth";
import { formatarData } from "@/lib/datas";
import { CampoBusca } from "./CampoBusca";

export const dynamic = "force-dynamic";

const ROTULO: Record<TipoResultado, string> = {
  chamado: "Chamados",
  rotina: "Rotinas de desenvolvimento",
  cliente: "Clientes",
};

const ORDEM: TipoResultado[] = ["chamado", "rotina", "cliente"];

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const eu = await exigirSessao();
  const { q } = await searchParams;
  const termo = (q ?? "").trim().slice(0, 120);

  // Cliente e area de configuracao: quem nao entra la nao acha por aqui.
  const podeVerClientes = PAPEIS_POR_ROTA[ROTAS.config]!.includes(eu.papel);
  const grupos = termo.length >= 2 ? await buscar(termo, podeVerClientes) : null;
  const total = grupos ? ORDEM.reduce((n, t) => n + grupos[t].length, 0) : 0;

  return (
    <main className="mx-auto max-w-4xl px-6 py-7">
      <Cabecalho
        titulo="Busca"
        descricao="Procura no assunto, na descricao, nos passos, nos comentarios e nas mensagens."
      />

      <div className="mb-4">
        <CampoBusca inicial={termo} />
      </div>

      {termo.length < 2 ? (
        <p className="text-[13px] text-tinta-fraca">Escreva pelo menos dois caracteres.</p>
      ) : total === 0 ? (
        <Vazio
          titulo={`Nada encontrado para "${termo}".`}
          detalhe="A busca cobre chamados, rotinas e clientes - nao cobre anexo nem historico."
        />
      ) : (
        <div className="grid gap-5">
          {ORDEM.map((tipo) => {
            const itens = grupos![tipo];
            if (itens.length === 0) return null;
            return (
              <section key={tipo}>
                <h2 className="mb-1.5 flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-tinta-fraca">
                  {ROTULO[tipo]}
                  <span className="num text-[11px]">{itens.length}</span>
                </h2>
                <ul className="grid gap-1">
                  {itens.map((r) => (
                    <li key={`${r.tipo}-${r.href}`}>
                      <Linha resultado={r} termo={termo} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Linha({ resultado, termo }: { resultado: Resultado; termo: string }) {
  return (
    <Link
      href={resultado.href as Route}
      className="transicao flex items-baseline gap-3 rounded-sm border border-linha bg-papel-alto px-3 py-2 hover:border-linha-forte hover:shadow-hover"
    >
      {resultado.codigo && (
        <span className="num shrink-0 text-[12px] text-tinta-fraca">{resultado.codigo}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">
          <Realce texto={resultado.titulo} termo={termo} />
        </span>
        {resultado.contexto && (
          <span className="block truncate text-[12px] text-tinta-fraca">
            <Realce texto={resultado.contexto} termo={termo} />
          </span>
        )}
      </span>
      {resultado.data && (
        <span className="num hidden shrink-0 text-[11px] text-tinta-fraca sm:block">
          {formatarData(resultado.data)}
        </span>
      )}
    </Link>
  );
}

/**
 * Marca o termo no resultado. Sem `dangerouslySetInnerHTML`: o texto vem do
 * banco e passa por aqui inteiro, entao ele e partido em pedacos e cada um vira
 * um no de texto - o React escapa sozinho e nao ha por onde injetar marcacao.
 */
function Realce({ texto, termo }: { texto: string; termo: string }) {
  const i = texto.toLowerCase().indexOf(termo.toLowerCase());
  if (i === -1) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, i)}
      <mark className="rounded-xs bg-acento/25 text-tinta">{texto.slice(i, i + termo.length)}</mark>
      {texto.slice(i + termo.length)}
    </>
  );
}
