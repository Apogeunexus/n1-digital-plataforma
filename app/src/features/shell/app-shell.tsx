"use client";

/**
 * The application shell: top bar plus lateral navigation.
 *
 * The tree reproduces EXACTLY the approved containment chain (A3.1): Space →
 * Folder → Subfolder → List. Tasks never appear in it (A3.2), and a Subfolder
 * never expands into another Subfolder (A3.4). CRM, IA and Painéis are peers of
 * ESTRUTURA, never nested under it (A2.2).
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  Bell,
  Building2,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ChevronRight,
  Contact,
  Folder as FolderIcon,
  Handshake,
  Home,
  LayoutGrid,
  Inbox as InboxIcon,
  LayoutDashboard,
  ListTodo,
  Lock,
  MessageSquare,
  Search,
  Settings,
  SlidersHorizontal,
  Split,
} from "lucide-react";
import { ActionMenu, ActorAvatar, Toast } from "@/design/components";
import type { ContainerKind } from "@/features/estrutura/create-container-dialog";
import { shortcutHref } from "@/features/estrutura/shortcuts";
import { BrandMark } from "./brand";

/** DO-CXE-14 — the Availability is a value object of the Member. */
import { useData, useRun, useSession } from "@/data/store";
import { moveChatSessionToFolder } from "@/data/operations";
import { useChatFolderDialogs } from "@/features/ia/chat-folder-dialogs";
import { memberReachesContainer, memberSeesResource, pendingMentions } from "@/data/derive";
import { useSidebarCollapsed } from "./use-sidebar";
import {
  CreateContainerDialog,
  useCreateContainerDialog,
} from "@/features/estrutura/create-container-dialog";
import type { Folder, Id, List, Space, SpaceShortcut } from "@/data/types";

/**
 * `true` só depois de o React assumir a página no navegador. No servidor e na
 * primeira renderização do cliente devolve `false`, sempre — é esse "sempre"
 * que faz o HTML dos dois lados bater.
 */
export function useHidratado(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function AppShell({ children }: { readonly children: React.ReactNode }) {
  const hidratado = useHidratado();
  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <SideNav />
        {/*
          O conteúdo só entra depois da hidratação. O seed é construído em cada
          processo a partir de "hoje", e o servidor de desenvolvimento fica de
          pé por dias: passada a meia-noite UTC, o HTML dele descreve ontem e o
          navegador descreve hoje — cada data da página diverge e o React
          descarta a árvore com erro. Sem servidor nem SEO, o HTML do servidor
          não tinha valor nenhum para estas telas; a casca fica, o miolo espera.
        */}
        <main className="relative min-w-0 flex-1 overflow-y-auto bg-[var(--cor-superficie-2)]">
          {hidratado ? children : null}
        </main>
      </div>
    </div>
  );
}

