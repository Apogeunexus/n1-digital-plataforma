"use client";

/**
 * O cartão do Contato: identidade, ações rápidas, dados, resumo e tags.
 *
 * É o mesmo bloco na ficha do Contato e na ficha do Negócio — o Negócio mostra
 * o Contato principal, e mostrar a mesma pessoa de dois jeitos diferentes seria
 * pedir para as duas telas divergirem.
 *
 * Cada linha de "Dados de contato" é um Identificador, e o ÍCONE é o tipo: o
 * rótulo escrito ("Identidade de WhatsApp") ocupa a largura toda e não diz
 * nada que o ícone já não diga. O rótulo continua existindo para quem lê por
 * leitor de tela.
 */

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  Flame,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Sparkles,
  Star,
  StickyNote,
  Tag,
  User,
} from "lucide-react";
import { useData, useRun } from "@/data/store";
import { contactDisplayName, contactDisplayRole, principalCompanyId } from "@/data/derive";
import { CHANNEL_CAPABILITIES, setContactCatalogValue } from "@/data/operations";
import { IDENTIFIER_TYPE_LABEL } from "@/features/shell/format";
import { RecordPanel, Select } from "@/features/shell/ui";
import { InstagramIcon, LinkedinIcon, TikTokIcon } from "@/features/crm/brand-icons";
import type { ChannelType, Contact, ContactIdentifierType } from "@/data/types";


type Icone = (props: { readonly className?: string }) => ReactNode;

const ICONE_DO_IDENTIFICADOR: Record<ContactIdentifierType, Icone> = {
  telefone: Phone,
  email: Mail,
  identidadeDeWhatsApp: MessageCircle,
  usuarioDeInstagram: InstagramIcon,
  identificadorDeChatDoSite: Globe,
  perfilDeLinkedIn: LinkedinIcon,
  perfilDeTikTok: TikTokIcon,
};

/** A ordem em que a pessoa procura: primeiro por onde se fala, depois onde ela existe. */
const ORDEM: readonly ContactIdentifierType[] = [
  "telefone",
  "email",
  "identidadeDeWhatsApp",
  "usuarioDeInstagram",
  "perfilDeLinkedIn",
  "perfilDeTikTok",
  "identificadorDeChatDoSite",
];

/**
 * O rosto do Contato. Enquanto não há arquivo de foto, são as iniciais no
 * gradiente da marca — e é o mesmo desenho na ficha e em cada Mensagem
 * recebida, porque a mesma pessoa não pode aparecer de dois jeitos.
 */
export function ContactAvatar({
  contact,
  size = "normal",
}: {
  readonly contact: Contact;
  readonly size?: "normal" | "grande";
}) {
  /*
   * A foto some se o arquivo não estiver lá, e as iniciais assumem. Um retrato
   * quebrado é pior que iniciais: mostra que falta alguma coisa sem dizer o
   * quê, e aparece em cada Mensagem da conversa.
   */
  const [falhou, setFalhou] = useState(false);
  const nome = contactDisplayName(contact);
  const iniciais = nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
  const lado = size === "grande" ? 64 : 28;

  if (contact.photoFileId && !falhou) {
    return (
      <Image
        src={`/contatos/${contact.photoFileId}.jpg`}
        alt={nome}
        width={lado}
        height={lado}
        onError={() => setFalhou(true)}
        className={`shrink-0 rounded-full object-cover ${
          size === "grande" ? "size-16" : "size-7"
        }`}
      />
    );
  }

  return (
    <span
      title={nome}
      className={`grid shrink-0 place-items-center rounded-full font-[var(--peso-forte)] text-[var(--cor-gradiente-texto)] ${
        size === "grande"
          ? "size-16 text-[length:var(--texto-lg)]"
          : "size-7 text-[length:var(--texto-xs)]"
      }`}
      style={{ background: "var(--gradiente-marca)" }}
    >
      <span aria-hidden="true">{iniciais || "?"}</span>
      <span className="sr-only">{nome}</span>
    </span>
  );
}

/* -------------------------------------------------------------- identidade */

