# Desenvolvimento do protótipo

O passo a passo do protótipo da Turma depois do estudo de caso ([estudo-de-caso.md](estudo-de-caso.md)).
Cada etapa termina com o que dá para ver funcionando, os testes passando e um commit. As caixas
marcadas são o que já está pronto.

## A base (a mesma da Régua, do Prato Cheio e da Mão Dupla)

- **App:** Vite, React 19, TypeScript estrito, Tailwind 4, Motion e Lenis; roteador próprio
  (`src/lib/rotas.tsx`, sem biblioteca); cada tela carregada sob demanda.
- **3D:** three.js puro, sem arquivos de modelo: o boneco, o equipamento e o palco são feitos em
  código (`src/components/three/boneco/`).
- **Mapas:** MapLibre com os mapas abertos do OpenFreeMap e os prédios em 3D; se os mapas não
  carregarem, um mapa desenhado com os mesmos marcadores. As cidades vêm do IBGE (o pacote
  `municipios-brasil`), carregadas só quando alguém digita.
- **Servidor:** Netlify Functions (uma por assunto: GET lê, POST com `acao` muda) e Netlify Blobs
  (chave e valor, escrita condicional com etag). Sem banco para manter.
- **Testes:** `node --test`, com o Blobs em memória e as funções rodando de verdade (`test/`).

## Decisões de implementação

- **Uma conta, vários papéis.** A mesma pessoa é aluno, personal, professor de várias academias e
  dona de uma academia. O perfil profissional é um só (a página `/diego-alves` mostra todos os
  lugares onde ele dá aula); o papel na empresa (`dono`, `gerente`, `recepcao`, `professor`) fica
  na equipe dela, e o servidor confere em cada ação (`netlify/lib/empresas.ts`, `PODE`).
- **Login:** e-mail ou celular e senha (scrypt; sessão num cookie assinado `HttpOnly` de 60 dias).
  O código por SMS ou WhatsApp entra quando houver um provedor.
- **Os endereços na raiz:** `/forca-total` (a empresa) e `/rafael-moreira` (o profissional), com as
  palavras do sistema reservadas (`src/shared/slug.ts`). O perfil da pessoa fica em `/u/<usuario>`.
- **O vínculo** (a academia, a unidade, o personal) nasce pelo convite (o link e o QR, de uso
  único ou para a turma toda) ou pelo pedido "sou aluno daqui", que a academia aprova. O limite do
  plano (15 alunos no personal Básico, 300 por unidade na academia Básica) é conferido na entrada.
- **O app com a marca:** o estilo (9 prontos), a cor de destaque (o contraste é conferido: o texto do
  botão sempre lê), a fonte (11, ou a própria no Premium), a logo, a capa, o nome no ícone e a
  mensagem de boas-vindas. Tudo vira variáveis de CSS (`--m-*`) por cima das da plataforma
  (`src/components/marca/Marca.tsx`); o `manifesto` dá o ícone e o nome para instalar na tela inicial.
  O aluno com mais de um vínculo escolhe qual marca o app veste.
- **A ficha:** as divisões (A, B, C...), cada exercício com séries, repetições (número ou faixa),
  carga, descanso, técnica e recado; a **data de previsão** da troca (em dia, trocando em breve,
  vencida); a próxima divisão roda sozinha. O profissional guarda **modelos** e manda o mesmo treino
  para outro aluno (as fichas iguais ficam ligadas: "o mesmo treino está com Ana e Bruna"). A ficha
  nova do mesmo profissional arquiva a anterior. O aluno grátis monta 1 ficha dele (até 4 divisões);
  as do professor e do personal são sem limite (quem paga é a academia ou o personal).
