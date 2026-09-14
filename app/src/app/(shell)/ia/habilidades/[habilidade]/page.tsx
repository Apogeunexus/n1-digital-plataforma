"use client";

import { use } from "react";
import { useData } from "@/data/store";
import { EmptyState, PageHeader, Section, StateSeal } from "@/features/shell/ui";

export default function HabilidadePage({ params }: { params: Promise<{ habilidade: string }> }) {
  const { habilidade } = use(params);
  const state = useData((data) => data);
  const record = state.skills.find((s) => s.id === habilidade);

  if (!record) {
    return (
      <>
        <PageHeader title="Registro não encontrado" />
        <div className="p-6">
          <EmptyState title="Habilidade não encontrada." hint="Ele pode ter sido eliminado, ou você não tem permissão para vê-lo." />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={record.name}
        seal={<StateSeal state={record.lifecycle} />}
        meta={"Sem Proprietário: a governança é por Papel e por concessão administrar."}
      />
      <div className="p-6">
        <Section title="Versões" count={record.versions.length}>
          <ul className="space-y-2">
            {record.versions.map((version) => (
              <li key={version.number} className="rounded-[var(--raio-controle)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)]">Versão {version.number}</span>
                  <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">{version.state}</span>
                </div>
                <p className="mt-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">{version.instructions}</p>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Agentes com Concessão" count={state.skillGrants.filter((g) => g.skillId === record.id).length}>
          {state.skillGrants.filter((g) => g.skillId === record.id).length === 0 ? (
            <EmptyState title="Nenhum Agente tem esta Habilidade concedida." />
          ) : (
            <ul className="space-y-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
              {state.skillGrants
                .filter((g) => g.skillId === record.id)
                .map((grant) => (
                  <li key={grant.id}>{state.agents.find((a) => a.id === grant.agentId)?.name}</li>
                ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
