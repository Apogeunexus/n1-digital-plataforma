"use client";

/**
 * Drawer da conta: detalhes e histórico sem sair da Lista. Lê a mesma Tarefa e
 * chama as mesmas operações da página completa; "Editar conta" leva a ela.
 * Fecha por ícone, Esc e clique fora (o `SidePanel` já faz os três) — nada
 * aqui é digitado, então fechar nunca perde dado.
 */

import Link from "next/link";
import { useState } from "react";
import { useData, useRun, useSession } from "@/data/store";
import { changeTaskStatus, CP, statusOptionRefusal } from "@/data/operations";
import {
  effectiveListConfig,
  memberSeesTask,
  newestFirst,
  taskWriteRefusal,
} from "@/data/derive";
import { PRIORITY_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import {
  ActorAvatar,
  Button,
  ConfirmDialog,
  SidePanel,
  StatusPicker,
} from "@/features/shell/ui";
import { StatusBadge } from "./contas-view";
import { financeProfileOf, PAGAR_PROFILE, textoDoCampo, valorDaConta } from "./lens";

type Report = (
  result: { ok: boolean; error?: string },
  message: string,
) => void;

export function ContaDrawer({
  taskId,
  onClose,
  report,
}: {
  readonly taskId: string | null;
  readonly onClose: () => void;
  readonly report: Report;
}) {
  const state = useData((data) => data);
  const run = useRun();
  const fmt = useFormat();
  const { memberId } = useSession();
  const [aba, setAba] = useState<"detalhes" | "historico">("detalhes");
  const [confirmando, setConfirmando] = useState<{
    statusId: string;
    label: string;
  } | null>(null);

  const task = taskId
    ? state.tasks.find(
        (t) => t.id === taskId && memberSeesTask(state, memberId, t.id),
      )
    : undefined;
  const config = task ? effectiveListConfig(state, task.listId) : null;
  if (!task || !config) {
    return (
      <SidePanel title="Conta" open={taskId !== null} onClose={onClose}>
        <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
          Conta não encontrada, ou você não tem permissão para vê-la.
        </p>
      </SidePanel>
    );
  }
  const profile = financeProfileOf(task.listId) ?? PAGAR_PROFILE;
  const grupo = profile.groupOf(state, task, new Date());
  const definition = config.statusSet.definitions.find(
    (d) => d.id === task.statusId,
  );
  const escritaRecusada = taskWriteRefusal(state, memberId, task.id);
  const responsavel = task.assignees.find((a) => a.kind === "member");
  const membro = responsavel
    ? state.members.find((m) => m.id === responsavel.id)
    : undefined;
  const nomeDe = (id: string) =>
    state.members.find((m) => m.id === id)?.displayName ??
    state.agents.find((a) => a.id === id)?.name ??
    state.automations.find((a) => a.id === id)?.name ??
    id;
  const campo = (id: string) => textoDoCampo(task, id) || "—";
  // A ação principal do rodapé: a primeira ação rápida que se aplica a esta
  // conta (Autorizar / Iniciar cobrança); senão, a de fechamento.
  const [acao1, acao2] = profile.quickActions;
  const escolhida = acao1.notApplicable(task) === undefined ? acao1 : acao2;
  const acaoPrincipal = {
    label: escolhida.label,
    statusId: escolhida.statusId,
    motivo:
      escritaRecusada ??
      escolhida.notApplicable(task) ??
      statusOptionRefusal(state, memberId, task, escolhida.statusId),
  };
  const historico = newestFirst(
    state.activity.filter((a) => a.objectId === task.id),
  );
  // O dossiê da cobrança vive nos Comentários (seção 7.3): a aba mostra o texto, não só "Comentário na Tarefa".
  const comentarios = [...task.comments].filter((c) => !c.deletedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const anexos = profile.attachmentFieldIds
    .map((id) => ({
      nome: state.fieldDefinitions.find((d) => d.id === id)?.name ?? id,
      arquivo: textoDoCampo(task, id),
    }))
    .filter((a) => a.arquivo);

  return (
    <SidePanel
      title="Conta"
      open
      onClose={onClose}
      footer={
        <span className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            onClick={() =>
              setConfirmando({
                statusId: acaoPrincipal.statusId,
                label: acaoPrincipal.label,
              })
            }
            disabled={acaoPrincipal.motivo !== undefined}
            disabledReason={acaoPrincipal.motivo ?? ""}
          >
            {acaoPrincipal.label}
          </Button>
          <Link
            href={`/estrutura/tarefas/${task.id}`}
            className="inline-flex h-[var(--altura-controle)] items-center rounded-[var(--raio-controle)] px-3 text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)] ring-1 ring-inset ring-[var(--cor-traco-forte)] hover:bg-[var(--cor-superficie-2)]"
          >
            Editar conta
          </Link>
        </span>
      }
    >
      <ConfirmDialog
        open={confirmando !== null}
        title={`${confirmando?.label ?? ""}: “${task.title}”?`}
        description={`${fmt.money({ amount: valorDaConta(task), currency: "BRL" })} · vence ${task.dueDate ? fmt.taskDate(task.dueDate) : "—"}. Passa pelas regras da Lista e fica na Atividade.`}
        confirmLabel={confirmando?.label ?? "Confirmar"}
        onConfirm={() => {
          if (confirmando)
            report(
              run((data, me) =>
                changeTaskStatus(data, me, task.id, confirmando.statusId),
              ),
              `“${task.title}”: ${confirmando.label.toLocaleLowerCase("pt-BR")}.`,
            );
          setConfirmando(null);
        }}
        onCancel={() => setConfirmando(null)}
      />
      <div className="grid gap-3">
        <div className="grid gap-1">
          <h3 className="text-[length:var(--texto-md)] font-semibold text-[var(--cor-tinta)]">
            {task.title}
          </h3>
          <p className="flex flex-wrap items-center gap-2 text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
            <span className="font-mono">{task.readableId ?? task.id}</span>
            <StatusBadge definition={definition} grupo={grupo} />
          </p>
          <p className="flex flex-wrap items-baseline gap-3">
            <span className="text-[length:var(--texto-lg)] font-semibold tabular-nums text-[var(--cor-tinta)]">
              {fmt.money({ amount: valorDaConta(task), currency: "BRL" })}
            </span>
            <span
              className={`text-[length:var(--texto-sm)] ${grupo === "vencidas" ? "text-[var(--cor-perigo)]" : "text-[var(--cor-tinta-fraca)]"}`}
            >
              vence {task.dueDate ? fmt.taskDate(task.dueDate) : "—"}
            </span>
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Seções da conta"
          className="flex gap-1 border-b border-[var(--cor-traco)]"
        >
          {(["detalhes", "historico"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={aba === k}
              onClick={() => setAba(k)}
              className={`border-b-2 px-3 py-1.5 text-[length:var(--texto-sm)] ${aba === k ? "border-[var(--cor-acento)] font-medium text-[var(--cor-tinta)]" : "border-transparent text-[var(--cor-tinta-fraca)] hover:text-[var(--cor-tinta)]"}`}
            >
              {k === "detalhes"
                ? "Detalhes"
                : `Histórico (${historico.length + comentarios.length})`}
            </button>
          ))}
        </div>

        {aba === "detalhes" ? (
          <div className="grid gap-3">
            <section>
              <h4 className="mb-1 text-[length:var(--texto-xs)] uppercase tracking-wide text-[var(--cor-tinta-fraca)]">
                Status
              </h4>
              <StatusPicker
                options={[...config.statusSet.definitions]
                  .sort((a, b) => a.order - b.order)
                  .map((d) => ({
                    id: d.id,
                    name: d.name,
                    category: d.category,
                    color: d.color,
                  }))}
                value={task.statusId}
                onChange={(statusId) => {
                  // Mesma confirmação das ações do rodapé: uma conta que muda
                  // de Status dispara Automações (Responsável, comentário).
                  const alvo = config?.statusSet.definitions.find(
                    (d) => d.id === statusId,
                  );
                  setConfirmando({
                    statusId,
                    label: `Mover para “${alvo?.name ?? statusId}”`,
                  });
                }}
                optionBlockReason={(optionId) =>
                  statusOptionRefusal(state, memberId, task, optionId)
                }
                readOnly={escritaRecusada !== undefined}
                readOnlyReason={escritaRecusada ?? ""}
              />
            </section>
            <dl className="divide-y divide-[var(--cor-traco)]">
              <Linha rotulo={profile.labels.contraparte}>
                {profile.counterpart(state, task)}
              </Linha>
              <Linha rotulo="Empresa">{campo(CP.fields.empresa)}</Linha>
              <Linha rotulo="Centro de custo">
                {campo(CP.fields.centroDeCusto)}
              </Linha>
              {profile.drawerRows(state, task).map((linha) => (
                <Linha key={linha.rotulo} rotulo={linha.rotulo}>
                  {linha.data ? fmt.taskDate({ form: "civilDay", value: linha.data }) : linha.valor}
                </Linha>
              ))}
              <Linha rotulo="Responsável">
                {membro ? (
                  <span className="inline-flex items-center gap-1.5">
                    <ActorAvatar
                      kind="member"
                      name={membro.displayName}
                      {...(membro.photoFileId
                        ? { photoFileId: membro.photoFileId }
                        : {})}
                    />
                    {membro.displayName}
                  </span>
                ) : (
                  "—"
                )}
              </Linha>
              <Linha rotulo="Prioridade">{PRIORITY_LABEL[task.priority]}</Linha>
              {task.tagIds.length > 0 ? (
                <Linha rotulo="Conta bancária">
                  {task.tagIds
                    .map((id) => state.tags.find((t) => t.id === id)?.name)
                    .filter(Boolean)
                    .join(", ")}
                </Linha>
              ) : null}
              <Linha rotulo="Descrição">{task.description || "—"}</Linha>
              <Linha rotulo="Anexos">
                {anexos.length === 0 ? (
                  <span className="text-[var(--cor-tinta-fraca)]">nenhum</span>
                ) : (
                  <ul className="grid gap-0.5">
                    {anexos.map((a) => (
                      <li key={a.nome}>
                        <span className="text-[var(--cor-tinta-fraca)]">
                          {a.nome}:{" "}
                        </span>
                        {a.arquivo}
                      </li>
                    ))}
                  </ul>
                )}
              </Linha>
            </dl>
          </div>
        ) : historico.length === 0 && comentarios.length === 0 ? (
          <p className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
            Nenhum Registro de Atividade nesta conta.
          </p>
        ) : (
          <div className="grid gap-4">
          {comentarios.length > 0 ? (
            <section aria-label="Comentários" className="grid gap-2">
              <h3 className="text-[length:var(--texto-xs)] uppercase tracking-wide text-[var(--cor-tinta-fraca)]">
                Comentários ({comentarios.length})
              </h3>
              <ol className="grid gap-2">
                {comentarios.map((c) => (
                  <li key={c.id} className="rounded-[var(--raio-controle)] bg-[var(--cor-superficie-2)] px-3 py-2 text-[length:var(--texto-sm)]">
                    <span className="block whitespace-pre-wrap text-[var(--cor-tinta)]">{c.content}</span>
                    <span className="block text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
                      {nomeDe(c.author.id)}
                      {c.authorDelegate ? ` em nome de ${nomeDe(c.authorDelegate.id)}` : ""} · {fmt.relative(c.createdAt)}
                      {c.resolved ? " · resolvido" : ""}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          <h3 className="text-[length:var(--texto-xs)] uppercase tracking-wide text-[var(--cor-tinta-fraca)]">
            Atividade ({historico.length})
          </h3>
          <ol className="grid gap-2">
            {historico.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-[auto_1fr] gap-2 text-[length:var(--texto-sm)]"
              >
                <span
                  className="mt-1.5 size-1.5 rounded-full bg-[var(--cor-tinta-tenue)]"
                  aria-hidden="true"
                />
                <span>
                  <span className="text-[var(--cor-tinta)]">{r.action}</span>
                  {r.before || r.after ? (
                    <span className="text-[var(--cor-tinta-fraca)]">
                      {" "}
                      {r.before ? `${r.before} → ` : ""}
                      {r.after ?? ""}
                    </span>
                  ) : null}
                  <span className="block text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
                    {nomeDe(r.actor.id)}
                    {r.delegate
                      ? ` em nome de ${nomeDe(r.delegate.id)}`
                      : ""} · {fmt.relative(r.at)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          </div>
        )}
      </div>
    </SidePanel>
  );
}

function Linha({
  rotulo,
  children,
}: {
  readonly rotulo: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 py-1.5 text-[length:var(--texto-sm)]">
      <dt className="text-[var(--cor-tinta-fraca)]">{rotulo}</dt>
      <dd className="min-w-0 text-[var(--cor-tinta)]">{children}</dd>
    </div>
  );
}
