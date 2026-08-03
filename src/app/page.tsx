import { Painel } from "@/components/ui/Painel";
import { Selo } from "@/components/ui/Selo";
import { COR_CATEGORIA, ROTULO_CATEGORIA } from "@/domain";
import { carregarDiagnostico } from "@/services/diagnostico";

// A configuracao vem do banco a cada carga: nada aqui e chumbado.
export const dynamic = "force-dynamic";

export default async function Home() {
  const d = await carregarDiagnostico();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 border-b border-linha-forte pb-5">
        <p className="num mb-1 text-[11px] uppercase tracking-[0.14em] text-tinta-fraca">
          Etapa 1 de 8
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">CRM Suporte + Dev</h1>
        <p className="mt-1 text-tinta-media">
          Dominio, schema e seed no lugar. As telas comecam na etapa 2.
        </p>
      </header>

      {d.ok ? (
        <div className="grid gap-4">
          <Painel titulo="Etapas do processo" contagem={d.colunas.length}>
            {d.colunas.length === 0 ? (
              <Vazio texto="Nenhuma coluna cadastrada ainda." />
            ) : (
              <ol className="grid gap-1">
                {d.colunas.map((c) => (
                  <li key={c.id} className="flex items-baseline gap-2.5 py-0.5">
                    <span className="num w-5 text-right text-tinta-fraca">{c.ordem}</span>
                    <span className="flex-1">{c.nome}</span>
                    {c.isDone && <Selo texto="devolve ao suporte" cor={COR_CATEGORIA.concluido} />}
                  </li>
                ))}
              </ol>
            )}
          </Painel>

          <Painel titulo="Status" contagem={d.status.length}>
            <ul className="grid gap-1">
              {d.status.map((s) => (
                <li key={s.id} className="flex items-baseline justify-between gap-3 py-0.5">
                  <span>{s.nome}</span>
                  <Selo texto={ROTULO_CATEGORIA[s.categoria]} cor={s.cor} />
                </li>
              ))}
            </ul>
          </Painel>

          <Painel titulo="Tipos de rotina" contagem={d.tipos.length}>
            <ul className="flex flex-wrap gap-1.5">
              {d.tipos.map((t) => (
                <li key={t.id}>
                  <Selo texto={t.nome} cor={t.cor} />
                </li>
              ))}
            </ul>
          </Painel>
        </div>
      ) : (
        <BancoNaoPronto motivo={d.motivo} detalhe={d.detalhe} />
      )}
    </main>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="py-1 text-tinta-fraca">{texto}</p>;
}

function BancoNaoPronto({ motivo, detalhe }: { motivo: string; detalhe: string }) {
  const semMigration = motivo === "sem_migration";
  return (
    <div className="rounded-sm border border-linha bg-papel-alto p-5">
      <h2 className="mb-1 font-semibold">
        {semMigration ? "O banco existe, mas ainda esta vazio." : "Nao consegui falar com o banco."}
      </h2>
      <p className="mb-4 text-tinta-media">
        {semMigration
          ? "Falta aplicar as migrations e o seed."
          : "Confira a DATABASE_URL em .env.local e se o servico do MySQL esta rodando."}
      </p>
      <pre className="num overflow-x-auto rounded-xs border border-linha bg-papel-baixo px-3 py-2 text-[12px]">
        npm run db:setup
      </pre>
      <p className="mt-4 border-t border-linha pt-3 text-[12px] text-tinta-fraca">{detalhe}</p>
    </div>
  );
}
