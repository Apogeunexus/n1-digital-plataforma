"use client";

/**
 * T18 — Negócio: a tela do Negócio, usada pela rota `/crm/negocios/[negocio]`
 * e, embutida, pelas Listas de "Meus negócios" (o card do Funil abre o
 * Negócio, não a Tarefa que o espelha).
 *
 * Closing is a form, not a button: B59 lets the Funnel demand a value on win
 * and a loss reason on loss, so the fields appear before the confirmation and
 * the submit stays disabled until they are valid (ux-flows.md).
 */

import {
  CheckSquare,
  ClipboardList,
  History,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useData, useRun, useSession } from "@/data/store";
import {
  contactDisplayName,
  effectiveProbability,
  newestFirst,
} from "@/data/derive";
import { ConversationThread } from "@/features/crm/conversation-thread";
import {
  ContactDataPanel,
  ContactIdentity,
  ContactQuickActions,
  ContactSummary,
} from "@/features/crm/contact-card";
import {
  linkContactToDeal,
  loseDeal,
  moveDealToStage,
  setDealFieldValue,
  reopenDeal,
  unlinkContactFromDeal,
  winDeal,
} from "@/data/operations";
import {
  DEAL_CONTACT_ROLE_LABEL,
  DEAL_SITUATION_LABEL,
} from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  ActorAvatar,
  PageHeader,
  RecordPanel,
  Select,
  StateSeal,
  TextArea,
  TextInput,
} from "@/features/shell/ui";
import type { ChannelType, DealContactRole, FieldValue } from "@/data/types";

/** Um par rótulo→valor da faixa do cabeçalho. */
function Atributo({
  rotulo,
  children,
}: {
  readonly rotulo: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[length:var(--texto-xs)] uppercase tracking-wide text-[var(--cor-tinta-fraca)]">
        {rotulo}
      </dt>
      <dd className="truncate text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
        {children}
      </dd>
    </div>
  );
}

type Closing = "ganho" | "perdido" | null;