function TopBar() {
  const router = useRouter();
  const { memberId } = useSession();
  const member = useData((data) => data.members.find((m) => m.id === memberId));
  // O sino conta o que espera resposta: Aprovações abertas e menções em conversas não resolvidas.
  const pendingApprovals = useData(
    (data) =>
      data.approvals.filter((a) => a.decision === undefined && a.approverMemberId === memberId).length +
      pendingMentions(data, memberId).length,
  );

  return (
    <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-[var(--cor-traco)] bg-[var(--cor-superficie)] px-4 py-2">
      {/* Só o monograma. O nome do produto já está na aba do navegador. */}
      <Link href="/" aria-label="N1 Digital — início" className="flex w-fit items-center">
        <BrandMark size={26} />
      </Link>

      {/* A busca é o centro da barra: as três colunas da grade a mantêm no meio
          da janela, e não no meio do que sobra dos dois lados. */}
      <Link
        href="/buscar"
        className="flex w-[min(28rem,45vw)] items-center gap-2 rounded-[var(--raio-controle)] bg-[var(--cor-superficie-2)] px-3 py-1.5 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)] hover:bg-[var(--cor-traco)]"
      >
        <Search className="size-4" aria-hidden="true" />
        Buscar
        <kbd className="ml-auto rounded border border-[var(--cor-traco-forte)] bg-[var(--cor-superficie)] px-1 text-[length:var(--texto-sm)]">
          /
        </kbd>
      </Link>

      <div className="flex items-center justify-end gap-1">
        <Link
          href="/notificacoes"
          className="relative rounded-[var(--raio-controle)] p-2 text-[var(--cor-tinta-fraca)] hover:bg-[var(--cor-superficie-2)]"
          aria-label={`Notificações${pendingApprovals > 0 ? `, ${pendingApprovals} pendentes` : ""}`}
        >
          <Bell className="size-4" aria-hidden="true" />
          {pendingApprovals > 0 ? (
            <span
              className="absolute right-1 top-1 size-2 rounded-full bg-[var(--cor-perigo)]"
              aria-hidden="true"
            />
          ) : null}
        </Link>

        {/*
          Avatar e nome, e nada mais. O Papel e a Disponibilidade saíram daqui:
          eles são do Membro, não da barra, e vivem em `/minha-conta`.
          O menu continua ancorado no próprio bloco — sem ele, "Trocar de
          Membro" não teria como ser alcançado de tela nenhuma.
        */}
        <ActionMenu
          label={member?.displayName ?? "Escolher Membro"}
          trigger={
            <span className="flex items-center gap-2 rounded-[var(--raio-controle)] px-2 py-1.5 text-[length:var(--texto-base)] hover:bg-[var(--cor-superficie-2)]">
              <ActorAvatar
                kind="member"
                name={member?.displayName ?? "?"}
                {...(member?.photoFileId ? { photoFileId: member.photoFileId } : {})}
              />
              <span className="truncate text-[var(--cor-tinta)]">
                {member?.displayName ?? "Escolher Membro"}
              </span>
            </span>
          }
          items={[
            { label: "Minha conta", onSelect: () => router.push("/minha-conta") },
            { label: "Notificações", onSelect: () => router.push("/notificacoes") },
            { label: "Trocar de Membro", onSelect: () => router.push("/entrar") },
          ]}
        />
      </div>
    </header>
  );
}


