"use client";

/**
 * T25 — Chat: a home.
 *
 * A pergunta no centro e o compositor logo abaixo, como o ChatGPT: a Sessão
 * nasce da primeira mensagem, não de um formulário. O título é a primeira
 * linha do que a pessoa escreveu — depois dá para renomear na Sessão.
 *
 * As Sessões e as pastas moram no menu lateral, não aqui: esta tela é para
 * começar, e a lista já está a um olhar de distância à esquerda.
 *
 * DO-CHT-09 — a Sessão de terceiro não é acessível a Papel nenhum, inclusive
 * ao Proprietário do Espaço de Trabalho.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Anchor, Bot, Plus, Sparkles } from "lucide-react";
import { useData, useRun, useSession } from "@/data/store";
import { createChatSession, sendChatMessage } from "@/data/operations";
import { useChatFolderDialogs } from "@/features/ia/chat-folder-dialogs";
import { ChatSetupBar, MicButton, SendCircle } from "@/features/ia/chat-setup";
import { ActionMenu, ConfirmDialog, Field, Select, Toast } from "@/features/shell/ui";

/** B83 — as famílias que podem ancorar uma Sessão. */
const ANCHOR_KINDS = [
  { value: "deal", label: "Negócio" },
  { value: "task", label: "Tarefa" },
  { value: "contact", label: "Contato" },
  { value: "conversation", label: "Conversa" },
  { value: "knowledgeDocument", label: "Documento de Conhecimento" },
] as const;

/** Começos que fazem sentido neste Espaço, não frases genéricas. */
const SUGESTOES = [
  {
    titulo: "Resuma a conversa com o Iallas e liste as objeções abertas",
    texto: "Resuma a conversa de WhatsApp com o Iallas e liste as objeções que ainda estão abertas antes da call.",
  },
  {
    titulo: "Monte a proposta do Full Face Avançado no plano Elite",
    texto: "Monte a proposta do Full Face Avançado no plano Elite para um cirurgião-dentista com clínica própria: 10 casos, 4 mentorias, 90 dias de suporte.",
  },
  {
    titulo: "O que está parado no Funil Closer esta semana?",
    texto: "Liste os Negócios do Funil Closer sem movimento há mais de 5 dias e sugira o próximo passo de cada um.",
  },
] as const;

const tituloDe = (texto: string): string => {
  const primeira = texto.trim().split("\n")[0] ?? "";
  return primeira.length > 72 ? `${primeira.slice(0, 69).trimEnd()}…` : primeira;
};

