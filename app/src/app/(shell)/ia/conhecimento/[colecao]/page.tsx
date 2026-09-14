"use client";

import { use } from "react";
import { useData } from "@/data/store";
import { LIFECYCLE_LABEL, SOURCE_KIND_LABEL } from "@/features/shell/format";
import { EmptyState, PageHeader, Section, StateSeal } from "@/features/shell/ui";
import Link from "next/link";

export default function ColecaoPage({ params }: { params: Promise<{ colecao: string }> }) {
  const { colecao } = use(params);
  const state = useData((data) => data);
  const record = state.collections.find((c) => c.id === colecao);

  if (!record) {
    return (
      <>
        <PageHeader title="Registro não encontrado" />
        <div className="p-6">
          <EmptyState title="Coleção não encontrada." hint="Ele pode ter sido eliminado, ou você não tem permissão para vê-lo." />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={record.name}
        seal={<StateSeal state={record.lifecycle} />}
        meta={`Proprietário: ${state.members.find((m) => m.id === record.ownerMemberId)?.displayName ?? "—"}${record.isPrivate ? " · privada" : ""}`}
      />
      <div className="p-6">
        <Section title="Documentos" count={state.documents.filter((d) => d.collectionId === record.id).length}>
          {state.documents.filter((d) => d.collectionId === record.id).length === 0 ? (
            <EmptyState title="Nenhum Documento." hint="Envie um arquivo ou configure uma Fonte." />
          ) : (
            <ul className="space-y-1 text-[length:var(--texto-base)]">
              {state.documents
                .filter((d) => d.collectionId === record.id)
                .map((document) => (
                  <li key={document.id}>
                    <Link href={`/ia/conhecimento/documentos/${document.id}`} className="text-[var(--cor-tinta)] hover:underline">
                      {document.title}
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </Section>
        <Section title="Fontes" count={record.sources.length}>
          <ul className="space-y-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
            {record.sources.map((source) => (
              <li key={source.id}>
                {source.name} · {SOURCE_KIND_LABEL[source.kind] ?? source.kind} ·{" "}
                {LIFECYCLE_LABEL[source.state] ?? source.state}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Acesso">
          <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
            A Coleção é o único Recurso de permissão do Conhecimento: Documento, Versão e Fragmento
            herdam e nunca têm permissão própria.
          </p>
          {state.collectionGrants.filter((g) => g.collectionId === record.id).length === 0 ? (
            <div className="mt-2">
              <EmptyState
                title="Nenhum Agente tem acesso a esta Coleção."
                hint="Sem Concessão, nenhum Agente consulta os Documentos daqui."
              />
            </div>
          ) : (
            <ul className="mt-2 space-y-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
              {state.collectionGrants
                .filter((g) => g.collectionId === record.id)
                .map((grant) => (
                  <li key={grant.id}>
                    {state.agents.find((a) => a.id === grant.agentId)?.name} · {grant.actions.join(", ")}
                  </li>
                ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
