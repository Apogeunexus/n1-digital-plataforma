"use client";

/**
 * T39 — Configurações do Espaço de Trabalho.
 *
 * A4.1 — the workspace is the root exception: it uses `ativo`, `suspenso` and
 * `encerrado`, never `arquivado` or `naLixeira`. The imposed limits come from
 * outside and are read-only here: the organization is subject to them.
 */

import Link from "next/link";
import { useData } from "@/data/store";
import { useFormat } from "@/features/shell/use-format";
import { PageHeader, Section, StateSeal } from "@/features/shell/ui";

const SECTIONS: ReadonlyArray<{
  readonly href: string;
  readonly title: string;
  readonly description: string;
}> = [
  { href: "/configuracoes/membros", title: "Membros", description: "Quem participa, com que Papel e em que estado." },
  { href: "/configuracoes/equipes", title: "Equipes", description: "Agrupam Membros para conceder permissão de uma vez." },
  { href: "/configuracoes/papeis", title: "Papéis", description: "Os quatro Papéis de sistema e os personalizados, com o teto de cada um." },
  { href: "/configuracoes/tags", title: "Tags", description: "Vocabulário transversal do Espaço de Trabalho." },
  { href: "/configuracoes/campos", title: "Campos", description: "Definições de Campo e onde cada uma se aplica." },
  { href: "/configuracoes/catalogos", title: "Catálogos", description: "Origens, qualificações, finalidades de consentimento e motivos." },
  { href: "/configuracoes/templates", title: "Templates", description: "Estruturas reutilizáveis; instanciar não cria vínculo vivo." },
  { href: "/configuracoes/integracoes", title: "Integrações", description: "Conexões com sistemas externos e as Ferramentas que expõem." },
  { href: "/configuracoes/lixeira", title: "Lixeira", description: "O que foi enviado à lixeira e quanto tempo resta." },
  { href: "/configuracoes/auditoria", title: "Auditoria", description: "Todo Registro de Atividade do Espaço de Trabalho." },
];

export default function ConfiguracoesPage() {
  const state = useData((data) => data);
  const fmt = useFormat();
  const { workspace } = state;
  const owner = state.members.find((m) => m.id === workspace.ownerMemberId);
  const activeMembers = state.members.filter((m) => m.state === "ativo" || m.state === "suspenso").length;

  return (
    <>
      <PageHeader
        title={workspace.name}
        seal={<StateSeal state={workspace.state} />}
        meta={`Proprietário ${owner?.displayName ?? "não encontrado"} · criado em ${fmt.instant(workspace.createdAt)}`}
      />

      <div className="p-6">
        {workspace.suspensions.length > 0 ? (
          <div className="mb-6 rounded-[var(--raio-controle)] bg-[var(--cor-atencao-fraco)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-atencao-texto)]">
            <p className="font-medium">
              Espaço de Trabalho suspenso por {workspace.suspensions.length} origem(ns).
            </p>
            <ul className="mt-1 space-y-0.5">
              {workspace.suspensions.map((suspension) => (
                <li key={`${suspension.origin}-${suspension.at}`}>
                  {suspension.origin === "plataforma" ? "Pela plataforma" : "Pelo Proprietário"}:{" "}
                  {suspension.reason} · {fmt.instant(suspension.at)}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[length:var(--texto-sm)]">
              Cada suspensão só é levantada por quem a impôs. Enquanto durar, o Espaço é somente leitura.
            </p>
          </div>
        ) : null}

        <Section title="Áreas">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SECTIONS.map((section) => (
              <li key={section.href}>
                <Link
                  href={section.href}
                  className="block h-full rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4 hover:border-[var(--cor-traco-forte)]"
                >
                  <p className="text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)]">{section.title}</p>
                  <p className="mt-1 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">{section.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Configuração da organização">
            <dl className="space-y-2 rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4 text-[length:var(--texto-base)]">
              <Row label="Fuso horário">{workspace.locale.timezone}</Row>
              <Row label="Moeda">{workspace.locale.currency}</Row>
              <Row label="Idioma">{workspace.locale.language}</Row>
              <Row label="Retenção na lixeira">{workspace.trashPolicy.retentionDays} dias</Row>
              <Row label="Profundidade de Subtarefas">
                {workspace.maxSubtaskDepth} de no máximo {workspace.limits.subtaskDepthCeiling}
              </Row>
              <Row label="Identificador de Tarefa">
                {workspace.taskReadableId.enabled
                  ? `${workspace.taskReadableId.prefix}-${workspace.taskReadableId.next}`
                  : "desativado"}
              </Row>
              <Row label="Identificador de Negócio">
                {workspace.dealReadableId.enabled
                  ? `${workspace.dealReadableId.prefix}-${workspace.dealReadableId.next}`
                  : "desativado"}
              </Row>
              <Row label="Funil padrão">
                {state.funnels.find((f) => f.id === workspace.defaultFunnelId)?.name ?? "—"}
              </Row>
              <Row label="Agente padrão">
                {state.agents.find((a) => a.id === workspace.defaultAgentId)?.name ?? "—"}
              </Row>
            </dl>
          </Section>

          <Section title="Limites impostos">
            <p className="mb-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
              Vêm de fora e não se editam aqui: o Espaço de Trabalho está sujeito a eles.
            </p>
            <dl className="space-y-2 rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie-2)] p-4 text-[length:var(--texto-base)]">
              <Row label="Membros">
                {fmt.number(activeMembers)} de {fmt.number(workspace.limits.members)}
              </Row>
              <Row label="Espaços">
                {fmt.number(state.spaces.filter((s) => s.lifecycle === "ativo").length)} de{" "}
                {fmt.number(workspace.limits.spaces)}
              </Row>
              <Row label="Contatos">
                {fmt.number(state.contacts.filter((c) => c.lifecycle === "ativo").length)} de{" "}
                {fmt.number(workspace.limits.contacts)}
              </Row>
              <Row label="Agentes">
                {fmt.number(state.agents.filter((a) => a.lifecycle === "ativo").length)} de{" "}
                {fmt.number(workspace.limits.agents)}
              </Row>
              <Row label="Tarefas por Lista">{fmt.number(workspace.limits.tasksPerList)}</Row>
              <Row label="Profundidade de cadeia de Execução">
                {workspace.limits.executionChainDepth}
              </Row>
              <Row label="Profundidade Agente a Agente">{workspace.limits.agentToAgentDepth}</Row>
              <Row label="Operações por Execução">
                {fmt.number(workspace.limits.operationsPerExecution)}
              </Row>
              <Row label="Teto de prazo de aprovação">
                {workspace.limits.approvalTimeoutHoursCeiling}h
              </Row>
              <Row label="Widgets por Painel">{workspace.limits.widgetsPerPanel}</Row>
            </dl>
          </Section>
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
