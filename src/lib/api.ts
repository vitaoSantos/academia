import type {
  Avisos,
  ConvitePublico,
  DesafioCompleto,
  DesafioResumo,
  DiaDaUnidade,
  Evolucao,
  Feed,
  FichaCompleta,
  Historico,
  HistoricoDoAluno,
  InicioDoAluno,
  LinhaConversa,
  ConversaVista,
  MedidasDoAluno,
  Modelos,
  PaginaPublica,
  PerfilPessoa,
  PlataformaPublica,
  PostComComentarios,
  PostVisto,
  ComentarioVisto,
  ReservaDoAluno,
  RespostaSessao,
  ResultadoDoTreino,
  ResultadoExplorar,
  ResumoFicha,
  SessaoDoAluno,
  UltimaVez,
  VinculoComMarca,
  SemanaDaAgenda,
} from '../shared/respostas'
import type { Cidade, ConfigAgenda, ContextoFicha, Divisao, Ficha, Marcado, ModeloFicha, ExercicioProprio, PedidoExperimental, PessoaResumo, Sessao, SessaoFixa, Ponto, Visual, Circunferencia, Avaliacao, TipoEmpresa, PresetVisual } from '../shared/tipos'

// As chamadas às Netlify Functions (uma função por assunto; GET lê, POST com `acao` muda)

const FN = '/.netlify/functions'

export class ErroApi extends Error {
  status: number
  extra: Record<string, unknown>
  constructor(status: number, mensagem: string, extra: Record<string, unknown> = {}) {
    super(mensagem)
    this.status = status
    this.extra = extra
  }
}

type Busca = Record<string, string | number | boolean | undefined | null>
type Opcoes = { busca?: Busca; corpo?: object; sinal?: AbortSignal }

export async function chamar<T>(funcao: string, { busca, corpo, sinal }: Opcoes = {}): Promise<T> {
  const parametros = new URLSearchParams()
  for (const [k, v] of Object.entries(busca ?? {})) {
    if (v === undefined || v === null || v === false) continue
    // `true` vira só a chave (?inicio, ?minhas)
    parametros.set(k, v === true ? '' : String(v))
  }
  const qs = parametros.toString().replace(/=(&|$)/g, '$1')
  let res: Response
  try {
    res = await fetch(`${FN}/${funcao}${qs ? `?${qs}` : ''}`, {
      method: corpo ? 'POST' : 'GET',
      headers: corpo ? { 'content-type': 'application/json' } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined,
      credentials: 'same-origin',
      signal: sinal,
    })
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e
    throw new ErroApi(0, 'Sem conexão. Confira a internet e tente de novo.')
  }
  const dados = await res.json().catch(() => null)
  if (!res.ok || dados === null) {
    const { erro, ...extra } = (dados ?? {}) as { erro?: string }
    throw new ErroApi(res.status, erro ?? 'Não foi possível completar agora. Tente de novo.', extra)
  }
  return dados as T
}

