"use client";

/**
 * Fase 4 — Tarefa por link público, fora do shell e só leitura. Abre enquanto
 * o segredo estiver ativo; revogar o link fecha esta página na hora.
 */

import { use } from "react";
import { useData } from "@/data/store";
import { useHidratado } from "@/features/shell/app-shell";
import { taskByPublicSecret } from "@/data/operations";
import { statusDefinition } from "@/data/derive";
import { PRIORITY_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";

export default function TarefaPublicaPage({ params }: { params: Promise<{ segredo: string }> }) {
  const { segredo } = use(params);
  const state = useData((data) => data);
  const fmt = useFormat();
  const pronto = useHidratado();
  if (!pronto) return null;

  const task = taskByPublicSecret(state, segredo);
  if (!task || !task.publicShare) {
    return (
      <main className="mx-auto grid min-h-screen max-w-lg place-items-center p-6">
        <div className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-6 text-center">
          <h1 className="text-[length:var(--texto-lg)] font-semibold text-[var(--cor-tinta)]">Link indisponível</h1>
          <p className="mt-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">Este link foi revogado ou não existe. Peça um novo a quem o enviou.</p>
        </div>
      </main>
    );
  }
  const definition = statusDefinition(state, task.listId, task.statusId);
  const nomeDe = (id: string) => state.members.find((m) => m.id === id)?.displayName ?? state.agents.find((a) => a.id === id)?.name ?? id;
  const comentarios = task.publicShare.showsComments ? task.comments.filter((c) => !c.deletedAt) : [];
  // 7.7 — o compartilhamento expõe o agregado da Tarefa: Subtarefas e Valores de Campo inclusive.
  const subtarefas = state.tasks.filter((t) => t.parentTaskId === task.id && t.lifecycle === "ativo").sort((a, b) => a.siblingOrder - b.siblingOrder);
  const valores = task.fieldValues
    .filter((v) => v.state === "ativo")
    .map((v) => ({ nome: state.fieldDefinitions.find((d) => d.id === v.definitionId)?.name ?? v.definitionId, valor: Array.isArray(v.value) ? v.value.join(", ") : String(v.value ?? "—") }));
  const anexos = task.publicShare.showsAttachments ? task.attachments : [];

  return (
    <main className="mx-auto grid min-h-screen max-w-2xl content-start gap-4 p-6">
      <p className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">Visualização pública · só leitura</p>
      <header className="grid gap-2">
        <h1 className="text-[length:var(--texto-xl)] font-semibold text-[var(--cor-tinta)]">{task.title}</h1>
        <p className="flex flex-wrap gap-3 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
          {definition ? (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: definition.color }} />
              {definition.name}
            </span>
          ) : null}
          <span>Prioridade: {PRIORITY_LABEL[task.priority] ?? task.priority}</span>
          {task.dueDate ? <span>Vencimento: {fmt.taskDate(task.dueDate)}</span> : null}
          {task.assignees.length > 0 ? <span>Responsáveis: {task.assignees.map((a) => nomeDe(a.id)).join(", ")}</span> : null}
        </p>
      </header>
      <section className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4">
        <h2 className="text-[length:var(--texto-base)] font-semibold text-[var(--cor-tinta)]">Descrição</h2>
        <p className="mt-1 whitespace-pre-wrap text-[length:var(--texto-base)] text-[var(--cor-tinta)]">{task.description || "—"}</p>
      </section>
      {valores.length > 0 ? (
        <section className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4">
          <h2 className="text-[length:var(--texto-base)] font-semibold text-[var(--cor-tinta)]">Campos</h2>
          <dl className="mt-1 grid gap-1 text-[length:var(--texto-base)]">
            {valores.map((v) => (
              <div key={v.nome} className="flex gap-2">
                <dt className="text-[var(--cor-tinta-fraca)]">{v.nome}:</dt>
                <dd className="text-[var(--cor-tinta)]">{v.valor}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      {subtarefas.length > 0 ? (
        <section className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4">
          <h2 className="text-[length:var(--texto-base)] font-semibold text-[var(--cor-tinta)]">Subtarefas</h2>
          <ul className="mt-1 grid gap-0.5 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
            {subtarefas.map((t) => {
              const d = statusDefinition(state, t.listId, t.statusId);
              return (
                <li key={t.id}>
                  {t.title} <span className="text-[var(--cor-tinta-fraca)]">· {d?.name ?? "—"}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {task.checklists.length > 0 ? (
        <section className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4">
          <h2 className="text-[length:var(--texto-base)] font-semibold text-[var(--cor-tinta)]">Checklists</h2>
          {task.checklists.map((c) => (
            <div key={c.id} className="mt-2">
              <h3 className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">{c.name}</h3>
              <ul className="mt-1 grid gap-0.5 text-[length:var(--texto-base)]">
                {c.items.filter((i) => !i.converted).map((i) => (
                  <li key={i.id} className={i.done ? "text-[var(--cor-tinta-fraca)] line-through" : "text-[var(--cor-tinta)]"}>
                    {i.done ? "☑" : "☐"} {i.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
      {task.publicShare.showsAttachments ? (
        <section className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4">
          <h2 className="text-[length:var(--texto-base)] font-semibold text-[var(--cor-tinta)]">Anexos</h2>
          {anexos.length === 0 ? <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">Nenhum anexo.</p> : (
            <ul className="mt-1 grid gap-0.5 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
              {anexos.map((a) => <li key={a.fileId}>{a.displayName ?? a.fileId}</li>)}
            </ul>
          )}
        </section>
      ) : null}
      {task.publicShare.showsComments ? (
        <section className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4">
          <h2 className="text-[length:var(--texto-base)] font-semibold text-[var(--cor-tinta)]">Comentários</h2>
          {comentarios.length === 0 ? <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">Nenhum comentário.</p> : (
            <ul className="mt-1 grid gap-2">
              {comentarios.map((c) => (
                <li key={c.id} className="text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                  <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">{nomeDe(c.author.id)} · {fmt.relative(c.createdAt)}</span>
                  <p className="whitespace-pre-wrap">{c.content}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </main>
  );
}
