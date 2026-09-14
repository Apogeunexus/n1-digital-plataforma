"use client";

/**
 * T13 — Contatos.
 *
 * RN-CON-10 — a Suspeita de Duplicidade é derivada a cada leitura, nunca
 * gravada. Ela vive aqui, no índice, porque é onde se decide: ou o par é a
 * mesma pessoa (mesclar, D03) ou não é (Vínculo `distinto de`, que suprime a
 * suspeita para sempre). Sem este painel, mesclar exigiria adivinhar qual ficha
 * abrir.
 */

import Link from "next/link";
import { useState } from "react";
import { useData, useRun } from "@/data/store";
import { markContactsAsDistinct } from "@/data/operations";
import { Button, EmptyState, PageHeader, Section, Toast } from "@/features/shell/ui";
import { useRouter } from "next/navigation";
import { CreateRecordDialog, useCreateRecordDialog } from "@/features/crm/create-record-dialog";
import {
  ImportContactsDialog,
  useImportContactsDialog,
} from "@/features/crm/import-contacts-dialog";
import { RecordList } from "@/features/shell/record-list";
import { StateSeal } from "@/features/shell/ui";
import {
  contactDisplayName,
  contactDisplayRole,
  duplicateSuspicions,
  principalCompanyId,
} from "@/data/derive";

export default function ContatosPage() {
  const state = useData((data) => data);
  const { importing, openImport, closeImport } = useImportContactsDialog();
  const { creating, openCreate, closeCreate } = useCreateRecordDialog("contato");
  const router = useRouter();
  const run = useRun();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const suspicions = duplicateSuspicions(state);
  const items = state.contacts.filter((c) => c.lifecycle !== "naLixeira" && c.lifecycle !== "mesclado");

  return (
    <>
      <PageHeader
        title="Contatos"
        meta={`${items.length} de ${state.workspace.limits.contacts} · pessoas físicas com quem a organização se relaciona.`}
        actions={
          <span className="flex items-center gap-2">
            <Button variant="secondary" onClick={openImport}>
              Importar Contatos
            </Button>
            <Button onClick={openCreate}>Novo Contato</Button>
          </span>
        }
      />

      <ImportContactsDialog open={importing} onClose={closeImport} onDone={setNotice} />
      <CreateRecordDialog
        family="contato"
        open={creating}
        onClose={closeCreate}
        onCreated={(rota) => router.push(rota)}
      />

      <div className="p-6">
        {notice ? (
          <div className="mb-4">
            <Toast tone="success" onDismiss={() => setNotice(null)}>
              {notice}
            </Toast>
          </div>
        ) : null}
        {error ? (
          <div className="mb-4">
            <Toast tone="error" onDismiss={() => setError(null)}>
              {error}
            </Toast>
          </div>
        ) : null}

        <Section title="Suspeitas de Duplicidade" count={suspicions.length}>
          {suspicions.length === 0 ? (
            <EmptyState
              title="Nenhuma suspeita no momento."
              hint="A suspeita é calculada a cada leitura: nome idêntico, mesmo número em Tipos distintos, e-mail igual a menos de maiúsculas, ou rótulo de Canal igual ao Nome de outro Contato."
            />
          ) : (
            <ul className="space-y-2">
              {suspicions.map((pair) => (
                <li
                  key={`${pair.a.id}-${pair.b.id}`}
                  className="rounded-[var(--raio-superficie)] border border-[var(--cor-atencao-traco)] bg-[var(--cor-superficie)] p-3"
                >
                  <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                    <Link href={`/crm/contatos/${pair.a.id}`} className="font-medium hover:underline">
                      {contactDisplayName(pair.a)}
                    </Link>{" "}
                    <span className="text-[var(--cor-tinta-fraca)]">e</span>{" "}
                    <Link href={`/crm/contatos/${pair.b.id}`} className="font-medium hover:underline">
                      {contactDisplayName(pair.b)}
                    </Link>
                  </p>
                  <p className="mt-0.5 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                    {pair.reasons.join(" · ")}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Link href={`/crm/contatos/${pair.a.id}?mesclar=${pair.b.id}`}>
                      <Button variant="secondary">Mesclar</Button>
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        const result = run((data, memberId) =>
                          markContactsAsDistinct(data, memberId, pair.a.id, pair.b.id),
                        );
                        if (result.ok) {
                          setError(null);
                          setNotice(
                            `${contactDisplayName(pair.a)} e ${contactDisplayName(pair.b)} marcados como pessoas distintas. A suspeita não volta.`,
                          );
                        } else {
                          setNotice(null);
                          setError(result.error);
                        }
                      }}
                    >
                      Não são a mesma pessoa
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <RecordList
          items={items}
          hrefOf={(item) => `/crm/contatos/${item.id}`}
          emptyTitle="Nenhum Contato ainda."
          emptyHint="Contatos também são criados automaticamente quando uma Mensagem chega por um Canal."
          columns={[
            { key: "nome", label: "Nome de exibição", render: (item) => contactDisplayName(item) },
            { key: "cargo", label: "Cargo de exibição", render: (item) => contactDisplayRole(state, item.id) || "—" },
            { key: "empresa", label: "Empresa principal", render: (item) => state.companies.find((c) => c.id === principalCompanyId(state, item.id))?.tradeName ?? "—" },
            { key: "qualificacao", label: "Qualificação", render: (item) => state.catalog.find((c) => c.id === item.qualificationId)?.name ?? "—" },
            { key: "proprietario", label: "Proprietário", render: (item) => state.members.find((m) => m.id === item.ownerMemberId)?.displayName ?? "—" },
            { key: "estado", label: "Estado", render: (item) => <StateSeal state={item.lifecycle} /> },
          ]}
        />
      </div>
    </>
  );
}
