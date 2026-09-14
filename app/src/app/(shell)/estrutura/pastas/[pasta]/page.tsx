"use client";

import { use } from "react";
import { useData } from "@/data/store";
import { EmptyState, PageHeader, Section, StateSeal } from "@/features/shell/ui";
import { SprintPanel } from "@/features/estrutura/sprint-panel";
import Link from "next/link";

export default function PastaPage({ params }: { params: Promise<{ pasta: string }> }) {
  const { pasta } = use(params);
  const state = useData((data) => data);
  const record = state.folders.find((f) => f.id === pasta);

  if (!record) {
    return (
      <>
        <PageHeader title="Registro não encontrado" />
        <div className="p-6">
          <EmptyState title="Pasta não encontrada." hint="Ele pode ter sido eliminado, ou você não tem permissão para vê-lo." />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={record.name}
        seal={<StateSeal state={record.lifecycle} />}
        meta={`${record.parentType === "space" ? "Pasta" : "Subpasta"} · nível ${record.parentType === "space" ? 1 : 2}`}
        actions={
          <Link
            href={`/estrutura/pastas/${record.id}/configuracoes`}
            className="rounded-[var(--raio-controle)] px-3 py-1.5 text-[length:var(--texto-base)] font-medium text-[var(--cor-tinta)] ring-1 ring-inset ring-[var(--cor-traco-forte)] hover:bg-[var(--cor-superficie-2)]"
          >
            Configurações
          </Link>
        }
      />
      <div className="p-6">
        {record.parentType === "folder" ? (
          <p className="mb-4 rounded-[var(--raio-controle)] bg-[var(--cor-superficie-2)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
            Uma Subpasta contém apenas Listas: a profundidade de agrupamento abaixo de Espaço é de
            dois níveis.
          </p>
        ) : null}
        {record.parentType === "space" ? (
          <Section title="Subpastas" count={state.folders.filter((f) => f.parentId === record.id).length}>
            {state.folders.filter((f) => f.parentId === record.id).length === 0 ? (
              <EmptyState title="Nenhuma Subpasta." />
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
        ) : null}
        <Section title="Sprints">
          <SprintPanel folder={record} />
        </Section>
        <Section title="Listas" count={state.lists.filter((l) => l.parentId === record.id).length}>
          {state.lists.filter((l) => l.parentId === record.id).length === 0 ? (
            <EmptyState title={record.parentType === "space" ? "Esta Pasta está vazia. Crie uma Subpasta ou uma Lista." : "Esta Subpasta está vazia. Crie uma Lista."} />
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
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
