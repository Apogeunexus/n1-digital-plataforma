"use client";

/**
 * A Lista "Contas a pagar" vista como software financeiro: indicadores,
 * uma barra só, tabela compacta agrupada por situação financeira e ações
 * rápidas por linha. É uma LENTE sobre as mesmas Tarefas e operações da
 * Lista — o Status real continua no badge; os grupos (a pagar, vencidas,
 * aguardando autorização, programadas, pagas) são derivados do Status e do
 * vencimento, nunca gravados.
 */

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  Minus,
  Search,
  Wallet,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useData, useRun, useSession } from "@/data/store";
import {
  changeTaskStatus,
  CP,
  runScheduledAutomations,
  statusOptionRefusal,
} from "@/data/operations";
import {
  containerAdminRefusal,
  effectiveListConfig,
  isTerminalCategory,
  statusCategory,
  taskWriteRefusal,
} from "@/data/derive";
import {
  type FinanceFilters,
  type FinanceGroup,
  type FinanceProfile,
  type FinanceQuickAction,
  FILTROS_INICIAIS,
  GROUP_LABEL,
  pagoEm,
  textoDoCampo as textoDe,
  valorDaConta as valorDe,
} from "./lens";
import { PRIORITY_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import {
  ActionMenu,
  ActorAvatar,
  Button,
  Chip,
  ConfirmDialog,
  Select,
  TextInput,
} from "@/features/shell/ui";
import type { DataState } from "@/data/state";
import type { Priority, StatusDefinition, Task } from "@/data/types";

type Report = (
  result: { ok: boolean; error?: string },
  message: string,
) => void;

/* ───────────────────────────── Lente financeira ───────────────────────────── */

export {
  applyFinanceFilters,
  FILTROS_INICIAIS,
  financeProfileOf,
  GROUP_LABEL,
  type FinanceFilters,
  type FinanceGroup,
  type FinanceProfile,
} from "./lens";

/** Cor semântica do grupo — só em badge, ponto e data, nunca na linha inteira. */
const GROUP_TOKEN: Record<FinanceGroup, string> = {
  autorizacao: "var(--cor-acento)",
  aPagar: "var(--cor-info)",
  vencidas: "var(--cor-perigo)",
  programadas: "var(--cor-info)",
  pagas: "var(--cor-sucesso)",
  negadas: "var(--cor-atencao)",
  aReceber: "var(--cor-info)",
  emCobranca: "var(--cor-atencao)",
  saque: "var(--cor-acento)",
  recebidas: "var(--cor-sucesso)",
  descartadas: "var(--cor-tinta-fraca)",
};
const CARD_ICON: Record<FinanceGroup, React.ReactNode> = {
  autorizacao: <Clock className="size-4" aria-hidden="true" />,
  aPagar: <Wallet className="size-4" aria-hidden="true" />,
  vencidas: <AlertTriangle className="size-4" aria-hidden="true" />,
  programadas: <Clock className="size-4" aria-hidden="true" />,
  pagas: <CheckCircle2 className="size-4" aria-hidden="true" />,
  negadas: <AlertTriangle className="size-4" aria-hidden="true" />,
  aReceber: <Wallet className="size-4" aria-hidden="true" />,
  emCobranca: <Clock className="size-4" aria-hidden="true" />,
  saque: <Wallet className="size-4" aria-hidden="true" />,
  recebidas: <CheckCircle2 className="size-4" aria-hidden="true" />,
  descartadas: <Minus className="size-4" aria-hidden="true" />,
};

/* ───────────────────────────── Indicadores ───────────────────────────── */

export function FinanceIndicators({
  state,
  profile,
  tasks,
  active,
  onPick,
}: {
  readonly state: DataState;
  readonly profile: FinanceProfile;
  readonly tasks: readonly Task[];
  readonly active: FinanceGroup | "";
  readonly onPick: (grupo: FinanceGroup | "") => void;
}) {
  const fmt = useFormat();
  const now = new Date();
  const soma = (pred: (t: Task) => boolean) =>
    tasks.filter(pred).reduce((s, t) => s + valorDe(t), 0);
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const settledGroup = profile.groupOf(
    state,
    { ...tasks[0], statusId: profile.settledStatusId } as Task,
    now,
  );
  // Cada cartão soma exatamente o grupo que o clique filtra — o número do
  // cartão e o subtotal do grupo na tabela são o mesmo.
  const cards: ReadonlyArray<{
    grupo: FinanceGroup;
    label: string;
    valor: number;
    nota?: string;
    icon: React.ReactNode;
    cor: string;
  }> = profile.cards.map((c) => ({
    grupo: c.grupo,
    label: c.label,
    valor: soma((t) => profile.groupOf(state, t, now) === c.grupo),
    ...(tasks.length > 0 && c.grupo === settledGroup
      ? {
          nota: `${fmt.money({ amount: soma((t) => (pagoEm(state, t) ?? Number.NaN) >= inicioMes), currency: "BRL" })} ${profile.labels.settledNota}`,
        }
      : {}),
    icon: CARD_ICON[c.grupo],
    cor: GROUP_TOKEN[c.grupo],
  }));
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const ativo = active === c.grupo;
        return (
          <button
            key={c.grupo}
            type="button"
            onClick={() => onPick(ativo ? "" : c.grupo)}
            aria-pressed={ativo}
            title={ativo ? "Tirar este filtro" : `Ver só “${c.label}”`}
            className={`flex items-center gap-3 rounded-[var(--raio-controle)] border px-3 py-2 text-left transition-colors hover:bg-[var(--cor-superficie-3)] ${ativo ? "border-[var(--cor-acento)] bg-[var(--cor-superficie-3)]" : "border-[var(--cor-traco)] bg-[var(--cor-superficie)]"}`}
          >
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full"
              style={{
                color: c.cor,
                background: `color-mix(in srgb, ${c.cor} 14%, transparent)`,
              }}
            >
              {c.icon}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[length:var(--texto-xs)] uppercase tracking-wide text-[var(--cor-tinta-fraca)]">
                {c.label}
              </span>
              <span className="block text-[length:var(--texto-md)] font-semibold tabular-nums text-[var(--cor-tinta)]">
                {fmt.money({ amount: c.valor, currency: "BRL" })}
              </span>
              {c.nota ? (
                <span className="block truncate text-[length:var(--texto-xs)] tabular-nums text-[var(--cor-tinta-fraca)]">
                  {c.nota}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────────── Barra ───────────────────────────── */

export function FinanceToolbar({
  listId,
  profile,
  filters,
  onFilters,
  onOpenFilters,
  filtrosAvancados,
  selecionando,
  onToggleSelecionar,
  report,
}: {
  readonly listId: string;
  readonly profile: FinanceProfile;
  readonly filters: FinanceFilters;
  readonly onFilters: (next: FinanceFilters) => void;
  readonly onOpenFilters: () => void;
  readonly filtrosAvancados: number;
  readonly selecionando: boolean;
  readonly onToggleSelecionar: () => void;
  readonly report: Report;
}) {
  const state = useData((data) => data);
  const run = useRun();
  const router = useRouter();
  const { memberId } = useSession();
  const empresas =
    state.fieldDefinitions.find((d) => d.id === CP.fields.empresa)?.options ??
    [];
  const admin = containerAdminRefusal(state, memberId, "list", listId);
  const agendadas = state.automations.filter(
    (a) =>
      a.lifecycle === "ativo" &&
      a.scopeType === "list" &&
      a.scopeId === listId &&
      a.versions.some(
        (v) =>
          v.state === "publicada" && v.trigger?.kind === "condicaoTemporal",
      ),
  ).length;
  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
  if (filters.texto.trim())
    chips.push({
      key: "texto",
      label: `Busca: ${filters.texto.trim()}`,
      onRemove: () => onFilters({ ...filters, texto: "" }),
    });
  if (filters.empresa)
    chips.push({
      key: "empresa",
      label: `Empresa: ${filters.empresa}`,
      onRemove: () => onFilters({ ...filters, empresa: "" }),
    });
  if (filters.periodo !== "todos")
    chips.push({
      key: "periodo",
      label:
        filters.periodo === "mes"
          ? "Este mês"
          : filters.periodo === "30dias"
            ? "Próximos 30 dias"
            : "Só vencidas",
      onRemove: () => onFilters({ ...filters, periodo: "todos" }),
    });
  if (filters.grupo)
    chips.push({
      key: "grupo",
      label: GROUP_LABEL[filters.grupo],
      onRemove: () => onFilters({ ...filters, grupo: "" }),
    });

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-[var(--raio-controle)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] px-2 py-1.5">
        <span className="relative min-w-40 flex-1">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--cor-tinta-fraca)]"
            aria-hidden="true"
          />
          <label htmlFor="busca-contas" className="sr-only">
            {profile.labels.buscar}
          </label>
          <span className="block [&_input]:pl-7">
            <TextInput
              id="busca-contas"
              value={filters.texto}
              onChange={(texto) => onFilters({ ...filters, texto })}
              placeholder={profile.labels.buscar}
              type="search"
            />
          </span>
        </span>
        <Button
          onClick={onOpenFilters}
          icon={<Filter className="size-4" aria-hidden="true" />}
        >
          Filtros{filtrosAvancados > 0 ? ` (${filtrosAvancados})` : ""}
        </Button>
        <span className="w-44">
          <label htmlFor="filtro-empresa" className="sr-only">
            Empresa
          </label>
          <Select
            id="filtro-empresa"
            value={filters.empresa}
            onChange={(empresa) => onFilters({ ...filters, empresa })}
            placeholder="Todas as empresas"
            options={empresas.map((e) => ({ value: e, label: e }))}
          />
        </span>
        <span className="w-40">
          <label htmlFor="filtro-periodo" className="sr-only">
            Período
          </label>
          <Select
            id="filtro-periodo"
            value={filters.periodo}
            onChange={(periodo) =>
              onFilters({
                ...filters,
                periodo: periodo as FinanceFilters["periodo"],
              })
            }
            options={[
              { value: "todos", label: "Todo o período" },
              { value: "mes", label: "Este mês" },
              { value: "30dias", label: "Próximos 30 dias" },
              { value: "vencidas", label: "Só vencidas" },
            ]}
          />
        </span>
        <Button onClick={onToggleSelecionar} aria-pressed={selecionando}>
          {selecionando ? "Sair da seleção" : "Selecionar várias"}
        </Button>
        <ActionMenu
          label="Automatizar"
          trigger={
            <span className="inline-flex h-[var(--altura-controle)] items-center gap-1.5 rounded-[var(--raio-controle)] px-3 text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)] ring-1 ring-inset ring-[var(--cor-traco-forte)] hover:bg-[var(--cor-superficie-2)]">
              <Zap className="size-4" aria-hidden="true" />
              Automatizar
            </span>
          }
          items={[
            {
              label: "Rodar automações por vencimento (hoje)",
              onSelect: () => {
                const r = run((data, me) =>
                  runScheduledAutomations(data, me, listId, new Date()),
                );
                if (r.ok && r.value.failed > 0)
                  report(
                    {
                      ok: false,
                      error: `${r.value.executed} executada(s); ${r.value.failed} falhou(aram): ${r.value.failures.map((f) => `${f.title} — ${f.reason}`).join(" · ")}`,
                    },
                    "",
                  );
                else
                  report(
                    r,
                    r.ok
                      ? `Automações por vencimento: ${r.value.executed} executada(s), ${r.value.skipped} já rodada(s) ou fora da condição.`
                      : "",
                  );
              },
              ...(admin
                ? { disabledReason: admin }
                : agendadas === 0
                  ? {
                      disabledReason:
                        "Esta Lista não tem Automação por vencimento.",
                    }
                  : {}),
            },
            {
              label: "Ver Automações desta Lista",
              onSelect: () => router.push("/ia/automacoes"),
            },
          ]}
        />
      </div>
      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
            Filtros aplicados:
          </span>
          {chips.map((c) => (
            <Chip key={c.key} onRemove={c.onRemove}>
              {c.label}
            </Chip>
          ))}
          <button
            type="button"
            onClick={() => onFilters(FILTROS_INICIAIS)}
            className="text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)] underline hover:text-[var(--cor-tinta)]"
          >
            limpar todos
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ───────────────────────────── Tabela ───────────────────────────── */

const PRIORITY_ICON: Record<Priority, React.ReactNode> = {
  urgente: (
    <AlertTriangle
      className="size-3.5 text-[var(--cor-perigo)]"
      aria-hidden="true"
    />
  ),
  alta: (
    <ArrowUp
      className="size-3.5 text-[var(--cor-atencao)]"
      aria-hidden="true"
    />
  ),
  normal: (
    <Minus
      className="size-3.5 text-[var(--cor-tinta-fraca)]"
      aria-hidden="true"
    />
  ),
  baixa: (
    <ArrowDown
      className="size-3.5 text-[var(--cor-tinta-fraca)]"
      aria-hidden="true"
    />
  ),
  semPrioridade: (
    <Minus
      className="size-3.5 text-[var(--cor-tinta-fraca)]"
      aria-hidden="true"
    />
  ),
};

export function StatusBadge({
  definition,
  grupo,
}: {
  readonly definition: StatusDefinition | undefined;
  readonly grupo: FinanceGroup;
}) {
  const cor = GROUP_TOKEN[grupo];
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--raio-selo)] px-2 py-0.5 text-[length:var(--texto-xs)] font-medium"
      style={{
        color: cor,
        background: `color-mix(in srgb, ${cor} 14%, transparent)`,
      }}
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full"
        style={{ background: cor }}
      />
      {definition?.name ?? "—"}
    </span>
  );
}

function QuickAction({
  label,
  onClick,
  icon,
  disabledReason,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly icon: React.ReactNode;
  readonly disabledReason?: string;
}) {
  const off = disabledReason !== undefined;
  return (
    <button
      type="button"
      onClick={off ? undefined : onClick}
      aria-disabled={off}
      aria-label={label}
      title={off ? disabledReason : label}
      className={`grid size-7 place-items-center rounded ${off ? "cursor-not-allowed text-[var(--cor-tinta-tenue)]" : "text-[var(--cor-tinta-fraca)] hover:bg-[var(--cor-superficie-2)] hover:text-[var(--cor-tinta)]"}`}
    >
      {icon}
    </button>
  );
}

export function FinanceTable({
  state,
  profile,
  tasks,
  definitions,
  selected,
  onToggle,
  onToggleMany,
  selecionando,
  filtrado,
  openTask,
  report,
}: {
  readonly state: DataState;
  readonly profile: FinanceProfile;
  readonly tasks: readonly Task[];
  readonly definitions: readonly StatusDefinition[];
  readonly selected: ReadonlySet<string>;
  readonly onToggle: (taskId: string) => void;
  readonly onToggleMany: (ids: readonly string[], on: boolean) => void;
  readonly selecionando: boolean;
  /** Com filtro ativo, um grupo vazio não é "nenhuma conta": é "nenhuma passa" — some. */
  readonly filtrado: boolean;
  readonly openTask: (taskId: string) => void;
  readonly report: Report;
}) {
  const fmt = useFormat();
  const run = useRun();
  const router = useRouter();
  const [acao1, acao2] = profile.quickActions;
  const { memberId } = useSession();
  const now = useMemo(() => new Date(), []);
  const [fechados, setFechados] = useState<ReadonlySet<FinanceGroup>>(
    new Set(),
  );
  const [confirmando, setConfirmando] = useState<{
    taskId: string;
    statusId: string;
    label: string;
  } | null>(null);

  const alternar = (grupo: FinanceGroup) =>
    setFechados((atual) => {
      const n = new Set(atual);
      if (n.has(grupo)) n.delete(grupo);
      else n.add(grupo);
      return n;
    });
  const grupos = profile.groups.map((g) => ({
    grupo: g,
    itens: tasks.filter((t) => profile.groupOf(state, t, now) === g),
  })).filter((g) =>
    filtrado
      ? g.itens.length > 0
      : g.itens.length > 0 || (g.grupo !== "negadas" && g.grupo !== "descartadas"),
  );
  const statusDe = (id: string) => definitions.find((d) => d.id === id);
  const mover = (task: Task, statusId: string, label: string) => {
    const r = run((data, me) => changeTaskStatus(data, me, task.id, statusId));
    report(r, `“${task.title}”: ${label}.`);
  };
  const aConfirmar = confirmando
    ? tasks.find((t) => t.id === confirmando.taskId)
    : undefined;

  return (
    <div className="overflow-x-auto rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
      <ConfirmDialog
        open={confirmando !== null}
        title={`${confirmando?.label ?? ""}: “${aConfirmar?.title ?? ""}”?`}
        description={`${fmt.money({ amount: aConfirmar ? valorDe(aConfirmar) : 0, currency: "BRL" })} · vence ${aConfirmar?.dueDate ? fmt.taskDate(aConfirmar.dueDate) : "—"}. A mudança de Status passa pelas regras da Lista e fica na Atividade.`}
        confirmLabel={confirmando?.label ?? "Confirmar"}
        onConfirm={() => {
          if (confirmando && aConfirmar)
            mover(
              aConfirmar,
              confirmando.statusId,
              confirmando.label.toLocaleLowerCase("pt-BR"),
            );
          setConfirmando(null);
        }}
        onCancel={() => setConfirmando(null)}
      />
      <table className="w-full min-w-[720px] text-[length:var(--texto-sm)]">
        <thead className="bg-[var(--cor-superficie-2)] text-left text-[length:var(--texto-xs)] uppercase tracking-wide text-[var(--cor-tinta-fraca)]">
          <tr>
            <th className="w-8 px-2 py-2">
              {selecionando ? (
                <span className="sr-only">Selecionar</span>
              ) : null}
            </th>
            <th className="px-2 py-2 font-medium">Conta</th>
            <th className="hidden px-2 py-2 font-medium md:table-cell">
              {profile.labels.contraparte}
            </th>
            <th className="hidden px-2 py-2 font-medium lg:table-cell">
              Empresa
            </th>
            <th className="px-2 py-2 font-medium">Vencimento</th>
            <th className="px-2 py-2 text-right font-medium">Valor</th>
            <th className="hidden px-2 py-2 font-medium xl:table-cell">
              Prioridade
            </th>
            <th className="hidden px-2 py-2 font-medium lg:table-cell">
              Responsável
            </th>
            <th className="px-2 py-2 font-medium">Status</th>
            <th className="w-10 px-2 py-2">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        {grupos.map(({ grupo, itens }) => {
          const fechado = fechados.has(grupo);
          const subtotal = itens.reduce((s, t) => s + valorDe(t), 0);
          const cor = GROUP_TOKEN[grupo];
          const todos =
            itens.length > 0 && itens.every((t) => selected.has(t.id));
          return (
            <tbody key={grupo} className="border-t border-[var(--cor-traco)]">
              <tr className="bg-[var(--cor-superficie-2)]">
                <td colSpan={9} className="px-2 py-1.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => alternar(grupo)}
                      aria-expanded={!fechado}
                      className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-[length:var(--texto-base)] font-semibold text-[var(--cor-tinta)] hover:bg-[var(--cor-superficie-3)]"
                    >
                      {fechado ? (
                        <ChevronRight className="size-4" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="size-4" aria-hidden="true" />
                      )}
                      <span
                        aria-hidden="true"
                        className="size-2 rounded-full"
                        style={{ background: cor }}
                      />
                      {GROUP_LABEL[grupo]}
                    </button>
                    <span className="rounded-[var(--raio-selo)] bg-[var(--cor-superficie-3)] px-1.5 text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
                      {itens.length}
                    </span>
                    <span className="text-[length:var(--texto-sm)] tabular-nums text-[var(--cor-tinta)]">
                      {fmt.money({ amount: subtotal, currency: "BRL" })}
                    </span>
                    {selecionando && itens.length > 0 ? (
                      <label className="ml-auto flex items-center gap-1 text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
                        <input
                          type="checkbox"
                          checked={todos}
                          onChange={(e) =>
                            onToggleMany(
                              itens.map((t) => t.id),
                              e.target.checked,
                            )
                          }
                          className="size-3.5 accent-[var(--cor-acento)]"
                        />
                        todas do grupo
                      </label>
                    ) : null}
                  </div>
                </td>
                <td className="px-2 py-1.5 text-right">
                  <ActionMenu
                    label={`Ações do grupo ${GROUP_LABEL[grupo]}`}
                    items={[
                      {
                        label: fechado ? "Expandir" : "Recolher",
                        onSelect: () => alternar(grupo),
                      },
                      {
                        label: "Selecionar todas do grupo",
                        onSelect: () =>
                          onToggleMany(
                            itens.map((t) => t.id),
                            true,
                          ),
                        ...(selecionando
                          ? {}
                          : {
                              disabledReason:
                                "Entre em “Selecionar várias” primeiro.",
                            }),
                      },
                    ]}
                  />
                </td>
              </tr>
              {fechado ? null : itens.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]"
                  >
                    Nenhuma conta em{" "}
                    {GROUP_LABEL[grupo].toLocaleLowerCase("pt-BR")}.
                  </td>
                </tr>
              ) : (
                itens.map((task) => {
                  const definition = statusDe(task.statusId);
                  const vencida = grupo === "vencidas";
                  const proxima =
                    !vencida &&
                    task.dueDate !== undefined &&
                    !isTerminalCategory(statusCategory(state, task)) &&
                    Date.parse(
                      task.dueDate.form === "civilDay"
                        ? `${task.dueDate.value}T23:59:59`
                        : task.dueDate.value,
                    ) -
                      now.getTime() <
                      3 * 86_400_000;
                  const responsavel = task.assignees.find(
                    (a) => a.kind === "member",
                  );
                  const membro = responsavel
                    ? state.members.find((m) => m.id === responsavel.id)
                    : undefined;
                  const escreve =
                    taskWriteRefusal(state, memberId, task.id) === undefined;
                  const motivoDe = (acao: FinanceQuickAction) =>
                    !escreve
                      ? "Você não altera esta conta."
                      : (acao.notApplicable(task) ??
                        statusOptionRefusal(state, memberId, task, acao.statusId));
                  const podeAutorizar = motivoDe(acao1);
                  const podePagar = motivoDe(acao2);
                  const selecionada = selected.has(task.id);
                  return (
                    <tr
                      key={task.id}
                      className={`group border-t border-[var(--cor-traco)] transition-colors hover:bg-[var(--cor-superficie-3)] ${selecionada ? "bg-[color-mix(in_srgb,var(--cor-acento)_10%,transparent)]" : ""}`}
                    >
                      <td className="px-2 py-1.5 align-middle">
                        {selecionando ? (
                          <input
                            type="checkbox"
                            checked={selecionada}
                            onChange={() => onToggle(task.id)}
                            aria-label={`Selecionar ${task.title}`}
                            className="size-3.5 accent-[var(--cor-acento)]"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="block h-6 w-0.5 rounded-full"
                            style={{
                              background: vencida
                                ? "var(--cor-perigo)"
                                : proxima
                                  ? "var(--cor-atencao)"
                                  : "transparent",
                            }}
                          />
                        )}
                      </td>
                      <td className="max-w-[26ch] px-2 py-1.5 align-middle">
                        <button
                          type="button"
                          onClick={() => openTask(task.id)}
                          className="block max-w-full truncate text-left font-medium text-[var(--cor-tinta)] hover:underline"
                        >
                          {task.title}
                        </button>
                        <span className="block font-mono text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
                          {task.readableId ?? task.id}
                        </span>
                      </td>
                      <td className="hidden max-w-[22ch] truncate px-2 py-1.5 align-middle text-[var(--cor-tinta)] md:table-cell">
                        {profile.counterpart(state, task)}
                      </td>
                      <td className="hidden max-w-[18ch] truncate px-2 py-1.5 align-middle text-[var(--cor-tinta-fraca)] lg:table-cell">
                        {textoDe(task, CP.fields.empresa) || "—"}
                      </td>
                      <td
                        className={`whitespace-nowrap px-2 py-1.5 align-middle tabular-nums ${vencida ? "font-medium text-[var(--cor-perigo)]" : proxima ? "text-[var(--cor-atencao)]" : "text-[var(--cor-tinta)]"}`}
                      >
                        {task.dueDate ? fmt.taskDate(task.dueDate) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right align-middle tabular-nums text-[var(--cor-tinta)]">
                        {fmt.money({ amount: valorDe(task), currency: "BRL" })}
                      </td>
                      <td className="hidden px-2 py-1.5 align-middle xl:table-cell">
                        <span
                          className="inline-flex items-center gap-1 text-[var(--cor-tinta-fraca)]"
                          title={PRIORITY_LABEL[task.priority]}
                        >
                          {PRIORITY_ICON[task.priority]}
                          <span className="text-[length:var(--texto-xs)]">
                            {PRIORITY_LABEL[task.priority]}
                          </span>
                        </span>
                      </td>
                      <td className="hidden px-2 py-1.5 align-middle lg:table-cell">
                        {membro ? (
                          <span className="inline-flex items-center gap-1.5 text-[var(--cor-tinta)]">
                            <ActorAvatar
                              kind="member"
                              name={membro.displayName}
                              {...(membro.photoFileId
                                ? { photoFileId: membro.photoFileId }
                                : {})}
                            />
                            <span className="truncate">
                              {membro.displayName}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[var(--cor-tinta-fraca)]">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        <StatusBadge definition={definition} grupo={grupo} />
                      </td>
                      <td className="px-1 py-1.5 align-middle">
                        <span className="flex items-center justify-end gap-0.5">
                          <span className="hidden items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 md:flex">
                            <QuickAction
                              label="Abrir detalhes"
                              onClick={() => openTask(task.id)}
                              icon={
                                <ExternalLink
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                              }
                            />
                            <QuickAction
                              label={acao1.label}
                              onClick={() =>
                                setConfirmando({
                                  taskId: task.id,
                                  statusId: acao1.statusId,
                                  label: acao1.label,
                                })
                              }
                              icon={
                                <Check
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                              }
                              {...(podeAutorizar
                                ? { disabledReason: podeAutorizar }
                                : {})}
                            />
                            <QuickAction
                              label={acao2.label}
                              onClick={() =>
                                setConfirmando({
                                  taskId: task.id,
                                  statusId: acao2.statusId,
                                  label: acao2.label,
                                })
                              }
                              icon={
                                <CheckCircle2
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                              }
                              {...(podePagar
                                ? { disabledReason: podePagar }
                                : {})}
                            />
                          </span>
                          <ActionMenu
                            label={`Mais opções de ${task.title}`}
                            items={[
                              {
                                label: "Abrir detalhes",
                                onSelect: () => openTask(task.id),
                              },
                              {
                                label: "Editar conta (página completa)",
                                onSelect: () =>
                                  router.push(`/estrutura/tarefas/${task.id}`),
                              },
                              {
                                label: acao1.label,
                                onSelect: () =>
                                  setConfirmando({
                                    taskId: task.id,
                                    statusId: acao1.statusId,
                                    label: acao1.label,
                                  }),
                                ...(podeAutorizar
                                  ? { disabledReason: podeAutorizar }
                                  : {}),
                              },
                              {
                                label: acao2.label,
                                onSelect: () =>
                                  setConfirmando({
                                    taskId: task.id,
                                    statusId: acao2.statusId,
                                    label: acao2.label,
                                  }),
                                ...(podePagar
                                  ? { disabledReason: podePagar }
                                  : {}),
                              },
                              ...definitions
                                .filter(
                                  (d) =>
                                    d.id !== task.statusId &&
                                    d.id !== acao1.statusId &&
                                    d.id !== acao2.statusId,
                                )
                                .map((d) => {
                                  const motivo = escreve
                                    ? statusOptionRefusal(
                                        state,
                                        memberId,
                                        task,
                                        d.id,
                                      )
                                    : "Você não altera esta conta.";
                                  return {
                                    label: `Mover para “${d.name}”`,
                                    onSelect: () =>
                                      setConfirmando({
                                        taskId: task.id,
                                        statusId: d.id,
                                        label: `Mover para “${d.name}”`,
                                      }),
                                    ...(motivo
                                      ? { disabledReason: motivo }
                                      : {}),
                                  };
                                }),
                            ]}
                          />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          );
        })}
      </table>
      {tasks.length === 0 ? (
        <p className="px-3 py-6 text-center text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
          Nenhuma conta passa pelos filtros. Limpe-os para ver todas.
        </p>
      ) : null}
    </div>
  );
}

/* ───────────────────────────── Cartões (mobile) ───────────────────────────── */

export function FinanceCards({
  state,
  profile,
  tasks,
  openTask,
}: {
  readonly state: DataState;
  readonly profile: FinanceProfile;
  readonly tasks: readonly Task[];
  readonly openTask: (taskId: string) => void;
}) {
  const fmt = useFormat();
  const now = new Date();
  const config = tasks[0] ? effectiveListConfig(state, tasks[0].listId) : null;
  if (tasks.length === 0)
    return (
      <p className="px-3 py-6 text-center text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
        Nenhuma conta passa pelos filtros.
      </p>
    );
  return (
    <ul className="grid gap-1.5">
      {tasks.map((task) => {
        const grupo = profile.groupOf(state, task, now);
        return (
          <li key={task.id} className="min-w-0">
            <button
              type="button"
              onClick={() => openTask(task.id)}
              className="flex w-full min-w-0 items-start gap-2 rounded-[var(--raio-controle)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] px-3 py-2 text-left"
            >
              <span
                aria-hidden="true"
                className="mt-1 h-10 w-0.5 shrink-0 rounded-full"
                style={{ background: GROUP_TOKEN[grupo] }}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)]">
                    {task.title}
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--cor-tinta)]">
                    {fmt.money({ amount: valorDe(task), currency: "BRL" })}
                  </span>
                </span>
                <span className="block truncate text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
                  {task.dueDate ? fmt.taskDate(task.dueDate) : "sem vencimento"}{" "}
                  · {profile.counterpart(state, task)}
                </span>
                <span className="mt-1 block">
                  <StatusBadge
                    definition={config?.statusSet.definitions.find(
                      (d) => d.id === task.statusId,
                    )}
                    grupo={grupo}
                  />
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

