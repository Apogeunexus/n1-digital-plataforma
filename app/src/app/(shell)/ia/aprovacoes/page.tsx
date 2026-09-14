"use client";

/**
 * T36 — Solicitações de Aprovação.
 *
 * B77 — the request has a deadline, and an expired one cancels the Execution.
 * The screen shows the remaining time and disables deciding once the deadline
 * passed, so nobody discovers it by being refused on click (PADROES §10).
 *
 * B78 — the designated approver decides; the Agent owner and an administrator
 * may also decide. A request nobody here can decide is visible but inert, and
 * the screen says why.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useData, useRun, useSession } from "@/data/store";
import { executionChainOf } from "@/data/derive";
import { decideApproval } from "@/data/operations";
import { APPROVAL_REASON_LABEL, EFFECT_CLASS_LABEL, RESOURCE_TYPE_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import { Button, ConfirmDialog, EmptyState, Field, PageHeader, Section, TextArea } from "@/features/shell/ui";
import type { DataState } from "@/data/state";
import type { ApprovalRequest } from "@/data/types";

/** A rejection is recorded on the Execution it stopped, not on the request. */
function terminationReasonOf(state: DataState, approval: ApprovalRequest): string {
  if (approval.decision !== "rejeitada") return "";
  const execution = state.agentExecutions.find((e) => e.id === approval.executionId);
  return execution?.terminationReason ? ` · ${execution.terminationReason}` : "";
}

