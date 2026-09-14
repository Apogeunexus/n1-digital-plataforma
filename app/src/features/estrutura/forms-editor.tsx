"use client";

/**
 * Fase 4 — Formulários de uma Lista: perguntas mapeadas em título, descrição
 * e Campos da Lista; um link público por Formulário. Cada envio vira uma
 * Tarefa em nome do dono, com Proveniência.
 */

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useData, useRun } from "@/data/store";
import { archiveForm, createForm, formOutdatedReason, rotateFormSecret, updateForm } from "@/data/operations";
import { effectiveListConfig } from "@/data/derive";
import { FIELD_TYPE_LABEL } from "@/features/shell/format";
import { ActionMenu, Button, ConfirmDialog, Field, Select, TextInput, Toggle } from "@/features/shell/ui";
import type { Form, FormQuestion } from "@/data/types";

type Report = (result: { ok: boolean; error?: string }, message: string) => void;
type Rascunho = { readonly id?: string; label: string; required: boolean; target: string };

const alvoDe = (target: string): FormQuestion["target"] =>
  target === "title" ? { kind: "title" } : target === "description" ? { kind: "description" } : { kind: "field", definitionId: target.replace("field:", "") };
const chaveDe = (target: FormQuestion["target"]): string => (target.kind === "field" ? `field:${target.definitionId}` : target.kind);

