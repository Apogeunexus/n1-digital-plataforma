"use client";

/**
 * A call do Closer, enquanto ela acontece.
 *
 * Não existe entidade Reunião: isto é uma Tarefa de Tipo Reunião ligada ao
 * Negócio por Vínculo (D8 deixou Evento de calendário como decisão futura).
 * Tudo que a coluna da direita mostra é leitura desse Negócio e do Contato
 * principal dele — nada aqui é digitado duas vezes.
 *
 * O vídeo NÃO existe: o protótipo não tem mídia nem servidor. O palco diz isso
 * em vez de fingir uma chamada, porque uma imagem parada no lugar do vídeo faz
 * quem demonstra prometer o que o produto ainda não faz.
 */

import Image from "next/image";
import Link from "next/link";
import { use, useState, useSyncExternalStore } from "react";
import {
  Clock,
  Mic,
  MonitorUp,
  MoreHorizontal,
  PhoneOff,
  ScrollText,
  Share2,
  User,
  Users,
  Video,
} from "lucide-react";
import { useData, useRun, useSession } from "@/data/store";
import {
  actorLabel,
  contactDisplayName,
  contactDisplayRole,
  newestFirst,
  statusCategory,
} from "@/data/derive";
import { addContactNote, endMeeting, startMeeting } from "@/data/operations";
import { ContactAvatar } from "@/features/crm/contact-card";
import {
  InstagramIcon,
  LinkedinIcon,
  TikTokIcon,
} from "@/features/crm/brand-icons";
import { IDENTIFIER_TYPE_LABEL } from "@/features/shell/format";
import { useFormat } from "@/features/shell/use-format";
import {
  ActivityTimeline,
  ActorAvatar,
  Button,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  RecordPanel,
  RecordRow,
  Toast,
} from "@/features/shell/ui";

/**
 * O relógio é estado EXTERNO ao React, não estado da tela: por isso é lido por
 * `useSyncExternalStore` em vez de um efeito que chama `setState`.
 *
 * O instantâneo é arredondado ao segundo para ser estável entre renderizações
 * dentro do mesmo segundo — sem isso, cada renderização devolveria um número
 * diferente e o React entraria em laço. No servidor devolve `null`, porque
 * `Date.now()` no HTML do servidor não bate com o do navegador.
 */
/** A linha do tempo abre curta: na call, o que importa é o topo dela. */
const ATIVIDADES_POR_VEZ = 6;

function useRelogio(): number | null {
  return useSyncExternalStore(
    (aoMudar) => {
      const id = window.setInterval(aoMudar, 1000);
      return () => window.clearInterval(id);
    },
    () => Math.floor(Date.now() / 1000) * 1000,
    () => null,
  );
}

