"use client";

import Link from "next/link";
import { use } from "react";
import { useData } from "@/data/store";
import {
  EFFECT_CLASS_LABEL,
  EXECUTION_ORIGIN_LABEL,
  EXECUTION_STATE_LABEL,
} from "@/features/shell/format";
import { EmptyState, PageHeader, Section, StateSeal } from "@/features/shell/ui";

export default function AgentePage({ params }: { params: Promise<{ agente: string }> }) {
  const { agente } = use(params);
  const state = useData((data) => data);
  const record = state.agents.find((a) => a.id === agente);

  if (!record) {
    return (
      <>
        <PageHeader title="Registro não encontrado" />
        <div className="p-6">
          <EmptyState title="Agente não encontrado." hint="Ele pode ter sido eliminado, ou você não tem permissão para vê-lo." />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={record.name}
        seal={<StateSeal state={record.lifecycle} />}
        meta={`Proprietário: ${state.members.find((m) => m.id === record.ownerMemberId)?.displayName ?? "—"} · Papel ${state.roles.find((r) => r.id === record.roleId)?.name ?? "—"} · versão ${record.versions.at(-1)?.number ?? 1}`}
        actions={
          record.lifecycle !== "naLixeira" ? (
            <Link
              href={`/ia/personalizar/agente?editar=${record.id}`}
              className="inline-flex h-[var(--altura-controle)] items-center rounded-[var(--raio-controle)] bg-[var(--cor-superficie)] px-3 text-[length:var(--texto-base)] font-[var(--peso-medio)] text-[var(--cor-tinta)] ring-1 ring-inset ring-[var(--cor-traco-forte)] hover:bg-[var(--cor-superficie-2)]"
            >
              Editar no Construtor
            </Link>
          ) : null
        }
      />
      <div className="p-6">
        <Section title="Configuração">
          <dl className="grid gap-2 text-[length:var(--texto-base)] sm:grid-cols-2">
            <div>
              <dt className="text-[var(--cor-tinta-fraca)]">Objetivo</dt>
              <dd className="text-[var(--cor-tinta)]">{record.versions.at(-1)?.objective}</dd>
            </div>
            <div>
              <dt className="text-[var(--cor-tinta-fraca)]">Nível de autonomia</dt>
              <dd className="text-[var(--cor-tinta)]">{record.versions.at(-1)?.autonomy}</dd>
            </div>
            <div>
              <dt className="text-[var(--cor-tinta-fraca)]">Modelo</dt>
              <dd className="text-[var(--cor-tinta)]">
                {(() => {
                  const modelId = record.versions.at(-1)?.modelId;
                  if (!modelId) return "não definido";
                  if (modelId === "padraoDaPlataforma") return "o padrão da plataforma";
                  return state.models.find((model) => model.id === modelId)?.name ?? modelId;
                })()}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--cor-tinta-fraca)]">Política de aprovação</dt>
              <dd className="text-[var(--cor-tinta)]">{record.versions.at(-1)?.approvalPolicy.timeoutHours} h</dd>
            </div>
          </dl>
        </Section>
        <Section title="Habilidades concedidas" count={state.skillGrants.filter((g) => g.agentId === record.id).length}>
          {state.skillGrants.filter((g) => g.agentId === record.id).length === 0 ? (
            <EmptyState
              title="Nenhuma Habilidade concedida."
              hint="O Agente age apenas com as instruções, as Ferramentas permitidas e o Conhecimento a que tem acesso."
            />
          ) : (
            <ul className="space-y-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
              {state.skillGrants
                .filter((g) => g.agentId === record.id)
                .map((grant) => (
                  <li key={grant.id}>
                    {state.skills.find((s) => s.id === grant.skillId)?.name}
                    {grant.pinnedVersion ? ` · versão fixada ${grant.pinnedVersion}` : " · segue a versão corrente"}
                  </li>
                ))}
            </ul>
          )}
        </Section>
        {(() => {
          const v = record.versions.at(-1);
          if (!v || (!v.icebreakers?.length && !v.knowledgeSources?.length && !v.responseFormat && !v.accessPoints?.length)) return null;
          const FORMATO: Record<string, string> = { texto: "Texto livre", markdown: "Markdown", json: "JSON", estruturado: "Formato estruturado" };
          const ACESSO: Record<string, string> = { chat: "Chat da plataforma", whatsapp: "WhatsApp", api: "API", webhook: "Webhook" };
          return (
            <Section title="Configuração do Construtor">
              <dl className="grid gap-2 text-[length:var(--texto-base)]">
                {v.icebreakers?.length ? (
                  <div>
                    <dt className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">Quebra-gelos</dt>
                    <dd className="text-[var(--cor-tinta)]">{v.icebreakers.join(" · ")}</dd>
                  </div>
                ) : null}
                {v.knowledgeSources?.length ? (
                  <div>
                    <dt className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">Conhecimento</dt>
                    <dd className="text-[var(--cor-tinta)]">{v.knowledgeSources.map((k) => k.label).join(" · ")}</dd>
                  </div>
                ) : null}
                {v.responseFormat ? (
                  <div>
                    <dt className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">Formato de resposta</dt>
                    <dd className="text-[var(--cor-tinta)]">{FORMATO[v.responseFormat] ?? v.responseFormat}</dd>
                  </div>
                ) : null}
                {v.accessPoints?.length ? (
                  <div>
                    <dt className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">Pontos de acesso</dt>
                    <dd className="text-[var(--cor-tinta)]">{v.accessPoints.map((a) => ACESSO[a] ?? a).join(", ")}</dd>
                  </div>
                ) : null}
              </dl>
            </Section>
          );
        })()}
        <Section title="Ferramentas permitidas" count={record.versions.at(-1)?.allowedToolIds.length ?? 0}>
          {(record.versions.at(-1)?.allowedToolIds.length ?? 0) === 0 ? (
            <EmptyState
              title="Nenhuma Ferramenta permitida."
              hint="O Agente é puramente conversacional: responde, mas não lê nem altera registro algum."
            />
          ) : (
            <ul className="space-y-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
              {(record.versions.at(-1)?.allowedToolIds ?? []).map((toolId) => {
                const tool = state.tools.find((t) => t.id === toolId);
                return (
                  <li key={toolId}>
                    {tool?.name ?? toolId} <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">· {tool ? (EFFECT_CLASS_LABEL[tool.effectClass] ?? tool.effectClass) : "não está no Catálogo"}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
        <Section title="Execuções" count={state.agentExecutions.filter((e) => e.agentId === record.id).length}>
          {state.agentExecutions.filter((e) => e.agentId === record.id).length === 0 ? (
            <EmptyState title="Nenhuma Execução ainda." />
          ) : (
            <ul className="space-y-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
              {state.agentExecutions
                .filter((e) => e.agentId === record.id)
                .map((execution) => (
                  <li key={execution.id}>
                    <Link
                      href={`/ia/execucoes/${execution.id}`}
                      className="flex items-center justify-between gap-3 rounded-[var(--raio-controle)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] px-3 py-2 hover:border-[var(--cor-traco-forte)]"
                    >
                      <span>
                        {EXECUTION_STATE_LABEL[execution.state] ?? execution.state} · origem:{" "}
                        {EXECUTION_ORIGIN_LABEL[execution.origin] ?? execution.origin}
                        {execution.rehearsal ? " · ensaio" : ""}
                      </span>
                      <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        {execution.steps.length} passo(s)
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </Section>
        <Section title="Memória do Agente" count={record.memory.length}>
          {record.memory.length === 0 ? (
            <EmptyState title="Nenhum fato memorizado." />
          ) : (
            <ul className="space-y-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
              {record.memory.map((item) => (
                <li key={item.id}>{item.content}</li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
