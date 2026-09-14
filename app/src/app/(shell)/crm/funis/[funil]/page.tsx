"use client";

import { use, useState } from "react";
import { useData } from "@/data/store";
import { requirementLabel } from "@/data/derive";
import { Button, EmptyState, PageHeader, Section, StateSeal, Toast } from "@/features/shell/ui";
import { RemoveStageDialog, useRemoveStageDialog } from "@/features/crm/remove-stage-dialog";
import { MigrateFunnelDialog, useMigrateFunnelDialog } from "@/features/crm/migrate-funnel-dialog";

export default function FunilPage({ params }: { params: Promise<{ funil: string }> }) {
  const { funil } = use(params);
  const state = useData((data) => data);
  const record = state.funnels.find((f) => f.id === funil);
  const { removingStageId, openRemoveStage, closeRemoveStage } = useRemoveStageDialog();
  const { migrating, openMigrate, closeMigrate } = useMigrateFunnelDialog();
  const [notice, setNotice] = useState<string | null>(null);

  if (!record) {
    return (
      <>
        <PageHeader title="Registro não encontrado" />
        <div className="p-6">
          <EmptyState title="Funil não encontrado." hint="Ele pode ter sido eliminado, ou você não tem permissão para vê-lo." />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={record.name}
        seal={<StateSeal state={record.lifecycle} />}
        meta={`${record.stages.length} Etapas · ${state.deals.filter((deal) => deal.funnelId === record.id).length} Negócio(s) · sem Proprietário: a governança é por Papel e por administrar`}
        actions={
          <Button
            onClick={openMigrate}
            disabled={state.funnels.filter((f) => f.id !== record.id && f.lifecycle === "ativo").length === 0}
            disabledReason="Não há outro Funil ativo para receber os Negócios."
          >
            Migrar Negócios
          </Button>
        }
      />
      <div className="p-6">
        {notice ? (
          <div className="mb-4">
            <Toast tone="success" onDismiss={() => setNotice(null)}>
              {notice}
            </Toast>
          </div>
        ) : null}

        <RemoveStageDialog
          funnelId={record.id}
          stageId={removingStageId}
          onClose={closeRemoveStage}
          onDone={setNotice}
        />

        <MigrateFunnelDialog
          funnelId={record.id}
          open={migrating}
          onClose={closeMigrate}
          onDone={setNotice}
        />

        <Section title="Etapas" count={record.stages.length}>
          <ol className="space-y-2">
            {[...record.stages]
              .sort((a, b) => a.order - b.order)
              .map((stage) => (
                <li key={stage.id} className="rounded-[var(--raio-controle)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)]">{stage.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        probabilidade padrão {stage.defaultProbability}% ·{" "}
                        {state.deals.filter((deal) => deal.stageId === stage.id).length} Negócio(s)
                      </span>
                      <Button
                        variant="danger"
                        onClick={() => openRemoveStage(stage.id)}
                        disabled={record.stages.length <= 1}
                        disabledReason="Um Funil precisa de ao menos uma Etapa."
                      >
                        Remover
                      </Button>
                    </span>
                  </div>
                  {stage.requirements.length > 0 ? (
                    <ul className="mt-2 space-y-0.5 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                      {stage.requirements.map((requirement, index) => (
                        <li key={index}>
                          Exigência de {requirement.moment === "entrada" ? "entrada" : "saída"}:{" "}
                          {requirementLabel(state, requirement.kind, requirement.fieldDefinitionId)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">Sem Requisitos de Etapa.</p>
                  )}
                  <p className="mt-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                    {stage.allowedTransitionStageIds.length === 0
                      ? "Transições permitidas: todas."
                      : `Transições permitidas: ${stage.allowedTransitionStageIds
                          .map((id) => record.stages.find((s) => s.id === id)?.name)
                          .filter(Boolean)
                          .join(", ")}`}
                  </p>
                </li>
              ))}
          </ol>
        </Section>
        <Section title="Regras de encerramento">
          <ul className="space-y-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
            <li>Exigir Motivo de Perda ao marcar perdido: {record.closingRules.requireLossReason ? "sim" : "não"}</li>
            <li>Exigir valor ao marcar ganho: {record.closingRules.requireValueOnWin ? "sim" : "não"}</li>
          </ul>
        </Section>
      </div>
    </>
  );
}