export default function AprovacoesPage() {
  const state = useData((data) => data);
  const fmt = useFormat();
  const { memberId } = useSession();
  const run = useRun();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();
  const query = useSearchParams();
  /**
   * D09 — a decisão vive no endereço (`?aprovar=<solicitação>`): decidir uma
   * Aprovação é um passo que se compartilha ("olha isso antes de eu aprovar") e
   * que precisa sobreviver a um recarregamento.
   */
  const decidingRaw = query.get("aprovar");
  const [decidingId, decidingKind] = (() => {
    if (!decidingRaw) return [null, "rejeitada"] as const;
    const [id, kind] = decidingRaw.split(":");
    return [id ?? null, kind === "aprovada" ? "aprovada" : "rejeitada"] as const;
  })();
  const openDecision = (approvalId: string, kind: "aprovada" | "rejeitada" = "rejeitada") => {
    setReason("");
    router.replace(`?aprovar=${approvalId}:${kind}`, { scroll: false });
  };
  const closeDecision = () => {
    setReason("");
    router.replace("?", { scroll: false });
  };
  const [reason, setReason] = useState("");
  const [now] = useState(() => Date.now());

  const member = state.members.find((m) => m.id === memberId);
  const role = state.roles.find((r) => r.id === member?.roleId);
  const isAdminLevel = role?.base === "administrador" || role?.base === "proprietario";

  // Mirrors decideApproval: the designated approver, the Agent owner, or an admin.
  const mayDecide = (approval: ApprovalRequest): boolean => {
    if (approval.approverMemberId === memberId) return true;
    if (isAdminLevel) return true;
    const execution = state.agentExecutions.find((e) => e.id === approval.executionId);
    const agent = execution ? state.agents.find((a) => a.id === execution.agentId) : undefined;
    return agent?.ownerMemberId === memberId;
  };

  const pending = state.approvals.filter((approval) => approval.decision === undefined);
  const decided = state.approvals.filter((approval) => approval.decision !== undefined);
  const mine = pending.filter((approval) => approval.approverMemberId === memberId);
  const others = pending.filter((approval) => approval.approverMemberId !== memberId);

  const decide = (approval: ApprovalRequest, decision: "aprovada" | "rejeitada", why?: string) => {
    const result = run((data, actingMemberId) =>
      decideApproval(data, actingMemberId, approval.id, decision, why),
    );
    if (result.ok) {
      setError(null);
      setNotice(decision === "aprovada" ? "Solicitação aprovada; a Execução retomou." : "Solicitação rejeitada.");
      closeDecision();
      setReason("");
    } else {
      setNotice(null);
      setError(result.error);
    }
  };

  const renderCard = (approval: ApprovalRequest) => {
    const actionable = mayDecide(approval);
    const expired = Date.parse(approval.deadline) < now;
    const execution = state.agentExecutions.find((e) => e.id === approval.executionId);
    const approver = state.members.find((m) => m.id === approval.approverMemberId);
    const chain = execution ? executionChainOf(state, execution.id) : [];

    return (
      <li key={approval.id} className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)]">
              {state.tools.find((t) => t.id === approval.object.toolId)?.name ?? approval.object.toolId}
            </p>
            <p className="mt-0.5 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
              classe de efeito {EFFECT_CLASS_LABEL[approval.object.effectClass] ?? approval.object.effectClass}{" "}
              · motivo: {APPROVAL_REASON_LABEL[approval.reason] ?? approval.reason} · aprovador {approver?.displayName ?? "não encontrado"}
            </p>
          </div>
          <span className={`shrink-0 text-[length:var(--texto-sm)] ${expired ? "text-[var(--cor-perigo-texto)]" : "text-[var(--cor-tinta-fraca)]"}`}>
            {expired
              ? `prazo vencido em ${fmt.instant(approval.deadline)}`
              : `vence ${fmt.relative(approval.deadline, now)}`}
          </span>
        </div>

        <pre className="mt-3 overflow-x-auto rounded-[var(--raio-controle)] bg-[var(--cor-superficie-2)] p-3 text-[length:var(--texto-sm)] text-[var(--cor-tinta)]">
          {approval.object.input}
        </pre>

        {chain.length > 0 ? (
          <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
            Cadeia: {chain.map((link) => link.name).join(" → ")}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              onClick={() => openDecision(approval.id, "aprovada")}
              disabled={!actionable || expired}
              disabledReason={
                expired
                  ? "O prazo desta Solicitação venceu; a Execução foi cancelada."
                  : "Só o aprovador designado, o Proprietário do Agente ou um Administrador decide esta Solicitação."
              }
            >
              Aprovar
            </Button>
            <Button
              variant="danger"
              onClick={() => openDecision(approval.id, "rejeitada")}
              disabled={!actionable || expired}
              disabledReason={
                expired
                  ? "O prazo desta Solicitação venceu; a Execução foi cancelada."
                  : "Só o aprovador designado, o Proprietário do Agente ou um Administrador decide esta Solicitação."
              }
            >
              Rejeitar
            </Button>
            {execution ? (
              <Link
                href={`/ia/execucoes/${execution.id}`}
                className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)] underline"
              >
                Ver a Execução
              </Link>
            ) : null}
        </div>
      </li>
    );
  };

  const deciding = decidingId ? state.approvals.find((a) => a.id === decidingId) : undefined;
  const decidingExpired = deciding ? Date.parse(deciding.deadline) < now : false;
  const decidingTool = deciding
    ? (state.tools.find((t) => t.id === deciding.object.toolId)?.name ?? deciding.object.toolId)
    : "";

  return (
    <>
      <PageHeader
        title="Aprovações"
        meta={`${mine.length} para você · ${pending.length} pendentes no Espaço de Trabalho`}
      />

      {deciding ? (
        <ConfirmDialog
          open
          title={
            decidingKind === "aprovada" ? `Aprovar: ${decidingTool}` : `Rejeitar: ${decidingTool}`
          }
          description={
            decidingKind === "aprovada"
              ? `Aprovar é aprovar exatamente este objeto, e ele tem classe de efeito ${
                  EFFECT_CLASS_LABEL[deciding.object.effectClass] ?? deciding.object.effectClass
                }${
                  deciding.object.effectClass === "externa"
                    ? " — o passo sai da plataforma e não volta atrás"
                    : ""
                }. As verificações são refeitas na decisão e ainda podem resultar em negada.`
              : "A rejeição interrompe a Execução e fica registrada nela com o motivo. A decisão é terminal: esta Solicitação não é decidida de novo."
          }
          confirmLabel={decidingKind === "aprovada" ? "Aprovar" : "Rejeitar"}
          cancelLabel="Voltar"
          destructive={decidingKind === "rejeitada"}
          {...(decidingExpired
            ? { confirmDisabledReason: "O prazo desta Solicitação venceu; a Execução foi cancelada." }
            : !mayDecide(deciding)
              ? {
                  confirmDisabledReason:
                    "Só o aprovador designado, o Proprietário do Agente ou um Administrador decide esta Solicitação.",
                }
              : decidingKind === "rejeitada" && reason.trim() === ""
                ? { confirmDisabledReason: "Escreva o motivo: ele fica na Execução que a rejeição interrompe." }
                : {})}
          onConfirm={() =>
            decidingKind === "aprovada"
              ? decide(deciding, "aprovada")
              : decide(deciding, "rejeitada", reason)
          }
          onCancel={closeDecision}
        >
          <div className="grid gap-3">
            <div>
              <p className="text-[length:var(--texto-sm)] font-[var(--peso-medio)]">Objeto, imutável</p>
              <pre className="mt-1 overflow-x-auto rounded-[var(--raio-controle)] bg-[var(--cor-superficie-2)] p-3 text-[length:var(--texto-sm)]">
                {deciding.object.input}
              </pre>
              <p className="mt-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                Alvo: {RESOURCE_TYPE_LABEL[deciding.object.targetResourceType] ??
                  deciding.object.targetResourceType}{" "}
                · motivo: {APPROVAL_REASON_LABEL[deciding.reason] ?? deciding.reason} · vence{" "}
                {fmt.relative(deciding.deadline, now)}
              </p>
            </div>

            {decidingKind === "rejeitada" ? (
              <Field label="Motivo da rejeição" hint="Fica registrado na Execução que ela interrompe.">
                {(id) => <TextArea id={id} value={reason} onChange={setReason} rows={2} />}
              </Field>
            ) : null}
          </div>
        </ConfirmDialog>
      ) : null}

      <div className="p-6">
        {notice ? (
          <p role="status" className="mb-4 rounded-[var(--raio-controle)] bg-[var(--cor-sucesso-fraco)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-sucesso-texto)]">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mb-4 rounded-[var(--raio-controle)] bg-[var(--cor-perigo-fraco)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-perigo-texto)]">
            {error}
          </p>
        ) : null}

        <Section title="Aguardando a sua decisão" count={mine.length}>
          {mine.length === 0 ? (
            <EmptyState
              title="Nenhuma Solicitação aguarda você."
              hint="Uma Solicitação chega quando uma Execução pede uma Ferramenta que a Concessão exige aprovar."
            />
          ) : (
            <ul className="space-y-3">{mine.map((approval) => renderCard(approval))}</ul>
          )}
        </Section>

        <Section title="Aguardando outros aprovadores" count={others.length}>
          {others.length === 0 ? (
            <EmptyState title="Nenhuma Solicitação pendente com outro aprovador." />
          ) : (
            <ul className="space-y-3">{others.map((approval) => renderCard(approval))}</ul>
          )}
        </Section>

        <Section title="Decididas" count={decided.length}>
          {decided.length === 0 ? (
            <EmptyState title="Nenhuma Solicitação decidida ainda." />
          ) : (
            <ul className="divide-y divide-[var(--cor-traco)] overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
              {decided.map((approval) => (
                <li key={approval.id} className="flex items-center justify-between gap-3 px-4 py-2 text-[length:var(--texto-base)]">
                  <span className="truncate text-[var(--cor-tinta)]">
                    {state.tools.find((t) => t.id === approval.object.toolId)?.name ?? approval.object.toolId}
                  </span>
                  <span className="shrink-0 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                    {approval.decision}
                    {approval.decidedAt ? ` · ${fmt.instant(approval.decidedAt)}` : ""}
                    {terminationReasonOf(state, approval)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
