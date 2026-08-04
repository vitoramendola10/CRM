import type { Metadata } from "next";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: "Entrar | CRM Suporte + Dev" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string }>;
}) {
  const { de } = await searchParams;
  // So aceita caminho interno: `de` vem da URL e nao pode virar redirect aberto.
  const destino = de?.startsWith("/") && !de.startsWith("//") ? de : null;

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[19rem]">
        <header className="mb-6">
          <h1 className="text-[17px] font-semibold tracking-tight">CRM Suporte + Dev</h1>
          <p className="mt-0.5 text-[13px] text-tinta-media">
            Entre com seu usuario para continuar.
          </p>
        </header>

        <FormLogin de={destino} />
      </div>
    </main>
  );
}
