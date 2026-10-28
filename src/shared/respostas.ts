import type {
  AlunoDoPainel,
  Avaliacao,
  Aviso,
  Cidade,
  ConfigAgenda,
  Desafio,
  Empresa,
  ExercicioProprio,
  Ficha,
  HorarioDia,
  Lado,
  Medida,
  Mensagem,
  ModeloFicha,
  Nota,
  PedidoExperimental,
  PessoaResumo,
  Ponto,
  Post,
  Profissional,
  Comentario,
  Sessao,
  SessaoFixa,
  Treino,
  TipoEmpresa,
  Usuario,
  Vinculo,
  Visual,
  Aula,
  Evento,
} from './tipos.ts'

// O formato do que as funções do servidor devolvem, usado dos dois lados.

// ---------- Sessão ----------

export type MarcaResumo = { tipo: 'empresa' | 'profissional'; id: string; slug: string; nome: string; visual: Visual }

export type RespostaSessao = {
  usuario: Usuario | null
  profissional?: Profissional | null
  empresas?: (MarcaResumo & { papel: string })[]
  naoLidas?: { avisos: number; mensagens: number }
}

// ---------- O que qualquer um vê ----------

export type EmpresaPublica = Omit<Empresa, 'cnpj' | 'dono' | 'equipe'> & {
  equipe: { id: string; nome: string; papel: string; unidades: string[] }[]
  nivel: 'premium' | 'basico' | 'nenhum'
  destaque: boolean
}

export type ProfissionalPublico = Omit<Profissional, 'agenda' | 'plano' | 'testeAte' | 'status'> & {
  agenda: Pick<ConfigAgenda, 'ativa' | 'duracao' | 'alunoMarca' | 'locais'>
  nivel: 'premium' | 'basico' | 'nenhum'
  destaque: boolean
}

export type ProfissionalCartao = { id: string; slug: string; nome: string; foto?: string; especialidades: string[]; nota: Nota; publico: boolean; personal: boolean; cor: string; alunos: number }

export type AvaliacaoVista = Avaliacao & { autor?: PessoaResumo }

export type PaginaEmpresa = {
  tipo: 'empresa'
  empresa: EmpresaPublica
  professores: ProfissionalCartao[]
  avaliacoes: AvaliacaoVista[]
  vinculo?: Vinculo | null
  podeAvaliar: boolean
  minhaAvaliacao?: Avaliacao | null
  souEquipe: boolean
  alunos: number
}

export type LocalDoProfissional = { empresa: string; unidade: string; nome: string; ponto: Ponto; cidade: Cidade; slug: string }

export type PaginaProfissional = {
  tipo: 'profissional'
  profissional: ProfissionalPublico
  locais: LocalDoProfissional[]
  avaliacoes: AvaliacaoVista[]
  vinculo?: Vinculo | null
  podeAvaliar: boolean
  minhaAvaliacao?: Avaliacao | null
  souEu: boolean
  privado?: boolean // perfil fora do ar: só os alunos veem
}

export type PaginaPublica = PaginaEmpresa | PaginaProfissional

export type PerfilPessoa = {
  pessoa: PessoaResumo & { bio?: string; publico: boolean; cidade?: Cidade; desde: string }
  souEu: boolean
  segue: 'sim' | 'pedido' | 'nao'
  meSegue: boolean
  podeVer: boolean // perfil privado sem ser seguidor aprovado: só o nome e a foto
  numeros?: { treinos: number; sequencia: number; seguidores: number; seguindo: number; desafios: number }
  lugares?: { empresa: string; unidade: string; nome: string; vezes: number; ultima: string }[]
  faixas?: { modalidade: string; faixa: string; graus: number; empresa: string }[]
  profissional?: { slug: string; publico: boolean }
  podeConversar: boolean
}

// ---------- Explorar (o mapa da região) ----------

