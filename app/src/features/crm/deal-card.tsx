"use client";

/**
 * O card de Negócio do quadro de `/crm/negocios`, e o que ele lê do Negócio
 * (rosto, empresa, temperatura, origem, dono). É o mesmo card nas Listas de
 * "Meus negócios": lá a Tarefa espelha um Negócio, e o card abre a Tarefa.
 */

import Link from "next/link";
import { Briefcase, Flame, Link2, User as UserIcon, Wallet } from "lucide-react";
import { contactDisplayName, effectiveProbability } from "@/data/derive";
import type { DataState } from "@/data/state";
import type { Contact, Deal } from "@/data/types";
import { ContactAvatar } from "@/features/crm/contact-card";
import { ActorAvatar, StateSeal } from "@/features/shell/ui";
import { useFormat } from "@/features/shell/use-format";

export interface DealCardData {
  readonly deal: Deal;
  readonly probability: number;
  readonly ownerName: string;
  readonly ownerPhotoFileId?: string;
  readonly companyName?: string;
  readonly contact?: Contact;
  readonly temperature?: { readonly name: string; readonly color?: string };
  readonly originName?: string;
}

/** Tudo o que o card mostra, lido uma vez do estado. */
export function dealCardData(state: DataState, deal: Deal): DealCardData {
  const dono = state.members.find((m) => m.id === deal.ownerMemberId);
  const vinculo = deal.contactLinks.find((l) => l.principal) ?? deal.contactLinks[0];
  const contact = vinculo ? state.contacts.find((c) => c.id === vinculo.contactId) : undefined;
  const temperatura = state.catalog.find((c) => c.id === contact?.temperatureId);
  const origem = state.catalog.find((c) => c.id === deal.originId)?.name;
  const companyName = state.companies.find((c) => c.id === deal.companyId)?.tradeName;
  return {
    deal,
    probability: effectiveProbability(state, deal),
    ownerName: dono?.displayName ?? "—",
    ...(dono?.photoFileId ? { ownerPhotoFileId: dono.photoFileId } : {}),
    ...(companyName ? { companyName } : {}),
    ...(contact ? { contact } : {}),
    ...(temperatura ? { temperature: { name: temperatura.name, ...(temperatura.color ? { color: temperatura.color } : {}) } } : {}),
    ...(origem ? { originName: origem } : {}),
  };
}

export function DealCard({
  data,
  href,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  readonly data: DealCardData;
  readonly href: string;
  /** Quando dado, o clique abre aqui (painel) em vez de navegar; o `href` fica para o meio-clique e o leitor de tela. */
  readonly onOpen?: () => void;
  readonly onDragStart: () => void;
  readonly onDragEnd: () => void;
}) {
  const fmt = useFormat();
  const { deal, probability, ownerName, ownerPhotoFileId, companyName, contact, temperature, originName } = data;
  return (
    <Link
      href={href}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      {...(onOpen
        ? {
            onClick: (event: React.MouseEvent) => {
              if (event.metaKey || event.ctrlKey || event.button !== 0) return;
              event.preventDefault();
              onOpen();
            },
          }
        : {})}
      className="card-negocio block cursor-grab rounded-[var(--raio-superficie)] p-3 active:cursor-grabbing"
    >
      {/*
        O rosto primeiro, depois o que a pessoa é para o Negócio, depois o
        dinheiro, depois quem responde. Cada bloco é separado por linha porque
        são perguntas diferentes: quem é, o quê, quanto, com quem.
      */}
      <div className="flex items-start gap-2.5">
        {contact ? <ContactAvatar contact={contact} size="grande" /> : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[length:var(--texto-lg)] font-[var(--peso-forte)] text-[var(--cor-tinta)]">
            {contact ? contactDisplayName(contact) : deal.title}
          </p>
          {companyName ? (
            <p className="truncate text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
              {companyName}
            </p>
          ) : null}
        </div>
        <StateSeal state={deal.lifecycle} />
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-2">
        {deal.object ? (
          <span className="flex items-center gap-1.5 rounded-[var(--raio-controle)] border border-[var(--cor-traco)] px-2 py-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta)]">
            <Briefcase className="size-3.5 shrink-0 text-[var(--cor-acento)]" aria-hidden="true" />
            {deal.object}
          </span>
        ) : null}
        {temperature ? (
          <span
            className="flex items-center gap-1.5 rounded-[var(--raio-controle)] px-2 py-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta)]"
            style={{
              background: `color-mix(in srgb, ${temperature.color ?? "var(--cor-traco)"} 18%, transparent)`,
              boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${temperature.color ?? "var(--cor-traco)"} 45%, transparent)`,
            }}
          >
            <Flame
              className="size-3.5 shrink-0"
              style={{ color: temperature.color ?? "var(--cor-tinta-fraca)" }}
              aria-hidden="true"
            />
            {temperature.name}
          </span>
        ) : null}
      </p>

      <div className="mt-3 flex items-center gap-2.5 border-t border-[var(--cor-traco)] pt-3">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-[var(--raio-controle)] bg-[var(--cor-superficie-2)] text-[var(--cor-acento)]"
        >
          <Wallet className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
            Valor do negócio
          </span>
          <span className="block truncate text-[length:var(--texto-base)] font-[var(--peso-forte)] text-[var(--cor-tinta)]">
            {deal.value ? fmt.money(deal.value) : "sem valor declarado"}
            <span className="ml-1.5 font-normal text-[var(--cor-tinta-fraca)]">{probability}%</span>
          </span>
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--cor-traco)] pt-3">
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
            <UserIcon className="size-3.5 shrink-0" aria-hidden="true" />
            Proprietário
          </span>
          <span className="mt-1 flex items-center gap-1.5">
            <ActorAvatar
              kind="member"
              name={ownerName}
              {...(ownerPhotoFileId ? { photoFileId: ownerPhotoFileId } : {})}
            />
            <span className="min-w-0 truncate text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
              {ownerName}
            </span>
          </span>
        </span>
        <span className="min-w-0 border-l border-[var(--cor-traco)] pl-2">
          <span className="flex items-center gap-1.5 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
            <Link2 className="size-3.5 shrink-0" aria-hidden="true" />
            Origem
          </span>
          <span className="mt-1 block truncate text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
            {originName ?? "—"}
          </span>
        </span>
      </div>
    </Link>
  );
}
