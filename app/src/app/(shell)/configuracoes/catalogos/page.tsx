"use client";

/**
 * T46 — Catálogos.
 *
 * B34 — the catalogues are instantiated with the workspace and remain editable.
 * B54 — only a `finalidadeConsentimento` carries "exige consentimento para
 * enviar", and that flag is what makes a send be refused, so it is shown as a
 * consequence and not as a checkbox label.
 */

import Link from "next/link";
import { useData } from "@/data/store";
import { EmptyState, PageHeader, Section, StateSeal } from "@/features/shell/ui";
import type { CatalogItem } from "@/data/types";

const KINDS: ReadonlyArray<{
  readonly kind: CatalogItem["kind"];
  readonly title: string;
  readonly description: string;
}> = [
  {
    kind: "origem",
    title: "Origens",
    description: "De onde o Contato ou o Negócio veio. O Canal pode definir uma Origem padrão.",
  },
  {
    kind: "qualificacao",
    title: "Qualificações",
    description: "Como o Contato foi classificado pela equipe.",
  },
  {
    kind: "finalidadeConsentimento",
    title: "Finalidades de Consentimento",
    description: "Para que o Contato autorizou ser contatado. Uma finalidade pode exigir consentimento antes do envio.",
  },
  {
    kind: "motivoPerda",
    title: "Motivos de Perda",
    description: "Por que um Negócio foi perdido. Um Funil pode exigir um deles ao encerrar.",
  },
  {
    kind: "motivoGanho",
    title: "Motivos de Ganho",
    description: "Por que um Negócio foi ganho.",
  },
];

export default function CatalogosPage() {
  const state = useData((data) => data);

  const usageOf = (item: CatalogItem): string => {
    if (item.kind === "origem") {
      const contacts = state.contacts.filter((contact) => contact.originId === item.id).length;
      const deals = state.deals.filter((deal) => deal.originId === item.id).length;
      return contacts + deals === 0 ? "em nenhum registro" : `${contacts} Contato(s) · ${deals} Negócio(s)`;
    }
    if (item.kind === "qualificacao") {
      const contacts = state.contacts.filter((contact) => contact.qualificationId === item.id).length;
      return contacts === 0 ? "em nenhum Contato" : `${contacts} Contato(s)`;
    }
    if (item.kind === "finalidadeConsentimento") {
      const contacts = state.contacts.filter((contact) =>
        contact.consents.some((consent) => consent.purposeId === item.id),
      ).length;
      return contacts === 0 ? "sem Consentimento registrado" : `${contacts} Contato(s) com registro`;
    }
    const key = item.kind === "motivoPerda" ? "lossReasonId" : "winReasonId";
    const deals = state.deals.filter((deal) => deal[key] === item.id).length;
    return deals === 0 ? "em nenhum Negócio" : `${deals} Negócio(s)`;
  };

  return (
    <>
      <PageHeader
        path={
          <Link href="/configuracoes" className="hover:underline">
            Configurações
          </Link>
        }
        title="Catálogos"
        meta="Listas com identidade própria do Espaço de Trabalho. Nascem com ele e continuam editáveis."
      />

      <div className="p-6">
        {KINDS.map((group) => {
          const items = state.catalog
            .filter((item) => item.kind === group.kind)
            .sort((a, b) => a.order - b.order);
          return (
            <Section key={group.kind} title={group.title} count={items.length}>
              <p className="mb-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">{group.description}</p>
              {items.length === 0 ? (
                <EmptyState title={`Nenhum item em ${group.title}.`} />
              ) : (
                <ul className="divide-y divide-[var(--cor-traco)] overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2">
                      <span className="flex min-w-0 items-center gap-2">
                        {item.color ? (
                          <span
                            aria-hidden="true"
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                        ) : null}
                        <span className="truncate text-[length:var(--texto-base)] text-[var(--cor-tinta)]">{item.name}</span>
                        {item.seeded ? (
                          <span className="shrink-0 rounded bg-[var(--cor-superficie-2)] px-1.5 py-0.5 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                            veio com o Espaço
                          </span>
                        ) : null}
                        {item.requiresConsentToSend ? (
                          <span className="shrink-0 rounded bg-[var(--cor-atencao-fraco)] px-1.5 py-0.5 text-[length:var(--texto-sm)] text-[var(--cor-atencao-texto)]">
                            sem consentimento, o envio é recusado
                          </span>
                        ) : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-3 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        {usageOf(item)}
                        {item.lifecycle === "ativo" ? null : <StateSeal state={item.lifecycle} />}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          );
        })}
      </div>
    </>
  );
}
