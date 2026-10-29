// Os tipos de tudo o que o navegador e o servidor trocam. Datas em texto: 'AAAA-MM-DD' para o dia
// (sempre o de Brasília) e ISO para o momento. Dinheiro em centavos.

export type Ponto = { lat: number; lng: number }

// Uma das 5.571 cidades do IBGE (código, nome, UF e o centro)
export type Cidade = { codigo: number; nome: string; uf: string; lat: number; lng: number }

// ---------- A marca (o app com a cara de cada um) ----------

export type PresetVisual = 'ferro' | 'neon' | 'clean' | 'energia' | 'tatame' | 'zen' | 'ritmo' | 'oceano' | 'classica'
export type FonteTitulo = 'big-shoulders' | 'anton' | 'oswald' | 'bebas' | 'unbounded' | 'space-grotesk' | 'montserrat' | 'fraunces' | 'playfair' | 'dm-serif' | 'lobster'

export type Visual = {
  preset: PresetVisual
  destaque?: string // a cor de destaque (#rrggbb); sem ela, a do estilo
  fonte?: FonteTitulo
  fontePropria?: { id: string; nome: string } // a fonte da marca (premium)
  logo?: string // id da imagem
  capa?: string
  nomeApp?: string // o nome curto do ícone na tela inicial
  boasVindas?: string
}

// ---------- Contas ----------

export type PapelEmpresa = 'dono' | 'gerente' | 'recepcao' | 'professor'
export type PlanoAluno = 'gratis' | 'mais'

export type MarcaPrincipal = { tipo: 'empresa' | 'profissional'; id: string }

export type Usuario = {
  id: string
  nome: string
  usuario: string // o @ do perfil (turma.app/u/ana.souza)
  email?: string
  celular?: string
  foto?: string
  bio?: string
  publico: boolean // perfil público (seção 6 do estudo)
  cidade?: Cidade
  raio?: number
  plano: PlanoAluno
  maisAte?: string
  metaSemanal: number // treinos por semana que contam a sequência
  profissional?: boolean // tem o perfil profissional (personal e/ou professor)
  empresas?: { slug: string; papel: PapelEmpresa }[]
  principal?: MarcaPrincipal // a marca que o app veste
  consentimentos: { medidas: string[] } // profissionais que podem ver as medidas
  bloqueados?: string[] // quem a pessoa bloqueou
  criadaEm: string
  demo?: boolean
  visita?: boolean // conta de quem experimenta (some em um dia)
  bloqueado?: boolean
}

// O que qualquer um vê de uma pessoa
export type PessoaResumo = { id: string; nome: string; usuario: string; foto?: string; mais?: boolean; profissional?: boolean }

// ---------- Profissional (personal e professor) ----------

export type PlanoProfissional = 'teste' | 'basico' | 'premium' | 'nenhum'

export type LocalAtendimento =
  | { tipo: 'unidade'; empresa: string; unidade: string }
  | { tipo: 'domicilio' }
  | { tipo: 'online' }
  | { tipo: 'outro'; nome: string; ponto?: Ponto }

export type Janela = { dia: number; inicio: string; fim: string }

export type ConfigAgenda = {
  ativa: boolean
  janelas: Janela[] // os horários livres da semana
  duracao: number // minutos por sessão
  antecedencia: number // horas mínimas para o aluno marcar
  cancelarAte: number // horas antes, para o aluno desmarcar
  alunoMarca: boolean // o aluno marca sozinho nos horários livres
  locais: string[] // "Força Total · Centro", "Domicílio", "Parque", "Online"
}

export type NumerosProfissional = {
  alunosInstruidos: number // todos que já teve
  alunosAtivos: number
  fichas: number
  treinos: number // treinos feitos pelos alunos com as fichas dele
  nota: Nota
}