function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const pendingApprovals = useData((data) => data.approvals.filter((a) => a.decision === undefined).length);
  const [showArchived, setShowArchived] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { creating, openCreate, closeCreate } = useCreateContainerDialog();
  const { collapsed, toggle } = useSidebarCollapsed();

  return (
    <nav
      aria-label="Navegação principal"
      className={`shrink-0 overflow-y-auto border-r border-[var(--cor-traco)] bg-[var(--cor-superficie-2)] py-3 transition-[width] ${
        collapsed ? "w-14 px-2" : "w-64 px-2"
      }`}
    >
      {/*
        Recolher vira uma FAIXA DE ÍCONES, não um sumiço: esconder a navegação
        inteira troca um problema de espaço por um de orientação. A árvore sai
        porque um nome de Lista não cabe em 14 unidades — e é ela que ocupa a
        altura toda.
      */}
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expandir o menu" : "Recolher o menu"}
        aria-expanded={!collapsed}
        title={collapsed ? "Expandir o menu" : "Recolher o menu"}
        className={`mb-2 flex size-8 items-center justify-center rounded text-[var(--cor-tinta-fraca)] hover:bg-[var(--cor-superficie-2)] hover:text-[var(--cor-tinta)] ${
          collapsed ? "mx-auto" : "ml-auto"
        }`}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-4" aria-hidden="true" />
        ) : (
          <PanelLeftClose className="size-4" aria-hidden="true" />
        )}
      </button>

      <NavItem
        href="/"
        icon={<Home className="size-4" />}
        label="Início"
        active={pathname === "/"}
        collapsed={collapsed}
      />

      <CreateContainerDialog
        target={creating}
        onClose={closeCreate}
        onDone={(message, href) => {
          setNotice(message);
          router.push(href);
        }}
      />
      {notice ? (
        <Toast tone="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Toast>
      ) : null}

      <NavGroup
        label="Todos os Espaços"
        collapsed={collapsed}
        {...(collapsed
          ? {}
          : {
              action: (
                <button
                  type="button"
                  onClick={() => openCreate("espaco")}
                  aria-label="Novo Espaço"
                  className="grid size-5 place-items-center rounded text-[var(--cor-tinta-fraca)] hover:bg-[var(--cor-superficie-2)] hover:text-[var(--cor-tinta)]"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                </button>
              ),
            })}
      >
        <NavItem
          href="/estrutura"
          icon={<LayoutGrid className="size-4" />}
          label="Visão geral"
          active={pathname === "/estrutura"}
          collapsed={collapsed}
        />
        {collapsed ? null : (
          <>
            <StructureTree showArchived={showArchived} openCreate={openCreate} />
            <button
              type="button"
              onClick={() => setShowArchived((value) => !value)}
              className="mt-1 w-full rounded px-2 py-1 text-left text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)] hover:bg-[var(--cor-superficie-2)]"
            >
              {showArchived ? "Ocultar arquivados" : "Mostrar arquivados"}
            </button>
            <SharedTasks />
          </>
        )}
      </NavGroup>

      <NavGroup label="CRM" collapsed={collapsed}>
        <NavItem href="/crm/contatos" icon={<Contact className="size-4" />} label="Contatos" active={pathname.startsWith("/crm/contatos")} collapsed={collapsed} />
        <NavItem href="/crm/empresas" icon={<Building2 className="size-4" />} label="Empresas" active={pathname.startsWith("/crm/empresas")} collapsed={collapsed} />
        <NavItem href="/crm/negocios" icon={<Handshake className="size-4" />} label="Negócios" active={pathname.startsWith("/crm/negocios")} collapsed={collapsed} />
        <NavItem href="/crm/funis" icon={<Split className="size-4" />} label="Funis" active={pathname.startsWith("/crm/funis")} collapsed={collapsed} />
        <NavItem href="/crm/caixa-de-entrada" icon={<InboxIcon className="size-4" />} label="Caixa de Entrada" active={pathname.startsWith("/crm/caixa-de-entrada")} collapsed={collapsed} />
      </NavGroup>

      <NavGroup label="IA" collapsed={collapsed}>
        <NavItem href="/ia/chat" icon={<MessageSquare className="size-4" />} label="Chat" active={pathname === "/ia/chat"} collapsed={collapsed} />
        {collapsed ? null : <ChatTree pathname={pathname} onNotice={setNotice} />}
        {/*
          Tudo que configura a IA mora em Personalizar, com o próprio submenu
          (o modelo do Claude): Agente, Habilidades, Automação, Conhecimento,
          Conectores, Plugins. Aprovações continua alcançável pela Início e
          pelas Notificações — o sino no topo já conta as pendentes.
        */}
        <NavItem
          href="/ia/personalizar/agente"
          icon={<SlidersHorizontal className="size-4" />}
          label="Personalizar"
          badge={pendingApprovals || undefined}
          active={pathname.startsWith("/ia/personalizar") || ["/ia/agentes", "/ia/habilidades", "/ia/automacoes", "/ia/conhecimento", "/ia/aprovacoes"].some((p) => pathname.startsWith(p))}
          collapsed={collapsed}
        />
      </NavGroup>

      <div className="mt-3 border-t border-[var(--cor-traco)] pt-3">
        <NavItem href="/paineis" icon={<LayoutDashboard className="size-4" />} label="Painéis" active={pathname.startsWith("/paineis")} collapsed={collapsed} />
        <NavItem href="/configuracoes" icon={<Settings className="size-4" />} label="Configurações" active={pathname.startsWith("/configuracoes")} collapsed={collapsed} />
      </div>
    </nav>
  );
}

/**
 * The tree respects privacy: a private container only appears for whoever has a
 * direct grant or a share (B38a). A descendant shared with someone who cannot
 * see the ancestors shows ONLY the ancestor names, inert, for navigation
 * (B38e) — marked with `aria-disabled` and a neutral hint (PADROES §11).
 */
