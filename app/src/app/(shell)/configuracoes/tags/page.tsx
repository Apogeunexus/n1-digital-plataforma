"use client";

/**
 * T44 — Tags.
 *
 * The Tag is workspace vocabulary: the same Tag crosses Tasks, Contacts,
 * Companies, Deals and Conversations. The usage count is what makes archiving
 * a decision instead of a guess, so it is computed and shown per family.
 */

import Link from "next/link";
import { useState } from "react";
import { useData } from "@/data/store";
import { EmptyState, PageHeader, Section, StateSeal } from "@/features/shell/ui";

const TARGET_LABEL: Record<string, string> = {
  task: "Tarefas",
  contact: "Contatos",
  company: "Empresas",
  deal: "Negócios",
  conversation: "Conversas",
};

export default function TagsPage() {
  const state = useData((data) => data);
  const [includeArchived, setIncludeArchived] = useState(false);

  const tags = state.tags.filter((tag) => includeArchived || tag.lifecycle === "ativo");
  const archivedCount = state.tags.filter((tag) => tag.lifecycle !== "ativo").length;

  const usageOf = (tagId: string) => ({
    task: state.tasks.filter((task) => task.tagIds.includes(tagId)).length,
    contact: state.contacts.filter((contact) => contact.tagIds.includes(tagId)).length,
    company: state.companies.filter((company) => company.tagIds.includes(tagId)).length,
    deal: state.deals.filter((deal) => deal.tagIds.includes(tagId)).length,
    conversation: state.conversations.filter((conversation) => conversation.tagIds.includes(tagId)).length,
  });

  return (
    <>
      <PageHeader
        path={
          <Link href="/configuracoes" className="hover:underline">
            Configurações
          </Link>
        }
        title="Tags"
        meta="Vocabulário do Espaço de Trabalho: a mesma Tag atravessa Tarefas, Contatos, Empresas, Negócios e Conversas."
        actions={
          archivedCount > 0 ? (
            <label className="flex items-center gap-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(event) => setIncludeArchived(event.target.checked)}
                className="size-4"
              />
              Mostrar arquivadas ({archivedCount})
            </label>
          ) : null
        }
      />

      <div className="p-6">
        {tags.length === 0 ? (
          <EmptyState
            title="Nenhuma Tag."
            hint="Uma Tag nasce quando um vocabulário se repete: crie a primeira ao aplicá-la a um registro."
          />
        ) : (
          <Section title="Tags" count={tags.length}>
            <div className="overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
              <table className="w-full text-[length:var(--texto-base)]">
                <thead className="border-b border-[var(--cor-traco)] bg-[var(--cor-superficie-2)] text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Tag</th>
                    <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Aplica-se a</th>
                    <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Em uso</th>
                    <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cor-traco)]">
                  {tags.map((tag) => {
                    const usage = usageOf(tag.id);
                    const total = Object.values(usage).reduce((sum, count) => sum + count, 0);
                    return (
                      <tr key={tag.id} className="hover:bg-[var(--cor-superficie-2)]">
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-2">
                            <span
                              aria-hidden="true"
                              className="size-3 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="font-medium text-[var(--cor-tinta)]">{tag.name}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[var(--cor-tinta)]">
                          {tag.appliesTo === undefined
                            ? "todas as famílias"
                            : tag.appliesTo.map((target) => TARGET_LABEL[target] ?? target).join(", ")}
                        </td>
                        <td className="px-3 py-2 text-[var(--cor-tinta)]">
                          {total === 0 ? (
                            <span className="text-[var(--cor-tinta-fraca)]">em nenhum registro</span>
                          ) : (
                            Object.entries(usage)
                              .filter(([, count]) => count > 0)
                              .map(([target, count]) => `${count} ${TARGET_LABEL[target] ?? target}`)
                              .join(" · ")
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {tag.lifecycle === "ativo" ? (
                            <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">ativo</span>
                          ) : (
                            <StateSeal state={tag.lifecycle} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
              Arquivar uma Tag em uso não a retira dos registros: ela deixa de ser oferecida em novas
              atribuições e continua legível onde já está.
            </p>
          </Section>
        )}
      </div>
    </>
  );
}