- **O treino ao vivo** fica no aparelho (`src/lib/treinoLocal.ts`) a cada toque: fecha o app, volta
  e está tudo lá; sem internet, o treino terminado entra numa fila e vai quando a conexão volta. O
  servidor recalcula tudo (volume, força estimada pela fórmula de Epley, recordes só contra o que já
  foi feito), ignora o mesmo treino mandado duas vezes e recusa o treino no futuro, longo demais ou
  com menos de um minuto.
- **A sequência** conta as semanas que bateram a meta do aluno (2 a 7 treinos), com uma semana
  perdoada por mês; os **desafios** contam a constância (dias ativos, check-ins ou minutos), nunca
  o corpo: treino curto não conta e é um check-in por hora.
- **As aulas:** a grade de cada unidade (dias, horário, duração, sala, professor, vagas, nível,
  público) e uma **folha por unidade por dia** com as reservas, a fila e a presença, gravada com
  escrita condicional: duas pessoas na última vaga, uma entra e a outra vai para a fila; quem cancela
  libera a vaga e a primeira da fila entra sozinha, com o aviso. A reserva abre 7 dias antes; o lugar
  marcado (a bike, o aparelho do pilates) é escolhido no mapa da sala. A aula experimental vira
  contato no painel com a conversa já aberta.
- **As faixas:** os sistemas de graduação das lutas (o jiu-jitsu com as faixas kids da IBJJF, o judô,
  o karatê, o taekwondo, o muay thai, o kickboxing e a capoeira) como padrão, e cada academia ajusta
  a lista dela. O professor gradua (o grau sobe até o limite e depois vem a próxima faixa) e a faixa
  vai para o perfil do aluno.
- **A agenda** do personal (e do professor, quando a academia liga): os horários por dia da semana,
  a duração, a antecedência e os bloqueios; os horários livres respeitam as sessões marcadas. As
  sessões fixas (toda terça às 7h) se repetem sozinhas.
- **As medidas** (peso, gordura, circunferências, fotos) são do aluno: o profissional só vê e lança a
  avaliação física com o consentimento dele, e as fotos de evolução só abrem para o dono e para quem
  ele deixou.
- **As avaliações:** só quem treina (ou treinou) avalia, uma por pessoa (dá para mudar), com os motivos
  de cada tipo; a nota aparece com 3 avaliações ou mais (antes, "Novo"); quem é avaliado responde em
  público.
- **A região:** a distância (Haversine) calculada no servidor sobre o índice das unidades e dos
  profissionais (`netlify/lib/explorar.ts`); o raio padrão é 50 km. O post leva o ponto da unidade
  marcada (ou da cidade de quem postou), e o feed "perto" usa o mesmo raio.
- **A rede:** o "treino pago" (o resumo vem do treino guardado, não do navegador), a foto, a
  conquista; o 💪 e os comentários; o perfil privado aprova quem segue; três denúncias escondem até a
  revisão; o bloqueio some com a pessoa do feed e da conversa. O texto não aceita telefone nem link.
- **O chat:** aluno com aluno quando os dois se seguem; com o profissional, a academia e a equipe,
  sempre. A academia responde pela caixa dela (`como=<endereço>`), que a recepção e a gerência veem.
- **Os planos:** a mesma regra no navegador e no servidor (`src/shared/planos.ts`); no teste de 30
  dias, tudo do Premium. O que a academia e o personal pagam nunca trava o aluno deles. As
  assinaturas são simuladas no protótipo e as telas dizem isso.
- **O destaque** é do Premium e com nota 4 ou mais (ou "Novo"), no máximo 3 por vez no topo do
  Explorar, com o selo discreto; nenhum anúncio no feed.
- **O admin** (`/admin`): a senha do `ADMIN_PASSWORD` e o código do `ADMIN_TOTP` (se definido); 8
  tentativas erradas travam o endereço por 15 minutos; a sessão dura 12 horas. Toda ação fica no
  registro, sem apagar, e as que mexem com alguém pedem o motivo. Os números de cada dia separam a
  demonstração.