/** hh:mm:ss desde o início do Apontamento aberto. */
function duracao(desde: number, agora: number): string {
  const total = Math.max(0, Math.floor((agora - desde) / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function ReuniaoPage({
  params,
}: {
  params: Promise<{ reuniao: string }>;
}) {
  const { reuniao } = use(params);
  const state = useData((data) => data);
  const { memberId } = useSession();
  const run = useRun();
  const fmt = useFormat();
  const [nota, setNota] = useState("");

  const [encerrando, setEncerrando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atividadesVisiveis, setAtividadesVisiveis] =
    useState(ATIVIDADES_POR_VEZ);

  const task = state.tasks.find((t) => t.id === reuniao);

  const agora = useRelogio();

  if (!task) {
    return (
      <>
        <PageHeader title="Reunião não encontrada" />
        <div className="p-6">
          <EmptyState
            title="Esta Reunião não existe."
            hint="Ela pode ter sido eliminada, ou você não tem permissão para vê-la."
          />
        </div>
      </>
    );
  }

  const vinculo = state.links.find(
    (l) =>
      (l.fromId === task.id && l.toType === "deal") ||
      (l.toId === task.id && l.fromType === "deal"),
  );
  const deal = state.deals.find(
    (d) =>
      d.id === (vinculo?.fromId === task.id ? vinculo.toId : vinculo?.fromId),
  );
  const principalLink =
    deal?.contactLinks.find((l) => l.principal) ?? deal?.contactLinks[0];
  const contato = state.contacts.find((c) => c.id === principalLink?.contactId);
  const diagnostico = deal?.fieldValues.find(
    (v) => v.definitionId === "fd_diagnostico",
  )?.value;

  /**
   * Tudo que já aconteceu com este lead — o Negócio, o Contato e esta Reunião —
   * do mais recente para o mais antigo. O Closer entra numa conversa que o SDR
   * começou: sem esta lista ele teria que sair da call para saber o que foi
   * dito antes dela.
   */
  const atividadesDoLead = newestFirst(
    state.activity.filter(
      (registro) =>
        registro.objectId === deal?.id ||
        registro.objectId === contato?.id ||
        registro.objectId === task.id,
    ),
  );

  /** O roteiro do Funil do Negócio, na ordem do processo. */
  const camposDoRoteiro = [
    "fd_criterio_fit",
    "fd_criterio",
    "fd_dor",
    "fd_decisor",
    "fd_orcamento",
    "fd_prazo",
  ]
    .map((id) => state.fieldDefinitions.find((d) => d.id === id))
    .filter((definicao) => definicao !== undefined);

  /*
   * Rede social é PERFIL PÚBLICO, que se abre e se lê antes da call. WhatsApp
   * e e-mail ficam de fora de propósito: são endereço de envio, e tratá-los
   * como rede social misturaria "onde ver a pessoa" com "por onde falar".
   */
  const perfis = (contato?.identifiers ?? [])
    .map((identificador) => {
      if (identificador.type === "usuarioDeInstagram") {
        return {
          identificador,
          rotulo: "Instagram",
          href: `https://instagram.com/${identificador.value.replace(/^@/, "")}`,
          Icone: InstagramIcon,
        };
      }
      if (identificador.type === "perfilDeLinkedIn") {
        return {
          identificador,
          rotulo: "LinkedIn",
          href: `https://${identificador.value.replace(/^https?:\/\//, "")}`,
          Icone: LinkedinIcon,
        };
      }
      if (identificador.type === "perfilDeTikTok") {
        return {
          identificador,
          rotulo: "TikTok",
          href: `https://tiktok.com/${identificador.value.startsWith("@") ? identificador.value : `@${identificador.value}`}`,
          Icone: TikTokIcon,
        };
      }
      return undefined;
    })
    .filter((perfil) => perfil !== undefined);
  const company = deal?.companyId
    ? state.companies.find((c) => c.id === deal.companyId)
    : undefined;
  const eu = state.members.find((m) => m.id === memberId);
  const funnel = deal
    ? state.funnels.find((f) => f.id === deal.funnelId)
    : undefined;
  const stage = funnel?.stages.find((s) => s.id === deal?.stageId);
  const temperatura = contato
    ? state.catalog.find((c) => c.id === contato.temperatureId)
    : undefined;

  const emAndamento = statusCategory(state, task) === "emAndamento";
  const apontamento = [...task.timeEntries]
    .reverse()
    .find((e) => e.end === undefined);
  const encerrada = statusCategory(state, task) === "concluido";

  const proximas = state.tasks
    .filter((t) => t.id !== task.id && t.lifecycle === "ativo")
    .filter((t) =>
      t.assignees.some(
        (a) => a.kind === "member" && a.id === deal?.ownerMemberId,
      ),
    )
    .filter((t) => statusCategory(state, t) !== "concluido")
    .sort((a, b) =>
      String(a.dueDate?.value ?? "9").localeCompare(
        String(b.dueDate?.value ?? "9"),
      ),
    )
    ;

  /** Só as três mais próximas cabem na barra; o total fica dito no rodapé. */
  const proximasVisiveis = proximas.slice(0, 3);

  const reportar = (
    resultado: { ok: boolean; error?: string },
    mensagem: string,
  ) => {
    if (resultado.ok) {
      setErro(null);
      setAviso(mensagem);
    } else {
      setAviso(null);
      setErro(resultado.error ?? "Não foi possível concluir a operação.");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {aviso ? (
        <Toast tone="success" onDismiss={() => setAviso(null)}>
          {aviso}
        </Toast>
      ) : null}
      {erro ? (
        <Toast tone="error" onDismiss={() => setErro(null)}>
          {erro}
        </Toast>
      ) : null}

      <ConfirmDialog
        open={encerrando}
        title="Encerrar a reunião?"
        description="A Tarefa da Reunião é concluída e o tempo é gravado como Apontamento. É esse evento que move o Negócio da Call para a Proposta."
        confirmLabel="Encerrar reunião"
        destructive
        onConfirm={() => {
          reportar(
            run((data, id) => endMeeting(data, id, task.id)),
            "Reunião encerrada e tempo apontado.",
          );
          setEncerrando(false);
        }}
        onCancel={() => setEncerrando(false)}
      />

      <div className="grid min-h-0 flex-1 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ── o palco ── */}
        <div className="flex min-w-0 flex-col gap-3 xl:min-h-0">
          <div className="relative grid min-h-0 flex-1 place-items-center overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco)] bg-[var(--cor-superficie)]">
            {contato ? (
              <>
                {/*
                  A moldura é a real; o vídeo ainda não existe, e o lugar dele é
                  ocupado pelo retrato do Contato. Quem é a pessoa está dito no
                  bloco "Detalhes do cliente", ao lado — repetir sobre a imagem
                  só cobriria o rosto.
                */}
                <span className="absolute inset-0 grid place-items-center overflow-hidden bg-[var(--cor-papel)]">
                  {contato.photoFileId ? (
                    <Image
                      src={`/contatos/${contato.photoFileId}.jpg`}
                      alt={contactDisplayName(contato)}
                      fill
                      sizes="70vw"
                      className="object-cover opacity-90"
                    />
                  ) : (
                    <ContactAvatar contact={contato} size="grande" />
                  )}
                </span>
              </>
            ) : (
              <EmptyState
                title="Esta Reunião não tem Contato."
                hint="Sem Contato vinculado ao Negócio não há com quem falar."
              />
            )}

            {/* quem está conduzindo, no canto */}
            <span className="absolute right-3 top-3 w-44 overflow-hidden rounded-[var(--raio-superficie)] border border-[var(--cor-traco-forte)] bg-[var(--cor-papel)]">
              <span className="relative block aspect-video">
                {eu?.photoFileId ? (
                  <Image
                    src={`/membros/${eu.photoFileId}.jpg`}
                    alt={eu.displayName}
                    fill
                    sizes="176px"
                    className="object-cover"
                  />
                ) : (
                  <span className="grid h-full place-items-center">
                    <ActorAvatar
                      kind="member"
                      name={eu?.displayName ?? "—"}
                      size="grande"
                    />
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1.5 px-2 py-1 text-[length:var(--texto-xs)] text-[var(--cor-tinta)]">
                <Mic className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {eu?.displayName ?? "—"} (você)
                </span>
              </span>
            </span>

            {/* ── controles, sobre o vídeo ── */}
            <ul className="absolute inset-x-0 bottom-0 flex flex-wrap items-start justify-center gap-4 bg-gradient-to-t from-[var(--cor-cortina)] to-transparent px-4 pb-4 pt-10">
              {[
                { rotulo: "Microfone", Icone: Mic },
                { rotulo: "Câmera", Icone: Video },
                { rotulo: "Compartilhar", Icone: MonitorUp },
                { rotulo: "Mais", Icone: MoreHorizontal },
              ].map(({ rotulo, Icone }) => (
                <li key={rotulo} className="grid justify-items-center gap-1">
                  <span
                    title="A chamada de vídeo ainda não existe neste protótipo."
                    className="grid size-11 place-items-center rounded-full border border-white/40 text-white/70"
                  >
                    <Icone className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-[length:var(--texto-xs)] text-white/80">{rotulo}</span>
                </li>
              ))}
              {/*
              Abrir e encerrar são o mesmo lugar porque são o mesmo botão da
              chamada: um cabeçalho separado só para isso fazia a pessoa
              procurar a ação longe de onde a call está.
            */}
              <li className="grid justify-items-center gap-1">
                {encerrada ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="grid size-11 place-items-center rounded-full bg-[var(--cor-superficie-2)] text-[var(--cor-tinta-fraca)]"
                    >
                      <PhoneOff className="size-5" />
                    </span>
                    <span className="text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
                      Encerrada
                    </span>
                  </>
                ) : emAndamento ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEncerrando(true)}
                      title="Encerrar a reunião"
                      className="grid size-11 place-items-center rounded-full bg-[var(--cor-perigo)] text-[var(--cor-acento-texto)]"
                    >
                      <PhoneOff className="size-5" aria-hidden="true" />
                    </button>
                    <span className="text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
                      Finalizar
                    </span>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        reportar(
                          run((data, id) => startMeeting(data, id, task.id)),
                          "Reunião aberta.",
                        )
                      }
                      title="Abrir a reunião"
                      className="grid size-11 place-items-center rounded-full bg-[var(--cor-sucesso)] text-[var(--cor-acento-texto)]"
                    >
                      <Video className="size-5" aria-hidden="true" />
                    </button>
                    <span className="text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
                      Abrir
                    </span>
                  </>
                )}
              </li>
            </ul>
          </div>
        </div>

        {/* ── o dossiê, à direita ── */}
        <div className="relative grid min-w-0 content-start gap-3 xl:min-h-0 xl:overflow-y-auto">
          {contato ? (
            <RecordPanel
              title="Detalhes do cliente"
              icon={<User className="size-4" aria-hidden="true" />}
              action={
                temperatura ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-[length:var(--texto-sm)]"
                    style={{
                      background: `color-mix(in srgb, ${temperatura.color ?? "var(--cor-traco)"} 20%, transparent)`,
                      color: "var(--cor-tinta)",
                    }}
                  >
                    Lead {temperatura.name.toLocaleLowerCase("pt-BR")}
                  </span>
                ) : undefined
              }
            >
              <div className="mb-3 flex items-center gap-3">
                <ContactAvatar contact={contato} />
                <span className="min-w-0">
                  <Link
                    href={`/crm/contatos/${contato.id}`}
                    className="block truncate font-[var(--peso-medio)] text-[var(--cor-tinta)] hover:underline"
                  >
                    {contactDisplayName(contato)}
                  </Link>
                  <span className="block truncate text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                    {contactDisplayRole(state, contato.id) || "sem cargo"}
                    {company ? ` · ${company.tradeName}` : ""}
                  </span>
                </span>
              </div>
              <ul className="grid gap-2">
                {contato.identifiers
                  .filter(
                    (identificador) =>
                      identificador.type !== "usuarioDeInstagram" &&
                      identificador.type !== "perfilDeLinkedIn" &&
                      identificador.type !== "perfilDeTikTok",
                  )
                  .map((identificador) => (
                    <li
                      key={identificador.id}
                      className="flex min-w-0 items-baseline gap-2"
                    >
                      <span className="shrink-0 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        {IDENTIFIER_TYPE_LABEL[identificador.type] ??
                          identificador.type}
                      </span>
                      <span className="identificador min-w-0 flex-1 truncate text-right text-[var(--cor-tinta)]">
                        {identificador.displayValue}
                      </span>
                    </li>
                  ))}
                {contato.addresses[0] ? (
                  <li className="flex items-baseline justify-between gap-2">
                    <span className="shrink-0 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                      Localização
                    </span>
                    <span className="text-[var(--cor-tinta)]">
                      {[contato.addresses[0].city, contato.addresses[0].region]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </li>
                ) : null}
              </ul>
            </RecordPanel>
          ) : null}

          {deal ? (
            <>
              <RecordPanel
                title="Detalhes da call"
                icon={<ScrollText className="size-4" aria-hidden="true" />}
              >
                {/*
                Situação, cronômetro, participantes e horário moravam no
                cabeçalho. Ali eles competiam com o título e com o botão de
                encerrar; aqui ficam junto do que a call produziu — que é o
                mesmo assunto, lido de uma vez só.
              */}
                <dl className="grid gap-2">
                  <RecordRow label="Situação">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[length:var(--texto-sm)] ${
                        emAndamento
                          ? "bg-[var(--cor-sucesso-fraco)] text-[var(--cor-sucesso-texto)]"
                          : "bg-[var(--cor-superficie-2)] text-[var(--cor-tinta-fraca)]"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`size-1.5 rounded-full ${
                          emAndamento
                            ? "bg-[var(--cor-sucesso)]"
                            : "bg-[var(--cor-tinta-fraca)]"
                        }`}
                      />
                      {emAndamento
                        ? "Em andamento"
                        : encerrada
                          ? "Encerrada"
                          : "Não iniciada"}
                    </span>
                  </RecordRow>
                  {emAndamento && apontamento && agora !== null ? (
                    <RecordRow label="Duração">
                      <span className="identificador inline-flex items-center gap-1.5">
                        <Clock className="size-3.5" aria-hidden="true" />
                        {duracao(Date.parse(apontamento.start), agora)}
                      </span>
                    </RecordRow>
                  ) : null}
                  <RecordRow label="Objetivo">{task.title}</RecordRow>
                  <RecordRow label="Quando">
                    {task.dueDate ? fmt.taskDate(task.dueDate) : "sem horário"}
                  </RecordRow>
                  <RecordRow label="Participantes">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-3.5" aria-hidden="true" />2
                    </span>
                  </RecordRow>
                </dl>
                <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                  Diagnóstico da call
                </p>
                <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta)]">
                  {diagnostico
                    ? String(diagnostico)
                    : "Ainda não registrado. A Etapa Call não fecha sem ele."}
                </p>
              </RecordPanel>

              <RecordPanel
                title="Resumo do Negócio"
                icon={<ScrollText className="size-4" aria-hidden="true" />}
                action={
                  <Link
                    href={`/crm/negocios/${deal.id}`}
                    className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)] hover:underline"
                  >
                    Abrir Negócio
                  </Link>
                }
              >
                <dl className="grid gap-2">
                  <RecordRow label="Objeto">{deal.object || "—"}</RecordRow>
                  <RecordRow label="Valor">
                    {deal.value ? fmt.money(deal.value) : "sem valor declarado"}
                  </RecordRow>
                  <RecordRow label="Etapa">{stage?.name ?? "—"}</RecordRow>
                  <RecordRow label="Fechamento previsto">
                    {deal.expectedCloseDate
                      ? fmt.civilDate(deal.expectedCloseDate)
                      : "—"}
                  </RecordRow>
                </dl>
              </RecordPanel>
            </>
          ) : null}

          {deal ? (
            <RecordPanel
              title="Roteiro da call"
              icon={<ScrollText className="size-4" aria-hidden="true" />}
              count={camposDoRoteiro.length}
            >
              <dl className="grid gap-3">
                {camposDoRoteiro.map((definicao) => {
                  const valor = deal.fieldValues.find(
                    (v) => v.definitionId === definicao.id,
                  )?.value;
                  const vazio =
                    valor === undefined || valor === null || valor === "";
                  return (
                    <div key={definicao.id}>
                      <dt className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        {definicao.name}
                      </dt>
                      <dd
                        className={`text-[length:var(--texto-base)] ${
                          vazio
                            ? "text-[var(--cor-tinta-fraca)]"
                            : "text-[var(--cor-tinta)]"
                        }`}
                      >
                        {vazio
                          ? (definicao.description ?? "Ainda não preenchido.")
                          : definicao.type === "currency" &&
                              typeof valor === "number"
                            ? fmt.money({
                                amount: valor,
                                currency: state.workspace.locale.currency,
                              })
                            : String(valor)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <p className="mt-3 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                O que o SDR levantou. O que aparecer de novo nesta call vai na
                anotação, e sai da Etapa Call como Diagnóstico.
              </p>
            </RecordPanel>
          ) : null}

          {contato ? (
            <RecordPanel
              title="Redes sociais"
              icon={<Share2 className="size-4" aria-hidden="true" />}
              count={perfis.length}
            >
              {perfis.length === 0 ? (
                <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                  Este Contato não tem perfil público registrado.
                </p>
              ) : (
                <ul className="grid grid-cols-3 gap-2">
                  {perfis.map(({ identificador, href, Icone, rotulo }) => (
                    <li key={identificador.id}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        title={identificador.displayValue}
                        className="grid justify-items-center gap-1 rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] py-2 text-[var(--cor-acento)] hover:border-[var(--cor-acento)]"
                      >
                        <Icone className="size-5" />
                        <span className="text-[length:var(--texto-xs)] text-[var(--cor-tinta-fraca)]">
                          {rotulo}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                Abrem em outra aba: a call continua aqui.
              </p>
            </RecordPanel>
          ) : null}

          <RecordPanel
            title="Próximos passos"
            icon={<Clock className="size-4" aria-hidden="true" />}
            count={proximas.length}
          >
            {proximas.length === 0 ? (
              <p className="text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]">
                Nenhuma Tarefa aberta do Proprietário.
              </p>
            ) : (
              <>
                <ul className="grid gap-2">
                  {proximasVisiveis.map((t) => (
                    <li key={t.id} className="min-w-0">
                      <Link
                        href={`/estrutura/tarefas/${t.id}`}
                        className="block truncate text-[length:var(--texto-base)] text-[var(--cor-tinta)] hover:underline"
                      >
                        {t.title}
                      </Link>
                      <span className="text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                        {t.dueDate ? fmt.taskDate(t.dueDate) : "sem data"}
                      </span>
                    </li>
                  ))}
                </ul>
                {proximas.length > proximasVisiveis.length ? (
                  <p className="mt-2 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">
                    As {proximasVisiveis.length} mais próximas de {proximas.length}.{" "}
                    <Link href="/estrutura/tarefas" className="underline">
                      Ver todas
                    </Link>
                    .
                  </p>
                ) : null}
              </>
            )}
          </RecordPanel>

          {contato ? (
            <RecordPanel
              title="Anotações e atividades"
              icon={<ScrollText className="size-4" aria-hidden="true" />}
              count={atividadesDoLead.length}
            >
              <form
                className="grid gap-2"
                onSubmit={(evento) => {
                  evento.preventDefault();
                  const resultado = run((data, id) =>
                    addContactNote(data, id, contato.id, nota),
                  );
                  reportar(resultado, "Anotação registrada no Contato.");
                  // Só limpa se gravou: apagar o texto junto com o erro
                  // perderia o que a pessoa escreveu durante a call.
                  if (resultado.ok) setNota("");
                }}
              >
                <label className="sr-only" htmlFor="nota-da-call">
                  Anotação da call
                </label>
                <textarea
                  id="nota-da-call"
                  rows={3}
                  value={nota}
                  onChange={(evento) => setNota(evento.target.value)}
                  placeholder="O que apareceu nesta call…"
                  className="w-full rounded-[var(--raio-controle)] border border-[var(--cor-traco-forte)] bg-[var(--cor-papel)] px-2 py-1.5 text-[length:var(--texto-base)]"
                />
                <span>
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={nota.trim() === ""}
                    disabledReason="Escreva a anotação antes de salvar."
                  >
                    Registrar anotação
                  </Button>
                </span>
              </form>

              <div className="mt-3 border-t border-[var(--cor-traco)] pt-3">
                <ActivityTimeline
                  entries={atividadesDoLead
                    .slice(0, atividadesVisiveis)
                    .map((registro) => ({
                      id: registro.id,
                      at: fmt.instant(registro.at),
                      actorName: actorLabel(state, registro.actor),
                      actorKind: registro.actor.kind,
                      ...(registro.delegate
                        ? { delegateName: actorLabel(state, registro.delegate) }
                        : {}),
                      action: registro.action,
                      ...(registro.before ? { before: registro.before } : {}),
                      ...(registro.after ? { after: registro.after } : {}),
                      ...(registro.detail ? { detail: registro.detail } : {}),
                    }))}
                />
                {atividadesVisiveis < atividadesDoLead.length ? (
                  <div className="mt-3">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setAtividadesVisiveis(
                          (quantas) => quantas + ATIVIDADES_POR_VEZ,
                        )
                      }
                    >
                      Mostrar mais (
                      {atividadesDoLead.length - atividadesVisiveis})
                    </Button>
                  </div>
                ) : null}
              </div>
            </RecordPanel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
