"use client";

/**
 * Execução de Agente — a superfície que os fluxos 7 e 8 apontam.
 *
 * Ela não estava numerada no inventário da Fase 2, e a ausência aparecia como
 * dois passos de fluxo sem destino. Registrada em PENDENCIAS-FRONTEND.
 *
 * O que ela precisa provar, e por isso ocupa a tela inteira:
 *   B79 — a Cadeia completa, da raiz até esta Execução: uma Automação que
 *         invoca um Agente que invoca outro é rastreável de ponta a ponta.
 *   A9.3 — a permissão efetiva é a interseção, e SÓ o delegante Membro entra
 *         nela; um Agente delegante não amplia nada.
 *   DO-HAB-14 — cada Passo grava as DUAS verificações independentes: a
 *         Ferramenta é permitida ao Agente, e o Recurso-alvo é permitido.
 *   B98 — toda saída baseada em Conhecimento carrega as Referências, e elas
 *         nunca são apagadas.
 *   B82 — um ensaio simula as escritas: sem efeito e sem memória.
 */

import Link from "next/link";
import { use } from "react";
import { useData } from "@/data/store";
import { executionChainOf } from "@/data/derive";
import { ACTOR_KIND_LABEL, EFFECT_CLASS_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import { ActorAvatar, ConditionMarker, EmptyState, PageHeader, Section } from "@/features/shell/ui";
import type { DataState } from "@/data/state";
import type { ActorKind } from "@/design/components";
import type { ActorRef, ExecutionStep } from "@/data/types";

const STATE_LABEL: Record<string, string> = {
  pendente: "pendente",
  executando: "executando",
  aguardandoAprovacao: "aguardando aprovação",
  concluida: "concluída",
  falhou: "falhou",
  cancelada: "cancelada",
};

const STATE_COLOR: Record<string, string> = {
  pendente: "var(--cor-exe-pendente)",
  executando: "var(--cor-exe-executando)",
  aguardandoAprovacao: "var(--cor-exe-aguardando)",
  concluida: "var(--cor-exe-concluida)",
  falhou: "var(--cor-exe-falhou)",
  cancelada: "var(--cor-exe-cancelada)",
};

const STEP_KIND_LABEL: Record<string, string> = {
  ferramenta: "Ferramenta",
  habilidade: "Habilidade",
  aprovacao: "Aprovação",
  raciocinio: "Raciocínio",
  memorizacao: "Memorização",
};

const ORIGIN_LABEL: Record<string, string> = {
  sessaoDeChat: "Sessão de Chat",
  acaoDireta: "ação direta",
  automacao: "Automação",
  agente: "outro Agente",
  caixaDeEntrada: "Caixa de Entrada",
};

export default function ExecucaoPage({ params }: { params: Promise<{ execucao: string }> }) {
  const { execucao } = use(params);
  const state = useData((data) => data);
  const fmt = useFormat();

  const record = state.agentExecutions.find((e) => e.id === execucao);

  if (!record) {
    return (
      <>
        <PageHeader title="Execução não encontrada" />
        <div className="p-6">
          <EmptyState
            title="Execução não encontrada."
            hint="Ela é eliminada junto com o Agente a que pertence; os Registros de Atividade e os efeitos permanecem."
          />
        </div>
      </>
    );
  }

  const agent = state.agents.find((a) => a.id === record.agentId);
  const chain = executionChainOf(state, record.id);
  const approvals = state.approvals.filter((approval) => approval.executionId === record.id);
  const isTerminal = ["concluida", "falhou", "cancelada"].includes(record.state);

  return (
    <>
      <PageHeader
        path={
          <>
            <Link href="/ia/agentes" className="hover:underline">
              Agentes
            </Link>
            {agent ? (
              <>
                {" › "}
                <Link href={`/ia/agentes/${agent.id}`} className="hover:underline">
                  {agent.name}
                </Link>
              </>
            ) : null}
          </>
        }
        title={`Execução · ${STATE_LABEL[record.state] ?? record.state}`}
        meta={
          <span className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ background: STATE_COLOR[record.state] }}
              />
              {STATE_LABEL[record.state] ?? record.state}
            </span>
            <span>origem: {ORIGIN_LABEL[record.origin] ?? record.origin}</span>
            <span>autonomia efetiva: {record.effectiveAutonomy}</span>
            <span>iniciada {fmt.relative(record.startedAt)}</span>
            {record.rehearsal ? (
              <ConditionMarker tone="warning" title="B82 — escritas simuladas, sem efeito e sem memória.">
                ensaio
              </ConditionMarker>
            ) : null}
          </span>
        }
      />

      <div className="p-6">
        {isTerminal ? (
          <p className="mb-6 rounded-[var(--raio-controle)] bg-[var(--cor-superficie-2)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
            Estado terminal, imutável. “Tentar de novo” é uma Execução nova, não a continuação desta.
            {record.terminationReason ? ` Motivo: ${record.terminationReason}.` : ""}
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Section title="Cadeia de Execuções" count={chain.length}>
              {chain.length <= 1 ? (
                <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                  Execução raiz: ninguém a invocou a partir de outra.
                </p>
              ) : (
                <ol className="flex flex-wrap items-center gap-2">
                  {chain.map((link, index) => (
                    <li key={link.id} className="flex items-center gap-2">
                      {index > 0 ? (
                        <span aria-hidden="true" className="text-[var(--cor-tinta-fraca)]">
                          →
                        </span>
                      ) : null}
                      <span
                        className={`rounded-[var(--raio-controle)] px-2 py-1 text-[length:var(--texto-base)] ${
                          link.id === record.id
                            ? "bg-[var(--cor-acento)] text-[var(--cor-acento-texto)]"
                            : "bg-[var(--cor-superficie-2)]"
                        }`}
                      >
                        {link.name}
                        <span className="ml-1 text-[length:var(--texto-sm)] opacity-70">{link.kind}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                Cancelar uma Execução de Automação mãe cancela as filhas.
              </p>
            </Section>

            <Section title="Entrada">
              <pre className="overflow-x-auto rounded-[var(--raio-controle)] bg-[var(--cor-superficie-2)] p-3 text-[length:var(--texto-sm)]">
                {record.input}
              </pre>
            </Section>

            <Section title="Passos" count={record.steps.length}>
              {record.steps.length === 0 ? (
                <EmptyState title="Nenhum Passo registrado ainda." />
              ) : (
                <ol className="space-y-2">
                  {[...record.steps]
                    .sort((a, b) => a.index - b.index)
                    .map((step) => (
                      <li
                        key={step.index}
                        className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <span className="text-[length:var(--texto-base)] font-[var(--peso-medio)]">
                            {step.index + 1}. {STEP_KIND_LABEL[step.kind] ?? step.kind}
                            {step.toolId
                              ? ` · ${state.tools.find((t) => t.id === step.toolId)?.name ?? step.toolId}`
                              : ""}
                            {step.skillId
                              ? ` · ${state.skills.find((s) => s.id === step.skillId)?.name ?? step.skillId}${
                                  step.skillVersion ? ` v${step.skillVersion}` : ""
                                }`
                              : ""}
                          </span>
                          <span className="flex items-center gap-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                            {step.effectClass ? (
                              <span>{EFFECT_CLASS_LABEL[step.effectClass] ?? step.effectClass}</span>
                            ) : null}
                            <span>{fmt.instant(step.at)}</span>
                            <StepResult result={step.result} />
                          </span>
                        </div>

                        {step.input ? (
                          <pre className="mt-2 overflow-x-auto rounded-[var(--raio-controle)] bg-[var(--cor-superficie-2)] p-2 text-[length:var(--texto-sm)]">
                            {step.input}
                          </pre>
                        ) : null}

                        <PermissionChecks step={step} />

                        {step.approvalRequestId ? (
                          <p className="mt-2 text-[length:var(--texto-sm)]">
                            <Link href="/ia/aprovacoes" className="underline">
                              Solicitação de Aprovação que liberou este Passo
                            </Link>
                          </p>
                        ) : null}
                      </li>
                    ))}
                </ol>
              )}
            </Section>

            {record.output ? (
              <Section title="Saída">
                <pre className="overflow-x-auto rounded-[var(--raio-controle)] bg-[var(--cor-superficie-2)] p-3 text-[length:var(--texto-sm)]">
                  {record.output}
                </pre>
              </Section>
            ) : null}

            <Section title="Referências de Conhecimento" count={record.knowledgeReferences.length}>
              {record.knowledgeReferences.length === 0 ? (
                <EmptyState
                  title="Esta saída não se baseou em Conhecimento."
                  hint="Quando se baseia, a referência é obrigatória e nunca é apagada."
                />
              ) : (
                <ul className="space-y-1 text-[length:var(--texto-base)]">
                  {record.knowledgeReferences.map((reference) => (
                    <li
                      key={`${reference.documentId}-${reference.version}`}
                      className="rounded-[var(--raio-controle)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] px-3 py-2"
                    >
                      <Link
                        href={`/ia/conhecimento/documentos/${reference.documentId}`}
                        className="font-[var(--peso-medio)] hover:underline"
                      >
                        {reference.documentTitle}
                      </Link>
                      <span className="ml-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        v{reference.version} · {reference.fragmentIds.length} Fragmento(s) ·{" "}
                        {reference.collectionName}
                      </span>
                      {reference.marker ? (
                        <ConditionMarker tone="warning">{String(reference.marker)}</ConditionMarker>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <aside>
            <Section title="Quem agiu">
              <div className="space-y-2 rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-3">
                <ActorLine label="Invocador" actor={record.invokedBy} state={state} />
                {record.delegate ? (
                  <ActorLine label="Em nome de" actor={record.delegate} state={state} />
                ) : null}
                <p className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                  {record.delegate?.kind === "member"
                    ? "A permissão efetiva é a interseção entre o Agente e este Membro."
                    : "Sem delegante Membro: o Agente age só com as próprias permissões."}
                </p>
              </div>
            </Section>

            <Section title="Configuração fixa da Execução">
              <dl className="space-y-2 rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-3 text-[length:var(--texto-base)]">
                <Row label="Agente">
                  {agent ? (
                    <Link href={`/ia/agentes/${agent.id}`} className="hover:underline">
                      {agent.name}
                    </Link>
                  ) : (
                    "eliminado"
                  )}
                </Row>
                <Row label="Versão">v{record.agentVersion}</Row>
                <Row label="Modelo">
                  {state.models.find((m) => m.id === record.modelId)?.name ?? record.modelId}
                </Row>
                <Row label="Autonomia efetiva">{record.effectiveAutonomy}</Row>
              </dl>
              <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                A versão e o Modelo são fixados no início e não mudam no meio.
              </p>
            </Section>

            <Section title="Composição do Contexto">
              <dl className="space-y-2 rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-3 text-[length:var(--texto-base)]">
                <Row label="Âncora">{record.contextComposition.anchor?.name ?? "nenhuma"}</Row>
                <Row label="Registros lidos">{record.contextComposition.readRecordIds.length}</Row>
                <Row label="Fragmentos">{record.contextComposition.fragmentRefs.length}</Row>
                <Row label="Itens de memória">{record.contextComposition.memoryItemIds.length}</Row>
                <Row label="Mensagens de Chat">{record.contextComposition.chatMessageIds.length}</Row>
              </dl>
              <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                Só as referências: o Contexto é efêmero e nunca é guardado em conteúdo.
              </p>
            </Section>

            <Section title="Custo">
              <dl className="space-y-2 rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-3 text-[length:var(--texto-base)]">
                <Row label="Unidades de Modelo">{fmt.number(record.cost.modelUnits)}</Row>
                <Row label="Chamadas de Ferramenta">{record.cost.toolCalls}</Row>
                <Row label="Execuções filhas">{record.cost.childExecutions}</Row>
                <Row label="Duração">{fmt.number(Math.round(record.cost.durationMs / 100) / 10)} s</Row>
              </dl>
              <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                O Custo é da Execução, nunca do Agente.
              </p>
            </Section>

            <Section title="Solicitações de Aprovação" count={approvals.length}>
              {approvals.length === 0 ? (
                <EmptyState title="Nenhuma Solicitação nesta Execução." />
              ) : (
                <ul className="space-y-1 text-[length:var(--texto-base)]">
                  {approvals.map((approval) => (
                    <li key={approval.id}>
                      <Link href="/ia/aprovacoes" className="hover:underline">
                        {state.tools.find((t) => t.id === approval.object.toolId)?.name ??
                          approval.object.toolId}
                      </Link>
                      <span className="ml-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        {approval.decision ?? "pendente"}
                      </span>
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

/**
 * DO-HAB-14 — as duas verificações são independentes e ficam gravadas por
 * invocação: mostrar só uma esconderia metade da razão de um Passo ter sido
 * negado.
 */
function PermissionChecks({ step }: { readonly step: ExecutionStep }) {
  if (step.toolAllowed === undefined && step.resourcePermitted === undefined) return null;
  return (
    <p className="mt-2 flex flex-wrap gap-3 text-[length:var(--texto-sm)]">
      {step.toolAllowed !== undefined ? (
        <span style={{ color: step.toolAllowed ? "var(--cor-sucesso)" : "var(--cor-perigo)" }}>
          Ferramenta {step.toolAllowed ? "permitida" : "não permitida"} ao Agente
        </span>
      ) : null}
      {step.resourcePermitted !== undefined ? (
        <span style={{ color: step.resourcePermitted ? "var(--cor-sucesso)" : "var(--cor-perigo)" }}>
          Recurso-alvo {step.resourcePermitted ? "permitido" : "não permitido"}
        </span>
      ) : null}
    </p>
  );
}

function StepResult({ result }: { readonly result: ExecutionStep["result"] }) {
  const color =
    result === "concluido"
      ? "var(--cor-sucesso)"
      : result === "falhou" || result === "negada"
        ? "var(--cor-perigo)"
        : result === "aguardando"
          ? "var(--cor-exe-aguardando)"
          : "var(--cor-tinta-fraca)";
  return <span style={{ color }}>{result}</span>;
}

function ActorLine({
  label,
  actor,
  state,
}: {
  readonly label: string;
  readonly actor: ActorRef;
  readonly state: DataState;
}) {
  const name =
    actor.kind === "member"
      ? (state.members.find((m) => m.id === actor.id)?.displayName ?? "Membro removido")
      : actor.kind === "agent"
        ? (state.agents.find((a) => a.id === actor.id)?.name ?? "Agente")
        : actor.kind === "automation"
          ? (state.automations.find((a) => a.id === actor.id)?.name ?? "Automação")
          : (ACTOR_KIND_LABEL[actor.kind] ?? actor.kind);
  return (
    <div className="flex items-center gap-2">
      <ActorAvatar kind={actor.kind as ActorKind} name={name} />
      <span className="min-w-0">
        <span className="block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">{label}</span>
        <span className="block truncate text-[length:var(--texto-base)]">{name}</span>
      </span>
    </div>
  );
}

function Row({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-[var(--cor-tinta-fraca)]">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