export type LinhaUnidade = {
  empresa: string
  unidade: string
  nome: string
  unidadeNome: string
  tipo: TipoEmpresa
  ponto: Ponto
  cidade: Cidade
  bairro?: string
  endereco: string
  modalidades: string[]
  nota: Nota
  destaque: boolean
  cor: string
  logo?: string
  precoDesde?: number
  agregadores: string[]
  horario: HorarioDia[]
  unidades: number
  demo?: boolean
}

export type LinhaProfissional = {
  id: string
  slug: string
  nome: string
  foto?: string
  personal: boolean
  cidade: Cidade
  ponto: Ponto
  raioKm: number
  online: boolean
  especialidades: string[]
  modalidades: string[]
  locais: { empresa: string; unidade: string; nome: string; ponto: Ponto }[]
  nota: Nota
  destaque: boolean
  cor: string
  alunos: number
  demo?: boolean
}

export type UnidadeAchada = LinhaUnidade & { km: number; destaqueAgora?: boolean }
export type ProfissionalAchado = LinhaProfissional & { km: number; destaqueAgora?: boolean }

export type ResultadoExplorar = {
  unidades: UnidadeAchada[]
  profissionais: ProfissionalAchado[]
  online: ProfissionalAchado[]
  modalidades: { id: string; unidades: number }[]
  numeros: { academias: number; unidades: number; personais: number; profissionais: number; modalidades: number }
}

// ---------- O aluno ----------

export type VinculoComMarca = Vinculo & { nome: string; slug: string; visual: Visual; unidadeNome?: string }

export type ResumoFicha = Pick<Ficha, 'id' | 'titulo' | 'autor' | 'autorNome' | 'contexto' | 'status' | 'inicio' | 'previsao' | 'atualizadaEm' | 'publicadaEm' | 'vistaEm'> & { divisoes: number }

export type SessaoDoAluno = { id: string; profissional: string; profissionalNome: string; data: string; inicio: string; fim: string; local?: string; status: Sessao['status'] }

export type ReservaDoAluno = { empresa: string; unidade: string; aula: string; data: string; inicio: string; modalidade: string; nome: string; situacao: 'reservada' | 'espera' | 'experimental'; lugar?: number }

export type DesafioResumo = Pick<Desafio, 'id' | 'nome' | 'inicio' | 'fim' | 'pontuacao' | 'publico' | 'oficial' | 'codigo'> & { participantes: number; posicao?: number; pontos?: number; lider?: { nome: string; pontos: number } }

export type InicioDoAluno = {
  vinculos: VinculoComMarca[]
  fichas: ResumoFicha[]
  sessoes: SessaoDoAluno[]
  reservas: ReservaDoAluno[]
  desafios: DesafioResumo[]
  sequencia: number
  semana: { feitos: number; meta: number; dias: string[] }
  ultimo?: Pick<Treino, 'id' | 'nome' | 'inicio' | 'duracaoMin' | 'volume' | 'ficha' | 'divisao'>
  proximaDivisao?: { ficha: string; divisao: string; nome: string; foco?: string }
}

export type ConvitePublico = { codigo: string; tipo: 'aluno' | 'professor'; nome?: string; de: { tipo: 'empresa' | 'profissional'; id: string; nome: string; visual: Visual }; expirado: boolean; usado: boolean }

// ---------- Fichas ----------

export type FichaCompleta = {
  ficha: Ficha
  proprios: ExercicioProprio[]
  aluno: PessoaResumo
  contextoNome: string
  podeEditar: boolean
  iguais?: { id: string; aluno: string; alunoNome: string; status: string; previsao: string }[]
}

export type FichaDoPainel = { id: string; aluno: string; alunoNome: string; titulo: string; status: Ficha['status']; previsao: string; inicio: string; contexto: Ficha['contexto']; atualizadaEm: string; modelo?: string }

export type Modelos = { modelos: ModeloFicha[]; proprios: ExercicioProprio[] }

// ---------- Treinos ----------

export type Historico = { treinos: Treino[]; janela: string | null; sequencia: number; meta: number; melhores: Record<string, { carga: number; forca: number }> }

export type Evolucao = { exercicio: string; pontos: { data: string; carga: number; reps: number; forca: number; volume: number }[]; maisFeitos: { id: string; nome: string; vezes: number }[]; janela: string | null }

