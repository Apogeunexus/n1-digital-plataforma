"use client";

/**
 * T17 — Negócios. The board is the default reading: one column per Stage of the
 * chosen Funnel, in `order`.
 *
 * B58 — every stage is a progression stage, so `ganho` and `perdido` are NOT
 * columns: they are a situation the Deal carries while staying in its last
 * stage. Closed deals appear in their own column-independent strip.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useData, useRun } from "@/data/store";
import { weightedValue } from "@/data/derive";
import { DealCard, dealCardData } from "@/features/crm/deal-card";
import { moveDealToStage } from "@/data/operations";
import { DEAL_SITUATION_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import { Briefcase, Plus } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Section,
} from "@/features/shell/ui";
import {
  CreateRecordDialog,
  useCreateRecordDialog,
} from "@/features/crm/create-record-dialog";

export default function NegociosPage() {
  const state = useData((data) => data);
  const fmt = useFormat();
  const run = useRun();
  const funnels = state.funnels.filter(
    (funnel) => funnel.lifecycle === "ativo",
  );
  const [funnelId, setFunnelId] = useState(funnels[0]?.id ?? "");
  const [showClosed, setShowClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const { creating, openCreate, closeCreate } =
    useCreateRecordDialog("negocio");
  const router = useRouter();

  const funnel = funnels.find((f) => f.id === funnelId) ?? funnels[0];

  if (!funnel) {
    return (
      <>
        <PageHeader title="Negócios" />
        <div className="p-6">
          <EmptyState
            title="Nenhum Funil ativo."
            hint="Um Negócio existe sempre dentro de um Funil e de uma Etapa: crie um Funil primeiro."
            action={
              <Link
                href="/crm/funis"
                className="text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)] underline"
              >
                Ir para Funis
              </Link>
            }
          />
        </div>
      </>
    );
  }

  const deals = state.deals.filter(
    (deal) => deal.funnelId === funnel.id && deal.lifecycle === "ativo",
  );
  const open = deals.filter((deal) => deal.situation === "aberto");
  const closed = deals.filter((deal) => deal.situation !== "aberto");
  const stages = [...funnel.stages].sort((a, b) => a.order - b.order);

  const drop = (stageId: string) => {
    if (!dragging) return;
    const result = run((data, memberId) =>
      moveDealToStage(data, memberId, dragging, stageId),
    );
    setError(result.ok ? null : result.error);
    setDragging(null);
  };

  const totalOpen = open.reduce(
    (sum, deal) => sum + (deal.value?.amount ?? 0),
    0,
  );
  const totalWeighted = open.reduce(
    (sum, deal) => sum + (weightedValue(state, deal) ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="Negócios"
        icon={
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-[var(--raio-controle)] bg-[var(--cor-acento-fraco)] text-[var(--cor-acento)]"
          >
            <Briefcase className="size-4" />
          </span>
        }
        meta={
          <span className="flex flex-wrap items-center gap-3">
            <span>{open.length} {open.length === 1 ? "aberto" : "abertos"}</span>
            <span>
              {fmt.money({ amount: totalOpen, currency: "BRL" })} em valor
              declarado
            </span>
            <span>
              {fmt.money({ amount: totalWeighted, currency: "BRL" })} ponderado
              pela probabilidade
            </span>
          </span>
        }
        actions={
          <span className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
              Funil
              <select
                value={funnel.id}
                onChange={(event) => setFunnelId(event.target.value)}
                className="rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)] px-2 py-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]"
              >
                {funnels.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <Button onClick={openCreate}>Novo Negócio</Button>
          </span>
        }
      />

      <CreateRecordDialog
        family="negocio"
        open={creating}
        onClose={closeCreate}
        onCreated={(rota) => router.push(rota)}
      />

      <div className="p-6">
        {error ? (
          <p
            role="alert"
            className="mb-4 rounded-[var(--raio-controle)] bg-[var(--cor-perigo-fraco)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-perigo-texto)]"
          >
            {error}
          </p>
        ) : null}

        {/*
          As Etapas aparecem mesmo sem Negócio: um Funil recém-criado é feito
          das colunas, e escondê-las faria ele parecer vazio de configuração,
          não só de Negócios. Cada coluna já diz "Nenhum Negócio nesta Etapa"
          e oferece o "+".
        */}
        {stages.length === 0 ? (
          <EmptyState
            title={`${funnel.name} não tem Etapa.`}
            hint="Um Negócio só existe dentro de uma Etapa: configure o Funil antes de criar."
          />
        ) : (
          <div className="palco-quadro flex gap-4 overflow-x-auto pb-2">
            {stages.map((stage) => {
              const column = open.filter((deal) => deal.stageId === stage.id);
              const columnValue = column.reduce(
                (sum, deal) => sum + (deal.value?.amount ?? 0),
                0,
              );
              return (
                <div
                  key={stage.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => drop(stage.id)}
                  className="flex w-[19.2rem] shrink-0 flex-col rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[color-mix(in_srgb,var(--cor-superficie)_70%,transparent)] p-3"
                >
                  <div className="mb-3 flex items-start gap-2.5">
                    {/* A contagem em selo: é o que se lê primeiro ao varrer o quadro. */}
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-[var(--raio-controle)] bg-[var(--cor-acento-fraco)] text-[length:var(--texto-base)] font-[var(--peso-forte)] text-[var(--cor-acento)]"
                    >
                      {column.length}
                    </span>
                    <span className="min-w-0 flex-1">
                      <h2 className="flex items-center gap-1.5 truncate text-[length:var(--texto-base)] font-[var(--peso-forte)] text-[var(--cor-tinta)]">
                        {stage.color ? (
                          <span
                            aria-hidden="true"
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                        ) : null}
                        {stage.name}
                      </h2>
                      <span className="block truncate text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        {stage.defaultProbability}% padrão ·{" "}
                        {fmt.money({ amount: columnValue, currency: "BRL" })}
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {column.length === 0 ? (
                      <button
                        type="button"
                        onClick={openCreate}
                        className="grid place-items-center gap-2 rounded-[var(--raio-superficie)] border border-dashed border-[var(--cor-traco-forte)] px-2 py-6 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)] hover:border-[var(--cor-acento)] hover:text-[var(--cor-tinta)]"
                      >
                        <span
                          aria-hidden="true"
                          className="grid size-8 place-items-center rounded-full border border-[var(--cor-traco-forte)]"
                        >
                          <Plus className="size-4" />
                        </span>
                        Nenhum Negócio nesta Etapa.
                      </button>
                    ) : (
                      column.map((deal) => (
                        <DealCard
                          key={deal.id}
                          data={dealCardData(state, deal)}
                          href={`/crm/negocios/${deal.id}`}
                          onDragStart={() => setDragging(deal.id)}
                          onDragEnd={() => setDragging(null)}
                        />
                      ))
                    )}
                  </div>

                  {stage.requirements.length > 0 ? (
                    <p className="mt-2 px-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                      {stage.requirements.length} exigência(s) para entrar ou
                      sair desta Etapa.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          <Section
            title="Negócios encerrados"
            count={closed.length}
            action={
              closed.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowClosed((value) => !value)}
                  className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)] underline"
                >
                  {showClosed ? "Ocultar" : "Mostrar"}
                </button>
              ) : null
            }
          >
            {closed.length === 0 ? (
              <EmptyState title="Nenhum Negócio ganho ou perdido neste Funil." />
            ) : showClosed ? (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {closed.map((deal) => {
                  const stage = funnel.stages.find(
                    (s) => s.id === deal.stageId,
                  );
                  return (
                    <li key={deal.id}>
                      <Link href={`/crm/negocios/${deal.id}`} className="block">
                        <Card>
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)]">
                              {deal.title}
                            </p>
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 text-[length:var(--texto-sm)] font-medium ${
                                deal.situation === "ganho"
                                  ? "bg-[var(--cor-sucesso-fraco)] text-[var(--cor-sucesso-texto)]"
                                  : "bg-[var(--cor-traco)] text-[var(--cor-tinta)]"
                              }`}
                            >
                              {DEAL_SITUATION_LABEL[deal.situation]}
                            </span>
                          </div>
                          <p className="mt-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                            Última Etapa: {stage?.name ?? "—"}
                            {deal.value ? ` · ${fmt.money(deal.value)}` : ""}
                          </p>
                        </Card>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                Preservam a última Etapa que ocuparam e não aparecem nas
                colunas.
              </p>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