function StructureTree({
  showArchived,
  openCreate,
}: {
  readonly showArchived: boolean;
  readonly openCreate: (kind: ContainerKind, parentType?: "space" | "folder", parentId?: string) => void;
}) {
  const { memberId } = useSession();
  const data = useData((current) => current);
  const { spaces, folders, lists } = data;

  const visibleList = (list: List): boolean => {
    if (list.lifecycle === "naLixeira") return false;
    if (list.lifecycle === "arquivado" && !showArchived) return false;
    // A MESMA leitura que os Painéis usam: a barra e o número não podem
    // discordar sobre o que este Membro alcança.
    return memberSeesResource(data, memberId, list.id);
  };

  const listsUnder = (parentId: Id) => lists.filter((l) => l.parentId === parentId).filter(visibleList);

  const foldersUnder = (parentId: Id): Folder[] =>
    folders
      .filter((f) => f.parentId === parentId)
      .filter((f) => f.lifecycle !== "naLixeira")
      .filter((f) => f.lifecycle !== "arquivado" || showArchived);

  const spaceHasVisibleContent = (space: Space): boolean => {
    if (listsUnder(space.id).length > 0) return true;
    return foldersUnder(space.id).some(
      (folder) => listsUnder(folder.id).length > 0 || foldersUnder(folder.id).some((sub) => listsUnder(sub.id).length > 0),
    );
  };

  const isGuest =
    data.roles.find((r) => r.id === data.members.find((m) => m.id === memberId)?.roleId)?.base ===
    "convidado";

  const visibleSpaces = spaces
    .filter((s) => s.lifecycle !== "naLixeira")
    .filter((s) => s.lifecycle !== "arquivado" || showArchived)
    // B38a vive em memberSeesResource: o contêiner privado sem concessão não
    // existe aqui, e o Convidado só chega ao que lhe foi concedido.
    .filter((s) => memberSeesResource(data, memberId, s.id))
    .filter((s) => !isGuest || spaceHasVisibleContent(s))
    .sort((a, b) => a.order - b.order);

  if (visibleSpaces.length === 0) {
    return <p className="px-2 py-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">Nenhum Espaço visível para você.</p>;
  }

  return (
    <ul>
      {visibleSpaces.map((space) => (
        <TreeSpace
          key={space.id}
          space={space}
          inert={isGuest}
          foldersUnder={foldersUnder}
          listsUnder={listsUnder}
          openCreate={openCreate}
        />
      ))}
    </ul>
  );
}