export function DealScreen({
  dealId,
  embedded,
}: {
  readonly dealId: string;
  /** Dentro de outra tela (a Lista do Funil): trilha própria e um botão para fechar. */
  readonly embedded?: { readonly path: React.ReactNode; readonly onClose: () => void };
}) {
  const state = useData((data) => data);
  const fmt = useFormat();
  const run = useRun();
  const { memberId } = useSession();
  const router = useRouter();
  const query = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [reasonId, setReasonId] = useState("");
  const [note, setNote] = useState("");
  const [linkingContactId, setLinkingContactId] = useState("");
  const [confirmingReopen, setConfirmingReopen] = useState(false);
  const [desvinculando, setDesvinculando] = useState<string | null>(null);
  const [canalDaConversa, setCanalDaConversa] = useState<ChannelType | null>(
    null,
  );
  const [linkingRole, setLinkingRole] = useState<DealContactRole>("decisor");

  /**
   * D07 — the closing dialog lives in the URL (`?ganhar=` / `?perder=`), not in
   * component state: encerrar um Negócio is a step people share, reload and
   * expect in the browser history.
   */
  const closing: Closing = query.has("ganhar")
    ? "ganho"
    : query.has("perder")
      ? "perdido"
      : null;
  // Os outros parâmetros ficam (a Lista do Funil guarda `?tarefa=` na URL).
  const withClosing = (which: Exclude<Closing, null> | null) => {
    const next = new URLSearchParams(query.toString());
    next.delete("ganhar");
    next.delete("perder");
    if (which) next.set(which === "ganho" ? "ganhar" : "perder", "");
    const texto = next.toString();
    return texto ? `?${texto}` : "?";
  };
  const openDialog = (which: Exclude<Closing, null>) => {
    setReasonId("");
    router.replace(withClosing(which), { scroll: false });
  };
  const closeDialog = () => {
    setAmount("");
    setReasonId("");
    setNote("");
    router.replace(withClosing(null), { scroll: false });
  };

  const deal = state.deals.find((d) => d.id === dealId);
  const funnel = state.funnels.find((f) => f.id === deal?.funnelId);

  if (!deal || !funnel) {
    return (
      <>
        <PageHeader title="Negócio não encontrado" />
        <div className="p-6">
          <EmptyState
            title="Negócio não encontrado."
            hint="Ele pode ter sido eliminado, ou você não tem permissão para vê-lo."
          />
        </div>
      </>
    );
  }

  const stage = funnel.stages.find((s) => s.id === deal.stageId);
  const stages = [...funnel.stages].sort((a, b) => a.order - b.order);
  const owner = state.members.find((m) => m.id === deal.ownerMemberId);
  const company = state.companies.find((c) => c.id === deal.companyId);
  const probability = effectiveProbability(state, deal);

  /**
   * O Contato principal do Negócio é com quem se conversa. Sem ele, a coluna do
   * meio não tem assunto — e a Etapa Agendamento exige um Contato justamente
   * por isso.
   */
  const principal = (() => {
    const vinculo =
      deal.contactLinks.find((l) => l.principal) ?? deal.contactLinks[0];
    return vinculo
      ? state.contacts.find((c) => c.id === vinculo.contactId)
      : undefined;
  })();

  // Os cinco campos do roteiro, na ordem do processo.
  /**
   * Os seis campos do roteiro, na ordem do processo. A lista NÃO tira os
   * vazios: eles são exatamente o que a pessoa veio preencher, e a Etapa
   * Qualificação não deixa sair sem eles.
   */
  const camposDoRoteiro = [
    "fd_criterio_fit",
    "fd_criterio",
    "fd_dor",
    "fd_decisor",
    "fd_orcamento",
    "fd_prazo",
  ]
    .map((definitionId) => state.fieldDefinitions.find((d) => d.id === definitionId))
    .filter((definicao) => definicao !== undefined);

  const valorDoCampo = (definitionId: string) =>
    deal.fieldValues.find((v) => v.definitionId === definitionId);


  const gravarCampo = (definitionId: string, valor: FieldValue["value"]) =>
    report(
      run((data, memberId) => setDealFieldValue(data, memberId, deal.id, definitionId, valor)),
      "Campo do roteiro gravado.",
    );


  // Tarefa aberta do Proprietário, mais próxima do vencimento.
  const proximaTarefa = state.tasks
    .filter(
      (task) =>
        task.lifecycle === "ativo" &&
        task.assignees.some(
          (a) => a.kind === "member" && a.id === deal.ownerMemberId,
        ) &&
        task.dueDate !== undefined,
    )
    .sort((a, b) =>
      String(a.dueDate?.value).localeCompare(String(b.dueDate?.value)),
    )[0];

  const atividade = newestFirst(
    state.activity.filter(
      (registro) => registro.objectType === "deal" && registro.objectId === deal.id,
    ),
  );

  const editable = deal.lifecycle === "ativo" && deal.situation === "aberto";

  // Mirrors reopenDeal: reopening a WON deal is an administrator-level act.
  const actingRole = state.roles.find(
    (role) => role.id === state.members.find((m) => m.id === memberId)?.roleId,
  );
  const isAdminLevel =
    actingRole?.base === "administrador" || actingRole?.base === "proprietario";

  const lossReasons = state.catalog.filter(
    (item) => item.kind === "motivoPerda" && item.lifecycle === "ativo",
  );
  const winReasons = state.catalog.filter(
    (item) => item.kind === "motivoGanho" && item.lifecycle === "ativo",
  );

  // RN-NEG-11 — o que a reabertura limpa como atributo corrente.
  const clearedOnReopen = [
    deal.situation === "ganho" && deal.winReasonId
      ? `Motivo de Ganho: ${state.catalog.find((c) => c.id === deal.winReasonId)?.name}`
      : undefined,
    deal.situation === "perdido" && deal.lossReasonId
      ? `Motivo de Perda: ${state.catalog.find((c) => c.id === deal.lossReasonId)?.name}`
      : undefined,
    deal.closingNote ? "Nota de encerramento" : undefined,
    deal.closedAt ? "Momento de encerramento" : undefined,
  ].filter((part) => part !== undefined);

  const parsedAmount = Number(amount.replace(",", "."));
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const winBlocked =
    funnel.closingRules.requireValueOnWin && !amountValid && !deal.value;
  const lossBlocked = funnel.closingRules.requireLossReason && reasonId === "";
  const blockedReason =
    closing === "ganho" && winBlocked
      ? "Este Funil exige um valor maior que zero para o Negócio ganho."
      : closing === "perdido" && lossBlocked
        ? "Este Funil exige um Motivo de Perda."
        : undefined;

  const report = (result: { ok: boolean; error?: string }, message: string) => {
    if (result.ok) {
      setError(null);
      setNotice(message);
      closeDialog();
    } else {
      setNotice(null);
      setError(result.error ?? "Não foi possível concluir a operação.");
    }
  };

  const linkContact = () => {
    report(
      run((data, memberId) =>
        linkContactToDeal(
          data,
          memberId,
          deal.id,
          linkingContactId,
          linkingRole,
        ),
      ),
      "Contato vinculado ao Negócio.",
    );
    setLinkingContactId("");
  };

  const move = (stageId: string) => {
    report(
      run((data, memberId) =>
        moveDealToStage(data, memberId, deal.id, stageId),
      ),
      "Etapa alterada.",
    );
  };

  const confirmWin = () => {
    report(
      run((data, memberId) =>
        winDeal(data, memberId, deal.id, {
          ...(amountValid
            ? { value: { amount: parsedAmount, currency: "BRL" as const } }
            : {}),
          ...(reasonId ? { winReasonId: reasonId } : {}),
          ...(note ? { closingNote: note } : {}),
        }),
      ),
      "Negócio marcado como ganho.",
    );
  };

  const confirmLoss = () => {
    report(
      run((data, memberId) =>
        loseDeal(data, memberId, deal.id, {
          ...(reasonId ? { lossReasonId: reasonId } : {}),
          ...(note ? { closingNote: note } : {}),
        }),
      ),
      "Negócio marcado como perdido.",
    );
  };

  const confirmReopen = () => {
    report(
      run((data, memberId) => reopenDeal(data, memberId, deal.id)),
      "Negócio reaberto.",
    );
  };

  /**
   * A Etapa é o terceiro eixo da ficha, ao lado da Qualificação e da Temperatura:
   * o que a pessoa é, quão perto está, e em que ponto do Funil o Negócio está.
   *
   * As transições que o Funil não permite continuam na lista e dizem por que não
   * podem ser escolhidas — sumir com elas esconderia o desenho do Funil.
   */
  const etapaDoNegocio = (() => {
    const somenteLeitura =
      deal.situation !== "aberto" || deal.lifecycle !== "ativo";
    const motivoDeBloqueio =
      deal.situation !== "aberto"
        ? "Um Negócio ganho ou perdido preserva a sua última Etapa."
        : "Este Negócio é somente leitura.";
    const permitidas = stage?.allowedTransitionStageIds ?? [];

    return (
      <div className="grid gap-1.5">
        {/* Etapa e Qualificação lado a lado, como a Qualificação do Contato e a
            Temperatura acima: os quatro eixos da ficha em duas linhas. */}
        <div className="grid grid-cols-2 items-end gap-2">
          <span className="grid min-w-0 gap-1.5">
            <label
              className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]"
              htmlFor="etapa-do-negocio"
            >
              Etapa · {stages.findIndex((s) => s.id === deal.stageId) + 1} de{" "}
              {stages.length}
            </label>
            <Select
              id="etapa-do-negocio"
              value={deal.stageId}
              onChange={move}
              disabled={somenteLeitura}
              disabledReason={motivoDeBloqueio}
              options={stages.map((option) => ({
                value: option.id,
                label: option.name,
                detail: `${option.defaultProbability}%`,
                ...(permitidas.length > 0 &&
                !permitidas.includes(option.id) &&
                option.id !== deal.stageId
                  ? {
                      disabledReason:
                        "Este Funil não permite a transição direta para esta Etapa.",
                    }
                  : {}),
              }))}
            />
          </span>

          <span className="grid min-w-0 gap-1.5">
            <label
              className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]"
              htmlFor="resultado-da-qualificacao"
            >
              Qualificação
            </label>
            <Select
              id="resultado-da-qualificacao"
              value={String(
                deal.fieldValues.find(
                  (v) => v.definitionId === "fd_result_qual",
                )?.value ?? "",
              )}
              onChange={(valor) =>
                report(
                  run((data, memberId) =>
                    setDealFieldValue(
                      data,
                      memberId,
                      deal.id,
                      "fd_result_qual",
                      valor || null,
                    ),
                  ),
                  "Resultado da qualificação registrado.",
                )
              }
              disabled={somenteLeitura}
              disabledReason={motivoDeBloqueio}
              placeholder="Ainda não qualificado"
              options={(
                state.fieldDefinitions.find((d) => d.id === "fd_result_qual")
                  ?.options ?? []
              ).map((opcao) => ({ value: opcao, label: opcao }))}
            />
          </span>
        </div>
      </div>
    );
  })();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        path={
          embedded ? (
            embedded.path
          ) : (
            <>
              <Link href="/crm/negocios" className="hover:underline">
                Negócios
              </Link>
              {" › "}
              <Link href={`/crm/funis/${funnel.id}`} className="hover:underline">
                {funnel.name}
              </Link>
            </>
          )
        }
        title={deal.title}
        seal={<StateSeal state={deal.lifecycle} />}
        meta={
          <span className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded px-1.5 py-0.5 text-[length:var(--texto-sm)] font-medium ${
                deal.situation === "ganho"
                  ? "bg-[var(--cor-sucesso-fraco)] text-[var(--cor-sucesso-texto)]"
                  : deal.situation === "perdido"
                    ? "bg-[var(--cor-traco)] text-[var(--cor-tinta)]"
                    : "bg-[var(--cor-info-fraco)] text-[var(--cor-info-texto)]"
              }`}
            >
              {DEAL_SITUATION_LABEL[deal.situation]}
            </span>
            <span className="text-[length:var(--texto-lg)] font-[var(--peso-forte)] text-[var(--cor-tinta)]">
              {deal.value ? fmt.money(deal.value) : "sem valor declarado"}
            </span>
            <span>na Etapa desde {fmt.relative(deal.enteredStageAt)}</span>
          </span>
        }
        details={
          <div className="grid gap-2">
            {/* A barra é a ORDEM da Etapa no Funil: progressão, não previsão. */}
            <div className="flex items-center gap-3">
              <span className="shrink-0 rounded-full bg-[var(--cor-acento-fraco)] px-2 py-0.5 text-[length:var(--texto-sm)] text-[var(--cor-acento)]">
                {stage?.name ?? "—"}
              </span>
              <span
                aria-hidden="true"
                className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--cor-superficie-2)]"
              >
                <span
                  className="block h-full rounded-full bg-[var(--cor-acento)]"
                  style={{
                    width: `${(((stage?.order ?? 0) + 1) / Math.max(stages.length, 1)) * 100}%`,
                  }}
                />
              </span>
              <span className="shrink-0 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                Etapa {(stage?.order ?? 0) + 1} de {stages.length}
              </span>
            </div>

            <dl className="flex flex-wrap items-start gap-x-8 gap-y-2">
              <Atributo rotulo="Probabilidade">
                {probability}%
                {deal.overriddenProbability !== undefined ? " (à mão)" : " (da Etapa)"}
              </Atributo>
              <Atributo rotulo="Fechamento previsto">
                {deal.expectedCloseDate ? fmt.civilDate(deal.expectedCloseDate) : "—"}
              </Atributo>
              <Atributo rotulo="Origem">
                {state.catalog.find((item) => item.id === deal.originId)?.name ?? "—"}
              </Atributo>
              <Atributo rotulo="Empresa">
                {company ? (
                  <Link href={`/crm/empresas/${company.id}`} className="hover:underline">
                    {company.tradeName}
                  </Link>
                ) : (
                  "—"
                )}
              </Atributo>
              {/*
                A ontologia chama esta pessoa de Proprietário: o Negócio não tem
                Atribuído como a Tarefa tem. É quem responde pelo Negócio.
              */}
              <Atributo rotulo="Tags">
                {deal.tagIds.length === 0 ? (
                  "—"
                ) : (
                  <span className="flex flex-wrap items-center gap-1.5">
                    {deal.tagIds.map((tagId) => {
                      const tag = state.tags.find((t) => t.id === tagId);
                      return (
                        <span
                          key={tagId}
                          className="rounded-full px-2 py-0.5 text-[length:var(--texto-sm)] text-[var(--cor-tinta)]"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${tag?.color ?? "var(--cor-traco)"} 20%, transparent)`,
                          }}
                        >
                          {tag?.name ?? tagId}
                        </span>
                      );
                    })}
                  </span>
                )}
              </Atributo>
              <Atributo rotulo="Proprietário">
                <span className="flex items-center gap-1.5">
                  <ActorAvatar
                    kind="member"
                    name={owner?.displayName ?? "—"}
                    {...(owner?.photoFileId ? { photoFileId: owner.photoFileId } : {})}
                  />
                  {owner?.displayName ?? "—"}
                </span>
              </Atributo>
            </dl>
          </div>
        }
        actions={
          <>
            {deal.situation === "aberto" ? (
              <>
                <Button
                  variant="primary"
                  onClick={() => openDialog("ganho")}
                  disabled={deal.lifecycle !== "ativo"}
                  disabledReason="Um Negócio arquivado ou na lixeira é somente leitura."
                >
                  Marcar como ganho
                </Button>
                <Button
                  onClick={() => openDialog("perdido")}
                  disabled={deal.lifecycle !== "ativo"}
                  disabledReason="Um Negócio arquivado ou na lixeira é somente leitura."
                >
                  Marcar como perdido
                </Button>
              </>
            ) : (
              <Button
                variant="danger"
                onClick={() => setConfirmingReopen(true)}
                disabled={deal.situation === "ganho" && !isAdminLevel}
                disabledReason="Só Administradores reabrem um Negócio ganho."
              >
                Reabrir
              </Button>
            )}
            {embedded ? (
              <>
                <Link
                  href={`/crm/negocios/${deal.id}`}
                  className="rounded-[var(--raio-controle)] px-3 py-1.5 text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)] ring-1 ring-inset ring-[var(--cor-traco-forte)] hover:bg-[var(--cor-superficie-2)]"
                >
                  Abrir no CRM
                </Link>
                <Button onClick={embedded.onClose}>
                  Fechar
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <ConfirmDialog
        open={desvinculando !== null}
        title="Remover o Contato deste Negócio?"
        description="O Vínculo com o Negócio não tem período: removê-lo apaga a ligação. As Conversas do Contato permanecem, e ele continua na Empresa."
        confirmLabel="Remover"
        destructive
        onConfirm={() => {
          if (!desvinculando) return;
          report(
            run((data, memberId) =>
              unlinkContactFromDeal(data, memberId, deal.id, desvinculando),
            ),
            "Contato desvinculado do Negócio.",
          );
          setDesvinculando(null);
        }}
        onCancel={() => setDesvinculando(null)}
      />

      <ConfirmDialog
        open={confirmingReopen}
        title={`Reabrir “${deal.title}”?`}
        description={`O Negócio volta a ${stage?.name ?? "a Etapa atual"} como aberto.${
          clearedOnReopen.length > 0
            ? ` Isto some do registro: ${clearedOnReopen.join(" · ")}. Fica guardado no Registro de Atividade, mas não volta ao preencher de novo.`
            : ""
        }`}
        confirmLabel="Reabrir"
        destructive
        onConfirm={() => {
          confirmReopen();
          setConfirmingReopen(false);
        }}
        onCancel={() => setConfirmingReopen(false)}
      />

      <div className="flex min-h-0 flex-1 flex-col p-6">
        {notice ? (
          <p
            role="status"
            className="mb-4 rounded-[var(--raio-controle)] bg-[var(--cor-sucesso-fraco)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-sucesso-texto)]"
          >
            {notice}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mb-4 rounded-[var(--raio-controle)] bg-[var(--cor-perigo-fraco)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-perigo-texto)]"
          >
            {error}
          </p>
        ) : null}

        <ConfirmDialog
          open={closing !== null}
          title={
            closing === "ganho" ? "Marcar como ganho" : "Marcar como perdido"
          }
          description={`O Negócio permanece na Etapa ${stage?.name ?? "atual"}. Reabrir é possível depois${
            closing === "ganho"
              ? ", mas só um Administrador reabre um Negócio ganho."
              : "."
          }`}
          confirmLabel="Confirmar"
          destructive={closing === "perdido"}
          {...(blockedReason ? { confirmDisabledReason: blockedReason } : {})}
          onConfirm={closing === "ganho" ? confirmWin : confirmLoss}
          onCancel={closeDialog}
        >
          <div className="grid gap-3">
            {closing === "ganho" ? (
              <Field
                label={`Valor ${funnel.closingRules.requireValueOnWin ? "(obrigatório neste Funil)" : "(opcional)"}`}
                {...(funnel.closingRules.requireValueOnWin &&
                amount !== "" &&
                !amountValid
                  ? { error: "Informe um valor maior que zero." }
                  : {})}
              >
                {(id) => (
                  <TextInput
                    id={id}
                    value={amount}
                    onChange={setAmount}
                    invalid={amount !== "" && !amountValid}
                    placeholder={
                      deal.value ? String(deal.value.amount) : "0,00"
                    }
                  />
                )}
              </Field>
            ) : null}

            <Field
              label={
                closing === "ganho"
                  ? "Motivo de Ganho (opcional)"
                  : "Motivo de Perda"
              }
              {...(closing === "perdido" &&
              funnel.closingRules.requireLossReason
                ? { hint: "Obrigatório neste Funil." }
                : {})}
            >
              {(id) => (
                <Select
                  id={id}
                  value={reasonId}
                  onChange={setReasonId}
                  searchable
                  placeholder="Não informar"
                  options={(closing === "ganho" ? winReasons : lossReasons).map(
                    (item) => ({
                      value: item.id,
                      label: item.name,
                    }),
                  )}
                />
              )}
            </Field>

            <Field label="Nota de encerramento (opcional)">
              {(id) => (
                <TextArea id={id} value={note} onChange={setNote} rows={2} />
              )}
            </Field>
          </div>
        </ConfirmDialog>

        {/*
          A tela é a CONVERSA, com o Negócio como contexto — é o que um SDR faz
          o dia todo. À esquerda quem é a pessoa, no meio a conversa por Canal,
          à direita o Negócio, a próxima Tarefa e o que aconteceu por último.

          A Etapa fica à direita, junto do valor e da previsão: são eles que os
          Requisitos olham quando o Negócio tenta andar.
        */}
        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[23rem_minmax(0,1fr)]">
          {/* ── esquerda: quem é a pessoa ── */}
          <div className="relative grid content-start gap-3 xl:min-h-0 xl:overflow-y-auto">
            {principal ? (
              <>
                <ContactIdentity
                  contact={principal}
                  editavel={editable}
                  abaixo={etapaDoNegocio}
                />
                <ContactQuickActions
                  contact={principal}
                  onCanal={setCanalDaConversa}
                />
                <ContactDataPanel contact={principal} />
                <ContactSummary contact={principal} />
              </>
            ) : (
              etapaDoNegocio
            )}

            <RecordPanel
              icon={<ClipboardList className="size-4" aria-hidden="true" />}
              title="Roteiro de qualificação"
              count={camposDoRoteiro.length}
            >
              <div className="grid gap-3">
                {camposDoRoteiro.map((definicao) => {
                  const valor = valorDoCampo(definicao.id)?.value;
                  const arquivado = valorDoCampo(definicao.id)?.state === "arquivado";
                  const bloqueio = arquivado
                    ? "Este Valor está arquivado: ele é preservado, não editado."
                    : !editable
                      ? "Este Negócio é somente leitura."
                      : undefined;
                  return (
                    <Field
                      key={definicao.id}
                      label={definicao.name}
                      {...(definicao.description ? { hint: definicao.description } : {})}
                    >
                      {(id) =>
                        definicao.type === "singleSelect" ? (
                          <Select
                            id={id}
                            value={valor === null || valor === undefined ? "" : String(valor)}
                            onChange={(escolha) => gravarCampo(definicao.id, escolha || null)}
                            disabled={bloqueio !== undefined}
                            {...(bloqueio ? { disabledReason: bloqueio } : {})}
                            placeholder="Não informado"
                            options={(definicao.options ?? []).map((opcao) => ({
                              value: opcao,
                              label: opcao,
                            }))}
                          />
                        ) : definicao.type === "longText" ? (
                          <TextArea
                            id={id}
                            rows={2}
                            autoGrow
                            value={valor === null || valor === undefined ? "" : String(valor)}
                            onChange={(texto) => gravarCampo(definicao.id, texto || null)}
                            disabled={bloqueio !== undefined}
                            {...(bloqueio ? { disabledReason: bloqueio } : {})}
                          />
                        ) : (
                          <TextInput
                            id={id}
                            type={definicao.type === "currency" ? "number" : "text"}
                            value={valor === null || valor === undefined ? "" : String(valor)}
                            onChange={(texto) =>
                              gravarCampo(
                                definicao.id,
                                texto === ""
                                  ? null
                                  : definicao.type === "currency"
                                    ? Number(texto)
                                    : texto,
                              )
                            }
                            disabled={bloqueio !== undefined}
                            {...(bloqueio ? { disabledReason: bloqueio } : {})}
                          />
                        )
                      }
                    </Field>
                  );
                })}
              </div>
            </RecordPanel>

            <RecordPanel
              icon={<Users className="size-4" aria-hidden="true" />}
              title="Contatos vinculados"
              count={deal.contactLinks.length}
            >
              {deal.contactLinks.length > 0 ? (
                <ul className="mb-2 grid gap-1">
                  {deal.contactLinks.map((vinculo) => {
                    const contato = state.contacts.find(
                      (c) => c.id === vinculo.contactId,
                    );
                    return (
                      <li
                        key={vinculo.id}
                        className="flex items-baseline justify-between gap-2"
                      >
                        <Link
                          href={`/crm/contatos/${vinculo.contactId}`}
                          className="min-w-0 truncate text-[length:var(--texto-base)] text-[var(--cor-tinta)] hover:underline"
                        >
                          {contato
                            ? contactDisplayName(contato)
                            : vinculo.contactId}
                        </Link>
                        <span className="flex shrink-0 items-baseline gap-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                          {DEAL_CONTACT_ROLE_LABEL[vinculo.role] ??
                            vinculo.role}
                          {vinculo.principal ? " · principal" : ""}
                          <Button
                            variant="ghost"
                            onClick={() => setDesvinculando(vinculo.id)}
                            disabled={!editable}
                            disabledReason="Este Negócio é somente leitura."
                          >
                            Remover
                          </Button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mb-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                  Nenhum Contato. A Etapa Agendamento exige ao menos um.
                </p>
              )}
              <div className="grid gap-2">
                <Select
                  value={linkingContactId}
                  onChange={setLinkingContactId}
                  searchable
                  placeholder="Vincular Contato"
                  options={state.contacts
                    .filter((c) => c.lifecycle === "ativo")
                    .filter(
                      (c) =>
                        !deal.contactLinks.some((l) => l.contactId === c.id),
                    )
                    .map((c) => ({
                      value: c.id,
                      label: contactDisplayName(c),
                    }))}
                />
                <Select
                  value={linkingRole}
                  onChange={(valor) => setLinkingRole(valor as DealContactRole)}
                  options={Object.entries(DEAL_CONTACT_ROLE_LABEL).map(
                    ([value, label]) => ({
                      value,
                      label,
                    }),
                  )}
                />
                <Button
                  variant="secondary"
                  onClick={linkContact}
                  disabled={linkingContactId === "" || !editable}
                  disabledReason={
                    editable
                      ? "Escolha o Contato."
                      : "Este Negócio é somente leitura."
                  }
                >
                  Vincular
                </Button>
              </div>
            </RecordPanel>

            <RecordPanel
              icon={<CheckSquare className="size-4" aria-hidden="true" />}
              title="Próxima Tarefa do Proprietário"
            >
              {proximaTarefa ? (
                <Link
                  href={`/estrutura/tarefas/${proximaTarefa.id}`}
                  className="block hover:underline"
                >
                  <span className="block text-[var(--cor-tinta)]">
                    {proximaTarefa.title}
                  </span>
                  <span className="block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                    {proximaTarefa.dueDate
                      ? `vence ${fmt.taskDate(proximaTarefa.dueDate)}`
                      : "sem data"}
                  </span>
                </Link>
              ) : (
                <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                  Nenhuma Tarefa atribuída ao Proprietário deste Negócio.
                </p>
              )}
            </RecordPanel>

            <RecordPanel
              icon={<History className="size-4" aria-hidden="true" />}
              title="Última atividade"
              count={atividade.length}
            >
              {atividade.length === 0 ? (
                <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                  Nada registrado ainda.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {atividade.slice(0, 4).map((registro) => (
                    <li key={registro.id}>
                      <span className="block text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                        {registro.action}
                      </span>
                      <span className="block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        {fmt.instant(registro.at)}
                        {registro.after ? ` · ${registro.after}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {atividade.length > 4 ? (
                <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                  Mostrando 4 de {atividade.length}.{" "}
                  <Link href="/configuracoes/auditoria" className="underline">
                    Ver tudo na Auditoria
                  </Link>
                  .
                </p>
              ) : null}
            </RecordPanel>
          </div>
          {/* ── meio: a conversa ── */}
          <div className="min-w-0 xl:min-h-0">
            {principal ? (
              <ConversationThread
                contact={principal}
                canalSelecionado={canalDaConversa}
                onCanalChange={setCanalDaConversa}
              />
            ) : (
              <EmptyState
                title="Este Negócio não tem Contato vinculado."
                hint="Sem Contato não há com quem conversar — e a Etapa Agendamento exige um."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
