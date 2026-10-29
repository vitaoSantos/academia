# Conteúdo para confirmar antes de publicar

Itens marcados com **[?]** precisam de resposta; os marcados com ✅ já foram decididos (seção 26 do
[estudo de caso](docs/estudo-de-caso.md)). Depois é só preencher nos arquivos indicados (ou no
`/admin`). Os números são os que valem hoje no protótipo.

## Marca

- **Nome:** **Turma** ("sua academia, seu personal e a sua turma num app só"). Outras opções do
  estudo: Pegada, Bora e Treino Pago. [?]
- **Domínio** (`turma.app`, usado nos endereços das páginas, como `turma.app/forca-total`) e o
  **registro do nome no INPI**: ainda não foram conferidos nem comprados. [?] O nome, o domínio e o
  e-mail ficam num lugar só: `src/data/marca.ts`.
- **E-mail e telefone de contato** da plataforma (o suporte, as academias, a imprensa). Hoje está
  `contato@turma.app`, que ainda não existe. [?]
- **Símbolo:** a anilha vista de frente (o aro amarelo, o miolo e o furo da barra), feito em código
  (`src/components/ui/basicos.tsx`). Se houver um logo, dá para trocar. ✅
- **Cores e fontes:** o grafite da academia e o amarelo da anilha (`#f5c518`), Big Shoulders Display
  nos títulos e Manrope no texto (`src/index.css`); escuro por padrão, com o claro e o do sistema na
  conta. ✅
- **A frase do check-in** na rede: "Treino pago". ✅

## Planos e preços (`/admin` → Plataforma)

- **Aluno:** grátis, ou **Turma+** a R$ 12,90 por mês (R$ 99 por ano). [?]
- **Personal:** Básico R$ 39,90 (até 15 alunos ativos) e Premium R$ 79,90 (sem limite, destaque,
  fonte própria, desafios, relatório, exercícios com vídeo). [?]
- **Academia:** Básico R$ 149 por unidade (até 300 alunos ativos por unidade) e Premium R$ 279 por
  unidade (sem limite, destaque, desafios oficiais e eventos, relatórios, fonte própria); a partir de
  3 unidades, 15% de desconto de rede. [?]
- **Teste:** 30 dias com tudo do Premium, sem cartão, para a academia e o personal. ✅
- **O grátis do aluno:** 1 ficha própria (até 4 divisões), 90 dias de gráfico, 3 fotos de evolução e
  1 desafio criado por vez; as fichas do professor e do personal são sem limite. ✅ (os números no
  admin)
- **O destaque:** só Premium e com nota 4 ou mais (ou "Novo"), no máximo 3 por vez, sem anúncio no
  feed. ✅
- **O que cada plano inclui** (o texto da landing e dos painéis): `src/shared/planos.ts`. ✅
- **Cobrança:** ainda não existe; as assinaturas são simuladas e mudam na hora. Escolher a empresa
  de pagamento (Asaas, Mercado Pago, Efí, Stripe), o que acontece com quem atrasa (hoje o admin
  suspende à mão) e se o personal vai cobrar o aluno pela plataforma (fase 2, com taxa). [?]

## A região e o mapa

- **O raio:** 50 km por padrão, com 10, 25 e 100 (o padrão muda no admin). ✅ São Lourenço não vê
  Poços de Caldas (161 km); Caxambu (25 km) aparece. ✅
- **Os mapas:** OpenFreeMap, grátis e sem garantia. Para operar, um provedor com contrato (MapTiler,
  Stadia, Mapbox). [?]

## As modalidades e as faixas (`src/shared/modalidades.ts` e `src/shared/graduacao.ts`)

- **42 modalidades em 10 famílias** (musculação, funcional e cross, coletivas, bike, corpo e mente,
  lutas, dança, aquáticas, ar livre, públicos especiais). Falta alguma da região? [?]
