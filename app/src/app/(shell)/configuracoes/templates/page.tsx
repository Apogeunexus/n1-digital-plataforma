"use client";

/**
 * T47 — Templates.
 *
 * A8 — a Template is a reusable structure of another entity, and instantiating
 * it creates NO live link: changing the template later does not change what was
 * already created. That is the single most misleading thing about templates, so
 * the screen says it in plain words rather than assuming it is obvious.
 *
 * B47 — a Folder template that contains Subfolders is only instantiable inside a
 * Space, never inside another Folder.
 */

import Link from "next/link";
import { useState } from "react";
import { useData, useRun, useSession } from "@/data/store";
import { renameTemplate, setTemplateArchived } from "@/data/operations";
import { useFormat } from "@/features/shell/use-format";
import { ActionMenu, ConfirmDialog, EmptyState, Field, PageHeader, Section, StateSeal, TextInput, Toast } from "@/features/shell/ui";
import type { Template } from "@/data/types";

const KINDS: ReadonlyArray<{ readonly kind: Template["kind"]; readonly title: string }> = [
  { kind: "espaco", title: "Espaços" },
  { kind: "pasta", title: "Pastas" },
  { kind: "lista", title: "Listas" },
  { kind: "tarefa", title: "Tarefas" },
  { kind: "checklist", title: "Checklists" },
  { kind: "agente", title: "Agentes" },
];

export default function TemplatesPage() {
  const state = useData((data) => data);
  const run = useRun();
  const fmt = useFormat();
  const { memberId } = useSession();
  const defaultSpaceTemplateId = state.workspace.defaultSpaceTemplateId;
  const base = state.roles.find((r) => r.id === state.members.find((m) => m.id === memberId)?.roleId)?.base;
  const cuida = base === "proprietario" || base === "administrador" ? undefined : "Só um Administrador ou o Proprietário altera o catálogo de Templates.";
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renomeando, setRenomeando] = useState<Template | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erroDialogo, setErroDialogo] = useState<string | null>(null);
  const [arquivando, setArquivando] = useState<Template | null>(null);
  const report = (result: { ok: boolean; error?: string }, message: string) => {
    if (result.ok) {
      setError(null);
      setNotice(message);
    } else {
      setNotice(null);
      setError(result.error ?? "Não foi possível concluir a operação.");
    }
  };

  return (
    <>
      <PageHeader
        path={
          <Link href="/configuracoes" className="hover:underline">
            Configurações
          </Link>
        }
        title="Templates"
        meta="Estrutura reutilizável de outra entidade. Instanciar copia a estrutura e encerra a relação: o Template mudar depois não muda o que já foi criado."
      />

      <div className="p-6">
        {notice ? <Toast tone="success" onDismiss={() => setNotice(null)}>{notice}</Toast> : null}
        {error ? <Toast tone="error" onDismiss={() => setError(null)}>{error}</Toast> : null}
        <ConfirmDialog
          open={renomeando !== null}
          title="Renomear Template"
          description="O nome é o que aparece nas escolhas de “De modelo” e ao criar contêineres."
          confirmLabel="Salvar"
          {...(nome.trim() === "" ? { confirmDisabledReason: "Dê um nome ao Template." } : {})}
          onConfirm={() => {
            if (!renomeando) return;
            const result = run((data, me) => renameTemplate(data, me, renomeando.id, { name: nome, description: descricao }));
            if (result.ok) {
              report(result, "Template renomeado.");
              setRenomeando(null);
              setErroDialogo(null);
            } else {
              setErroDialogo(result.error);
            }
          }}
          onCancel={() => {
            setRenomeando(null);
            setErroDialogo(null);
          }}
        >
          <div className="grid gap-2">
            {erroDialogo ? <p role="alert" className="rounded-[var(--raio-controle)] bg-[var(--cor-perigo-fraco)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-perigo-texto)]">{erroDialogo}</p> : null}
            <Field label="Nome">{(id) => <TextInput id={id} value={nome} onChange={setNome} />}</Field>
            <Field label="Descrição">{(id) => <TextInput id={id} value={descricao} onChange={setDescricao} placeholder="Opcional" />}</Field>
          </div>
        </ConfirmDialog>
        <ConfirmDialog
          open={arquivando !== null}
          title={`Arquivar o Template “${arquivando?.name ?? ""}”?`}
          description="Ele sai das escolhas de criação. O que já foi instanciado não muda. Dá para restaurar depois."
          confirmLabel="Arquivar"
          destructive
          onConfirm={() => {
            if (arquivando) report(run((data, me) => setTemplateArchived(data, me, arquivando.id, true)), "Template arquivado.");
            setArquivando(null);
          }}
          onCancel={() => setArquivando(null)}
        />
        {state.templates.length === 0 ? (
          <EmptyState
            title="Nenhum Template."
            hint="Um Template nasce de uma estrutura que já existe e que se quer repetir."
          />
        ) : (
          KINDS.map((group) => {
            const templates = state.templates.filter((template) => template.kind === group.kind);
            if (templates.length === 0) return null;
            return (
              <Section key={group.kind} title={`Templates de ${group.title}`} count={templates.length}>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {templates.map((template) => (
                    <li key={template.id} className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)]">
                            {template.name}
                            {template.id === defaultSpaceTemplateId ? (
                              <span className="ml-2 rounded bg-[var(--cor-info-fraco)] px-1.5 py-0.5 text-[length:var(--texto-sm)] font-normal text-[var(--cor-info-texto)]">
                                padrão para novos Espaços
                              </span>
                            ) : null}
                          </p>
                          {template.description ? (
                            <p className="mt-0.5 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">{template.description}</p>
                          ) : null}
                        </div>
                        <span className="flex items-center gap-2">
                          <StateSeal state={template.lifecycle} />
                          <ActionMenu
                            label={`Ações de ${template.name}`}
                            items={[
                              {
                                label: "Renomear",
                                onSelect: () => {
                                  setRenomeando(template);
                                  setNome(template.name);
                                  setDescricao(template.description ?? "");
                                  setErroDialogo(null);
                                },
                                ...(cuida ? { disabledReason: cuida } : {}),
                              },
                              template.lifecycle === "ativo"
                                ? {
                                    label: "Arquivar",
                                    destructive: true,
                                    onSelect: () => setArquivando(template),
                                    ...(cuida ? { disabledReason: cuida } : template.id === defaultSpaceTemplateId ? { disabledReason: "É o padrão para novos Espaços: troque o padrão antes." } : {}),
                                  }
                                : {
                                    label: "Restaurar",
                                    onSelect: () => report(run((data, me) => setTemplateArchived(data, me, template.id, false)), "Template restaurado."),
                                    ...(cuida ? { disabledReason: cuida } : {}),
                                  },
                            ]}
                          />
                        </span>
                      </div>

                      <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">{template.body}</p>

                      {template.containsSubfolders ? (
                        <p className="mt-2 rounded bg-[var(--cor-atencao-fraco)] px-2 py-1 text-[length:var(--texto-sm)] text-[var(--cor-atencao-texto)]">
                          Contém Subpastas: só é instanciável dentro de um Espaço, nunca dentro de outra
                          Pasta.
                        </p>
                      ) : null}

                      <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        criado em {fmt.instant(template.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </Section>
            );
          })
        )}
      </div>
    </>
  );
}