export type Profissional = {
  id: string // a conta
  slug: string // a página (turma.app/rafael-moreira)
  nome: string
  personal: boolean // atende por conta própria (assina o plano)
  cref?: string
  especialidades: string[]
  modalidades: string[]
  bio?: string
  foto?: string
  cidade: Cidade
  raioKm: number
  online: boolean
  locais: LocalAtendimento[]
  publico: boolean
  visual: Visual
  plano: PlanoProfissional
  testeAte?: string
  status: 'teste' | 'ativo' | 'suspenso'
  agenda: ConfigAgenda
  numeros: NumerosProfissional
  whatsapp?: string
  instagram?: string
  criadoEm: string
  demo?: boolean
}

// ---------- Empresa (academia, rede, estúdio, CT...) ----------

export type TipoEmpresa = 'academia' | 'rede' | 'estudio' | 'box' | 'ct' | 'danca' | 'aquatica'
export type PlanoEmpresa = 'teste' | 'basico' | 'premium'

export type HorarioDia = { dia: number; abre: string; fecha: string } // sem o dia: fechado

export type Unidade = {
  id: string
  nome: string // "Centro"
  endereco: string
  bairro?: string
  cidade: Cidade
  ponto: Ponto
  whatsapp?: string
  horario: HorarioDia[]
  comodidades: string[]
  agregadores: ('wellhub' | 'totalpass')[]
  precoDesde?: number // a mensalidade a partir de (centavos)
  ativa: boolean
}

export type Faixa = { id: string; nome: string; cor: string; ponta?: string; graus?: number }
export type SistemaGraduacao = { id: string; nome: string; faixas: Faixa[]; kids?: Faixa[] }

export type ModalidadeOferecida = {
  id: string // do catálogo (src/shared/modalidades.ts)
  descricao?: string
  inclusa: boolean // vem no plano da academia
  precoDesde?: number
  niveis: string[]
  publicos: string[]
  graduacao?: SistemaGraduacao
}

export type Aula = {
  id: string
  modalidade: string
  unidade: string
  dias: number[] // 0 = domingo
  inicio: string // '19:00'
  duracao: number
  sala?: string
  professor?: string // conta
  vagas: number // 0 = sem limite
  reserva: boolean
  lugares?: number // lugar marcado (bikes, aparelhos)
  nivel?: string
  publico?: string
  ativa: boolean
}

export type MembroEquipe = { id: string; nome: string; papel: PapelEmpresa; unidades: string[]; desde: string }

export type Evento = { id: string; titulo: string; descricao?: string; data: string; inicio: string; unidade?: string; modalidade?: string; vou: string[] }

export type Empresa = {
  slug: string
  nome: string
  tipo: TipoEmpresa
  descricao?: string
  cnpj?: string
  dono: string
  equipe: MembroEquipe[]
  unidades: Unidade[]
  modalidades: ModalidadeOferecida[]
  grade: Aula[]
  eventos: Evento[]
  visual: Visual
  plano: PlanoEmpresa
  planoDepois?: Exclude<PlanoEmpresa, 'teste'> // o plano escolhido para depois do teste
  status: 'teste' | 'ativa' | 'suspensa'
  testeAte?: string
  agendaProfessores: boolean
  instagram?: string
  site?: string
  numeros: { alunos: number; nota: Nota; treinosSemana: number }
  criadaEm: string
  demo?: boolean
}

// ---------- Vínculos ----------

export type Vinculo = {
  tipo: 'empresa' | 'profissional'
  id: string // slug da empresa ou a conta do profissional
  unidade?: string
  status: 'ativo' | 'pendente' | 'encerrado'
  desde: string
  ate?: string
  origem: 'convite' | 'pedido' | 'demo'
}

// O aluno visto do painel da empresa ou do profissional
export type AlunoDoPainel = {
  id: string
  nome: string
  usuario: string
  foto?: string
  status: Vinculo['status']
  desde: string
  unidade?: string
  responsavel?: string // o professor que cuida (na academia)
  modalidades: string[]
  faixas: Record<string, { faixa: string; graus: number; desde: string; por: string }[]>
  ultimoTreino?: string
  treinosSemana: number
  fichaAtual?: { id: string; titulo: string; previsao: string }
  medidas: boolean // o aluno deixou ver as medidas
}

