"use client";

import { useData } from "@/data/store";
import { PageHeader } from "@/features/shell/ui";
import { RecordList } from "@/features/shell/record-list";
import { StateSeal } from "@/features/shell/ui";

export default function HabilidadesPage() {
  const state = useData((data) => data);
  const items = state.skills.filter((s) => s.lifecycle !== "naLixeira");

  return (
    <>
      <PageHeader title="Habilidades" meta="Competências reutilizáveis, exercidas só por Agente." />
      <div className="p-6">
        <RecordList
          items={items}
          hrefOf={(item) => `/ia/habilidades/${item.id}`}
          emptyTitle="Nenhuma Habilidade."
          emptyHint="Agentes funcionam sem elas, apenas com instruções, Ferramentas e Conhecimento."
          columns={[
            { key: "nome", label: "Nome", render: (item) => item.name },
            { key: "pertencimento", label: "Pertencimento", render: (item) => item.ownership === "plataforma" ? "plataforma" : "Espaço de Trabalho" },
            { key: "versao", label: "Versão corrente", render: (item) => [...item.versions].reverse().find((v) => v.state === "publicada")?.number ?? "—" },
            { key: "agentes", label: "Agentes com Concessão", render: (item) => state.skillGrants.filter((g) => g.skillId === item.id).length },
            { key: "estado", label: "Estado", render: (item) => <StateSeal state={item.lifecycle} /> },
          ]}
        />
      </div>
    </>
  );
}