function TreeSpace({
  space,
  inert,
  foldersUnder,
  listsUnder,
  openCreate,
}: {
  readonly space: Space;
  readonly inert: boolean;
  readonly foldersUnder: (parentId: Id) => Folder[];
  readonly listsUnder: (parentId: Id) => List[];
  readonly openCreate: (kind: ContainerKind, parentType?: "space" | "folder", parentId?: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const childFolders = foldersUnder(space.id);
  const directLists = listsUnder(space.id);

  return (
    <li>
      <TreeRow
        depth={0}
        open={open}
        onToggle={() => setOpen((value) => !value)}
        hasChildren={childFolders.length + directLists.length > 0}
        href={inert ? undefined : `/estrutura/espacos/${space.id}`}
        label={space.name}
        icon={<span className="size-2 rounded-sm" style={{ backgroundColor: space.color ?? "var(--cor-dom-estrutura)" }} />}
        privateContainer={space.isPrivate}
        archived={space.lifecycle === "arquivado"}
        creatable={
          inert
            ? []
            : [
                { label: "Lista", onSelect: () => openCreate("lista", "space", space.id) },
                { label: "Pasta", onSelect: () => openCreate("pasta", "space", space.id) },
              ]
        }
      />
      {open ? (
        <ul>
          {/* O atalho abre o Espaço: a Caixa de entrada é o que se olha primeiro. */}
          {(space.shortcuts ?? []).map((shortcut) => (
            <TreeShortcut key={shortcut.id} shortcut={shortcut} depth={1} />
          ))}
          {childFolders.map((folder) => (
            <TreeFolder
              key={folder.id}
              folder={folder}
              depth={1}
              inert={inert}
              foldersUnder={foldersUnder}
              listsUnder={listsUnder}
              openCreate={openCreate}
            />
          ))}
          {directLists.map((list) => (
            <TreeList key={list.id} list={list} depth={1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function TreeShortcut({ shortcut, depth }: { readonly shortcut: SpaceShortcut; readonly depth: number }) {
  const pathname = usePathname();
  const href = shortcutHref(shortcut);
  const active = pathname.startsWith("/crm/caixa-de-entrada");
  return (
    <li>
      <TreeRow
        depth={depth}
        hasChildren={false}
        href={href}
        label={shortcut.name}
        icon={<InboxIcon className="size-3.5 text-[var(--cor-tinta-fraca)]" aria-hidden="true" />}
        active={active}
      />
    </li>
  );
}

function TreeFolder({
  folder,
  depth,
  inert,
  foldersUnder,
  listsUnder,
  openCreate,
}: {
  readonly folder: Folder;
  readonly depth: number;
  readonly inert: boolean;
  readonly foldersUnder: (parentId: Id) => Folder[];
  readonly listsUnder: (parentId: Id) => List[];
  readonly openCreate: (kind: ContainerKind, parentType?: "space" | "folder", parentId?: string) => void;
}) {
  const [open, setOpen] = useState(true);
  // A3.4 — a Subfolder never expands into another Subfolder.
  const subfolders = folder.parentType === "space" ? foldersUnder(folder.id) : [];
  const childLists = listsUnder(folder.id);

  return (
    <li>
      <TreeRow
        depth={depth}
        open={open}
        onToggle={() => setOpen((value) => !value)}
        hasChildren={subfolders.length + childLists.length > 0}
        href={inert ? undefined : `/estrutura/pastas/${folder.id}`}
        label={folder.name}
        icon={<FolderIcon className="size-3.5 text-[var(--cor-tinta-fraca)]" aria-hidden="true" />}
        privateContainer={folder.isPrivate}
        archived={folder.lifecycle === "arquivado"}
        creatable={
          inert
            ? []
            : [
                { label: "Lista", onSelect: () => openCreate("lista", "folder", folder.id) },
                // A3.4 — Subpasta não contém Pasta, então aqui não se oferece.
                ...(folder.parentType === "space"
                  ? [
                      {
                        label: "Subpasta",
                        onSelect: () => openCreate("pasta", "folder", folder.id),
                      },
                    ]
                  : []),
              ]
        }
      />
      {open ? (
        <ul>
          {subfolders.map((sub) => (
            <TreeFolder
              key={sub.id}
              folder={sub}
              depth={depth + 1}
              inert={inert}
              foldersUnder={foldersUnder}
              listsUnder={listsUnder}
              openCreate={openCreate}
            />
          ))}
          {childLists.map((list) => (
            <TreeList key={list.id} list={list} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function TreeList({ list, depth }: { readonly list: List; readonly depth: number }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <li>
      <TreeRow
        depth={depth}
        hasChildren={false}
        href={`/estrutura/listas/${list.id}`}
        label={list.name}
        icon={<ListTodo className="size-3.5 text-[var(--cor-tinta-fraca)]" aria-hidden="true" />}
        privateContainer={list.isPrivate}
        archived={list.lifecycle === "arquivado"}
        active={pathname === `/estrutura/listas/${list.id}`}
        creatable={
          // Dentro de uma Lista o que se cria é Tarefa, e o campo dela já vive
          // na tela da Lista: o "+" leva até ele em vez de abrir um segundo.
          list.lifecycle === "ativo"
            ? [
                {
                  label: "Tarefa",
                  onSelect: () => router.push(`/estrutura/listas/${list.id}?nova-tarefa=1`),
                },
              ]
            : []
        }
      />
    </li>
  );
}

/**
 * As Sessões de Chat como submenu: pasta → Sessões, e as soltas direto sob
 * "Chat". É a mesma árvore da Estrutura, com a mesma linha, para o menu não
 * ter duas gramáticas. Só as MINHAS: pasta e Sessão são do Membro (DO-CHT-09).
 */
function ChatTree({
  pathname,
  onNotice,
}: {
  readonly pathname: string;
  readonly onNotice: (message: string) => void;
}) {
  const { memberId } = useSession();
  const run = useRun();
  const { dialogs, openCreate, openRename, openDelete } = useChatFolderDialogs(onNotice);
  // O seletor devolve o estado inteiro: um seletor que filtra cria um array
  // novo a cada leitura, e o instantâneo do servidor precisa ser estável.
  const state = useData((data) => data);
  const folders = state.chatFolders
    .filter((folder) => folder.ownerMemberId === memberId)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const sessions = state.chatSessions.filter(
    (s) => s.ownerMemberId === memberId && s.lifecycle !== "naLixeira",
  );
  const activeId = pathname.startsWith("/ia/chat/") ? pathname.slice("/ia/chat/".length) : null;
  const activeFolder = sessions.find((s) => s.id === activeId)?.folderId ?? null;
  // Sem escolha explícita, só a pasta da Sessão em que estou fica aberta.
  const [escolhas, setEscolhas] = useState<Readonly<Record<Id, boolean>>>({});
  const aberta = (id: Id) => escolhas[id] ?? id === activeFolder;
  const toggle = (id: Id) => setEscolhas((atual) => ({ ...atual, [id]: !aberta(id) }));

  const loose = sessions.filter((s) => !s.folderId || !folders.some((f) => f.id === s.folderId));

  const mover = (sessionId: Id, folderId: Id | null, message: string) => {
    const result = run((data, id) => moveChatSessionToFolder(data, id, sessionId, folderId));
    onNotice(result.ok ? message : result.error);
  };

  /*
    Todos os títulos na mesma coluna: pasta, Sessão dentro dela, Sessão solta e
    "Nova pasta". A Sessão não tem ícone, mas ocupa o lugar dele em branco, e
    a de dentro da pasta fica no mesmo nível — o que a separa é estar sob a
    pasta aberta, não um recuo a mais.
  */
  const sessionRow = (session: (typeof sessions)[number]) => (
    <TreeRow
      key={session.id}
      depth={1}
      label={session.title}
      icon={<span className="size-3.5 shrink-0" aria-hidden="true" />}
      href={`/ia/chat/${session.id}`}
      hasChildren={false}
      active={session.id === activeId}
      menu={[
        ...folders
          .filter((folder) => folder.id !== session.folderId)
          .map((folder) => ({
            label: `Mover para ${folder.name}`,
            onSelect: () => mover(session.id, folder.id, `Guardada em ${folder.name}.`),
          })),
        ...(session.folderId
          ? [{ label: "Tirar da pasta", onSelect: () => mover(session.id, null, "Sessão fora de pasta.") }]
          : []),
      ]}
    />
  );

  return (
    <div className="mb-1">
      {dialogs}
      {folders.map((folder) => {
        const inside = sessions.filter((s) => s.folderId === folder.id);
        return (
          <div key={folder.id}>
            <TreeRow
              depth={1}
              label={folder.name}
              icon={<FolderIcon className="size-3.5 shrink-0 text-[var(--cor-tinta-fraca)]" aria-hidden="true" />}
              open={aberta(folder.id)}
              onToggle={() => toggle(folder.id)}
              hasChildren
              menu={[
                { label: "Renomear", onSelect: () => openRename(folder) },
                { label: "Excluir pasta", destructive: true, onSelect: () => openDelete(folder) },
              ]}
            />
            {aberta(folder.id)
              ? inside.length > 0
                ? inside.map((session) => sessionRow(session))
                : (
                    <p
                      className="truncate py-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]"
                      style={{ paddingLeft: `${12 + 24 + 6 + 14 + 6}px` }}
                    >
                      Pasta vazia
                    </p>
                  )
              : null}
          </div>
        );
      })}
      {loose.map((session) => sessionRow(session))}
      {/* Como o "Novo projeto" do ChatGPT: a pasta nasce onde ela vai morar. */}
      <div className="flex items-center">
        <span className="w-6 shrink-0" style={{ marginLeft: "12px" }} />
        <button
          type="button"
          onClick={openCreate}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded px-1.5 py-1 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)] hover:bg-[var(--cor-superficie-2)] hover:text-[var(--cor-tinta)]"
        >
          <Plus className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">Nova pasta</span>
        </button>
      </div>
    </div>
  );
}

function TreeRow({
  depth,
  label,
  icon,
  href,
  open,
  onToggle,
  hasChildren,
  privateContainer,
  archived,
  active,
  creatable,
  menu,
}: {
  readonly depth: number;
  readonly label: string;
  readonly icon: React.ReactNode;
  readonly href?: string;
  readonly open?: boolean;
  readonly onToggle?: () => void;
  readonly hasChildren: boolean;
  readonly privateContainer?: boolean;
  readonly archived?: boolean;
  readonly active?: boolean;
  /** O que este contêiner aceita dentro dele (A3). Vazio esconde o "+". */
  readonly creatable?: ReadonlyArray<{ readonly label: string; readonly onSelect: () => void }>;
  /** Ações sobre a própria linha. Vazio esconde o "⋯". */
  readonly menu?: ReadonlyArray<{
    readonly label: string;
    readonly onSelect: () => void;
    readonly destructive?: boolean;
  }>;
}) {
  const content = (
    <>
      {icon}
      <span className="truncate">{label}</span>
      {privateContainer ? <Lock className="size-3 text-[var(--cor-tinta-fraca)]" aria-label="Contêiner privado" /> : null}
      {archived ? <span className="text-[10px] text-[var(--cor-atencao-texto)]">arquivado</span> : null}
    </>
  );

  return (
    <div className="group/linha flex items-center">
      {hasChildren && onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? `Recolher ${label}` : `Expandir ${label}`}
          aria-expanded={open}
          // Alvo de 24px: a seta desenhada tem 14px, e mirar nela erra para o
          // link ao lado, que navega em vez de recolher.
          className="grid size-6 shrink-0 place-items-center rounded text-[var(--cor-tinta-fraca)] hover:bg-[var(--cor-superficie-2)] hover:text-[var(--cor-tinta)]"
          style={{ marginLeft: `${depth * 12}px` }}
        >
          {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>
      ) : (
        <span className="w-6 shrink-0" style={{ marginLeft: `${depth * 12}px` }} />
      )}
      {href ? (
        <Link
          href={href}
          className={`flex min-w-0 flex-1 items-center gap-1.5 rounded px-1.5 py-1 text-[length:var(--texto-base)] ${
            active ? "bg-[var(--cor-superficie-2)] font-medium text-[var(--cor-tinta)]" : "text-[var(--cor-tinta)] hover:bg-[var(--cor-superficie-2)]"
          }`}
        >
          {content}
        </Link>
      ) : (
        // B38e — the ancestor name exists ONLY for navigation: inert, never a
        // clickable element that does nothing (PADROES §11).
        // O recuo já veio do espaçador ao lado: repeti-lo aqui empurrava o
        // nome inerte 14px para a direita dos irmãos com link.
        <span
          aria-disabled="true"
          title="Nome exibido apenas para navegação."
          className="flex min-w-0 flex-1 cursor-default items-center gap-1.5 px-1.5 py-1 text-[length:var(--texto-base)] text-[var(--cor-tinta-fraca)]"
        >
          {content}
        </span>
      )}
      {creatable && creatable.length > 0 ? (
        // Aparece no hover e no foco do teclado: um controle que só existe sob
        // o ponteiro é um controle que o teclado não tem.
        <span className="shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover/linha:opacity-100">
          <ActionMenu
            label={`Criar dentro de ${label}`}
            trigger={
              <span className="grid size-6 place-items-center rounded text-[var(--cor-tinta-fraca)] hover:bg-[var(--cor-superficie-2)] hover:text-[var(--cor-tinta)]">
                <Plus className="size-3.5" aria-hidden="true" />
              </span>
            }
            items={creatable.map((item) => ({ label: item.label, onSelect: item.onSelect }))}
          />
        </span>
      ) : null}
      {menu && menu.length > 0 ? (
        <span className="shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover/linha:opacity-100">
          <ActionMenu label={`Ações de ${label}`} items={menu} />
        </span>
      ) : null}
    </div>
  );
}

/** Reserva para quando o navegador não guarda nada: a escolha vale nesta visita. */
const NAV_PREFS = new Map<string, "aberto" | "fechado">();

/**
 * Um grupo recolhível da barra: o cabeçalho abre e fecha o conteúdo, e a
 * escolha fica no navegador (por rótulo). Com a barra estreita, o grupo vira
 * só um traço — o nome não cabe.
 */
function NavGroup({
  label,
  action,
  collapsed = false,
  children,
}: {
  readonly label: string;
  readonly action?: React.ReactNode;
  readonly collapsed?: boolean;
  readonly children: React.ReactNode;
}) {
  const chave = `n1.nav.${label}`;
  // A preferência vive no navegador; no servidor (e antes de hidratar) o grupo está aberto.
  const aberto = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("n1-nav", onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener("n1-nav", onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    () => {
      try {
        return window.localStorage.getItem(chave) !== "fechado";
      } catch {
        return NAV_PREFS.get(chave) !== "fechado";
      }
    },
    () => true,
  );
  const alternar = () => {
    const proximo = aberto ? "fechado" : "aberto";
    NAV_PREFS.set(chave, proximo);
    try {
      window.localStorage.setItem(chave, proximo);
    } catch {
      // Sem armazenamento (modo privado): vale só nesta visita, pelo mapa acima.
    }
    window.dispatchEvent(new Event("n1-nav"));
  };
  const idConteudo = `nav-grupo-${label.toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="mt-4">
      {collapsed ? (
        // O nome do grupo não cabe; o traço mantém a separação que ele fazia.
        <hr className="mx-2 mb-2 border-[var(--cor-traco)]" aria-label={label} />
      ) : (
        <div className="flex items-center justify-between px-1 pb-1">
          <button
            type="button"
            onClick={alternar}
            aria-expanded={aberto}
            aria-controls={idConteudo}
            className="flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--cor-tinta-fraca)] hover:bg-[var(--cor-superficie-2)] hover:text-[var(--cor-tinta)]"
          >
            {aberto ? <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" /> : <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />}
            <span className="truncate">{label}</span>
          </button>
          {action}
        </div>
      )}
      <div id={idConteudo} hidden={!collapsed && !aberto}>
        {children}
      </div>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
  badge,
  collapsed = false,
}: {
  readonly href: string;
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly active?: boolean;
  readonly badge?: number;
  readonly collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      // Recolhido, o rótulo sai da tela mas NÃO do documento: `sr-only` mantém
      // o nome para o leitor de tela, e o `title` o devolve ao ponteiro. Um
      // ícone sozinho, sem nome, é um item de menu que ninguém consegue nomear.
      {...(collapsed ? { title: label } : {})}
      className={`flex items-center gap-2 rounded py-1.5 text-[length:var(--texto-base)] ${
        collapsed ? "justify-center px-0" : "px-2"
      } ${
        active
          ? "bg-[var(--cor-superficie-2)] font-medium text-[var(--cor-tinta)]"
          : "text-[var(--cor-tinta)] hover:bg-[var(--cor-superficie-2)]"
      }`}
    >
      <span
        className={`relative ${active ? "text-[var(--cor-acento)]" : "text-[var(--cor-tinta-fraca)]"}`}
        aria-hidden="true"
      >
        {icon}
        {collapsed && badge ? (
          <span className="absolute -right-1.5 -top-1.5 size-2 rounded-full bg-[var(--cor-acento)]" />
        ) : null}
      </span>
      <span className={collapsed ? "sr-only" : "truncate"}>{label}</span>
      {badge && !collapsed ? (
        <span className="ml-auto rounded-full bg-[var(--cor-acento)] px-1.5 text-[length:var(--texto-sm)] font-medium text-[var(--cor-acento-texto)]">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Tarefas compartilhadas diretamente com este Membro (concessão na própria
 * Tarefa) cuja Lista ele não alcança pela árvore — a Pessoa da conta a pagar,
 * por exemplo. Sem isto, o único caminho até elas seria a URL.
 */
function SharedTasks() {
  const { memberId } = useSession();
  const tasks = useData((data) =>
    data.grants
      .filter((g) => g.resourceType === "task" && g.subjectKind === "member" && g.subjectId === memberId)
      .map((g) => data.tasks.find((t) => t.id === g.resourceId))
      .filter((t): t is NonNullable<typeof t> => t !== undefined && t.lifecycle === "ativo")
      .filter((t) => !memberReachesContainer(data, memberId, "list", t.listId)),
  );
  const pathname = usePathname();
  if (tasks.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="px-2 py-1 text-[length:var(--texto-sm)] text-[var(--cor-tinta-fraca)]">Compartilhadas comigo</p>
      <ul>
        {tasks.map((t) => (
          <li key={t.id}>
            <Link
              href={`/estrutura/tarefas/${t.id}`}
              className={`block truncate rounded px-2 py-1 text-[length:var(--texto-base)] hover:bg-[var(--cor-superficie-2)] ${pathname === `/estrutura/tarefas/${t.id}` ? "bg-[var(--cor-superficie-2)] text-[var(--cor-tinta)]" : "text-[var(--cor-tinta)]"}`}
            >
              {t.title}
              {t.dueDate ? <span className="text-[var(--cor-tinta-fraca)]"> · vence {t.dueDate.value.slice(0, 10).split("-").reverse().slice(0, 2).join("/")}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