export function ContactIdentity({
  contact,
  editavel = true,
  abaixo,
}: {
  readonly contact: Contact;
  readonly editavel?: boolean;
  /** Controle da tela que vem logo abaixo da Qualificação e da Temperatura. */
  readonly abaixo?: ReactNode;
}) {
  const state = useData((data) => data);
  const run = useRun();
  const [erro, setErro] = useState<string | null>(null);
  const [agora] = useState(() => Date.now());

  const empresaId = principalCompanyId(state, contact.id);
  const empresa = state.companies.find((c) => c.id === empresaId);
  const qualificacoes = state.catalog.filter(
    (c) => c.kind === "qualificacao" && c.lifecycle === "ativo",
  );
  const temperaturas = state.catalog.filter(
    (c) => c.kind === "temperatura" && c.lifecycle === "ativo",
  );
  const temperatura = state.catalog.find((c) => c.id === contact.temperatureId);

  /*
   * O ponto verde não é presença: ninguém aqui sabe se a pessoa está online. Ele
   * diz que existe Canal com a JANELA DE RESPOSTA aberta — a única coisa que
   * realmente muda o que dá para fazer agora.
   */
  const alcancavel = state.conversations.some((conversa) => {
    if (conversa.contactId !== contact.id || conversa.lifecycle !== "ativo") return false;
    const tipo = state.channels.find((ch) => ch.id === conversa.channelId)?.channelType;
    if (!tipo) return false;
    const horas = CHANNEL_CAPABILITIES[tipo].responseWindowHours;
    if (horas === undefined) return true;
    const ultimaRecebida = [...conversa.messages]
      .filter((m) => m.direction === "recebida")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .at(-1);
    if (!ultimaRecebida) return false;
    return agora - Date.parse(ultimaRecebida.createdAt) <= horas * 3_600_000;
  });

  const definir = (kind: "qualificacao" | "temperatura", valor: string) => {
    const resultado = run((data, memberId) =>
      setContactCatalogValue(data, memberId, contact.id, kind, valor === "" ? undefined : valor),
    );
    setErro(resultado.ok ? null : resultado.error);
  };

  return (
    <div className="min-w-0">
      <div className="flex items-start gap-3">
        <span className="relative shrink-0">
          <ContactAvatar contact={contact} size="grande" />
          {alcancavel ? (
            <span
              title="Há Canal com a janela de resposta aberta."
              className="absolute bottom-0.5 right-0.5 size-3.5 rounded-full border-2 border-[var(--cor-papel)] bg-[var(--cor-sucesso)]"
            >
              <span className="sr-only">Janela de resposta aberta</span>
            </span>
          ) : null}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="min-w-0 truncate text-[length:var(--texto-lg)] font-[var(--peso-forte)] text-[var(--cor-tinta)]">
              {contactDisplayName(contact)}
            </span>
            <Star className="size-4 shrink-0 text-[var(--cor-tinta-fraca)]" aria-hidden="true" />
          </span>
          <span className="block truncate text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
            {contactDisplayRole(state, contact.id) || "sem cargo"}
          </span>
          {empresa ? (
            <Link
              href={`/crm/empresas/${empresa.id}`}
              className="block truncate text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)] hover:underline"
            >
              {empresa.tradeName || empresa.legalName}
            </Link>
          ) : null}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <span className="min-w-0">
          <label className="sr-only" htmlFor={`qualificacao-${contact.id}`}>
            Qualificação
          </label>
          <Select
            id={`qualificacao-${contact.id}`}
            value={contact.qualificationId ?? ""}
            onChange={(valor) => definir("qualificacao", valor)}
            disabled={!editavel}
            placeholder="Sem Qualificação"
            options={qualificacoes.map((item) => ({ value: item.id, label: item.name }))}
          />
        </span>
        <span className="min-w-0">
          <label className="sr-only" htmlFor={`temperatura-${contact.id}`}>
            Temperatura
          </label>
          <span
            className="block rounded-[var(--raio-controle)]"
            style={
              temperatura?.color
                ? {
                    background: `color-mix(in srgb, ${temperatura.color} 18%, transparent)`,
                    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${temperatura.color} 45%, transparent)`,
                  }
                : undefined
            }
          >
            <span className="flex items-center gap-1.5 pl-2">
              <Flame
                className="size-4 shrink-0"
                style={{ color: temperatura?.color ?? "var(--cor-tinta-fraca)" }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <Select
                  id={`temperatura-${contact.id}`}
                  value={contact.temperatureId ?? ""}
                  onChange={(valor) => definir("temperatura", valor)}
                  disabled={!editavel}
                  placeholder="Sem Temperatura"
                  options={temperaturas.map((item) => ({ value: item.id, label: item.name }))}
                />
              </span>
            </span>
          </span>
        </span>
      </div>

      {abaixo ? <div className="mt-2">{abaixo}</div> : null}

      {erro ? (
        <p role="alert" className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-perigo-texto)]">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------- ações rápidas */

export function ContactQuickActions({
  contact,
  onCanal,
  onNota,
}: {
  readonly contact: Contact;
  /** Leva à aba do Canal na conversa; ausente quando a tela não tem conversa. */
  readonly onCanal?: (canal: ChannelType) => void;
  readonly onNota?: () => void;
}) {
  const acoes: Array<{
    readonly chave: string;
    readonly rotulo: string;
    readonly icone: ReactNode;
    readonly href?: string;
    readonly onClick?: () => void;
    readonly indisponivel?: string;
  }> = [];

  const porTipo = (tipo: ContactIdentifierType) =>
    contact.identifiers.find((i) => i.type === tipo);

  const telefone = porTipo("telefone") ?? porTipo("identidadeDeWhatsApp");
  acoes.push({
    chave: "ligar",
    rotulo: "Ligar",
    icone: <Phone className="size-5" aria-hidden="true" />,
    ...(telefone
      ? { href: `tel:${telefone.value}` }
      : { indisponivel: "Este Contato não tem telefone." }),
  });

  const whatsapp = porTipo("identidadeDeWhatsApp");
  acoes.push({
    chave: "whatsapp",
    rotulo: "WhatsApp",
    icone: <MessageCircle className="size-5" aria-hidden="true" />,
    ...(whatsapp && onCanal
      ? { onClick: () => onCanal("whatsapp") }
      : { indisponivel: "Este Contato não tem WhatsApp." }),
  });

  const email = porTipo("email");
  acoes.push({
    chave: "email",
    rotulo: "E-mail",
    icone: <Mail className="size-5" aria-hidden="true" />,
    ...(email && onCanal
      ? { onClick: () => onCanal("email") }
      : { indisponivel: "Este Contato não tem e-mail." }),
  });

  const linkedin = porTipo("perfilDeLinkedIn");
  acoes.push({
    chave: "linkedin",
    rotulo: "LinkedIn",
    icone: <LinkedinIcon className="size-5" aria-hidden="true" />,
    // LinkedIn não é Canal: abre o perfil, não uma Conversa.
    ...(linkedin
      ? { href: `https://${linkedin.value.replace(/^https?:\/\//, "")}` }
      : { indisponivel: "Este Contato não tem perfil de LinkedIn." }),
  });

  acoes.push({
    chave: "nota",
    rotulo: "Nota",
    icone: <StickyNote className="size-5" aria-hidden="true" />,
    ...(onNota ? { onClick: onNota } : { href: `/crm/contatos/${contact.id}` }),
  });

  acoes.push({
    chave: "tarefa",
    rotulo: "Tarefa",
    icone: <Sparkles className="size-5" aria-hidden="true" />,
    href: "/estrutura/tarefas",
  });

  return (
    <ul className="grid grid-cols-6 gap-1">
      {acoes.map((acao) => {
        const conteudo = (
          <>
            <span
              className={`grid size-11 place-items-center rounded-full border border-[var(--cor-traco-forte)] ${
                acao.indisponivel
                  ? "text-[var(--cor-tinta-fraca)] opacity-45"
                  : "text-[var(--cor-acento)] hover:border-[var(--cor-acento)] hover:bg-[var(--cor-superficie-2)]"
              }`}
            >
              {acao.icone}
            </span>
            <span className="block truncate text-center text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
              {acao.rotulo}
            </span>
          </>
        );
        return (
          <li key={acao.chave} className="grid justify-items-center gap-1">
            {acao.indisponivel ? (
              <span title={acao.indisponivel} className="grid justify-items-center gap-1">
                {conteudo}
                <span className="sr-only">{acao.indisponivel}</span>
              </span>
            ) : acao.href ? (
              <a
                href={acao.href}
                {...(acao.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                className="grid justify-items-center gap-1"
              >
                {conteudo}
              </a>
            ) : (
              <button type="button" onClick={acao.onClick} className="grid justify-items-center gap-1">
                {conteudo}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------------------------------------------------- dados, resumo */

export function ContactDataPanel({
  contact,
  acao,
  onTransferir,
}: {
  readonly contact: Contact;
  readonly acao?: ReactNode;
  /** Transferir o Identificador para outro Contato (RN-CON-11). */
  readonly onTransferir?: (identifierId: string) => void;
}) {
  const state = useData((data) => data);
  const endereco = contact.addresses.find((a) => a.principal) ?? contact.addresses[0];
  const proprietario = state.members.find((m) => m.id === contact.ownerMemberId);
  const identificadores = [...contact.identifiers].sort(
    (a, b) => ORDEM.indexOf(a.type) - ORDEM.indexOf(b.type),
  );

  return (
    <RecordPanel title="Dados de contato" icon={<Star className="size-4" aria-hidden="true" />}>
      <ul className="grid gap-2">
        {identificadores.map((identificador) => {
          const Icone = ICONE_DO_IDENTIFICADOR[identificador.type];
          const rotulo = IDENTIFIER_TYPE_LABEL[identificador.type] ?? identificador.type;
          const externo =
            identificador.type === "perfilDeLinkedIn"
              ? `https://${identificador.value.replace(/^https?:\/\//, "")}`
              : identificador.type === "usuarioDeInstagram"
                ? `https://instagram.com/${identificador.value.replace(/^@/, "")}`
                : undefined;
          const valor = (
            <span className="identificador min-w-0 flex-1 truncate">
              {identificador.displayValue}
            </span>
          );
          return (
            <li key={identificador.id} className="flex min-w-0 items-center gap-2.5">
              <Icone className="size-4 shrink-0 text-[var(--cor-acento)]" aria-hidden="true" />
              <span className="sr-only">{rotulo}:</span>
              {externo ? (
                <a
                  href={externo}
                  target="_blank"
                  rel="noreferrer"
                  className="identificador min-w-0 flex-1 truncate text-[var(--cor-acento)] hover:underline"
                >
                  {identificador.displayValue}
                </a>
              ) : (
                <span className="min-w-0 flex-1 truncate text-[var(--cor-tinta)]">{valor}</span>
              )}
              {onTransferir ? (
                <button
                  type="button"
                  onClick={() => onTransferir(identificador.id)}
                  title={`Transferir ${rotulo} para outro Contato`}
                  className="shrink-0 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)] hover:text-[var(--cor-tinta)] hover:underline"
                >
                  Transferir
                </button>
              ) : null}
            </li>
          );
        })}

        {endereco ? (
          <li className="flex min-w-0 items-center gap-2.5">
            <MapPin className="size-4 shrink-0 text-[var(--cor-acento)]" aria-hidden="true" />
            <span className="sr-only">Endereço:</span>
            <span className="min-w-0 flex-1 truncate text-[var(--cor-tinta)]">
              {[endereco.city, endereco.region].filter(Boolean).join(", ")}
            </span>
          </li>
        ) : null}

        <li className="flex min-w-0 items-center gap-2.5">
          <User className="size-4 shrink-0 text-[var(--cor-acento)]" aria-hidden="true" />
          <span className="sr-only">Proprietário:</span>
          <span className="min-w-0 flex-1 truncate text-[var(--cor-tinta)]">
            {proprietario?.displayName ?? "—"}
          </span>
        </li>
      </ul>
      {acao}
    </RecordPanel>
  );
}

export function ContactSummary({ contact }: { readonly contact: Contact }) {
  const resumo = contact.fieldValues.find((v) => v.definitionId === "fd_resumo_perfil")?.value;
  return (
    <RecordPanel title="Resumo do contato" icon={<Sparkles className="size-4" aria-hidden="true" />}>
      <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
        {typeof resumo === "string" && resumo.trim() !== ""
          ? resumo
          : "Ainda sem resumo. O Agente Enriquecedor escreve este campo quando analisa o perfil público."}
      </p>
    </RecordPanel>
  );
}

export function ContactTags({
  contact,
  acao,
}: {
  readonly contact: Contact;
  readonly acao?: ReactNode;
}) {
  const state = useData((data) => data);
  return (
    <RecordPanel title="Tags e interesses" icon={<Tag className="size-4" aria-hidden="true" />}>
      <ul className="flex flex-wrap items-center gap-1.5">
        {contact.tagIds.length === 0 ? (
          <li className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
            Nenhuma Tag.
          </li>
        ) : (
          contact.tagIds.map((tagId) => {
            const tag = state.tags.find((t) => t.id === tagId);
            return (
              <li
                key={tagId}
                className="rounded-full px-2.5 py-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta)]"
                style={{
                  background: `color-mix(in srgb, ${tag?.color ?? "var(--cor-traco)"} 20%, transparent)`,
                }}
              >
                {tag?.name ?? tagId}
              </li>
            );
          })
        )}
        {acao ? <li>{acao}</li> : null}
      </ul>
    </RecordPanel>
  );
}

export { Plus as IconePlus };
