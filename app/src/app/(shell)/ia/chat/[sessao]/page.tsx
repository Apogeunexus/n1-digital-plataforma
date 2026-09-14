"use client";

/**
 * T24 — Sessão de Chat.
 *
 * B84 — a Mensagem de Chat é imutável: corrigir cria uma nova, nunca edita a
 * anterior. Por isso não há edição aqui, e uma Mensagem substituída continua
 * visível, marcada.
 *
 * A resposta do Agente nasce de uma Execução, e este protótipo não executa
 * Modelo nenhum. A tela diz isso uma vez, fora da conversa, e deixa o link para
 * a Execução onde ela existir — em vez de inventar uma resposta que ninguém
 * gerou.
 */

import Link from "next/link";
import { use, useState } from "react";
import { Anchor, Bot, Plus } from "lucide-react";
import { useData, useRun, useSession } from "@/data/store";
import { configureChatSession, sendChatMessage } from "@/data/operations";
import { ChatSetupBar, MicButton, SendCircle } from "@/features/ia/chat-setup";
import { ACTOR_KIND_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import {
  EmptyState,
  NoAccessState,
  PageHeader,
  StateSeal,
  Toast,
} from "@/features/shell/ui";
import type { ChatMessageRole } from "@/data/types";

const ROLE_LABEL: Record<ChatMessageRole, string> = {
  usuario: "Você",
  assistente: "Agente",
  sistema: "Sistema",
  ferramenta: "Ferramenta",
};

const TOOL_RESULT_LABEL: Record<string, string> = {
  concluida: "concluída",
  negada: "negada",
  falhou: "falhou",
  aguardandoAprovacao: "aguardando aprovação",
};

export default function SessaoPage({ params }: { params: Promise<{ sessao: string }> }) {
  const { sessao } = use(params);
  const state = useData((data) => data);
  const { memberId } = useSession();
  const run = useRun();
  const fmt = useFormat();
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const record = state.chatSessions.find((s) => s.id === sessao);

  if (!record) {
    return (
      <>
        <PageHeader title="Registro não encontrado" />
        <div className="p-6">
          <EmptyState
            title="Sessão não encontrada."
            hint="Ela pode ter sido eliminada, ou você não tem permissão para vê-la."
          />
        </div>
      </>
    );
  }

  // DO-CHT-09 — nem o Proprietário do Espaço de Trabalho entra numa Sessão
  // alheia; só o compartilhamento explícito dá leitura, e leitura não dá voz.
  const isOwner = record.ownerMemberId === memberId;
  const shared =
    record.sharedWithMemberIds.includes(memberId) ||
    state.teams.some(
      (team) => record.sharedWithTeamIds.includes(team.id) && team.memberIds.includes(memberId),
    );

  if (!isOwner && !shared) {
    return (
      <>
        <PageHeader title="Sessão de Chat" />
        <div className="p-6">
          <NoAccessState what="Sessão de Chat de outro Membro" />
          <p className="mt-3 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
            Nenhum Papel dá acesso a Sessão de Chat alheia, nem o de Proprietário do Espaço de
            Trabalho. Só o compartilhamento explícito abre a leitura (DO-CHT-09).
          </p>
        </div>
      </>
    );
  }

  const pasta = state.chatFolders.find((f) => f.id === record.folderId);
  const agent = state.agents.find(
    (a) => a.id === (record.mainAgentId ?? state.workspace.defaultAgentId),
  );

  const sendReason = !isOwner
    ? "Você tem leitura desta Sessão; escrever é do Proprietário."
    : record.lifecycle !== "ativo"
      ? "Esta Sessão não está ativa."
      : "Escreva antes de enviar.";

  const send = () => {
    const result = run((data, actingMemberId) =>
      sendChatMessage(data, actingMemberId, record.id, draft),
    );
    if (result.ok) {
      setDraft("");
      setError(null);
      setNotice("Mensagem registrada na Sessão.");
    } else {
      setNotice(null);
      setError(result.error);
    }
  };

  const podeEscrever = isOwner && record.lifecycle === "ativo";
  const bloqueio = !podeEscrever ? sendReason : draft.trim() === "" ? sendReason : undefined;
  const mensagens = [...record.messages].sort((a, b) => a.order - b.order);
  const nomeDoAutor = (message: (typeof mensagens)[number]): string =>
    message.author.kind === "agent"
      ? (state.agents.find((a) => a.id === message.author.id)?.name ??
        ACTOR_KIND_LABEL[message.author.kind] ??
        message.author.kind)
      : (state.members.find((m) => m.id === message.author.id)?.displayName ??
        ACTOR_KIND_LABEL[message.author.kind] ??
        message.author.kind);

  /*
    A mesma pílula da home: "+" à esquerda, campo que cresce, seta à direita.
    Enter envia, Shift+Enter quebra. Numa Sessão vazia ela fica no centro, com
    a pergunta em cima, como a home; com mensagens, desce para o rodapé.
  */
  /*
    Os mesmos quatro dropdowns da home, agora agindo sobre ESTA Sessão. Cada
    troca grava na hora: não há botão de salvar porque não há formulário — é
    a mesma escolha que a home faz antes de criar, só que depois.
  */
  const ajustar = (patch: {
    readonly folderId?: string;
    readonly skillId?: string;
    readonly documentId?: string;
    readonly modelId?: string;
    readonly agentId?: string;
  }) => {
    const result = run((data, actingMemberId) =>
      configureChatSession(data, actingMemberId, record.id, {
        ...(patch.agentId !== undefined ? { mainAgentId: patch.agentId || null } : {}),
        ...(patch.folderId !== undefined ? { folderId: patch.folderId || null } : {}),
        ...(patch.skillId !== undefined ? { skillId: patch.skillId || null } : {}),
        ...(patch.modelId !== undefined ? { chosenModelId: patch.modelId || null } : {}),
        ...(patch.documentId !== undefined
          ? {
              anchor: patch.documentId
                ? { type: "knowledgeDocument" as const, id: patch.documentId }
                : null,
            }
          : {}),
      }),
    );
    if (result.ok) {
      setError(null);
      setNotice("Sessão ajustada.");
    } else {
      setNotice(null);
      setError(result.error);
    }
  };

  const configuracao = isOwner ? (
    <ChatSetupBar
      value={{
        folderId: record.folderId ?? "",
        skillId: record.skillId ?? "",
        documentId: record.anchor?.type === "knowledgeDocument" ? record.anchor.id : "",
        modelId: record.chosenModelId ?? "",
        agentId: record.mainAgentId ?? "",
      }}
      onChange={ajustar}
      documentLocked={record.messages.length > 0}
    />
  ) : null;

  const compositor = (alto: boolean) => (
    <div className="mx-auto w-full max-w-[46rem]">
      <div
        className={`relative z-10 rounded-[30px] border border-[var(--cor-traco)] bg-[var(--cor-superficie-3)] ${
          alto ? "flex min-h-[7.5rem] flex-col p-3" : "flex items-end gap-2 p-2"
        }`}
      >
        {alto ? null : (
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center self-center rounded-full text-[var(--cor-tinta-fraca)]"
          >
            <Plus className="size-5" />
          </span>
        )}
        <label className="sr-only" htmlFor="chat-composer">
          Escrever na Sessão
        </label>
        <textarea
          id="chat-composer"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && bloqueio === undefined) {
              event.preventDefault();
              send();
            }
          }}
          rows={1}
          disabled={!podeEscrever}
          placeholder={isOwner ? (alto ? "Trabalhe no que quiser" : "Pergunte alguma coisa") : "Você tem leitura desta Sessão."}
          className={`max-h-64 min-w-0 flex-1 resize-none border-0 bg-transparent text-[var(--cor-tinta)] outline-none [field-sizing:content] placeholder:text-[var(--cor-tinta-fraca)] disabled:opacity-50 ${
            alto
              ? "min-h-9 w-full px-1 py-1 text-[1.375rem] leading-snug"
              : "min-h-10 px-2 py-2.5 text-[length:var(--texto-base)]"
          }`}
        />
        {alto ? (
          <div className="mt-auto flex items-center gap-2 pt-2">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full text-[var(--cor-tinta-fraca)]"
            >
              <Plus className="size-5" />
            </span>
            <span className="ml-auto flex items-center gap-1">
              <MicButton />
              <SendCircle onClick={send} label="Enviar" {...(bloqueio ? { disabledReason: bloqueio } : {})} />
            </span>
          </div>
        ) : (
          <span className="flex items-center gap-1 self-center">
            <MicButton />
            <SendCircle onClick={send} label="Enviar" {...(bloqueio ? { disabledReason: bloqueio } : {})} />
          </span>
        )}
      </div>
      {alto ? configuracao : null}
      <p className="mt-2 text-center text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
        A resposta nasce de uma Execução; este protótipo registra a mensagem e não executa Modelo.
      </p>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--cor-superficie-2)] text-[var(--cor-tinta)]">
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

      {/* ── a barra fina do topo: onde estou, com quem falo ── */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--cor-traco)] px-6 py-2.5 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
        <span className="flex min-w-0 items-center gap-1.5">
          <Link href="/ia/chat" className="hover:underline">
            Chat
          </Link>
          {pasta ? (
            <>
              <span aria-hidden="true">/</span>
              <span className="truncate">{pasta.name}</span>
            </>
          ) : null}
          <span aria-hidden="true">/</span>
          <h1 className="truncate font-[var(--peso-medio)] text-[var(--cor-tinta)]">{record.title}</h1>
        </span>
        <StateSeal state={record.lifecycle} />
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5">
            <Bot className="size-3.5" aria-hidden="true" />
            {agent?.name ?? "Assistente padrão"}
          </span>
          {record.anchor ? (
            <span
              className="flex items-center gap-1.5 rounded-full bg-[var(--cor-superficie-2)] px-2 py-0.5"
              title="A Âncora guarda o nome que o registro tinha quando a Sessão foi aberta."
            >
              <Anchor className="size-3.5" aria-hidden="true" />
              {record.anchor.nameAtTheTime}
            </span>
          ) : null}
          {!isOwner ? <span>você tem leitura</span> : null}
        </span>
      </div>

      {mensagens.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10">
          <h2 className="mb-6 text-center text-[1.75rem] font-[var(--peso-forte)] leading-tight text-[var(--cor-tinta)]">
            {isOwner ? "No que vamos trabalhar?" : "O Proprietário ainda não escreveu nada aqui."}
          </h2>
          {compositor(true)}
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <ol className="mx-auto grid w-full max-w-[46rem] gap-6">
              {mensagens.map((message) => {
                const minha = message.role === "usuario";
                return (
                  <li
                    key={message.id}
                    className={`flex ${minha ? "justify-end" : "justify-start"} ${message.replaced ? "opacity-60" : ""}`}
                  >
                    {/*
                      Como o ChatGPT: o que eu disse é um balão à direita; a
                      resposta é texto corrido à esquerda, sem moldura. Sistema e
                      Ferramenta são texto miúdo, para não parecerem resposta.
                    */}
                    <div
                      className={`max-w-[85%] ${
                        minha
                          ? "rounded-[1.25rem] rounded-br-md bg-[var(--cor-superficie-2)] px-4 py-2.5"
                          : message.role === "assistente"
                            ? "px-1"
                            : "px-1 text-[length:var(--texto-sm)]"
                      }`}
                    >
                      {!minha ? (
                        <p className="mb-1 text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
                          {ROLE_LABEL[message.role]} · {nomeDoAutor(message)} · {fmt.instant(message.at)}
                          {message.replaced ? " · substituída" : ""}
                        </p>
                      ) : null}
                      <p className="whitespace-pre-wrap text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                        {message.content}
                      </p>
                      {minha ? (
                        <p className="mt-1 text-right text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
                          {fmt.instant(message.at)}
                          {message.replaced ? " · substituída" : ""}
                        </p>
                      ) : null}

                      {message.toolId ? (
                        <p className="mt-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                          Ferramenta {state.tools.find((t) => t.id === message.toolId)?.name ?? message.toolId}
                          {message.toolResult
                            ? ` · ${TOOL_RESULT_LABEL[message.toolResult] ?? message.toolResult}`
                            : ""}
                        </p>
                      ) : null}

                      {message.knowledgeReferences.length > 0 ? (
                        <ul className="mt-1 space-y-0.5 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                          {message.knowledgeReferences.map((reference, index) => (
                            <li key={`${reference.documentId}-${index}`}>
                              Conhecimento consultado:{" "}
                              <Link
                                href={`/ia/conhecimento/documentos/${reference.documentId}`}
                                className="hover:underline"
                              >
                                {state.documents.find((d) => d.id === reference.documentId)?.title ??
                                  reference.documentId}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {message.executionId ? (
                        <Link
                          href={`/ia/execucoes/${message.executionId}`}
                          className="mt-1 inline-block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)] hover:underline"
                        >
                          Ver a Execução que produziu esta resposta
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
          <div className="shrink-0 px-6 pb-4 pt-2">{compositor(false)}</div>
        </>
      )}
    </div>
  );
}
