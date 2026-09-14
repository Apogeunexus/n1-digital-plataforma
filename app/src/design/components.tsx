"use client";

import Image from "next/image";

/**
 * Base components — Fase 5.
 *
 * Every colour here reads a token from `tokens.css`. A hardcoded hex would work
 * in the light theme and break in the dark one without any error, which is the
 * worst kind of defect: silent and invisible to the author.
 *
 * Three rules from PADROES-TRANSVERSAIS are enforced structurally rather than
 * by convention, because convention drifts across 51 screens:
 *   §2  — a lifecycle SEAL and a derived-condition MARKER are different shapes.
 *   §11 — a disabled control ALWAYS says why.
 *   §14 — "empty" and "no access" are different components, on purpose.
 */

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Check, ChevronDown, ChevronUp, Search, X } from "lucide-react";

/* ------------------------------------------------------------------ button */

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const BUTTON_STYLE: Record<ButtonVariant, string> = {
  primary:
    "bg-[image:var(--gradiente-acao)] text-[var(--cor-gradiente-texto)] shadow-[0_8px_24px_-12px_color-mix(in_srgb,var(--cor-acento)_80%,transparent)] hover:brightness-110",
  secondary:
    "bg-[var(--cor-superficie)] text-[var(--cor-tinta)] ring-1 ring-inset ring-[var(--cor-traco-forte)] hover:bg-[var(--cor-superficie-2)]",
  danger:
    "bg-[var(--cor-perigo)] text-[var(--cor-perigo-texto-contraste)] hover:bg-[var(--cor-perigo-forte)]",
  ghost: "text-[var(--cor-tinta-fraca)] hover:bg-[var(--cor-superficie-2)] hover:text-[var(--cor-tinta)]",
};

