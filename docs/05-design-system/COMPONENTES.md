# Componentes base

**Fase 5.** Dezessete componentes em `app/src/design/components.tsx`, mais os tokens em `app/src/design/tokens.css`. A amostra viva em `/design` existiu durante a Fase 5 e foi removida ao fim da Fase 6, como a etapa 6.6 do PRD pede: os componentes se conferem hoje nas próprias telas, e `design/tokens.test.ts` guarda o contraste.

**A regra que vale para todos:** nenhum componente escreve uma cor. Todos leem token. Um hex escrito à mão funcionaria no tema claro e quebraria no escuro **sem erro nenhum** — é o pior tipo de defeito, silencioso e invisível para quem escreveu.

---

## Como os tokens se organizam

`tokens.css` define cada valor uma vez, com os dois temas na mesma declaração, via `light-dark()`:

```css
--cor-papel: light-dark(#f5f5f4, #1c1917);
--cor-superficie: light-dark(#ffffff, #292524);
```

A alternativa — um bloco `[data-tema="escuro"]` duplicando tudo — obriga a lembrar de dois lugares a cada token novo. E o dia em que alguém esquecer é o dia em que o tema escuro começa a mentir.

O tema segue o sistema operacional por padrão (`color-scheme: light dark`); a escolha explícita do usuário grava `data-tema` na raiz e ganha nas duas direções.

**Duas regras mudam no escuro, não só valores:**
1. A superfície fica **mais clara** que o fundo — elevação no escuro é luz, não sombra.
2. As cores semânticas sobem em luminosidade e descem em saturação, porque o mesmo significado precisa de valores diferentes para manter contraste AA.

---

## Botão

`Button` — quatro variantes: `primary`, `secondary`, `danger`, `ghost`.

Os nomes das variantes são em inglês, como todo identificador do projeto; só o texto visível é pt-BR.

Altura fixa `--altura-controle` (32 px), raio de 4 px. **Sem pílula.**

**Contrato:** `disabled` sempre acompanhado de `disabledReason`.

E o motivo precisa **chegar a quem não usa mouse**. Um `<button disabled>` nativo não recebe foco e não anuncia `title`: o motivo existiria só para o ponteiro. Por isso o botão desabilitado continua focável via `aria-disabled`, o clique é engolido, e o texto vai junto num `aria-describedby` — o mesmo motivo, para todo mundo.

```tsx
<Button variant="primary" disabled disabledReason="2 itens de checklist abertos nesta Tarefa.">
  Concluir
</Button>
```

## Campo

`Field` (rótulo + dica + erro) envolvendo `TextInput` ou `TextArea`.

O rótulo é **sempre visível**, nunca substituído por placeholder — um placeholder some quando o usuário digita, e some justamente quando ele precisa conferir o que está preenchendo. O `id` é gerado por `useId` e passado ao filho por função, então o `htmlFor` nunca se desalinha.

O erro **substitui** a dica, em vermelho, com `role="alert"`.

## Seletor único e múltiplo

`Select` e `MultiSelect`, ambos com busca opcional.

Uma opção que não pode ser escolhida traz `disabledReason` e aparece desabilitada **com o motivo** — não some da lista. Sumir esconde a existência da opção e deixa o usuário procurando o que já viu antes.

O `MultiSelect` mostra os escolhidos como `Chip` removível dentro do próprio controle.

Fecham por clique fora e por `Escape`.

## Chip e selo de estado

Três componentes que parecem um só e não são:

| Componente | Diz | Muda quando | Forma |
| --- | --- | --- | --- |
| `Chip` | uma Tag, um item escolhido | o usuário remove | retângulo com fundo tênue |
| `StateSeal` | o registro **é** isto | um ato acontece | retângulo com anel, cor semântica |
| `ConditionMarker` | o registro **está assim agora** | a causa cessa, sozinha | ponto + texto, sem fundo |

**Por que formas diferentes:** com a mesma forma, o usuário aprende a tratar os três igual — e passa a achar que "Vencida" é tão permanente quanto "arquivado". `StateSeal` não renderiza nada para `ativo`: um selo em todo registro é um selo que ninguém lê.

## Tabela densa

`DataTable<T>` com cabeçalho fixo e rolagem nos dois eixos.

Linha de 32 px (`--altura-linha-tabela`). O cabeçalho é `position: sticky` porque, sem isso, os nomes das colunas saem da tela exatamente quando as linhas ficam largas o bastante para precisar deles.

Aceita `caption` para leitor de tela.

**Não pagina sozinha.** A paginação é decisão da tela — mas a tela é obrigada a declarar o corte (§15).

## Quadro

`Board` + `BoardColumn`. Colunas de 256 px, roláveis na horizontal, com contagem e meta por coluna.

`onDrop` opcional habilita arrastar. A coluna vazia mostra texto próprio, nunca área em branco.

## Painel lateral, diálogo e menu

`SidePanel` — deslizante da direita, `role="dialog"`, fecha por `Escape` e por clique no fundo.

`ConfirmDialog` — **o único mecanismo de confirmação do produto.** `window.confirm` em um lugar e modal em outro é bug de inconsistência, e por isso não existe alternativa. Aceita `confirmDisabledReason`, que bloqueia o confirmar quando falta algo — é assim que a sucessão de Membro exige o Sucessor antes de deixar encerrar.

`ActionMenu` — o `⋯`. Item destrutivo em vermelho; item indisponível desabilitado com o motivo **escrito abaixo do rótulo**, não só no `title`.

