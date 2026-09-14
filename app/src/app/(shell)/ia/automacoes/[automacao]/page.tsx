"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useCurrentMember, useData, useRun } from "@/data/store";
import { publishAutomation } from "@/data/operations";
import { RESOURCE_TYPE_LABEL, TRIGGER_EVENT_LABEL, TRIGGER_KIND_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Section,
  StateSeal,
  Toast,
} from "@/features/shell/ui";

export default function AutomacaoPage({ params }: { params: Promise<{ automacao: string }> }) {
  const { automacao } = use(params);
  const state = useData((data) => data);
  const fmt = useFormat();
  const run = useRun();
  const acting = useCurrentMember();
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const record = state.automations.find((a) => a.id === automacao);
  const executions = state.automationExecutions.filter((e) => e.automationId === automacao);

  if (!record) {
    return (
      <>
        <PageHeader title="Registro não encontrado" />
        <div className="p-6">
          <EmptyState title="Automação não encontrada." hint="Ela pode ter sido eliminada, ou você não tem permissão para vê-la." />
        </div>
      </>
    );
  }

  // RN-AUT-07 — publicar exige Gatilho e ao menos uma Ação. A tela lê a mesma
  // condição que a operação aplica, para o botão não habilitar numa recusa.
  const draft = record.versions.find((version) => version.state === "rascunho");
  const current = record.versions.find((version) => version.state === "publicada");
  // A tela lê a mesma autorização que a operação aplica (PADROES §10): quem não
  // administra a Automação vê o motivo, não uma recusa depois do clique.
  const actingBase = state.roles.find((r) => r.id === acting?.roleId)?.base;
  const mayPublish =
    actingBase === "proprietario" ||
    actingBase === "administrador" ||
    (actingBase !== "convidado" &&
      acting !== undefined &&
      (record.ownerMemberId === acting.id ||
        (record.createdBy.kind === "member" && record.createdBy.id === acting.id)));

  const publishBlocked = !mayPublish
    ? "Publicar uma Versão exige administrar esta Automação."
    : !draft
      ? "Não há rascunho para publicar."
      : !draft.trigger
        ? "O rascunho ainda não tem Gatilho."
        : draft.actions.length === 0
          ? "O rascunho ainda não tem nenhuma Ação."
          : undefined;

  const publish = () => {
    const result = run((data, memberId) => publishAutomation(data, memberId, record.id));
    if (result.ok) {
      setError(null);
      setNotice(
        current
          ? `Versão ${result.value.number} publicada. A Versão ${current.number} passou a obsoleta.`
          : `Versão ${result.value.number} publicada.`,
      );
    } else {
      setNotice(null);
      setError(result.error);
    }
    setPublishing(false);
  };

  return (
    <>
      <ConfirmDialog
        open={publishing}
        title={draft ? `Publicar a Versão ${draft.number}?` : "Publicar"}
        description={
          current
            ? `A Versão ${current.number}, hoje publicada, passa a obsoleta no mesmo ato. Execuções já em curso seguem na Versão que as iniciou.`
            : "Esta passa a ser a Versão vigente: a partir daqui o Gatilho dispara Execuções reais."
        }
        confirmLabel="Publicar"
        onConfirm={publish}
        onCancel={() => setPublishing(false)}
      />

      {notice ? (
        <Toast tone="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Toast>
      ) : null}
      {error ? (
        <Toast tone="error" onDismiss={() => setError(null)}>
          {error}
        </Toast>
      ) : null}

      <PageHeader
        title={record.name}
        seal={<StateSeal state={record.lifecycle} />}
        meta={`Escopo: ${RESOURCE_TYPE_LABEL[record.scopeType] ?? record.scopeType} · Proprietário: ${state.members.find((m) => m.id === record.ownerMemberId)?.displayName ?? "—"}`}
        actions={
          <Button
            variant="primary"
            onClick={() => setPublishing(true)}
            disabled={publishBlocked !== undefined}
            disabledReason={publishBlocked ?? ""}
          >
            Publicar rascunho
          </Button>
        }
      />
      <div className="p-6">
        <Section title="Versões" count={record.versions.length}>
          <ul className="space-y-2">
            {record.versions.map((version) => (
              <li key={version.number} className="rounded-[var(--raio-controle)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)]">Versão {version.number}</span>
                  <StateSeal state={version.state} />
                </div>
                <p className="mt-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                  Gatilho:{" "}
                  {version.trigger
                    ? (TRIGGER_KIND_LABEL[version.trigger.kind] ?? version.trigger.kind)
                    : "sem Gatilho"}
                  {version.trigger?.eventType
                    ? ` · ${TRIGGER_EVENT_LABEL[version.trigger.eventType] ?? version.trigger.eventType}`
                    : ""}
                </p>
                <p className="mt-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                  {version.conditions.length} Condição(ões) · {version.actions.length} Ação(ões)
                </p>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Execuções" count={executions.length}>
          {executions.length === 0 ? (
            <EmptyState
              title="Nenhuma Execução ainda."
              hint="Uma Execução nasce quando o gatilho desta Automação acontece."
            />
          ) : (
            <ul className="space-y-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
              {executions.map((execution) => (
                <li key={execution.id}>
                  <Link href={`/ia/execucoes/${execution.id}`} className="hover:underline">
                    <span className="text-[var(--cor-tinta-fraca)]">{fmt.instant(execution.startedAt)}</span> ·{" "}
                    {execution.state}
                    {execution.terminationReason ? ` · ${execution.terminationReason}` : ""}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
