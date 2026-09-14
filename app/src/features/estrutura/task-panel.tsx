"use client";

/**
 * T12 as a side panel, opened from a List or a Quadro by `?tarefa=<id>`.
 *
 * The Fase 2 map asks for both forms: the full page is the addressable record
 * that links point at, and this is the quick look that does not cost leaving
 * the collection. What must NOT differ between them is the reasoning — the
 * status block reason comes from `terminalStatusBlockReason`, the same
 * derivation the page reads, so the two can never answer differently about the
 * same Task.
 *
 * The panel deliberately does not repeat the whole record: it carries what
 * decides the next action, and hands over to the page for the rest.
 */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useData, useRun, useSession } from "@/data/store";
import {
  checklistProgress,
  effectiveLifecycleOfTask,
  effectiveListConfig,
  isBlocked,
  isOverdue,
  memberSeesTask,
  spawnedOccurrenceOf,
  statusDefinition,
  subtaskProgress,
  taskWriteRefusal,
  terminalStatusBlockReason,
} from "@/data/derive";
import { changeTaskStatus, statusOptionRefusal } from "@/data/operations";
import { PRIORITY_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import {
  Button,
  CategoryDot,
  ConditionMarker,
  SidePanel,
  StateSeal,
  StatusPicker,
  Toast,
} from "@/features/shell/ui";

/** The query key that opens the panel; exported so callers cannot misspell it. */
export const TASK_PANEL_PARAM = "tarefa";

export function useTaskPanel(): {
  readonly openTaskId: string | null;
  readonly openTask: (taskId: string) => void;
  readonly closeTask: () => void;
} {
  const router = useRouter();
  const query = useSearchParams();
  // Do roteador, não de `window.location`: na primeira renderização após uma
  // navegação no cliente a URL ainda é a da página anterior.
  const pathname = usePathname();

  const openTask = (taskId: string) => {
    const next = new URLSearchParams(query.toString());
    next.set(TASK_PANEL_PARAM, taskId);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  const closeTask = () => {
    const next = new URLSearchParams(query.toString());
    next.delete(TASK_PANEL_PARAM);
    router.replace(next.size > 0 ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  return { openTaskId: query.get(TASK_PANEL_PARAM), openTask, closeTask };
}

export function TaskPanel({
  taskId,
  onClose,
  onMove,
}: {
  readonly taskId: string | null;
  readonly onClose: () => void;
  /** Opens D01 — moving needs the Status Mapping dialog, never a bare action. */
  readonly onMove?: (taskId: string) => void;
}) {
  const state = useData((data) => data);
  const run = useRun();
  const fmt = useFormat();
  const { memberId } = useSession();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const task = taskId === null ? undefined : state.tasks.find((t) => t.id === taskId && memberSeesTask(state, memberId, t.id));
  const escritaRecusada = task ? taskWriteRefusal(state, memberId, task.id) : undefined;
  const config = task ? effectiveListConfig(state, task.listId) : null;

  if (!task || !config) {
    return (
      <SidePanel title="Tarefa" open={taskId !== null} onClose={onClose}>
        <p className="text-[var(--cor-tinta-fraca)]">
          Tarefa não encontrada. Ela pode ter sido eliminada, ou você não tem permissão para vê-la.
        </p>
      </SidePanel>
    );
  }

  const effective = effectiveLifecycleOfTask(state, task.id);
  const definition = statusDefinition(state, task.listId, task.statusId);
  const blockReason = terminalStatusBlockReason(state, task);
  const checklist = checklistProgress(task);
  const subtasks = subtaskProgress(state, task.id);

  const changeStatus = (statusId: string) => {
    const tinhaRecorrencia = task.recurrence !== undefined;
    const result = run((data, memberId) => changeTaskStatus(data, memberId, task.id, statusId));
    const proxima = result.ok && tinhaRecorrencia && result.value.recurrence === undefined ? spawnedOccurrenceOf(state, task.id) : undefined;
    setMessage(
      result.ok
        ? { tone: "success", text: proxima ? `Status alterado. Próxima ocorrência criada: ${proxima.title}.` : "Status alterado." }
        : { tone: "error", text: result.error },
    );
  };

  return (
    <SidePanel
      title={task.title}
      open={taskId !== null}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
            Checklists, Comentários e Atividade ficam na página.
          </span>
          <Link
            href={`/estrutura/tarefas/${task.id}`}
            className="rounded-[var(--raio-controle)] bg-[var(--cor-acento)] px-3 py-1.5 text-[length:var(--texto-base)] font-[var(--peso-medio)] text-[var(--cor-acento-texto)]"
          >
            Abrir em página cheia
          </Link>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {task.readableId ? <span className="identificador">{task.readableId}</span> : null}
          <StateSeal state={effective} />
          {isOverdue(state, task, new Date()) ? (
            <ConditionMarker tone="danger">Vencida</ConditionMarker>
          ) : null}
          {isBlocked(state, task) ? <ConditionMarker tone="warning">Bloqueada</ConditionMarker> : null}
        </div>

        {message ? (
          <Toast tone={message.tone} onDismiss={() => setMessage(null)}>
            {message.text}
          </Toast>
        ) : null}

        <section>
          <h3 className="mb-1.5 text-[length:var(--texto-sm)] font-[var(--peso-forte)]">Status</h3>
          <StatusPicker
            options={[...config.statusSet.definitions]
              .sort((a, b) => a.order - b.order)
              .map((option) => ({
                id: option.id,
                name: option.name,
                category: option.category,
                color: option.color,
              }))}
            value={task.statusId}
            onChange={changeStatus}
            {...(blockReason ? { terminalBlockReason: blockReason } : {})}
            optionBlockReason={(optionId) => statusOptionRefusal(state, memberId, task, optionId)}
            readOnly={effective !== "ativo" || escritaRecusada !== undefined}
            readOnlyReason={effective !== "ativo" ? `Esta Tarefa está ${effective === "arquivado" ? "arquivada" : "na lixeira"} e é somente leitura.` : (escritaRecusada ?? "")}
          />
          {blockReason ? (
            <p className="mt-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
              Concluir está indisponível: {blockReason}{" "}
              <Link href={`/estrutura/listas/${task.listId}/configuracoes`} className="underline">
                Ver a exigência
              </Link>
              .
            </p>
          ) : null}
        </section>

        <section>
          <h3 className="mb-1.5 text-[length:var(--texto-sm)] font-[var(--peso-forte)]">Atributos</h3>
          <dl className="space-y-1.5 text-[length:var(--texto-base)]">
            <Row label="Status">
              {definition ? <CategoryDot color={definition.color} label={definition.name} /> : "—"}
            </Row>
            <Row label="Prioridade">{PRIORITY_LABEL[task.priority] ?? task.priority}</Row>
            <Row label="Responsáveis">
              {task.assignees.length === 0
                ? "sem Responsável"
                : task.assignees
                    .map((assignee) =>
                      assignee.kind === "member"
                        ? (state.members.find((m) => m.id === assignee.id)?.displayName ?? "Membro")
                        : (state.agents.find((a) => a.id === assignee.id)?.name ?? "Agente"),
                    )
                    .join(", ")}
            </Row>
            <Row label="Vencimento">{task.dueDate ? fmt.taskDate(task.dueDate) : "—"}</Row>
            <Row label="Checklists">{checklist ? `${checklist.done} de ${checklist.total}` : "—"}</Row>
            <Row label="Subtarefas">{subtasks ? `${subtasks.done} de ${subtasks.total}` : "—"}</Row>
          </dl>
        </section>

        {effective !== "ativo" ? (
          <p className="rounded-[var(--raio-controle)] bg-[var(--cor-atencao-fraco)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-atencao-texto)]">
            {effective === "arquivado" ? "Arquivada" : "Na lixeira"} — o estado pode vir da própria
            Tarefa ou da Lista que a contém.
          </p>
        ) : null}

        <div className="flex gap-2">
          {onMove ? (
            <Button
              variant="secondary"
              onClick={() => {
                onClose();
                onMove(task.id);
              }}
              disabled={effective !== "ativo" || task.parentTaskId !== undefined}
              disabledReason={
                task.parentTaskId !== undefined
                  ? "Uma Subtarefa só muda de Lista depois de promovida a Tarefa raiz."
                  : "Uma Tarefa arquivada ou na lixeira é somente leitura."
              }
            >
              Mover para outra Lista
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </SidePanel>
  );
}

function Row({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-[var(--cor-tinta-fraca)]">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
