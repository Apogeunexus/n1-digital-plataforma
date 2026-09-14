"use client";

/**
 * Screen-level primitives — the pieces every screen composes but that are NOT
 * part of the design system: a page header, a section, a card.
 *
 * Everything that IS design-system lives in `@/design/components` and is
 * re-exported here so the 52 screens keep one import path. The re-export is the
 * migration: replacing the Fase 3 stand-ins with the real components changed
 * nothing at the call sites.
 *
 * Every colour reads a token. A literal Tailwind colour would work in the light
 * theme and break in the dark one with no error at all.
 */

import type { ReactNode } from "react";

export {
  ActionMenu,
  ActivityTimeline,
  ActorAvatar,
  Board,
  BoardColumn,
  Button,
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  Chip,
  ConditionMarker,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Field,
  MultiSelect,
  NoAccessState,
  RichText,
  Select,
  SidePanel,
  StateSeal,
  SettingRow,
  StatusPicker,
  TextArea,
  TextInput,
  RecordPanel,
  RecordRow,
  Toast,
  Toggle,
} from "@/design/components";
export type {
  ActivityEntry,
  ActorKind,
  ButtonVariant,
  Column,
  Option,
  StatusCategory,
  ToastTone,
} from "@/design/components";

export function PageHeader({
  path,
  title,
  icon,
  seal,
  meta,
  actions,
  details,
}: {
  readonly path?: ReactNode;
  readonly title: string;
  /** Selo à esquerda do título, para a tela se reconhecer de longe. */
  readonly icon?: ReactNode;
  readonly seal?: ReactNode;
  readonly meta?: ReactNode;
  readonly actions?: ReactNode;
  /** Faixa de atributos abaixo do título, na largura toda do cabeçalho. */
  readonly details?: ReactNode;
}) {
  return (
    <header className="border-b border-[var(--cor-traco)] bg-[var(--cor-superficie)] px-6 py-4">
      {path ? (
        <nav className="mb-1 text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">{path}</nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {icon}
          <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[length:var(--texto-lg)] font-[var(--peso-forte)]">{title}</h1>
            {seal}
          </div>
          {meta ? (
            <div className="mt-1 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">{meta}</div>
          ) : null}
          </div>
        </div>
        {actions ? <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {details ? <div className="mt-3">{details}</div> : null}
    </header>
  );
}

export function Section({
  title,
  count,
  children,
  action,
}: {
  readonly title: string;
  readonly count?: number;
  readonly children: ReactNode;
  readonly action?: ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-[length:var(--texto-base)] font-[var(--peso-forte)]">
          {title}
          {count !== undefined ? (
            <span className="ml-1 font-[var(--peso-normal)] text-[var(--cor-tinta-fraca)]">({count})</span>
          ) : null}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Card({ children }: { readonly children: ReactNode }) {
  // No shadow: a card in a list does not float. Shadow means real elevation —
  // side panel, dialog, menu.
  return (
    <div className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-3">
      {children}
    </div>
  );
}

/** A category always carries a label besides the colour (ui-ptbr.md). */
export function CategoryDot({ color, label }: { readonly color: string; readonly label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[length:var(--texto-base)]">
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
