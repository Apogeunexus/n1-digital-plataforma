"use client";

/**
 * T50 — Auditoria.
 *
 * A6.2 — every recorded action carries the actor and, when there is one, the
 * delegate ("em nome de"). A6.4 / INV-ET-12 — the record survives both the
 * removal of the Member who acted and the elimination of the object, which is
 * why the object NAME is stored on the record instead of being looked up.
 */

import Link from "next/link";
import { useState } from "react";
import { useData } from "@/data/store";
import { actorLabel, newestFirst } from "@/data/derive";
import { OBJECT_TYPE_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import { Button, EmptyState, Field, PageHeader, TextInput, Toast } from "@/features/shell/ui";
import {
  GovernanceAccessDialog,
  useGovernanceAccessDialog,
} from "@/features/configuracoes/governance-access-dialog";
import type { ActorRef } from "@/data/types";

const RESULT_LABEL: Record<string, string> = {
  ok: "concluída",
  denied: "negada",
  failed: "falhou",
};

const PAGE_SIZE = 50;

export default function AuditoriaPage() {
  const state = useData((data) => data);
  const fmt = useFormat();
  const [actorKind, setActorKind] = useState<"todos" | ActorRef["kind"]>("todos");
  const [objectType, setObjectType] = useState("todos");
  const [result, setResult] = useState<"todos" | "ok" | "denied" | "failed">("todos");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);
  const { governedResourceId, openGovernance, closeGovernance } = useGovernanceAccessDialog();
  const [resourceProbe, setResourceProbe] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const objectTypes = [...new Set(state.activity.map((record) => record.objectType))].sort();

  const term = query.trim().toLowerCase();
  const filtered = newestFirst(state.activity)
    .filter((record) => actorKind === "todos" || record.actor.kind === actorKind)
    .filter((record) => objectType === "todos" || record.objectType === objectType)
    .filter((record) => result === "todos" || record.result === result)
    .filter(
      (record) =>
        term === "" ||
        record.action.toLowerCase().includes(term) ||
        record.objectName.toLowerCase().includes(term),
    );

  const visible = filtered.slice(0, shown);

  return (
    <>
      <PageHeader
        path={
          <Link href="/configuracoes" className="hover:underline">
            Configurações
          </Link>
        }
        title="Auditoria"
        meta={`${state.activity.length} Registro(s) de Atividade. Cada um sobrevive à remoção de quem agiu e à eliminação do objeto.`}
      />

      <div className="flex flex-wrap items-end gap-3 border-b border-[var(--cor-traco)] bg-[var(--cor-superficie)] px-6 py-3">
        <label className="flex flex-col gap-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
          Ator
          <select
            value={actorKind}
            onChange={(event) => {
              setActorKind(event.target.value as "todos" | ActorRef["kind"]);
              setShown(PAGE_SIZE);
            }}
            className="rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)] px-2 py-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]"
          >
            <option value="todos">Todos</option>
            <option value="member">Membro</option>
            <option value="agent">Agente</option>
            <option value="automation">Automação</option>
            <option value="integration">Integração</option>
            <option value="system">Sistema</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
          Tipo de objeto
          <select
            value={objectType}
            onChange={(event) => {
              setObjectType(event.target.value);
              setShown(PAGE_SIZE);
            }}
            className="rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)] px-2 py-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]"
          >
            <option value="todos">Todos</option>
            {objectTypes.map((type) => (
              <option key={type} value={type}>
                {OBJECT_TYPE_LABEL[type] ?? type}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
          Resultado
          <select
            value={result}
            onChange={(event) => {
              setResult(event.target.value as "todos" | "ok" | "denied" | "failed");
              setShown(PAGE_SIZE);
            }}
            className="rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)] px-2 py-1 text-[length:var(--texto-base)] text-[var(--cor-tinta)]"
          >
            <option value="todos">Todos</option>
            <option value="ok">Concluída</option>
            <option value="denied">Negada</option>
            <option value="failed">Falhou</option>
          </select>
        </label>

        <label className="flex flex-1 flex-col gap-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
          Buscar na ação ou no objeto
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShown(PAGE_SIZE);
            }}
            className="rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] px-2 py-1 text-[length:var(--texto-base)]"
          />
        </label>

        <span className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
          {filtered.length} de {state.activity.length}
        </span>
      </div>

      <GovernanceAccessDialog
        resourceId={governedResourceId}
        onClose={closeGovernance}
        onDone={setNotice}
      />

      <div className="p-6">
        {notice ? (
          <div className="mb-4">
            <Toast tone="success" onDismiss={() => setNotice(null)}>
              {notice}
            </Toast>
          </div>
        ) : null}

        {/*
          B38a esconde o contêiner privado de todo mundo, então não existe uma
          listagem navegável dele. A via de B38b entra por aqui: pelo rastro que
          o Registro deixa, ou por um identificador recebido por fora.
        */}
        <details className="mb-6 rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4">
          <summary className="cursor-pointer text-[length:var(--texto-base)] font-[var(--peso-medio)]">
            Ato de governança sobre Recurso privado
          </summary>
          <p className="mt-2 max-w-[74ch] text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
            Um contêiner privado não aparece em listagem nenhuma — nem para o Proprietário do Espaço de
            Trabalho. A única via de entrada sem concessão prévia é este ato, e ele nunca é silencioso:
            exige motivo e gera Registro visível a quem tem acesso ao Recurso.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-64 flex-1">
              <Field label="Identificador do Recurso" hint="Espaço, Pasta, Lista, Funil ou Coleção.">
                {(id) => (
                  <TextInput
                    id={id}
                    value={resourceProbe}
                    onChange={setResourceProbe}
                    placeholder="Ex.: spc_com"
                  />
                )}
              </Field>
            </div>
            <Button
              onClick={() => openGovernance(resourceProbe.trim())}
              disabled={resourceProbe.trim() === ""}
              disabledReason="Informe o identificador do Recurso."
            >
              Abrir ato de governança
            </Button>
          </div>
        </details>

        {filtered.length === 0 ? (
          <EmptyState
            title="Nenhum Registro de Atividade com estes filtros."
            hint="Ajuste o ator, o tipo de objeto, o resultado ou o termo de busca."
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
              <div className="overflow-x-auto">
                <table className="w-full text-[length:var(--texto-base)]">
                  <thead className="border-b border-[var(--cor-traco)] bg-[var(--cor-superficie-2)] text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Quando</th>
                      <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Quem</th>
                      <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Ação</th>
                      <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Objeto</th>
                      <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Mudança</th>
                      <th className="px-3 py-2 font-medium text-[var(--cor-tinta-fraca)]">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--cor-traco)]">
                    {visible.map((record) => (
                      <tr key={record.id} className="hover:bg-[var(--cor-superficie-2)]">
                        <td className="whitespace-nowrap px-3 py-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                          {fmt.instant(record.at)}
                        </td>
                        <td className="px-3 py-2 text-[var(--cor-tinta)]">
                          {actorLabel(state, record.actor)}
                          {record.delegate ? (
                            <span className="block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                              em nome de {actorLabel(state, record.delegate)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-[var(--cor-tinta)]">
                          {record.action}
                          {record.detail ? (
                            <span className="block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">{record.detail}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-[var(--cor-tinta)]">
                          {record.objectName}
                          <span className="block text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                            {OBJECT_TYPE_LABEL[record.objectType] ?? record.objectType}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                          {record.before || record.after
                            ? `${record.before ?? "—"} → ${record.after ?? "—"}`
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[length:var(--texto-sm)] ${
                              record.result === "ok"
                                ? "bg-[var(--cor-superficie-2)] text-[var(--cor-tinta)]"
                                : record.result === "denied"
                                  ? "bg-[var(--cor-atencao-fraco)] text-[var(--cor-atencao-texto)]" // smaug-ignore ui-strings: nome de token CSS, não texto de interface
                                  : "bg-[var(--cor-perigo-fraco)] text-[var(--cor-perigo-texto)]"
                            }`}
                          >
                            {RESULT_LABEL[record.result] ?? record.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--cor-traco)] bg-[var(--cor-superficie-2)] px-3 py-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                <span>
                  Mostrando {visible.length} de {filtered.length}
                </span>
                {shown < filtered.length ? (
                  <button
                    type="button"
                    onClick={() => setShown((value) => value + PAGE_SIZE)}
                    className="rounded px-2 py-1 font-medium text-[var(--cor-tinta)] hover:bg-[var(--cor-traco)]"
                  >
                    Mostrar mais
                  </button>
                ) : null}
              </div>
            </div>
            <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
              O nome do objeto fica gravado no próprio Registro: por isso ele continua legível mesmo depois
              de o objeto deixar de existir.
            </p>
          </>
        )}
      </div>
    </>
  );
}
