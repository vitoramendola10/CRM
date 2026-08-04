"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Vazio } from "@/components/ui/Cabecalho";
import { OUTBOX_MAX_TENTATIVAS, type NotificationOutbox } from "@/domain";
import { chamar } from "@/lib/api";
import { formatarDataHora } from "@/lib/datas";

export function Fila({ mensagens }: { mensagens: NotificationOutbox[] }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<number | null>(null);

  async function reenviar(id: number) {
    setOcupado(id);
    const r = await chamar(`/api/config/notificacoes/fila/${id}`, "POST");
    setOcupado(null);
    if (!r.ok) {
      alert(r.erro);
      return;
    }
    router.refresh();
  }

  if (mensagens.length === 0) {
    return (
      <Vazio
        titulo="Nenhuma notificacao com problema."
        detalhe="Se algo falhar no envio, aparece aqui com o motivo."
      />
    );
  }

  return (
    <ul className="grid gap-1">
      {mensagens.map((m) => (
        <li key={m.id} className="grid gap-1 rounded-sm border border-linha bg-papel-alto px-3 py-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="num text-[11px] text-tinta-fraca">#{m.id}</span>
            <span className="flex-1 truncate text-[13px] font-medium">{m.assunto}</span>
            <span className="num text-[11px] text-tinta-fraca">
              {m.tentativas}/{OUTBOX_MAX_TENTATIVAS} tentativas
            </span>
            <Botao
              tamanho="pequeno"
              disabled={ocupado === m.id}
              onClick={() => void reenviar(m.id)}
            >
              {ocupado === m.id ? "Enfileirando..." : "Tentar de novo"}
            </Botao>
          </div>

          <p className="num text-[11px] text-tinta-fraca">
            {m.destinatarios.length} destinatario(s)
            {m.situacao === "pendente" && ` - proxima tentativa ${formatarDataHora(m.proximaTentativa)}`}
          </p>

          {m.ultimoErro && (
            <p className="rounded-xs border border-cat-cancelado/25 bg-cat-cancelado/8 px-2 py-1 text-[12px] text-cat-cancelado">
              {m.ultimoErro}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
