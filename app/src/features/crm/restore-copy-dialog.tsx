"use client";

/**
 * D10 — Restaurar cópia de registro `mesclado`, aberto por `?restaurar-copia=`.
 *
 * É a única saída da mesclagem, e o diálogo existe justamente para desfazer a
 * expectativa de que ela desfaz: cria um registro NOVO a partir do Estado
 * pré-mesclagem, com Proveniência, e o absorvido permanece `mesclado`.
 *
 * Por isso o Estado guardado aparece campo a campo antes de confirmar — quem
 * restaura precisa ver que o que volta é isto, e só isto.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useData, useRun } from "@/data/store";
import { contactDisplayName } from "@/data/derive";
import { restoreMergedCopy } from "@/data/operations";
import { ConfirmDialog } from "@/features/shell/ui";

export const RESTORE_COPY_PARAM = "restaurar-copia";

export function useRestoreCopyDialog(): {
  readonly restoring: boolean;
  readonly openRestore: () => void;
  readonly closeRestore: () => void;
} {
  const router = useRouter();
  const query = useSearchParams();
  const pathname = typeof window === "undefined" ? "" : window.location.pathname;

  return {
    restoring: query.has(RESTORE_COPY_PARAM),
    openRestore: () => {
      const next = new URLSearchParams(query.toString());
      next.set(RESTORE_COPY_PARAM, "");
      router.replace(`${pathname}?${next}`, { scroll: false });
    },
    closeRestore: () => {
      const next = new URLSearchParams(query.toString());
      next.delete(RESTORE_COPY_PARAM);
      router.replace(next.size > 0 ? `${pathname}?${next}` : pathname, { scroll: false });
    },
  };
}

interface Snapshot {
  readonly firstName?: string;
  readonly lastName?: string;
  readonly consents?: readonly unknown[];
  readonly addresses?: readonly unknown[];
  readonly tagIds?: readonly string[];
  readonly fieldValues?: ReadonlyArray<{ readonly definitionId: string; readonly value?: unknown }>;
  readonly identifiers?: ReadonlyArray<{ readonly displayValue: string }>;
}

export function RestoreCopyDialog({
  contactId,
  open,
  onClose,
  onDone,
}: {
  readonly contactId: string;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onDone: (message: string) => void;
}) {
  const state = useData((data) => data);
  const run = useRun();
  const [error, setError] = useState<string | null>(null);

  const merged = state.contacts.find((c) => c.id === contactId);
  if (!merged?.preMergeState) return null;

  const survivor = state.contacts.find((c) => c.id === merged.mergedIntoId);

  let snapshot: Snapshot | null = null;
  let parseError: string | null = null;
  try {
    snapshot = JSON.parse(merged.preMergeState.snapshot) as Snapshot;
  } catch (cause) {
    parseError = cause instanceof Error ? cause.message : "formato inválido";
  }

  const confirm = () => {
    const result = run((data, memberId) => restoreMergedCopy(data, memberId, merged.id));
    if (result.ok) {
      onDone(
        `Cópia criada: ${contactDisplayName(result.value)}. É um registro novo — ${contactDisplayName(merged)} continua mesclado.`,
      );
      setError(null);
      onClose();
    } else {
      setError(result.error);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      title="Restaurar cópia"
      description="Cria um Contato novo a partir do Estado pré-mesclagem. Não desfaz a mesclagem: o registro atual continua mesclado e as Conversas, Negócios e Tarefas seguem apontando para o sobrevivente."
      confirmLabel="Criar cópia"
      {...(parseError
        ? { confirmDisabledReason: `O Estado pré-mesclagem não pôde ser lido: ${parseError}.` }
        : {})}
      onConfirm={confirm}
      onCancel={() => {
        setError(null);
        onClose();
      }}
    >
      <div className="grid gap-3">
        <div className="rounded-[var(--raio-controle)] bg-[var(--cor-superficie-2)] px-3 py-2">
          <p className="text-[length:var(--texto-sm)] font-[var(--peso-medio)]">
            Estado pré-mesclagem, guardado no ato
          </p>
          {snapshot ? (
            <dl className="mt-1 space-y-1 text-[length:var(--texto-base)]">
              <Row label="Nome">
                {[snapshot.firstName, snapshot.lastName].filter(Boolean).join(" ") || "—"}
              </Row>
              <Row label="Consentimentos">{snapshot.consents?.length ?? 0} registro(s)</Row>
              <Row label="Endereços">{snapshot.addresses?.length ?? 0}</Row>
              <Row label="Tags">{snapshot.tagIds?.length ?? 0}</Row>
              <Row label="Valores de Campo">{snapshot.fieldValues?.length ?? 0}</Row>
            </dl>
          ) : (
            <p className="mt-1 text-[length:var(--texto-base)] text-[var(--cor-perigo)]">
              O Estado pré-mesclagem não pôde ser lido: {parseError}.
            </p>
          )}
        </div>

        <p className="rounded-[var(--raio-controle)] bg-[var(--cor-atencao-fraco)] px-3 py-2 text-[length:var(--texto-base)] text-[var(--cor-atencao-texto)]">
          A cópia nasce <strong>sem Identificadores</strong>: eles já pertencem a{" "}
          {survivor ? contactDisplayName(survivor) : "ao sobrevivente"}, e um Identificador vive num só
          Contato.
        </p>

        {error ? (
          <p role="alert" className="text-[length:var(--texto-base)] text-[var(--cor-perigo)]">
            {error}
          </p>
        ) : null}
      </div>
    </ConfirmDialog>
  );
}

function Row({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-[var(--cor-tinta-fraca)]">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