- **As faixas padrão:** o jiu-jitsu segue a IBJJF (com as kids); judô, karatê, taekwondo, muay thai,
  kickboxing e capoeira seguem a sequência mais comum no Brasil. Cada federação, estilo e grupo tem
  a sua, e a academia ajusta no painel. Conferir os padrões com um professor de cada luta. [?]
- **Agenda dos professores da academia:** opcional, desligada por padrão. ✅

## Os exercícios em 3D (`src/shared/exercicios.ts`)

- **43 exercícios** com os músculos, o equipamento, o passo a passo e os pontos de atenção. **Quem
  revisa** o texto e o movimento de cada um antes de publicar (um profissional de educação física
  com CREF)? [?]
- **O laboratório** (`/lab`) mostra cada movimento em câmera lenta, para a revisão. ✅

## Fichas e treino

- **A data de previsão** da troca: 6 semanas por padrão no montador; a ficha aparece como "trocando
  em breve" na última semana e "vencida" depois. [?]
- **Prescrição a distância** (CONFEF 542/2024): a ficha online é revista a cada 30 dias. Confirmar a
  regra com o CREF-MG. [?]
- **O treino que conta:** pelo menos 1 minuto para ser guardado; no desafio, treino curto não conta e
  é um check-in por hora. ✅
- **A sequência:** as semanas que batem a meta do aluno (de 2 a 7 treinos), com uma semana perdoada
  por mês. ✅

## Aulas

- **A reserva** abre 7 dias antes; lotou, entra na fila, e a primeira da fila entra sozinha quando
  alguém cancela. O cancelamento fecha 2 horas antes da aula (`src/shared/aulas.ts`). ✅ **E quem
  reserva e falta?** Hoje não acontece nada (dá para bloquear a reserva por uns dias depois de N
  faltas). [?]
- **A aula experimental:** um pedido em aberto por academia (e até 6 por dia); a academia confirma e
  a vaga fica reservada. Depois de feita, a pessoa pode pedir outra: limitar a uma por academia? [?]

## A rede e o chat

- **O que não pode** no texto: telefone e link (`src/shared/texto.ts`). ✅
- **Os motivos da denúncia:** conteúdo impróprio, assédio ou ofensa, golpe ou spam, foto de outra
  pessoa sem autorização, outro (`netlify/lib/rede.ts`); três denúncias escondem até a revisão. ✅
- **O chat entre alunos** só com o seguir dos dois lados; com o profissional e com a academia,
  sempre. ✅
- **Menores de idade:** a partir de qual idade a conta é do próprio aluno (a proposta é 16, com as
  turmas kids na conta do responsável). Hoje o cadastro não pergunta a idade. [?]

## Textos legais

- **Os termos de uso e a política de privacidade** ainda não existem; o cadastro já diz que a pessoa
  aceita os dois. Precisam cobrir as medidas e as fotos (dado sensível, LGPD), o consentimento para o
  profissional ver, o perfil público e a demonstração. [?]
- **O aviso de que o app não substitui o profissional** nos exercícios e (na fase 2) na nutrição. [?]

## A demonstração (`netlify/lib/semente.ts`)

- **São Lourenço (MG) e região:** a Força Total (rede com 4 unidades), o CT Tatame Sul, o Studio
  Equilíbrio, a Escola de Dança Compasso, a Academia Águas Claras, o Box Serra Cross e a Academia
  Vértice; os personais Rafael, Camila e Patrícia; o professor Diego; e os alunos. Os nomes, os
  endereços e os telefones (DDD 00) são de mentira. ✅
- **No lançamento:** apagar a demonstração no admin (ou subir com `TURMA_SEM_DEMONSTRACAO=1`). Deixar
  o "experimente sem cadastro" no ar depois de ter clientes de verdade? [?]

## Os textos da landing (`src/components/landing/` e `src/paginas/Landing.tsx`)

- A capa ("Onde você treina?"), as portas, como funciona, "monte o seu app", os planos e as
  perguntas frequentes estão escritos; falta a revisão final do texto e as perguntas que os primeiros
  clientes fizerem. [?]
