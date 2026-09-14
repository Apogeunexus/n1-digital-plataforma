"use client";

/**
 * T46 — Painel.
 *
 * RN-PAI-15 — o Widget lê SEMPRE pelas permissões de quem olha, e a Âncora não
 * concede acesso (INV-PAI-09). Por isso o mesmo Painel mostra números
 * diferentes para Membros diferentes, e um Widget cuja Fonte o visualizador não
 * alcança diz "Fonte sem acesso" em vez de mostrar zero: zero e sem acesso são
 * respostas diferentes.
 *
 * RN-PAI-13 — nada é convertido entre moedas: uma linha por moeda, rotulada.
 */

import { use, useState } from "react";
import { useData, useSession } from "@/data/store";
import { goalProgress, widgetReading, type WidgetReading } from "@/data/derive";
import Link from "next/link";
import { RESOURCE_TYPE_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import { EmptyState, NoAccessState, PageHeader, Section, StateSeal } from "@/features/shell/ui";

const VIEW_TYPE_LABEL: Record<string, string> = {
  numero: "número",
  barras: "barras",
  linhas: "linhas",
  pizza: "pizza",
  funil: "funil",
  tabela: "tabela",
  listaDeRegistros: "lista de registros",
  calendario: "calendário",
  texto: "texto",
};

export default function PainelPage({ params }: { params: Promise<{ painel: string }> }) {
  const { painel } = use(params);
  const state = useData((data) => data);
  const { memberId } = useSession();
  const fmt = useFormat();
  const [now] = useState(() => new Date());
  const record = state.panels.find((p) => p.id === painel);

  if (!record) {
    return (
      <>
        <PageHeader title="Registro não encontrado" />
        <div className="p-6">
          <EmptyState
            title="Painel não encontrado."
            hint="Ele pode ter sido eliminado, ou você não tem permissão para vê-lo."
          />
        </div>
      </>
    );
  }

  // Fase 4 — as Metas ancoradas no mesmo contêiner do Painel, lidas pelas permissões de quem olha.
  const anchor = record.anchor;
  const metas = anchor && (anchor.type === "space" || anchor.type === "folder" || anchor.type === "list")
    ? state.goals.filter((g) => g.lifecycle === "ativo" && g.anchor.type === anchor.type && g.anchor.id === anchor.id)
    : [];

  return (
    <>
      <PageHeader
        title={record.name}
        seal={<StateSeal state={record.lifecycle} />}
        meta={`${
          record.anchor ? `Ancorado em ${record.anchor.nameAtTheTime}` : "Painel do Espaço de Trabalho"
        } · Proprietário: ${state.members.find((m) => m.id === record.ownerMemberId)?.displayName ?? "—"}`}
      />
      <div className="p-6">
        <p className="mb-4 rounded-[var(--raio-controle)] bg-[var(--cor-superficie-2)] px-3 py-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
          Os valores refletem as SUAS permissões: outro Membro abre este mesmo Painel e vê números
          diferentes. Momento de referência dos dados: {fmt.instant(now.toISOString())}
        </p>

        {metas.length > 0 ? (
          <Section title="Metas deste contêiner" count={metas.length}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {metas.map((goal) => {
                const progresso = goalProgress(state, goal, memberId, now);
                return (
                  <li key={goal.id} className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-3">
                    <Link href="/estrutura/metas" className="font-medium text-[var(--cor-tinta)] hover:underline">
                      {goal.name}
                    </Link>
                    {"kind" in progresso ? (
                      <p className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">sem acesso ao recorte</p>
                    ) : (
                      <>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--cor-superficie-2)]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progresso.ratio * 100)} aria-label={`Progresso de ${goal.name}`}>
                          <div className="h-full rounded-full bg-[var(--cor-acento)]" style={{ width: `${Math.round(progresso.ratio * 100)}%` }} />
                        </div>
                        <p className="mt-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta)]">
                          {progresso.label} · {Math.round(progresso.ratio * 100)}%
                        </p>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        ) : null}

        <Section title="Widgets" count={record.widgets.length}>
          {record.widgets.length === 0 ? (
            <EmptyState
              title="Este Painel está vazio."
              hint="Um Painel sem Widget não tem o que ler."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {record.widgets.map((widget) => {
                const reading = widgetReading(state, widget, memberId, now);
                return (
                  <li
                    key={widget.id}
                    className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4"
                  >
                    <p className="text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)]">
                      {widget.title}
                    </p>
                    <p className="mt-0.5 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                      {VIEW_TYPE_LABEL[widget.viewType] ?? widget.viewType}
                      {widget.dataSource
                        ? ` · ${RESOURCE_TYPE_LABEL[widget.dataSource.target] ?? widget.dataSource.target}`
                        : ""}
                      {widget.dimensions[0] ? ` · por ${widget.dimensions[0].label}` : ""}
                    </p>

                    <div className="mt-3">
                      <WidgetBody reading={reading} formatMoney={fmt.money} />
                    </div>

                    {widget.fixedFilters.length > 0 ? (
                      <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        Filtro fixo: {widget.fixedFilters.map((filter) => filter.label).join(" · ")}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}

function WidgetBody({
  reading,
  formatMoney,
}: {
  readonly reading: WidgetReading;
  readonly formatMoney: (value: { readonly amount: number; readonly currency: string }) => string;
}) {
  if (reading.kind === "semAcesso") {
    return <NoAccessState what="Fonte deste Widget" />;
  }

  if (reading.kind === "texto") {
    return (
      <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta)]">{reading.content}</p>
    );
  }

  if (reading.kind === "numero") {
    return (
      <p>
        <span className="text-[length:var(--texto-xl)] font-[var(--peso-medio)] text-[var(--cor-tinta)]">
          {new Intl.NumberFormat("pt-BR").format(reading.value)}
        </span>{" "}
        <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
          {reading.label}
        </span>
      </p>
    );
  }

  if (reading.kind === "moeda") {
    if (reading.byCurrency.length === 0) {
      return (
        <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
          Nenhum registro com valor.
        </p>
      );
    }
    return (
      <ul className="space-y-0.5">
        {reading.byCurrency.map((entry) => (
          <li key={entry.currency}>
            <span className="text-[length:var(--texto-xl)] font-[var(--peso-medio)] text-[var(--cor-tinta)]">
              {formatMoney({ amount: entry.amount, currency: entry.currency })}
            </span>{" "}
            <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
              {reading.label}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (reading.rows.length === 0) {
    return (
      <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
        Nenhum registro no recorte deste Widget.
      </p>
    );
  }

  const largest = Math.max(...reading.rows.map((row) => row.value), 1);
  return (
    <>
      <ul className="space-y-1">
        {reading.rows.map((row) => (
          <li key={row.label} className="text-[length:var(--texto-sm)]">
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-[var(--cor-tinta)]">{row.label}</span>
              <span className="shrink-0 text-[var(--cor-tinta-fraca)]">
                {reading.currency
                  ? formatMoney({ amount: row.value, currency: reading.currency })
                  : new Intl.NumberFormat("pt-BR").format(row.value)}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="mt-0.5 block h-1.5 rounded-full bg-[var(--cor-acento)]"
              style={{ width: `${Math.max(2, (row.value / largest) * 100)}%` }}
            />
          </li>
        ))}
      </ul>
      {reading.total > reading.shown ? (
        <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
          Mostrando {reading.shown} de {reading.total}.
        </p>
      ) : null}
    </>
  );
}
