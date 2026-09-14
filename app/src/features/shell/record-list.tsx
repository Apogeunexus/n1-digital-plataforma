"use client";

/**
 * Generic listing used by the index routes. Every column is an attribute the
 * ontology defines; nothing is invented here.
 *
 * §15 dos padrões — a collection that grows carries ordering and pagination;
 * a silent `slice` that hides rows is a defect, so the count is always stated.
 */

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { EmptyState } from "./ui";

export interface Column<T> {
  readonly key: string;
  readonly label: string;
  readonly render: (item: T) => ReactNode;
  readonly className?: string;
}

const PAGE_SIZE = 25;

export function RecordList<T extends { readonly id: string }>({
  items,
  columns,
  hrefOf,
  emptyTitle,
  emptyHint,
  emptyAction,
}: {
  readonly items: readonly T[];
  readonly columns: ReadonlyArray<Column<T>>;
  readonly hrefOf?: (item: T) => string;
  readonly emptyTitle: string;
  readonly emptyHint?: string;
  readonly emptyAction?: ReactNode;
}) {
  const [shown, setShown] = useState(PAGE_SIZE);

  if (items.length === 0) {
    return <EmptyState title={emptyTitle} {...(emptyHint ? { hint: emptyHint } : {})} {...(emptyAction ? { action: emptyAction } : {})} />;
  }

  const visible = items.slice(0, shown);

  return (
    <div className="overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
      <div className="overflow-x-auto">
        <table className="w-full text-[length:var(--texto-base)]">
          <thead className="border-b border-[var(--cor-traco)] bg-[var(--cor-superficie-2)] text-left">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={`px-3 py-2 font-medium text-[var(--cor-tinta-fraca)] ${column.className ?? ""}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--cor-traco)]">
            {visible.map((item) => (
              <tr key={item.id} className="hover:bg-[var(--cor-superficie-2)]">
                {columns.map((column, index) => (
                  <td key={column.key} className={`px-3 py-2 align-top ${column.className ?? ""}`}>
                    {index === 0 && hrefOf ? (
                      <Link href={hrefOf(item)} className="font-medium text-[var(--cor-tinta)] hover:underline">
                        {column.render(item)}
                      </Link>
                    ) : (
                      column.render(item)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--cor-traco)] bg-[var(--cor-superficie-2)] px-3 py-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
        <span>
          Mostrando {visible.length} de {items.length}
        </span>
        {shown < items.length ? (
          <button
            type="button"
            onClick={() => setShown((value) => value + PAGE_SIZE)}
            className="rounded px-2 py-1 font-medium text-[var(--cor-tinta)] hover:bg-[var(--cor-traco)]"
          >
            Mostrar mais
          </button>
        ) : null}
      </div>
    </div>
  );
}
