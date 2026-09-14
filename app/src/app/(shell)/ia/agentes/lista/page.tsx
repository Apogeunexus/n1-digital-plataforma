"use client";

import { useData } from "@/data/store";
import { PageHeader } from "@/features/shell/ui";
import { RecordList } from "@/features/shell/record-list";
import { StateSeal } from "@/features/shell/ui";

export default function AgentesPage() {
  const state = useData((data) => data);
  const items = state.agents.filter((a) => a.lifecycle !== "naLixeira");

  return (
    <>
      <PageHeader title="Agentes" meta="Sujeitos de IA do Espaço de Trabalho. Para criar um, use o Construtor em Agentes." />
      <div className="p-6">
        <RecordList
          items={items}
          hrefOf={(item) => `/ia/agentes/${item.id}`}
          emptyTitle="Nenhum Agente."
          columns={[
            { key: "nome", label: "Nome", render: (item) => item.name },
            { key: "descricao", label: "Descrição", render: (item) => item.description },
            { key: "autonomia", label: "Nível de autonomia", render: (item) => item.versions.at(-1)?.autonomy ?? "—" },
            { key: "proprietario", label: "Proprietário", render: (item) => state.members.find((m) => m.id === item.ownerMemberId)?.displayName ?? "—" },
            { key: "versao", label: "Versão corrente", render: (item) => item.versions.at(-1)?.number ?? 1 },
            { key: "estado", label: "Estado", render: (item) => <StateSeal state={item.lifecycle} /> },
          ]}
        />
      </div>
    </>
  );
}
