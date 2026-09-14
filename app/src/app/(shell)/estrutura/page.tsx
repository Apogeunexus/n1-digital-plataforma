"use client";

import { useData } from "@/data/store";
import { PageHeader } from "@/features/shell/ui";
import { RecordList } from "@/features/shell/record-list";
import { StateSeal } from "@/features/shell/ui";

export default function EspacosPage() {
  const state = useData((data) => data);
  const items = state.spaces.filter((s) => s.lifecycle !== "naLixeira").sort((a, b) => a.order - b.order);

  return (
    <>
      <PageHeader title="Espaços" meta="Primeiro nível estrutural do Espaço de Trabalho." />
      <div className="p-6">
        <RecordList
          items={items}
          hrefOf={(item) => `/estrutura/espacos/${item.id}`}
          emptyTitle="Nenhum Espaço ainda."
          emptyHint="Um Espaço delimita uma área de trabalho com status, campos e permissões próprios."
          columns={[
            { key: "name", label: "Nome", render: (item) => item.name },
            { key: "descricao", label: "Descrição", render: (item) => item.description ?? "—" },
            { key: "pastas", label: "Pastas", render: (item) => state.folders.filter((f) => f.parentId === item.id && f.lifecycle === "ativo").length },
            { key: "listas", label: "Listas diretas", render: (item) => state.lists.filter((l) => l.parentId === item.id && l.lifecycle === "ativo").length },
            { key: "privado", label: "Privado", render: (item) => item.isPrivate ? "sim" : "não" },
            { key: "estado", label: "Estado", render: (item) => <StateSeal state={item.lifecycle} /> },
          ]}
        />
      </div>
    </>
  );
}
