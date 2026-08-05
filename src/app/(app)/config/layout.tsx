import { Cabecalho } from "@/components/ui/Cabecalho";
import { AbasConfig } from "./AbasConfig";

export default function ConfigLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-7">
      <Cabecalho
        titulo="Configuracao"
        descricao="O processo e o cadastro do sistema. Renomear aqui nao quebra relatorio."
      />
      <AbasConfig />
      {children}
    </main>
  );
}
