"use client";

/**
 * T03 — Minha Conta.
 *
 * A1.4 — Usuário and Membro are different things. This screen shows the Membro,
 * which is what this prototype simulates; the Usuário identity that would
 * authenticate has no backend here (PENDENCIAS-FRONTEND, A2).
 *
 * B86 — the Memória de Usuário is internal to the Member: it never retains
 * third-party data, and disabling it stops new items without erasing history.
 */

import Link from "next/link";
import { useData, useSession } from "@/data/store";
import { AVAILABILITY_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import { EmptyState, PageHeader, Section, StateSeal } from "@/features/shell/ui";


const AVAILABILITY_ORIGIN_LABEL: Record<string, string> = {
  membro: "definida pelo Membro",
  automacao: "definida por Automação",
  horarioDeAtendimento: "definida pelo horário de atendimento",
};

export default function MinhaContaPage() {
  const state = useData((data) => data);
  const fmt = useFormat();
  const { memberId } = useSession();
  const member = state.members.find((m) => m.id === memberId);

  if (!member) {
    return (
      <>
        <PageHeader title="Membro não encontrado" />
        <div className="p-6">
          <EmptyState
            title="Nenhum Membro nesta sessão."
            hint="Escolha um Membro para simular a sessão."
            action={
              <Link href="/entrar" className="text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)] underline">
                Trocar de Membro
              </Link>
            }
          />
        </div>
      </>
    );
  }

  const role = state.roles.find((r) => r.id === member.roleId);
  const teams = state.teams.filter((team) => team.memberIds.includes(member.id));
  const queues = state.queues.filter(
    (queue) =>
      queue.eligibleMemberIds.includes(member.id) ||
      queue.eligibleTeamIds.some((teamId) => teams.some((team) => team.id === teamId)),
  );
  const activeItems = member.userMemory.items.filter((item) => item.state === "ativo");
  const isOwner = state.workspace.ownerMemberId === member.id;

  return (
    <>
      <PageHeader
        title={member.displayName}
        seal={<StateSeal state={member.state} />}
        meta={
          <span className="flex flex-wrap items-center gap-3">
            <span>{role?.name ?? "Papel não encontrado"}</span>
            {isOwner ? <span>Proprietário do Espaço de Trabalho</span> : null}
            <span>{AVAILABILITY_LABEL[member.availability.value] ?? member.availability.value}</span>
          </span>
        }
        actions={
          <Link
            href="/entrar"
            className="rounded-[var(--raio-controle)] bg-[var(--cor-superficie)] px-3 py-1.5 text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)] ring-1 ring-inset ring-[var(--cor-traco-forte)] hover:bg-[var(--cor-superficie-2)]"
          >
            Trocar de Membro
          </Link>
        }
      />

      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Memória de Usuário" count={activeItems.length}>
            <p className="mb-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
              {member.userMemory.enabled
                ? "Ativa: o que você conta ao Chat pode virar um item aqui. Nada de terceiros é guardado."
                : "Desativada: nenhum item novo é criado. Os existentes continuam registrados."}
            </p>
            {member.userMemory.items.length === 0 ? (
              <EmptyState
                title="Nenhum item de memória."
                hint="Um item nasce de uma Sessão de Chat ou de algo que você registra diretamente."
              />
            ) : (
              <ul className="divide-y divide-[var(--cor-traco)] overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
                {member.userMemory.items.map((item) => (
                  <li key={item.id} className="px-4 py-2">
                    <p
                      className={`text-[length:var(--texto-base)] ${item.state === "ativo" ? "text-[var(--cor-tinta)]" : "text-[var(--cor-tinta-fraca)] line-through"}`}
                    >
                      {item.content}
                    </p>
                    <p className="mt-0.5 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                      {item.origin.kind === "sessao" ? "de uma Sessão de Chat" : "registrado por você"} ·{" "}
                      {fmt.instant(item.createdAt)}
                      {item.state === "desativado" ? " · desativado" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Equipes" count={teams.length}>
            {teams.length === 0 ? (
              <EmptyState
                title="Você não está em nenhuma Equipe."
                hint="A Equipe agrupa Membros para conceder permissão de uma vez; não substitui o Papel."
              />
            ) : (
              <ul className="space-y-1">
                {teams.map((team) => (
                  <li key={team.id}>
                    <Link
                      href="/configuracoes/equipes"
                      className="flex items-center justify-between rounded-[var(--raio-controle)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] px-3 py-2 text-[length:var(--texto-base)] hover:border-[var(--cor-traco-forte)]"
                    >
                      <span className="text-[var(--cor-tinta)]">{team.name}</span>
                      <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">{team.memberIds.length} Membro(s)</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Filas em que você é elegível" count={queues.length}>
            {queues.length === 0 ? (
              <EmptyState
                title="Você não é elegível em nenhuma Fila."
                hint="A elegibilidade concede ver as Conversas que passam pela Fila — e nada além."
              />
            ) : (
              <ul className="space-y-1">
                {queues.map((queue) => (
                  <li key={queue.id}>
                    <Link
                      href={`/crm/caixa-de-entrada/configuracoes/filas/${queue.id}`}
                      className="block rounded-[var(--raio-controle)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-tinta)] hover:border-[var(--cor-traco-forte)]"
                    >
                      {queue.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <aside>
          <Section title="Participação">
            <dl className="space-y-2 rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4 text-[length:var(--texto-base)]">
              <Row label="Papel">{role?.name ?? "—"}</Row>
              <Row label="Papel de sistema">{role?.system ? "sim" : `não · teto ${role?.base}`}</Row>
              <Row label="Entrou em">{member.joinedAt ? fmt.instant(member.joinedAt) : "—"}</Row>
              <Row label="Convidado por">
                {state.members.find((m) => m.id === member.invitedBy)?.displayName ?? "—"}
              </Row>
              <Row label="Disponibilidade">
                {AVAILABILITY_LABEL[member.availability.value] ?? member.availability.value}
                <span className="block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                  {AVAILABILITY_ORIGIN_LABEL[member.availability.origin] ?? member.availability.origin}
                </span>
              </Row>
            </dl>
          </Section>

          <Section title="Espaço de Trabalho">
            <dl className="space-y-2 rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4 text-[length:var(--texto-base)]">
              <Row label="Nome">{state.workspace.name}</Row>
              <Row label="Fuso horário">{state.workspace.locale.timezone}</Row>
              <Row label="Moeda">{state.workspace.locale.currency}</Row>
              <Row label="Idioma">{state.workspace.locale.language}</Row>
            </dl>
            <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
              Usuário e Membro são coisas distintas: a identidade que autentica não faz parte deste
              protótipo.
            </p>
          </Section>
        </aside>
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
