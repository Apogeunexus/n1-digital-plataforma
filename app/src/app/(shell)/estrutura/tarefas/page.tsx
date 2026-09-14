"use client";

/**
 * Minhas Tarefas — o destino dos atalhos da Início.
 *
 * A Início mostra o recorte de hoje; aqui está a lista inteira, com o filtro
 * explícito. Por padrão abre no que está atribuído a quem olha, porque foi daí
 * que o usuário veio — mas o Espaço de Trabalho inteiro está a um clique, e o
 * total de cada recorte fica sempre à vista para ninguém achar que a lista é
 * menor do que é.
 */

import { useState } from "react";
import { useData, useSession } from "@/data/store";
import {
  effectiveLifecycleOfTask,
  isOverdue,
  statusCategory,
  statusDefinition,
} from "@/data/derive";
import { PRIORITY_LABEL, STATUS_CATEGORY_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import { RecordList } from "@/features/shell/record-list";
import { PageHeader, StateSeal } from "@/features/shell/ui";
import type { Task } from "@/data/types";

type Recorte = "minhas" | "vencidas" | "todas";

const RECORTES: ReadonlyArray<{ readonly value: Recorte; readonly label: string }> = [
  { value: "minhas", label: "Atribuídas a mim" },
  { value: "vencidas", label: "Vencidas" },
  { value: "todas", label: "Todas do Espaço de Trabalho" },
];

export default function TarefasPage() {
  const state = useData((data) => data);
  const { memberId } = useSession();
  const fmt = useFormat();
  const [recorte, setRecorte] = useState<Recorte>("minhas");
  const [now] = useState(() => new Date());

  const ativas = state.tasks.filter(
    (task) => effectiveLifecycleOfTask(state, task.id) === "ativo",
  );
  const minhas = ativas.filter((task) =>
    task.assignees.some((a) => a.kind === "member" && a.id === memberId),
  );
  const vencidas = minhas.filter((task) => isOverdue(state, task, now));

  const contagem: Record<Recorte, number> = {
    minhas: minhas.length,
    vencidas: vencidas.length,
    todas: ativas.length,
  };
  const items =
    recorte === "minhas" ? minhas : recorte === "vencidas" ? vencidas : ativas;

  // Vencida primeiro, depois pelo vencimento mais próximo; sem data vai ao fim.
  const ordenadas = [...items].sort((a, b) => {
    const chave = (task: Task) => String(task.dueDate?.value ?? "9999");
    return chave(a).localeCompare(chave(b));
  });

  return (
    <>
      <PageHeader
        title="Tarefas"
        meta={`${ordenadas.length} de ${ativas.length} Tarefas ativas · ordenadas pelo vencimento mais próximo.`}
        actions={
          <span className="flex flex-wrap items-center gap-1">
            {RECORTES.map((opcao) => (
              <button
                key={opcao.value}
                type="button"
                aria-pressed={recorte === opcao.value}
                onClick={() => setRecorte(opcao.value)}
                className={`rounded-[var(--raio-controle)] px-3 py-1.5 text-[length:var(--texto-base)] ${
                  recorte === opcao.value
                    ? "bg-[var(--cor-acento)] font-[var(--peso-medio)] text-[var(--cor-acento-texto)]"
                    : "text-[var(--cor-tinta-fraca)] hover:bg-[var(--cor-superficie-2)] hover:text-[var(--cor-tinta)]"
                }`}
              >
                {opcao.label} ({contagem[opcao.value]})
              </button>
            ))}
          </span>
        }
      />

      <div className="p-6">
        <RecordList
          items={ordenadas}
          hrefOf={(task) => `/estrutura/tarefas/${task.id}`}
          emptyTitle={
            recorte === "minhas"
              ? "Nada atribuído a você."
              : recorte === "vencidas"
                ? "Nenhuma Tarefa sua está vencida."
                : "Nenhuma Tarefa ativa."
          }
          emptyHint={
            recorte === "todas"
              ? "Uma Tarefa nasce dentro de uma Lista: abra uma Lista na Estrutura para criar."
              : "Uma Tarefa aparece aqui quando alguém a atribui a você."
          }
          columns={[
            { key: "titulo", label: "Título", render: (task) => task.title },
            {
              key: "lista",
              label: "Lista",
              render: (task) => state.lists.find((l) => l.id === task.listId)?.name ?? "—",
            },
            {
              key: "status",
              label: "Status",
              render: (task) => statusDefinition(state, task.listId, task.statusId)?.name ?? "—",
            },
            {
              key: "categoria",
              label: "Categoria",
              render: (task) => {
                const categoria = statusCategory(state, task);
                return categoria ? (STATUS_CATEGORY_LABEL[categoria] ?? categoria) : "—";
              },
            },
            {
              key: "prioridade",
              label: "Prioridade",
              render: (task) =>
                task.priority ? (PRIORITY_LABEL[task.priority] ?? task.priority) : "—",
            },
            {
              key: "vencimento",
              label: "Vencimento",
              render: (task) =>
                task.dueDate ? (
                  <span
                    className={
                      isOverdue(state, task, now) ? "text-[var(--cor-perigo-texto)]" : undefined
                    }
                  >
                    {fmt.taskDate(task.dueDate)}
                    {isOverdue(state, task, now) ? " · vencida" : ""}
                  </span>
                ) : (
                  "—"
                ),
            },
            {
              key: "estado",
              label: "Estado",
              render: (task) => <StateSeal state={effectiveLifecycleOfTask(state, task.id)} />,
            },
          ]}
        />
      </div>
    </>
  );
}
