"use client";

/**
 * T51 — Notificações.
 *
 * There is no Notificação entity in the ontology: what the Member has to answer
 * is derived from records that already exist — Approvals addressed to them,
 * Conversations assigned to them, overdue Tasks, blocked Tasks. Registered in
 * PENDENCIAS-FRONTEND as an interface concept without an ontological base.
 */

import Link from "next/link";
import { useState } from "react";
import { useData, useSession } from "@/data/store";
import {
  contactDisplayName,
  effectiveLifecycleOfTask,
  isBlocked,
  isOverdue,
  isTerminalCategory,
  pendingMentions,
  statusCategory,
} from "@/data/derive";
import { useFormat } from "@/features/shell/use-format";
import { ConditionMarker, EmptyState, PageHeader, Section } from "@/features/shell/ui";

export default function NotificacoesPage() {
  const state = useData((data) => data);
  const fmt = useFormat();
  const { memberId } = useSession();
  const [now] = useState(() => new Date());

  const approvals = state.approvals.filter(
    (approval) => approval.decision === undefined && approval.approverMemberId === memberId,
  );

  const myTasks = state.tasks
    .filter((task) => task.assignees.some((a) => a.kind === "member" && a.id === memberId))
    .filter((task) => effectiveLifecycleOfTask(state, task.id) === "ativo")
    .filter((task) => !isTerminalCategory(statusCategory(state, task)));

  const overdue = myTasks.filter((task) => isOverdue(state, task, now));
  const blocked = myTasks.filter((task) => isBlocked(state, task));

  const conversations = state.conversations.filter(
    (conversation) =>
      conversation.lifecycle === "ativo" &&
      conversation.state !== "resolvida" &&
      conversation.assignee?.kind === "member" &&
      conversation.assignee.id === memberId,
  );

  const failedExecutions = state.agentExecutions.filter((execution) => {
    if (execution.state !== "falhou") return false;
    const agent = state.agents.find((a) => a.id === execution.agentId);
    return agent?.ownerMemberId === memberId;
  });

  const mentions = pendingMentions(state, memberId);

  const total =
    approvals.length + mentions.length + overdue.length + blocked.length + conversations.length + failedExecutions.length;

  return (
    <>
      <PageHeader
        title="Notificações"
        meta={
          total === 0
            ? "Nada aguarda você."
            : `${total} item(ns) esperando por você, derivados dos registros — não há uma entidade Notificação.`
        }
      />

      <div className="p-6">
        {total === 0 ? (
          <EmptyState
            title="Nada aguarda você."
            hint="Aparecem aqui Aprovações para você decidir, menções a você em Comentários, Conversas atribuídas, Tarefas vencidas ou bloqueadas e Execuções que falharam."
          />
        ) : null}

        {approvals.length > 0 ? (
          <Section title="Aprovações para decidir" count={approvals.length}>
            <ul className="divide-y divide-[var(--cor-traco)] overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
              {approvals.map((approval) => (
                <li key={approval.id}>
                  <Link href="/ia/aprovacoes" className="block px-4 py-2 hover:bg-[var(--cor-superficie-2)]">
                    <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                      {state.tools.find((t) => t.id === approval.object.toolId)?.name ??
                        approval.object.toolId}
                    </p>
                    <p className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                      motivo {approval.reason} · vence {fmt.relative(approval.deadline, now.getTime())}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {mentions.length > 0 ? (
          <Section title="Menções a você" count={mentions.length}>
            <ul className="divide-y divide-[var(--cor-traco)] overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
              {mentions.map(({ task, comment }) => {
                const author =
                  comment.author.kind === "member"
                    ? state.members.find((m) => m.id === comment.author.id)?.displayName
                    : state.agents.find((a) => a.id === comment.author.id)?.name;
                return (
                  <li key={comment.id}>
                    <Link href={`/estrutura/tarefas/${task.id}#comentario-${comment.id}`} className="block px-4 py-2 hover:bg-[var(--cor-superficie-2)]">
                      <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                        {author ?? "Alguém"} mencionou você em “{task.title}”
                      </p>
                      <p className="truncate text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        {fmt.relative(comment.createdAt)} · {comment.content}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
              Uma menção sai daqui quando a conversa em que ela está é resolvida.
            </p>
          </Section>
        ) : null}

        {conversations.length > 0 ? (
          <Section title="Conversas atribuídas a você" count={conversations.length}>
            <ul className="divide-y divide-[var(--cor-traco)] overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
              {conversations.map((conversation) => {
                const contact = conversation.contactId
                  ? state.contacts.find((c) => c.id === conversation.contactId)
                  : undefined;
                return (
                  <li key={conversation.id}>
                    <Link
                      href={`/crm/caixa-de-entrada/${conversation.id}`}
                      className="block px-4 py-2 hover:bg-[var(--cor-superficie-2)]"
                    >
                      <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                        {contact ? contactDisplayName(contact) : "Contato não resolvido"}
                      </p>
                      <p className="truncate text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        {conversation.state} · {conversation.title}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Section>
        ) : null}

        {overdue.length > 0 ? (
          <Section title="Tarefas vencidas" count={overdue.length}>
            <ul className="divide-y divide-[var(--cor-traco)] overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
              {overdue.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/estrutura/tarefas/${task.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-[var(--cor-superficie-2)]"
                  >
                    <span className="truncate text-[length:var(--texto-base)] text-[var(--cor-tinta)]">{task.title}</span>
                    <ConditionMarker tone="danger">Vencida</ConditionMarker>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {blocked.length > 0 ? (
          <Section title="Tarefas bloqueadas" count={blocked.length}>
            <ul className="divide-y divide-[var(--cor-traco)] overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
              {blocked.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/estrutura/tarefas/${task.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-[var(--cor-superficie-2)]"
                  >
                    <span className="truncate text-[length:var(--texto-base)] text-[var(--cor-tinta)]">{task.title}</span>
                    <ConditionMarker tone="warning">Bloqueada por Dependência</ConditionMarker>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {failedExecutions.length > 0 ? (
          <Section title="Execuções que falharam" count={failedExecutions.length}>
            <ul className="divide-y divide-[var(--cor-traco)] overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
              {failedExecutions.map((execution) => (
                <li key={execution.id}>
                  <Link
                    href={`/ia/execucoes/${execution.id}`}
                    className="block px-4 py-2 hover:bg-[var(--cor-superficie-2)]"
                  >
                    <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                      {state.agents.find((a) => a.id === execution.agentId)?.name ?? "Agente"}
                    </p>
                    <p className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                      {execution.terminationReason ?? "sem motivo registrado"} ·{" "}
                      {fmt.relative(execution.startedAt, now.getTime())}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </>
  );
}
