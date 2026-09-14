"use client";

/**
 * T40 — Membros.
 *
 * A6.4 — a Member is never deleted: removal ends participation and preserves
 * historical authorship. B28 — removal IS a succession, so the dialog shows
 * everything that will be transferred and everything that will be released
 * BEFORE the act, and demands a successor who is active and not a Convidado.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { memberCapacityMinutes, setMemberCapacity } from "@/data/operations";
import { useData, useRun, useSession } from "@/data/store";
import { AVAILABILITY_LABEL } from "@/features/shell/format";
import { inviteMember, previewSuccession, removeMember } from "@/data/operations";
import { useFormat } from "@/features/shell/use-format";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Section,
  StateSeal,
} from "@/features/shell/ui";
import {
  TransferOwnershipDialog,
  useTransferOwnershipDialog,
} from "@/features/configuracoes/transfer-ownership-dialog";


const TRANSFER_LABEL: Record<string, string> = {
  contact: "Contato",
  company: "Empresa",
  deal: "Negócio",
  agent: "Agente",
  automation: "Automação",
  panel: "Painel",
  collection: "Coleção",
};

const RELEASE_LABEL: Record<string, string> = {
  task: "Tarefa",
  checklistItem: "Item de Checklist",
  conversation: "Conversa",
};

export default function MembrosPage() {
  const state = useData((data) => data);
  const fmt = useFormat();
  const { memberId } = useSession();
  const run = useRun();
  const router = useRouter();
  const query = useSearchParams();
  /**
   * D04 — a sucessão vive no endereço (`?remover-membro=<membro>`): é o ato de
   * governança mais consequente do produto, e um recarregamento não pode
   * apagar o que já foi lido na prévia.
   */
  const removing = query.get("remover-membro");
  const setRemoving = (value: string | null) => {
    const next = new URLSearchParams(query.toString());
    if (value === null) next.delete("remover-membro");
    else next.set("remover-membro", value);
    router.replace(next.size > 0 ? `?${next}` : "?", { scroll: false });
  };
  const [successorId, setSuccessorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const { transferring, openTransfer, closeTransfer } = useTransferOwnershipDialog();

  const acting = state.members.find((m) => m.id === memberId);
  const actingRole = state.roles.find((r) => r.id === acting?.roleId);
  const mayGovern = actingRole?.base === "administrador" || actingRole?.base === "proprietario";

  const active = state.members.filter((m) => m.state !== "removido");
  const removed = state.members.filter((m) => m.state === "removido");
  const limit = state.workspace.limits.members;
  const atLimit = active.length >= limit;

  const target = removing ? state.members.find((m) => m.id === removing) : undefined;
  const preview = target ? previewSuccession(state, target.id) : null;

  const eligibleSuccessors = state.members.filter((member) => {
    if (member.state !== "ativo") return false;
    if (member.id === removing) return false;
    const role = state.roles.find((r) => r.id === member.roleId);
    return role?.base !== "convidado";
  });

  const invitableRoles = state.roles.filter((role) => role.base !== "proprietario");
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim());

  const confirmInvite = () => {
    const result = run((data, actingId) =>
      inviteMember(data, actingId, { email: inviteEmail, roleId: inviteRoleId || (invitableRoles[0]?.id ?? "") }),
    );
    if (result.ok) {
      setError(null);
      setNotice(`Convite enviado para ${result.value.invitedIdentity?.value}. O Membro entra como pendente e conta para o limite.`);
      setInviting(false);
      setInviteEmail("");
      setInviteRoleId("");
    } else {
      setNotice(null);
      setError(result.error);
    }
  };

  const confirmRemoval = () => {
    if (!target) return;
    const result = run((data, actingId) => removeMember(data, actingId, target.id, successorId));
    if (result.ok) {
      setError(null);
      setNotice(`Participação de ${target.displayName} encerrada; a autoria histórica permanece.`);
      setRemoving(null);
      setSuccessorId("");
    } else {
      setNotice(null);
      setError(result.error);
    }
  };

  return (
    <>
      <PageHeader
        path={
          <Link href="/configuracoes" className="hover:underline">
            Configurações
          </Link>
        }
        title="Membros"
        meta={`${active.length} de ${limit} participações · ${removed.length} encerrada(s)`}
        actions={
          <>
            <Button
              onClick={openTransfer}
              disabled={state.workspace.ownerMemberId !== memberId}
              disabledReason="Só o Proprietário do Espaço de Trabalho transfere a propriedade."
            >
              Transferir propriedade
            </Button>
          <Button
            variant="primary"
            onClick={() => {
              setInviting(true);
              setError(null);
            }}
            disabled={!mayGovern || atLimit}
            disabledReason={
              !mayGovern
                ? "Só um Administrador ou o Proprietário convida um Membro."
                : `O limite de ${limit} Membros do Espaço de Trabalho foi atingido.`
            }
          >
            Convidar Membro
          </Button>
          </>
        }
      />

      <TransferOwnershipDialog open={transferring} onClose={closeTransfer} onDone={setNotice} />

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

        {inviting ? (
          <div className="mb-6 rounded-[var(--raio-superficie)] border border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)] p-4">
            <h2 className="text-[length:var(--texto-base)] font-semibold text-[var(--cor-tinta)]">Convidar Membro</h2>
            <p className="mt-1 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
              O convite é dirigido a um e-mail. O Membro entra como <em>pendente</em>, já conta para o
              limite do Espaço de Trabalho e só age depois de aceitar.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-[length:var(--texto-base)]">
                <span className="block text-[var(--cor-tinta)]">E-mail</span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="pessoa@empresa.com.br"
                  className="mt-1 w-full rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] px-2 py-1.5 text-[length:var(--texto-base)]"
                />
              </label>
              <label className="text-[length:var(--texto-base)]">
                <span className="block text-[var(--cor-tinta)]">Papel</span>
                <select
                  value={inviteRoleId || (invitableRoles[0]?.id ?? "")}
                  onChange={(event) => setInviteRoleId(event.target.value)}
                  className="mt-1 w-full rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)] px-2 py-1.5 text-[length:var(--texto-base)]"
                >
                  {invitableRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                      {role.system ? " (sistema)" : ` (teto ${role.base})`}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                  O Papel de Proprietário não se concede por convite: muda por transferência de
                  propriedade.
                </span>
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="primary"
                onClick={confirmInvite}
                disabled={!emailValid}
                disabledReason="Informe um e-mail válido antes de enviar o convite."
              >
                Enviar convite
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setInviting(false);
                  setInviteEmail("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
        {target && preview ? (
          <ConfirmDialog
            open={target !== undefined && preview !== null}
            title={`Remover ${target?.displayName ?? "Membro"}`}
            description="O Membro não é apagado: a autoria de tudo o que ele fez continua registrada. O que ele possuía passa ao Sucessor; o que ele apenas atendia é liberado."
            confirmLabel="Remover Membro"
            destructive
            {...(successorId === ""
              ? { confirmDisabledReason: "Escolha o Sucessor antes de remover o Membro." }
              : {})}
            onConfirm={confirmRemoval}
            onCancel={() => {
              setRemoving(null);
              setSuccessorId("");
            }}
          >
            <div className="grid gap-3">
              <h2 className="text-[length:var(--texto-base)] font-semibold text-[var(--cor-tinta-fraca)]">
                Encerrar a participação de {target.displayName}
              </h2>
              <p className="mt-1 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                O Membro não é apagado: a autoria de tudo o que ele fez continua registrada. O que ele
                possuía passa ao Sucessor; o que ele apenas atendia é liberado.
              </p>
  
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[length:var(--texto-sm)] font-medium uppercase tracking-wide text-[var(--cor-tinta-fraca)]">
                    Passa ao Sucessor ({preview.transfers.length})
                  </p>
                  {preview.transfers.length === 0 ? (
                    <p className="mt-1 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">Nada a transferir.</p>
                  ) : (
                    <ul className="relative mt-1 max-h-40 space-y-0.5 overflow-y-auto text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                      {preview.transfers.map((item) => (
                        <li key={`${item.type}-${item.id}`}>
                          {TRANSFER_LABEL[item.type] ?? item.type}: {item.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-[length:var(--texto-sm)] font-medium uppercase tracking-wide text-[var(--cor-tinta-fraca)]">
                    Fica sem Responsável ({preview.releases.length})
                  </p>
                  {preview.releases.length === 0 ? (
                    <p className="mt-1 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">Nada a liberar.</p>
                  ) : (
                    <ul className="relative mt-1 max-h-40 space-y-0.5 overflow-y-auto text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                      {preview.releases.map((item) => (
                        <li key={`${item.type}-${item.id}`}>
                          {RELEASE_LABEL[item.type] ?? item.type}: {item.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
  
              <ul className="mt-3 space-y-0.5 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                <li>{preview.pendingApprovals} Solicitação(ões) de Aprovação passam ao Sucessor.</li>
                <li>
                  {preview.privateContainerGrants} Concessão(ões) sobre contêineres privados passam ao
                  Sucessor.
                </li>
                <li>{preview.chatSessions} Sessão(ões) de Chat deixam de ser acessíveis.</li>
              </ul>
  
              <label className="mt-3 block text-[length:var(--texto-base)]">
                <span className="block font-medium text-[var(--cor-tinta-fraca)]">Sucessor</span>
                <select
                  value={successorId}
                  onChange={(event) => setSuccessorId(event.target.value)}
                  className="mt-1 w-full max-w-sm rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)] px-2 py-1.5 text-[length:var(--texto-base)] text-[var(--cor-tinta)]"
                >
                  <option value="">Escolher Sucessor</option>
                  {eligibleSuccessors.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName} · {state.roles.find((r) => r.id === member.roleId)?.name}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                  Precisa ser um Membro ativo e não pode ter Papel de base Convidado.
                </span>
              </label>
            </div>
          </ConfirmDialog>
        ) : null}

        <Section title="Participações" count={active.length}>
          <div className="overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
            <table className="w-full text-[length:var(--texto-base)]">
              <thead className="border-b border-[var(--cor-traco)] bg-[var(--cor-superficie-2)] text-left">
                <tr>
                  <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Membro</th>
                  <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Papel</th>
                  <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Estado</th>
                  <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Disponibilidade</th>
                  <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Entrou</th>
                  <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Capacidade/sem</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--cor-traco)]">
                {active.map((member) => {
                  const role = state.roles.find((r) => r.id === member.roleId);
                  const isOwner = state.workspace.ownerMemberId === member.id;
                  return (
                    <tr key={member.id} className="hover:bg-[var(--cor-superficie-2)]">
                      <td className="px-3 py-2">
                        <Link
                          href={`/configuracoes/membros/${member.id}`}
                          className="font-medium text-[var(--cor-tinta)] hover:underline"
                        >
                          {member.displayName}
                        </Link>
                        {member.invitedIdentity ? (
                          <span className="block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                            {member.invitedIdentity.value}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-[var(--cor-tinta)]">
                        {role?.name ?? "—"}
                        {isOwner ? <span className="block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">Proprietário</span> : null}
                      </td>
                      <td className="px-3 py-2">
                        <StateSeal state={member.state} />
                        {member.state === "ativo" ? (
                          <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">ativo</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-[var(--cor-tinta)]">
                        {AVAILABILITY_LABEL[member.availability.value] ?? member.availability.value}
                      </td>
                      <td className="px-3 py-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        {member.joinedAt ? fmt.instant(member.joinedAt) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <CapacityEditor
                          memberId={member.id}
                          editavel={member.state === "ativo" && (mayGovern || member.id === memberId)}
                          onResult={(result, message) => {
                            if (result.ok) {
                              setError(null);
                              setNotice(message);
                            } else {
                              setNotice(null);
                              setError(result.error ?? "Não foi possível concluir a operação.");
                            }
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setRemoving(member.id);
                            setSuccessorId("");
                            setError(null);
                          }}
                          disabled={!mayGovern || isOwner || member.id === memberId}
                          disabledReason={
                            isOwner
                              ? "Transfira a propriedade do Espaço de Trabalho antes de remover este Membro. Use “Transferir propriedade” no cabeçalho."
                              : member.id === memberId
                                ? "Você não encerra a própria participação por aqui."
                                : "Só um Administrador ou o Proprietário encerra uma participação."
                          }
                        >
                          Encerrar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Participações encerradas" count={removed.length}>
          {removed.length === 0 ? (
            <EmptyState title="Nenhuma participação encerrada." />
          ) : (
            <ul className="divide-y divide-[var(--cor-traco)] overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
              {removed.map((member) => {
                const successor = state.members.find((m) => m.id === member.successorId);
                return (
                  <li key={member.id} className="flex items-center justify-between gap-3 px-4 py-2">
                    <Link
                      href={`/configuracoes/membros/${member.id}`}
                      className="text-[length:var(--texto-base)] text-[var(--cor-tinta)] hover:underline"
                    >
                      {member.displayName}
                    </Link>
                    <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                      {member.removedAt ? fmt.instant(member.removedAt) : ""}
                      {successor ? ` · sucedido por ${successor.displayName}` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
            A autoria histórica permanece: quem foi removido continua aparecendo em todo Registro de
            Atividade que criou.
          </p>
        </Section>
      </div>
    </>
  );
}

/**
 * Fase 3 — capacidade semanal em horas, gravada em minutos. Só o próprio ou
 * quem governa edita; o resto lê.
 */
function CapacityEditor({
  memberId,
  editavel,
  onResult,
}: {
  readonly memberId: string;
  readonly editavel: boolean;
  readonly onResult: (result: { ok: boolean; error?: string }, message: string) => void;
}) {
  const run = useRun();
  const minutos = useData((data) => memberCapacityMinutes(data, memberId));
  const [horas, setHoras] = useState(String(minutos / 60));
  const valor = Number(horas.replace(",", "."));
  const valido = horas.trim() !== "" && Number.isFinite(valor) && valor >= 0 && valor <= 168;
  const gravar = () => {
    if (!valido) {
      onResult({ ok: false, error: "A capacidade é em horas por semana, de 0 a 168." }, "");
      setHoras(String(minutos / 60));
      return;
    }
    if (Math.round(valor * 60) !== minutos) {
      onResult(run((data, me) => setMemberCapacity(data, me, memberId, Math.round(valor * 60))), "Capacidade semanal alterada.");
    }
  };
  if (!editavel) return <span className="text-[var(--cor-tinta)]">{minutos / 60} h</span>;
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        gravar();
      }}
    >
      <label className="sr-only" htmlFor={`capacidade-${memberId}`}>
        Capacidade semanal em horas
      </label>
      <input
        id={`capacidade-${memberId}`}
        type="number"
        min={0}
        max={168}
        step={0.5}
        value={horas}
        onChange={(event) => setHoras(event.target.value)}
        onBlur={gravar}
        aria-invalid={!valido}
        className="w-16 rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] bg-[var(--cor-papel)] px-2 py-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]"
      />
      <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">h</span>
    </form>
  );
}
