"use client";

import { use } from "react";
import { useData } from "@/data/store";
import { PROCESSING_LABEL, SOURCE_KIND_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import { EmptyState, PageHeader, Section, StateSeal } from "@/features/shell/ui";

export default function DocumentoPage({ params }: { params: Promise<{ documento: string }> }) {
  const { documento } = use(params);
  const state = useData((data) => data);
  const fmt = useFormat();
  const record = state.documents.find((d) => d.id === documento);

  if (!record) {
    return (
      <>
        <PageHeader title="Registro não encontrado" />
        <div className="p-6">
          <EmptyState title="Documento não encontrado." hint="Ele pode ter sido eliminado, ou você não tem permissão para vê-lo." />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={record.title}
        seal={<StateSeal state={record.lifecycle} />}
        meta={`${state.collections.find((c) => c.id === record.collectionId)?.name ?? "—"} · sem Proprietário: a governança é da Coleção`}
      />
      <div className="p-6">
        <Section title="Conteúdo da Versão corrente">
          <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
            {record.versions.find((v) => v.number === record.currentVersion)?.content.text ?? "—"}
          </p>
          <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
            Estado de processamento:{" "}
            {(() => {
              const processing = record.versions.find((v) => v.number === record.currentVersion)?.processing;
              return processing ? (PROCESSING_LABEL[processing] ?? processing) : "—";
            })()}
          </p>
        </Section>
        <Section title="Versões" count={record.versions.length}>
          <ul className="space-y-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
            {record.versions.map((version) => (
              <li key={version.number}>
                Versão {version.number} · origem: {SOURCE_KIND_LABEL[version.origin.kind] ?? version.origin.kind}
                {version.number === record.currentVersion ? " · corrente" : ""}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Proveniência">
          <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
            {record.provenance.sourceName} · {record.provenance.specificOrigin}
          </p>
        </Section>
        <Section title="Comentários" count={record.comments.length}>
          {record.comments.length === 0 ? (
            <EmptyState title="Nenhum Comentário neste Documento." />
          ) : (
            <ul className="space-y-2">
              {record.comments.map((comment) => (
                <li key={comment.id} className="rounded-[var(--raio-controle)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-3">
                  <p className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">{fmt.instant(comment.createdAt)}</p>
                  <p className="mt-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">{comment.content}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
