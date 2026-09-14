"use client";

/**
 * T22 — Configurações da Caixa de Entrada.
 *
 * B11 — there is exactly one Inbox per workspace. This screen configures IT,
 * plus the Channels and Queues that feed it; it never creates a second inbox.
 */

import Link from "next/link";
import { useData } from "@/data/store";
import { CHANNEL_CAPABILITIES } from "@/data/operations";
import { CHANNEL_TYPE_LABEL } from "@/features/shell/format";
import { EmptyState, PageHeader, Section, StateSeal } from "@/features/shell/ui";

const DISTRIBUTION_LABEL: Record<string, string> = {
  herdarDaCaixa: "herda da Caixa",
  manual: "manual",
  rodizio: "rodízio",
  menorCarga: "menor carga",
};

const CONNECTION_LABEL: Record<string, string> = {
  conectada: "conectada",
  desconectada: "desconectada",
  comErro: "com erro",
};

const WEEK_DAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export default function ConfiguracoesDaCaixaPage() {
  const state = useData((data) => data);
  const { inbox, channels, queues } = state;
  const owner = state.members.find((m) => m.id === inbox.defaultContactOwnerMemberId);

  return (
    <>
      <PageHeader
        path={
          <Link href="/crm/caixa-de-entrada" className="hover:underline">
            Caixa de Entrada
          </Link>
        }
        title="Configurações da Caixa de Entrada"
        meta="Uma única Caixa por Espaço de Trabalho: Canais e Filas são recortes dela, não caixas separadas."
      />

      <div className="p-6">
        <Section title="Caixa">
          <dl className="grid gap-3 rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4 text-[length:var(--texto-base)] sm:grid-cols-2">
            <Row label="Prazo de reabertura">
              {inbox.reopenWindowHours}h — uma Mensagem recebida dentro dela reabre a mesma Conversa; fora,
              cria uma nova.
            </Row>
            <Row label="Distribuição padrão">{DISTRIBUTION_LABEL[inbox.defaultDistribution]}</Row>
            <Row label="Proprietário padrão de Contato">{owner?.displayName ?? "não definido"}</Row>
            <Row label="Horário de atendimento">
              {inbox.businessHours ? formatHours(inbox.businessHours.days) : "sem horário definido"}
            </Row>
          </dl>
        </Section>

        <Section title="Canais" count={channels.length}>
          {channels.length === 0 ? (
            <EmptyState
              title="Nenhum Canal configurado."
              hint="Sem Canal não há Conversa: é por ele que a Mensagem entra e sai."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {channels.map((channel) => {
                const capabilities = CHANNEL_CAPABILITIES[channel.channelType];
                const queue = queues.find((q) => q.id === channel.defaultQueueId);
                const approved = channel.messageTemplates.filter((t) => t.approval === "aprovado").length;
                return (
                  <li key={channel.id}>
                    <Link
                      href={`/crm/caixa-de-entrada/configuracoes/canais/${channel.id}`}
                      className="block rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4 hover:border-[var(--cor-traco-forte)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)]">{channel.name}</p>
                        <StateSeal state={channel.lifecycle} />
                      </div>
                      <p className="mt-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        {CHANNEL_TYPE_LABEL[channel.channelType] ?? channel.channelType} ·{" "}
                        <span className={channel.connection === "conectada" ? "" : "text-[var(--cor-atencao-texto)]"}>
                          {CONNECTION_LABEL[channel.connection]}
                        </span>
                      </p>
                      <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        janela de{" "}
                        {capabilities.responseWindowHours === undefined
                          ? "resposta: nenhuma"
                          : `${capabilities.responseWindowHours}h`}{" "}
                        · {approved} modelo(s) aprovado(s) · fila {queue?.name ?? "nenhuma"}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Filas" count={queues.length}>
          {queues.length === 0 ? (
            <EmptyState
              title="Nenhuma Fila."
              hint="A Fila é a única origem de permissão por referência operacional: sem ela, o acesso vem só do Papel."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {queues.map((queue) => {
                const eligible = queue.eligibleMemberIds.length;
                const teams = queue.eligibleTeamIds.length;
                const load = state.conversations.filter(
                  (conversation) => conversation.queueId === queue.id && conversation.lifecycle === "ativo",
                ).length;
                return (
                  <li key={queue.id}>
                    <Link
                      href={`/crm/caixa-de-entrada/configuracoes/filas/${queue.id}`}
                      className="block rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4 hover:border-[var(--cor-traco-forte)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)]">{queue.name}</p>
                        <StateSeal state={queue.lifecycle} />
                      </div>
                      {queue.description ? (
                        <p className="mt-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">{queue.description}</p>
                      ) : null}
                      <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        distribuição {DISTRIBUTION_LABEL[queue.distribution]} · {eligible} Membro(s) e {teams}{" "}
                        Equipe(s) elegíveis · {load} Conversa(s)
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}

function Row({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">{label}</dt>
      <dd className="mt-0.5 text-[var(--cor-tinta)]">{children}</dd>
    </div>
  );
}

function formatHours(
  days: ReadonlyArray<{ readonly weekDay: number; readonly from: string; readonly to: string }>,
): string {
  if (days.length === 0) return "sem horário definido";
  return days.map((day) => `${WEEK_DAYS[day.weekDay]} ${day.from}–${day.to}`).join(", ");
}
