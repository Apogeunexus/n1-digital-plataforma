"use client";

/**
 * T48 — Integrações.
 *
 * A8 — an Integration is a configured connection with an external system, and
 * the Tools it exposes are what an Agent may end up calling. B35 — who
 * configured it is traceability, never governance: the Integration has no
 * Proprietário, so nobody "owns" the connection.
 */

import Link from "next/link";
import { useData } from "@/data/store";
import { EFFECT_CLASS_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import { ConditionMarker, EmptyState, PageHeader, Section } from "@/features/shell/ui";

const STATE_LABEL: Record<string, string> = {
  conectada: "conectada",
  desconectada: "desconectada",
  comErro: "com erro",
};

export default function IntegracoesPage() {
  const state = useData((data) => data);
  const fmt = useFormat();
  const integrations = state.integrations;
  const broken = integrations.filter((integration) => integration.state !== "conectada");

  return (
    <>
      <PageHeader
        path={
          <Link href="/configuracoes" className="hover:underline">
            Configurações
          </Link>
        }
        title="Integrações"
        meta="Conexões com sistemas externos e as Ferramentas que elas colocam ao alcance de um Agente."
      />

      <div className="p-6">
        {broken.length > 0 ? (
          <p className="mb-6 rounded-[var(--raio-controle)] bg-[var(--cor-atencao-fraco)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-atencao-texto)]">
            {broken.length} Integração(ões) fora do ar. Toda Ferramenta que dependa delas falha na Execução,
            e a falha fica registrada no passo — nada é descartado em silêncio.
          </p>
        ) : null}

        {integrations.length === 0 ? (
          <EmptyState
            title="Nenhuma Integração configurada."
            hint="Sem Integração, um Agente só alcança as Ferramentas internas do Espaço de Trabalho."
          />
        ) : (
          <Section title="Integrações" count={integrations.length}>
            <ul className="grid gap-3 lg:grid-cols-2">
              {integrations.map((integration) => {
                const configuredBy = state.members.find((m) => m.id === integration.configuredBy);
                const tools = state.tools.filter((tool) =>
                  integration.exposedTools.includes(tool.id),
                );
                const usedBySkills = state.skills.filter((skill) =>
                  skill.versions.some((version) =>
                    version.toolRequirements.some((requirement) =>
                      integration.exposedTools.includes(requirement.toolId),
                    ),
                  ),
                );
                return (
                  <li key={integration.id} className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)]">{integration.name}</p>
                        <p className="mt-0.5 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">{integration.systemType}</p>
                      </div>
                      {integration.state === "conectada" ? (
                        <span className="shrink-0 rounded bg-[var(--cor-sucesso-fraco)] px-1.5 py-0.5 text-[length:var(--texto-sm)] text-[var(--cor-sucesso-texto)]">
                          conectada
                        </span>
                      ) : (
                        <ConditionMarker tone={integration.state === "comErro" ? "danger" : "warning"}>
                          {STATE_LABEL[integration.state]}
                        </ConditionMarker>
                      )}
                    </div>

                    <div className="mt-3">
                      <p className="text-[length:var(--texto-sm)] font-medium uppercase tracking-wide text-[var(--cor-tinta-fraca)]">
                        Ferramentas expostas ({integration.exposedTools.length})
                      </p>
                      {integration.exposedTools.length === 0 ? (
                        <p className="mt-1 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">Nenhuma.</p>
                      ) : (
                        <ul className="mt-1 space-y-0.5 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                          {integration.exposedTools.map((toolId) => {
                            const tool = tools.find((t) => t.id === toolId);
                            return (
                              <li key={toolId}>
                                {tool?.name ?? toolId}
                                {tool ? (
                                  <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                                    {" "}
                                    · classe de efeito {EFFECT_CLASS_LABEL[tool.effectClass] ?? tool.effectClass}
                                  </span>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    <p className="mt-3 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                      configurada por {configuredBy?.displayName ?? "Membro não encontrado"} em{" "}
                      {fmt.instant(integration.createdAt)} · sem Proprietário: configurar é
                      rastreabilidade, não governança
                    </p>
                    {usedBySkills.length > 0 ? (
                      <p className="mt-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        Usada por {usedBySkills.length} Habilidade(s):{" "}
                        {usedBySkills.map((skill) => skill.name).join(", ")}.
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}
      </div>
    </>
  );
}