export type UltimaVez = { ultima: Record<string, { reps: number; carga: number }[]>; melhores: Record<string, { carga: number; forca: number }> }

export type ResultadoDoTreino = { treino: Treino; sequencia: number; repetido?: boolean }

// ---------- Medidas ----------

export type MedidasDoAluno = { medidas: Medida[]; fotos: { usadas: number; limite: number | null }; podeEditar: boolean; deQuem: PessoaResumo }

// ---------- Agenda ----------

export type SemanaDaAgenda = { dias: { data: string; sessoes: Sessao[] }[]; fixas: SessaoFixa[]; agenda: ConfigAgenda }

// ---------- Aulas ----------

export type AulaDoDia = {
  aula: Aula
  reservas: number
  espera: number
  livres: number | null
  lugaresOcupados: number[]
  minha: { lugar?: number } | null
  naFila: number
  presente: boolean
  professorNome?: string
}

export type DiaDaUnidade = { data: string; unidade: string; aulas: AulaDoDia[]; eventos: Evento[] }

// ---------- Rede ----------

export type PostVisto = Post & { autorResumo: PessoaResumo; dei: boolean; meu: boolean; totalFortes: number }
export type ComentarioVisto = Comentario & { autorResumo?: PessoaResumo; meu: boolean }
export type Feed = { posts: PostVisto[]; mais: string | null }
export type PostComComentarios = { post: PostVisto; comentarios: ComentarioVisto[] }

export type DesafioCompleto = Omit<Desafio, 'participantes'> & {
  ranking: { posicao: number; id: string; nome: string; usuario: string; foto?: string; mais: boolean; pontos: number; dias: number; checkins: number; minutos: number }[]
  total: number
  participo: boolean
}

// ---------- Conversas ----------

export type LinhaConversa = { id: string; com: Lado; nome: string; ultima: string; ultimaEm: string; deMim: boolean; lidaEm?: string }
export type ConversaVista = { id: string; eu: Lado; outro: Lado & { nome: string; link: string; foto?: string }; mensagens: (Mensagem & { meu: boolean; nome: string })[] }

// ---------- Avisos ----------

export type Avisos = { avisos: Aviso[]; naoLidos: number }

// ---------- Painel da empresa ----------

export type VisaoDaEmpresa = {
  alunos: { ativos: number; pendentes: number; sumidos: number; limite: number | null }
  treinosSemana: number
  ocupacao: { aula: string; modalidade: string; unidade: string; inicio: string; reservas: number; vagas: number }[]
  fichasVencendo: FichaDoPainel[]
  experimentais: PedidoExperimental[]
  nota: Nota
  avaliacoes: number
  semDispositivo?: boolean
}

export type AlunosDoPainel = { alunos: AlunoDoPainel[]; limite: number | null }

// ---------- Painel do profissional ----------

export type HojeDoProfissional = {
  sessoes: Sessao[]
  vencendo: FichaDoPainel[]
  alunosSumidos: AlunoDoPainel[]
  numeros: Profissional['numeros']
  limite: number | null
  ativos: number
  academias: { slug: string; nome: string; papel: string; alunos: number }[]
}

export type AlunoParaOProfissional = {
  aluno: PessoaResumo
  contextos: { tipo: 'empresa' | 'profissional'; id: string; nome: string }[]
  fichas: ResumoFicha[]
  treinos: Treino[]
  medidas: Medida[] | null // null: o aluno não deixou ver
  faixas: AlunoDoPainel['faixas']
}

// ---------- Plataforma ----------

export type PlataformaPublica = {
  precos: { alunoMais: number; alunoMaisAno: number; personalBasico: number; personalPremium: number; academiaBasico: number; academiaPremium: number }
  limites: { fichasProprias: number; divisoesProprias: number; diasGrafico: number; fotosGratis: number; desafiosGratis: number; alunosPersonalBasico: number; alunosAcademiaBasico: number }
  descontoRede: number
  diasTeste: number
  raioPadrao: number
  cadastroAberto: boolean
  aviso: string
}