export const mensagemDeErro = (e: unknown) => (e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.')

// O endereço de uma foto (perfil, logo, capa, post, evolução) ou da fonte da marca
export const urlMidia = (id?: string | null) => (id ? `${FN}/midia?id=${encodeURIComponent(id)}` : undefined)

const post = <T>(funcao: string, acao: string, dados: object = {}) => chamar<T>(funcao, { corpo: { acao, ...dados } })

// ---------- A conta ----------

export type DadosCadastro = { nome: string; login: string; senha: string; cidade?: Cidade; publico?: boolean }

export const sessao = {
  ler: () => chamar<RespostaSessao>('sessao'),
  bloqueados: () => chamar<{ pessoas: PessoaResumo[] }>('sessao', { busca: { bloqueados: true } }),
  entrar: (login: string, senha: string) => post<RespostaSessao>('sessao', 'entrar', { login, senha }),
  cadastro: (d: DadosCadastro) => post<RespostaSessao>('sessao', 'cadastro', d),
  sair: () => post<RespostaSessao>('sessao', 'sair'),
  demo: (papel: 'aluno' | 'personal' | 'professor' | 'academia') => post<RespostaSessao>('sessao', 'demo', { papel }),
  perfil: (d: { nome: string; usuario?: string; bio?: string; metaSemanal?: number; foto?: string; semFoto?: boolean }) => post<RespostaSessao>('sessao', 'perfil', d),
  privacidade: (publico: boolean) => post<RespostaSessao>('sessao', 'privacidade', { publico }),
  local: (cidade: Cidade, raio: number) => post<RespostaSessao>('sessao', 'local', { cidade, raio }),
  senha: (atual: string, nova: string) => post<RespostaSessao>('sessao', 'senha', { atual, nova }),
  consentimento: (alvo: string, permitir: boolean) => post<RespostaSessao>('sessao', 'consentimento', { alvo, permitir }),
  principal: (tipo: 'empresa' | 'profissional' | null, id?: string) => post<RespostaSessao>('sessao', 'principal', { tipo, id }),
  bloquear: (id: string) => post<RespostaSessao>('sessao', 'bloquear', { id }),
  desbloquear: (id: string) => post<RespostaSessao>('sessao', 'desbloquear', { id }),
  mais: (ligar: boolean) => post<RespostaSessao>('sessao', 'mais', { ligar }),
  apagar: (senha: string) => post<RespostaSessao>('sessao', 'apagar', { senha }),
  // o perfil profissional (personal e professor)
  profissional: (d: {
    personal?: boolean
    cidade?: Cidade
    cref?: string
    especialidades?: string[]
    modalidades?: string[]
    bio?: string
    raioKm?: number
    online?: boolean
    publico?: boolean
    whatsapp?: string
    instagram?: string
    slug?: string
    visual?: Partial<Visual>
  }) => post<RespostaSessao>('sessao', 'profissional', d),
  // a academia (com a conta junto, para quem ainda não tem)
  empresa: (d: {
    empresa: string
    tipo: TipoEmpresa
    cidade: Cidade
    unidade: { nome?: string; endereco: string; bairro?: string; ponto?: Ponto; whatsapp?: string }
    modalidades?: string[]
    plano: 'basico' | 'premium'
    slug?: string
    visual?: { preset: PresetVisual; destaque?: string }
    nome?: string
    login?: string
    senha?: string
  }) => post<RespostaSessao & { empresa: string }>('sessao', 'empresa', d),
}

export const plataforma = { ler: () => chamar<PlataformaPublica>('plataforma') }

// ---------- O que qualquer um vê ----------

export type FiltroExplorar = {
  lat: number
  lng: number
  raio: number
  tipo?: 'todos' | 'academias' | 'personais'
  tipos?: string
  modalidade?: string
  busca?: string
  ordem?: 'distancia' | 'nota'
  wellhub?: boolean
  totalpass?: boolean
}

export const explorar = (f: FiltroExplorar, sinal?: AbortSignal) =>
  chamar<ResultadoExplorar>('explorar', { busca: { ...f, wellhub: f.wellhub ? 1 : undefined, totalpass: f.totalpass ? 1 : undefined }, sinal })

export const paginas = {
  ler: (slug: string) => chamar<PaginaPublica>('pagina', { busca: { slug } }),
  pessoa: (usuario: string) => chamar<PerfilPessoa>('pagina', { busca: { u: usuario } }),
  dia: (slug: string, unidade: string, data: string) => chamar<DiaDaUnidade>('pagina', { busca: { slug, unidade, data } }),
}

// ---------- O aluno ----------

export const aluno = {
  inicio: () => chamar<InicioDoAluno>('aluno', { busca: { inicio: true } }),
  vinculos: () => chamar<{ vinculos: VinculoComMarca[] }>('aluno', { busca: { vinculos: true } }),
  historico: () => chamar<HistoricoDoAluno>('aluno', { busca: { historico: true } }),
  convite: (codigo: string) => chamar<ConvitePublico>('aluno', { busca: { convite: codigo } }),
  aceitarConvite: (codigo: string) => post<{ ok: true; de: ConvitePublico['de']; tipo: 'aluno' | 'professor' }>('aluno', 'convite', { codigo }),
  pedir: (alvo: { empresa: string; unidade?: string } | { profissional: string }) => post<{ vinculos: VinculoComMarca[] }>('aluno', 'pedir', alvo),
  sair: (tipo: 'empresa' | 'profissional', id: string) => post<{ vinculos: VinculoComMarca[] }>('aluno', 'sair', { tipo, id }),
}

export type FichaParaSalvar = {
  id?: string
  aluno?: string
  contexto?: ContextoFicha
  titulo: string
  objetivo?: string
  inicio?: string
  previsao?: string
  semanas?: number
  online?: boolean
  divisoes: Divisao[]
  obs?: string
  publicar?: boolean
  modelo?: string
}

export const fichas = {
  ler: (id: string) => chamar<FichaCompleta>('ficha', { busca: { id } }),
  minhas: () => chamar<{ fichas: ResumoFicha[] }>('ficha', { busca: { minhas: true } }),
  doAluno: (alunoId: string) => chamar<{ fichas: ResumoFicha[] }>('ficha', { busca: { aluno: alunoId } }),
  modelos: () => chamar<Modelos>('ficha', { busca: { modelos: true } }),
  salvar: (f: FichaParaSalvar) => post<{ ficha: Ficha }>('ficha', 'salvar', f),
  arquivar: (id: string) => post<{ ficha: Ficha }>('ficha', 'arquivar', { id }),
  copiar: (id: string, alunoId: string, contexto?: ContextoFicha) => post<{ ficha: Ficha }>('ficha', 'copiar', { id, aluno: alunoId, contexto }),
  vista: (id: string) => post<{ ficha: Ficha }>('ficha', 'vista', { id }),
  salvarModelo: (m: Partial<ModeloFicha> & { titulo: string; divisoes: Divisao[] }) => post<{ modelo: ModeloFicha }>('ficha', 'modelo', m),
  apagarModelo: (id: string) => post<{ modelos: ModeloFicha[] }>('ficha', 'modelo-apagar', { id }),
  exercicio: (e: Partial<ExercicioProprio> & { nome: string; grupo: string }) => post<{ exercicio: ExercicioProprio }>('ficha', 'exercicio', e),
}

export type TreinoParaRegistrar = {
  id: string
  ficha?: string
  divisao?: string
  modalidade?: string
  nome?: string
  inicio: string
  fim: string
  exercicios: { exercicio: string; series: { reps: number; carga: number; feita: boolean }[]; obs?: string }[]
  esforco?: number
  nota?: string
  local?: { empresa: string; unidade: string }
}

export const treinos = {
  historico: (alunoId?: string) => chamar<Historico>('treino', { busca: { historico: true, aluno: alunoId } }),
  evolucao: (exercicio = '', alunoId?: string) => chamar<Evolucao>('treino', { busca: { evolucao: exercicio || true, aluno: alunoId } }),
  ultima: () => chamar<UltimaVez>('treino', { busca: { ultima: true } }),
  registrar: (t: TreinoParaRegistrar) => post<ResultadoDoTreino>('treino', 'registrar', t),
}

export type MedidaParaSalvar = { id?: string; data?: string; peso?: number; altura?: number; gordura?: number; circ?: Partial<Record<Circunferencia, number>>; obs?: string; foto?: string }

export const medidas = {
  ler: (alunoId?: string) => chamar<MedidasDoAluno>('medidas', { busca: { aluno: alunoId } }),
  salvar: (m: MedidaParaSalvar) => post<MedidasDoAluno>('medidas', 'salvar', m),
  apagar: (id: string) => post<MedidasDoAluno>('medidas', 'apagar', { id }),
  avaliacao: (alunoId: string, m: MedidaParaSalvar) => post<MedidasDoAluno>('medidas', 'avaliacao', { ...m, aluno: alunoId }),
}

export type AgendaPublica = { duracao: number; alunoMarca: boolean; locais: string[]; cancelarAte: number; ativa: boolean }

export const agenda = {
  livres: (pro: string, data: string) => chamar<{ data: string; livres: string[]; agenda: AgendaPublica }>('agenda', { busca: { livres: true, pro, data } }),
  semana: (de?: string) => chamar<SemanaDaAgenda>('agenda', { busca: { semana: true, de } }),
  minhas: () => chamar<{ sessoes: SessaoDoAluno[] }>('agenda', { busca: { minhas: true } }),
  marcar: (d: { pro: string; data: string; inicio: string; aluno?: string; local?: string; obs?: string }) => post<{ sessao: Sessao }>('agenda', 'marcar', d),
  mudar: (d: { pro: string; id: string; data: string; status: 'cancelada' | 'feita' | 'faltou' }) => post<{ sessao: Sessao }>('agenda', 'mudar', d),
  fixa: (d: { aluno: string; dias: number[]; inicio: string; local?: string }) => post<{ fixa: SessaoFixa }>('agenda', 'fixa', d),
  apagarFixa: (id: string) => post<{ fixas: SessaoFixa[] }>('agenda', 'fixa-apagar', { id }),
  config: (a: ConfigAgenda) => post<{ agenda: ConfigAgenda }>('agenda', 'config', { agenda: a }),
}

export const aulas = {
  minhas: () => chamar<{ reservas: ReservaDoAluno[] }>('aulas'),
  experimentais: (slug: string) => chamar<{ pedidos: PedidoExperimental[] }>('aulas', { busca: { experimentais: true, slug } }),
  reservar: (slug: string, aula: string, data: string, lugar?: number) => post<{ resultado: 'reservada' | 'espera' | 'ja-tinha'; lugar?: number }>('aulas', 'reservar', { slug, aula, data, lugar }),
  cancelar: (slug: string, aula: string, data: string) => post<{ ok: true }>('aulas', 'cancelar', { slug, aula, data }),
  cheguei: (slug: string, aula: string, data: string) => post<{ presentes: string[] }>('aulas', 'cheguei', { slug, aula, data }),
  presenca: (slug: string, aula: string, data: string, contas: string[]) => post<{ presentes: string[] }>('aulas', 'presenca', { slug, aula, data, contas }),
  experimental: (slug: string, aula: string, data: string) => post<{ pedido: PedidoExperimental }>('aulas', 'experimental', { slug, aula, data }),
  responderExperimental: (slug: string, id: string, status: 'confirmado' | 'feito' | 'recusado') => post<{ pedido: PedidoExperimental }>('aulas', 'experimental-responder', { slug, id, status }),
  vou: (slug: string, evento: string) => post<{ vou: boolean }>('aulas', 'vou', { slug, evento }),
}

export type AlvoAvaliacao = { tipo: 'empresa' | 'profissional'; id: string }

export const avaliacoes = {
  avaliar: (alvo: AlvoAvaliacao, d: { estrelas: number; motivos: string[]; texto?: string }) => post<{ avaliacoes: Avaliacao[] }>('avaliacao', 'avaliar', { alvo, ...d }),
  responder: (alvo: AlvoAvaliacao, de: string, texto: string) => post<{ avaliacoes: Avaliacao[] }>('avaliacao', 'responder', { alvo, de, texto }),
}

export const avisos = {
  ler: () => chamar<Avisos>('avisos'),
  lidos: () => chamar<{ ok: true }>('avisos', { corpo: { acao: 'lidos' } }),
}

// ---------- A rede e as conversas ----------

export type ModoFeed = 'perto' | 'seguindo' | 'academia' | 'empresa' | 'perfil'

export const rede = {
  feed: (p: { modo: ModoFeed; lat?: number; lng?: number; raio?: number; slug?: string; usuario?: string; antes?: string }) => chamar<Feed>('rede', { busca: { feed: true, ...p } }),
  post: (id: string) => chamar<PostComComentarios>('rede', { busca: { post: id } }),
  pedidos: () => chamar<{ pedidos: PessoaResumo[] }>('rede', { busca: { pedidos: true } }),
  seguidores: (usuario: string) => chamar<{ pessoas: PessoaResumo[] }>('rede', { busca: { seguidores: usuario } }),
  seguindo: (usuario: string) => chamar<{ pessoas: PessoaResumo[] }>('rede', { busca: { seguindo: usuario } }),
  publicar: (d: { tipo: 'treino' | 'aula' | 'conquista' | 'foto'; texto?: string; foto?: string; treino?: string; conquista?: { tipo: string; texto: string }; marcados?: Pick<Marcado, 'tipo' | 'id'>[]; local?: { empresa: string; unidade: string } }) =>
    post<{ post: PostVisto }>('rede', 'publicar', d),
  forte: (id: string) => post<{ post: PostVisto }>('rede', 'forte', { id }),
  comentar: (id: string, texto: string) => post<{ comentarios: ComentarioVisto[] }>('rede', 'comentar', { id, texto }),
  apagar: (id: string) => post<{ ok: true }>('rede', 'apagar', { id }),
  apagarComentario: (id: string, comentario: string) => post<{ comentarios: ComentarioVisto[] }>('rede', 'apagar-comentario', { id, comentario }),
  denunciar: (alvo: { tipo: 'post' | 'comentario' | 'perfil'; id: string; autor?: string; post?: string }, motivo: string) => post<{ ok: true; motivos: string[] }>('rede', 'denunciar', { alvo, motivo }),
  seguir: (id: string) => post<{ segue: 'sim' | 'pedido' | 'nao' }>('rede', 'seguir', { id }),
  deixar: (id: string) => post<{ segue: 'nao' }>('rede', 'deixar', { id }),
  pedido: (id: string, aceitar: boolean) => post<{ ok: true }>('rede', 'pedido', { id, aceitar }),
}

export const MOTIVOS_DENUNCIA = ['Conteúdo impróprio', 'Assédio ou ofensa', 'Golpe ou spam', 'Foto de outra pessoa sem autorização', 'Outro']

export const conversas = {
  lista: (como?: string) => chamar<{ conversas: LinhaConversa[]; naoLidas: number }>('conversa', { busca: { lista: true, como } }),
  ler: (id: string, como?: string) => chamar<ConversaVista>('conversa', { busca: { id, como } }),
  contador: (como?: string) => chamar<{ naoLidas: number }>('conversa', { busca: { contador: true, como } }),
  abrir: (com: { tipo: 'conta' | 'empresa'; id: string }, como?: string) => post<{ id: string }>('conversa', 'abrir', { com, como }),
  enviar: (id: string, texto: string, como?: string) => post<{ ok: true }>('conversa', 'enviar', { id, texto, como }),
}

export const desafios = {
  ler: (id: string) => chamar<DesafioCompleto>('desafio', { busca: { id } }),
  meus: () => chamar<{ desafios: DesafioResumo[] }>('desafio', { busca: { meus: true } }),
  publicos: (ponto?: Ponto) => chamar<{ desafios: DesafioResumo[] }>('desafio', { busca: { publicos: true, lat: ponto?.lat, lng: ponto?.lng } }),
  criar: (d: { nome: string; descricao?: string; inicio: string; fim: string; pontuacao: 'dias' | 'checkins' | 'minutos'; publico?: boolean; premio?: string; oficial?: { tipo: 'empresa' | 'profissional'; id?: string } }) =>
    post<DesafioCompleto>('desafio', 'criar', d),
  entrar: (alvo: { id?: string; codigo?: string }) => post<DesafioCompleto>('desafio', 'entrar', alvo),
  sair: (id: string) => post<{ ok: true }>('desafio', 'sair', { id }),
}
