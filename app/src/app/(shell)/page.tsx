"use client";

/**
 * T02 — Início.
 *
 * Cada bloco é uma consulta filtrada sobre entidade que já existe; nada aqui é
 * conceito novo (PRD I.1).
 *
 * "Meus Negócios" usa Proprietário, não Responsável: o Negócio não tem
 * Responsável (RN-NEG-02).
 *
 * A agenda do dia são Tarefas de Tipo Reunião com data COM HORA. Evento de
 * calendário é a decisão D8, futura: "hoje uma reunião é Tarefa com Tipo
 * apropriado, data com hora e Vínculo a Contato" (documento 06, 20.16).
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckSquare,
  FileCheck,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useData, useRun, useSession } from "@/data/store";
import { createChatSession, sendChatMessage } from "@/data/operations";
import {
  contactDisplayName,
  effectiveLifecycleOfTask,
  isOverdue,
  isTerminalCategory,
  statusCategory,
  statusDefinition,
} from "@/data/derive";
import { APPROVAL_REASON_LABEL, EFFECT_CLASS_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import { Button, CategoryDot, ConditionMarker, EmptyState, Toast } from "@/features/shell/ui";
import type { DataState } from "@/data/state";
import type { Task } from "@/data/types";

/** §15 — um corte que esconde linhas sempre diz o corte e oferece o resto. */
const HOME_PAGE_SIZE = 4;

/** Os quatro pilares do manifesto da marca. */
const PILARES = ["Propósito", "Criatividade", "Tecnologia", "Transformação"];