export function Button({
  children,
  onClick,
  variant = "secondary",
  disabled = false,
  disabledReason,
  type = "button",
  icon,
  full = false,
}: {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly variant?: ButtonVariant;
  readonly disabled?: boolean;
  /** §11 — required whenever `disabled` can be true, or the user is left guessing. */
  readonly disabledReason?: string;
  readonly type?: "button" | "submit";
  readonly icon?: ReactNode;
  readonly full?: boolean;
}) {
  const reasonId = useId();
  /**
   * §11 — a disabled control ALWAYS says why, and `title` alone says it only to
   * a mouse. A natively disabled button takes no focus and announces no tooltip,
   * so the reason is kept reachable: the button stays focusable via
   * `aria-disabled`, the click is swallowed, and the text is announced through
   * `aria-describedby`.
   *
   * Swallowing `onClick` NÃO basta num `type="submit"`: sem `onClick` o clique
   * ainda submete o `<form>` pelo comportamento nativo do botão, e a ação
   * acontece com o controle aparentando estar desligado. Por isso o evento é
   * interceptado e cancelado, em vez de simplesmente não ter handler.
   */
  return (
    <>
      <button
        type={type}
        onClick={
          disabled
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
              }
            : onClick
        }
        aria-disabled={disabled}
        {...(disabled && disabledReason ? { "aria-describedby": reasonId } : {})}
        title={disabled ? disabledReason : undefined}
        className={`inline-flex h-[var(--altura-controle)] items-center justify-center gap-1.5 rounded-[var(--raio-controle)] px-3 text-[length:var(--texto-base)] font-[var(--peso-medio)] transition-colors ${disabled ? "cursor-not-allowed opacity-45" : ""} ${BUTTON_STYLE[variant]} ${full ? "w-full" : ""}`}
      >
        {icon}
        {children}
      </button>
      {/*
        `hidden` e não `sr-only`: o `sr-only` do Tailwind é `position: absolute`,
        e sem ancestral posicionado ele se ancora no documento inteiro. Dentro de
        uma coluna que rola, este texto invisível caía centenas de pixels abaixo
        e esticava a barra de rolagem da PÁGINA para um lugar onde não há nada.
        Um nó `display: none` continua sendo lido: o cálculo da descrição
        acessível inclui o alvo de `aria-describedby` mesmo escondido.
      */}
      {disabled && disabledReason ? (
        <span id={reasonId} hidden>
          {disabledReason}
        </span>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------- field */

export function Field({
  label,
  hint,
  error,
  required = false,
  children,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  /** Marca o campo como obrigatório antes do clique, não depois da recusa. */
  readonly required?: boolean;
  readonly children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      {/* ui-ptbr.md — every input has a visible label, never a placeholder standing in for one. */}
      <label htmlFor={id} className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
        {label}
        {required ? (
          <span className="ml-0.5 text-[var(--cor-perigo)]" title="Obrigatório">
            *
          </span>
        ) : null}
      </label>
      {children(id)}
      {error ? (
        <p role="alert" className="text-[length:var(--texto-xs)] text-[var(--cor-perigo)]">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  invalid = false,
  type = "text",
  disabled = false,
  disabledReason,
}: {
  readonly id?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly invalid?: boolean;
  readonly type?: "text" | "email" | "search" | "number";
  readonly disabled?: boolean;
  /** §11 — um controle desligado sempre diz por quê. */
  readonly disabledReason?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-invalid={invalid}
      readOnly={disabled}
      aria-disabled={disabled}
      title={disabled ? disabledReason : undefined}
      className={`h-[var(--altura-controle)] w-full rounded-[var(--raio-controle)] border bg-[var(--cor-superficie)] px-2 text-[length:var(--texto-base)] text-[var(--cor-tinta)] placeholder:text-[var(--cor-tinta-fraca)] ${
        invalid ? "border-[var(--cor-perigo)]" : "border-[var(--cor-traco-forte)]"
      } ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
    />
  );
}

export function TextArea({
  id,
  value,
  onChange,
  rows = 3,
  placeholder,
  disabled = false,
  disabledReason,
  autoGrow = false,
  maxHeight = 240,
}: {
  readonly id?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly rows?: number;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  /** §11 — um controle desligado sempre diz por quê. */
  readonly disabledReason?: string;
  /** Cresce com o texto em vez de cortá-lo em `rows` linhas. */
  readonly autoGrow?: boolean;
  /** Teto em pixels: passado dele o campo rola por dentro. */
  readonly maxHeight?: number;
}) {
  const campo = useRef<HTMLTextAreaElement>(null);

  /*
   * `field-sizing: content` resolve isto sem JavaScript, mas ainda não está em
   * todo navegador. Quando ele existe, o efeito abaixo não faz nada; quando não
   * existe, a altura é ajustada na mão. Sem o reset para "auto" antes de medir,
   * o campo só cresce e nunca volta a encolher ao apagar texto.
   */
  useLayoutEffect(() => {
    const elemento = campo.current;
    if (!elemento || !autoGrow) return;
    if (typeof CSS !== "undefined" && CSS.supports?.("field-sizing", "content")) return;
    elemento.style.height = "auto";
    elemento.style.height = `${Math.min(elemento.scrollHeight, maxHeight)}px`;
  }, [value, autoGrow, maxHeight]);

  return (
    <textarea
      ref={campo}
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      placeholder={placeholder}
      readOnly={disabled}
      aria-disabled={disabled}
      title={disabled ? disabledReason : undefined}
      style={
        autoGrow
          ? ({ fieldSizing: "content", maxHeight } as CSSProperties)
          : undefined
      }
      className={`w-full rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)] px-2 py-1.5 text-[length:var(--texto-base)] text-[var(--cor-tinta)] placeholder:text-[var(--cor-tinta-fraca)] ${
        disabled ? "cursor-not-allowed opacity-45" : ""
      }`}
    />
  );
}

/* ------------------------------------------------- select, single and multi */

export interface Option {
  readonly value: string;
  readonly label: string;
  readonly detail?: string;
  readonly color?: string;
  /** §11 — an option that cannot be picked says why, instead of vanishing. */
  readonly disabledReason?: string;
}

export function Select({
  id,
  value,
  options,
  onChange,
  placeholder = "Escolher",
  searchable = false,
  disabled = false,
  disabledReason,
}: {
  readonly id?: string;
  readonly value: string;
  readonly options: readonly Option[];
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly searchable?: boolean;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  useDismiss(root, () => setOpen(false));

  const chosen = options.find((option) => option.value === value);
  const shown = query
    ? options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const choose = (index: number) => {
    const option = shown[index];
    if (!option || option.disabledReason !== undefined) return;
    onChange(option.value);
    setOpen(false);
    setQuery("");
  };
  const { activeIndex, setActiveIndex, onKeyDown } = useListKeys(open, shown.length, choose);

  return (
    <div ref={root} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        aria-disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        onKeyDown={onKeyDown}
        onClick={() => setOpen((current) => !current)}
        className="flex h-[var(--altura-controle)] w-full items-center gap-2 rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)] px-2 text-left text-[length:var(--texto-base)] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {chosen?.color ? (
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: chosen.color }} />
        ) : null}
        <span className={`flex-1 truncate ${chosen ? "text-[var(--cor-tinta)]" : "text-[var(--cor-tinta-fraca)]"}`}>
          {chosen?.label ?? placeholder}
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-[var(--cor-tinta-fraca)]" aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)] shadow-[var(--sombra-elevada)]">
          {searchable ? (
            <div className="flex items-center gap-1.5 border-b border-[var(--cor-traco)] px-2 py-1.5">
              <Search className="size-3.5 text-[var(--cor-tinta-fraca)]" aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar"
                aria-label="Buscar opção"
                className="w-full bg-transparent text-[length:var(--texto-base)] outline-none placeholder:text-[var(--cor-tinta-fraca)]"
              />
            </div>
          ) : null}
          <ul id={listId} role="listbox" className="relative max-h-56 overflow-y-auto py-1">
            {shown.length === 0 ? (
              <li className="px-2 py-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                Nenhuma opção corresponde a “{query}”.
              </li>
            ) : (
              shown.map((option, index) => (
                // role="none" — an `option` must be owned by the `listbox`; a
                // plain `li` in between breaks that relation.
                <li key={option.value} role="none">
                  <button
                    type="button"
                    role="option"
                    id={`${listId}-${index}`}
                    tabIndex={-1}
                    aria-selected={option.value === value}
                    aria-disabled={option.disabledReason !== undefined}
                    title={option.disabledReason}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(index)}
                    className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-[length:var(--texto-base)] ${
                      index === activeIndex ? "bg-[var(--cor-acento-fraco)]" : ""
                    } ${option.disabledReason !== undefined ? "cursor-not-allowed opacity-45" : "hover:bg-[var(--cor-superficie-2)]"}`}
                  >
                    {option.color ? (
                      <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: option.color }} />
                    ) : null}
                    <span className="flex-1 truncate">{option.label}</span>
                    {option.detail ? (
                      <span className="shrink-0 text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
                        {option.detail}
                      </span>
                    ) : null}
                    {option.value === value ? (
                      <Check className="size-3.5 shrink-0 text-[var(--cor-acento)]" aria-hidden="true" />
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function MultiSelect({
  id,
  values,
  options,
  onChange,
  placeholder = "Escolher",
}: {
  /** Required whenever a `Field` wraps it, or its `htmlFor` points at nothing. */
  readonly id?: string;
  readonly values: readonly string[];
  readonly options: readonly Option[];
  readonly onChange: (values: readonly string[]) => void;
  readonly placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  useDismiss(root, () => setOpen(false));

  const shown = query
    ? options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const toggle = (value: string) => {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  };
  const { activeIndex, setActiveIndex, onKeyDown } = useListKeys(open, shown.length, (index) => {
    const option = shown[index];
    if (option) toggle(option.value);
  });

  return (
    <div ref={root} className="relative">
      <div className="flex min-h-[var(--altura-controle)] flex-wrap items-center gap-1 rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)] px-1.5 py-1">
        {values.length === 0 ? (
          <span className="px-0.5 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
            {placeholder}
          </span>
        ) : (
          values.map((value) => {
            const option = options.find((o) => o.value === value);
            return (
              <Chip key={value} onRemove={() => toggle(value)} color={option?.color}>
                {option?.label ?? value}
              </Chip>
            );
          })
        )}
        <button
          id={id}
          type="button"
          onClick={() => setOpen((current) => !current)}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
          onKeyDown={onKeyDown}
          aria-label="Abrir opções"
          className="ml-auto shrink-0 px-1"
        >
          <ChevronDown className="size-3.5 text-[var(--cor-tinta-fraca)]" aria-hidden="true" />
        </button>
      </div>

      {open ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)] shadow-[var(--sombra-elevada)]">
          <div className="flex items-center gap-1.5 border-b border-[var(--cor-traco)] px-2 py-1.5">
            <Search className="size-3.5 text-[var(--cor-tinta-fraca)]" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar"
              aria-label="Buscar opção"
              className="w-full bg-transparent text-[length:var(--texto-base)] outline-none placeholder:text-[var(--cor-tinta-fraca)]"
            />
          </div>
          <ul id={listId} role="listbox" aria-multiselectable="true" className="relative max-h-56 overflow-y-auto py-1">
            {shown.length === 0 ? (
              <li className="px-2 py-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                Nenhuma opção corresponde a “{query}”.
              </li>
            ) : (
              shown.map((option, index) => (
                <li key={option.value} role="none">
                  <button
                    type="button"
                    role="option"
                    id={`${listId}-${index}`}
                    tabIndex={-1}
                    aria-selected={values.includes(option.value)}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => toggle(option.value)}
                    className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-[length:var(--texto-base)] hover:bg-[var(--cor-superficie-2)] ${
                      index === activeIndex ? "bg-[var(--cor-acento-fraco)]" : ""
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`grid size-3.5 shrink-0 place-items-center rounded-[2px] border ${
                        values.includes(option.value)
                          ? "border-[var(--cor-acento)] bg-[var(--cor-acento)]"
                          : "border-[var(--cor-traco-forte)]"
                      }`}
                    >
                      {values.includes(option.value) ? (
                        <Check className="size-2.5 text-[var(--cor-acento-texto)]" />
                      ) : null}
                    </span>
                    <span className="flex-1 truncate">{option.label}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------- chip and seals */

export function Chip({
  children,
  onRemove,
  color,
}: {
  readonly children: ReactNode;
  readonly onRemove?: () => void;
  readonly color?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-[var(--raio-selo)] bg-[var(--cor-superficie-2)] px-1.5 py-0.5 text-[length:var(--texto-xs)] text-[var(--cor-tinta)] ring-1 ring-inset ring-[var(--cor-traco)]"
      // color-mix works with a token; `${color}1f` silently produced an invalid
      // value for `var(--…)` and dropped the background entirely.
      style={color ? { background: `color-mix(in srgb, ${color} 12%, transparent)` } : undefined}
    >
      {color ? <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: color }} /> : null}
      {children}
      {onRemove ? (
        <button type="button" onClick={onRemove} aria-label="Remover" className="ml-0.5 opacity-60 hover:opacity-100">
          <X className="size-3" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}

const SEAL_TOKEN: Record<string, { readonly cor: string; readonly fundo: string; readonly rotulo: string }> = {
  arquivado: { cor: "var(--cor-selo-arquivado)", fundo: "var(--cor-selo-arquivado-fundo)", rotulo: "arquivado" },
  naLixeira: { cor: "var(--cor-selo-lixeira)", fundo: "var(--cor-selo-lixeira-fundo)", rotulo: "na lixeira" },
  mesclado: { cor: "var(--cor-selo-mesclado)", fundo: "var(--cor-selo-mesclado-fundo)", rotulo: "mesclado" },
  rascunho: { cor: "var(--cor-selo-rascunho)", fundo: "var(--cor-selo-rascunho-fundo)", rotulo: "rascunho" },
  pausado: { cor: "var(--cor-selo-pausado)", fundo: "var(--cor-selo-pausado-fundo)", rotulo: "pausado" },
  suspenso: { cor: "var(--cor-selo-pausado)", fundo: "var(--cor-selo-pausado-fundo)", rotulo: "suspenso" },
  encerrado: { cor: "var(--cor-selo-lixeira)", fundo: "var(--cor-selo-lixeira-fundo)", rotulo: "encerrado" },
  pendente: { cor: "var(--cor-selo-pendente)", fundo: "var(--cor-selo-pendente-fundo)", rotulo: "pendente" },
  removido: { cor: "var(--cor-selo-rascunho)", fundo: "var(--cor-selo-rascunho-fundo)", rotulo: "removido" },
};

/**
 * §2 — the record IS this. Rectangular, next to the name, and it only changes
 * by an act. `ativo` renders nothing: a seal on every record is a seal nobody
 * reads.
 */
export function StateSeal({ state }: { readonly state: string }) {
  if (state === "ativo") return null;
  const token = SEAL_TOKEN[state];
  if (!token) return null;
  return (
    <span
      className="inline-block shrink-0 rounded-[var(--raio-selo)] px-1.5 py-0.5 text-[length:var(--texto-xs)] font-[var(--peso-medio)]"
      style={{ color: token.cor, background: token.fundo, boxShadow: `inset 0 0 0 1px ${token.cor}33` }}
    >
      {token.rotulo}
    </span>
  );
}

/**
 * §2 — the record IS LIKE THIS NOW, and it clears itself when the cause ceases.
 * Deliberately a different shape from the seal: same shape would teach the user
 * that "Vencida" is as permanent as "arquivado".
 */
export function ConditionMarker({
  children,
  tone = "neutral",
  title,
}: {
  readonly children: ReactNode;
  readonly tone?: "neutral" | "warning" | "danger";
  readonly title?: string;
}) {
  const cor =
    tone === "danger"
      ? "var(--cor-perigo)"
      : tone === "warning"
        ? "var(--cor-atencao)"
        : "var(--cor-tinta-fraca)";
  return (
    <span
      className="inline-flex items-center gap-1 text-[length:var(--texto-xs)]"
      style={{ color: cor }}
      title={title}
    >
      <span aria-hidden="true">•</span>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ table */

export interface Column<T> {
  readonly key: string;
  readonly label: string;
  readonly render: (item: T) => ReactNode;
  readonly width?: string;
  readonly align?: "esquerda" | "direita";
}

/** Sticky head plus horizontal scroll: the column names must not leave the
 *  screen exactly when the rows get wide enough to need them. */
export function DataTable<T extends { readonly id: string }>({
  items,
  columns,
  onRowClick,
  caption,
}: {
  readonly items: readonly T[];
  readonly columns: ReadonlyArray<Column<T>>;
  readonly onRowClick?: (item: T) => void;
  readonly caption?: string;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)]">
      <div className="relative max-h-[28rem] overflow-auto">
        <table className="tabela-densa w-full border-collapse text-[length:var(--texto-base)]">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  className={`border-b border-[var(--cor-traco)] px-3 py-1.5 text-[length:var(--texto-sm)] font-[var(--peso-medio)] text-[var(--cor-tinta-fraca)] ${
                    column.align === "direita" ? "text-right" : "text-left"
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                {...(onRowClick
                  ? {
                      onClick: () => onRowClick(item),
                      // A row that only answers the mouse is unreachable for
                      // half the users; `button` here would break the table
                      // semantics, so the row itself takes focus and Enter.
                      onKeyDown: (event: React.KeyboardEvent) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick(item);
                        }
                      },
                      tabIndex: 0,
                      role: "button" as const,
                    }
                  : {})}
                className={`h-[var(--altura-linha-tabela)] border-b border-[var(--cor-traco)] last:border-0 ${
                  onRowClick ? "cursor-pointer hover:bg-[var(--cor-superficie-2)]" : ""
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-3 py-1 align-middle ${column.align === "direita" ? "text-right" : "text-left"}`}
                  >
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ board */

export function Board({ children }: { readonly children: ReactNode }) {
  return <div className="flex gap-3 overflow-x-auto pb-2">{children}</div>;
}

export function BoardColumn({
  title,
  count,
  meta,
  color,
  children,
  onDrop,
}: {
  readonly title: string;
  readonly count: number;
  readonly meta?: string;
  readonly color?: string;
  readonly children: ReactNode;
  readonly onDrop?: () => void;
}) {
  return (
    <section
      onDragOver={onDrop ? (event) => event.preventDefault() : undefined}
      onDrop={onDrop}
      className="flex w-64 shrink-0 flex-col rounded-[var(--raio-superficie)] bg-[var(--cor-superficie-2)] p-2"
    >
      <header className="mb-2 px-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-[length:var(--texto-base)] font-[var(--peso-forte)]">
            {color ? <span aria-hidden="true" className="size-2 rounded-full" style={{ background: color }} /> : null}
            {title}
          </h3>
          <span className="text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">{count}</span>
        </div>
        {meta ? <p className="mt-0.5 text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">{meta}</p> : null}
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

/* ---------------------------------------------------- panel, dialog, toast */

export function SidePanel({
  title,
  open,
  onClose,
  children,
  footer,
  wide = false,
  bare = false,
}: {
  readonly title: string;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  /** Uma tela inteira dentro do painel (o Negócio na Lista do Funil): quase a largura toda. */
  readonly wide?: boolean;
  /** O conteúdo traz o próprio cabeçalho e o botão de fechar. */
  readonly bare?: boolean;
}) {
  const panel = useRef<HTMLElement>(null);
  useModal(open, onClose, panel);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-[var(--cor-cortina)]" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative flex h-full w-full flex-col border-l border-[var(--cor-traco)] bg-[var(--cor-superficie)] shadow-[var(--sombra-flutuante)] ${wide ? "max-w-[min(96rem,94vw)]" : "max-w-md"}`}
      >
        {bare ? null : (
          <header className="flex items-center justify-between gap-2 border-b border-[var(--cor-traco)] px-4 py-3">
            <h2 className="text-[length:var(--texto-md)] font-[var(--peso-forte)]">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Fechar painel" className="p-1">
              <X className="size-4 text-[var(--cor-tinta-fraca)]" aria-hidden="true" />
            </button>
          </header>
        )}
        <div className={`relative flex-1 overflow-y-auto ${bare ? "" : "p-4"}`}>{children}</div>
        {footer ? <footer className="border-t border-[var(--cor-traco)] p-3">{footer}</footer> : null}
      </aside>
    </div>
  );
}

/**
 * ux-flows.md — one confirmation mechanism in the whole product. `window.confirm`
 * here and a modal there is an inconsistency bug, so this component is the only
 * way a destructive action is confirmed.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  confirmDisabledReason,
  onConfirm,
  onCancel,
  footerStart,
  wide = false,
  children,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly destructive?: boolean;
  /** When set, confirming is blocked and this says why. */
  readonly confirmDisabledReason?: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  /** Ação secundária à esquerda do rodapé — usar Template, por exemplo. */
  readonly footerStart?: ReactNode;
  /** Formulários com seções pedem mais largura que uma confirmação de uma frase. */
  readonly wide?: boolean;
  readonly children?: ReactNode;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useModal(open, onCancel, dialog);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-[var(--cor-cortina)]" onClick={onCancel} aria-hidden="true" />
      <div
        ref={dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={`relative flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-[var(--raio-superficie)] border border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)] shadow-[var(--sombra-flutuante)] ${
          wide ? "max-w-lg" : "max-w-md"
        }`}
      >
        <div className="flex items-start gap-3 p-5 pb-3">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[length:var(--texto-lg)] font-[var(--peso-forte)]">
              {title}
            </h2>
            <p
              id={descriptionId}
              className="mt-1 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]"
            >
              {description}
            </p>
          </div>
          {/* Fechar no canto: sair pelo botão de cancelar é o caminho, mas o X é
              onde a mão vai primeiro, e Esc nem todo mundo tenta. */}
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fechar"
            className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--cor-superficie-2)] text-[var(--cor-tinta-fraca)] hover:bg-[var(--cor-traco)] hover:text-[var(--cor-tinta)]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {children ? <div className="relative min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div> : null}

        <div className="flex items-center justify-between gap-2 border-t border-[var(--cor-traco)] px-5 py-3">
          <span className="min-w-0">{footerStart}</span>
          <span className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              variant={destructive ? "danger" : "primary"}
              onClick={onConfirm}
              disabled={confirmDisabledReason !== undefined}
              {...(confirmDisabledReason ? { disabledReason: confirmDisabledReason } : {})}
            >
              {confirmLabel}
            </Button>
          </span>
        </div>
      </div>
    </div>
  );
}

export type ToastTone = "success" | "error" | "neutral";

export function Toast({
  tone,
  children,
  onDismiss,
}: {
  readonly tone: ToastTone;
  readonly children: ReactNode;
  readonly onDismiss?: () => void;
}) {
  const style =
    tone === "success"
      ? { color: "var(--cor-sucesso-texto)", background: "var(--cor-sucesso-fraco)", border: "var(--cor-sucesso-traco)" }
      : tone === "error"
        ? { color: "var(--cor-perigo-texto)", background: "var(--cor-perigo-fraco)", border: "var(--cor-perigo-traco)" }
        : { color: "var(--cor-tinta)", background: "var(--cor-superficie-2)", border: "var(--cor-traco)" };
  return (
    <div
      // An error must interrupt the screen reader; a success must not.
      role={tone === "error" ? "alert" : "status"}
      // Sticky: the action that produced it may live far below the fold, and a
      // toast the person cannot see is no feedback at all.
      className="sticky top-2 z-20 mb-3 flex items-start gap-2 rounded-[var(--raio-superficie)] border px-3 py-2 text-[length:var(--texto-base)] shadow-[var(--sombra-flutuante)]"
      style={{ color: style.color, background: style.background, borderColor: style.border }}
    >
      <span className="flex-1">{children}</span>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} aria-label="Dispensar aviso" className="shrink-0 opacity-60 hover:opacity-100">
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------- empty / no access */

/** §14 — says WHAT this is and WHAT the next step is. Never a blank area. */
export function EmptyState({
  title,
  hint,
  action,
}: {
  readonly title: string;
  readonly hint?: string;
  readonly action?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--raio-superficie)] border border-dashed border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)] p-6 text-center">
      <p className="text-[length:var(--texto-base)] font-[var(--peso-medio)]">{title}</p>
      {hint ? <p className="mt-1 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">{hint}</p> : null}
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </div>
  );
}

/**
 * §14 — "sem acesso" is NOT an empty state. Confusing the two leaks in both
 * directions: showing "empty" where data is hidden lies about the content, and
 * showing "no access" where nothing exists reveals that something is there.
 * The distinction has to be visual, because the shape is read before the text.
 */
export function NoAccessState({ what }: { readonly what: string }) {
  return (
    <div className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco-forte)] bg-[var(--cor-superficie-2)] p-6 text-center">
      <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">{what} · sem acesso</p>
    </div>
  );
}

/* ------------------------------------------------------------ action menu */

export function ActionMenu({
  label = "Ações",
  trigger,
  items,
}: {
  readonly label?: string;
  /**
   * O que se clica para abrir. Sem isto o gatilho é o "⋯" padrão; com isto,
   * quem chama fornece o conteúdo do botão — o avatar do Membro, por exemplo.
   * Continua sendo UM `<button>`, com o mesmo `aria-haspopup`: um menu aberto
   * por `<div>` não é alcançável pelo teclado.
   */
  readonly trigger?: ReactNode;
  readonly items: ReadonlyArray<{
    readonly label: string;
    readonly onSelect: () => void;
    readonly destructive?: boolean;
    readonly disabledReason?: string;
  }>;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDismiss(root, () => setOpen(false));

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className={
          trigger
            ? "rounded-[var(--raio-controle)]"
            : "grid size-[var(--altura-controle)] place-items-center rounded-[var(--raio-controle)] text-[var(--cor-tinta-fraca)] hover:bg-[var(--cor-superficie-2)]"
        }
      >
        {trigger ?? <span aria-hidden="true">⋯</span>}
      </button>
      {open ? (
        <ul
          role="menu"
          className="absolute right-0 z-30 mt-1 min-w-48 overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)] py-1 shadow-[var(--sombra-elevada)]"
        >
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={item.disabledReason !== undefined}
                title={item.disabledReason}
                onClick={() => {
                  item.onSelect();
                  setOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-[length:var(--texto-base)] hover:bg-[var(--cor-superficie-2)] disabled:cursor-not-allowed disabled:opacity-45"
                style={item.destructive ? { color: "var(--cor-perigo)" } : undefined}
              >
                {item.label}
                {item.disabledReason ? (
                  <span className="block text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
                    {item.disabledReason}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- avatar */

export type ActorKind = "member" | "agent" | "automation" | "integration" | "system";

const ACTOR_TOKEN: Record<
  ActorKind,
  { readonly cor: string; readonly tinta: string; readonly forma: string; readonly rotulo: string }
> = {
  member: {
    cor: "var(--cor-ator-membro)",
    tinta: "var(--cor-ator-texto)",
    forma: "rounded-full",
    rotulo: "Membro",
  },
  // B18 — an Agent acting "em nome de" a Member must never be mistaken for the
  // Member. The Agent gets a different SHAPE, not only a different colour.
  agent: {
    cor: "var(--cor-ator-agente)",
    tinta: "var(--cor-ator-texto)",
    forma: "rounded-[var(--raio-selo)]",
    rotulo: "Agente",
  },
  automation: {
    cor: "var(--cor-ator-automacao)",
    tinta: "var(--cor-ator-texto)",
    forma: "rounded-[var(--raio-selo)]",
    rotulo: "Automação",
  },
  integration: {
    cor: "var(--cor-ator-integracao)",
    tinta: "var(--cor-ator-texto)",
    forma: "rounded-[var(--raio-selo)]",
    rotulo: "Integração",
  },
  // The System fill is dark in BOTH themes, so its ink does not invert.
  system: {
    cor: "var(--cor-ator-sistema)",
    tinta: "var(--cor-ator-sistema-texto)",
    forma: "rounded-[var(--raio-selo)]",
    rotulo: "Sistema",
  },
};

export function ActorAvatar({
  kind,
  name,
  size = "normal",
  photoFileId,
}: {
  readonly kind: ActorKind;
  readonly name: string;
  readonly size?: "normal" | "grande";
  /** Retrato em `public/membros/<id>.jpg`; sem ele ficam as iniciais. */
  readonly photoFileId?: string;
}) {
  const [falhou, setFalhou] = useState(false);
  const token = ACTOR_TOKEN[kind];

  /*
   * Só o Membro ganha retrato. B18 — um Agente não pode ser confundido com a
   * pessoa em nome de quem age, e a forma diferente é o que separa os dois;
   * uma foto no Agente apagaria justamente essa diferença.
   */
  if (kind === "member" && photoFileId && !falhou) {
    const lado = size === "grande" ? 36 : 24;
    return (
      <Image
        src={`/membros/${photoFileId}.jpg`}
        alt={name}
        width={lado}
        height={lado}
        onError={() => setFalhou(true)}
        className={`shrink-0 rounded-full object-cover ${size === "grande" ? "size-9" : "size-6"}`}
      />
    );
  }
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      title={`${name} · ${token.rotulo}`}
      className={`grid shrink-0 place-items-center font-[var(--peso-medio)] ${token.forma} ${
        size === "grande" ? "size-9 text-[length:var(--texto-base)]" : "size-6 text-[length:var(--texto-xs)]"
      }`}
      style={{ background: token.cor, color: token.tinta }}
    >
      <span aria-hidden="true">{initials || "?"}</span>
      <span className="sr-only">
        {name}, {token.rotulo}
      </span>
    </span>
  );
}

/* -------------------------------------------------------- rich text editor */

/**
 * A deliberately small rich text editor: bold, italic and list, nothing more.
 * A Comment in this product is a paragraph, and every extra control is a
 * decision the writer has to make instead of writing.
 */
export function RichText({
  value,
  onChange,
  placeholder = "Escreva um comentário",
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
}) {
  const wrap = (before: string, after: string) => onChange(`${value}${before}texto${after}`);
  return (
    <div className="rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)]">
      <div className="flex items-center gap-0.5 border-b border-[var(--cor-traco)] px-1 py-1">
        <ToolbarButton label="Negrito" onClick={() => wrap("**", "**")}>
          <strong>N</strong>
        </ToolbarButton>
        <ToolbarButton label="Itálico" onClick={() => wrap("_", "_")}>
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton label="Lista" onClick={() => onChange(`${value}\n- item`)}>
          ≔
        </ToolbarButton>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full resize-y bg-transparent px-2 py-1.5 text-[length:var(--texto-base)] outline-none placeholder:text-[var(--cor-tinta-fraca)]"
      />
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-6 place-items-center rounded-[2px] text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)] hover:bg-[var(--cor-superficie-2)] hover:text-[var(--cor-tinta)]"
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------- activity timeline */

export interface ActivityEntry {
  readonly id: string;
  readonly at: string;
  readonly actorName: string;
  readonly actorKind: ActorKind;
  /** A6.2 — "em nome de", any actor kind (B18). */
  readonly delegateName?: string;
  readonly action: string;
  readonly before?: string;
  readonly after?: string;
  readonly detail?: string;
}

export function ActivityTimeline({ entries }: { readonly entries: readonly ActivityEntry[] }) {
  if (entries.length === 0) return <EmptyState title="Nenhum Registro de Atividade." />;
  return (
    <ol className="relative ml-3 border-l border-[var(--cor-traco)] pl-4">
      {entries.map((entry) => (
        <li key={entry.id} className="relative pb-3 last:pb-0">
          <span
            aria-hidden="true"
            className="absolute -left-[1.3125rem] top-1.5 size-2 rounded-full ring-2 ring-[var(--cor-papel)]"
            style={{ background: ACTOR_TOKEN[entry.actorKind].cor }}
          />
          <p className="text-[length:var(--texto-base)]">
            <span className="font-[var(--peso-medio)]">{entry.actorName}</span>
            {entry.delegateName ? (
              <span className="text-[var(--cor-tinta-fraca)]"> em nome de {entry.delegateName}</span>
            ) : null}{" "}
            {entry.action}
            {entry.before || entry.after ? (
              <span className="text-[var(--cor-tinta-fraca)]">
                {" "}
                ({entry.before ?? "—"} → {entry.after ?? "—"})
              </span>
            ) : null}
          </p>
          <p className="text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
            {entry.at}
            {entry.detail ? ` · ${entry.detail}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

/* --------------------------------------------------- status / stage pickers */

export type StatusCategory = "naoIniciado" | "emAndamento" | "concluido" | "fechado";

export const CATEGORY_COLOR: Record<StatusCategory, string> = {
  naoIniciado: "var(--cor-cat-nao-iniciado)",
  emAndamento: "var(--cor-cat-em-andamento)",
  concluido: "var(--cor-cat-concluido)",
  fechado: "var(--cor-cat-fechado)",
};

export const CATEGORY_LABEL: Record<StatusCategory, string> = {
  naoIniciado: "não iniciado",
  emAndamento: "em andamento",
  concluido: "concluído",
  fechado: "fechado",
};

/**
 * A4.3 — the CATEGORY decides the closing, not the name, so the picker groups
 * by category and never hides it. §10 — a terminal status the List already
 * reproves comes disabled WITH the reason, computed from data already on
 * screen; it does not wait for the click to fail.
 */
export function StatusPicker({
  options,
  value,
  onChange,
  terminalBlockReason,
  readOnly = false,
  readOnlyReason,
  optionBlockReason,
}: {
  readonly options: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly category: StatusCategory;
    readonly color: string;
  }>;
  readonly value: string;
  readonly onChange: (id: string) => void;
  readonly terminalBlockReason?: string;
  readonly readOnly?: boolean;
  readonly readOnlyReason?: string;
  /** Por opção: por que ESTA não pode ser escolhida agora (requisito de saída, quem pode entrar). */
  readonly optionBlockReason?: (optionId: string) => string | undefined;
}) {
  const isTerminal = (category: StatusCategory) => category === "concluido" || category === "fechado";
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const porOpcao = optionBlockReason?.(option.id);
        const blocked = (isTerminal(option.category) && terminalBlockReason !== undefined) || porOpcao !== undefined;
        const disabled = readOnly || blocked;
        const current = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={disabled || current ? undefined : () => onChange(option.id)}
            // Never `disabled`: a natively disabled button takes no focus, and
            // the `aria-pressed` that marks the selection would never be
            // announced. The current option stays reachable and inert.
            aria-disabled={disabled || current}
            aria-pressed={current}
            title={readOnly ? readOnlyReason : porOpcao ?? (blocked ? terminalBlockReason : undefined)}
            className={`inline-flex h-[var(--altura-controle)] items-center gap-1.5 rounded-[var(--raio-controle)] border px-2.5 text-[length:var(--texto-base)] transition-colors ${
              current
                ? "border-[var(--cor-acento)] bg-[var(--cor-acento)] text-[var(--cor-acento-texto)]"
                : disabled
                  ? "border-[var(--cor-traco)] bg-[var(--cor-superficie-2)] text-[var(--cor-tinta-fraca)]"
                  : "border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)] hover:bg-[var(--cor-superficie-2)]"
            }`}
          >
            {!current ? (
              <span aria-hidden="true" className="size-2 rounded-full" style={{ background: option.color }} />
            ) : null}
            {option.name}
            <span className={current ? "opacity-70" : "text-[var(--cor-tinta-fraca)]"}>
              · {CATEGORY_LABEL[option.category]}
            </span>
          </button>
        );
      })}
    </div>
  );
}


/* ------------------------------------------------------------------ hooks */

function useDismiss(ref: React.RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, close]);
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * `aria-modal="true"` promises the screen reader that everything outside is
 * unreachable. Without focus management that promise is a lie: the caret walks
 * straight out of the dialog into the page behind it.
 *
 * So this moves focus in on open, keeps Tab inside, and gives focus back to
 * whatever opened it — plus Escape to close.
 */
// Stacked modals (a confirm over a side panel): only the top one answers
// Escape and Tab, otherwise one key press closes both.
const openModals: symbol[] = [];

function useModal(active: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    const opener = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusables = () => Array.from(node?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const first = focusables()[0];
    if (first) first.focus();
    else node?.focus();
    const token = Symbol("modal");
    openModals.push(token);

    const onKey = (event: KeyboardEvent) => {
      if (openModals.at(-1) !== token) return;
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      openModals.splice(openModals.indexOf(token), 1);
      opener?.focus();
    };
  }, [active, close, ref]);
}

/**
 * Arrow-key navigation for a popup list.
 *
 * The handler is returned and attached to the TRIGGER, not to `document`:
 * focus stays on the trigger (that is what `aria-activedescendant` is for), so
 * a global listener would be both unnecessary and a source of unstable effect
 * dependencies.
 */
function useListKeys(
  open: boolean,
  count: number,
  onChoose: (index: number) => void,
): {
  readonly activeIndex: number;
  readonly setActiveIndex: (index: number) => void;
  readonly onKeyDown: (event: React.KeyboardEvent) => void;
} {
  // Derived during render: an effect that only mirrors `open` into state would
  // cause a cascading render for nothing.
  const [highlight, setHighlight] = useState({ forOpen: false, index: 0 });
  const activeIndex = highlight.forOpen === open ? highlight.index : 0;
  const put = (index: number) => setHighlight({ forOpen: open, index });

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      put(count === 0 ? 0 : (activeIndex + 1) % count);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      put(count === 0 ? 0 : (activeIndex - 1 + count) % count);
    } else if (event.key === "Home") {
      event.preventDefault();
      put(0);
    } else if (event.key === "End") {
      event.preventDefault();
      put(Math.max(0, count - 1));
    } else if (event.key === "Enter" || event.key === " ") {
      if (count === 0) return;
      event.preventDefault();
      onChoose(activeIndex);
    }
  };

  return { activeIndex, setActiveIndex: put, onKeyDown };
}


/* ------------------------------------------------------------------ toggle */

/**
 * Interruptor. É um `<button role="switch">`, não uma caixa de seleção: a caixa
 * diz "vou marcar isto ao salvar", o interruptor diz "isto muda agora". Onde a
 * escolha só vale depois de confirmar, use `Checkbox`.
 *
 * O rótulo e a explicação ficam do lado de fora, ligados por `aria-labelledby`
 * e `aria-describedby`, porque um interruptor sem nome só é compreensível para
 * quem enxerga o texto ao lado.
 */
export function Toggle({
  checked,
  onChange,
  labelledBy,
  describedBy,
  disabled,
}: {
  readonly checked: boolean;
  readonly onChange: (next: boolean) => void;
  readonly labelledBy: string;
  readonly describedBy?: string;
  readonly disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      {...(describedBy ? { "aria-describedby": describedBy } : {})}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
        checked ? "bg-[var(--cor-acento)]" : "bg-[var(--cor-traco-forte)]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block size-4 rounded-full bg-[var(--cor-superficie)] shadow-[var(--sombra-elevada)] transition-transform ${
          checked ? "translate-x-[1.125rem]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}


/* ------------------------------------------------------- linha de ajuste */

/**
 * Uma configuração que se lê fechada e se ajusta aberta: título, o valor
 * vigente por extenso, e o conteúdo que aparece ao expandir.
 *
 * Existe porque um formulário de criação precisa mostrar o que vai acontecer
 * por padrão sem obrigar ninguém a decidir — quem só quer o padrão lê a linha e
 * segue; quem quer mudar, abre.
 */
export function SettingRow({
  icon,
  title,
  value,
  children,
}: {
  readonly icon?: ReactNode;
  readonly title: string;
  readonly value: string;
  readonly children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie-2)]">
      <button
        type="button"
        onClick={() => children && setOpen((current) => !current)}
        aria-expanded={children ? open : undefined}
        aria-controls={children ? panelId : undefined}
        disabled={!children}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left disabled:cursor-default"
      >
        {icon ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-[var(--raio-controle)] bg-[var(--cor-superficie)] text-[var(--cor-tinta-fraca)]">
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block text-[length:var(--texto-base)] text-[var(--cor-tinta)]">{title}</span>
          <span className="block truncate text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
            {value}
          </span>
        </span>
        {children ? (
          <ChevronDown
            className={`size-4 shrink-0 text-[var(--cor-tinta-fraca)] transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        ) : null}
      </button>
      {children && open ? (
        <div id={panelId} className="border-t border-[var(--cor-traco)] px-3 py-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------- painéis de ficha */

/**
 * Bloco de uma ficha em três colunas: um título curto e o conteúdo.
 *
 * Vive aqui porque a ficha do Contato, a do Negócio e a da Empresa têm o mesmo
 * esqueleto — e o mesmo bloco copiado em três telas diverge no dia em que
 * alguém ajusta o espaçamento de uma só.
 */
export function RecordPanel({
  title,
  icon,
  count,
  action,
  defaultOpen = true,
  children,
}: {
  readonly title: string;
  /** O ícone identifica a caixa antes de a pessoa ler o título. */
  readonly icon?: ReactNode;
  readonly count?: number;
  readonly action?: ReactNode;
  /** Caixa auxiliar começa fechada; a principal, aberta. */
  readonly defaultOpen?: boolean;
  readonly children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <section className="min-w-0 rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
      <div className="flex items-center gap-2 pr-2">
        <h2 className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setOpen((atual) => !atual)}
            aria-expanded={open}
            aria-controls={bodyId}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
          >
            {icon ? <span className="shrink-0 text-[var(--cor-acento)]">{icon}</span> : null}
            <span className="min-w-0 flex-1 truncate font-[var(--peso-medio)] text-[var(--cor-tinta)]">
              {title}
              {count !== undefined ? (
                <span className="text-[var(--cor-tinta-fraca)]"> ({count})</span>
              ) : null}
            </span>
            {open ? (
              <ChevronUp className="size-4 shrink-0 text-[var(--cor-tinta-fraca)]" aria-hidden="true" />
            ) : (
              <ChevronDown
                className="size-4 shrink-0 text-[var(--cor-tinta-fraca)]"
                aria-hidden="true"
              />
            )}
          </button>
        </h2>
        {/*
          A ação fica FORA do botão que abre e fecha: um link dentro de um botão
          não é clicável de forma confiável, e recolher a caixa ao tentar abrir
          o Funil seria o oposto do que a pessoa pediu.
        */}
        {action ? <span className="shrink-0">{action}</span> : null}
      </div>
      {open ? (
        <div id={bodyId} className="border-t border-[var(--cor-traco)] px-3 py-3">
          {children}
        </div>
      ) : null}
    </section>
  );
}

/** Uma linha rótulo→valor dentro de um `RecordPanel`. */
export function RecordRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="shrink-0 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">{label}</dt>
      <dd className="min-w-0 truncate text-right text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
        {children}
      </dd>
    </div>
  );
}
