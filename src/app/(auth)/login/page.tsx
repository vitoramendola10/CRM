import type { Metadata } from "next";
import { Marca } from "@/components/Marca";
import { MARCA, ambiente } from "@/domain/marca";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: `Entrar | ${MARCA.nome} ${MARCA.produto}` };

/**
 * Tela dividida: identidade de um lado, formulario do outro.
 *
 * A versao anterior era uma caixa de 19rem centralizada num fundo vazio, com o
 * titulo no mesmo tamanho de qualquer cabecalho do sistema - nada dizia que
 * aquela era a porta de entrada de alguma coisa. Aqui a marca tem espaco para
 * existir, e o formulario continua sendo o menor elemento da tela, o que esta
 * certo: quem entra todo dia faz isso de olhos fechados.
 *
 * No celular o lado da marca vira uma faixa no topo em vez de sumir: a
 * identidade nao pode desaparecer justo onde ela mais importa, que e na
 * primeira vez que alguem abre o sistema.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string }>;
}) {
  const { de } = await searchParams;
  // So aceita caminho interno: `de` vem da URL e nao pode virar redirect aberto.
  const destino = de?.startsWith("/") && !de.startsWith("//") ? de : null;

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/*
        Este lado e SEMPRE escuro, nos dois temas. E a superficie da marca, nao
        a do sistema - e no tema claro os dois lados ficariam com tons de papel
        quase iguais, apagando a divisao que da o sentido da tela.

        Sobrescrever as variaveis aqui basta porque o @theme do globals.css e
        `inline`: as utilitarias apontam para `var(--tinta)` em vez de gravar a
        cor, entao trocar a variavel neste bloco recolore tudo o que esta dentro,
        inclusive a marca, sem uma classe condicional sequer.
      */}
      <section
        className="grade relative flex flex-col border-linha-forte bg-papel-baixo px-8 py-10 lg:border-r lg:px-14 lg:py-14"
        style={
          {
            "--papel-baixo": "#0e1014",
            "--tinta": "#e9e6e1",
            "--tinta-media": "#a6a19a",
            "--tinta-fraca": "#6b6862",
            "--linha": "#22262e",
            "--linha-forte": "#333944",
          } as React.CSSProperties
        }
      >
        {/* Esfuma a grade em direcao as bordas para ela nao terminar num corte
            reto. Nao e degrade decorativo: e a propria cor do fundo cobrindo a
            textura, para a grade nascer densa em cima e sumir embaixo. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(100% 70% at 20% 10%, transparent 20%, var(--papel-baixo) 95%)",
          }}
        />

        {/* Marca e frase juntas e na altura do formulario do outro lado: sao
            uma composicao so. Marca no topo com o formulario no meio parecia
            desalinho, e nao decisao. */}
        <div className="relative lg:my-auto">
          <Marca tamanho="grande" />
          <p className="mt-8 max-w-sm text-[17px] leading-relaxed text-tinta-media lg:text-[19px]">
            {MARCA.descricao}
          </p>
        </div>

        <div className="relative mt-10 flex items-center gap-3 lg:mt-auto">
          <span className="num text-[11px] tracking-[0.1em] text-tinta-fraca">
            v{MARCA.versao}
          </span>
          <span aria-hidden className="h-3 w-px bg-linha-forte" />
          <span className="num text-[11px] tracking-[0.1em] text-tinta-fraca">{ambiente()}</span>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-[20rem]">
          <h1 className="titulo-pagina">Entrar</h1>
          <p className="mb-6 mt-1.5 text-[13px] text-tinta-media">
            Use o usuario que a administracao cadastrou.
          </p>
          <FormLogin de={destino} />
        </div>
      </section>
    </main>
  );
}