Os três usam `--sombra-elevada` ou `--sombra-flutuante`, porque são elevação real. **Cartão em lista não tem sombra** — não flutua.

## Aviso

`Toast` em três tons: `success`, `error`, `neutral`.

`role="alert"` no erro e `role="status"` nos demais. A diferença importa: um erro precisa interromper o leitor de tela, um sucesso não.

## Estado vazio e sem acesso

`EmptyState` e `NoAccessState` são **componentes distintos, com aparência distinta**.

Confundi-los vaza nos dois sentidos: mostrar "vazio" onde há dado escondido mente sobre o conteúdo; mostrar "sem acesso" onde nada existe revela que ali há algo. A distinção precisa ser visual, porque a forma é lida antes do texto.

`EmptyState` diz o que aquilo é e qual o próximo passo, com ação opcional. Nunca é área em branco.

## Avatar por tipo de Ator

`ActorAvatar` — cinco tipos: Membro, Agente, Automação, Integração, Sistema.

**O Agente tem forma diferente, não só cor.** O Membro é círculo; todos os não humanos são quadrado arredondado. Uma ação registrada "em nome de" precisa deixar óbvio quem agiu — e cor sozinha falha para quem não distingue cores.

Carrega `sr-only` com nome e tipo por extenso.

## Editor de texto

`RichText` — negrito, itálico e lista. Nada além.

Um Comentário neste produto é um parágrafo. Cada controle a mais é uma decisão que o autor tem de tomar em vez de escrever.

## Linha do tempo de Atividade

`ActivityTimeline` — cada entrada com ator, delegado quando houver, ação e o par antes → depois.

O ponto da linha usa a cor do tipo de ator, o que torna visível de relance quando uma sequência foi feita por Agente em vez de por gente.

Vazia, cai para `EmptyState`.

## Seletor de Status por categoria

`StatusPicker` — agrupa por **categoria**, e a mostra ao lado de cada nome.

É a categoria, não o nome, que decide se a Tarefa está encerrada: "Concluído" numa Lista pode ser categoria `concluido` e noutra `fechado`. Esconder a categoria transforma isso em armadilha.

`terminalBlockReason` desabilita as categorias terminais **com o motivo**, quando a Lista já reprova a transição. O motivo é calculado do que já está na tela — o controle não espera o clique para falhar.

## Seletor de Etapa

`StagePicker` — as Etapas do Funil em ordem, com a probabilidade padrão.

**Ganho e perdido não são opções.** Toda Etapa é de progressão, e um Negócio encerrado preserva a última que ocupou; colocá-los aqui inventaria duas Etapas que não existem.

`allowedIds` desabilita as transições que o Funil não permite, com o motivo. Lista vazia significa "todas permitidas".

---

## Acessibilidade

Não foi verificação no fim — fixou vários valores.

**Contraste AA (4.5:1) em todo texto — e a conta é testada.** `--cor-tinta-fraca` é `#6b6560`: 5,27:1 sobre o papel, 5,39:1 sobre a superfície secundária. `--cor-tinta-tenue` (`#8a837e`, 3,4:1) é **não-textual**: ponto, divisor, régua. Nunca placeholder, nunca nome de registro.

Essa distinção não é zelo: `--cor-papel` começou `#fafaf9`, virou `#f5f5f4` numa revisão da direção visual, e os números escritos aqui continuaram sendo os antigos. O token caiu abaixo de AA em silêncio e a documentação afirmava o contrário.

Por isso `app/src/design/tokens.test.ts` lê os valores **do próprio `tokens.css`** e reprova o par que não atinge AA — nos dois temas, incluindo o estado de hover. São 73 asserções; mudar um token e quebrar o contraste agora falha o build, não a leitura de alguém.

**Foco visível sempre.** Anel de 2 px no acento com 2 px de deslocamento, em `:focus-visible` global. Não é removido em lugar nenhum.

**Teclado.** `Select` e `MultiSelect` seguem o padrão de caixa de combinação: `↓`/`↑` percorrem, `Home`/`End` saltam, `Enter` ou `Espaço` escolhem, `Escape` fecha. O foco permanece no gatilho e o item em destaque é anunciado por `aria-activedescendant` — por isso o gatilho declara `role="combobox"` e a lista, `role="listbox"` com `role="none"` nos `li`, senão a relação entre a lista e suas opções se quebra.

`SidePanel` e `ConfirmDialog` **prendem o foco**: ele entra ao abrir, circula com Tab dentro do diálogo e volta a quem o abriu ao fechar. Sem isso, o `aria-modal="true"` seria uma promessa falsa — o leitor de tela ouviria "isolado" e o cursor sairia para a página atrás.

Linha de tabela clicável recebe foco e responde a `Enter`. Todo controle é elemento real — `<button>`, `<input>`, `<select>` — nunca `<div>` clicável.

**Cor nunca é o único sinal.** Categoria de Status traz o rótulo por extenso; tipo de Ator traz forma além de cor; estado traz texto no selo.

**`prefers-reduced-motion`** desliga transição e animação em `globals.css`.

**Alvo de toque de 32 px** em todo controle. Abaixo disso, a densidade viraria hostilidade.

---

## O que estes componentes proíbem

Explicitamente, porque são o que uma interface gerada produz sozinha:

- hero decorativo
- gradiente, em qualquer lugar
- emoji como ícone — ícones são `lucide-react`, com `aria-label` quando são o único sinal
- sombra em todo cartão
- pílula em botão
- animação de entrada
- placeholder no lugar de rótulo
- `window.confirm` / `window.alert`