- **A demonstração** (`netlify/lib/semente.ts`) nasce no primeiro acesso, tem versão (muda no deploy
  novo e o servidor recria) e se recria a cada três dias. O endereço que já é de uma página de
  verdade nunca é sobrescrito. Quem experimenta como aluno ganha uma cópia da Ana só dele, que não
  aparece para os outros e some em um dia (`netlify/lib/visitas.ts`). O admin recria na hora ou
  apaga tudo para o lançamento.
- **Limites por janela de tempo** em cada ação que escreve (cadastro, treino, post, comentário,
  mensagem, reserva, denúncia, avaliação...), e as funções só aceitam JSON da própria origem.

## Etapas

### 1. Estudo de caso

- [x] O mercado (os sistemas de academia, os apps de ficha, os de treino e a rede), quem usa, os
  fluxos, a pesquisa das modalidades (42 em 10 famílias, com o que cada família pede), o 3D, os
  planos e os limites, a nutrição da fase 2, os riscos e as decisões (`docs/estudo-de-caso.md`)

### 2. O servidor

- [x] Contas, sessão, perfil e privacidade; a academia (com as unidades no mapa), o profissional, os
  vínculos e os convites
- [x] Fichas, modelos e os treinos registrados; aulas com a folha do dia, a fila e a presença;
  agenda; medidas com o consentimento; avaliações; desafios
- [x] A rede (feed da região, comentários, denúncias, seguir, bloquear) e as conversas
- [x] A demonstração e os testes de cada área

### 3. O boneco 3D

- [x] O esqueleto, o corpo, o equipamento e os movimentos dos 43 exercícios, com os músculos acesos
  na cor da marca e os pontos de atenção
- [x] O palco: a luz que anda com a câmera, o enquadramento pelos pontos do movimento, as vistas
  (frente, lado, 3/4, costas), o devagar e o movimento reduzido; o laboratório em `/lab`
- [x] Os testes do boneco: a mão chega na barra, o pé no chão, nada atravessa o chão, sem saltos

### 4. A landing, o mapa e as páginas públicas

- [x] A capa "Onde você treina?" com os números da região e o boneco, o "experimente sem cadastro",
  as portas, como funciona, "monte o seu app", os planos e as perguntas
- [x] O Explorar (mapa e lista, filtros, destaques) e os cadastros (aluno, personal, professor,
  academia ou rede)
- [x] As páginas da academia, do profissional e da pessoa, e o convite

### 5. O app do aluno

- [x] Início, fichas, a ficha própria, o treino ao vivo (com o 3D, o descanso e o treino pago),
  histórico, evolução, medidas, agenda, aulas, desafios, conta e avisos

### 6. A rede e o chat

- [x] O feed (perto, seguindo, a academia), o post, os comentários, os pedidos, as mensagens e a
  caixa da academia

### 7. O painel do profissional

- [x] Hoje, alunos, o aluno (fichas, treinos, medidas, faixas), fichas, modelos e exercícios
  próprios, o montador com o catálogo 3D, a agenda e a página (dados, locais, marca, plano)

### 8. O painel da academia e da rede

- [x] Visão geral, alunos (aprovar, unidade, responsável, modalidades, graduar), grade e a presença
  do dia, fichas, aula experimental, modalidades com o editor de faixas, unidades no mapa, equipe,
  eventos e desafios oficiais, avaliações, página e app, plano
- [x] Os papéis: o que o dono, o gerente, a recepção e o professor veem e fazem

### 9. O admin e o acabamento

- [x] O admin: visão geral com a receita e a atividade, empresas, profissionais, contas, moderação,
  plataforma (com o aviso no topo e o cadastro aberto ligados de verdade), registro, recriar e
  apagar a demonstração
- [x] README, este arquivo e o conteúdo para confirmar (`conteudo.md`)
- [x] Conferido no navegador em 390 px e 1440 px (o aluno, o profissional, a academia e o admin)
