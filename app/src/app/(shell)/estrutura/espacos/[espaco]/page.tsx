"use client";

import { use } from "react";
import { useData } from "@/data/store";
import { EmptyState, PageHeader, Section, StateSeal } from "@/features/shell/ui";
import Link from "next/link";
import { shortcutHref } from "@/features/estrutura/shortcuts";

export default function EspacoPage({ params }: { params: Promise<{ espaco: string }> }) {
  const { espaco } = use(params);
  const state = useData((data) => data);
  const record = state.spaces.find((s) => s.id === espaco);

  if (!record) {
    return (
      <>
        <PageHeader title="Registro não encontrado" />
        <div className="p-6">
          <EmptyState title="Espaço não encontrado." hint="Ele pode ter sido eliminado, ou você não tem permissão para vê-lo." />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={record.name}
        seal={<StateSeal state={record.lifecycle} />}
        meta={`Criado por ${state.members.find((m) => m.id === record.createdBy.id)?.displayName ?? "Sistema"}${record.isPrivate ? " · privado" : ""}`}
        actions={
          <Link
            href={`/estrutura/espacos/${record.id}/configuracoes`}
            className="rounded-[var(--raio-controle)] px-3 py-1.5 text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)] ring-1 ring-inset ring-[var(--cor-traco-forte)] hover:bg-[var(--cor-superficie-2)]"
          >
            Configurações
          </Link>
        }
      />
      <div className="p-6">
        <Section title={record.shortcuts?.length ? "Listas diretas e atalhos" : "Listas diretas"} count={state.lists.filter((l) => l.parentId === record.id).length + (record.shortcuts?.length ?? 0)}>
          {state.lists.filter((l) => l.parentId === record.id).length + (record.shortcuts?.length ?? 0) === 0 ? (
            <EmptyState title="Nenhuma Lista direta neste Espaço." />
          ) : (
            <ul className="space-y-1">
              {state.lists
                .filter((l) => l.parentId === record.id)
                .map((list) => (
                  <li key={list.id}>
                    <Link href={`/estrutura/listas/${list.id}`} className="text-[length:var(--texto-base)] text-[var(--cor-tinta)] hover:underline">
                      {list.name}
                    </Link>
                  </li>
                ))}
              {(record.shortcuts ?? []).map((shortcut) => (
                <li key={shortcut.id} className="flex flex-wrap items-baseline gap-2">
                  <Link href={shortcutHref(shortcut)} className="text-[length:var(--texto-base)] text-[var(--cor-tinta)] hover:underline">
                    {shortcut.name}
                  </Link>
                  <span className="text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
                    atalho · Caixa de Entrada do CRM{shortcut.scope === "minhas" ? ", só as suas Conversas" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Pastas" count={state.folders.filter((f) => f.parentId === record.id).length}>
          {state.folders.filter((f) => f.parentId === record.id).length === 0 ? (
            <EmptyState title="Nenhuma Pasta neste Espaço." />
          ) : (
            <ul className="space-y-1">
              {state.folders
                .filter((f) => f.parentId === record.id)
                .map((folder) => (
                  <li key={folder.id}>
                    <Link href={`/estrutura/pastas/${folder.id}`} className="text-[length:var(--texto-base)] text-[var(--cor-tinta)] hover:underline">
                      {folder.name}
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </Section>
        <Section title="Painéis" count={state.panels.filter((p) => p.anchor?.id === record.id).length}>
          {state.panels.filter((p) => p.anchor?.id === record.id).length === 0 ? (
            <EmptyState
              title="Nenhum Painel de contexto ancorado aqui."
              hint="Um Painel é criado em Painéis e ancorado neste registro."
            />
          ) : (
            <ul className="space-y-1">
              {state.panels
                .filter((p) => p.anchor?.id === record.id)
                .map((panel) => (
                  <li key={panel.id}>
                    <Link href={`/paineis/${panel.id}`} className="text-[length:var(--texto-base)] text-[var(--cor-tinta)] hover:underline">
                      {panel.name}
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
