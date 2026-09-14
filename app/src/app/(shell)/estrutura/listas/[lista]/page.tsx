"use client";

/**
 * T10 — Lista. Four Visualizações over the same collection of Tasks.
 *
 * The Quadro columns ARE the definitions of the effective Status Set, in order,
 * coloured by category (RN-LIS-05, A4.3). Dragging changes the status through
 * the same operation the panel uses, so the List functionalities are enforced.
 */

import Link from "next/link";
import { Briefcase } from "lucide-react";
import { use, useState } from "react";
import { useData, useRun, useSession } from "@/data/store";
import {
  checklistProgress,
  containerAdminRefusal,
  effectiveLifecycleOfList,
  memberReachesContainer,
  effectiveListConfig,
  effectiveLifecycleOfTask,
  isBlocked,
  isOverdue,
  isTerminalCategory,
  statusCategory,
  statusDefinition,
  subtaskProgress,
} from "@/data/derive";
import {
  applyView,
  changeTaskStatus,
  createTask,
  listWriteRefusal,
} from "@/data/operations";
import { PRIORITY_LABEL, STATUS_CATEGORY_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import { useRouter, useSearchParams } from "next/navigation";
import { TaskPanel, useTaskPanel } from "@/features/estrutura/task-panel";
import {
  MoveTaskDialog,
  useMoveTaskDialog,
} from "@/features/estrutura/move-task-dialog";
import {
  CargaDeTrabalho,
  LinhaDoTempo,
} from "@/features/estrutura/planning-views";
import {
  NewTaskFromTemplateDialog,
  SaveTemplateDialog,
} from "@/features/estrutura/template-dialogs";
import { FILTRO_VAZIO, ViewBar } from "@/features/estrutura/view-bar";
import {
  BulkStatusBar,
  RunScheduledButton,
} from "@/features/estrutura/bulk-status-bar";
import {
  applyFinanceFilters,
  FILTROS_INICIAIS,
  FinanceCards,
  FinanceIndicators,
  financeProfileOf,
  FinanceTable,
  FinanceToolbar,
  type FinanceFilters,
} from "@/features/estrutura/financeiro/contas-view";
import { SerieDeParcelasDialog } from "@/features/estrutura/financeiro/serie-dialog";
import { dealOfTask, QuadroNegocios } from "@/features/estrutura/quadro-negocios";
import { DealScreen } from "@/features/crm/deal-screen";
import { ContaDrawer } from "@/features/estrutura/financeiro/conta-drawer";
import { MEUS_NEGOCIOS_ID } from "@/data/seed-comercial";
import {
  ActionMenu,
  Button,
  CategoryDot,
  ConditionMarker,
  EmptyState,
  PageHeader,
  SidePanel,
  StateSeal,
} from "@/features/shell/ui";
import type { DataState } from "@/data/state";
import type { Task, View, ViewFilters } from "@/data/types";

type ViewKind =
  "lista" | "quadro" | "calendario" | "tabela" | "linha" | "carga";
const VIEW_LABEL: Record<ViewKind, string> = {
  lista: "Lista",
  quadro: "Quadro",
  calendario: "Calendário",
  tabela: "Tabela",
  linha: "Linha do tempo",
  carga: "Carga",
};

export default function ListaPage({
  params,
}: {
  params: Promise<{ lista: string }>;
}) {
  const { lista } = use(params);
  const state = useData((data) => data);
  const fmt = useFormat();
  const run = useRun();
  // A Visualização padrão da Lista abre aplicada; o resto parte do vazio.
  const padrao = state.views.find(
    (v) => v.listId === lista && v.ownerKind === "container" && v.isDefault,
  );
  const [view, setView] = useState<ViewKind>(() =>
    padrao?.kind === "linhaDoTempo"
      ? "linha"
      : padrao?.kind === "quadro" ||
          padrao?.kind === "calendario" ||
          padrao?.kind === "tabela" ||
          padrao?.kind === "carga"
        ? padrao.kind
        : "lista",
  );
  const [newTitle, setNewTitle] = useState("");
  const [criandoConta, setCriandoConta] = useState(false);
  const [criandoSerie, setCriandoSerie] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [financeFilters, setFinanceFilters] =
    useState<FinanceFilters>(FILTROS_INICIAIS);
  const [salvandoModelo, setSalvandoModelo] = useState(false);
  const [criandoDeModelo, setCriandoDeModelo] = useState(false);
  const [filters, setFilters] = useState<ViewFilters>(
    padrao?.filters ?? FILTRO_VAZIO,
  );
  const [sortBy, setSortBy] = useState<View["sortBy"] | undefined>(
    padrao?.sortBy,
  );
  const [activeViewId, setActiveViewId] = useState<string | null>(
    padrao?.id ?? null,
  );
  const [selecao, setSelecionadas] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [selecionando, setSelecionando] = useState(false);
  const { memberId } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    text: string;
    taskId?: string;
  } | null>(null);
  const { openTaskId, openTask, closeTask } = useTaskPanel();
  const query = useSearchParams();
  const router = useRouter();
  const { movingTaskId, openMove, closeMove } = useMoveTaskDialog();

  // B38a — a Lista que o Membro não alcança não existe para ele.
  const list = state.lists.find(
    (l) =>
      l.id === lista && memberReachesContainer(state, memberId, "list", l.id),
  );
  const config = list ? effectiveListConfig(state, list.id) : null;

  if (!list || !config) {
    return (
      <>
        <PageHeader title="Lista não encontrada" />
        <div className="p-6">
          <EmptyState
            title="Lista não encontrada."
            hint="Ela pode ter sido eliminada, ou você não tem permissão para vê-la."
          />
        </div>
      </>
    );
  }

  const effective = effectiveLifecycleOfList(state, list.id);
  const restrictedBy =
    effective !== list.lifecycle ? config.path.at(-2) : undefined;
  const administra = containerAdminRefusal(state, memberId, "list", list.id);
  // Quem não cria Tarefa aqui (Convidado) vê o porquê antes do clique.
  const criacaoRecusada = listWriteRefusal(state, memberId, list.id);
  const reportar = (
    result: { ok: boolean; error?: string },
    message: string,
  ) => {
    if (result.ok) {
      setError(null);
      setNotice({ text: message });
    } else {
      setNotice(null);
      setError(result.error ?? "Não foi possível concluir a operação.");
    }
  };

  const todas = state.tasks
    .filter(
      (task) => task.listId === list.id && task.parentTaskId === undefined,
    )
    .filter((task) => effectiveLifecycleOfTask(state, task.id) !== "naLixeira");
  // As Listas do Financeiro (Contas a pagar, Contas a receber) têm a lente
  // financeira: pelo id da Lista, não pelo nome de um Tipo.
  const lente = financeProfileOf(list.id);
  const financeira = lente !== undefined;
  // Lista de "Meus negócios": cópia do Funil, não sincronizada.
  const espelhoComercial = config.path.some(
    (node) => node.type === "folder" && node.id === MEUS_NEGOCIOS_ID,
  );
  const tarefaAberta = openTaskId ? todas.find((t) => t.id === openTaskId) : undefined;
  const negocioAberto =
    espelhoComercial && tarefaAberta?.provenance?.kind === "deal" ? dealOfTask(state, tarefaAberta) : undefined;
  // No Quadro do Funil, uma Reunião é a call: abre a tela dela, não um painel.
  const abrirNoQuadro = (taskId: string) => {
    const t = todas.find((x) => x.id === taskId);
    if (t && state.taskTypes.find((x) => x.id === t.taskTypeId)?.name === "Reunião") router.push(`/crm/reunioes/${t.id}`);
    else openTask(taskId);
  };
  // A Visualização filtra o que este Membro já alcança — nunca amplia.
  const filtradas = applyView(state, todas, {
    filters,
    ...(sortBy ? { sortBy } : {}),
  });
  const tasks = financeira
    ? applyFinanceFilters(state, filtradas, financeFilters, new Date())
    : filtradas;
  const filtrando = tasks.length !== todas.length;
  // A seleção só vale para o que está na tela: mudar um filtro com linhas
  // marcadas não deixa ids invisíveis na barra em lote.
  const selecionadas: ReadonlySet<string> = new Set(
    [...selecao].filter((id) => tasks.some((t) => t.id === id)),
  );
  const filtrosAvancados =
    Object.values(filters).filter(
      (v) => v !== undefined && v !== "" && v !== false,
    ).length + (sortBy ? 1 : 0);

  const definitions = [...config.statusSet.definitions].sort(
    (a, b) => a.order - b.order,
  );

  const create = () => {
    if (!newTitle.trim()) return;
    const result = run((data, memberId) =>
      createTask(data, memberId, { listId: list.id, title: newTitle.trim() }),
    );
    if (result.ok) {
      setNewTitle("");
      setError(null);
      setCriandoConta(false);
      // A Tarefa nova pode nascer fora da Visualização em uso (o Calendário só
      // desenha Tarefas com data): o aviso nomeia e dá o caminho para abri-la.
      setNotice({
        text: `${financeira ? "Conta" : "Tarefa"} criada: ${result.value.title}.`,
        taskId: result.value.id,
      });
      // Uma conta nasce só com o nome; Valor, Vencimento e Forma se editam na
      // página completa (o drawer só lê), então é para lá que ela vai.
      if (financeira) router.push(`/estrutura/tarefas/${result.value.id}`);
    } else {
      setNotice(null);
      setError(result.error);
    }
  };

  return (
    <>
      <PageHeader
        path={config.path.map((node, index) => (
          <span key={node.id}>
            {index > 0 ? " › " : ""}
            {node.type === "list" ? (
              node.name
            ) : (
              <Link
                href={
                  node.type === "space"
                    ? `/estrutura/espacos/${node.id}`
                    : `/estrutura/pastas/${node.id}`
                }
                className="hover:underline"
              >
                {node.name}
              </Link>
            )}
          </span>
        ))}
        title={list.name}
        {...(espelhoComercial
          ? {
              icon: (
                <span
                  aria-hidden="true"
                  className="grid size-9 place-items-center rounded-[var(--raio-controle)] bg-[var(--cor-acento-fraco)] text-[var(--cor-acento)]"
                >
                  <Briefcase className="size-4" />
                </span>
              ),
            }
          : {})}
        seal={<StateSeal state={effective} />}
        meta={
          lente ? (
            <span>{lente.labels.description}</span>
          ) : espelhoComercial ? (
            <span className="flex flex-wrap items-center gap-3">
              <span>
                {(() => {
                  const abertos = todas.filter((t) => !isTerminalCategory(statusCategory(state, t))).length;
                  return `${abertos} ${abertos === 1 ? "aberto" : "abertos"}`;
                })()}
              </span>
              <span>
                {fmt.money({
                  amount: todas
                    .filter((t) => !isTerminalCategory(statusCategory(state, t)))
                    .reduce((sum, t) => sum + (dealOfTask(state, t)?.value?.amount ?? 0), 0),
                  currency: "BRL",
                })}{" "}
                em valor declarado
              </span>
              <span>
                Cópia do Funil “{list.name}”: mover aqui não move o Negócio em{" "}
                <Link href="/crm/negocios" className="underline">
                  Negócios
                </Link>
                .
              </span>
            </span>
          ) : (
            <span className="flex flex-wrap items-center gap-3">
              <span>
                Conjunto de Status: {config.statusSet.definitions.length}{" "}
                definições, de <em>{config.statusSetDefinedAt.name}</em>
              </span>
              {list.plannedPeriod?.start ? (
                <span>
                  Período planejado:{" "}
                  {fmt.taskDate({
                    form: "civilDay",
                    value: list.plannedPeriod.start,
                  })}
                  {list.plannedPeriod.end
                    ? ` a ${fmt.taskDate({ form: "civilDay", value: list.plannedPeriod.end })}`
                    : ""}
                </span>
              ) : null}
            </span>
          )
        }
        actions={
          <span className="flex flex-wrap items-center gap-2">
            <Link
              href={`/estrutura/listas/${list.id}/configuracoes`}
              className="rounded-[var(--raio-controle)] px-3 py-1.5 text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)] ring-1 ring-inset ring-[var(--cor-traco-forte)] hover:bg-[var(--cor-superficie-2)]"
            >
              Configurações
            </Link>
            {lente?.kind === "receber" && effective === "ativo" ? (
              <Button
                onClick={() => setCriandoSerie(true)}
                disabled={criacaoRecusada !== undefined}
                disabledReason={criacaoRecusada ?? ""}
              >
                Nova série de parcelas
              </Button>
            ) : null}
            {lente && effective === "ativo" ? (
              <Button
                variant="primary"
                onClick={() => setCriandoConta(true)}
                disabled={criacaoRecusada !== undefined}
                disabledReason={criacaoRecusada ?? ""}
              >
                {lente.labels.nova}
              </Button>
            ) : null}
            <ActionMenu
              items={[
                {
                  label: "Salvar como modelo",
                  onSelect: () => setSalvandoModelo(true),
                  ...(administra ? { disabledReason: administra } : {}),
                },
              ]}
            />
          </span>
        }
      />
      <SaveTemplateDialog
        kind="lista"
        sourceId={list.id}
        open={salvandoModelo}
        onClose={() => setSalvandoModelo(false)}
        report={reportar}
      />
      <NewTaskFromTemplateDialog
        listId={list.id}
        open={criandoDeModelo}
        onClose={() => setCriandoDeModelo(false)}
        onCreated={(taskId, title) =>
          setNotice({ text: `Tarefa criada: ${title}.`, taskId })
        }
        report={reportar}
      />

      {restrictedBy ? (
        <p className="border-b border-[var(--cor-atencao-traco)] bg-[var(--cor-atencao-fraco)] px-6 py-2 text-[length:var(--texto-base)] text-[var(--cor-atencao-texto)]">
          {effective === "arquivado" ? "Arquivada" : "Na lixeira"} porque{" "}
          {restrictedBy.type === "space" ? "o Espaço" : "a Pasta"}{" "}
          <em>{restrictedBy.name}</em> está{" "}
          {effective === "arquivado" ? "arquivado" : "na lixeira"}.
        </p>
      ) : null}

      {lente ? (
        <div className="border-b border-[var(--cor-traco)] bg-[var(--cor-superficie-2)] px-6 py-3">
          <FinanceIndicators
            state={state}
            profile={lente}
            tasks={todas}
            active={financeFilters.grupo}
            onPick={(grupo) => setFinanceFilters({ ...financeFilters, grupo })}
          />
        </div>
      ) : null}

      <div className="overflow-x-auto border-b border-[var(--cor-traco)] bg-[var(--cor-superficie)] px-6">
        <div role="tablist" aria-label="Visualizações" className="flex gap-1">
          {(
            [
              "lista",
              "quadro",
              "calendario",
              "tabela",
              "linha",
              "carga",
            ] as const
          )
            // A Carga é da gestão de projetos; a Lista financeira mostra as cinco do mockup.
            .filter((kind) => !financeira || kind !== "carga")
            .map((kind) => (
              <button
                key={kind}
                type="button"
                role="tab"
                aria-selected={view === kind}
                onClick={() => setView(kind)}
                className={`border-b-2 px-3 py-2 text-[length:var(--texto-base)] ${
                  view === kind
                    ? "border-[var(--cor-acento)] font-medium text-[var(--cor-tinta)]"
                    : "border-transparent text-[var(--cor-tinta-fraca)] hover:text-[var(--cor-tinta)]"
                }`}
              >
                {VIEW_LABEL[kind]}
              </button>
            ))}
        </div>
      </div>

      <div className="p-6">
        {effective === "ativo" &&
        (!financeira || criandoConta || query.get("nova-tarefa") !== null) ? (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="nova-tarefa">
                {financeira ? "Nome da nova conta" : "Título da nova Tarefa"}
              </label>
              <input
                id="nova-tarefa"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") create();
                }}
                placeholder={lente ? lente.labels.novaPlaceholder : "Nova Tarefa"}
                // O "+" da árvore chega aqui com `?nova-tarefa=1`: o campo já
                // recebe o foco, senão o atalho para no meio do caminho.
                autoFocus={query.get("nova-tarefa") !== null || criandoConta}
                className="flex-1 rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] px-3 py-1.5 text-[length:var(--texto-base)]"
              />
              <Button
                variant="primary"
                onClick={create}
                disabled={!newTitle.trim() || criacaoRecusada !== undefined}
                disabledReason={
                  criacaoRecusada ?? "Escreva o título da Tarefa."
                }
              >
                Criar
              </Button>
              <Button
                onClick={() => setCriandoDeModelo(true)}
                disabled={criacaoRecusada !== undefined}
                disabledReason={criacaoRecusada ?? ""}
              >
                De modelo
              </Button>
              {financeira ? (
                <Button
                  onClick={() => {
                    setCriandoConta(false);
                    setNewTitle("");
                  }}
                >
                  Cancelar
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => {
                      setSelecionando((v) => !v);
                      setSelecionadas(new Set());
                      if (view !== "lista") setView("lista");
                    }}
                    aria-pressed={selecionando}
                    disabled={criacaoRecusada !== undefined}
                    disabledReason={criacaoRecusada ?? ""}
                  >
                    {selecionando ? "Sair da seleção" : "Selecionar várias"}
                  </Button>
                  <RunScheduledButton listId={list.id} report={reportar} />
                </>
              )}
            </div>
            {selecionando && !financeira ? (
              <div className="mb-4">
                <BulkStatusBar
                  tasks={tasks}
                  definitions={definitions}
                  selected={selecionadas}
                  onSelect={setSelecionadas}
                  onClear={() => setSelecionadas(new Set())}
                  report={reportar}
                />
              </div>
            ) : null}
          </>
        ) : null}

        {financeira && effective === "ativo" ? (
          <div className="mb-3">
            {selecionando && selecionadas.size > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1">
                  <BulkStatusBar
                    tasks={tasks}
                    definitions={definitions}
                    selected={selecionadas}
                    onSelect={setSelecionadas}
                    onClear={() => setSelecionadas(new Set())}
                    report={reportar}
                  />
                </span>
                <Button
                  onClick={() => {
                    setSelecionando(false);
                    setSelecionadas(new Set());
                  }}
                >
                  Sair da seleção
                </Button>
              </div>
            ) : (
              <FinanceToolbar
                listId={list.id}
                profile={lente}
                filters={financeFilters}
                onFilters={setFinanceFilters}
                onOpenFilters={() => setFiltrosAbertos((v) => !v)}
                filtrosAvancados={filtrosAvancados}
                selecionando={selecionando}
                onToggleSelecionar={() => {
                  setSelecionando((v) => !v);
                  setSelecionadas(new Set());
                  if (view !== "lista") setView("lista");
                }}
                report={reportar}
              />
            )}
          </div>
        ) : null}

        <div
          className={
            financeira && !filtrosAbertos && filtrosAvancados === 0
              ? "hidden"
              : "mb-4"
          }
        >
          <ViewBar
            listId={list.id}
            filters={filters}
            sortBy={sortBy}
            onFilters={(next) => {
              setFilters(next);
              setActiveViewId(null);
            }}
            onSort={(next) => {
              setSortBy(next);
              setActiveViewId(null);
            }}
            activeViewId={activeViewId}
            onOpenView={(view) => {
              setActiveViewId(view?.id ?? null);
              setFilters(view?.filters ?? FILTRO_VAZIO);
              setSortBy(view?.sortBy);
            }}
            report={reportar}
            {...(financeira ? { panelOpen: filtrosAbertos } : {})}
          />
          {filtrando ? (
            <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
              Mostrando {tasks.length} de {todas.length} Tarefa(s) — o filtro
              vale em todas as Visualizações.
            </p>
          ) : null}
        </div>

        {notice ? (
          <p
            role="status"
            className="mb-4 rounded-[var(--raio-controle)] bg-[var(--cor-sucesso-fraco)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-sucesso-texto)]"
          >
            {notice.text}
            {notice.taskId ? (
              <>
                {" "}
                <Link
                  href={`/estrutura/tarefas/${notice.taskId}`}
                  className="underline"
                >
                  Abrir
                </Link>
              </>
            ) : null}
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

        {tasks.length === 0 && (!financeira || todas.length === 0) ? (
          filtrando ? (
            <EmptyState
              title="Nenhuma Tarefa passa por este filtro."
              hint={`${todas.length} Tarefa(s) nesta Lista ficam fora dele. Limpe o filtro para vê-las.`}
            />
          ) : lente ? (
            <EmptyState
              title={lente.labels.semContas}
              hint={`Use “${lente.labels.nova}” para lançar a primeira.`}
            />
          ) : (
            <EmptyState title="Nenhuma Tarefa nesta Lista ainda." />
          )
        ) : view === "quadro" && espelhoComercial ? (
          <QuadroNegocios
            state={state}
            tasks={tasks}
            definitions={definitions}
            onError={setError}
            openTask={abrirNoQuadro}
            {...(effective === "ativo" && criacaoRecusada === undefined
              ? { onCreate: () => document.getElementById("nova-tarefa")?.focus() }
              : {})}
          />
        ) : view === "quadro" ? (
          <Quadro
            state={state}
            tasks={tasks}
            definitions={definitions}
            listId={list.id}
            onError={setError}
            openTask={openTask}
          />
        ) : view === "calendario" ? (
          <Calendario state={state} tasks={tasks} openTask={openTask} />
        ) : view === "tabela" ? (
          <Tabela state={state} tasks={tasks} />
        ) : view === "linha" ? (
          <LinhaDoTempo
            state={state}
            tasks={tasks}
            openTask={openTask}
            editavel={effective === "ativo" && criacaoRecusada === undefined}
            report={(result, message) => {
              if (result.ok) {
                setError(null);
                setNotice({ text: message });
              } else {
                setNotice(null);
                setError(
                  result.error ?? "Não foi possível concluir a operação.",
                );
              }
            }}
          />
        ) : view === "carga" ? (
          <CargaDeTrabalho state={state} tasks={tasks} openTask={openTask} />
        ) : lente ? (
          <>
            <div className="hidden sm:block">
              <FinanceTable
                state={state}
                profile={lente}
                tasks={tasks}
                filtrado={filtrando}
                definitions={definitions}
                selected={selecionadas}
                selecionando={selecionando}
                onToggle={(id) =>
                  setSelecionadas((atual) => {
                    const next = new Set(atual);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
                onToggleMany={(ids, on) =>
                  setSelecionadas((atual) => {
                    const next = new Set(atual);
                    for (const id of ids)
                      if (on) next.add(id);
                      else next.delete(id);
                    return next;
                  })
                }
                openTask={openTask}
                report={reportar}
              />
            </div>
            <div className="sm:hidden">
              <FinanceCards state={state} profile={lente} tasks={tasks} openTask={openTask} />
            </div>
          </>
        ) : (
          <ListaAgrupada
            state={state}
            tasks={tasks}
            definitions={definitions}
            openTask={openTask}
            {...(selecionando
              ? {
                  selected: selecionadas,
                  onToggle: (id: string) =>
                    setSelecionadas((atual) => {
                      const next = new Set(atual);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    }),
                }
              : {})}
          />
        )}
      </div>

      {lente?.kind === "receber" ? (
        <SerieDeParcelasDialog
          open={criandoSerie}
          onClose={() => setCriandoSerie(false)}
          onCreated={(tasks, cliente) => {
            // As novas nascem "para receber": um filtro de cartão as esconderia.
            setFinanceFilters(FILTROS_INICIAIS);
            setError(null);
            setNotice({
              text: `${tasks.length} conta(s) a receber criada(s) para ${cliente}, em “A receber”.`,
              ...(tasks[0] ? { taskId: tasks[0].id } : {}),
            });
          }}
        />
      ) : null}
      {financeira ? (
        <ContaDrawer
          key={openTaskId ?? "fechado"}
          taskId={openTaskId}
          onClose={closeTask}
          report={reportar}
        />
      ) : negocioAberto ? (
        // O card do Funil abre o Negócio (contato, conversa, roteiro), não a
        // Tarefa que o espelha: é o dado do lead que o Comercial veio ver.
        <SidePanel title={negocioAberto.title} open onClose={closeTask} wide bare>
          <DealScreen
            dealId={negocioAberto.id}
            embedded={{
              path: (
                <>
                  {config.path.map((node, index) => (
                    <span key={node.id}>
                      {index > 0 ? " › " : ""}
                      {node.name}
                    </span>
                  ))}
                </>
              ),
              onClose: closeTask,
            }}
          />
        </SidePanel>
      ) : (
        <TaskPanel taskId={openTaskId} onClose={closeTask} onMove={openMove} />
      )}
      <MoveTaskDialog
        taskId={movingTaskId}
        onClose={closeMove}
        onDone={(text) => setNotice({ text })}
      />
    </>
  );
}

type Definition = NonNullable<
  ReturnType<typeof effectiveListConfig>
>["statusSet"]["definitions"][number];

function TaskRow({
  state,
  task,
  onOpen,
}: {
  readonly state: DataState;
  readonly task: Task;
  readonly onOpen: (taskId: string) => void;
}) {
  const fmt = useFormat();
  const checklist = checklistProgress(task);
  const subtasks = subtaskProgress(state, task.id);
  const overdue = isOverdue(state, task, new Date());
  const blocked = isBlocked(state, task);
  const own = task.lifecycle;

  // A3 — opens the side panel over the List instead of leaving the collection;
  // the panel itself offers "abrir em página cheia" for the addressable record.
  return (
    <button
      type="button"
      onClick={() => onOpen(task.id)}
      className="flex w-full items-start justify-between gap-3 rounded-[var(--raio-controle)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-3 text-left hover:border-[var(--cor-traco-forte)]"
    >
      <div className="min-w-0">
        <p className="truncate text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)]">
          {task.title}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
          {task.readableId ? (
            <span className="font-mono">{task.readableId}</span>
          ) : null}
          {task.dueDate ? (
            <span>vence {fmt.taskDate(task.dueDate)}</span>
          ) : null}
          {task.priority !== "semPrioridade" ? (
            <span>{PRIORITY_LABEL[task.priority]}</span>
          ) : null}
          {checklist ? (
            <span>
              checklist {checklist.done}/{checklist.total}
            </span>
          ) : null}
          {subtasks ? (
            <span>
              subtarefas {subtasks.done}/{subtasks.total}
            </span>
          ) : null}
          {overdue ? (
            <ConditionMarker tone="danger">Vencida</ConditionMarker>
          ) : null}
          {blocked ? (
            <ConditionMarker tone="warning">Bloqueada</ConditionMarker>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {own !== "ativo" ? <StateSeal state={own} /> : null}
        <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
          {task.assignees.length > 0
            ? `${task.assignees.length} responsável(is)`
            : "sem Responsável"}
        </span>
      </div>
    </button>
  );
}

function ListaAgrupada({
  state,
  tasks,
  definitions,
  openTask,
  selected,
  onToggle,
}: {
  readonly state: DataState;
  readonly tasks: readonly Task[];
  readonly definitions: readonly Definition[];
  readonly openTask: (taskId: string) => void;
  /** Modo de seleção em lote: presente, cada linha ganha uma caixa. */
  readonly selected?: ReadonlySet<string>;
  readonly onToggle?: (taskId: string) => void;
}) {
  return (
    <div className="space-y-6">
      {definitions.map((definition) => {
        const group = tasks.filter((task) => task.statusId === definition.id);
        return (
          <section key={definition.id}>
            <h2 className="mb-2 flex items-center gap-2 text-[length:var(--texto-base)] font-semibold text-[var(--cor-tinta)]">
              <CategoryDot color={definition.color} label={definition.name} />
              <span className="font-normal text-[var(--cor-tinta-fraca)]">
                {STATUS_CATEGORY_LABEL[definition.category]} · {group.length}
              </span>
            </h2>
            {group.length === 0 ? (
              <p className="rounded-[var(--raio-controle)] border border-dashed border-[var(--cor-traco-forte)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                Nenhuma Tarefa em <em>{definition.name}</em>.
              </p>
            ) : (
              <ul className="space-y-2">
                {group.map((task) => (
                  <li
                    key={task.id}
                    className={
                      selected && onToggle ? "flex items-start gap-2" : ""
                    }
                  >
                    {selected && onToggle ? (
                      <input
                        type="checkbox"
                        checked={selected.has(task.id)}
                        onChange={() => onToggle(task.id)}
                        aria-label={`Selecionar ${task.title}`}
                        className="mt-4 size-4 shrink-0 accent-[var(--cor-acento)]"
                      />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <TaskRow state={state} task={task} onOpen={openTask} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Quadro({
  state,
  tasks,
  definitions,
  listId,
  onError,
  openTask,
}: {
  readonly state: DataState;
  readonly tasks: readonly Task[];
  readonly definitions: readonly Definition[];
  readonly listId: string;
  readonly onError: (message: string | null) => void;
  readonly openTask: (taskId: string) => void;
}) {
  const run = useRun();
  const [dragging, setDragging] = useState<string | null>(null);

  const drop = (statusId: string) => {
    if (!dragging) return;
    const result = run((data, memberId) =>
      changeTaskStatus(data, memberId, dragging, statusId),
    );
    onError(result.ok ? null : result.error);
    setDragging(null);
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3">
        {definitions.map((definition) => {
          const group = tasks.filter((task) => task.statusId === definition.id);
          return (
            <div
              key={definition.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => drop(definition.id)}
              className="flex w-72 shrink-0 flex-col rounded-[var(--raio-superficie)] bg-[var(--cor-superficie-2)] p-2"
            >
              <h2 className="mb-2 flex items-center justify-between px-1 text-[length:var(--texto-base)] font-semibold text-[var(--cor-tinta)]">
                <CategoryDot color={definition.color} label={definition.name} />
                <span className="font-normal text-[var(--cor-tinta-fraca)]">
                  {group.length}
                </span>
              </h2>
              <p className="mb-2 px-1 text-[11px] uppercase tracking-wide text-[var(--cor-tinta-fraca)]">
                {STATUS_CATEGORY_LABEL[definition.category]}
              </p>
              {group.length === 0 ? (
                <p className="rounded-[var(--raio-controle)] border border-dashed border-[var(--cor-traco-forte)] px-2 py-4 text-center text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                  Nenhuma Tarefa em <em>{definition.name}</em>
                </p>
              ) : (
                <ul className="space-y-2">
                  {group.map((task) => (
                    <li
                      key={task.id}
                      draggable
                      onDragStart={() => setDragging(task.id)}
                      onDragEnd={() => setDragging(null)}
                    >
                      <TaskRow state={state} task={task} onOpen={openTask} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
        Arrastar altera o Status. As validações da Lista continuam valendo: a
        coluna recusa a Tarefa quando a Funcionalidade exige Subtarefas ou
        Checklists concluídos. Lista {listId}.
      </p>
    </div>
  );
}

function Calendario({
  state,
  tasks,
  openTask,
}: {
  readonly state: DataState;
  readonly tasks: readonly Task[];
  readonly openTask: (taskId: string) => void;
}) {
  const fmt = useFormat();
  const withDates = tasks.filter((task) => task.dueDate);
  const without = tasks.length - withDates.length;

  if (withDates.length === 0) {
    return (
      <EmptyState
        title="Nenhuma Tarefa com data nesta Lista."
        hint="O Calendário posiciona Tarefas por Data; um dia civil não recebe fuso."
      />
    );
  }

  const byDate = new Map<string, Task[]>();
  for (const task of withDates) {
    const key = task.dueDate?.value.slice(0, 10) ?? "";
    byDate.set(key, [...(byDate.get(key) ?? []), task]);
  }

  return (
    <div className="space-y-4">
      {[...byDate.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, group]) => (
          <section key={date}>
            <h2 className="mb-2 text-[length:var(--texto-base)] font-semibold text-[var(--cor-tinta)]">
              {fmt.taskDate({ form: "civilDay", value: date })}
            </h2>
            <ul className="space-y-2">
              {group.map((task) => (
                <li key={task.id}>
                  <TaskRow state={state} task={task} onOpen={openTask} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      {without > 0 ? (
        <p className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
          {without} Tarefa(s) sem data não aparecem no Calendário.
        </p>
      ) : null}
    </div>
  );
}

function Tabela({
  state,
  tasks,
}: {
  readonly state: DataState;
  readonly tasks: readonly Task[];
}) {
  const fmt = useFormat();
  return (
    <div className="overflow-x-auto rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
      <table className="w-full text-[length:var(--texto-base)]">
        <thead className="border-b border-[var(--cor-traco)] bg-[var(--cor-superficie-2)] text-left">
          <tr>
            {[
              "Título",
              "Status",
              "Categoria",
              "Prioridade",
              "Vencimento",
              "Responsáveis",
            ].map((label) => (
              <th
                key={label}
                className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--cor-traco)]">
          {tasks.map((task) => {
            const definition = statusDefinition(
              state,
              task.listId,
              task.statusId,
            );
            const category = statusCategory(state, task);
            return (
              <tr key={task.id} className="hover:bg-[var(--cor-superficie-2)]">
                <td className="px-3 py-2">
                  <Link
                    href={`/estrutura/tarefas/${task.id}`}
                    className="font-medium text-[var(--cor-tinta)] hover:underline"
                  >
                    {task.title}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {definition ? (
                    <CategoryDot
                      color={definition.color}
                      label={definition.name}
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-[var(--cor-tinta-fraca)]">
                  {category ? STATUS_CATEGORY_LABEL[category] : "—"}
                  {isTerminalCategory(category) ? "" : ""}
                </td>
                <td className="px-3 py-2 text-[var(--cor-tinta-fraca)]">
                  {PRIORITY_LABEL[task.priority]}
                </td>
                <td className="px-3 py-2 text-[var(--cor-tinta-fraca)]">
                  {task.dueDate ? fmt.taskDate(task.dueDate) : "—"}
                </td>
                <td className="px-3 py-2 text-[var(--cor-tinta-fraca)]">
                  {task.assignees.length === 0
                    ? "—"
                    : task.assignees
                        .map((assignee) =>
                          assignee.kind === "member"
                            ? state.members.find((m) => m.id === assignee.id)
                                ?.displayName
                            : state.agents.find((a) => a.id === assignee.id)
                                ?.name,
                        )
                        .filter(Boolean)
                        .join(", ")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
