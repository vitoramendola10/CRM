import { Painel } from "@/components/ui/Painel";
import { listarBoards } from "@/db/queries/config";
import { contarPorSituacao, listarOutbox, listarRegras } from "@/db/queries/notifications";
import { listarUsuarios } from "@/db/queries/users";
import { smtpConfigurado } from "@/lib/mailer";
import { Fila } from "./Fila";
import { ListaRegras } from "./ListaRegras";

export const dynamic = "force-dynamic";

export default async function NotificacoesPage() {
  const [regras, boards, usuarios, comErro, pendentes, contagem] = await Promise.all([
    listarRegras(),
    listarBoards(),
    listarUsuarios(true),
    listarOutbox("erro"),
    listarOutbox("pendente"),
    contarPorSituacao(),
  ]);

  // Pendente com tentativa ja feita e uma falha em backoff, nao uma fila normal.
  const problemas = [...comErro, ...pendentes.filter((m) => m.tentativas > 0)].sort(
    (a, b) => b.id - a.id,
  );

  return (
    <div className="grid gap-4">
      {!smtpConfigurado() && (
        <p className="rounded-sm border border-prio-media/35 bg-prio-media/8 px-3 py-2 text-[13px]">
          <strong className="font-medium">SMTP nao configurado.</strong> A fila roda e marca as
          mensagens como enviadas, mas elas so aparecem no console do worker. Defina{" "}
          <span className="num">SMTP_HOST</span> no <span className="num">.env.local</span> para
          enviar de verdade.
        </p>
      )}

      <ListaRegras regras={regras} boards={boards} usuarios={usuarios} />

      <Painel titulo="Fila com problema" contagem={problemas.length}>
        <Fila mensagens={problemas} />
      </Painel>

      <p className="num text-[12px] text-tinta-fraca">
        Fila total: {contagem.pendente ?? 0} pendente(s), {contagem.enviado ?? 0} enviada(s),{" "}
        {contagem.erro ?? 0} com erro. O worker roda com{" "}
        <span className="text-tinta-media">npm run worker</span>.
      </p>
    </div>
  );
}
