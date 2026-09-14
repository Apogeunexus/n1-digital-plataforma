"use client";

/**
 * T21 — the three columns of the Caixa de Entrada: Filas e Canais · Conversas ·
 * a Conversa aberta (the `children`).
 *
 * Attending is queue work: whoever answers spends the day switching between
 * conversations, and one navigation per switch is a tax charged hundreds of
 * times a day. The queue stays on screen and the switch is instant.
 *
 * The filters live in the URL, so switching conversation never loses them and a
 * filtered view is shareable.
 */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowUpDown, Check, Clock, Inbox, MailOpen, SlidersHorizontal, Star } from "lucide-react";
import { useData, useRun, useSession } from "@/data/store";
import { contactDisplayName } from "@/data/derive";
import { CHANNEL_CAPABILITIES, toggleConversationStar } from "@/data/operations";
import { CHANNEL_ICON } from "@/features/crm/conversation-thread";
import { ContactAvatar } from "@/features/crm/contact-card";
import { CHANNEL_TYPE_LABEL, CONVERSATION_STATE_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import {
  Button,
  ConditionMarker,
  ConfirmDialog,
  EmptyState,
  Field,
  Select,
  StateSeal,
} from "@/features/shell/ui";
import type { DataState } from "@/data/state";
import type { Conversation } from "@/data/types";

const SCOPES = [
  { value: "todas", label: "Todas" },
  { value: "minhas", label: "Minhas" },
  { value: "semAtribuido", label: "Sem Atribuído" },
  { value: "semFila", label: "Sem Fila" },
  { value: "adiadas", label: "Adiadas" },
] as const;

type Scope = (typeof SCOPES)[number]["value"];

const ABAS = [
  { value: "naoLidos", label: "Não lidos", Icone: MailOpen },
  { value: "todos", label: "Todos", Icone: Inbox },
  { value: "recentes", label: "Recentes", Icone: Clock },
  { value: "marcados", label: "Marcados", Icone: Star },
] as const;

type Aba = (typeof ABAS)[number]["value"];

const ORDENS = [
  { value: "recentes", label: "Mais recentes" },
  { value: "antigos", label: "Mais antigas" },
  { value: "naoLidas", label: "Mais não lidas primeiro" },
] as const;

type Ordem = (typeof ORDENS)[number]["value"];

const STATES = [
  { value: "todos", label: "Todos" },
  { value: "aberta", label: "Aberta" },
  { value: "pendente", label: "Pendente" },
  { value: "resolvida", label: "Resolvida" },
] as const;

export function InboxColumns({ children }: { readonly children: ReactNode }) {
  const state = useData((data) => data);
  const { memberId } = useSession();
  const run = useRun();
  const fmt = useFormat();
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();

  const aba = (query.get("aba") ?? "naoLidos") as Aba;
  const ordem = (query.get("ordem") ?? "recentes") as Ordem;
  const [filtrando, setFiltrando] = useState(false);
  const [ordenando, setOrdenando] = useState(false);
  const [selecionadas, setSelecionadas] = useState<readonly string[]>([]);
  const scope = (query.get("escopo") ?? "todas") as Scope;
  const conversationState = query.get("estado") ?? "todos";
  const channelId = query.get("canal") ?? "todos";
  const queueId = query.get("fila") ?? "todas";
  /** Há recorte além da aba: é o que acende o botão de filtros. */
  const temFiltro =
    query.has("escopo") || query.has("estado") || query.has("canal") || query.has("fila");


  const setFilter = (key: string, value: string, fallback: string) => {
    const next = new URLSearchParams(query.toString());
    if (value === fallback) next.delete(key);
    else next.set(key, value);
    router.replace(next.size > 0 ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  const active = state.conversations.filter((conversation) => conversation.lifecycle === "ativo");

  const filtered = active
    .filter((conversation) => matchesScope(conversation, scope, memberId))
    .filter((conversation) => conversationState === "todos" || conversation.state === conversationState)
    .filter((conversation) => channelId === "todos" || conversation.channelId === channelId)
    .filter((conversation) =>
      queueId === "todas"
        ? true
        : queueId === "semFila"
          ? conversation.queueId === undefined
          : conversation.queueId === queueId,
    )
    .filter((conversation) => {
      if (aba === "todos") return true;
      if (aba === "marcados") return conversation.starredBy.includes(memberId);
      if (aba === "recentes") return true;
      return naoLidas(conversation, memberId) > 0;
    })
    .sort((a, b) =>
      ordem === "antigos"
        ? lastActivity(a).localeCompare(lastActivity(b))
        : ordem === "naoLidas"
          ? naoLidas(b, memberId) - naoLidas(a, memberId)
          : lastActivity(b).localeCompare(lastActivity(a)),
    );

  const contagemDaAba = (qual: Aba): number =>
    active
      .filter((c) => matchesScope(c, scope, memberId))
      .filter((c) =>
        qual === "marcados"
          ? c.starredBy.includes(memberId)
          : qual === "naoLidos"
            ? naoLidas(c, memberId) > 0
            : true,
      ).length;

  const openId = pathname.split("/").at(-1);

  return (
    <div className="flex h-[calc(100vh-3.25rem)] min-h-0">
      {/*
        A lista e a Conversa aberta. Os filtros que ocupavam uma coluna inteira
        agora moram no painel: a coluna repetia na tela o que o painel já faz, e
        tirava largura justamente de onde se lê a conversa.
      */}
      <div className="flex w-96 shrink-0 flex-col overflow-hidden border-r border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
        <div className="shrink-0 border-b border-[var(--cor-traco)]">
          <div className="flex items-center gap-1 px-3 py-2">
            <h2 className="min-w-0 flex-1 truncate font-[var(--peso-medio)] text-[var(--cor-tinta)]">
              {scopeTitle(scope)}
            </h2>
            <button
              type="button"
              onClick={() => setFiltrando(true)}
              aria-pressed={temFiltro}
              title="Filtros"
              className={`grid size-8 place-items-center rounded-[var(--raio-controle)] ${
                temFiltro
                  ? "bg-[var(--cor-acento-fraco)] text-[var(--cor-acento)]"
                  : "text-[var(--cor-tinta-fraca)] hover:bg-[var(--cor-superficie-2)]"
              }`}
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              <span className="sr-only">Filtros</span>
            </button>
            <span className="relative">
              <button
                type="button"
                onClick={() => setOrdenando((atual) => !atual)}
                aria-expanded={ordenando}
                title="Ordenar"
                className="grid size-8 place-items-center rounded-[var(--raio-controle)] text-[var(--cor-tinta-fraca)] hover:bg-[var(--cor-superficie-2)]"
              >
                <ArrowUpDown className="size-4" aria-hidden="true" />
                <span className="sr-only">Ordenar</span>
              </button>
              {ordenando ? (
                <ul className="absolute right-0 top-9 z-20 w-60 rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-1 shadow-lg">
                  {ORDENS.map((opcao) => (
                    <li key={opcao.value}>
                      <button
                        type="button"
                        onClick={() => {
                          setFilter("ordem", opcao.value, "recentes");
                          setOrdenando(false);
                        }}
                        className={`flex w-full items-center gap-2 rounded-[var(--raio-controle)] px-2 py-1.5 text-left text-[length:var(--texto-base)] ${
                          ordem === opcao.value
                            ? "bg-[var(--cor-acento-fraco)] text-[var(--cor-tinta)]"
                            : "text-[var(--cor-tinta-fraca)] hover:bg-[var(--cor-superficie-2)]"
                        }`}
                      >
                        <span className="min-w-0 flex-1">{opcao.label}</span>
                        {ordem === opcao.value ? (
                          <Check className="size-4 shrink-0 text-[var(--cor-acento)]" aria-hidden="true" />
                        ) : null}
                      </button>
                    </li>
                  ))}
                  {/*
                    §11 — a opção que não dá para escolher diz por quê, em vez
                    de sumir: sem Prazo configurado não existe atraso a ordenar.
                  */}
                  <li className="px-2 py-1.5 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)] opacity-60">
                    Maior atraso do Prazo
                    <span className="block">
                      O Prazo de resposta não foi definido nesta Caixa.
                    </span>
                  </li>
                </ul>
              ) : null}
            </span>
          </div>

          <div role="tablist" aria-label="Recorte da Caixa" className="flex items-center gap-1 px-2">
            {ABAS.map(({ value, label, Icone }) => {
              const contagem = contagemDaAba(value);
              const ativa = aba === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={ativa}
                  onClick={() => setFilter("aba", value, "naoLidos")}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 border-b-2 px-1 py-1.5 text-[length:var(--texto-sm)] ${
                    ativa
                      ? "border-[var(--cor-acento)] font-[var(--peso-medio)] text-[var(--cor-tinta)]"
                      : "border-transparent text-[var(--cor-tinta-fraca)] hover:text-[var(--cor-tinta)]"
                  }`}
                >
                  <span className="relative">
                    <Icone className="size-4" aria-hidden="true" />
                    {value !== "todos" && value !== "recentes" && contagem > 0 ? (
                      <span className="absolute -right-3 -top-2 rounded-full bg-[var(--cor-acento)] px-1 text-[length:var(--texto-xs)] text-[var(--cor-acento-texto)]">
                        {contagem}
                      </span>
                    ) : null}
                  </span>
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-2 border-t border-[var(--cor-traco)] px-3 py-1.5 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
            <input
              type="checkbox"
              checked={filtered.length > 0 && selecionadas.length === filtered.length}
              onChange={(evento) =>
                setSelecionadas(evento.target.checked ? filtered.map((c) => c.id) : [])
              }
            />
            {selecionadas.length > 0
              ? `${selecionadas.length} selecionada(s)`
              : `Selecionar tudo · ${filtered.length} de ${active.length}`}
          </label>
        </div>
        {filtered.length === 0 ? (
          <div className="p-3">
            <EmptyState
              title="Nenhuma Conversa com estes filtros."
              hint="Ajuste o escopo, o estado, a Fila ou o Canal na coluna ao lado."
            />
          </div>
        ) : (
          <ul className="relative min-h-0 flex-1 overflow-y-auto">
            {filtered.map((conversation) => {
              const contact = conversation.contactId
                ? state.contacts.find((c) => c.id === conversation.contactId)
                : undefined;
              const channel = state.channels.find((c) => c.id === conversation.channelId);
              const last = [...conversation.messages]
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                .at(-1);
              const outsideWindow = isOutsideWindow(state, conversation, Date.parse(lastActivity(conversation)));
              const canal = channel?.channelType;
              const IconeDoCanal = canal ? CHANNEL_ICON[canal] : undefined;
              const porLer = naoLidas(conversation, memberId);
              const marcada = conversation.starredBy.includes(memberId);
              return (
                <li key={conversation.id} className="flex items-start gap-2 border-b border-[var(--cor-traco)] px-2 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Selecionar a Conversa com ${contact ? contactDisplayName(contact) : conversation.title}`}
                    className="mt-3 shrink-0"
                    checked={selecionadas.includes(conversation.id)}
                    onChange={(evento) =>
                      setSelecionadas((atual) =>
                        evento.target.checked
                          ? [...atual, conversation.id]
                          : atual.filter((id) => id !== conversation.id),
                      )
                    }
                  />

                  <Link
                    href={`/crm/caixa-de-entrada/${conversation.id}${query.size > 0 ? `?${query}` : ""}`}
                    aria-current={conversation.id === openId ? "page" : undefined}
                    className={`flex min-w-0 flex-1 gap-2 rounded-[var(--raio-controle)] p-1 ${
                      conversation.id === openId
                        ? "bg-[var(--cor-acento-fraco)]"
                        : "hover:bg-[var(--cor-superficie-2)]"
                    }`}
                  >
                    {/*
                      O rosto com o selo do Canal embaixo: quem atende precisa
                      saber POR ONDE está falando antes de abrir, porque a regra
                      do Canal muda o que dá para responder.
                    */}
                    <span className="relative shrink-0">
                      {contact ? (
                        <ContactAvatar contact={contact} />
                      ) : (
                        <span className="grid size-7 place-items-center rounded-full bg-[var(--cor-superficie-2)] text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
                          ?
                        </span>
                      )}
                      {canal && IconeDoCanal ? (
                        <span
                          title={CHANNEL_TYPE_LABEL[canal] ?? canal}
                          className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full bg-[var(--cor-superficie)] text-[var(--cor-acento)]"
                        >
                          <IconeDoCanal className="size-3" />
                          <span className="sr-only">{CHANNEL_TYPE_LABEL[canal] ?? canal}</span>
                        </span>
                      ) : null}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span
                          className={`min-w-0 flex-1 truncate text-[length:var(--texto-base)] ${
                            porLer > 0
                              ? "font-[var(--peso-forte)] text-[var(--cor-tinta)]"
                              : "text-[var(--cor-tinta)]"
                          }`}
                        >
                          {contact
                            ? contactDisplayName(contact)
                            : (conversation.unresolvedIdentifier?.value ?? "Contato não resolvido")}
                        </span>
                        <span className="shrink-0 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                          {fmt.relative(lastActivity(conversation))}
                        </span>
                        {porLer > 0 ? (
                          <span className="shrink-0 rounded bg-[var(--cor-acento)] px-1.5 text-[length:var(--texto-xs)] text-[var(--cor-acento-texto)]">
                            {porLer}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        {last
                          ? last.deletionMark
                            ? "Mensagem apagada"
                            : last.content
                          : conversation.title}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        <span>{CONVERSATION_STATE_LABEL[conversation.state]}</span>
                        {contact && contact.lifecycle !== "ativo" ? <StateSeal state={contact.lifecycle} /> : null}
                        {conversation.unresolvedIdentifier ? (
                          <ConditionMarker tone="warning">sem Contato resolvido</ConditionMarker>
                        ) : null}
                        {conversation.snooze ? <ConditionMarker>adiada</ConditionMarker> : null}
                        {outsideWindow ? <ConditionMarker tone="warning">fora do Prazo</ConditionMarker> : null}
                      </span>
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => run((data, id) => toggleConversationStar(data, id, conversation.id))}
                    aria-pressed={marcada}
                    title={marcada ? "Desmarcar" : "Marcar"}
                    className="mt-2 shrink-0 text-[var(--cor-tinta-fraca)] hover:text-[var(--cor-acento)]"
                  >
                    <Star
                      className={`size-4 ${marcada ? "fill-[var(--cor-acento)] text-[var(--cor-acento)]" : ""}`}
                      aria-hidden="true"
                    />
                    <span className="sr-only">{marcada ? "Desmarcar" : "Marcar"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/*
        O painel de filtros. Ele edita os MESMOS filtros que já moravam no
        endereço, em vez de criar um segundo recorte paralelo: o que a pessoa
        escolhe aqui continua compartilhável por link e sobrevive à troca de
        Conversa.
      */}
      <ConfirmDialog
        open={filtrando}
        title="Filtros"
        description="O recorte fica no endereço: trocar de Conversa não o perde, e um link já vem filtrado."
        confirmLabel="Aplicar"
        cancelLabel="Fechar"
        footerStart={
          temFiltro ? (
            <Button
              variant="ghost"
              onClick={() => {
                const limpo = new URLSearchParams(query.toString());
                for (const chave of ["escopo", "estado", "canal", "fila"]) limpo.delete(chave);
                router.replace(limpo.size > 0 ? `${pathname}?${limpo}` : pathname, { scroll: false });
              }}
            >
              Limpar
            </Button>
          ) : undefined
        }
        onConfirm={() => setFiltrando(false)}
        onCancel={() => setFiltrando(false)}
      >
        <div className="grid gap-3">
          <Field label="Escopo">
            {(id) => (
              <Select
                id={id}
                value={scope}
                onChange={(valor) => setFilter("escopo", valor, "todas")}
                options={SCOPES.map((o) => ({ value: o.value, label: o.label }))}
              />
            )}
          </Field>
          <Field label="Estado da Conversa">
            {(id) => (
              <Select
                id={id}
                value={conversationState}
                onChange={(valor) => setFilter("estado", valor, "todos")}
                options={STATES.map((o) => ({ value: o.value, label: o.label }))}
              />
            )}
          </Field>
          <Field label="Canal">
            {(id) => (
              <Select
                id={id}
                value={channelId}
                onChange={(valor) => setFilter("canal", valor, "todos")}
                options={[
                  { value: "todos", label: "Todos os Canais" },
                  ...state.channels.map((c) => ({
                    value: c.id,
                    label: `${c.name} · ${CHANNEL_TYPE_LABEL[c.channelType] ?? c.channelType}`,
                  })),
                ]}
              />
            )}
          </Field>
          <Field label="Fila">
            {(id) => (
              <Select
                id={id}
                value={queueId}
                onChange={(valor) => setFilter("fila", valor, "todas")}
                options={[
                  { value: "todas", label: "Todas as Filas" },
                  { value: "semFila", label: "Sem Fila" },
                  ...state.queues.map((q) => ({ value: q.id, label: q.name })),
                ]}
              />
            )}
          </Field>
        </div>
      </ConfirmDialog>

      {/* Coluna 3 — a Conversa aberta */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}


/** O título da coluna diz o recorte: quem chega pelo atalho "Caixa de entrada" do Comercial vê "Minhas Conversas". */
export function scopeTitle(scope: string): string {
  if (scope === "minhas") return "Minhas Conversas";
  if (scope === "semAtribuido") return "Conversas sem Atribuído";
  if (scope === "semFila") return "Conversas sem Fila";
  if (scope === "adiadas") return "Conversas adiadas";
  return "Caixa de entrada da equipe";
}

export function matchesScope(conversation: Conversation, scope: string, memberId: string): boolean {
  if (scope === "minhas") {
    return conversation.assignee?.kind === "member" && conversation.assignee.id === memberId;
  }
  if (scope === "semAtribuido") return conversation.assignee === undefined;
  if (scope === "semFila") return conversation.queueId === undefined;
  if (scope === "adiadas") return conversation.snooze !== undefined;
  return true;
}

/**
 * "Não lida" é DERIVADA das Mensagens: quantas recebidas ainda não têm leitura
 * registrada deste Membro. Um campo `lida` na Conversa poderia divergir das
 * Mensagens, e aí a Caixa mentiria para quem atende.
 */
function naoLidas(conversation: Conversation, memberId: string): number {
  return conversation.messages.filter(
    (message) =>
      message.direction === "recebida" &&
      !message.internalReads.some((r) => r.actor.kind === "member" && r.actor.id === memberId),
  ).length;
}

function lastActivity(conversation: Conversation): string {
  const last = [...conversation.messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1);
  return last?.createdAt ?? conversation.createdAt;
}

/** RN-CXE-19 — the marker that says a free reply is no longer possible. */
function isOutsideWindow(state: DataState, conversation: Conversation, now: number): boolean {
  const channel = state.channels.find((c) => c.id === conversation.channelId);
  if (!channel) return false;
  const hours = CHANNEL_CAPABILITIES[channel.channelType].responseWindowHours;
  if (hours === undefined) return false;
  const received = [...conversation.messages]
    .filter((message) => message.direction === "recebida")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .at(-1);
  if (!received) return false;
  return now > Date.parse(received.createdAt) + hours * 3_600_000;
}