export default function InicioPage() {
  const { memberId } = useSession();
  const state = useData((data) => data);
  const run = useRun();
  const fmt = useFormat();
  const router = useRouter();
  const [pergunta, setPergunta] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  const member = state.members.find((m) => m.id === memberId);
  const primeiroNome = member?.displayName.split(" ")[0] ?? "";

  const minhas = state.tasks
    .filter((task) => task.assignees.some((a) => a.kind === "member" && a.id === memberId))
    .filter((task) => effectiveLifecycleOfTask(state, task.id) === "ativo");

  const abertas = minhas.filter((task) => !isTerminalCategory(statusCategory(state, task)));

  // A agenda: Tarefa com HORA marcada, ordenada pelo relógio.
  const agenda = abertas
    .filter((task) => task.dueDate?.form === "instant")
    .sort((a, b) => String(a.dueDate?.value).localeCompare(String(b.dueDate?.value)));

  // O que tem hora vive na agenda; a lista fica com o resto, para a mesma
  // Tarefa não aparecer duas vezes na mesma tela.
  const semHora = abertas.filter((task) => task.dueDate?.form !== "instant");
  const vencidas = semHora.filter((task) => isOverdue(state, task, now));
  const semana = semHora.filter((task) => !vencidas.includes(task) && dueWithinDays(task, now, 7));
  const depois = semHora.filter((task) => !vencidas.includes(task) && !semana.includes(task));
  const concluidas = minhas.filter((task) => statusCategory(state, task) === "concluido");

  const conversas = state.conversations.filter(
    (c) => c.lifecycle === "ativo" && c.assignee?.kind === "member" && c.assignee.id === memberId,
  );
  const negocios = state.deals.filter(
    (d) => d.ownerMemberId === memberId && d.situation === "aberto" && d.lifecycle === "ativo",
  );
  const aprovacoes = state.approvals.filter(
    (a) => a.decision === undefined && a.approverMemberId === memberId,
  );

  /**
   * A pergunta abre uma Sessão de Chat com ela dentro — é a entidade que a
   * ontologia dá para conversar com um Agente (B83). Não há Modelo executando
   * aqui: a resposta nasce de uma Execução, e o protótipo não executa nenhuma.
   */
  const perguntar = () => {
    if (!pergunta.trim()) return;
    const resultado = run((data, actingId) => {
      const sessao = createChatSession(data, actingId, {
        title: pergunta.trim().slice(0, 60),
      });
      if (!sessao.ok) return sessao;
      sendChatMessage(data, actingId, sessao.value.id, pergunta);
      return sessao;
    });
    if (resultado.ok) {
      setErro(null);
      setPergunta("");
      router.push(`/ia/chat/${resultado.value.id}`);
    } else {
      setErro(resultado.error);
    }
  };

  return (
    /*
      A partir de xl a página cabe na janela: herói, números e Ações rápidas têm
      tamanho fixo, e as colunas dividem o que sobra rolando por dentro. Abaixo
      de xl as colunas empilham, e aí a rolagem da página é a certa — prender a
      altura num telefone esconderia conteúdo em vez de aproximar o rodapé.
    */
    <div className="flex flex-col gap-4 p-6 xl:h-full xl:min-h-0">
      {erro ? (
        <Toast tone="error" onDismiss={() => setErro(null)}>
          {erro}
        </Toast>
      ) : null}

      {/* ---------------------------------------------------------- herói */}
      <section className="aura-marca shrink-0 overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-6">
        {/*
          Laço de fundo. `muted` + `playsInline` porque autoplay com som é
          bloqueado e, num painel de trabalho, seria hostil de qualquer forma.
          `poster` cobre o intervalo até o vídeo carregar, e é o mesmo quadro do
          laço — sem ele, o cartão pisca vazio na primeira visita.
        */}
        <video
          className="video-fundo"
          src="/marca/fundo-heroi.mp4"
          poster="/marca/fundo-heroi.jpg"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          tabIndex={-1}
        />
        <span className="video-cortina" aria-hidden="true" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="text-[length:var(--texto-xs)] uppercase tracking-[0.28em] text-[var(--cor-tinta-fraca)]">
              Seu copiloto de gestão
            </p>
            <h1 className="mt-2 text-[2rem] font-[var(--peso-forte)] leading-tight tracking-tight text-[var(--cor-tinta)]">
              {saudacao(now, state.workspace.locale.timezone)},{" "}
              <span className="text-[var(--cor-acento)]">{primeiroNome}</span>.
            </h1>
            <p className="mt-1 text-[length:var(--texto-md)] text-[var(--cor-tinta-fraca)]">
              O que é seu hoje, a gente resolve junto.
            </p>

            <div className="mt-5 flex max-w-2xl items-center gap-2 rounded-[var(--raio-superficie)] border border-[var(--cor-acento)] bg-[var(--cor-papel)] px-3 py-2">
              <Sparkles className="size-4 shrink-0 text-[var(--cor-acento)]" aria-hidden="true" />
              <label className="sr-only" htmlFor="pergunta">
                Pergunte ao seu assistente
              </label>
              <input
                id="pergunta"
                value={pergunta}
                onChange={(event) => setPergunta(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") perguntar();
                }}
                placeholder="Pergunte ao seu assistente…"
                className="min-w-0 flex-1 bg-transparent text-[length:var(--texto-base)] text-[var(--cor-tinta)] outline-none placeholder:text-[var(--cor-tinta-fraca)]"
              />
              <button
                type="button"
                onClick={perguntar}
                disabled={pergunta.trim() === ""}
                aria-label="Abrir uma Sessão de Chat com esta pergunta"
                title={
                  pergunta.trim() === ""
                    ? "Escreva a pergunta primeiro."
                    : "Abre uma Sessão de Chat com esta pergunta."
                }
                className="grid size-7 shrink-0 place-items-center rounded-[var(--raio-controle)] bg-[var(--cor-acento)] text-[var(--cor-acento-texto)] disabled:opacity-40"
              >
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Atalho href="/ia/chat" icon={<Sparkles className="size-3.5" />}>
                Falar com o Assistente
              </Atalho>
              <Atalho href="/estrutura/tarefas" icon={<CheckSquare className="size-3.5" />}>
                Minhas Tarefas
              </Atalho>
              <Atalho href="/buscar" icon={<Search className="size-3.5" />}>
                Buscar
              </Atalho>
              <Atalho href="/paineis" icon={<TrendingUp className="size-3.5" />}>
                Painéis
              </Atalho>
            </div>
          </div>

          <div className="hidden items-center gap-8 lg:flex">
            {/*
              A orbe é o Assistente. Ela abre uma Sessão de Chat — não capta
              voz, e um alvo desse tamanho prometendo microfone seria promessa
              que o produto não cumpre.
            */}
            <button
              type="button"
              onClick={() => router.push("/ia/chat")}
              className="orbe size-56 shrink-0 rounded-full"
              aria-label="Falar com o Assistente"
            >
              <span className="orbe-anel size-56" aria-hidden="true" />
              <span className="orbe-anel size-44" aria-hidden="true" />
              <span className="orbe-anel size-32" aria-hidden="true" />
              <span className="orbe-varredura size-52" aria-hidden="true" />
              <span className="orbe-nucleo size-24">
                <Sparkles className="size-7 text-white" aria-hidden="true" />
              </span>
              <span className="absolute -bottom-1 text-[length:var(--texto-xs)] uppercase tracking-[0.2em] text-[var(--cor-tinta-fraca)]">
                Falar com o Assistente
              </span>
            </button>

            <div className="text-right" aria-hidden="true">
              <p className="text-[length:var(--texto-xs)] uppercase leading-relaxed tracking-[0.2em] text-[var(--cor-tinta-fraca)]">
                Mais produtividade
                <br />
                para o que realmente
                <br />
                importa
              </p>
              <ul className="mt-4 space-y-0.5">
                {PILARES.map((pilar) => (
                  <li
                    key={pilar}
                    className="text-[length:var(--texto-xs)] uppercase tracking-[0.2em] text-[var(--cor-tinta)]"
                  >
                    {pilar}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                Juntos, vamos mais longe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- números */}
      <div className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Numero
          href="/estrutura/tarefas"
          icon={<CheckSquare className="size-4" />}
          label="Tarefas abertas"
          value={abertas.length}
          detail={vencidas.length > 0 ? `${vencidas.length} vencida(s)` : undefined}
          alarming={vencidas.length > 0}
        />
        <Numero
          href="/ia/aprovacoes"
          icon={<FileCheck className="size-4" />}
          label="Aprovações pendentes"
          value={aprovacoes.length}
        />
        <Numero
          href="/crm/caixa-de-entrada"
          icon={<MessageSquare className="size-4" />}
          label="Conversas atribuídas a mim"
          value={conversas.length}
        />
        <Numero
          href="/crm/negocios"
          icon={<TrendingUp className="size-4" />}
          label="Meus Negócios abertos"
          value={negocios.length}
        />
      </div>

      {/* ------------------------------------------------------- colunas */}
      <div className="grid gap-4 xl:min-h-[18rem] xl:flex-1 xl:grid-cols-3 xl:overflow-hidden">
        <Bloco titulo="Minhas Tarefas" contagem={semHora.length} href="/estrutura/tarefas" preenche>
          {semHora.length === 0 ? (
            <EmptyState
              title="Nada atribuído a você."
              hint="Uma Tarefa aparece aqui quando alguém a atribui a você."
            />
          ) : (
            <div className="space-y-4">
              <Grupo label="Vencidas" tasks={vencidas} state={state} vencida />
              <Grupo label="Esta semana" tasks={semana} state={state} />
              <Grupo label="Depois" tasks={depois} state={state} />
              {concluidas.length > 0 ? (
                <Grupo label="Concluídas" tasks={concluidas.slice(0, 2)} state={state} concluida />
              ) : null}
            </div>
          )}
        </Bloco>

        <Bloco titulo="Agenda de hoje" contagem={agenda.length} href="/estrutura/tarefas" preenche>
          {agenda.length === 0 ? (
            <EmptyState
              title="Nenhum horário marcado."
              hint="Uma reunião é uma Tarefa de Tipo Reunião com data e hora — Evento de calendário é decisão futura da ontologia (D8)."
            />
          ) : (
            <ul className="space-y-3">
              {agenda.slice(0, HOME_PAGE_SIZE).map((task) => {
                const lista = state.lists.find((l) => l.id === task.listId);
                const tipo = state.taskTypes.find((t) => t.id === task.taskTypeId);
                return (
                  <li key={task.id} className="flex gap-3">
                    <span className="w-14 shrink-0 text-right">
                      <span className="block text-[length:var(--texto-base)] font-[var(--peso-medio)] text-[var(--cor-tinta)]">
                        {fmt.taskDate(task.dueDate!).split(" ").at(-1)}
                      </span>
                      {task.estimate ? (
                        <span className="block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                          {task.estimate} min
                        </span>
                      ) : null}
                    </span>
                    <span className="w-px shrink-0 bg-[var(--cor-acento)]" aria-hidden="true" />
                    <Link href={`/estrutura/tarefas/${task.id}`} className="min-w-0 flex-1 hover:underline">
                      <span className="block truncate text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                        {task.title}
                      </span>
                      <span className="block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        {tipo?.name} · {lista?.name}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Bloco>

        {/* A coluna inteira rola junto: três cartões rolando cada um por si
            dariam três barras concorrendo no mesmo palmo de tela. */}
        <div className="relative grid content-start gap-4 xl:min-h-0 xl:overflow-y-auto">
          <Bloco titulo="Aprovações pendentes" contagem={aprovacoes.length} href="/ia/aprovacoes">
            {aprovacoes.length === 0 ? (
              <EmptyState title="Nenhuma Solicitação esperando por você." />
            ) : (
              <ul className="space-y-2">
                {aprovacoes.slice(0, 2).map((approval) => (
                  <li key={approval.id}>
                    <Link
                      href={`/ia/aprovacoes?aprovar=${approval.id}:aprovada`}
                      className="block rounded-[var(--raio-controle)] border border-[var(--cor-traco)] p-3 hover:border-[var(--cor-traco-forte)]"
                    >
                      <p className="text-[length:var(--texto-base)] font-[var(--peso-medio)] text-[var(--cor-tinta)]">
                        {state.tools.find((t) => t.id === approval.object.toolId)?.name ??
                          approval.object.toolId}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                        {approval.object.input}
                      </p>
                      <p className="mt-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        motivo: {APPROVAL_REASON_LABEL[approval.reason] ?? approval.reason} · classe de
                        efeito{" "}
                        {EFFECT_CLASS_LABEL[approval.object.effectClass] ?? approval.object.effectClass}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Bloco>

          <Bloco
            titulo="Conversas atribuídas a mim"
            contagem={conversas.length}
            href="/crm/caixa-de-entrada"
          >
            {conversas.length === 0 ? (
              <EmptyState title="Nenhuma Conversa atribuída a você." />
            ) : (
              <ul className="space-y-2">
                {conversas.slice(0, 2).map((conversation) => {
                  const contato = state.contacts.find((c) => c.id === conversation.contactId);
                  const ultima = conversation.messages.at(-1);
                  return (
                    <li key={conversation.id}>
                      <Link
                        href={`/crm/caixa-de-entrada/${conversation.id}`}
                        className="block rounded-[var(--raio-controle)] border border-[var(--cor-traco)] p-3 hover:border-[var(--cor-traco-forte)]"
                      >
                        <p className="flex items-center justify-between gap-2">
                          <span className="truncate text-[length:var(--texto-base)] font-[var(--peso-medio)] text-[var(--cor-tinta)]">
                            {contato ? contactDisplayName(contato) : conversation.title}
                          </span>
                          {ultima ? (
                            <span className="shrink-0 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                              {fmt.instant(ultima.createdAt)}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                          {ultima?.content}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Bloco>

          <Bloco titulo="Meus Negócios abertos" contagem={negocios.length} href="/crm/negocios">
            {negocios.length === 0 ? (
              <EmptyState
                title="Você não é Proprietário de nenhum Negócio aberto."
                hint="O Negócio não tem Responsável: quem responde por ele é o Proprietário."
              />
            ) : (
              <ul className="space-y-2">
                {negocios.slice(0, 3).map((deal) => (
                  <li key={deal.id}>
                    <Link
                      href={`/crm/negocios/${deal.id}`}
                      className="flex items-center justify-between gap-2 rounded-[var(--raio-controle)] border border-[var(--cor-traco)] p-3 hover:border-[var(--cor-traco-forte)]"
                    >
                      <span className="min-w-0 truncate text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                        {deal.title}
                      </span>
                      {deal.value ? (
                        <span className="shrink-0 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                          {fmt.money(deal.value)}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Bloco>
        </div>
      </div>

      {/* -------------------------------------------------- ações rápidas */}
      <section className="shrink-0">
        <p className="mb-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">Ações rápidas</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AcaoRapida href="/estrutura" icon={<Plus className="size-4" />}>
            Criar na Estrutura
          </AcaoRapida>
          <AcaoRapida href="/ia/chat" icon={<Sparkles className="size-4" />}>
            Nova Sessão de Chat
          </AcaoRapida>
          <AcaoRapida href="/crm/contatos" icon={<MessageSquare className="size-4" />}>
            Importar Contatos
          </AcaoRapida>
          <AcaoRapida href="/paineis" icon={<CalendarDays className="size-4" />}>
            Ver Painéis
          </AcaoRapida>
        </div>
      </section>
    </div>
  );
}

/**
 * A hora é lida no fuso da Localidade do Espaço de Trabalho, não no relógio de
 * quem renderiza: `getHours()` responde diferente no servidor e no navegador, e
 * a diferença aparece como erro de hidratação.
 */
function saudacao(now: Date, timezone: string): string {
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: timezone }).format(now),
  );
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function dueWithinDays(task: Task, now: Date, days: number): boolean {
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate.value);
  const limit = new Date(now);
  limit.setDate(limit.getDate() + days);
  limit.setHours(23, 59, 59, 999);
  return due <= limit;
}

function Atalho({
  href,
  icon,
  children,
}: {
  readonly href: string;
  readonly icon: React.ReactNode;
  readonly children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-full border border-[var(--cor-traco-forte)] px-3 py-1.5 text-[length:var(--texto-base)] text-[var(--cor-tinta)] hover:border-[var(--cor-acento)] hover:text-[var(--cor-acento)]"
    >
      <span className="text-[var(--cor-tinta-fraca)]">{icon}</span>
      {children}
    </Link>
  );
}

function Numero({
  href,
  icon,
  label,
  value,
  detail,
  alarming,
}: {
  readonly href: string;
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: number;
  readonly detail?: string;
  readonly alarming?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4 hover:border-[var(--cor-traco-forte)]"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-[var(--raio-controle)] bg-[var(--cor-acento-fraco)] text-[var(--cor-acento)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
          {label}
        </span>
        <span className="flex items-baseline gap-2">
          <span className="text-[length:var(--texto-xl)] font-[var(--peso-forte)] text-[var(--cor-tinta)]">
            {value}
          </span>
          {detail ? (
            <span
              className={`text-[length:var(--texto-sm)] ${
                alarming ? "text-[var(--cor-perigo-texto)]" : "text-[var(--cor-tinta-fraca)]"
              }`}
            >
              {detail}
            </span>
          ) : null}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-[var(--cor-tinta-fraca)]" aria-hidden="true" />
    </Link>
  );
}

function Bloco({
  titulo,
  contagem,
  href,
  preenche = false,
  children,
}: {
  readonly titulo: string;
  readonly contagem: number;
  readonly href: string;
  /**
   * Ocupa a altura da coluna e rola por dentro. Só para o cartão que É a
   * coluna: num cartão de altura automática, `flex-1` com `min-h-0` colapsa o
   * corpo em vez de crescer — foi o que espremeu os três da direita para 29px.
   */
  readonly preenche?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4 ${
        preenche ? "flex flex-col overflow-hidden" : ""
      }`}
    >
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-[length:var(--texto-md)] font-[var(--peso-forte)] text-[var(--cor-tinta)]">
          {titulo} <span className="font-[var(--peso-normal)] text-[var(--cor-tinta-fraca)]">({contagem})</span>
        </h2>
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)] hover:text-[var(--cor-acento)]"
        >
          Ver todas
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      <div className={preenche ? "min-h-0 flex-1 overflow-y-auto" : ""}>{children}</div>
    </section>
  );
}

function Grupo({
  label,
  tasks,
  state,
  vencida,
  concluida,
}: {
  readonly label: string;
  readonly tasks: readonly Task[];
  readonly state: DataState;
  readonly vencida?: boolean;
  readonly concluida?: boolean;
}) {
  const fmt = useFormat();
  if (tasks.length === 0) return null;
  const mostradas = tasks.slice(0, HOME_PAGE_SIZE);

  return (
    <div>
      <p className="mb-1 text-[length:var(--texto-xs)] font-[var(--peso-medio)] uppercase tracking-wide text-[var(--cor-tinta-fraca)]">
        {label}
      </p>
      <ul className="space-y-2">
        {mostradas.map((task) => {
          const definition = statusDefinition(state, task.listId, task.statusId);
          const lista = state.lists.find((l) => l.id === task.listId);
          return (
            <li key={task.id}>
              <Link
                href={`/estrutura/tarefas/${task.id}`}
                className="flex items-start justify-between gap-3 rounded-[var(--raio-controle)] border border-[var(--cor-traco)] p-3 hover:border-[var(--cor-traco-forte)]"
              >
                <span className="min-w-0">
                  <span
                    className={`block truncate text-[length:var(--texto-base)] ${
                      concluida
                        ? "text-[var(--cor-tinta-fraca)] line-through"
                        : "font-[var(--peso-medio)] text-[var(--cor-tinta)]"
                    }`}
                  >
                    {task.title}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                    {task.readableId ? <span className="font-mono">{task.readableId}</span> : null}
                    <span>{lista?.name}</span>
                    {task.dueDate ? <span>vence {fmt.taskDate(task.dueDate)}</span> : null}
                    {vencida ? <ConditionMarker tone="danger">Vencida</ConditionMarker> : null}
                  </span>
                </span>
                {definition ? (
                  <span className="shrink-0 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                    <CategoryDot color={definition.color} label={definition.name} />
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      {tasks.length > mostradas.length ? (
        <p className="mt-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
          Mostrando {mostradas.length} de {tasks.length}.
        </p>
      ) : null}
    </div>
  );
}

function AcaoRapida({
  href,
  icon,
  children,
}: {
  readonly href: string;
  readonly icon: React.ReactNode;
  readonly children: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Button variant="secondary" full>
        <span className="flex items-center justify-center gap-2">
          {icon}
          {children}
        </span>
      </Button>
    </Link>
  );
}
