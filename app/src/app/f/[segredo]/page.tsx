"use client";

/**
 * Fase 4 — Formulário público, fora do shell: quem responde não é Membro. O
 * envio chama `submitForm`, que cria a Tarefa em nome do dono do Formulário
 * com Proveniência. Nada da Lista aparece aqui além das perguntas.
 */

import { use, useState } from "react";
import { useData, useRun } from "@/data/store";
import { useHidratado } from "@/features/shell/app-shell";
import { formBySecret, submitForm } from "@/data/operations";
import { Button, Field, TextInput } from "@/features/shell/ui";

export default function FormularioPublicoPage({ params }: { params: Promise<{ segredo: string }> }) {
  const { segredo } = use(params);
  const run = useRun();
  const form = useData((data) => formBySecret(data, segredo));
  const definitions = useData((data) => data.fieldDefinitions);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [enviado, setEnviado] = useState<string | null>(null);
  const [erro, setErro] = useState<{ text: string; field?: string } | null>(null);
  const pronto = useHidratado();

  if (!pronto) return null;

  if (!form || !form.enabled) {
    return (
      <main className="mx-auto grid min-h-screen max-w-lg place-items-center p-6">
        <div className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-6 text-center">
          <h1 className="text-[length:var(--texto-lg)] font-semibold text-[var(--cor-tinta)]">Formulário indisponível</h1>
          <p className="mt-2 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
            {form ? "Este Formulário está pausado. Peça a quem o enviou para reativá-lo." : "Este link não existe mais ou foi renovado. Peça um novo a quem o enviou."}
          </p>
        </div>
      </main>
    );
  }

  const faltando = form.questions.find((q) => q.required && !answers[q.id]?.trim());

  return (
    <main className="mx-auto grid min-h-screen max-w-lg content-start gap-4 p-6">
      <header className="grid gap-1">
        <h1 className="text-[length:var(--texto-xl)] font-semibold text-[var(--cor-tinta)]">{form.name}</h1>
        {form.description ? <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">{form.description}</p> : null}
      </header>
      {enviado ? (
        <div role="status" className="rounded-[var(--raio-superficie)] border border-[var(--cor-sucesso-traco)] bg-[var(--cor-sucesso-fraco)] p-4 text-[var(--cor-sucesso-texto)]">
          <p className="font-medium">Recebido.</p>
          <p className="text-[length:var(--texto-base)]">“{enviado}” foi registrado. Pode fechar esta página ou enviar outro.</p>
          <span className="mt-3 inline-block">
            <Button
              onClick={() => {
                setEnviado(null);
                setAnswers({});
              }}
            >
              Enviar outro
            </Button>
          </span>
        </div>
      ) : (
        <form
          className="grid gap-3 rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const result = run((data) => submitForm(data, segredo, answers));
            if (result.ok) {
              setErro(null);
              setEnviado(result.value.title);
            } else {
              setErro({ text: result.error, ...(result.field ? { field: result.field } : {}) });
            }
          }}
        >
          {erro ? (
            <p role="alert" className="rounded-[var(--raio-controle)] bg-[var(--cor-perigo-fraco)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-perigo-texto)]">
              {erro.text}
            </p>
          ) : null}
          {form.questions.map((q) => {
            const def = q.target.kind === "field" ? definitions.find((d) => d.id === (q.target as { definitionId: string }).definitionId) : undefined;
            const opcoes = def?.options ?? [];
            return (
              <Field key={q.id} label={`${q.label}${q.required ? " *" : ""}`} {...(erro?.field === q.id ? { error: erro.text } : {})} {...(def?.type === "multiSelect" ? { hint: "Separe várias opções por vírgula." } : {})}>
                {(id) =>
                  def?.type === "singleSelect" && opcoes.length > 0 ? (
                    <select
                      id={id}
                      value={answers[q.id] ?? ""}
                      onChange={(event) => setAnswers({ ...answers, [q.id]: event.target.value })}
                      className="h-[var(--altura-controle)] w-full rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] bg-[var(--cor-papel)] px-2 text-[length:var(--texto-base)] text-[var(--cor-tinta)]"
                    >
                      <option value="">Escolher</option>
                      {opcoes.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : def?.type === "checkbox" ? (
                    <select
                      id={id}
                      value={answers[q.id] ?? ""}
                      onChange={(event) => setAnswers({ ...answers, [q.id]: event.target.value })}
                      className="h-[var(--altura-controle)] w-full rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] bg-[var(--cor-papel)] px-2 text-[length:var(--texto-base)] text-[var(--cor-tinta)]"
                    >
                      <option value="">Escolher</option>
                      <option value="sim">Sim</option>
                      <option value="não">Não</option>
                    </select>
                  ) : q.target.kind === "description" || def?.type === "longText" ? (
                    <textarea
                      id={id}
                      value={answers[q.id] ?? ""}
                      onChange={(event) => setAnswers({ ...answers, [q.id]: event.target.value })}
                      rows={4}
                      className="w-full rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] bg-[var(--cor-papel)] px-2 py-1.5 text-[length:var(--texto-base)] text-[var(--cor-tinta)]"
                    />
                  ) : (
                    <TextInput
                      id={id}
                      value={answers[q.id] ?? ""}
                      onChange={(value) => setAnswers({ ...answers, [q.id]: value })}
                      {...(def?.type === "number" || def?.type === "currency" || def?.type === "percent" ? { type: "number" as const } : def?.type === "email" ? { type: "email" as const } : {})}
                    />
                  )
                }
              </Field>
            );
          })}
          <span className="flex justify-end">
            <Button type="submit" variant="primary" disabled={faltando !== undefined} disabledReason={faltando ? `Responda “${faltando.label}”.` : ""}>
              Enviar
            </Button>
          </span>
          <p className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">* obrigatório. Cada envio vira uma Tarefa para a equipe responsável.</p>
        </form>
      )}
    </main>
  );
}
