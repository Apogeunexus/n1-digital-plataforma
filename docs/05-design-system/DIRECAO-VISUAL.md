# Direção visual

**Fase 5.** Duas propostas, uma escolhida. A pergunta não é "qual é mais bonita" — é **qual das duas sustenta um produto onde a tela mais importante é uma tabela densa cheia de estado**.

---

## 0. Nome do produto — provisório declarado

O PRD prevê que a marca seja fornecida pelo usuário ou que um nome provisório seja declarado. Nenhuma marca foi fornecida, então este projeto trabalha com **Auton**, que já é o nome do pacote (`app/package.json:2` — `auton-plataforma`) e a raiz do Espaço de Trabalho semeado ("Auton Health", `app/src/data/seed.ts:800`).

Não é uma decisão de marca: é um marcador para o produto ter nome nas telas em vez de "Sistema". Trocar o nome depois toca um token de conteúdo, não a identidade visual.

---

## 1. O que restringe a escolha

Antes de propor, o que o produto **é**, porque isso elimina metade das direções possíveis de saída:

**A tela mais usada é densa.** Uma Lista com 60 Tarefas, uma Caixa de Entrada com 20 Conversas, uma Auditoria com 239 Registros. Uma direção com respiro generoso transforma "ver o trabalho do dia" em rolagem.

**A cor carrega significado, não decoração.** O produto tem quatro sistemas semânticos independentes e simultâneos numa mesma tela: categoria de Status (4 valores), situação de Negócio (3), estado de Conversa (3) e estado de Execução (6). Somados aos estados de ciclo de vida (`ativo`, `arquivado`, `naLixeira`, `mesclado`, `rascunho`, `pausado`). São ~20 cores com obrigação de serem distinguíveis.

**Consequência dura:** o acento da marca tem de ser **único e discreto**, senão compete com o significado. Uma paleta de marca vibrante seria ruído sobre um vocabulário que já usa cor para dizer coisa.

**Identificadores precisam de monoespaçada.** `TSK-41`, `NEG-108` — o Identificador legível é copiado, comparado e lido em voz alta. Proporcional aqui é erro funcional.

**O produto tem quatro domínios** (Estrutura, CRM, Mensageria, IA) e a navegação precisa dizer onde você está sem escrever.

---

## 2. Direção A — "Papel técnico"

> Ferramenta de trabalho séria. O acento aparece pouco e por isso é ouvido.

**Base:** neutro levemente quente (não cinza puro — cinza puro sob luz de escritório fica azulado e cansa em jornada longa). Fundo `#FAFAF9`, superfície `#FFFFFF`, texto `#1C1917`.

**Acento único:** índigo profundo `#3730A3`. Aparece em: ação primária, item ativo da navegação, foco, link. Em nenhum outro lugar.

**Paleta nomeada (6):**

| Nome | Valor | Onde vive |
| --- | --- | --- |
| `tinta` | `#1C1917` | texto principal |
| `papel` | `#F5F5F4` | fundo da aplicação (ajustado na §4) |
| `superficie` | `#FFFFFF` | cartão, tabela, painel |
| `traco` | `#E7E5E4` | borda, divisor |
| `acento` | `#3730A3` | ação primária, foco, link |
| `tinta-fraca` | `#6B6560` | texto secundário, rótulo (5,27:1) |

**Par tipográfico:** Inter (interface) + JetBrains Mono (identificadores). Um par, não dois — a hierarquia vem de peso e tamanho, não de trocar de família.

**Densidade:** alta. Linha de tabela com 32 px, escala de espaçamento de 4 px, `text-sm` (14 px) como corpo padrão.

**Tom:** direto e específico. "2 itens de checklist abertos nesta Tarefa", não "Ação indisponível".

**Custo honesto:** é uma direção austera. Sem foto, sem ilustração, sem hero, ela pode parecer inacabada para quem espera um SaaS moderno — até perceber que cabem 40 linhas na tela.

---

## 3. Direção B — "Superfície fria"

> Produto de plataforma. Mais ar, mais contraste de superfície, presença visual maior.

**Base:** neutro frio com viés azul. Fundo `#F1F5F9`, superfície `#FFFFFF`, texto `#0F172A`.

**Acento único:** teal `#0D9488`, mais saturado e mais presente que o índigo — aparece também em barras de progresso e cabeçalhos de coluna ativos.

**Paleta nomeada (6):**

| Nome | Valor | Onde vive |
| --- | --- | --- |
| `tinta` | `#0F172A` | texto principal |
| `fundo` | `#F1F5F9` | fundo da aplicação |
| `superficie` | `#FFFFFF` | cartão elevado |
| `traco` | `#CBD5E1` | borda, divisor |
| `acento` | `#0D9488` | ação primária, progresso, foco |
| `sombra-tinta` | `#64748B` | texto secundário |

**Par tipográfico:** dois — Sora (títulos e cabeçalhos) + Inter (corpo), mais JetBrains Mono para identificadores. Três famílias no total.

**Densidade:** média. Linha de tabela com 44 px, escala de 4 px mas com passos maiores nas seções, `text-[15px]` como corpo.

**Tom:** mais conversacional. "Tudo em dia por aqui" em vez de "Nenhuma Tarefa atribuída a você".

**Custo honesto:** cabem ~25 linhas onde a Direção A cabe 40. O acento teal, sendo saturado, disputa atenção com os verdes semânticos de "concluído" e "ganho" — que é exatamente o conflito que a restrição §1 previa.

---

## 4. A escolha: Direção A

**Decidida a Direção A**, com um ajuste da B incorporado.

