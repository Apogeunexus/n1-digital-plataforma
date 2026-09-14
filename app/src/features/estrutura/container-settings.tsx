"use client";

/**
 * T15/T17/T19 — configuration of a structural container (Space, Folder, List).
 * One component, three routes: the aspects are the same at every level, and
 * writing three near-identical screens would only let them drift apart.
 *
 * B25 is the whole screen. An aspect is `herdado`, `sobrescrito` or `bloqueado`,
 * and the three do NOT compose the same way:
 *   - statusSet, features and defaultViews SUBSTITUTE — the nearest level that
 *     defines the aspect wins, and nothing from above survives;
 *   - fieldDefinitions, taskTypes and automations ACCUMULATE along the path.
 * So the screen never shows a bare "herdado": it shows FROM WHERE, and what the
 * effective value ends up being.
 */

import Link from "next/link";
import { useState } from "react";
import { useData } from "@/data/store";
import { FeaturesEditor, FieldDefinitionsEditor, StatusSetEditor, TaskTypesEditor, useMayConfigure } from "@/features/estrutura/configuration-editors";
import { FormsEditor } from "@/features/estrutura/forms-editor";
import { effectiveContainerConfig } from "@/data/derive";
import { FIELD_TYPE_LABEL } from "@/features/shell/format";
import { EmptyState, PageHeader, Section, StateSeal, Toast } from "@/features/shell/ui";
import type { ConfigurableAspect, InheritanceMode } from "@/data/types";

const ASPECTS: ReadonlyArray<{
  readonly aspect: ConfigurableAspect;
  readonly label: string;
  readonly composition: "substitui" | "acumula";
  readonly explanation: string;
}> = [
  {
    aspect: "statusSet",
    label: "Conjunto de Status",
    composition: "substitui",
    explanation: "O nível mais próximo que define vence por inteiro; nada do nível acima sobrevive.",
  },
  {
    aspect: "features",
    label: "Funcionalidades",
    composition: "substitui",
    explanation: "Cada funcionalidade é decidida pelo nível mais próximo que a define.",
  },
  {
    aspect: "defaultViews",
    label: "Visualizações padrão",
    composition: "substitui",
    explanation: "As Visualizações do nível mais próximo substituem as de cima.",
  },
  {
    aspect: "fieldDefinitions",
    label: "Definições de Campo",
    composition: "acumula",
    explanation: "Somam-se ao longo do caminho: o que vem de cima continua valendo aqui.",
  },
  {
    aspect: "taskTypes",
    label: "Tipos de Tarefa",
    composition: "acumula",
    explanation: "Somam-se ao longo do caminho.",
  },
  {
    aspect: "automations",
    label: "Automações",
    composition: "acumula",
    explanation: "Somam-se ao longo do caminho.",
  },
];

const MODE_LABEL: Record<InheritanceMode, string> = {
  herdado: "herdado",
  sobrescrito: "sobrescrito",
  bloqueado: "bloqueado",
};