export default function ChatPage() {
  const { memberId } = useSession();
  const state = useData((data) => data);
  const run = useRun();
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [agentId, setAgentId] = useState("");
  const [anchorKind, setAnchorKind] = useState<string>("");
  const [anchorId, setAnchorId] = useState("");
  const [ancorando, setAncorando] = useState(false);
  const [folderId, setFolderId] = useState("");
  const [modelId, setModelId] = useState("");
  const [skillId, setSkillId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { dialogs, openCreate } = useChatFolderDialogs(setNotice);

  const eu = state.members.find((m) => m.id === memberId);

  const documentos = state.documents.filter((doc) => doc.lifecycle === "ativo");

  const anchorOptions =
    anchorKind === "deal"
      ? state.deals.filter((d) => d.lifecycle === "ativo").map((d) => ({ value: d.id, label: d.title }))
      : anchorKind === "task"
        ? state.tasks.filter((t) => t.lifecycle === "ativo").map((t) => ({ value: t.id, label: t.title }))
        : anchorKind === "contact"
          ? state.contacts
              .filter((c) => c.lifecycle === "ativo")
              .map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName ?? ""}`.trim() }))
          : anchorKind === "conversation"
            ? state.conversations
                .filter((c) => c.lifecycle === "ativo")
                .map((c) => ({ value: c.id, label: c.title }))
            : anchorKind === "knowledgeDocument"
              ? documentos.map((doc) => ({ value: doc.id, label: doc.title }))
              : [];
  const ancora = anchorKind && anchorId ? anchorOptions.find((o) => o.value === anchorId) : undefined;

  /*
    Uma ação só: cria a Sessão e envia a primeira Mensagem. Se a Sessão nasce e
    a Mensagem é recusada, a pessoa cai na Sessão vazia com o erro na tela —
    o texto dela não some.
  */
  const comecar = () => {
    const criada = run((data, id) =>
      createChatSession(data, id, {
        title: tituloDe(texto),
        ...(agentId ? { mainAgentId: agentId } : {}),
        ...(modelId ? { chosenModelId: modelId } : {}),
        ...(folderId ? { folderId } : {}),
        ...(skillId ? { skillId } : {}),
        ...(anchorKind && anchorId
          ? {
              anchor: {
                type: anchorKind as "deal" | "task" | "contact" | "conversation" | "knowledgeDocument",
                id: anchorId,
              },
            }
          : {}),
      }),
    );
    if (!criada.ok) {
      setError(criada.error);
      return;
    }
    const enviada = run((data, id) => sendChatMessage(data, id, criada.value.id, texto));
    if (!enviada.ok) setError(enviada.error);
    router.push(`/ia/chat/${criada.value.id}`);
  };

  const bloqueio =
    texto.trim() === ""
      ? "Escreva o que você quer trabalhar."
      : anchorKind !== "" && anchorId === ""
        ? "Escolha o registro da Âncora, ou tire a Âncora."
        : undefined;

  return (
    <>
      {dialogs}
      {notice ? (
        <Toast tone="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Toast>
      ) : null}

      <ConfirmDialog
        open={ancorando}
        title="Ancorar a Sessão"
        description="A Âncora dá contexto e é fixada na criação: ela guarda o nome que o registro tem agora."
        confirmLabel="Usar esta Âncora"
        {...(anchorKind !== "" && anchorId === ""
          ? { confirmDisabledReason: "Escolha o registro." }
          : {})}
        onConfirm={() => setAncorando(false)}
        onCancel={() => {
          setAnchorKind("");
          setAnchorId("");
          setAncorando(false);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ancorar em">
            {(id) => (
              <Select
                id={id}
                value={anchorKind}
                onChange={(value) => {
                  setAnchorKind(value);
                  setAnchorId("");
                }}
                placeholder="Sem Âncora"
                options={ANCHOR_KINDS.map((kind) => ({ value: kind.value, label: kind.label }))}
              />
            )}
          </Field>
          {anchorKind ? (
            <Field label="Registro">
              {(id) => (
                <Select id={id} value={anchorId} onChange={setAnchorId} searchable placeholder="Escolher" options={anchorOptions} />
              )}
            </Field>
          ) : null}
        </div>
      </ConfirmDialog>

      {/* Estética pedida: página preta, caixa grafite, tudo em cinza claro sobre escuro. */}
      <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto bg-[var(--cor-superficie-2)] px-6 py-10 text-[var(--cor-tinta)]">
        <div className="w-full max-w-[46rem]">
          <h1 className="text-center text-[1.75rem] font-[var(--peso-forte)] leading-tight text-[var(--cor-tinta)]">
            {eu ? `No que vamos trabalhar, ${eu.displayName.split(" ")[0]}?` : "No que vamos trabalhar?"}
          </h1>

          {/* ── o compositor ── */}
          {/* A caixa do ChatGPT: bem arredondada, um tom acima do fundo, traço fino, sem sombra. */}
          <div className="mt-6 flex min-h-[7.5rem] flex-col relative z-10 rounded-[30px] border border-[var(--cor-traco)] bg-[var(--cor-superficie-3)] p-3">
            <label className="sr-only" htmlFor="comeco-do-chat">
              O que você quer trabalhar
            </label>
            <textarea
              id="comeco-do-chat"
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && bloqueio === undefined) {
                  event.preventDefault();
                  comecar();
                }
              }}
              rows={1}
              placeholder="Trabalhe no que quiser"
              className="max-h-64 min-h-9 w-full resize-none border-0 bg-transparent px-1 py-1 text-[1.375rem] leading-snug text-[var(--cor-tinta)] outline-none [field-sizing:content] placeholder:text-[var(--cor-tinta-fraca)]"
            />
            <div className="mt-auto flex items-center gap-2 pt-2">
              <ActionMenu
                label="Anexar contexto"
                trigger={
                  <span className="grid size-9 place-items-center rounded-full text-[var(--cor-tinta-fraca)] hover:bg-[var(--cor-superficie)] hover:text-[var(--cor-tinta)]">
                    <Plus className="size-5" aria-hidden="true" />
                  </span>
                }
                items={[
                  { label: ancora ? "Trocar a Âncora…" : "Ancorar em registro…", onSelect: () => setAncorando(true) },
                  { label: "Nova pasta…", onSelect: openCreate },
                ]}
              />
              {ancora && anchorKind !== "knowledgeDocument" ? (
                <button
                  type="button"
                  onClick={() => setAncorando(true)}
                  className="flex min-w-0 items-center gap-1.5 rounded-full bg-[var(--cor-acento-fraco)] px-2.5 py-1 text-[length:var(--texto-sm)] text-[var(--cor-acento)]"
                  title="Trocar a Âncora"
                >
                  <Anchor className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{ancora.label}</span>
                </button>
              ) : null}
              <span className="ml-auto flex items-center gap-1">
                <MicButton />
                <SendCircle onClick={comecar} label="Começar" {...(bloqueio ? { disabledReason: bloqueio } : {})} />
              </span>
            </div>
          </div>


          <ChatSetupBar
            value={{
              folderId,
              skillId,
              documentId: anchorKind === "knowledgeDocument" ? anchorId : "",
              modelId,
              agentId,
            }}
            onChange={(patch) => {
              if (patch.agentId !== undefined) setAgentId(patch.agentId);
              if (patch.folderId !== undefined) setFolderId(patch.folderId);
              if (patch.skillId !== undefined) setSkillId(patch.skillId);
              if (patch.modelId !== undefined) setModelId(patch.modelId);
              if (patch.documentId !== undefined) {
                if (patch.documentId) {
                  setAnchorKind("knowledgeDocument");
                  setAnchorId(patch.documentId);
                } else if (anchorKind === "knowledgeDocument") {
                  setAnchorKind("");
                  setAnchorId("");
                }
              }
            }}
          />

          {error ? (
            <p role="alert" className="mt-3 text-center text-[length:var(--texto-base)] text-[var(--cor-perigo)]">
              {error}
            </p>
          ) : null}


          {/* ── as sugestões ── */}
          <ul className="mt-8 grid gap-2">
            {SUGESTOES.map((sugestao) => (
              <li key={sugestao.titulo}>
                <button
                  type="button"
                  onClick={() => setTexto(sugestao.texto)}
                  className="flex w-full items-center gap-3 rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] px-4 py-3 text-left hover:bg-[var(--cor-superficie-3)]"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-[var(--raio-controle)] bg-[var(--cor-superficie-3)] text-[var(--cor-acento)]">
                    {sugestao.titulo.startsWith("O que") ? (
                      <Bot className="size-4" aria-hidden="true" />
                    ) : (
                      <Sparkles className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                    {sugestao.titulo}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-center text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
            Suas Sessões e pastas ficam no menu, em Chat. Nenhum Papel dá acesso a Sessão alheia.
          </p>
        </div>
      </div>
    </>
  );
}
