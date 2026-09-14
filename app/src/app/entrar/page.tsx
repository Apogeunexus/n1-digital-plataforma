"use client";

/**
 * T01 — choose the Member that simulates the session.
 *
 * The ontology distinguishes Usuário (global identity that authenticates) from
 * Membro (the relation with a workspace) — A1.4 — and this prototype simulates
 * only the second. Registered in PENDENCIAS-FRONTEND, A2.
 */

import { useRouter } from "next/navigation";
import { useData, useSession } from "@/data/store";
import { StateSeal } from "@/features/shell/ui";

export default function EntrarPage() {
  const router = useRouter();
  const { setMemberId } = useSession();
  const workspace = useData((data) => data.workspace);
  const members = useData((data) => data.members);
  const roles = useData((data) => data.roles);

  const enter = (memberId: string) => {
    setMemberId(memberId);
    router.push("/");
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold text-[var(--cor-tinta)]">{workspace.name}</h1>
      <p className="mt-1 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
        Escolha o Membro que vai simular a sessão. Trocar de Membro muda tudo o que se vê: as
        permissões são reais.
      </p>

      <ul className="mt-6 divide-y divide-[var(--cor-traco)] overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
        {members.map((member) => {
          const role = roles.find((r) => r.id === member.roleId);
          // RN-ET-08 / A6.4 — `pendente` and `removido` do not act.
          const canEnter = member.state === "ativo" || member.state === "suspenso";
          const reason =
            member.state === "pendente"
              ? "Convite não aceito."
              : member.state === "removido"
                ? "Participação encerrada; a autoria histórica permanece."
                : member.state === "suspenso"
                  ? "Participação suspensa: entra apenas em leitura."
                  : "";
          return (
            <li key={member.id}>
              <button
                type="button"
                onClick={() => enter(member.id)}
                disabled={!canEnter}
                title={canEnter ? undefined : reason}
                aria-disabled={!canEnter}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--cor-superficie-2)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[var(--cor-superficie)]"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--cor-traco)] text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)]">
                  {member.displayName
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-[var(--cor-tinta)]">{member.displayName}</span>
                    <StateSeal state={member.state} />
                  </span>
                  <span className="block text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                    {role?.name}
                    {reason ? ` · ${reason}` : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
        A autenticação de Usuário não faz parte deste protótipo: não há backend. A escolha do Membro
        é estado da aplicação e não é gravada.
      </p>
    </main>
  );
}