export type Convite = {
  codigo: string
  tipo: 'aluno' | 'professor'
  de: { tipo: 'empresa' | 'profissional'; id: string; unidade?: string }
  nome?: string
  contato?: string
  criadoEm: string
  expira: string
  usadoPor?: string
}

// ---------- Fichas ----------

export type Tecnica = 'normal' | 'bi-set' | 'tri-set' | 'drop-set' | 'piramide' | 'rest-pause' | 'isometria'

export type ItemFicha = {
  id: string
  exercicio: string // do catálogo ou "p-<id>" (próprio do profissional)
  series: number
  reps: string // "12", "8-12", "40s"
  carga?: number // kg sugerido
  descanso: number // segundos
  tecnica?: Tecnica
  cadencia?: string // "2-0-1"
  obs?: string
}

export type Divisao = { id: string; nome: string; foco?: string; dias?: number[]; itens: ItemFicha[] }

export type ContextoFicha = { tipo: 'empresa'; id: string; unidade?: string } | { tipo: 'profissional'; id: string } | { tipo: 'propria' }

export type Ficha = {
  id: string
  aluno: string
  autor: string
  autorNome: string
  contexto: ContextoFicha
  titulo: string
  objetivo?: string
  inicio: string
  previsao: string // a data de previsão (trocar a ficha)
  online?: boolean
  divisoes: Divisao[]
  obs?: string
  status: 'rascunho' | 'ativa' | 'arquivada'
  modelo?: string // o modelo de onde veio
  criadaEm: string
  atualizadaEm: string
  publicadaEm?: string
  vistaEm?: string
}

export type ModeloFicha = { id: string; autor: string; titulo: string; objetivo?: string; semanas: number; divisoes: Divisao[]; obs?: string; usos: number; criadoEm: string }

export type ExercicioProprio = { id: string; autor: string; nome: string; grupo: string; base?: string; equipamento?: string; video?: string; instrucoes?: string; criadoEm: string }

// ---------- Treinos feitos ----------

export type SerieFeita = { reps: number; carga: number; feita: boolean }
export type ExercicioFeito = { exercicio: string; nome: string; series: SerieFeita[]; obs?: string }
export type Recorde = { exercicio: string; nome: string; tipo: 'carga' | 'forca'; valor: number; antes?: number }

export type Treino = {
  id: string
  conta: string
  nome: string
  origem: 'ficha' | 'livre' | 'aula'
  ficha?: string
  divisao?: string
  modalidade?: string // treino de aula
  inicio: string
  fim: string
  duracaoMin: number
  exercicios: ExercicioFeito[]
  volume: number
  series: number
  recordes: Recorde[]
  esforco?: number
  nota?: string
  local?: { empresa: string; unidade: string }
  post?: string
}

// ---------- Medidas ----------

export type Circunferencia = 'pescoco' | 'ombro' | 'peito' | 'bracoD' | 'bracoE' | 'cintura' | 'abdomen' | 'quadril' | 'coxaD' | 'coxaE' | 'panturrilha'

export type Medida = {
  id: string
  data: string
  peso?: number
  altura?: number
  gordura?: number
  circ: Partial<Record<Circunferencia, number>>
  fotos: string[]
  obs?: string
  por?: { id: string; nome: string } // avaliação física feita pelo profissional
}

// ---------- Agenda ----------

export type Sessao = {
  id: string
  profissional: string
  aluno: string
  alunoNome: string
  data: string
  inicio: string
  fim: string
  local?: string
  status: 'marcada' | 'cancelada' | 'feita' | 'faltou'
  criadaPor: 'aluno' | 'profissional'
  fixa?: string
  obs?: string
}

export type SessaoFixa = { id: string; aluno: string; alunoNome: string; dias: number[]; inicio: string; duracao: number; local?: string; desde: string }

// ---------- Aulas (as reservas de cada dia) ----------

export type Reserva = { conta: string; nome: string; lugar?: number; em: string }
export type SituacaoAula = { reservas: Reserva[]; espera: Reserva[]; presentes: string[] }
export type FolhaDoDia = Record<string, SituacaoAula> // por aula

