"use client";

/**
 * O Quadro das Listas de "Meus negócios", com a mesma cara do quadro de
 * `/crm/negocios`: palco, colunas largas com selo de contagem e subtotal, e o
 * card de Negócio. Cada Tarefa espelha um Negócio (Vínculo Tarefa → Negócio);
 * a que não espelha nenhum ganha um card simples. Arrastar muda o Status da
 * Tarefa — não a Etapa do Negócio (a Lista é uma cópia, e o cabeçalho avisa).
 */

import { Plus, Video } from "lucide-react";
import { useState } from "react";
import { changeTaskStatus } from "@/data/operations";
import type { DataState } from "@/data/state";
import { useRun } from "@/data/store";
import type { Deal, StatusDefinition, Task } from "@/data/types";
import { DealCard, dealCardData } from "@/features/crm/deal-card";
import { STATUS_CATEGORY_LABEL } from "@/features/shell/format";
import { ActorAvatar } from "@/features/shell/ui";
import { useFormat } from "@/features/shell/use-format";

export function dealOfTask(state: DataState, task: Task): Deal | undefined {
  const link = state.links.find((l) => l.fromType === "task" && l.fromId === task.id && l.toType === "deal");
  return link ? state.deals.find((d) => d.id === link.toId) : undefined;
}

export function QuadroNegocios({
  state,
  tasks,
  definitions,
  onError,
  openTask,
  onCreate,
}: {
  readonly state: DataState;
  readonly tasks: readonly Task[];
  readonly definitions: readonly StatusDefinition[];
  readonly onError: (message: string | null) => void;
  readonly openTask: (taskId: string) => void;
  readonly onCreate?: () => void;
}) {
  const run = useRun();
  const fmt = useFormat();
  const [dragging, setDragging] = useState<string | null>(null);
  const drop = (statusId: string) => {
    if (!dragging) return;
    const result = run((data, memberId) => changeTaskStatus(data, memberId, dragging, statusId));
    onError(result.ok ? null : result.error);
    setDragging(null);
  };

  return (
    <div className="palco-quadro flex gap-4 overflow-x-auto pb-2">
      {definitions.map((definition) => {
        const column = tasks.filter((task) => task.statusId === definition.id);
        // Só a Tarefa-espelho conta o valor: uma Reunião ligada ao mesmo Negócio não o soma duas vezes.
        const columnValue = column.reduce((sum, task) => sum + (task.provenance?.kind === "deal" ? (dealOfTask(state, task)?.value?.amount ?? 0) : 0), 0);
        return (
          <div
            key={definition.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => drop(definition.id)}
            className="flex w-[19.2rem] shrink-0 flex-col rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[color-mix(in_srgb,var(--cor-superficie)_70%,transparent)] p-3"
          >
            <div className="mb-3 flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-[var(--raio-controle)] bg-[var(--cor-acento-fraco)] text-[length:var(--texto-base)] font-[var(--peso-forte)] text-[var(--cor-acento)]"
              >
                {column.length}
              </span>
              <span className="min-w-0 flex-1">
                <h2 className="flex items-center gap-1.5 truncate text-[length:var(--texto-base)] font-[var(--peso-forte)] text-[var(--cor-tinta)]">
                  <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: definition.color }} />
                  {definition.name}
                </h2>
                <span className="block truncate text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                  {STATUS_CATEGORY_LABEL[definition.category] ?? definition.category} · {fmt.money({ amount: columnValue, currency: "BRL" })}
                </span>
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {column.length === 0 ? (
                onCreate ? (
                  <button
                    type="button"
                    onClick={onCreate}
                    className="grid place-items-center gap-2 rounded-[var(--raio-superficie)] border border-dashed border-[var(--cor-traco-forte)] px-2 py-6 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)] hover:border-[var(--cor-acento)] hover:text-[var(--cor-tinta)]"
                  >
                    <span aria-hidden="true" className="grid size-8 place-items-center rounded-full border border-[var(--cor-traco-forte)]">
                      <Plus className="size-4" />
                    </span>
                    Nenhuma Tarefa em “{definition.name}”.
                  </button>
                ) : (
                  <p className="grid place-items-center rounded-[var(--raio-superficie)] border border-dashed border-[var(--cor-traco-forte)] px-2 py-6 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                    Nenhuma Tarefa em “{definition.name}”.
                  </p>
                )
              ) : (
                column.map((task) => {
                  // Só a Tarefa-espelho vira card de Negócio; uma Reunião ligada ao mesmo Negócio é outra coisa.
                  const deal = task.provenance?.kind === "deal" ? dealOfTask(state, task) : undefined;
                  return deal ? (
                    <DealCard
                      key={task.id}
                      data={dealCardData(state, deal)}
                      href={`/estrutura/tarefas/${task.id}`}
                      onOpen={() => openTask(task.id)}
                      onDragStart={() => setDragging(task.id)}
                      onDragEnd={() => setDragging(null)}
                    />
                  ) : (
                    <TaskOnlyCard
                      key={task.id}
                      state={state}
                      task={task}
                      onOpen={() => openTask(task.id)}
                      onDragStart={() => setDragging(task.id)}
                      onDragEnd={() => setDragging(null)}
                    />
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** A Tarefa que não espelha um Negócio (uma Reunião, uma Tarefa à mão): o mesmo card, com o que ela tem. */
function TaskOnlyCard({
  state,
  task,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  readonly state: DataState;
  readonly task: Task;
  readonly onOpen: () => void;
  readonly onDragStart: () => void;
  readonly onDragEnd: () => void;
}) {
  const fmt = useFormat();
  const responsavel = task.assignees.find((a) => a.kind === "member");
  const membro = responsavel ? state.members.find((m) => m.id === responsavel.id) : undefined;
  const reuniao = state.taskTypes.find((t) => t.id === task.taskTypeId)?.name === "Reunião";
  const negocio = dealOfTask(state, task);
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className="card-negocio block w-full cursor-grab rounded-[var(--raio-superficie)] p-3 text-left active:cursor-grabbing"
    >
      <p className="flex items-center gap-1.5 truncate text-[length:var(--texto-lg)] font-[var(--peso-forte)] text-[var(--cor-tinta)]">
        {reuniao ? <Video className="size-4 shrink-0 text-[var(--cor-acento)]" aria-hidden="true" /> : null}
        <span className="truncate">{task.title}</span>
      </p>
      <p className="truncate text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
        {reuniao ? `Reunião${negocio ? ` · ${negocio.title}` : ""}` : "Tarefa sem Negócio"} · {task.dueDate ? fmt.taskDate(task.dueDate) : "sem data"}
      </p>
      <div className="mt-3 flex items-center gap-1.5 border-t border-[var(--cor-traco)] pt-3">
        {membro ? (
          <>
            <ActorAvatar kind="member" name={membro.displayName} {...(membro.photoFileId ? { photoFileId: membro.photoFileId } : {})} />
            <span className="min-w-0 truncate text-[length:var(--texto-base)] text-[var(--cor-tinta)]">{membro.displayName}</span>
          </>
        ) : (
          <span className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">Sem Responsável</span>
        )}
      </div>
    </button>
  );
}
