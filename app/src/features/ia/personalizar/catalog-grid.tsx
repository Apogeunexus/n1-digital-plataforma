"use client";

/**
 * A grade de cartões das seções de Personalizar. Um cartão por registro:
 * ícone, nome, descrição, uma linha de fatos (chips) e a ação. Com busca no
 * topo, porque uma grade de trinta cartões sem filtro é uma tabela pior.
 */

import Link from "next/link";
import { Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import { EmptyState } from "@/features/shell/ui";

export interface CatalogFact {
  readonly label: string;
  readonly tone?: "neutro" | "ok" | "atencao" | "perigo" | "acento";
}

export interface CatalogItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly icon: ReactNode;
  readonly facts: readonly CatalogFact[];
  /** Selo no canto: o estado que muda como o cartão deve ser lido. */
  readonly badge?: CatalogFact;
  readonly actionLabel?: string;
}

const TONE: Record<NonNullable<CatalogFact["tone"]>, string> = {
  neutro: "bg-[var(--cor-superficie-2)] text-[var(--cor-tinta-fraca)]",
  ok: "bg-[var(--cor-sucesso-fraco)] text-[var(--cor-sucesso-texto)]",
  atencao: "bg-[var(--cor-atencao-fraco)] text-[var(--cor-atencao-texto)]",
  perigo: "bg-[var(--cor-perigo-fraco)] text-[var(--cor-perigo-texto)]",
  acento: "bg-[var(--cor-acento-fraco)] text-[var(--cor-acento)]",
};

export function CatalogGrid({
  title,
  intro,
  items,
  action,
  emptyTitle,
  emptyHint,
}: {
  readonly title: string;
  readonly intro: string;
  readonly items: readonly CatalogItem[];
  /** A ação principal da seção (criar, conectar…), à direita do título. */
  readonly action?: ReactNode;
  readonly emptyTitle: string;
  readonly emptyHint?: string;
}) {
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const visiveis = termo
    ? items.filter(
        (item) =>
          item.title.toLocaleLowerCase("pt-BR").includes(termo) ||
          item.description.toLocaleLowerCase("pt-BR").includes(termo) ||
          item.facts.some((f) => f.label.toLocaleLowerCase("pt-BR").includes(termo)),
      )
    : items;

  return (
    <div className="mx-auto w-full max-w-[72rem] px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[length:var(--texto-lg)] font-[var(--peso-forte)] text-[var(--cor-tinta)]">{title}</h1>
          <p className="mt-1 max-w-[60ch] text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">{intro}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative block">
            <span className="sr-only">Buscar em {title}</span>
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--cor-tinta-fraca)]"
              aria-hidden="true"
            />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar"
              className="h-[var(--altura-controle)] w-56 rounded-full border border-[var(--cor-traco)] bg-[var(--cor-superficie)] pl-8 pr-3 text-[length:var(--texto-base)] text-[var(--cor-tinta)] outline-none placeholder:text-[var(--cor-tinta-fraca)] focus:border-[var(--cor-acento)]"
            />
          </label>
          {action}
        </div>
      </div>

      {visiveis.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={termo ? `Nada em ${title} para “${busca.trim()}”.` : emptyTitle}
            {...(termo ? { hint: "Tente outro termo." } : emptyHint ? { hint: emptyHint } : {})}
          />
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((item) => (
            <li key={item.id} className="min-w-0">
              <Link
                href={item.href}
                className="group flex h-full flex-col gap-3 rounded-[14px] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4 transition-colors hover:border-[var(--cor-traco-forte)] hover:bg-[var(--cor-superficie-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--cor-acento)]"
              >
                <span className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-[var(--cor-superficie-2)] text-[var(--cor-acento)]">
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[length:var(--texto-base)] font-[var(--peso-medio)] text-[var(--cor-tinta)]">
                      {item.title}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[length:var(--texto-sm)] leading-snug text-[var(--cor-tinta-fraca)]">
                      {item.description || "Sem descrição."}
                    </span>
                  </span>
                  {item.badge ? (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[length:var(--texto-xs)] ${TONE[item.badge.tone ?? "neutro"]}`}>
                      {item.badge.label}
                    </span>
                  ) : null}
                </span>
                <span className="mt-auto flex flex-wrap items-center gap-1.5">
                  {item.facts.map((fact) => (
                    <span
                      key={fact.label}
                      className={`rounded-full px-2 py-0.5 text-[length:var(--texto-xs)] ${TONE[fact.tone ?? "neutro"]}`}
                    >
                      {fact.label}
                    </span>
                  ))}
                  <span className="ml-auto text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)] group-hover:text-[var(--cor-acento)]">
                    {item.actionLabel ?? "Abrir"} →
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
