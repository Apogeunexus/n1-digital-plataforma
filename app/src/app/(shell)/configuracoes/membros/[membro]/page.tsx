"use client";

/**
 * T41 — Membro.
 *
 * A6.4 — a removed Member keeps historical authorship, so this screen exists
 * for them too: it just stops offering actions and says why.
 *
 * C32, alternativa (b) — demoting to a Convidado-base role means the Member can
 * no longer own anything, so the demotion requires a transfer in the same act
 * and reuses the succession dialog. Registered in PENDENCIAS-FRONTEND.
 */

import Link from "next/link";
import { use, useState } from "react";
import { useData, useRun, useSession } from "@/data/store";
import { previewSuccession } from "@/data/operations";
import { useFormat } from "@/features/shell/use-format";
import { AVAILABILITY_LABEL, PERMISSION_ORIGIN_LABEL, RESOURCE_TYPE_LABEL } from "@/features/shell/format";
import { EmptyState, PageHeader, Section, StateSeal } from "@/features/shell/ui";


const OWNED_LABEL: Record<string, string> = {
  contact: "Contatos",
  company: "Empresas",
  deal: "Negócios",
  agent: "Agentes",
  automation: "Automações",
  panel: "Painéis",
  collection: "Coleções",
};

export default function MembroPage({ params }: { params: Promise<{ membro: string }> }) {
  const { membro } = use(params);
  const state = useData((data) => data);
  const fmt = useFormat();
  const { memberId } = useSession();
  const run = useRun();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const member = state.members.find((m) => m.id === membro);

  if (!member) {
    return (
      <>
        <PageHeader title="Membro não encontrado" />
        <div className="p-6">
          <EmptyState
            title="Membro não encontrado."
            hint="Este identificador não existe neste Espaço de Trabalho."
          />
        </div>
      </>
    );
  }

  const acting = state.members.find((m) => m.id === memberId);
  const actingRole = state.roles.find((r) => r.id === acting?.roleId);
  const mayGovern = actingRole?.base === "administrador" || actingRole?.base === "proprietario";

  const role = state.roles.find((r) => r.id === member.roleId);
  const isOwner = state.workspace.ownerMemberId === member.id;
  const removed = member.state === "removido";
  const preview = previewSuccession(state, member.id);
  const teams = state.teams.filter((team) => team.memberIds.includes(member.id));
  const queues = state.queues.filter(
    (queue) =>
      queue.eligibleMemberIds.includes(member.id) ||
      queue.eligibleTeamIds.some((teamId) => teams.some((team) => team.id === teamId)),
  );
  const grants = state.grants.filter(
    (grant) => grant.subjectKind === "member" && grant.subjectId === member.id,
  );
  const activity = state.activity.filter(
    (record) => record.actor.kind === "member" && record.actor.id === member.id,
  );
  const successor = state.members.find((m) => m.id === member.successorId);

  const owned = preview.transfers.reduce<Record<string, number>>((counts, item) => {
    counts[item.type] = (counts[item.type] ?? 0) + 1;
    return counts;
  }, {});

  const changeRole = (roleId: string) => {
    const nextRole = state.roles.find((r) => r.id === roleId);
    if (!nextRole) return;
    if (nextRole.base === "convidado" && preview.transfers.length > 0) {
      setNotice(null);
      setError(
        `Rebaixar para um Papel de base Convidado exige transferir ${preview.transfers.length} registro(s) de propriedade no mesmo ato. Encerre a participação com Sucessor ou transfira a propriedade antes.`,
      );
      return;
    }
    run((data) => {
      const stored = data.members.find((m) => m.id === member.id);
      if (stored) stored.roleId = roleId;
      return { ok: true as const, value: undefined };
    });
    setError(null);
    setNotice(`Papel alterado para ${nextRole.name}.`);
  };

  return (
    <>
      <PageHeader
        path={
          <>
            <Link href="/configuracoes" className="hover:underline">
              Configurações
            </Link>
            {" › "}
            <Link href="/configuracoes/membros" className="hover:underline">
              Membros
            </Link>
          </>
        }
        title={member.displayName}
        seal={<StateSeal state={member.state} />}
        meta={
          <span className="flex flex-wrap items-center gap-3">
            <span>{role?.name ?? "Papel não encontrado"}</span>
            {isOwner ? <span>Proprietário do Espaço de Trabalho</span> : null}
            <span>{AVAILABILITY_LABEL[member.availability.value] ?? member.availability.value}</span>
            <span>{activity.length} Registro(s) de Atividade</span>
          </span>
        }
      />

      {removed ? (
        <p className="border-b border-[var(--cor-traco)] bg-[var(--cor-superficie-2)] px-6 py-2 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
          Participação encerrada
          {member.removedAt ? ` em ${fmt.instant(member.removedAt)}` : ""}
          {successor ? `, sucedida por ${successor.displayName}` : ""}. A autoria histórica permanece e
          nada aqui é editável.
        </p>
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

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Section title="Papel">
              <label className="block text-[length:var(--texto-base)]">
                <span className="block text-[var(--cor-tinta)]">Papel neste Espaço de Trabalho</span>
                <select
                  value={member.roleId}
                  onChange={(event) => changeRole(event.target.value)}
                  disabled={!mayGovern || removed || isOwner}
                  className="mt-1 w-full max-w-sm rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)] px-2 py-1.5 text-[length:var(--texto-base)] disabled:bg-[var(--cor-superficie-2)] disabled:text-[var(--cor-tinta-fraca)]"
                >
                  {state.roles.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                      {option.system ? " (sistema)" : ` (teto ${option.base})`}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                {isOwner
                  ? "O Papel do Proprietário muda pela transferência de propriedade, não por aqui."
                  : removed
                    ? "Uma participação encerrada não muda de Papel."
                    : !mayGovern
                      ? "Só um Administrador ou o Proprietário muda o Papel de um Membro."
                      : "Um Papel personalizado nunca ultrapassa o teto do Papel de sistema que declara como base."}
              </p>
            </Section>

            <Section title="O que este Membro possui" count={preview.transfers.length}>
              {preview.transfers.length === 0 ? (
                <EmptyState
                  title="Este Membro não é Proprietário de nada."
                  hint="Encerrar a participação não transferiria nenhum registro."
                />
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(owned).map(([type, count]) => (
                    <li
                      key={type}
                      className="flex items-center justify-between rounded-[var(--raio-controle)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] px-3 py-2 text-[length:var(--texto-base)]"
                    >
                      <span className="text-[var(--cor-tinta)]">{OWNED_LABEL[type] ?? type}</span>
                      <span className="font-medium text-[var(--cor-tinta)]">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                Encerrar a participação transfere tudo isto ao Sucessor, e libera{" "}
                {preview.releases.length} atribuição(ões) sem Responsável.{" "}
                <Link href="/configuracoes/membros" className="underline">
                  Encerrar a partir da lista de Membros
                </Link>
                .
              </p>
            </Section>

            <Section title="Atividade recente" count={activity.length}>
              {activity.length === 0 ? (
                <EmptyState title="Nenhum Registro de Atividade deste Membro." />
              ) : (
                <ul className="space-y-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                  {activity.slice(0, 15).map((record) => (
                    <li key={record.id}>
                      <span className="text-[var(--cor-tinta-fraca)]">{fmt.instant(record.at)}</span> · {record.action}
                      {record.objectName ? ` · ${record.objectName}` : ""}
                    </li>
                  ))}
                </ul>
              )}
              {activity.length > 15 ? (
                <p className="mt-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                  Mostrando 15 de {activity.length}.{" "}
                  <Link href="/configuracoes/auditoria" className="underline">
                    Ver tudo na Auditoria
                  </Link>
                  .
                </p>
              ) : null}
            </Section>
          </div>

          <aside>
            <Section title="Participação">
              <dl className="space-y-2 rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4 text-[length:var(--texto-base)]">
                <Row label="Estado">{member.state}</Row>
                <Row label="Entrou em">{member.joinedAt ? fmt.instant(member.joinedAt) : "—"}</Row>
                <Row label="Convidado por">
                  {state.members.find((m) => m.id === member.invitedBy)?.displayName ?? "—"}
                </Row>
                <Row label="Identidade do convite">{member.invitedIdentity?.value ?? "—"}</Row>
                <Row label="Removido em">{member.removedAt ? fmt.instant(member.removedAt) : "—"}</Row>
                <Row label="Sucessor">{successor?.displayName ?? "—"}</Row>
              </dl>
            </Section>

            <Section title="Equipes" count={teams.length}>
              {teams.length === 0 ? (
                <EmptyState title="Não está em nenhuma Equipe." />
              ) : (
                <ul className="space-y-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                  {teams.map((team) => (
                    <li key={team.id}>{team.name}</li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Filas elegíveis" count={queues.length}>
              {queues.length === 0 ? (
                <EmptyState title="Não é elegível em nenhuma Fila." />
              ) : (
                <ul className="space-y-1 text-[length:var(--texto-base)]">
                  {queues.map((queue) => (
                    <li key={queue.id}>
                      <Link
                        href={`/crm/caixa-de-entrada/configuracoes/filas/${queue.id}`}
                        className="text-[var(--cor-tinta)] hover:underline"
                      >
                        {queue.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Concessões diretas" count={grants.length}>
              {grants.length === 0 ? (
                <EmptyState
                  title="Nenhuma Concessão direta."
                  hint="Toda permissão deste Membro vem do Papel, da herança ou da elegibilidade de Fila."
                />
              ) : (
                <ul className="space-y-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta)]">
                  {grants.map((grant) => (
                    <li key={grant.id}>
                      {grant.action} em {RESOURCE_TYPE_LABEL[grant.resourceType] ?? grant.resourceType} · escopo{" "}
                      {grant.scope === "subarvore" ? "subárvore" : grant.scope} · origem:{" "}
                      {PERMISSION_ORIGIN_LABEL[grant.origin] ?? grant.origin}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Memória de Usuário">
              <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                {member.userMemory.enabled ? "Ativa" : "Desativada"} ·{" "}
                {member.userMemory.items.filter((item) => item.state === "ativo").length} item(ns) ativo(s).
              </p>
              <p className="mt-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                É interna ao Membro e só ele a lê. Não aparece aqui em conteúdo.
              </p>
            </Section>
          </aside>
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