export function FormsEditor({ listId, bloqueio, report }: { readonly listId: string; readonly bloqueio: string | undefined; readonly report: Report }) {
  const run = useRun();
  const state = useData((data) => data);
  const [editando, setEditando] = useState<Form | "novo" | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [perguntas, setPerguntas] = useState<Rascunho[]>([]);
  const [renovando, setRenovando] = useState<string | null>(null);
  const [arquivando, setArquivando] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const forms = state.forms.filter((f) => f.listId === listId && f.lifecycle === "ativo");
  const config = effectiveListConfig(state, listId);
  const campos = (config?.fieldDefinitionIds ?? [])
    .map((id) => state.fieldDefinitions.find((d) => d.id === id))
    .filter((d): d is NonNullable<typeof d> => d !== undefined && d.type !== "formula");
  const alvos = [
    { value: "title", label: "Título da Tarefa" },
    { value: "description", label: "Descrição da Tarefa" },
    ...campos.map((d) => ({ value: `field:${d.id}`, label: `Campo: ${d.name}`, detail: `${FIELD_TYPE_LABEL[d.type] ?? d.type}${d.required ? " · obrigatório na Lista" : ""}` })),
  ];
  const abrir = (form: Form | "novo") => {
    setEditando(form);
    setNome(form === "novo" ? "" : form.name);
    setDescricao(form === "novo" ? "" : (form.description ?? ""));
    setPerguntas(
      form === "novo"
        ? [{ label: "Assunto", required: true, target: "title" }, { label: "Detalhes", required: false, target: "description" }]
        : form.questions.map((q) => ({ id: q.id, label: q.label, required: q.required, target: chaveDe(q.target) })),
    );
  };
  const linkDe = (form: Form) => `${typeof window === "undefined" ? "" : window.location.origin}/f/${form.secret}`;
  const copiar = async (form: Form) => {
    try {
      await navigator.clipboard.writeText(linkDe(form));
      setCopiado(form.id);
      window.setTimeout(() => setCopiado(null), 2000);
    } catch {
      report({ ok: false, error: "Não foi possível copiar: selecione o link e copie manualmente." }, "");
    }
  };
  const semTitulo = perguntas.filter((q) => q.target === "title").length !== 1;
  const invalido = nome.trim() === "" ? "Dê um nome ao Formulário." : perguntas.length === 0 ? "Acrescente ao menos uma pergunta." : semTitulo ? "Exatamente uma pergunta vira o título." : perguntas.some((q) => !q.label.trim()) ? "Toda pergunta precisa de rótulo." : undefined;

  return (
    <div className="grid gap-3">
      <ConfirmDialog
        open={editando !== null}
        title={editando === "novo" ? "Novo Formulário" : `Editar “${editando?.name ?? ""}”`}
        description="Quem responde não precisa entrar: o envio cria a Tarefa em seu nome, com origem no Formulário. Um Campo obrigatório da Lista precisa de uma pergunta obrigatória."
        confirmLabel={editando === "novo" ? "Criar Formulário" : "Salvar"}
        wide
        {...(invalido ? { confirmDisabledReason: invalido } : {})}
        onConfirm={() => {
          const input = { name: nome, description: descricao, questions: perguntas.map((q) => ({ ...(q.id ? { id: q.id } : {}), label: q.label, required: q.required, target: alvoDe(q.target) })) };
          const result = run((data, me) => (editando === "novo" ? createForm(data, me, listId, input) : updateForm(data, me, (editando as Form).id, input)));
          if (result.ok) {
            report(result, editando === "novo" ? `Formulário “${nome.trim()}” criado. Copie o link para divulgar.` : "Formulário salvo.");
            setEditando(null);
            setErro(null);
          } else {
            setErro(result.error);
          }
        }}
        onCancel={() => {
          setEditando(null);
          setErro(null);
        }}
      >
        <div className="grid gap-3">
          {erro ? <p role="alert" className="rounded-[var(--raio-controle)] bg-[var(--cor-perigo-fraco)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-perigo-texto)]">{erro}</p> : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Nome">{(id) => <TextInput id={id} value={nome} onChange={setNome} placeholder="Ex.: Pedido de suporte" />}</Field>
            <Field label="Descrição" hint="Aparece no topo do Formulário público.">{(id) => <TextInput id={id} value={descricao} onChange={setDescricao} />}</Field>
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">Perguntas</legend>
            {perguntas.map((q, i) => (
              <div key={q.id ?? i} className="grid gap-2 rounded-[var(--raio-controle)] border border-[var(--cor-traco)] p-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                <Field label={`Pergunta ${i + 1}`}>{(id) => <TextInput id={id} value={q.label} onChange={(label) => setPerguntas(perguntas.map((p, j) => (j === i ? { ...p, label } : p)))} />}</Field>
                <Field label="Preenche">
                  {(id) => (
                    <Select
                      id={id}
                      value={q.target}
                      // O título é sempre obrigatório: mudar o destino para ele liga a obrigatoriedade junto.
                      onChange={(target) => setPerguntas(perguntas.map((p, j) => (j === i ? { ...p, target, required: target === "title" ? true : p.required } : p)))}
                      options={alvos}
                    />
                  )}
                </Field>
                <span className="flex items-center gap-2 pb-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta)]">
                  <Toggle checked={q.required} onChange={(required) => setPerguntas(perguntas.map((p, j) => (j === i ? { ...p, required } : p)))} labelledBy={`pergunta-obrig-${i}`} disabled={q.target === "title"} />
                  <span id={`pergunta-obrig-${i}`}>Obrigatória</span>
                </span>
                <button type="button" onClick={() => setPerguntas(perguntas.filter((_, j) => j !== i))} aria-label={`Remover pergunta ${i + 1}`} className="grid size-8 place-items-center rounded text-[var(--cor-perigo-texto)] hover:bg-[var(--cor-perigo-fraco)]">
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            <span>
              <Button onClick={() => setPerguntas([...perguntas, { label: "", required: false, target: campos[0] ? `field:${campos[0].id}` : "description" }])} icon={<Plus className="size-4" aria-hidden="true" />}>
                Pergunta
              </Button>
            </span>
          </fieldset>
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={renovando !== null}
        title="Renovar o link deste Formulário?"
        description="O link atual para de abrir na hora; quem o tiver precisa do novo. As Tarefas já criadas não mudam."
        confirmLabel="Renovar link"
        destructive
        onConfirm={() => {
          if (renovando) report(run((data, me) => rotateFormSecret(data, me, renovando)), "Link renovado. Copie o novo para divulgar.");
          setRenovando(null);
        }}
        onCancel={() => setRenovando(null)}
      />

      <ConfirmDialog
        open={arquivando !== null}
        title="Arquivar este Formulário?"
        description="O link para de abrir e o Formulário sai desta lista. As Tarefas já criadas por ele continuam."
        confirmLabel="Arquivar"
        destructive
        onConfirm={() => {
          if (arquivando) report(run((data, me) => archiveForm(data, me, arquivando)), "Formulário arquivado.");
          setArquivando(null);
        }}
        onCancel={() => setArquivando(null)}
      />
      {forms.length === 0 ? (
        <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">Nenhum Formulário. Um Formulário deixa quem não é Membro criar Tarefas aqui por um link.</p>
      ) : (
        <ul className="grid gap-1">
          {forms.map((form) => (
            <li key={form.id} className="grid gap-1 rounded-[var(--raio-controle)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] px-3 py-2 text-[length:var(--texto-base)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[var(--cor-tinta)]">{form.name}</span>
                <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                  {form.questions.length} pergunta(s) · {form.submissions} envio(s) · {form.enabled ? "ativo" : "pausado"}
                </span>
                <span title={bloqueio ?? (form.enabled ? "Pausar" : "Ativar")} className="inline-flex items-center gap-1">
                  <Toggle checked={form.enabled} onChange={(enabled) => report(run((data, me) => updateForm(data, me, form.id, { enabled })), enabled ? "Formulário ativado." : "Formulário pausado.")} labelledBy={`form-ativo-${form.id}`} disabled={bloqueio !== undefined} />
                  <span id={`form-ativo-${form.id}`} className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">ativo</span>
                </span>
                <ActionMenu
                  label={`Ações de ${form.name}`}
                  items={[
                    { label: "Editar", onSelect: () => abrir(form), ...(bloqueio ? { disabledReason: bloqueio } : {}) },
                    { label: "Renovar link", destructive: true, onSelect: () => setRenovando(form.id), ...(bloqueio ? { disabledReason: bloqueio } : {}) },
                    { label: "Arquivar", destructive: true, onSelect: () => setArquivando(form.id), ...(bloqueio ? { disabledReason: bloqueio } : {}) },
                  ]}
                />
              </div>
              {formOutdatedReason(state, form) ? (
                <p role="alert" className="rounded-[var(--raio-controle)] bg-[var(--cor-atencao-fraco)] px-2 py-1 text-[length:var(--texto-sm)] text-[var(--cor-atencao-texto)]">
                  Desatualizado — o link recusa envios: {formOutdatedReason(state, form)} Edite o Formulário e acrescente a pergunta.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <a href={`/f/${form.secret}`} target="_blank" rel="noreferrer" className="min-w-0 truncate font-mono text-[length:var(--texto-sm)] text-[var(--cor-acento)] underline">
                  {linkDe(form)}
                </a>
                <Button onClick={() => copiar(form)}>{copiado === form.id ? "Copiado" : "Copiar link"}</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <span>
        <Button onClick={() => abrir("novo")} icon={<Plus className="size-4" aria-hidden="true" />} disabled={bloqueio !== undefined} disabledReason={bloqueio ?? ""}>
          Novo Formulário
        </Button>
      </span>
      <p className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
        Protótipo: os dados vivem na memória desta aba, então um link criado agora abre só nela. O Formulário de demonstração <a href="/f/demo-formulario" target="_blank" rel="noreferrer" className="underline">/f/demo-formulario</a> abre em qualquer aba.
      </p>
    </div>
  );
}
