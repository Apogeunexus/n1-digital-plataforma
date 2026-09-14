"use client";

/**
 * T42 — Equipes.
 *
 * RN-ET-12 — only `ativo` or `suspenso` Members belong to a Team. A Team grants
 * permission to several people at once; it never replaces the Papel, and it is
 * not a hierarchy.
 */

import Link from "next/link";
import { useData } from "@/data/store";
import { useFormat } from "@/features/shell/use-format";
import { EmptyState, PageHeader, Section } from "@/features/shell/ui";

export default function EquipesPage() {
  const state = useData((data) => data);
  const fmt = useFormat();
  const teams = state.teams;

  return (
    <>
      <PageHeader
        path={
          <Link href="/configuracoes" className="hover:underline">
            Configurações
          </Link>
        }
        title="Equipes"
        meta="Agrupam Membros para conceder permissão de uma vez. Não substituem o Papel nem formam hierarquia."
      />

      <div className="p-6">
        {teams.length === 0 ? (
          <EmptyState
            title="Nenhuma Equipe."
            hint="Crie uma Equipe quando um mesmo conjunto de Membros precisar receber a mesma permissão repetidas vezes."
          />
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {teams.map((team) => {
              const members = team.memberIds
                .map((id) => state.members.find((m) => m.id === id))
                .filter((member) => member !== undefined);
              const queues = state.queues.filter((queue) => queue.eligibleTeamIds.includes(team.id));
              const grants = state.grants.filter(
                (grant) => grant.subjectKind === "team" && grant.subjectId === team.id,
              );
              return (
                <li key={team.id} className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-[length:var(--texto-base)] font-semibold text-[var(--cor-tinta)]">{team.name}</h2>
                      {team.description ? (
                        <p className="mt-0.5 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">{team.description}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                      criada em {fmt.instant(team.createdAt)}
                    </span>
                  </div>

                  <Section title="Membros" count={members.length}>
                    {members.length === 0 ? (
                      <EmptyState
                        title="Equipe sem Membros."
                        hint="Uma Equipe vazia não concede nada a ninguém."
                      />
                    ) : (
                      <ul className="flex flex-wrap gap-1">
                        {members.map((member) => (
                          <li key={member.id}>
                            <Link
                              href={`/configuracoes/membros/${member.id}`}
                              className="rounded-full bg-[var(--cor-superficie-2)] px-2 py-0.5 text-[length:var(--texto-sm)] text-[var(--cor-tinta)] hover:bg-[var(--cor-traco)]"
                            >
                              {member.displayName}
                              {member.state === "suspenso" ? " · suspenso" : ""}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Section>

                  <div className="mt-3 space-y-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                    <p>
                      {grants.length === 0
                        ? "Nenhuma Concessão direta a esta Equipe."
                        : `${grants.length} Concessão(ões) direta(s) sobre Recursos.`}
                    </p>
                    <p>
                      {queues.length === 0
                        ? "Não é elegível em nenhuma Fila."
                        : `Elegível em: ${queues.map((queue) => queue.name).join(", ")}.`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