export type PedidoExperimental = {
  id: string
  conta: string
  nome: string
  aula: string
  modalidade: string
  unidade: string
  data: string
  status: 'novo' | 'confirmado' | 'feito' | 'recusado'
  em: string
  conversa?: string
}

// ---------- Rede ----------

export type TipoPost = 'treino' | 'aula' | 'conquista' | 'foto'
export type Marcado = { tipo: 'empresa' | 'profissional' | 'pessoa'; id: string; nome: string; link?: string } // o link vem na leitura

export type Post = {
  id: string
  autor: string
  tipo: TipoPost
  texto?: string
  foto?: string
  criadoEm: string
  treino?: { nome: string; duracaoMin: number; volume: number; series: number; exercicios: number; recordes: number }
  aula?: { modalidade: string; nome: string }
  conquista?: { tipo: 'recorde' | 'faixa' | 'desafio' | 'sequencia'; texto: string }
  local?: { empresa: string; unidade: string; nome: string }
  marcados: Marcado[]
  ponto?: Ponto // onde (a unidade marcada ou a cidade de quem postou): o feed da região
  fortes: string[] // quem deu 💪
  comentarios: number
  privado?: boolean // perfil privado: só os seguidores aprovados
  denuncias: string[]
  oculto?: boolean
  visita?: boolean // post de quem experimenta: só ele vê
}

export type Comentario = { id: string; autor: string; texto: string; criadoEm: string; denuncias?: string[]; oculto?: boolean; visita?: boolean }

export type Pontuacao = 'dias' | 'checkins' | 'minutos'

export type Participante = { nome: string; pontos: number; dias: string[]; checkins: number; minutos: number; ultimo?: string }

export type Desafio = {
  id: string
  nome: string
  descricao?: string
  criador: string
  oficial?: { tipo: 'empresa' | 'profissional'; id: string; nome: string }
  inicio: string
  fim: string
  pontuacao: Pontuacao
  codigo: string
  publico: boolean
  premio?: string
  participantes: Record<string, Participante>
  criadoEm: string
  demo?: boolean
}

// ---------- Conversas ----------

export type Lado = { tipo: 'conta' | 'empresa'; id: string }
export type Mensagem = { id: string; de: string; lado: Lado; texto: string; em: string; tipo?: 'texto' | 'experimental' }

export type Conversa = {
  id: string
  lados: [Lado, Lado]
  mensagens: Mensagem[]
  lidas: Record<string, string> // "conta:id" ou "empresa:slug" → até quando leu
  criadaEm: string
  atualizadaEm: string
}

// ---------- Avisos (o sino) ----------

export type TipoAviso =
  | 'ficha'
  | 'ficha-vencendo'
  | 'sessao'
  | 'aula'
  | 'espera'
  | 'experimental'
  | 'forte'
  | 'comentario'
  | 'seguidor'
  | 'pedido-seguir'
  | 'mensagem'
  | 'desafio'
  | 'avaliacao'
  | 'convite'
  | 'vinculo'
  | 'graduacao'
  | 'marcado'

export type Aviso = { id: string; tipo: TipoAviso; texto: string; link: string; em: string; lido?: boolean }

// ---------- Avaliações ----------

export type Nota = { media: number; total: number }

export type Avaliacao = {
  de: string
  deNome: string
  estrelas: number
  motivos: string[]
  texto?: string
  em: string
  resposta?: { texto: string; em: string }
}

// ---------- Plataforma ----------

export type ConfigPlataforma = {
  precos: {
    alunoMais: number
    alunoMaisAno: number
    personalBasico: number
    personalPremium: number
    academiaBasico: number
    academiaPremium: number
  }
  limites: {
    fichasProprias: number
    divisoesProprias: number
    diasGrafico: number
    fotosGratis: number
    desafiosGratis: number
    alunosPersonalBasico: number
    alunosAcademiaBasico: number
  }
  descontoRede: number // a partir de 3 unidades
  diasTeste: number
  raioPadrao: number
  cadastroAberto: boolean
  aviso: string
}
