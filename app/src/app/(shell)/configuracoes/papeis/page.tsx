"use client";

/**
 * T43 — Papéis.
 *
 * A9.4 — four system roles, immutable. B30 — a custom role declares one of them
 * as its base, and that base is a CEILING: the custom role never grants more
 * than it. The screen shows the ceiling next to every permission so the reading
 * is not "what I picked" but "what I am allowed to pick".
 */

import Link from "next/link";
import { useState } from "react";
import { useData } from "@/data/store";
import { DeleteRoleDialog, useDeleteRoleDialog } from "@/features/configuracoes/delete-role-dialog";
import { Button, EmptyState, PageHeader, Section, Toast } from "@/features/shell/ui";

const ACTION_LABEL: Record<string, string> = {
  ver: "ver",
  comentar: "comentar",
  criar: "criar",
  editar: "editar",
  excluir: "excluir",
  administrar: "administrar",
  executar: "executar",
};

const SCOPE_LABEL: Record<string, string> = {
  registro: "registro",
  subarvore: "subárvore",
  proprios: "próprios",
};

const BASE_DESCRIPTION: Record<string, string> = {
  proprietario:
    "Um por Espaço de Trabalho, derivado de quem detém o Papel. Muda apenas por transferência de propriedade.",
  administrador: "Governa o Espaço de Trabalho: Membros, Papéis, Integrações e a lixeira.",
  membro: "Trabalha no que lhe é dado ver, cria dentro do que lhe é permitido.",
  convidado: "Acesso restrito ao que foi compartilhado com ele; não pode ser Proprietário de nada.",
};

export default function PapeisPage() {
  const state = useData((data) => data);
  const { deletingRoleId, openDeleteRole, closeDeleteRole } = useDeleteRoleDialog();
  const [notice, setNotice] = useState<string | null>(null);
  const system = state.roles.filter((role) => role.system);
  const custom = state.roles.filter((role) => !role.system);

  const holdersOf = (roleId: string): number =>
    state.members.filter((member) => member.roleId === roleId && member.state !== "removido").length;

  const renderRole = (role: (typeof state.roles)[number]) => (
    <li key={role.id} className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[length:var(--texto-base)] font-semibold text-[var(--cor-tinta)]">
            {role.name}
            {role.system ? (
              <span className="ml-2 rounded bg-[var(--cor-traco)] px-1.5 py-0.5 text-[length:var(--texto-sm)] font-normal text-[var(--cor-tinta)]">
                sistema
              </span>
            ) : (
              <span className="ml-2 rounded bg-[var(--cor-info-fraco)] px-1.5 py-0.5 text-[length:var(--texto-sm)] font-normal text-[var(--cor-info-texto)]">
                teto {role.base}
              </span>
            )}
          </h3>
          <p className="mt-0.5 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">{BASE_DESCRIPTION[role.base] ?? ""}</p>
        </div>
        <span className="flex shrink-0 items-center gap-3">
          <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
            {holdersOf(role.id)} Membro(s) com este Papel
          </span>
          {!role.system ? (
            <Button variant="danger" onClick={() => openDeleteRole(role.id)}>
              Excluir
            </Button>
          ) : null}
        </span>
      </div>

      {role.permissions.length === 0 ? (
        <p className="mt-3 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">Nenhuma permissão declarada.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[length:var(--texto-base)]">
            <thead className="text-left text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
              <tr>
                <th className="py-1 font-medium">Ação</th>
                <th className="py-1 font-medium">Tipo de Recurso</th>
                <th className="py-1 font-medium">Escopo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--cor-traco)]">
              {role.permissions.map((permission, index) => (
                <tr key={`${permission.action}-${permission.resourceType}-${index}`}>
                  <td className="py-1 text-[var(--cor-tinta)]">
                    {ACTION_LABEL[permission.action] ?? permission.action}
                  </td>
                  <td className="py-1 text-[var(--cor-tinta)]">{permission.resourceType}</td>
                  <td className="py-1 text-[var(--cor-tinta)]">
                    {SCOPE_LABEL[permission.scope] ?? permission.scope}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {role.system ? (
        <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
          Um Papel de sistema é imutável: nada aqui se edita.
        </p>
      ) : null}
    </li>
  );

  return (
    <>
      <PageHeader
        path={
          <Link href="/configuracoes" className="hover:underline">
            Configurações
          </Link>
        }
        title="Papéis"
        meta="Quatro Papéis de sistema, imutáveis, e os personalizados — cada um limitado pelo teto que declara."
      />

      <DeleteRoleDialog roleId={deletingRoleId} onClose={closeDeleteRole} onDone={setNotice} />

      <div className="p-6">
        {notice ? (
          <div className="mb-4">
            <Toast tone="success" onDismiss={() => setNotice(null)}>
              {notice}
            </Toast>
          </div>
        ) : null}

        <Section title="Papéis de sistema" count={system.length}>
          <ul className="space-y-4">{system.map(renderRole)}</ul>
        </Section>

        <Section title="Papéis personalizados" count={custom.length}>
          {custom.length === 0 ? (
            <EmptyState
              title="Nenhum Papel personalizado."
              hint="Um Papel personalizado declara um Papel de sistema como base e nunca ultrapassa o que essa base permite."
            />
          ) : (
            <ul className="space-y-4">{custom.map(renderRole)}</ul>
          )}
        </Section>
      </div>
    </>
  );
}
