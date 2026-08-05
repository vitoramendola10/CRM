"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { AreaTextoMencao } from "@/components/ui/AreaTextoMencao";
import { Campo, Selecao } from "@/components/ui/Campo";
import {
  PRIORIDADES,
  ROTULO_PRIORIDADE,
  type Cliente,
  type Prioridade,
  type Task,
  type TaskStatus,
  type TaskType,
  type Usuario,
} from "@/domain";
import { chamar } from "@/lib/api";
import type { CamposComErro } from "@/lib/rota";

export function FormTask({
  task,
  status,
  tipos,
  usuarios,
  clientes,
}: {
  task: Task;
  status: TaskStatus[];
  tipos: TaskType[];
  usuarios: Usuario[];
  clientes: Cliente[];
}) {
  const router = useRouter();
  const [f, setF] = useState({
    titulo: task.titulo,
    descricao: task.descricao ?? "",
    passosRepro: task.passosRepro ?? "",
    versaoSistema: task.versaoSistema ?? "",
    typeId: task.typeId ?? "",
    statusId: task.statusId,
    prioridade: task.prioridade,
    assigneeId: task.assigneeId ?? "",
    clientId: task.clientId ?? "",
    estimativaH: task.estimativaH === null ? "" : String(task.estimativaH),
    prazo: task.prazo ?? "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<CamposComErro>({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  // So os nomes: o campo de mencao nao precisa do resto do cadastro.
  const nomesDeUsuario = usuarios.map((u) => u.username);

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF({ ...f, [k]: v });
    setSalvo(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    setCampos({});

    const r = await chamar(`/api/tasks/${task.id}`, "PATCH", {
      titulo: f.titulo,
      descricao: f.descricao,
      passosRepro: f.passosRepro,
      versaoSistema: f.versaoSistema,
      typeId: f.typeId === "" ? null : f.typeId,
      statusId: f.statusId,
      prioridade: f.prioridade,
      assigneeId: f.assigneeId === "" ? null : f.assigneeId,
      clientId: f.clientId === "" ? null : f.clientId,
      estimativaH: f.estimativaH.trim() === "" ? null : Number(f.estimativaH),
      prazo: f.prazo === "" ? null : f.prazo,
    });

    setSalvando(false);
    if (!r.ok) {
      setErro(r.erro);
      setCampos(r.campos ?? {});
      return;
    }
    setSalvo(true);
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="grid gap-3">
      <Campo
        rotulo="Assunto"
        obrigatorio
        erro={campos.titulo}
        value={f.titulo}
        onChange={(e) => set("titulo", e.target.value)}
      />

      <AreaTextoMencao
        rotulo="Descricao"
        rows={4}
        usuarios={nomesDeUsuario}
        dica="Cite alguem com @ para avisar."
        erro={campos.descricao}
        value={f.descricao}
        aoMudar={(v) => set("descricao", v)}
      />

      <AreaTextoMencao
        rotulo="Passos para reproduzir"
        rows={4}
        usuarios={nomesDeUsuario}
        dica="O que fazer, nesta ordem, para o problema aparecer."
        erro={campos.passosRepro}
        value={f.passosRepro}
        aoMudar={(v) => set("passosRepro", v)}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Selecao
          rotulo="Status"
          obrigatorio
          erro={campos.statusId}
          value={f.statusId}
          onChange={(e) => set("statusId", e.target.value)}
        >
          {status.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </Selecao>

        <Selecao
          rotulo="Responsavel"
          value={f.assigneeId}
          onChange={(e) => set("assigneeId", e.target.value)}
        >
          <option value="">Sem responsavel</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </Selecao>

        <Selecao
          rotulo="Tipo"
          value={f.typeId}
          onChange={(e) => set("typeId", e.target.value)}
        >
          <option value="">Sem tipo</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </Selecao>

        <Selecao
          rotulo="Prioridade"
          value={f.prioridade}
          onChange={(e) => set("prioridade", e.target.value as Prioridade)}
        >
          {PRIORIDADES.map((p) => (
            <option key={p} value={p}>
              {ROTULO_PRIORIDADE[p]}
            </option>
          ))}
        </Selecao>

        <Selecao
          rotulo="Cliente"
          value={f.clientId}
          onChange={(e) => set("clientId", e.target.value)}
        >
          <option value="">Sem cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.razaoSocial}
            </option>
          ))}
        </Selecao>

        <Campo
          rotulo="Versao do sistema"
          mono
          erro={campos.versaoSistema}
          value={f.versaoSistema}
          onChange={(e) => set("versaoSistema", e.target.value)}
        />

        <Campo
          rotulo="Estimativa (horas)"
          type="number"
          step="0.5"
          min={0}
          mono
          erro={campos.estimativaH}
          value={f.estimativaH}
          onChange={(e) => set("estimativaH", e.target.value)}
        />

        <Campo
          rotulo="Prazo"
          type="date"
          mono
          erro={campos.prazo}
          value={f.prazo}
          onChange={(e) => set("prazo", e.target.value)}
        />
      </div>

      {erro && <p className="text-[13px] text-cat-cancelado">{erro}</p>}

      <div className="flex items-center gap-3">
        <Botao type="submit" variante="primario" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </Botao>
        {salvo && <span className="text-[12px] text-cat-concluido">Salvo.</span>}
      </div>
    </form>
  );
}
