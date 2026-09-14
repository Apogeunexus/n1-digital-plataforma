"use client";

/**
 * T12 — Tarefa. The central document of the domain.
 *
 * The status selector groups by CATEGORY (A4.3) and disables the terminal ones
 * when the List functionality already reproves the transition — the data is on
 * screen, so the control does not wait for the click to fail (PADROES §10).
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MoveTaskDialog,
  useMoveTaskDialog,
} from "@/features/estrutura/move-task-dialog";
import {
  TaskAttributeEditors,
  TaskComments,
  TaskFieldValueEditor,
  TaskTagsEditor,
  TaskTitleDescriptionEditor,
  TaskWatchers,
} from "@/features/estrutura/task-editors";
import {
  TaskAttachments,
  TaskDependencies,
  TaskRecurrence,
  TaskTime,
} from "@/features/estrutura/collaboration-editors";
import { SaveTemplateDialog } from "@/features/estrutura/template-dialogs";
import { ShareTaskDialog } from "@/features/estrutura/share-task-dialog";
import { use, useState, type ReactNode } from "react";
import { useData, useRun, useSession } from "@/data/store";
import {
  checklistProgress,
  containerAdminRefusal,
  effectiveListConfig,
  effectiveLifecycleOfTask,
  isBlocked,
  isOverdue,
  memberReachesContainer,
  memberSeesTask,
  spawnedOccurrenceOf,
  statusDefinition,
  subtaskProgress,
  terminalStatusBlockReason,
  taskLevel,
  taskCommentRefusal,
  taskWriteRefusal,
} from "@/data/derive";
import {
  addChecklist,
  addChecklistItem,
  assignTask,
  changeTaskStatus,
  convertChecklistItem,
  createTask,
  setChecklistItemDone,
  trashTask,
  unassignTask,
  updateTask,
  contaSemCliente,
  contaSemResumo,
  guestFieldWriter,
  parcelaDuplicada,
  statusOptionRefusal,
} from "@/data/operations";
import {
  ACTOR_KIND_LABEL,
  OBJECT_TYPE_LABEL,
  PRIORITY_LABEL,
} from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import {
  ActionMenu,
  Button,
  CategoryDot,
  ConditionMarker,
  ConfirmDialog,
  EmptyState,
  Field,
  PageHeader,
  MultiSelect,
  Section,
  Select,
  SidePanel,
  StateSeal,
  StatusPicker,
  TextInput,
  Toast,
} from "@/features/shell/ui";
import type { DataState } from "@/data/state";
import type { ActorRef } from "@/data/types";

/** §15 — a slice that hides rows always states the cut and offers the rest. */
const ACTIVITY_PAGE_SIZE = 12;

