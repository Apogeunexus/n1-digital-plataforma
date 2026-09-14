"use client";

/**
 * T14 — Contato, em três colunas.
 *
 * A coluna do meio é a CONVERSA COM A PESSOA, e é o mesmo componente que o
 * Negócio usa: a troca de mensagens não pode divergir entre as duas telas.
 *
 * A coluna da esquerda é TUDO QUE SABEMOS e o que é interno: Identificadores,
 * Tags, campos, Consentimentos, Notas e Tarefas. Nota é Comentário, não
 * Mensagem: ela não sai da plataforma.
 *
 * A coluna da direita são as associações, com contagem.
 */

import {
  Building2,
  Plus,
  ShieldCheck,
  StickyNote,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { useData, useRun } from "@/data/store";
import { ConversationThread } from "@/features/crm/conversation-thread";
import {
  ContactDataPanel,
  ContactIdentity,
  ContactQuickActions,
  ContactSummary,
  ContactTags,
} from "@/features/crm/contact-card";
import {
  ActionMenu,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  PageHeader,
  RecordPanel,
  Select,
  StateSeal,
  TextArea,
  TextInput,
  Toast,
} from "@/features/shell/ui";
import type { ChannelType, ContactIdentifierType } from "@/data/types";
import {
  addContactIdentifier,
  addContactNote,
  trashContact,
} from "@/data/operations";
import {
  MergeContactsDialog,
  useMergeDialog,
} from "@/features/crm/merge-contacts-dialog";
import {
  TransferIdentifierDialog,
  useTransferIdentifierDialog,
} from "@/features/crm/transfer-identifier-dialog";
import {
  RestoreCopyDialog,
  useRestoreCopyDialog,
} from "@/features/crm/restore-copy-dialog";
import { contactDisplayName } from "@/data/derive";
import { useFormat } from "@/features/shell/use-format";
import {
  CHANNEL_TYPE_LABEL,
  CONSENT_DECISION_LABEL,
  IDENTIFIER_TYPE_LABEL,
} from "@/features/shell/format";

export default function ContatoPage({
  params,
}: {
  params: Promise<{ contato: string }>;
}) {
  const { contato } = use(params);
  const state = useData((data) => data);
  const fmt = useFormat();
  const { mergingContactId, openMerge, closeMerge } = useMergeDialog();
  const { transferringId, openTransfer, closeTransfer } =
    useTransferIdentifierDialog();
  const { restoring, openRestore, closeRestore } = useRestoreCopyDialog();
  const run = useRun();
  const [confirmingTrash, setConfirmingTrash] = useState(false);
  const [addingIdentifier, setAddingIdentifier] = useState(false);
  const [identifierType, setIdentifierType] =
    useState<ContactIdentifierType>("telefone");
  const [identifierValue, setIdentifierValue] = useState("");
  const [nota, setNota] = useState("");
  const [registrandoNota, setRegistrandoNota] = useState(false);
  const [canalDaConversa, setCanalDaConversa] = useState<ChannelType | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const record = state.contacts.find((c) => c.id === contato);

  if (!record) {
    return (
      <>
        <PageHeader title="Registro não encontrado" />
        <div className="p-6">
          <EmptyState
            title="Contato não encontrado."
            hint="Ele pode ter sido eliminado, ou você não tem permissão para vê-lo."
          />
        </div>
      </>
    );
  }

  const somenteLeitura =
    record.lifecycle === "mesclado" || record.lifecycle === "naLixeira";

  const empresas = state.contactCompanyLinks.filter(
    (l) => l.contactId === record.id,
  );
  const negocios = state.deals.filter(
    (d) =>
      d.lifecycle === "ativo" &&
      d.contactLinks.some((l) => l.contactId === record.id),
  );

  const reportar = (
    resultado: { ok: boolean; error?: string },
    mensagem: string,
  ) => {
    if (resultado.ok) {
      setError(null);
      setNotice(mensagem);
    } else {
      setNotice(null);
      setError(resultado.error ?? "Não foi possível concluir a operação.");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
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

      <ConfirmDialog
        open={confirmingTrash}
        title={`Enviar ${contactDisplayName(record)} à lixeira?`}
        description={`O Contato sai das listagens e pode ser restaurado por ${state.workspace.trashPolicy.retentionDays} dias. Uma Mensagem recebida também o traz de volta automaticamente, porque uma Conversa sem Contato resolvido é pior que um Contato na lixeira.`}
        confirmLabel="Enviar à lixeira"
        destructive
        onConfirm={() => {
          reportar(
            run((data, memberId) => trashContact(data, memberId, record.id)),
            "Contato enviado à lixeira.",
          );
          setConfirmingTrash(false);
        }}
        onCancel={() => setConfirmingTrash(false)}
      />
      <MergeContactsDialog
        contactId={mergingContactId}
        onClose={closeMerge}
        onDone={setNotice}
      />
      <TransferIdentifierDialog
        identifierId={transferringId}
        fromContactId={record.id}
        onClose={closeTransfer}
        onDone={setNotice}
      />
      <RestoreCopyDialog
        contactId={record.id}
        open={restoring}
        onClose={closeRestore}
        onDone={setNotice}
      />

      <PageHeader
        title={contactDisplayName(record)}
        path={
          <Link href="/crm/contatos" className="hover:underline">
            Contatos
          </Link>
        }
        seal={<StateSeal state={record.lifecycle} />}
        actions={
          <ActionMenu
            label="Ações do Contato"
            items={[
              {
                label: "Mesclar com outro Contato",
                onSelect: () => openMerge(record.id),
              },
              ...(record.lifecycle === "mesclado"
                ? [{ label: "Restaurar cópia", onSelect: () => openRestore() }]
                : []),
              {
                label: "Enviar à lixeira",
                destructive: true,
                onSelect: () => setConfirmingTrash(true),
                ...(somenteLeitura
                  ? { disabledReason: "Este Contato é somente leitura." }
                  : {}),
              },
            ]}
          />
        }
      />

      <div className="grid min-h-0 flex-1 gap-4 p-6 xl:grid-cols-[20rem_minmax(0,1fr)_17rem]">
        {/* ───────────────────────────── esquerda: o dossiê ───────────────── */}
        <div className="relative grid min-w-0 content-start gap-3 xl:min-h-0 xl:overflow-y-auto">
          <ContactIdentity contact={record} editavel={!somenteLeitura} />

          <ContactQuickActions
            contact={record}
            onCanal={setCanalDaConversa}
            onNota={() => setRegistrandoNota(true)}
          />

          <ContactDataPanel
            contact={record}
            {...(somenteLeitura ? {} : { onTransferir: openTransfer })}
            acao={
              addingIdentifier ? null : (
                <Button
                  variant="ghost"
                  onClick={() => setAddingIdentifier(true)}
                  disabled={somenteLeitura}
                  disabledReason="Este Contato é somente leitura."
                >
                  Acrescentar Identificador
                </Button>
              )
            }
          />

          {addingIdentifier ? (
            <RecordPanel
              icon={<Plus className="size-4" aria-hidden="true" />}
              title="Novo Identificador"
            >
              <form
                className="grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  reportar(
                    run((data, memberId) =>
                      addContactIdentifier(
                        data,
                        memberId,
                        record.id,
                        identifierType,
                        identifierValue,
                      ),
                    ),
                    "Identificador acrescentado.",
                  );
                  setIdentifierValue("");
                  setAddingIdentifier(false);
                }}
              >
                <Field label="Tipo">
                  {(id) => (
                    <Select
                      id={id}
                      value={identifierType}
                      onChange={(value) =>
                        setIdentifierType(value as ContactIdentifierType)
                      }
                      options={Object.entries(IDENTIFIER_TYPE_LABEL).map(
                        ([value, label]) => ({
                          value,
                          label,
                        }),
                      )}
                    />
                  )}
                </Field>
                <Field label="Valor">
                  {(id) => (
                    <TextInput
                      id={id}
                      value={identifierValue}
                      onChange={setIdentifierValue}
                    />
                  )}
                </Field>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={identifierValue.trim() === ""}
                    disabledReason="Informe o valor."
                  >
                    Acrescentar
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setAddingIdentifier(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </RecordPanel>
          ) : null}

          <ContactSummary contact={record} />

          <ContactTags contact={record} />

          {registrandoNota ? (
            <RecordPanel
              icon={<StickyNote className="size-4" aria-hidden="true" />}
              title="Nota interna"
            >
              <form
                className="grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  reportar(
                    run((data, memberId) =>
                      addContactNote(data, memberId, record.id, nota),
                    ),
                    "Nota registrada.",
                  );
                  setNota("");
                  setRegistrandoNota(false);
                }}
              >
                <label className="sr-only" htmlFor="nota-contato">
                  Nota interna
                </label>
                <TextArea
                  id="nota-contato"
                  value={nota}
                  onChange={setNota}
                  rows={3}
                  placeholder="A Nota é Comentário: fica no registro e não sai da plataforma."
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={nota.trim() === "" || somenteLeitura}
                    disabledReason={
                      somenteLeitura
                        ? "Este Contato é somente leitura."
                        : "Escreva a nota antes de salvar."
                    }
                  >
                    Registrar nota
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setRegistrandoNota(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </RecordPanel>
          ) : null}

          <RecordPanel
            icon={<ShieldCheck className="size-4" aria-hidden="true" />}
            title="Consentimentos"
            count={record.consents.length}
          >
            {record.consents.length === 0 ? (
              <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                Envios de finalidade marketing serão bloqueados.
              </p>
            ) : (
              <ul className="grid gap-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                {record.consents.map((consentimento, indice) => (
                  <li key={indice}>
                    {
                      state.catalog.find(
                        (c) => c.id === consentimento.purposeId,
                      )?.name
                    }{" "}
                    ·{" "}
                    {CHANNEL_TYPE_LABEL[consentimento.channelType] ??
                      consentimento.channelType}{" "}
                    ·{" "}
                    {CONSENT_DECISION_LABEL[consentimento.decision] ??
                      consentimento.decision}
                  </li>
                ))}
              </ul>
            )}
          </RecordPanel>

          {record.comments.length > 0 ? (
            <RecordPanel
              icon={<StickyNote className="size-4" aria-hidden="true" />}
              title="Notas"
              count={record.comments.length}
            >
              <ul className="grid gap-2">
                {[...record.comments].reverse().map((comentario) => (
                  <li
                    key={comentario.id}
                    className="text-[length:var(--texto-base)]"
                  >
                    <p className="text-[var(--cor-tinta)]">
                      {comentario.content}
                    </p>
                    <p className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                      {state.members.find((m) => m.id === comentario.author.id)
                        ?.displayName ?? "—"}{" "}
                      · {fmt.instant(comentario.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </RecordPanel>
          ) : null}
        </div>

        {/* ─────────────────────── meio: a conversa, por Canal ─────────────── */}
        <div className="min-w-0 xl:min-h-0">
          <ConversationThread
            contact={record}
            canalSelecionado={canalDaConversa}
            onCanalChange={setCanalDaConversa}
          />
        </div>
        {/* ─────────────────────── direita: as associações ─────────────────── */}
        <div className="relative grid min-w-0 content-start gap-3 xl:min-h-0 xl:overflow-y-auto">
          <RecordPanel
            icon={<Building2 className="size-4" aria-hidden="true" />}
            title="Empresas"
            count={empresas.length}
          >
            {empresas.length === 0 ? (
              <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                Nenhuma Empresa vinculada.
              </p>
            ) : (
              <ul className="grid gap-1 text-[length:var(--texto-base)]">
                {empresas.map((vinculo) => (
                  <li key={vinculo.id}>
                    <Link
                      href={`/crm/empresas/${vinculo.companyId}`}
                      className="text-[var(--cor-tinta)] hover:underline"
                    >
                      {state.companies.find((c) => c.id === vinculo.companyId)
                        ?.tradeName ?? "—"}
                    </Link>
                    <span className="block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                      {vinculo.role}
                      {vinculo.principalForContact ? " · principal" : ""}
                      {vinculo.end ? " · encerrado" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </RecordPanel>

          <RecordPanel
            icon={<TrendingUp className="size-4" aria-hidden="true" />}
            title="Negócios"
            count={negocios.length}
          >
            {negocios.length === 0 ? (
              <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                Nenhum Negócio com este Contato.
              </p>
            ) : (
              <ul className="grid gap-1 text-[length:var(--texto-base)]">
                {negocios.map((negocio) => (
                  <li key={negocio.id}>
                    <Link
                      href={`/crm/negocios/${negocio.id}`}
                      className="text-[var(--cor-tinta)] hover:underline"
                    >
                      {negocio.title}
                    </Link>
                    <span className="block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                      {
                        state.funnels.find((f) => f.id === negocio.funnelId)
                          ?.name
                      }{" "}
                      ·{" "}
                      {
                        state.funnels
                          .find((f) => f.id === negocio.funnelId)
                          ?.stages.find((e) => e.id === negocio.stageId)?.name
                      }
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </RecordPanel>
        </div>
      </div>
    </div>
  );
}
