"use client";

/**
 * T24 — Fila.
 *
 * B70 — being eligible for a Queue is the only origin of permission by
 * operational reference: it grants `ver` over the Conversations that pass
 * through it, and over nothing else. The screen states that in words, because
 * a list of names does not say what the names can do.
 */

import Link from "next/link";
import { use } from "react";
import { useData } from "@/data/store";
import { contactDisplayName } from "@/data/derive";
import { AVAILABILITY_LABEL, CHANNEL_TYPE_LABEL, CONVERSATION_STATE_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import { EmptyState, PageHeader, Section, StateSeal } from "@/features/shell/ui";

const DISTRIBUTION_LABEL: Record<string, string> = {
  herdarDaCaixa: "herda da Caixa de Entrada",
  manual: "manual",
  rodizio: "rodízio",
  menorCarga: "menor carga",
};

const WEEK_DAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];


export default function FilaPage({ params }: { params: Promise<{ fila: string }> }) {
  const { fila } = use(params);
  const state = useData((data) => data);
  const fmt = useFormat();
  const queue = state.queues.find((q) => q.id === fila);

  if (!queue) {
    return (
      <>
        <PageHeader title="Fila não encontrada" />
        <div className="p-6">
          <EmptyState title="Fila não encontrada." hint="Ela pode ter sido removida do Espaço de Trabalho." />
        </div>
      </>
    );
  }

  const conversations = state.conversations.filter(
    (conversation) => conversation.queueId === queue.id && conversation.lifecycle === "ativo",
  );
  const teamMemberIds = new Set(
    queue.eligibleTeamIds.flatMap(
      (teamId) => state.teams.find((team) => team.id === teamId)?.memberIds ?? [],
    ),
  );
  const eligibleMemberIds = new Set([...queue.eligibleMemberIds, ...teamMemberIds]);
  const channels = state.channels.filter((channel) => channel.defaultQueueId === queue.id);
  const owner = state.members.find((m) => m.id === queue.defaultContactOwnerMemberId);

  const loadOf = (memberId: string): number =>
    conversations.filter(
      (conversation) => conversation.assignee?.kind === "member" && conversation.assignee.id === memberId,
    ).length;

  return (
    <>
      <PageHeader
        path={
          <>
            <Link href="/crm/caixa-de-entrada" className="hover:underline">
              Caixa de Entrada
            </Link>
            {" › "}
            <Link href="/crm/caixa-de-entrada/configuracoes" className="hover:underline">
              Configurações
            </Link>
          </>
        }
        title={queue.name}
        seal={<StateSeal state={queue.lifecycle} />}
        meta={
          <span className="flex flex-wrap items-center gap-3">
            <span>distribuição {DISTRIBUTION_LABEL[queue.distribution]}</span>
            <span>{conversations.length} Conversa(s) ativa(s)</span>
            <span>{eligibleMemberIds.size} Membro(s) elegível(is)</span>
          </span>
        }
      />

      <div className="p-6">
        {queue.description ? <p className="mb-6 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">{queue.description}</p> : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Section title="Elegíveis" count={eligibleMemberIds.size}>
              <p className="mb-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                Ser elegível concede ver as Conversas que passam por esta Fila — e nada além disso.
              </p>
              {eligibleMemberIds.size === 0 ? (
                <EmptyState
                  title="Nenhum Membro elegível."
                  hint="Sem elegíveis, esta Fila não distribui: as Conversas ficam sem Atribuído."
                />
              ) : (
                <ul className="divide-y divide-[var(--cor-traco)] overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
                  {[...eligibleMemberIds].map((memberId) => {
                    const member = state.members.find((m) => m.id === memberId);
                    if (!member) return null;
                    const viaTeam = teamMemberIds.has(memberId);
                    const direct = queue.eligibleMemberIds.includes(memberId);
                    return (
                      <li key={memberId} className="flex items-center justify-between gap-3 px-4 py-2">
                        <div className="min-w-0">
                          <Link
                            href={`/configuracoes/membros/${member.id}`}
                            className="text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)] hover:underline"
                          >
                            {member.displayName}
                          </Link>
                          <p className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                            {direct ? "elegível diretamente" : ""}
                            {direct && viaTeam ? " · " : ""}
                            {viaTeam ? "elegível por Equipe" : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                          <p>{AVAILABILITY_LABEL[member.availability.value] ?? member.availability.value}</p>
                          <p>
                            {loadOf(memberId)}
                            {queue.maxConversationsPerAttendant !== undefined
                              ? ` de ${queue.maxConversationsPerAttendant}`
                              : ""}{" "}
                            Conversa(s)
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            <Section title="Conversas na Fila" count={conversations.length}>
              {conversations.length === 0 ? (
                <EmptyState title="Nenhuma Conversa ativa nesta Fila." />
              ) : (
                <ul className="divide-y divide-[var(--cor-traco)] overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
                  {conversations.slice(0, 20).map((conversation) => {
                    const contact = conversation.contactId
                      ? state.contacts.find((c) => c.id === conversation.contactId)
                      : undefined;
                    const assignee =
                      conversation.assignee?.kind === "member"
                        ? state.members.find((m) => m.id === conversation.assignee?.id)?.displayName
                        : conversation.assignee?.kind === "agent"
                          ? state.agents.find((a) => a.id === conversation.assignee?.id)?.name
                          : undefined;
                    const last = [...conversation.messages]
                      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                      .at(-1);
                    return (
                      <li key={conversation.id}>
                        <Link
                          href={`/crm/caixa-de-entrada/${conversation.id}`}
                          className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-[var(--cor-superficie-2)]"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                              {contact ? contactDisplayName(contact) : "Contato não resolvido"}
                            </span>
                            <span className="block truncate text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                              {conversation.title}
                            </span>
                          </span>
                          <span className="shrink-0 text-right text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                            <span className="block">{CONVERSATION_STATE_LABEL[conversation.state]}</span>
                            <span className="block">{assignee ?? "sem Atribuído"}</span>
                            {last ? <span className="block">{fmt.relative(last.createdAt)}</span> : null}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              {conversations.length > 20 ? (
                <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                  Mostrando 20 de {conversations.length}. Use os filtros da Caixa de Entrada para ver todas.
                </p>
              ) : null}
            </Section>
          </div>

          <aside>
            <Section title="Configuração">
              <dl className="space-y-2 rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4 text-[length:var(--texto-base)]">
                <Row label="Distribuição">{DISTRIBUTION_LABEL[queue.distribution]}</Row>
                <Row label="Limite por atendente">
                  {queue.maxConversationsPerAttendant ?? "sem limite"}
                </Row>
                <Row label="Proprietário padrão de Contato">{owner?.displayName ?? "não definido"}</Row>
                <Row label="Horário de atendimento">
                  {queue.businessHours
                    ? queue.businessHours.days
                        .map((day) => `${WEEK_DAYS[day.weekDay]} ${day.from}–${day.to}`)
                        .join(", ")
                    : "herda da Caixa de Entrada"}
                </Row>
              </dl>
            </Section>

            <Section title="Canais que entram aqui" count={channels.length}>
              {channels.length === 0 ? (
                <EmptyState title="Nenhum Canal usa esta Fila como padrão." />
              ) : (
                <ul className="space-y-1 text-[length:var(--texto-base)]">
                  {channels.map((channel) => (
                    <li key={channel.id}>
                      <Link
                        href={`/crm/caixa-de-entrada/configuracoes/canais/${channel.id}`}
                        className="text-[var(--cor-tinta)] hover:underline"
                      >
                        {channel.name}
                      </Link>
                      <span className="ml-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">({CHANNEL_TYPE_LABEL[channel.channelType] ?? channel.channelType})</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </aside>
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-[var(--cor-tinta-fraca)]">{label}</dt>
      <dd className="text-right text-[var(--cor-tinta)]">{children}</dd>
    </div>
  );
}