O motivo é o conflito que a própria Direção B expõe: um acento teal saturado colide com o verde de `concluido` e de `ganho`. Num produto onde a cor **é vocabulário**, um acento de marca que se parece com um significado é um defeito, não uma questão de gosto. O índigo da Direção A não se confunde com nenhuma das ~20 cores semânticas.

O segundo motivo é a densidade. A tela mais aberta deste produto é uma Lista de Tarefas; perder 40% das linhas visíveis para respiro é caro todo dia.

**O que veio da Direção B:** a ideia de que o fundo da aplicação e a superfície precisam contrastar de verdade. A Direção A original tinha `#FAFAF9` contra `#FFFFFF` — 1 % de diferença, invisível. Adotado o contraste de superfície da B, mantendo o neutro quente da A: fundo `#F5F5F4`, superfície `#FFFFFF`.

**O que foi descartado das duas:** a segunda família tipográfica. Sora para títulos daria personalidade, mas num produto de 51 telas onde o título é quase sempre o nome de um registro (que o usuário escreveu), a personalidade da fonte briga com o conteúdo.

> **Nota para o polimento.** A Direção B está descrita aqui em detalhe suficiente para ser adotada trocando os valores em `app/src/design/tokens.css` — os nomes dos tokens são os mesmos. Se você preferir a B, é uma troca de valores, não de código.

---

## 5. Como a cor semântica se organiza

O acento é único, então **todo o resto do significado precisa de um sistema próprio que não o imite**. Quatro escalas independentes:

**Categoria de Status** (A4.3 — é a categoria, não o nome, que decide o encerramento):

| Categoria | Cor | Por quê |
| --- | --- | --- |
| `naoIniciado` | cinza `#78716C` | ausência de movimento |
| `emAndamento` | âmbar `#B45309` | atenção sem alarme |
| `concluido` | verde `#15803D` | encerramento positivo |
| `fechado` | ardósia `#475569` | encerramento sem juízo de valor |

`concluido` e `fechado` são ambos terminais, mas dizer isso com a mesma cor apagaria a diferença entre "terminou bem" e "terminou".

**Situação de Negócio:** `aberto` azul-céu · `ganho` verde · `perdido` neutro escuro. Perdido **não é vermelho** — perder um Negócio é resultado normal do funil, não erro do sistema. Vermelho aqui treinaria o time a ler o funil como fracasso.

**Estado de Conversa:** `aberta` azul-céu · `pendente` âmbar · `resolvida` neutro.

**Estado de Execução** (seis valores): `pendente` e `executando` em cinza e azul; `aguardandoAprovacao` em violeta — é o único que exige ação humana, e merece uma cor que não aparece em nenhum outro sistema; `concluida` verde; `falhou` vermelho; `cancelada` neutro.

**Vermelho é reservado.** Só três coisas: ação destrutiva, erro real, e Execução que falhou. Vencida e Bloqueada são marcadores em âmbar e vermelho-texto, sem preenchimento — porque são condições que se resolvem sozinhas, não estados de erro.

**Cor por domínio na navegação.** Quatro matizes desaturados, presentes só no indicador da seção ativa e nunca em conteúdo: Estrutura ardósia, CRM âmbar, IA violeta, Painéis verde-azulado. Desaturados de propósito — o domínio orienta, não grita.

---

## 6. Tema claro e escuro

Os dois existem por token, não por classe duplicada. Todo componente lê `--cor-*`; o tema escuro redefine os valores.

No escuro, duas coisas mudam de regra, não só de valor:

1. **A superfície fica mais clara que o fundo, não mais escura.** Elevação no escuro é luz, não sombra.
2. **As cores semânticas sobem em luminosidade e descem em saturação.** O verde `#15803D` sobre branco vira `#4ADE80` sobre `#1C1917` — o mesmo significado precisa de valores diferentes para manter contraste AA.

---

## 7. O que esta direção proíbe

Explicitamente, porque são os padrões que uma interface gerada produz sozinha:

- **Hero decorativo.** Nenhuma tela abre com uma faixa grande e vazia.
- **Gradiente.** Em lugar nenhum, nem em botão, nem em fundo.
- **Emoji como ícone.** Ícones são `lucide-react`, com `aria-label` quando são a única indicação.
- **Sombra em todo cartão.** Sombra indica elevação real — painel lateral, diálogo, menu. Um cartão numa lista não flutua.
- **Borda arredondada grande.** Raio de 6 px em superfícies, 4 px em controles. Nada de pílulas em botão.
- **Animação de entrada.** Conteúdo aparece; não desliza. E `prefers-reduced-motion` desliga o pouco que existe.
- **Cor como único sinal.** Toda categoria colorida carrega rótulo textual junto.

---

## 8. Acessibilidade como restrição de origem

Não é uma verificação no fim — é o que fixa vários valores acima.

- **Contraste AA (4.5:1) para todo texto**, verificado por teste que lê os valores do próprio `tokens.css` (`app/src/design/tokens.test.ts`, 73 asserções nos dois temas). O texto secundário é `#6B6560` — 5,27:1 sobre o papel. O tom mais claro `#8A837E` (3,4:1) existe, mas é **não-textual**: ponto, divisor, régua.
- **Foco visível sempre**, com anel de 2 px no acento e deslocamento de 2 px, nunca removido.
- **Teclado nos seletores:** `↓`/`↑` percorrem, `Home`/`End` saltam, `Enter` escolhe, `Escape` fecha, com o item em destaque anunciado por `aria-activedescendant`. Linha de tabela clicável recebe foco e responde a `Enter`. Diálogo modal prende o foco e o devolve a quem o abriu.
- **`prefers-reduced-motion`** já respeitado desde a Fase 3 (`app/src/app/globals.css`).
- **Alvo de toque de 32 px** na densidade alta — abaixo disso a densidade viraria hostilidade.
