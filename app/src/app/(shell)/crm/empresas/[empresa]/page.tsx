"use client";

/**
 * Empresa, em três colunas, como Contato e Negócio.
 *
 * A coluna do meio conversa, mas não com a Empresa: não existe Conversa com
 * Empresa, só com Contato. Por isso a conversa aqui é a de UM Contato vinculado,
 * escolhido acima da aba — e quem não tem Contato vinculado não tem por onde
 * falar, que é a verdade do modelo e não uma limitação da tela.
 */

import {
  FileText,
  Fingerprint,
  Network,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { useData, useRun } from "@/data/store";
import {
  COMPANY_IDENTIFIER_LABEL,
  DEAL_SITUATION_LABEL,
} from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import {
  addCompanyIdentifier,
  endContactCompanyLink,
  linkContactToCompany,
  trashCompany,
} from "@/data/operations";
import { contactDisplayName } from "@/data/derive";
import type { Contact } from "@/data/types";
import { ConversationThread } from "@/features/crm/conversation-thread";
import {
  ActionMenu,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  PageHeader,
  RecordPanel,
  RecordRow,
  Select,
  StateSeal,
  TextInput,
  Toast,
} from "@/features/shell/ui";

export default function EmpresaPage({
  params,
}: {
  params: Promise<{ empresa: string }>;
}) {
  const { empresa } = use(params);
  const state = useData((data) => data);
  const record = state.companies.find((c) => c.id === empresa);
  const run = useRun();
  const fmt = useFormat();
  const [confirmingTrash, setConfirmingTrash] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [endingLinkId, setEndingLinkId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversandoCom, setConversandoCom] = useState<string | null>(null);
  const [vinculandoId, setVinculandoId] = useState("");
  const [cargo, setCargo] = useState("");
  const [tipoDeIdentificador, setTipoDeIdentificador] = useState<
    "dominio" | "documentoFiscal" | "telefone"
  >("dominio");
  const [valorDoIdentificador, setValorDoIdentificador] = useState("");

  if (!record) {
    return (
      <>
        <PageHeader title="Registro não encontrado" />
        <div className="p-6">
          <EmptyState
            title="Empresa não encontrada."
            hint="Ela pode ter sido eliminada, ou você não tem permissão para vê-la."
          />
        </div>
      </>
    );
  }

  const vinculos = state.contactCompanyLinks.filter(
    (l) => l.companyId === record.id,
  );
  const negocios = state.deals.filter((d) => d.companyId === record.id);
  const filiais = state.companies.filter(
    (c) => c.parentCompanyId === record.id,
  );
  const matriz = record.parentCompanyId
    ? state.companies.find((c) => c.id === record.parentCompanyId)
    : undefined;

  const interlocutores = vinculos
    .filter((l) => l.end === undefined)
    .map((l) => state.contacts.find((c) => c.id === l.contactId))
    .filter((c): c is Contact => c !== undefined && c.lifecycle === "ativo");
  const interlocutor =
    interlocutores.find((c) => c.id === conversandoCom) ??
    interlocutores.find((c) =>
      vinculos.some((l) => l.contactId === c.id && l.principalForCompany),
    ) ??
    interlocutores[0];

  const somenteLeitura = record.lifecycle !== "ativo";

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
      <PageHeader
        title={record.tradeName || record.legalName}
        seal={<StateSeal state={record.lifecycle} />}
        meta={`Proprietário: ${
          state.members.find((m) => m.id === record.ownerMemberId)
            ?.displayName ?? "—"
        }`}
        actions={
          <ActionMenu
            items={[
              {
                label: "Enviar à lixeira",
                onSelect: () => setConfirmingTrash(true),
                destructive: true,
                ...(record.lifecycle === "naLixeira"
                  ? { disabledReason: "Já está na lixeira." }
                  : record.lifecycle === "mesclado"
                    ? {
                        disabledReason:
                          "Uma Empresa mesclada não vai para a lixeira.",
                      }
                    : {}),
              },
            ]}
          />
        }
      />

      <ConfirmDialog
        open={endingLinkId !== null}
        title="Encerrar o Vínculo com esta Empresa?"
        description="O Vínculo continua no histórico, marcado como encerrado com a data de hoje. Quem saiu não desaparece da ficha — apagar o Vínculo apagaria que a pessoa esteve aqui."
        confirmLabel="Encerrar Vínculo"
        onConfirm={() => {
          if (!endingLinkId) return;
          const today = new Date().toISOString().slice(0, 10);
          const result = run((data, memberId) =>
            endContactCompanyLink(data, memberId, endingLinkId, today),
          );
          if (result.ok) {
            setError(null);
            setNotice("Vínculo encerrado; ele permanece no histórico.");
          } else {
            setNotice(null);
            setError(result.error);
          }
          setEndingLinkId(null);
        }}
        onCancel={() => setEndingLinkId(null)}
      />

      <ConfirmDialog
        open={confirmingTrash}
        title={`Enviar ${record.tradeName || record.legalName} à lixeira?`}
        description="Os Vínculos com Contatos são preservados enquanto ela estiver lá. Negócios abertos e filiais impedem o envio — a operação diz quantos."
        confirmLabel="Enviar à lixeira"
        destructive
        onConfirm={() => {
          const result = run((data, memberId) =>
            trashCompany(data, memberId, record.id),
          );
          if (result.ok) {
            setError(null);
            setNotice("Empresa enviada à lixeira.");
          } else {
            setNotice(null);
            setError(result.error);
          }
          setConfirmingTrash(false);
        }}
        onCancel={() => setConfirmingTrash(false)}
      />

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

      <div className="grid min-h-0 flex-1 gap-4 p-6 xl:grid-cols-[20rem_minmax(0,1fr)_17rem]">
        {/* ───────────────────────── esquerda: o cadastro ──────────────────── */}
        <div className="relative grid min-w-0 content-start gap-3 xl:min-h-0 xl:overflow-y-auto">
          <RecordPanel
            icon={<Fingerprint className="size-4" aria-hidden="true" />}
            title="Identificadores"
            count={record.identifiers.length}
          >
            {record.identifiers.length === 0 ? (
              <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                Nenhum identificador cadastrado.
              </p>
            ) : (
              <ul className="grid gap-1.5">
                {record.identifiers.map((identifier) => (
                  <li key={identifier.id} className="min-w-0">
                    <span className="block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                      {COMPANY_IDENTIFIER_LABEL[identifier.type] ??
                        identifier.type}
                    </span>
                    <span className="identificador block truncate text-[var(--cor-tinta)]">
                      {identifier.value}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="mt-2 grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                reportar(
                  run((data, memberId) =>
                    addCompanyIdentifier(
                      data,
                      memberId,
                      record.id,
                      tipoDeIdentificador,
                      valorDoIdentificador,
                    ),
                  ),
                  "Identificador acrescentado.",
                );
                setValorDoIdentificador("");
              }}
            >
              <Field label="Tipo">
                {(id) => (
                  <Select
                    id={id}
                    value={tipoDeIdentificador}
                    onChange={(v) =>
                      setTipoDeIdentificador(
                        v as "dominio" | "documentoFiscal" | "telefone",
                      )
                    }
                    options={Object.entries(COMPANY_IDENTIFIER_LABEL).map(
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
                    value={valorDoIdentificador}
                    onChange={setValorDoIdentificador}
                  />
                )}
              </Field>
              <Button
                variant="secondary"
                type="submit"
                disabled={valorDoIdentificador.trim() === "" || somenteLeitura}
                disabledReason={
                  somenteLeitura
                    ? "Esta Empresa é somente leitura."
                    : "Informe o valor do identificador."
                }
              >
                Acrescentar identificador
              </Button>
            </form>
          </RecordPanel>

          <RecordPanel
            icon={<FileText className="size-4" aria-hidden="true" />}
            title="Razão social"
          >
            <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
              {record.legalName}
            </p>
          </RecordPanel>

          <RecordPanel
            icon={<Network className="size-4" aria-hidden="true" />}
            title="Grupo"
            count={filiais.length}
          >
            <RecordRow label={matriz ? "Filial de" : "Posição"}>
              {matriz ? (
                <Link
                  href={`/crm/empresas/${matriz.id}`}
                  className="hover:underline"
                >
                  {matriz.tradeName || matriz.legalName}
                </Link>
              ) : (
                "Raiz do próprio grupo"
              )}
            </RecordRow>
            {filiais.length === 0 ? (
              <p className="mt-1 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                Nenhuma filial.
              </p>
            ) : (
              <ul className="mt-1 grid gap-1">
                {filiais.map((sub) => (
                  <li key={sub.id} className="min-w-0 truncate">
                    <Link
                      href={`/crm/empresas/${sub.id}`}
                      className="text-[length:var(--texto-base)] text-[var(--cor-tinta)] hover:underline"
                    >
                      {sub.tradeName || sub.legalName}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </RecordPanel>
        </div>

        {/* ───────────────── meio: a conversa, sempre por um Contato ────────── */}
        <div className="flex min-w-0 flex-col gap-3 xl:min-h-0">
          {interlocutor ? (
            <>
              {interlocutores.length > 1 ? (
                <label className="flex items-center gap-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                  Conversando com
                  <span className="min-w-0 flex-1">
                    <Select
                      value={interlocutor.id}
                      onChange={setConversandoCom}
                      options={interlocutores.map((c) => ({
                        value: c.id,
                        label: contactDisplayName(c),
                      }))}
                    />
                  </span>
                </label>
              ) : null}
              <div className="min-h-0 flex-1">
                <ConversationThread contact={interlocutor} />
              </div>
            </>
          ) : (
            <EmptyState
              title="Nenhum Contato ativo nesta Empresa."
              hint="Não existe Conversa com Empresa: vincule um Contato para ter com quem falar."
            />
          )}
        </div>

        {/* ───────────────────────── direita: as associações ────────────────── */}
        <div className="relative grid min-w-0 content-start gap-3 xl:min-h-0 xl:overflow-y-auto">
          <RecordPanel
            icon={<Users className="size-4" aria-hidden="true" />}
            title="Contatos"
            count={vinculos.length}
          >
            {vinculos.length === 0 ? (
              <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                Nenhum Contato vinculado.
              </p>
            ) : (
              <ul className="grid gap-2">
                {vinculos.map((link) => {
                  const contact = state.contacts.find(
                    (c) => c.id === link.contactId,
                  );
                  return (
                    <li
                      key={link.id}
                      className={`min-w-0 ${link.end ? "opacity-60" : ""}`}
                    >
                      <Link
                        href={`/crm/contatos/${link.contactId}`}
                        className="block truncate text-[length:var(--texto-base)] text-[var(--cor-tinta)] hover:underline"
                      >
                        {contact ? contactDisplayName(contact) : link.contactId}
                      </Link>
                      <span className="block truncate text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        {link.role}
                        {link.start
                          ? ` · desde ${fmt.civilDate(link.start)}`
                          : ""}
                        {link.end
                          ? ` · encerrado em ${fmt.civilDate(link.end)}`
                          : ""}
                      </span>
                      {/*
                        O Vínculo tem período: encerrar preserva a história.
                        Apagá-lo apagaria que a pessoa esteve aqui.
                      */}
                      <Button
                        variant="ghost"
                        onClick={() => setEndingLinkId(link.id)}
                        disabled={link.end !== undefined}
                        disabledReason="Este Vínculo já está encerrado."
                      >
                        Encerrar Vínculo
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            <form
              className="mt-2 grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                reportar(
                  run((data, memberId) =>
                    linkContactToCompany(data, memberId, {
                      contactId: vinculandoId,
                      companyId: record.id,
                      role: cargo,
                    }),
                  ),
                  "Contato vinculado à Empresa.",
                );
                setVinculandoId("");
                setCargo("");
              }}
            >
              <Select
                value={vinculandoId}
                onChange={setVinculandoId}
                searchable
                placeholder="Vincular Contato"
                options={state.contacts
                  .filter((c) => c.lifecycle === "ativo")
                  .filter(
                    (c) =>
                      !vinculos.some(
                        (l) => l.contactId === c.id && l.end === undefined,
                      ),
                  )
                  .map((c) => ({ value: c.id, label: contactDisplayName(c) }))}
              />
              <label className="sr-only" htmlFor="cargo-vinculo">
                Cargo no Vínculo
              </label>
              <TextInput
                id="cargo-vinculo"
                value={cargo}
                onChange={setCargo}
                placeholder="Cargo — do Vínculo, não do Contato"
              />
              <Button
                variant="secondary"
                type="submit"
                disabled={
                  vinculandoId === "" || cargo.trim() === "" || somenteLeitura
                }
                disabledReason={
                  somenteLeitura
                    ? "Esta Empresa é somente leitura."
                    : vinculandoId === ""
                      ? "Escolha o Contato."
                      : "Informe o cargo."
                }
              >
                Vincular
              </Button>
            </form>
          </RecordPanel>

          <RecordPanel
            icon={<TrendingUp className="size-4" aria-hidden="true" />}
            title="Negócios"
            count={negocios.length}
          >
            {negocios.length === 0 ? (
              <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                Nenhum Negócio.
              </p>
            ) : (
              <ul className="grid gap-1">
                {negocios.map((deal) => (
                  <li key={deal.id} className="min-w-0">
                    <Link
                      href={`/crm/negocios/${deal.id}`}
                      className="block truncate text-[length:var(--texto-base)] text-[var(--cor-tinta)] hover:underline"
                    >
                      {deal.title}
                    </Link>
                    <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                      {DEAL_SITUATION_LABEL[deal.situation] ?? deal.situation}
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
