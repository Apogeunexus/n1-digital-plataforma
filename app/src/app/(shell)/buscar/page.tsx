"use client";

/**
 * T04 — Busca global. One field over every family, grouped by entity.
 *
 * The term lives in `?q=` (MAPA-DE-NAVEGACAO) so a search is shareable, comes
 * back on reload and lands in the browser history — three things a term kept in
 * component state loses.
 *
 * B103 — the search never reveals what a permission hides, and it never
 * confuses "nothing found" with "no access": a container the Member cannot see
 * simply does not enter the result set, and the screen says how many families
 * were searched so the absence is legible.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useData } from "@/data/store";
import { contactDisplayName } from "@/data/derive";
import { EmptyState, PageHeader, Section, StateSeal } from "@/features/shell/ui";

interface Hit {
  readonly id: string;
  readonly href: string;
  readonly title: string;
  readonly detail: string;
  readonly lifecycle: string;
}

const MIN_QUERY = 2;

export default function BuscarPage() {
  const state = useData((data) => data);
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  const [includeInactive, setIncludeInactive] = useState(false);

  const setQuery = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("q", value);
    else next.delete("q");
    router.replace(next.size > 0 ? `/buscar?${next}` : "/buscar", { scroll: false });
  };

  const term = query.trim().toLowerCase();
  const ready = term.length >= MIN_QUERY;

  const keep = (lifecycle: string): boolean => includeInactive || lifecycle === "ativo";
  const matches = (...fields: ReadonlyArray<string | undefined>): boolean =>
    fields.some((field) => field !== undefined && field.toLowerCase().includes(term));

  const groups: ReadonlyArray<{ readonly label: string; readonly hits: readonly Hit[] }> = !ready
    ? []
    : [
        {
          label: "Tarefas",
          hits: state.tasks
            .filter((task) => keep(task.lifecycle) && matches(task.title, task.readableId, task.description))
            .map((task) => ({
              id: task.id,
              href: `/estrutura/tarefas/${task.id}`,
              title: task.title,
              detail: state.lists.find((l) => l.id === task.listId)?.name ?? "",
              lifecycle: task.lifecycle,
            })),
        },
        {
          label: "Listas",
          hits: state.lists
            .filter((list) => keep(list.lifecycle) && matches(list.name, list.description))
            .map((list) => ({
              id: list.id,
              href: `/estrutura/listas/${list.id}`,
              title: list.name,
              detail: list.description ?? "",
              lifecycle: list.lifecycle,
            })),
        },
        {
          label: "Contatos",
          hits: state.contacts
            .filter(
              (contact) =>
                keep(contact.lifecycle) &&
                (matches(contact.firstName, contact.lastName) ||
                  contact.identifiers.some((identifier) => matches(identifier.displayValue))),
            )
            .map((contact) => ({
              id: contact.id,
              href: `/crm/contatos/${contact.id}`,
              title: contactDisplayName(contact),
              detail: contact.identifiers.map((identifier) => identifier.displayValue).join(" · "),
              lifecycle: contact.lifecycle,
            })),
        },
        {
          label: "Empresas",
          hits: state.companies
            .filter((company) => keep(company.lifecycle) && matches(company.legalName, company.tradeName))
            .map((company) => ({
              id: company.id,
              href: `/crm/empresas/${company.id}`,
              title: company.legalName,
              detail: company.tradeName ?? "",
              lifecycle: company.lifecycle,
            })),
        },
        {
          label: "Negócios",
          hits: state.deals
            .filter((deal) => keep(deal.lifecycle) && matches(deal.title, deal.readableId, deal.object))
            .map((deal) => ({
              id: deal.id,
              href: `/crm/negocios/${deal.id}`,
              title: deal.title,
              detail: state.funnels.find((f) => f.id === deal.funnelId)?.name ?? "",
              lifecycle: deal.lifecycle,
            })),
        },
        {
          label: "Conversas",
          hits: state.conversations
            .filter(
              (conversation) =>
                keep(conversation.lifecycle) &&
                (matches(conversation.title) ||
                  conversation.messages.some(
                    (message) => message.deletionMark === undefined && matches(message.content),
                  )),
            )
            .map((conversation) => ({
              id: conversation.id,
              href: `/crm/caixa-de-entrada/${conversation.id}`,
              title: conversation.title,
              detail: state.channels.find((c) => c.id === conversation.channelId)?.name ?? "",
              lifecycle: conversation.lifecycle,
            })),
        },
        {
          label: "Documentos",
          hits: state.documents
            .filter(
              (document) =>
                keep(document.lifecycle) && matches(document.title, document.metadata.summary),
            )
            .map((document) => ({
              id: document.id,
              href: `/ia/conhecimento/documentos/${document.id}`,
              title: document.title,
              detail: state.collections.find((c) => c.id === document.collectionId)?.name ?? "",
              lifecycle: document.lifecycle,
            })),
        },
        {
          label: "Agentes",
          hits: state.agents
            .filter((agent) => keep(agent.lifecycle) && matches(agent.name, agent.description))
            .map((agent) => ({
              id: agent.id,
              href: `/ia/agentes/${agent.id}`,
              title: agent.name,
              detail: agent.description ?? "",
              lifecycle: agent.lifecycle,
            })),
        },
        {
          label: "Automações",
          hits: state.automations
            .filter((automation) => keep(automation.lifecycle) && matches(automation.name))
            .map((automation) => ({
              id: automation.id,
              href: `/ia/automacoes/${automation.id}`,
              title: automation.name,
              detail: automation.description ?? "",
              lifecycle: automation.lifecycle,
            })),
        },
      ].filter((group) => group.hits.length > 0);

  const total = groups.reduce((sum, group) => sum + group.hits.length, 0);

  return (
    <>
      <PageHeader
        title="Buscar"
        meta="Uma busca sobre nove famílias. O que uma permissão esconde não aparece aqui."
      />

      <div className="p-6">
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <label className="min-w-64 flex-1">
            <span className="block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">Termo</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome, identificador legível, conteúdo"
              className="mt-1 w-full rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] px-3 py-2 text-[length:var(--texto-base)]"
            />
          </label>
          <label className="flex items-center gap-2 pb-2 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.target.checked)}
              className="size-4"
            />
            Incluir arquivados e na lixeira
          </label>
        </div>

        {!ready ? (
          <EmptyState
            title="Escreva ao menos duas letras."
            hint="A busca cobre Tarefas, Listas, Contatos, Empresas, Negócios, Conversas, Documentos, Agentes e Automações."
          />
        ) : total === 0 ? (
          <EmptyState
            title={`Nada encontrado para "${query.trim()}".`}
            hint={
              includeInactive
                ? "Nenhum registro visível para você corresponde a este termo."
                : "Registros arquivados e na lixeira estão fora desta busca. Marque a opção acima para incluí-los."
            }
          />
        ) : (
          <>
            <p className="mb-4 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
              {total} resultado(s) em {groups.length} família(s).
            </p>
            {groups.map((group) => (
              <Section key={group.label} title={group.label} count={group.hits.length}>
                <ul className="divide-y divide-[var(--cor-traco)] overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
                  {group.hits.slice(0, 10).map((hit) => (
                    <li key={hit.id}>
                      <Link
                        href={hit.href}
                        className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-[var(--cor-superficie-2)]"
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)]">{hit.title}</span>
                            <StateSeal state={hit.lifecycle} />
                          </span>
                          {hit.detail ? (
                            <span className="block truncate text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">{hit.detail}</span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {group.hits.length > 10 ? (
                  <p className="mt-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                    Mostrando 10 de {group.hits.length}. Refine o termo para ver o restante.
                  </p>
                ) : null}
              </Section>
            ))}
          </>
        )}
      </div>
    </>
  );
}
