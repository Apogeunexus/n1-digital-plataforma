"use client";

/**
 * T45 — Campos.
 *
 * A5.2 — the point of definition differs by family: a Task field is defined in a
 * container (Space, Folder or List) and reaches the subtree below it; a CRM
 * field is defined in the workspace and reaches every record of its family.
 *
 * B37 — a value whose definition stopped applying is archived inside the record,
 * never discarded. The count of archived values is shown because it is the only
 * evidence that data survived a move.
 */

import Link from "next/link";
import { useState } from "react";
import { useData, useRun, useSession } from "@/data/store";
import { restoreFieldDefinition } from "@/data/operations";
import { containerAdminRefusal } from "@/data/derive";
import { FIELD_TYPE_LABEL } from "@/features/shell/format";
import { Button, EmptyState, Field, PageHeader, Section, Select, StateSeal, Toast } from "@/features/shell/ui";
import { FieldDefinitionsEditor } from "@/features/estrutura/configuration-editors";
import type { FieldDefinition } from "@/data/types";


const TARGET_LABEL: Record<string, string> = {
  task: "Tarefa",
  contact: "Contato",
  company: "Empresa",
  deal: "Negócio",
  conversation: "Conversa",
};

export default function CamposPage() {
  /*
    Criar um Campo de Tarefa é escolher ONDE ele vale (B25): o contêiner é a
    primeira decisão, e o editor é o mesmo da configuração do contêiner.
  */
  const [contexto, setContexto] = useState("");
  const run = useRun();
  const { memberId } = useSession();
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
  const state = useData((data) => data);
  const [target, setTarget] = useState<"todos" | FieldDefinition["target"]>("todos");

  const definitions = state.fieldDefinitions.filter(
    (definition) => target === "todos" || definition.target === target,
  );
  const taskDefinitions = definitions.filter((definition) => definition.target === "task");
  const crmDefinitions = definitions.filter((definition) => definition.target !== "task");

  const containerName = (definition: FieldDefinition): string => {
    if (definition.definedAtType === "space") {
      return state.spaces.find((s) => s.id === definition.definedAtId)?.name ?? "Espaço não encontrado";
    }
    if (definition.definedAtType === "folder") {
      return state.folders.find((f) => f.id === definition.definedAtId)?.name ?? "Pasta não encontrada";
    }
    return state.lists.find((l) => l.id === definition.definedAtId)?.name ?? "Lista não encontrada";
  };

  // Aponta para as configurações, onde o Campo se edita — não para a ficha do contêiner.
  const containerHref = (definition: FieldDefinition): string => {
    if (definition.definedAtType === "space") return `/estrutura/espacos/${definition.definedAtId}/configuracoes`;
    if (definition.definedAtType === "folder") return `/estrutura/pastas/${definition.definedAtId}/configuracoes`;
    return `/estrutura/listas/${definition.definedAtId}/configuracoes`;
  };

  /** Restaurar é ação de quem administra o contêiner que define o Campo. */
  const restauroRecusado = (definition: FieldDefinition): string | undefined =>
    definition.definedAtType && definition.definedAtId
      ? containerAdminRefusal(state, memberId, definition.definedAtType, definition.definedAtId)
      : "Este Campo não é definido em um contêiner.";

  const usageOf = (definition: FieldDefinition): { filled: number; archived: number } => {
    const records =
      definition.target === "task"
        ? state.tasks
        : definition.target === "contact"
          ? state.contacts
          : definition.target === "company"
            ? state.companies
            : definition.target === "deal"
              ? state.deals
              : state.conversations;
    let filled = 0;
    let archived = 0;
    for (const record of records) {
      const value = record.fieldValues.find((v) => v.definitionId === definition.id);
      if (!value) continue;
      if (value.state === "arquivado") archived += 1;
      else filled += 1;
    }
    return { filled, archived };
  };

  const renderTable = (rows: readonly FieldDefinition[], showContainer: boolean) => (
    <div className="overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
      <table className="w-full text-[length:var(--texto-base)]">
        <thead className="border-b border-[var(--cor-traco)] bg-[var(--cor-superficie-2)] text-left">
          <tr>
            <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Campo</th>
            <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Tipo</th>
            {showContainer ? (
              <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Ponto de definição</th>
            ) : (
              <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Família</th>
            )}
            <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Preenchido</th>
            <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--cor-traco)]">
          {rows.map((definition) => {
            const usage = usageOf(definition);
            return (
              <tr key={definition.id} className="hover:bg-[var(--cor-superficie-2)]">
                <td className="px-3 py-2">
                  <span className="font-medium text-[var(--cor-tinta)]">{definition.name}</span>
                  {definition.required ? (
                    <span className="ml-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">obrigatório</span>
                  ) : null}
                  {definition.options ? (
                    <span className="block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                      {definition.options.join(" · ")}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-[var(--cor-tinta)]">
                  {FIELD_TYPE_LABEL[definition.type] ?? definition.type}
                </td>
                <td className="px-3 py-2 text-[var(--cor-tinta)]">
                  {showContainer ? (
                    <Link href={containerHref(definition)} className="hover:underline">
                      {containerName(definition)}
                    </Link>
                  ) : (
                    TARGET_LABEL[definition.target] ?? definition.target
                  )}
                  {showContainer ? (
                    <span className="block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                      alcança a subárvore abaixo deste contêiner
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-[var(--cor-tinta)]">
                  {usage.filled} registro(s)
                  {usage.archived > 0 ? (
                    <span className="block text-[length:var(--texto-sm)] text-[var(--cor-atencao-texto)]">
                      {usage.archived} valor(es) arquivado(s) fora do alcance
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  {definition.lifecycle === "ativo" ? (
                    <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">ativo</span>
                  ) : (
                    <span className="flex flex-wrap items-center gap-2">
                      <StateSeal state={definition.lifecycle} />
                      {showContainer ? (
                        <Button
                          onClick={() => report(run((data, me) => restoreFieldDefinition(data, me, definition.id)), "Campo restaurado.")}
                          disabled={restauroRecusado(definition) !== undefined}
                          disabledReason={restauroRecusado(definition) ?? ""}
                        >
                          Restaurar
                        </Button>
                      ) : null}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <PageHeader
        path={
          <Link href="/configuracoes" className="hover:underline">
            Configurações
          </Link>
        }
        title="Campos"
        meta="Uma Definição de Campo aplica-se a partir do ponto onde é definida. Um valor fora desse alcance é arquivado no registro, nunca descartado."
        actions={
          <label className="flex items-center gap-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
            Família
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value as "todos" | FieldDefinition["target"])}
              className="rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)] px-2 py-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]"
            >
              <option value="todos">Todas</option>
              <option value="task">Tarefa</option>
              <option value="contact">Contato</option>
              <option value="company">Empresa</option>
              <option value="deal">Negócio</option>
              <option value="conversation">Conversa</option>
            </select>
          </label>
        }
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

        <Section title="Campos de Tarefa por contêiner">
          <div className="grid gap-3">
            <Field label="Contêiner" hint="Escolha onde o Campo vale: ele alcança tudo abaixo. Os já definidos ali aparecem para editar ou arquivar.">
              {(id) => (
                <Select
                  id={id}
                  value={contexto}
                  onChange={setContexto}
                  searchable
                  placeholder="Escolher Espaço, Pasta ou Lista"
                  options={[
                    ...state.spaces.filter((c) => c.lifecycle === "ativo").map((c) => ({ value: `space:${c.id}`, label: c.name, detail: "Espaço" })),
                    ...state.folders.filter((c) => c.lifecycle === "ativo").map((c) => ({ value: `folder:${c.id}`, label: c.name, detail: "Pasta" })),
                    ...state.lists.filter((c) => c.lifecycle === "ativo").map((c) => ({ value: `list:${c.id}`, label: c.name, detail: "Lista" })),
                  ]}
                />
              )}
            </Field>
            {contexto ? (
              <FieldDefinitionsEditor
                containerType={contexto.split(":")[0] as "space" | "folder" | "list"}
                containerId={contexto.split(":")[1] ?? ""}
                report={report}
              />
            ) : null}
          </div>
        </Section>

        <Section title="Definidos em contêineres (Tarefa)" count={taskDefinitions.length}>
          {taskDefinitions.length === 0 ? (
            <EmptyState
              title="Nenhuma Definição de Campo de Tarefa."
              hint="Uma Definição de Tarefa nasce em um Espaço, Pasta ou Lista e alcança tudo abaixo dele."
            />
          ) : (
            renderTable(taskDefinitions, true)
          )}
        </Section>

        <Section title="Definidos no Espaço de Trabalho (CRM)" count={crmDefinitions.length}>
          {crmDefinitions.length === 0 ? (
            <EmptyState
              title="Nenhuma Definição de Campo de CRM."
              hint="Uma Definição de CRM vale para toda a família no Espaço de Trabalho, sem contêiner."
            />
          ) : (
            renderTable(crmDefinitions, false)
          )}
        </Section>
      </div>
    </>
  );
}