export default function TarefaPage({
  params,
}: {
  params: Promise<{ tarefa: string }>;
}) {
  const { tarefa } = use(params);
  const state = useData((data) => data);
  const fmt = useFormat();
  const run = useRun();
  const { memberId } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [proximaOcorrencia, setProximaOcorrencia] = useState<string | null>(
    null,
  );
  const router = useRouter();
  const query = useSearchParams();
  /**
   * D13 — a conversão vive no endereço (`?converter-item=<checklist>:<item>`).
   * É terminal, sem inversa, e exige digitar o nome do Item: o gesto precisa
   * custar tanto quanto a consequência.
   */
  const convertingRaw = query.get("converter-item");
  const converting = (() => {
    if (!convertingRaw) return null;
    const [checklistId, itemId] = convertingRaw.split(":");
    return checklistId && itemId ? { checklistId, itemId } : null;
  })();
  const [typedItem, setTypedItem] = useState("");
  const [confirmingTrash, setConfirmingTrash] = useState(false);
  const [editing, setEditing] = useState(false);
  const [salvandoModelo, setSalvandoModelo] = useState(false);
  const [compartilhando, setCompartilhando] = useState(false);
  const [newChecklist, setNewChecklist] = useState("");
  const [newItem, setNewItem] = useState<Record<string, string>>({});
  const [newSubtask, setNewSubtask] = useState("");
  const { movingTaskId, openMove, closeMove } = useMoveTaskDialog();
  const openConversion = (checklistId: string, itemId: string) => {
    setTypedItem("");
    router.replace(`?converter-item=${checklistId}:${itemId}`, {
      scroll: false,
    });
  };
  const closeConversion = () => {
    setTypedItem("");
    router.replace("?", { scroll: false });
  };

  // B38a — o que o Membro não alcança não existe para ele: a mesma tela de "não encontrada".
  const task = state.tasks.find(
    (t) => t.id === tarefa && memberSeesTask(state, memberId, t.id),
  );
  const config = task ? effectiveListConfig(state, task.listId) : null;

  if (!task || !config) {
    return (
      <>
        <PageHeader title="Tarefa não encontrada" />
        <div className="p-6">
          <EmptyState
            title="Tarefa não encontrada."
            hint="Ela pode ter sido eliminada, ou você não tem permissão para vê-la."
          />
        </div>
      </>
    );
  }

  const effective = effectiveLifecycleOfTask(state, task.id);
  const escritaRecusada = taskWriteRefusal(state, memberId, task.id);
  // Edita quem pode escrever numa Tarefa ativa; o resto lê, com a razão dita.
  const editavel = effective === "ativo" && escritaRecusada === undefined;
  // A Pessoa da conta: Convidado que preenche só os Campos que a Lista libera e comenta.
  const camposDeConvidado =
    effective === "ativo"
      ? guestFieldWriter(state, memberId, task.id)
      : undefined;
  const comentaComoConvidado = camposDeConvidado !== undefined;
  // Quem chegou por concessão “comentar” (o Comercial nas contas dos seus clientes) comenta sem editar.
  const comenta =
    effective === "ativo" &&
    (comentaComoConvidado || taskCommentRefusal(state, memberId, task.id) === undefined);
  const definition = statusDefinition(state, task.listId, task.statusId);
  const checklist = checklistProgress(task);
  const subtasks = subtaskProgress(state, task.id);
  const level = taskLevel(state, task);

  const blockReason = terminalStatusBlockReason(state, task);
  // O que impede sair do Status atual, dito na tela e não só no hover dos chips.
  const motivoDeSaida = (() => {
    const outra = config.statusSet.definitions.find(
      (d) => d.id !== task.statusId,
    );
    const razao = outra
      ? statusOptionRefusal(state, memberId, task, outra.id)
      : undefined;
    return razao?.startsWith("Para sair") ? razao : undefined;
  })();
  const somenteLeituraBase =
    effective !== "ativo"
      ? "Uma Tarefa arquivada ou na lixeira é somente leitura."
      : escritaRecusada;
  const administraLista = containerAdminRefusal(
    state,
    memberId,
    "list",
    task.listId,
  );
  const revogarRecusado =
    (effective !== "ativo"
      ? "Uma Tarefa arquivada ou na lixeira é somente leitura."
      : undefined) ?? administraLista;
  const compartilharRecusado =
    revogarRecusado ??
    (!config.features.compartilhamentoPublico
      ? "Esta Lista não permite compartilhamento público."
      : undefined);
  // A frase que o menu mostra em vez de deixar o clique descobrir a recusa.
  const somenteLeitura = somenteLeituraBase;

  const report = (result: { ok: boolean; error?: string }, message: string) => {
    if (result.ok) {
      setError(null);
      setNotice(message);
    } else {
      setNotice(null);
      setError(result.error ?? "Não foi possível concluir a operação.");
    }
  };

  const changeStatus = (statusId: string) => {
    const tinhaRecorrencia = task.recurrence !== undefined;
    const result = run((data, memberId) =>
      changeTaskStatus(data, memberId, task.id, statusId),
    );
    if (result.ok) {
      setError(null);
      // A Recorrência foi transferida? A próxima ocorrência é o que a pessoa procura em seguida.
      const proxima =
        tinhaRecorrencia && result.value.recurrence === undefined
          ? spawnedOccurrenceOf(state, task.id)
          : undefined;
      setNotice(
        proxima
          ? `Status alterado. Próxima ocorrência criada: ${proxima.title}.`
          : "Status alterado.",
      );
      setProximaOcorrencia(proxima?.id ?? null);
    } else {
      setNotice(null);
      setError(result.error);
    }
  };

  const convert = (checklistId: string, itemId: string) => {
    const result = run((data, memberId) =>
      convertChecklistItem(data, memberId, task.id, checklistId, itemId),
    );
    if (result.ok) {
      setError(null);
      setNotice(`Item convertido em Subtarefa: ${result.value.title}.`);
      closeConversion();
    } else {
      setNotice(null);
      setError(result.error);
    }
  };

  const activity = state.activity.filter(
    (record) => record.objectId === task.id,
  );

  const convertingChecklist = converting
    ? task.checklists.find((group) => group.id === converting.checklistId)
    : undefined;
  const convertingItem = convertingChecklist?.items.find(
    (item) => item.id === converting?.itemId,
  );
  const convertingSubitems = convertingChecklist
    ? subitemsOf(convertingChecklist.items, converting?.itemId ?? "")
    : 0;

  const assign = (ids: readonly string[]) => {
    const current = new Set(task.assignees.map((a) => a.id));
    const added = ids.filter((id) => !current.has(id));
    const removed = task.assignees.filter((a) => !ids.includes(a.id));
    for (const id of added) {
      const result = run((data, memberId) =>
        assignTask(data, memberId, task.id, {
          kind: data.agents.some((agent) => agent.id === id)
            ? "agent"
            : "member",
          id,
        }),
      );
      if (!result.ok) {
        report(result, "");
        return;
      }
    }
    for (const assignee of removed) {
      const result = run((data, memberId) =>
        unassignTask(data, memberId, task.id, assignee),
      );
      if (!result.ok) {
        report(result, "");
        return;
      }
    }
    if (added.length > 0 || removed.length > 0) {
      setError(null);
      setNotice(
        removed.length > 0 && added.length === 0
          ? "Responsável removido."
          : "Responsáveis atualizados.",
      );
    }
  };

  const confirmTrash = () => {
    const result = run((data, memberId) => trashTask(data, memberId, task.id));
    if (result.ok) {
      setError(null);
      setNotice(
        "Tarefa enviada à lixeira. Ela pode ser restaurada enquanto estiver lá.",
      );
    } else {
      setNotice(null);
      setError(result.error);
    }
    setConfirmingTrash(false);
  };

  const restrictedBy =
    effective !== task.lifecycle
      ? state.lists.find((l) => l.id === task.listId)?.name
      : undefined;

  return (
    <>
      <PageHeader
        path={config.path.map((node, index) => (
          <span key={node.id}>
            {index > 0 ? " › " : ""}
            {memberReachesContainer(state, memberId, node.type, node.id) ? (
              <Link
                href={
                  node.type === "space"
                    ? `/estrutura/espacos/${node.id}`
                    : node.type === "folder"
                      ? `/estrutura/pastas/${node.id}`
                      : `/estrutura/listas/${node.id}`
                }
                className="hover:underline"
              >
                {node.name}
              </Link>
            ) : (
              // A Pessoa da conta chega à Tarefa por concessão direta: o caminho é só rótulo.
              <span>{node.name}</span>
            )}
          </span>
        ))}
        title={task.title}
        seal={<StateSeal state={effective} />}
        actions={
          <ActionMenu
            items={[
              {
                label: "Editar título e descrição",
                onSelect: () => setEditing(true),
                ...(somenteLeitura ? { disabledReason: somenteLeitura } : {}),
              },
              {
                label: "Mover para outra Lista",
                onSelect: () => openMove(task.id),
                ...(somenteLeitura
                  ? { disabledReason: somenteLeitura }
                  : task.parentTaskId !== undefined
                    ? {
                        disabledReason:
                          "Uma Subtarefa só muda de Lista depois de promovida a Tarefa raiz.",
                      }
                    : {}),
              },
              {
                label: "Salvar como modelo",
                onSelect: () => setSalvandoModelo(true),
                ...(administraLista ? { disabledReason: administraLista } : {}),
              },
              {
                label: task.publicShare?.active
                  ? "Link público"
                  : "Compartilhar por link",
                onSelect: () => setCompartilhando(true),
                ...(task.publicShare?.active
                  ? {}
                  : compartilharRecusado
                    ? { disabledReason: compartilharRecusado }
                    : {}),
              },
              {
                label: "Enviar à lixeira",
                onSelect: () => setConfirmingTrash(true),
                destructive: true,
                ...(effective === "naLixeira"
                  ? { disabledReason: "Já está na lixeira." }
                  : escritaRecusada
                    ? { disabledReason: escritaRecusada }
                    : {}),
              },
            ]}
          />
        }
        meta={
          <span className="flex flex-wrap items-center gap-3">
            {task.readableId ? (
              <span className="font-mono text-[length:var(--texto-sm)]">
                {task.readableId}
              </span>
            ) : null}
            <span>
              Criada por {authorLabel(state, task.createdBy)}{" "}
              {fmt.relative(task.createdAt)}
            </span>
            {level > 0 ? <span>Subtarefa · nível {level}</span> : null}
            {isOverdue(state, task, new Date()) ? (
              <ConditionMarker tone="danger">Vencida</ConditionMarker>
            ) : null}
            {isBlocked(state, task) ? (
              <ConditionMarker tone="warning">Bloqueada</ConditionMarker>
            ) : null}
          </span>
        }
      />

      {restrictedBy ? (
        <p className="border-b border-[var(--cor-atencao-traco)] bg-[var(--cor-atencao-fraco)] px-6 py-2 text-[length:var(--texto-base)] text-[var(--cor-atencao-texto)]">
          {effective === "arquivado" ? "Arquivada" : "Na lixeira"} porque a
          Lista <em>{restrictedBy}</em> está{" "}
          {effective === "arquivado" ? "arquivada" : "na lixeira"}.{" "}
          {effective === "naLixeira" ? (
            <Link href="/configuracoes/lixeira" className="underline">
              Restaurar na Lixeira
            </Link>
          ) : null}
        </p>
      ) : null}

      <MoveTaskDialog
        taskId={movingTaskId}
        onClose={closeMove}
        onDone={(text) => {
          setError(null);
          setNotice(text);
        }}
      />

      <SidePanel
        title="Editar Tarefa"
        open={editing}
        onClose={() => setEditing(false)}
      >
        <p className="mb-3 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
          Cada campo alterado vira um Registro de Atividade com o valor
          anterior.
        </p>
        {editing ? (
          <TaskTitleDescriptionEditor
            task={task}
            report={report}
            onClose={() => setEditing(false)}
          />
        ) : null}
      </SidePanel>

      <SaveTemplateDialog
        kind="tarefa"
        sourceId={task.id}
        open={salvandoModelo}
        onClose={() => setSalvandoModelo(false)}
        report={report}
      />
      <ShareTaskDialog
        task={task}
        open={compartilhando}
        onClose={() => setCompartilhando(false)}
        report={report}
        permitido={compartilharRecusado}
        revogarRecusado={revogarRecusado}
      />
      <ConfirmDialog
        open={confirmingTrash}
        title={`Enviar “${task.title}” à lixeira?`}
        description={`A Tarefa sai das Visualizações e pode ser restaurada por ${state.workspace.trashPolicy.retentionDays} dias, voltando ao estado que tinha antes. As Subtarefas vão junto.`}
        confirmLabel="Enviar à lixeira"
        destructive
        onConfirm={confirmTrash}
        onCancel={() => setConfirmingTrash(false)}
      />

      {convertingItem ? (
        <ConfirmDialog
          open
          title={`Converter “${convertingItem.text}” em Subtarefa?`}
          description={`Sem conversão inversa. O Item fica marcado como convertido e sai do progresso do Checklist.${
            convertingSubitems > 0
              ? ` Os ${convertingSubitems} subitens migram como Checklist da nova Subtarefa e saem deste.`
              : ""
          }`}
          confirmLabel="Converter"
          destructive
          {...(typedItem.trim() !== convertingItem.text
            ? {
                confirmDisabledReason: `Digite “${convertingItem.text}” para confirmar.`,
              }
            : {})}
          onConfirm={() =>
            converting && convert(converting.checklistId, converting.itemId)
          }
          onCancel={closeConversion}
        >
          <Field label={`Digite “${convertingItem.text}” para confirmar`}>
            {(id) => (
              <TextInput
                id={id}
                value={typedItem}
                onChange={setTypedItem}
                invalid={
                  typedItem !== "" && typedItem.trim() !== convertingItem.text
                }
                placeholder={convertingItem.text}
              />
            )}
          </Field>
        </ConfirmDialog>
      ) : null}

      <div className="p-6">
        {notice ? (
          <Toast
            tone="success"
            onDismiss={() => {
              setNotice(null);
              setProximaOcorrencia(null);
            }}
          >
            {notice}
            {proximaOcorrencia ? (
              <>
                {" "}
                <Link
                  href={`/estrutura/tarefas/${proximaOcorrencia}`}
                  className="underline"
                >
                  Abrir
                </Link>
              </>
            ) : null}
          </Toast>
        ) : null}
        {error ? (
          <Toast tone="error" onDismiss={() => setError(null)}>
            {error}
          </Toast>
        ) : null}
        {escritaRecusada && effective === "ativo" ? (
          <p className="mb-4 rounded-[var(--raio-controle)] bg-[var(--cor-superficie-2)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
            Somente leitura: {escritaRecusada}
            {camposDeConvidado
              ? ` Você pode preencher ${camposDeConvidado.map((id) => state.fieldDefinitions.find((d) => d.id === id)?.name ?? id).join(" e ")} e comentar.`
              : comenta
                ? " Você pode comentar."
                : ""}
          </p>
        ) : null}

        {task.description ? (
          <Section title="Descrição">
            <p className="whitespace-pre-wrap text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
              {task.description}
            </p>
          </Section>
        ) : null}

        <Section title="Status">
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
            optionBlockReason={(optionId) =>
              statusOptionRefusal(state, memberId, task, optionId)
            }
            readOnly={!editavel}
            readOnlyReason={
              effective !== "ativo"
                ? `Esta Tarefa está ${effective === "arquivado" ? "arquivada" : "na lixeira"} e é somente leitura.`
                : (escritaRecusada ?? "")
            }
          />
          {motivoDeSaida ? (
            <p className="mt-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
              {motivoDeSaida}
            </p>
          ) : null}
          {contaSemResumo(state, task) ? (
            <p
              role="status"
              className="mt-2 rounded-[var(--raio-controle)] bg-[var(--cor-atencao-fraco)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-atencao-texto)]"
            >
              Conta lançada sem “Resumo de pagamento” e sem Integração manual
              (INV-CP-01): peça ao Agente de lançamento ou marque a Integração
              manual.
            </p>
          ) : null}
          {contaSemCliente(state, task) ? (
            <p
              role="status"
              className="mt-2 rounded-[var(--raio-controle)] bg-[var(--cor-atencao-fraco)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-atencao-texto)]"
            >
              Entrada ou parcela sem cliente vinculado (RN-CR-02): a soma por
              cliente não a conta. Crie a série por “Nova série de parcelas”
              para nascer com o Vínculo.
            </p>
          ) : null}
          {(() => {
            const outra = parcelaDuplicada(state, task);
            return outra ? (
              <p
                role="status"
                className="mt-2 rounded-[var(--raio-controle)] bg-[var(--cor-atencao-fraco)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-atencao-texto)]"
              >
                Parcela duplicada (RN-CR-07): já existe{" "}
                <Link href={`/estrutura/tarefas/${outra.id}`} className="underline">
                  {outra.readableId ?? outra.title}
                </Link>{" "}
                para o mesmo cliente e número. Descarte uma das duas.
              </p>
            ) : null;
          })()}
          {blockReason ? (
            <p className="mt-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
              Concluir está indisponível: {blockReason}{" "}
              <Link
                href={`/estrutura/listas/${task.listId}/configuracoes`}
                className="underline"
              >
                Ver a exigência nas configurações da Lista
              </Link>
              .
            </p>
          ) : null}
        </Section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {config.features.checklists ? (
              <Section title="Checklists" count={task.checklists.length}>
                {task.checklists.length === 0 ? (
                  <EmptyState title="Nenhum Checklist." />
                ) : (
                  <div className="space-y-4">
                    {task.checklists.map((group) => {
                      const countable = group.items.filter(
                        (item) =>
                          item.parentItemId === undefined &&
                          item.converted === undefined,
                      );
                      const done = countable.filter((item) => item.done).length;
                      return (
                        <div
                          key={group.id}
                          className="rounded-[var(--raio-controle)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)]">
                              {group.name}
                            </h3>
                            <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                              {countable.length === 0
                                ? "sem item contável"
                                : `${done} de ${countable.length}`}
                            </span>
                          </div>
                          <ul className="space-y-1">
                            {group.items
                              .filter((item) => item.parentItemId === undefined)
                              .map((item) => (
                                <li
                                  key={item.id}
                                  className="flex items-center gap-2 text-[length:var(--texto-base)]"
                                >
                                  {item.converted ? (
                                    <>
                                      <span className="text-[var(--cor-tinta-fraca)] line-through">
                                        {item.text}
                                      </span>
                                      <span className="rounded bg-[var(--cor-superficie-2)] px-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                                        convertido
                                      </span>
                                      <Link
                                        href={`/estrutura/tarefas/${item.converted.taskId}`}
                                        className="text-[length:var(--texto-sm)] text-[var(--cor-tinta)] underline"
                                      >
                                        abrir Subtarefa
                                      </Link>
                                    </>
                                  ) : (
                                    <>
                                      <input
                                        type="checkbox"
                                        disabled={!editavel}
                                        id={`item-${item.id}`}
                                        checked={item.done}
                                        onChange={(event) =>
                                          report(
                                            run((data, memberId) =>
                                              setChecklistItemDone(
                                                data,
                                                memberId,
                                                task.id,
                                                group.id,
                                                item.id,
                                                event.target.checked,
                                              ),
                                            ),
                                            event.target.checked
                                              ? "Item concluído."
                                              : "Item reaberto.",
                                          )
                                        }
                                        className="size-4 accent-[var(--cor-acento)]"
                                      />
                                      <label
                                        htmlFor={`item-${item.id}`}
                                        className={
                                          item.done
                                            ? "text-[var(--cor-tinta-fraca)] line-through"
                                            : "text-[var(--cor-tinta)]"
                                        }
                                      >
                                        {item.text}
                                      </label>
                                      {item.assigneeMemberId ? (
                                        <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                                          {
                                            state.members.find(
                                              (m) =>
                                                m.id === item.assigneeMemberId,
                                            )?.displayName
                                          }
                                        </span>
                                      ) : null}
                                      {editavel ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openConversion(group.id, item.id)
                                          }
                                          className="ml-auto rounded px-2 py-0.5 text-[length:var(--texto-sm)] text-[var(--cor-perigo-texto)] hover:bg-[var(--cor-perigo-fraco)]"
                                        >
                                          Converter em Subtarefa
                                        </button>
                                      ) : null}
                                    </>
                                  )}
                                </li>
                              ))}
                          </ul>

                          <form
                            className="mt-2 flex gap-2"
                            onSubmit={(event) => {
                              event.preventDefault();
                              const text = newItem[group.id] ?? "";
                              report(
                                run((data, memberId) =>
                                  addChecklistItem(
                                    data,
                                    memberId,
                                    task.id,
                                    group.id,
                                    text,
                                  ),
                                ),
                                "Item acrescentado.",
                              );
                              setNewItem((current) => ({
                                ...current,
                                [group.id]: "",
                              }));
                            }}
                          >
                            <label
                              className="sr-only"
                              htmlFor={`novo-item-${group.id}`}
                            >
                              Novo Item em {group.name}
                            </label>
                            <input
                              id={`novo-item-${group.id}`}
                              value={newItem[group.id] ?? ""}
                              onChange={(event) =>
                                setNewItem((current) => ({
                                  ...current,
                                  [group.id]: event.target.value,
                                }))
                              }
                              placeholder="Acrescentar Item"
                              className="flex-1 rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] px-2 py-1 text-[length:var(--texto-base)]"
                            />
                            <Button
                              variant="secondary"
                              type="submit"
                              disabled={
                                (newItem[group.id] ?? "").trim() === "" ||
                                !editavel
                              }
                              disabledReason={
                                !editavel
                                  ? (escritaRecusada ??
                                    "Esta Tarefa não está ativa.")
                                  : "Escreva o Item antes de acrescentar."
                              }
                            >
                              Acrescentar
                            </Button>
                          </form>
                        </div>
                      );
                    })}
                  </div>
                )}

                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    report(
                      run((data, memberId) =>
                        addChecklist(data, memberId, task.id, newChecklist),
                      ),
                      "Checklist acrescentado.",
                    );
                    setNewChecklist("");
                  }}
                >
                  <label className="sr-only" htmlFor="novo-checklist">
                    Novo Checklist
                  </label>
                  <input
                    id="novo-checklist"
                    value={newChecklist}
                    onChange={(event) => setNewChecklist(event.target.value)}
                    placeholder="Nome do novo Checklist"
                    className="flex-1 rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] px-2 py-1 text-[length:var(--texto-base)]"
                  />
                  <Button
                    variant="secondary"
                    type="submit"
                    disabled={newChecklist.trim() === "" || !editavel}
                    disabledReason={
                      !editavel
                        ? (escritaRecusada ?? "Esta Tarefa não está ativa.")
                        : "Dê um nome ao Checklist."
                    }
                  >
                    Novo Checklist
                  </Button>
                </form>
              </Section>
            ) : null}

            {config.features.subtarefas ? (
              <Section
                title="Subtarefas"
                count={
                  state.tasks.filter((t) => t.parentTaskId === task.id).length
                }
              >
                {state.tasks.filter((t) => t.parentTaskId === task.id)
                  .length === 0 ? (
                  <EmptyState title="Nenhuma Subtarefa." />
                ) : (
                  <ul className="space-y-2">
                    {state.tasks
                      .filter((t) => t.parentTaskId === task.id)
                      .map((child) => (
                        <li key={child.id}>
                          <Link
                            href={`/estrutura/tarefas/${child.id}`}
                            className="flex items-center justify-between rounded-[var(--raio-controle)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-2 text-[length:var(--texto-base)] hover:border-[var(--cor-traco-forte)]"
                          >
                            <span className="text-[var(--cor-tinta)]">
                              {child.title}
                            </span>
                            <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                              {
                                statusDefinition(
                                  state,
                                  child.listId,
                                  child.statusId,
                                )?.name
                              }
                            </span>
                          </Link>
                        </li>
                      ))}
                  </ul>
                )}
                {level >= state.workspace.maxSubtaskDepth ? (
                  <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                    Limite de {state.workspace.maxSubtaskDepth} níveis de
                    Subtarefa, definido no Espaço de Trabalho.
                  </p>
                ) : (
                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const result = run((data, memberId) =>
                        createTask(data, memberId, {
                          listId: task.listId,
                          title: newSubtask,
                          parentTaskId: task.id,
                        }),
                      );
                      if (result.ok) {
                        setError(null);
                        setNotice(`Subtarefa criada: ${result.value.title}.`);
                        setNewSubtask("");
                      } else {
                        setNotice(null);
                        setError(result.error);
                      }
                    }}
                  >
                    <label className="sr-only" htmlFor="nova-subtarefa">
                      Nova Subtarefa
                    </label>
                    <input
                      id="nova-subtarefa"
                      value={newSubtask}
                      onChange={(event) => setNewSubtask(event.target.value)}
                      placeholder="Título da nova Subtarefa"
                      className="flex-1 rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] px-2 py-1 text-[length:var(--texto-base)]"
                    />
                    <Button
                      variant="secondary"
                      type="submit"
                      disabled={newSubtask.trim() === "" || !editavel}
                      disabledReason={
                        !editavel
                          ? (escritaRecusada ?? "Esta Tarefa não está ativa.")
                          : "Escreva o título antes de criar."
                      }
                    >
                      Nova Subtarefa
                    </Button>
                  </form>
                )}
              </Section>
            ) : null}

            <Section
              title="Comentários"
              count={task.comments.filter((c) => !c.deletedAt).length}
            >
              <TaskComments
                task={task}
                report={report}
                authorLabel={(actor) => authorLabel(state, actor)}
                readOnly={!comenta}
              />
            </Section>

            <Section title="Observadores" count={task.observerMemberIds.length}>
              {editavel ? (
                <TaskWatchers task={task} report={report} />
              ) : task.observerMemberIds.length === 0 ? (
                <EmptyState title="Ninguém observa esta Tarefa." />
              ) : (
                <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                  {task.observerMemberIds
                    .map(
                      (id) =>
                        state.members.find((m) => m.id === id)?.displayName ??
                        id,
                    )
                    .join(", ")}
                </p>
              )}
            </Section>

            <Section title="Atividade" count={activity.length}>
              {activity.length === 0 ? (
                <EmptyState title="Nenhum Registro de Atividade nesta Tarefa." />
              ) : (
                <ul className="space-y-1">
                  {activity.slice(0, ACTIVITY_PAGE_SIZE).map((record) => (
                    <li
                      key={record.id}
                      className="text-[length:var(--texto-base)] text-[var(--cor-tinta)]"
                    >
                      <span className="text-[var(--cor-tinta-fraca)]">
                        {fmt.relative(record.at)}
                      </span>{" "}
                      · {authorLabel(state, record.actor)}
                      {record.delegate
                        ? ` em nome de ${authorLabel(state, record.delegate)}`
                        : ""}{" "}
                      · {record.action}
                      {record.before || record.after ? (
                        <span className="text-[var(--cor-tinta-fraca)]">
                          {" "}
                          ({record.before ?? "—"} → {record.after ?? "—"})
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {activity.length > ACTIVITY_PAGE_SIZE ? (
                <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                  Mostrando {ACTIVITY_PAGE_SIZE} de {activity.length}.{" "}
                  <Link href="/configuracoes/auditoria" className="underline">
                    Ver tudo na Auditoria
                  </Link>
                  .
                </p>
              ) : null}
            </Section>
          </div>

          <aside>
            <Section title="Atributos">
              <dl className="space-y-2 text-[length:var(--texto-base)]">
                <Attribute label="Status">
                  {definition ? (
                    <CategoryDot
                      color={definition.color}
                      label={definition.name}
                    />
                  ) : (
                    "—"
                  )}
                </Attribute>
                {editavel ? (
                  <Attribute
                    label={
                      <label htmlFor="tipo-da-tarefa">Tipo de Tarefa</label>
                    }
                  >
                    <Select
                      id="tipo-da-tarefa"
                      value={task.taskTypeId}
                      onChange={(taskTypeId) =>
                        report(
                          run((data, me) =>
                            updateTask(data, me, task.id, { taskTypeId }),
                          ),
                          "Tipo alterado.",
                        )
                      }
                      options={config.taskTypeIds.map((id) => ({
                        value: id,
                        label:
                          state.taskTypes.find((t) => t.id === id)?.name ?? id,
                      }))}
                    />
                  </Attribute>
                ) : (
                  <Attribute label="Tipo de Tarefa">
                    {state.taskTypes.find((t) => t.id === task.taskTypeId)
                      ?.name ?? "—"}
                  </Attribute>
                )}
                {editavel ? (
                  <TaskAttributeEditors
                    task={task}
                    report={report}
                    features={config.features}
                  />
                ) : (
                  <>
                    <Attribute label="Prioridade">
                      {PRIORITY_LABEL[task.priority]}
                    </Attribute>
                    <Attribute label="Data de início">
                      {task.startDate ? fmt.taskDate(task.startDate) : "—"}
                    </Attribute>
                    <Attribute label="Data de vencimento">
                      {task.dueDate ? fmt.taskDate(task.dueDate) : "—"}
                    </Attribute>
                    <Attribute label="Estimativa">
                      {task.estimate !== undefined
                        ? `${task.estimate} min`
                        : "—"}
                    </Attribute>
                  </>
                )}
                <Attribute label={<label htmlFor="tags-da-tarefa">Tags</label>}>
                  {editavel ? (
                    <span className="inline-block w-56 max-w-full text-left">
                      <TaskTagsEditor
                        task={task}
                        report={report}
                        id="tags-da-tarefa"
                      />
                    </span>
                  ) : task.tagIds.length === 0 ? (
                    "—"
                  ) : (
                    task.tagIds
                      .map(
                        (id) => state.tags.find((t) => t.id === id)?.name ?? id,
                      )
                      .join(", ")
                  )}
                </Attribute>
                <Attribute
                  label={
                    <label htmlFor="responsaveis-da-tarefa">Responsáveis</label>
                  }
                >
                  {editavel ? (
                    <MultiSelect
                      id="responsaveis-da-tarefa"
                      values={task.assignees.map((assignee) => assignee.id)}
                      onChange={assign}
                      placeholder="sem Responsável"
                      options={[
                        ...state.members
                          .filter((member) => member.state === "ativo")
                          .map((member) => ({
                            value: member.id,
                            label: member.displayName,
                            detail: "Membro",
                          })),
                        ...state.agents
                          .filter((agent) => agent.lifecycle === "ativo")
                          .map((agent) => ({
                            value: agent.id,
                            label: agent.name,
                            detail: "Agente",
                          })),
                      ]}
                    />
                  ) : task.assignees.length === 0 ? (
                    "sem Responsável"
                  ) : (
                    task.assignees
                      .map((assignee) => authorLabel(state, assignee))
                      .join(", ")
                  )}
                </Attribute>
                <Attribute label="Progresso de Checklists">
                  {checklist ? `${checklist.done} de ${checklist.total}` : "—"}
                </Attribute>
                <Attribute label="Progresso de Subtarefas">
                  {subtasks ? `${subtasks.done} de ${subtasks.total}` : "—"}
                </Attribute>
              </dl>
            </Section>

            <Section title="Valores de Campo">
              {config.fieldDefinitionIds.length === 0 ? (
                <EmptyState title="Nenhum campo personalizado se aplica a esta Lista." />
              ) : (
                <dl className="space-y-2 text-[length:var(--texto-base)]">
                  {config.fieldDefinitionIds.map((definitionId) => {
                    const fieldDefinition = state.fieldDefinitions.find(
                      (d) => d.id === definitionId,
                    );
                    const value = task.fieldValues.find(
                      (v) => v.definitionId === definitionId,
                    );
                    if (
                      fieldDefinition &&
                      fieldDefinition.lifecycle === "ativo" &&
                      (editavel || camposDeConvidado?.includes(definitionId))
                    ) {
                      return (
                        <TaskFieldValueEditor
                          key={`${definitionId}-${String(value?.value ?? "")}`}
                          task={task}
                          definition={fieldDefinition}
                          report={report}
                        />
                      );
                    }
                    return (
                      <Attribute
                        key={definitionId}
                        label={fieldDefinition?.name ?? definitionId}
                      >
                        {value && value.state === "ativo"
                          ? String(value.value ?? "—")
                          : "—"}
                      </Attribute>
                    );
                  })}
                </dl>
              )}
              {task.fieldValues.some((value) => value.state === "arquivado") ? (
                <details className="mt-3 rounded-[var(--raio-controle)] bg-[var(--cor-superficie-2)] p-2">
                  <summary className="cursor-pointer text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                    Campos não aplicáveis neste caminho (
                    {
                      task.fieldValues.filter(
                        (value) => value.state === "arquivado",
                      ).length
                    }
                    )
                  </summary>
                  <dl className="mt-2 space-y-1 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                    {task.fieldValues
                      .filter((value) => value.state === "arquivado")
                      .map((value) => (
                        <Attribute
                          key={value.definitionId}
                          label={
                            state.fieldDefinitions.find(
                              (d) => d.id === value.definitionId,
                            )?.name ?? value.definitionId
                          }
                        >
                          {String(value.value ?? "—")}
                        </Attribute>
                      ))}
                  </dl>
                  <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                    Preservados e reativados se a Tarefa voltar a um caminho em
                    que a Definição se aplica.
                  </p>
                </details>
              ) : null}
            </Section>

            <Section title="Dependências" count={task.dependencies.length}>
              {config.features.dependencias ? (
                <TaskDependencies
                  task={task}
                  report={report}
                  readOnly={!editavel}
                />
              ) : (
                <EmptyState title="Esta Lista não usa Dependências." />
              )}
            </Section>

            <Section title="Tempo" count={task.timeEntries.length}>
              {config.features.registroDeTempo ? (
                <TaskTime task={task} report={report} readOnly={!editavel} />
              ) : (
                <EmptyState title="Esta Lista não usa Registro de Tempo." />
              )}
            </Section>

            <Section title="Recorrência">
              {config.features.recorrencia ? (
                <TaskRecurrence
                  key={
                    task.recurrence ? JSON.stringify(task.recurrence) : "sem"
                  }
                  task={task}
                  report={report}
                  readOnly={!editavel}
                />
              ) : (
                <EmptyState title="Esta Lista não usa Recorrência." />
              )}
            </Section>

            <Section
              title="Vínculos"
              count={
                state.links.filter(
                  (l) => l.fromId === task.id || l.toId === task.id,
                ).length
              }
            >
              {state.links.filter(
                (l) => l.fromId === task.id || l.toId === task.id,
              ).length === 0 ? (
                <EmptyState title="Nenhum Vínculo." />
              ) : (
                <ul className="space-y-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                  {state.links
                    .filter(
                      (link) =>
                        link.fromId === task.id || link.toId === task.id,
                    )
                    .map((link) => {
                      const otherType =
                        link.fromId === task.id ? link.toType : link.fromType;
                      const otherId =
                        link.fromId === task.id ? link.toId : link.fromId;
                      const label =
                        otherType === "deal"
                          ? state.deals.find((d) => d.id === otherId)?.title
                          : otherType === "contact"
                            ? state.contacts.find((c) => c.id === otherId)
                                ?.firstName
                            : otherType === "conversation"
                              ? state.conversations.find(
                                  (c) => c.id === otherId,
                                )?.title
                              : undefined;
                      const href =
                        otherType === "deal"
                          ? `/crm/negocios/${otherId}`
                          : otherType === "contact"
                            ? `/crm/contatos/${otherId}`
                            : otherType === "conversation"
                              ? `/crm/caixa-de-entrada/${otherId}`
                              : undefined;
                      return (
                        <li key={link.id}>
                          <span className="text-[var(--cor-tinta-fraca)]">
                            {OBJECT_TYPE_LABEL[otherType] ?? otherType} ·{" "}
                          </span>
                          {/*
                            O alvo pode ter sido eliminado: mostrar o identificador
                            interno no lugar do nome não diz nada a ninguém.
                          */}
                          {label === undefined ? (
                            <span className="text-[var(--cor-tinta-fraca)]">
                              registro não encontrado
                            </span>
                          ) : href ? (
                            <Link href={href} className="hover:underline">
                              {label}
                            </Link>
                          ) : (
                            label
                          )}
                        </li>
                      );
                    })}
                </ul>
              )}
            </Section>

            <Section title="Anexos" count={task.attachments.length}>
              <TaskAttachments
                task={task}
                report={report}
                readOnly={!editavel}
              />
            </Section>
          </aside>
        </div>
      </div>
    </>
  );
}

/** B48 — the subitems migrate with the conversion and leave the origin checklist. */
function subitemsOf(
  items: readonly { readonly id: string; readonly parentItemId?: string }[],
  itemId: string,
): number {
  return items.filter((item) => item.parentItemId === itemId).length;
}

function Attribute({
  label,
  children,
}: {
  readonly label: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-[var(--cor-tinta-fraca)]">{label}</dt>
      <dd className="text-right text-[var(--cor-tinta)]">{children}</dd>
    </div>
  );
}

/** A6.2 — every recorded action shows the actor and, when present, the delegate. */
function authorLabel(state: DataState, actor: ActorRef): string {
  if (actor.kind === "member") {
    return (
      state.members.find((m) => m.id === actor.id)?.displayName ??
      "Membro removido"
    );
  }
  if (actor.kind === "agent") {
    return `${state.agents.find((a) => a.id === actor.id)?.name ?? "Agente eliminado"} (Agente)`;
  }
  if (actor.kind === "automation") {
    return `${state.automations.find((a) => a.id === actor.id)?.name ?? "Automação"} (Automação)`;
  }
  return ACTOR_KIND_LABEL[actor.kind] ?? actor.kind;
}
