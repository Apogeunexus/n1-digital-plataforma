"use client";

/**
 * T23 — Canal.
 *
 * Documento 14, 7.1 — the capabilities come from the CHANNEL TYPE and are shown
 * as read-only: neither this Channel nor a Conversation may redefine them
 * (RN-CXE-05). Everything editable below the fold is Channel configuration.
 */

import Link from "next/link";
import { use } from "react";
import { useData } from "@/data/store";
import { CHANNEL_CAPABILITIES } from "@/data/operations";
import { CHANNEL_TYPE_LABEL, IDENTIFIER_TYPE_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import { ConditionMarker, EmptyState, PageHeader, Section, StateSeal } from "@/features/shell/ui";

const APPROVAL_LABEL: Record<string, string> = {
  aprovado: "aprovado",
  pendente: "pendente",
  rejeitado: "rejeitado",
  pausado: "pausado",
};

export default function CanalPage({ params }: { params: Promise<{ canal: string }> }) {
  const { canal } = use(params);
  const state = useData((data) => data);
  const fmt = useFormat();
  const channel = state.channels.find((c) => c.id === canal);

  if (!channel) {
    return (
      <>
        <PageHeader title="Canal não encontrado" />
        <div className="p-6">
          <EmptyState title="Canal não encontrado." hint="Ele pode ter sido removido do Espaço de Trabalho." />
        </div>
      </>
    );
  }

  const capabilities = CHANNEL_CAPABILITIES[channel.channelType];
  const queue = state.queues.find((q) => q.id === channel.defaultQueueId);
  const configuredBy = state.members.find((m) => m.id === channel.configuredByMemberId);
  const contactOwner = state.members.find((m) => m.id === channel.defaultContactOwnerMemberId);
  const origin = state.catalog.find((item) => item.id === channel.defaultOriginId);
  const conversations = state.conversations.filter((c) => c.channelId === channel.id);

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
        title={channel.name}
        seal={<StateSeal state={channel.lifecycle} />}
        meta={
          <span className="flex flex-wrap items-center gap-3">
            <span>{CHANNEL_TYPE_LABEL[channel.channelType] ?? channel.channelType}</span>
            {channel.connection === "conectada" ? (
              <span>conectada</span>
            ) : (
              <ConditionMarker tone={channel.connection === "comErro" ? "danger" : "warning"}>
                {channel.connection === "comErro" ? "com erro" : "desconectada"}
              </ConditionMarker>
            )}
            <span>{conversations.length} Conversa(s)</span>
          </span>
        }
      />

      <div className="p-6">
        {channel.connection !== "conectada" ? (
          <p className="mb-6 rounded-[var(--raio-controle)] bg-[var(--cor-atencao-fraco)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-atencao-texto)]">
            Com o Canal {channel.connection === "comErro" ? "com erro" : "desconectado"}, uma Mensagem
            enviada fica registrada como pendente até a conexão voltar. Nada é descartado em silêncio.
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Configuração">
            <dl className="space-y-2 rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4 text-[length:var(--texto-base)]">
              <Row label="Identificador externo">
                <span className="font-mono text-[length:var(--texto-sm)]">{channel.externalId}</span>
              </Row>
              <Row label="Configurado por">{configuredBy?.displayName ?? "não encontrado"}</Row>
              <Row label="Fila padrão">
                {queue ? (
                  <Link href={`/crm/caixa-de-entrada/configuracoes/filas/${queue.id}`} className="hover:underline">
                    {queue.name}
                  </Link>
                ) : (
                  "nenhuma"
                )}
              </Row>
              <Row label="Proprietário padrão de Contato">{contactOwner?.displayName ?? "não definido"}</Row>
              <Row label="Origem padrão">{origin?.name ?? "não definida"}</Row>
              <Row label="Grupos">{channel.groupsEnabled ? "habilitados" : "desabilitados"}</Row>
            </dl>
            <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
              Configurar o Canal é rastreabilidade, não governança: o Canal não tem Proprietário.
            </p>
          </Section>

          <Section title="Capacidades do tipo de Canal">
            <dl className="space-y-2 rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie-2)] p-4 text-[length:var(--texto-base)]">
              <Row label="Janela de resposta">
                {capabilities.responseWindowHours === undefined
                  ? "sem janela"
                  : `${capabilities.responseWindowHours}h`}
              </Row>
              <Row label="Fora da janela">
                {capabilities.requiresTemplateOutsideWindow
                  ? "só Mensagem de modelo aprovada"
                  : "envio livre"}
              </Row>
              <Row label="Resolve identificadores">
                {capabilities.resolvesIdentifierTypes
                  .map((type) => IDENTIFIER_TYPE_LABEL[type] ?? type)
                  .join(", ")}
              </Row>
              <Row label="Assunto e cópias">{capabilities.hasSubjectAndCopies ? "sim" : "não"}</Row>
              <Row label="Status de entrega reportados">
                {capabilities.reportedDeliveryStatuses.join(", ")}
              </Row>
              <Row label="Remetente externo edita">{capabilities.externalSenderMayEdit ? "sim" : "não"}</Row>
              <Row label="Reações">{capabilities.reactions ? "sim" : "não"}</Row>
              <Row label="Grupos">{capabilities.groups ? "sim" : "não"}</Row>
              <Row label="Identidade anônima">{capabilities.anonymousIdentity ? "sim" : "não"}</Row>
            </dl>
            <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
              Somente leitura: a capacidade é do tipo de Canal. Nem este Canal nem uma Conversa a redefinem.
            </p>
          </Section>
        </div>

        <Section title="Mensagens de modelo" count={channel.messageTemplates.length}>
          {channel.messageTemplates.length === 0 ? (
            <EmptyState
              title="Nenhuma Mensagem de modelo sincronizada."
              hint={
                capabilities.requiresTemplateOutsideWindow
                  ? "Sem um modelo aprovado, não é possível escrever fora da janela de resposta."
                  : "Este tipo de Canal não exige modelo para enviar."
              }
            />
          ) : (
            <div className="overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
              <table className="w-full text-[length:var(--texto-base)]">
                <thead className="border-b border-[var(--cor-traco)] bg-[var(--cor-superficie-2)] text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Nome</th>
                    <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Categoria</th>
                    <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Idioma</th>
                    <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Aprovação</th>
                    <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Sincronizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--cor-traco)]">
                  {channel.messageTemplates.map((template) => (
                    <tr key={template.providerId}>
                      <td className="px-3 py-2 align-top">
                        <p className="font-medium text-[var(--cor-tinta)]">{template.name}</p>
                        <p className="mt-0.5 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">{template.body}</p>
                      </td>
                      <td className="px-3 py-2 align-top text-[var(--cor-tinta)]">{template.category}</td>
                      <td className="px-3 py-2 align-top text-[var(--cor-tinta)]">{template.language}</td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[length:var(--texto-sm)] ${
                            template.approval === "aprovado"
                              ? "bg-[var(--cor-sucesso-fraco)] text-[var(--cor-sucesso-texto)]"
                              : template.approval === "rejeitado"
                                ? "bg-[var(--cor-perigo-fraco)] text-[var(--cor-perigo-texto)]"
                                : "bg-[var(--cor-traco)] text-[var(--cor-tinta)]"
                          }`}
                        >
                          {APPROVAL_LABEL[template.approval]}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        {fmt.instant(template.syncedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
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