export function ContainerSettings({
  kind,
  id,
}: {
  readonly kind: "space" | "folder" | "list";
  readonly id: string;
}) {
  const state = useData((data) => data);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const report = (result: { ok: boolean; error?: string }, message: string) => {
    if (result.ok) {
      setError(null);
      setNotice(message);
    } else {
      setNotice(null);
      setError(result.error ?? "Não foi possível concluir a operação.");
    }
  };

  const useMayConfigureReason = useMayConfigure(kind, id);
  const container =
    kind === "space"
      ? state.spaces.find((s) => s.id === id)
      : kind === "folder"
        ? state.folders.find((f) => f.id === id)
        : state.lists.find((l) => l.id === id);

  if (!container) {
    return (
      <>
        <PageHeader title="Contêiner não encontrado" />
        <div className="p-6">
          <EmptyState
            title="Contêiner não encontrado."
            hint="Ele pode ter sido eliminado, ou você não tem permissão para vê-lo."
          />
        </div>
      </>
    );
  }

  // What a List created right here would consume — resolved from this node,
  // never borrowed from some List below (a List that overrides would lie).
  const config = effectiveContainerConfig(state, kind, id);
  const path = config?.path ?? [];
  const ancestors = path.slice(0, -1);

  const hrefOf = (node: { readonly type: string; readonly id: string }): string =>
    node.type === "space"
      ? `/estrutura/espacos/${node.id}`
      : node.type === "folder"
        ? `/estrutura/pastas/${node.id}`
        : `/estrutura/listas/${node.id}`;

  const backHref = hrefOf({ type: kind, id });

  const definedHere = (aspect: ConfigurableAspect): boolean =>
    (container.modes[aspect] ?? "herdado") !== "herdado";

  const sourceOf = (aspect: ConfigurableAspect): string => {
    if (definedHere(aspect)) return "definido aqui";
    for (let i = ancestors.length - 1; i >= 0; i -= 1) {
      const node = ancestors[i];
      if (!node) continue;
      const ancestor =
        node.type === "space"
          ? state.spaces.find((s) => s.id === node.id)
          : node.type === "folder"
            ? state.folders.find((f) => f.id === node.id)
            : state.lists.find((l) => l.id === node.id);
      if (ancestor && (ancestor.modes[aspect] ?? "herdado") !== "herdado") {
        return `vem de ${node.name}`;
      }
    }
    return "padrão da plataforma";
  };

  return (
    <>
      <PageHeader
        path={
          <>
            {ancestors.map((node) => (
              <span key={node.id}>
                <Link href={hrefOf(node)} className="hover:underline">
                  {node.name}
                </Link>
                {" › "}
              </span>
            ))}
            <Link href={backHref} className="hover:underline">
              {container.name}
            </Link>
          </>
        }
        title={`Configurações de ${container.name}`}
        seal={<StateSeal state={container.lifecycle} />}
        meta="Cada aspecto é herdado, sobrescrito ou bloqueado. Bloquear impede que qualquer nível abaixo sobrescreva."
      />

      <div className="p-6">
        {notice ? (
          <Toast tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Toast>
        ) : null}
        {error ? (
          <Toast tone="error" onDismiss={() => setError(null)}>
            {error}
          </Toast>
        ) : null}

        <Section title="Aspectos configuráveis">
          <div className="overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
            <table className="w-full text-[length:var(--texto-base)]">
              <thead className="border-b border-[var(--cor-traco)] bg-[var(--cor-superficie-2)] text-left">
                <tr>
                  <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Aspecto</th>
                  <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Neste nível</th>
                  <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Origem do valor</th>
                  <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Como compõe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--cor-traco)]">
                {ASPECTS.map((item) => {
                  const mode = container.modes[item.aspect] ?? "herdado";
                  const blocked = container.blocks[item.aspect] === true;
                  return (
                    <tr key={item.aspect}>
                      <td className="px-3 py-2">
                        <span className="font-medium text-[var(--cor-tinta)]">{item.label}</span>
                        <span className="block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">{item.explanation}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[length:var(--texto-sm)] ${
                            mode === "sobrescrito"
                              ? "bg-[var(--cor-info-fraco)] text-[var(--cor-info-texto)]"
                              : mode === "bloqueado"
                                ? "bg-[var(--cor-atencao-fraco)] text-[var(--cor-atencao-texto)]" // smaug-ignore ui-strings: nome de token CSS, não texto de interface
                                : "bg-[var(--cor-superficie-2)] text-[var(--cor-tinta)]"
                          }`}
                        >
                          {MODE_LABEL[mode]}
                        </span>
                        {blocked ? (
                          <span className="mt-1 block text-[length:var(--texto-sm)] text-[var(--cor-atencao-texto)]">
                            Nenhum nível abaixo pode sobrescrever.
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-[var(--cor-tinta)]">{sourceOf(item.aspect)}</td>
                      <td className="px-3 py-2 text-[var(--cor-tinta)]">
                        {item.composition === "substitui" ? "substitui" : "acumula"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        {config === null ? (
          <Section title="Valor efetivo">
            <EmptyState
              title="Este contêiner não resolve um Conjunto de Status."
              hint="O Espaço acima dele precisa definir um: sem isso nenhuma Lista abaixo recebe Tarefas."
            />
          </Section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Conjunto de Status efetivo">
              <p className="mb-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                Definido em {config.statusSetDefinedAt.name}
                {kind === "list" ? "" : ": é o que uma Lista criada aqui consome"}.
              </p>
              <StatusSetEditor
                containerType={kind}
                containerId={id}
                own={container.statusSet !== undefined}
                set={config.statusSet}
                definedAtName={config.statusSetDefinedAt.name}
                report={report}
              />
            </Section>

            <Section title="Funcionalidades efetivas">
              <FeaturesEditor containerType={kind} containerId={id} features={config.features} own={container.features ?? {}} report={report} />
            </Section>

            <Section title="Definições de Campo acumuladas" count={config.fieldDefinitionIds.length}>
              {config.fieldDefinitionIds.length === 0 ? (
                <EmptyState title="Nenhuma Definição de Campo alcança este caminho." />
              ) : (
                <ul className="space-y-1 text-[length:var(--texto-base)]">
                  {config.fieldDefinitionIds.map((definitionId) => {
                    const definition = state.fieldDefinitions.find((d) => d.id === definitionId);
                    return (
                      <li
                        key={definitionId}
                        className="flex items-center justify-between rounded-[var(--raio-controle)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] px-3 py-2"
                      >
                        <span className="text-[var(--cor-tinta)]">{definition?.name ?? definitionId}</span>
                        <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                          {definition ? (FIELD_TYPE_LABEL[definition.type] ?? definition.type) : "—"}
                          {definition?.required ? " · obrigatório" : ""}
                          {definition?.definedAtId && definition.definedAtId !== id
                            ? ` · de ${path.find((n) => n.id === definition.definedAtId)?.name ?? "acima"}`
                            : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-3 border-t border-[var(--cor-traco)] pt-3">
                <FieldDefinitionsEditor containerType={kind} containerId={id} report={report} />
              </div>
            </Section>

            {kind === "list" ? (
              <Section title="Formulários">
                <FormsEditor listId={id} bloqueio={useMayConfigureReason} report={report} />
              </Section>
            ) : null}

            <Section title="Tipos de Tarefa acumulados" count={config.taskTypeIds.length}>
              {config.taskTypeIds.length === 0 ? (
                <EmptyState title="Nenhum Tipo de Tarefa alcança este caminho." />
              ) : (
                <ul className="space-y-1 text-[length:var(--texto-base)]">
                  {config.taskTypeIds.map((taskTypeId) => {
                    const taskType = state.taskTypes.find((t) => t.id === taskTypeId);
                    return (
                      <li
                        key={taskTypeId}
                        className="rounded-[var(--raio-controle)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] px-3 py-2 text-[var(--cor-tinta)]"
                      >
                        {taskType?.name ?? taskTypeId}
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-3 border-t border-[var(--cor-traco)] pt-3">
                <TaskTypesEditor containerType={kind} containerId={id} report={report} />
              </div>
            </Section>
          </div>
        )}

        <Section title="Privacidade">
          <div className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4 text-[length:var(--texto-base)]">
            <p className="text-[var(--cor-tinta)]">
              {container.isPrivate ? "Contêiner privado." : "Contêiner não privado."}
            </p>
            <p className="mt-1 text-[var(--cor-tinta-fraca)]">
              {container.isPrivate
                ? "Ser privado interrompe as permissões vindas do Papel e da herança: aqui dentro, só alcança quem recebeu Concessão direta ou compartilhamento."
                : "As permissões vindas do Papel e da herança alcançam este contêiner normalmente."}
            </p>
          </div>
        </Section>
      </div>
    </>
  );
}
