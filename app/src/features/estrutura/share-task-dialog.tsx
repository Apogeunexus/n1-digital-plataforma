"use client";

/**
 * Fase 4 — link público de uma Tarefa. Criar gera um segredo; revogar o
 * invalida na hora. O que o link mostra (comentários, anexos) é decidido ao
 * criar e fica gravado no compartilhamento.
 */

import { useState } from "react";
import { useRun } from "@/data/store";
import { revokePublicShare, shareTaskPublicly } from "@/data/operations";
import { Button, ConfirmDialog, Toggle } from "@/features/shell/ui";
import type { Task } from "@/data/types";

type Report = (result: { ok: boolean; error?: string }, message: string) => void;

export function ShareTaskDialog({
  task,
  open,
  onClose,
  report,
  permitido,
  revogarRecusado,
}: {
  readonly task: Task;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly report: Report;
  /** Motivo pelo qual não se compartilha (funcionalidade desligada, sem administrar) — ou nada. */
  readonly permitido: string | undefined;
  /** Motivo pelo qual não se revoga (sem administrar) — a funcionalidade desligada não impede revogar. */
  readonly revogarRecusado: string | undefined;
}) {
  const run = useRun();
  const [comentarios, setComentarios] = useState(false);
  const [anexos, setAnexos] = useState(true);
  const [revogando, setRevogando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ativo = task.publicShare?.active ? task.publicShare : undefined;
  const link = ativo ? `${typeof window === "undefined" ? "" : window.location.origin}/p/${ativo.secret}` : "";

  return (
    <>
      <ConfirmDialog
        open={open && !revogando}
        title="Compartilhar por link"
        description={
          ativo
            ? "Quem tiver o link vê a Tarefa só leitura, sem entrar. Revogar o link fecha o acesso na hora."
            : "Gera um link que abre esta Tarefa só leitura para quem não é Membro. Escolha o que o link mostra."
        }
        confirmLabel={ativo ? "Fechar" : "Gerar link"}
        {...(!ativo && permitido ? { confirmDisabledReason: permitido } : {})}
        onConfirm={() => {
          if (ativo) {
            onClose();
            return;
          }
          const result = run((data, me) => shareTaskPublicly(data, me, task.id, { showsComments: comentarios, showsAttachments: anexos }));
          if (result.ok) {
            report(result, "Link público criado. Copie e envie.");
            setErro(null);
          } else {
            setErro(result.error);
          }
        }}
        onCancel={() => {
          setErro(null);
          onClose();
        }}
        {...(ativo
          ? {
              footerStart: (
                <Button variant="danger" onClick={() => setRevogando(true)} disabled={revogarRecusado !== undefined} disabledReason={revogarRecusado ?? ""}>
                  Revogar link
                </Button>
              ),
            }
          : {})}
      >
        {ativo ? (
          <div className="grid gap-2">
            <p className="break-all rounded-[var(--raio-controle)] border border-[var(--cor-traco)] bg-[var(--cor-superficie-2)] px-3 py-2 font-mono text-[length:var(--texto-sm)] text-[var(--cor-tinta)]">{link}</p>
            <span className="flex flex-wrap gap-2">
              <Button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    setCopiado(true);
                    window.setTimeout(() => setCopiado(false), 2000);
                  } catch {
                    report({ ok: false, error: "Não foi possível copiar: selecione o link e copie manualmente." }, "");
                  }
                }}
              >
                {copiado ? "Copiado" : "Copiar link"}
              </Button>
              <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center text-[length:var(--texto-base)] text-[var(--cor-acento)] underline">
                Abrir em nova aba
              </a>
            </span>
            <p className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
              Mostra comentários: {ativo.showsComments ? "sim" : "não"} · anexos: {ativo.showsAttachments ? "sim" : "não"}. Para mudar, revogue e gere outro.
            </p>
            <p className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
              Protótipo: os dados vivem na memória desta aba, então um link gerado agora abre só nela. O link de demonstração <a href="/p/demo-tarefa" target="_blank" rel="noreferrer" className="underline">/p/demo-tarefa</a> abre em qualquer aba.
            </p>
          </div>
        ) : (
          <div className="grid gap-2 text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
            {erro ? <p role="alert" className="rounded-[var(--raio-controle)] bg-[var(--cor-perigo-fraco)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-perigo-texto)]">{erro}</p> : null}
            <span className="flex items-center gap-2">
              <Toggle checked={comentarios} onChange={setComentarios} labelledBy="share-comentarios" />
              <span id="share-comentarios">Mostrar comentários</span>
            </span>
            <span className="flex items-center gap-2">
              <Toggle checked={anexos} onChange={setAnexos} labelledBy="share-anexos" />
              <span id="share-anexos">Mostrar anexos</span>
            </span>
          </div>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={revogando}
        title="Revogar o link público?"
        description="Quem tiver o link deixa de abrir a Tarefa na hora. Dá para gerar outro depois."
        confirmLabel="Revogar"
        destructive
        onConfirm={() => {
          report(run((data, me) => revokePublicShare(data, me, task.id)), "Link público revogado.");
          setRevogando(false);
        }}
        onCancel={() => setRevogando(false)}
      />
    </>
  );
}
