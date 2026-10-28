import { AGENDA_PADRAO, AGENDA_PROFESSOR } from '../../src/shared/agenda.ts'
import { notaDe } from '../../src/shared/avaliacao.ts'
import { novoParticipante, somarTreino } from '../../src/shared/desafio.ts'
import { EXERCICIO } from '../../src/shared/exercicios.ts'
import { modalidadeInicial, nomeModalidade } from '../../src/shared/modalidades.ts'
import { agoraNoFuso, dataDe, diaDaSemana, instante, inicioDaSemana, somarDias } from '../../src/shared/tempo.ts'
import { melhoresDe, recordes, seriesFeitas, volume } from '../../src/shared/treino.ts'
import type {
  AlunoDoPainel,
  Aula,
  Avaliacao,
  Cidade,
  Comentario,
  Conversa,
  Desafio,
  Divisao,
  Empresa,
  ExercicioFeito,
  Ficha,
  FolhaDoDia,
  ItemFicha,
  Lado,
  Medida,
  ModalidadeOferecida,
  PedidoExperimental,
  Post,
  Profissional,
  Sessao,
  SessaoFixa,
  Treino,
  Unidade,
  Vinculo,
  Visual,
} from '../../src/shared/tipos.ts'
import type { FichaDoPainel, LinhaConversa, ReservaDoAluno, ResumoFicha, SessaoDoAluno } from '../../src/shared/respostas.ts'
import { protegerSenha, type ContaGuardada } from './auth.ts'
import { idDaConversa, chaveDoLado } from './conversas.ts'
import { linhasDe } from './empresas.ts'
import type { LinhaDesafio } from './desafios.ts'
import { indexarProfissional } from './profissionais.ts'
import type { LinhaFeed, Seguidores, Seguindo } from './rede.ts'
import type { Lugar } from './treinos.ts'
import { atualizar, blobs, CHAVES, emParalelo, env, lerJSON } from './store.ts'
import type { LinhaUnidade } from '../../src/shared/respostas.ts'

// A demonstração (seção 23 do estudo): São Lourenço (MG) e região com a rede Força Total (quatro
// unidades, uma em Poços de Caldas, a 161 km, para mostrar o filtro da região), um CT de lutas, um
// estúdio de pilates, uma escola de dança, uma academia aquática e um box de cross; personais,
// professores e alunos com fichas, treinos, medidas, posts, desafios, avaliações, agenda e aulas.
// Os telefones são de mentira (DDD 00). As datas andam com o relógio: a demonstração é recriada
// quando a versão muda ou quando passa de 3 dias.

export const VERSAO_DEMO = 3
const VALIDADE = 3 * 86_400_000

export const CONTAS_DEMO = {
  academia: 'demomarta00001',
  personal: 'demorafa000001',
  professor: 'demodiego00001',
  aluna: 'demoana0000001',
} as const

// ---------- As cidades (IBGE) ----------

const cid = (codigo: number, nome: string, lat: number, lng: number): Cidade => ({ codigo, nome, uf: 'MG', lat, lng })
const SL = cid(3163706, 'São Lourenço', -22.1166, -45.0506)
const CAXAMBU = cid(3115508, 'Caxambu', -21.9753, -44.9319)
const CARMO = cid(3114105, 'Carmo de Minas', -22.1204, -45.1307)
const ITANHANDU = cid(3133105, 'Itanhandu', -22.2942, -44.9382)
const POCOS = cid(3151800, 'Poços de Caldas', -21.78, -46.5692)
const POUSO_ALEGRE = cid(3152501, 'Pouso Alegre', -22.2266, -45.9389)

// ---------- Quem está na demonstração ----------

type Pessoa = { id: string; nome: string; usuario: string; cidade: Cidade; publico?: boolean; bio?: string; mais?: boolean; meta?: number }

const P = (id: string, nome: string, usuario: string, cidade: Cidade, extra: Partial<Pessoa> = {}): Pessoa => ({ id, nome, usuario, cidade, ...extra })

const PESSOAS = {
  marta: P(CONTAS_DEMO.academia, 'Marta Ribeiro', 'marta.forcatotal', SL, { publico: true, bio: 'Dona da Força Total. Treino desde os 15.' }),
  rafa: P(CONTAS_DEMO.personal, 'Rafael Moreira', 'rafa.personal', SL, { publico: true, bio: 'Personal trainer. Hipertrofia, emagrecimento e quem está começando.', mais: true }),
  diego: P(CONTAS_DEMO.professor, 'Diego Alves', 'diego.alves', SL, { publico: true, bio: 'Professor de musculação e faixa preta de jiu-jitsu.' }),
  camila: P('democamila0001', 'Camila Duarte', 'camila.duarte', CAXAMBU, { publico: true, bio: 'Funcional e corrida. Atendo em Caxambu e online.' }),
  patricia: P('demopatricia01', 'Patrícia Lima', 'patricia.lima', POCOS, { publico: true, bio: 'Personal em Poços de Caldas. Consultoria online para todo o Brasil.' }),
  julio: P('demojulio00001', 'Júlio Castro', 'julio.tatame', SL, { publico: true }),
  helena: P('demohelena0001', 'Helena Prado', 'helena.equilibrio', CARMO, { publico: true }),
  beatriz: P('demobeatriz001', 'Beatriz Nunes', 'bia.compasso', SL, { publico: true }),
  roberto: P('demoroberto001', 'Roberto Lima', 'roberto.aguas', CAXAMBU, { publico: true }),
  fernanda: P('demofernanda01', 'Fernanda Reis', 'fe.boxserra', ITANHANDU, { publico: true }),
  igor: P('demoigor000001', 'Igor Matos', 'igor.vertice', POUSO_ALEGRE, { publico: true }),
  ana: P(CONTAS_DEMO.aluna, 'Ana Souza', 'ana.souza', SL, { publico: true, bio: 'Fase 2 com o Rafa 💪 Meta: 3x por semana.', meta: 3 }),
  lucas: P('demolucas00001', 'Lucas Pereira', 'lucas.pereira', SL, { publico: true, bio: 'Jiu-jitsu e musculação.', meta: 4 }),
  bruna: P('demobruna00001', 'Bruna Martins', 'bruna.martins', CARMO, { publico: true, bio: 'Pilates + musculação.' }),
  marcos: P('demomarcos0001', 'Marcos Vinícius', 'marcos.vini', SL, { publico: false, bio: 'Muay thai.' }),
  julia: P('demojulia00001', 'Júlia Rocha', 'julia.rocha', SL, { publico: true, bio: 'Bailarina desde os 6 🩰' }),
  pedro: P('demopedro00001', 'Pedro Henrique', 'pedro.cross', ITANHANDU, { publico: true }),
  larissa: P('demolarissa001', 'Larissa Costa', 'larissa.costa', CAXAMBU, { publico: true }),
  thiago: P('demothiago0001', 'Thiago Ramos', 'thiago.ramos', CAXAMBU, { publico: true }),
  gabriel: P('demogabriel001', 'Gabriel Nunes', 'gabriel.nunes', POCOS, { publico: true }),
  sofia: P('demosofia00001', 'Sofia Almeida', 'sofia.almeida', SL, { publico: true }),
  carla: P('democarla00001', 'Carla Mendes', 'carla.mendes', SL, { publico: true }),
}

type ChavePessoa = keyof typeof PESSOAS

// ---------- Ajudantes ----------

let agora = Date.now()
const iso = (ms: number) => new Date(ms).toISOString()
const diasAtras = (d: number, hora = '08:00') => instante(somarDias(agoraNoFuso(new Date(agora)).data, -d), hora)
const hojeD = () => agoraNoFuso(new Date(agora)).data

// Um gerador de números previsível (a demonstração sai igual em cada recriação)
function sorteio(semente: number) {
  let s = semente
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const H = (dia: number, abre: string, fecha: string) => ({ dia, abre, fecha })
const HORARIO_ACADEMIA = [1, 2, 3, 4, 5].map((d) => H(d, '05:30', '23:00')).concat([H(6, '08:00', '16:00'), H(0, '08:00', '12:00')])
const HORARIO_ESTUDIO = [1, 2, 3, 4, 5].map((d) => H(d, '06:00', '21:00')).concat([H(6, '08:00', '12:00')])
const HORARIO_CT = [1, 2, 3, 4, 5].map((d) => H(d, '07:00', '22:00')).concat([H(6, '09:00', '13:00')])

const unidade = (id: string, nome: string, endereco: string, bairro: string, cidade: Cidade, lat: number, lng: number, extra: Partial<Unidade> = {}): Unidade => ({
  id,
  nome,
  endereco,
  bairro,
  cidade,
  ponto: { lat, lng },
  whatsapp: '00999990000',
  horario: HORARIO_ACADEMIA,
  comodidades: [],
  agregadores: [],
  ativa: true,
  ...extra,
})

let nAula = 0
const aula = (unidadeId: string, modalidade: string, dias: number[], inicio: string, extra: Partial<Aula> = {}): Aula => ({
  id: `a${(++nAula).toString(36).padStart(4, '0')}`,
  modalidade,
  unidade: unidadeId,
  dias,
  inicio,
  duracao: 50,
  vagas: 20,
  reserva: true,
  ativa: true,
  ...extra,
})

const oferecida = (id: string, extra: Partial<ModalidadeOferecida> = {}): ModalidadeOferecida => ({ ...modalidadeInicial(id)!, ...extra })

const SEG_SEX = [1, 2, 3, 4, 5]

// ---------- As empresas ----------

function empresas(): Empresa[] {
  nAula = 0
  const criada = iso(agora - 200 * 86_400_000)
  const base = (slug: string, nome: string, tipo: Empresa['tipo'], dono: ChavePessoa, visual: Visual, unidades: Unidade[], modalidades: ModalidadeOferecida[], grade: Aula[], extra: Partial<Empresa> = {}): Empresa => ({
    slug,
    nome,
    tipo,
    dono: PESSOAS[dono].id,
    equipe: [{ id: PESSOAS[dono].id, nome: PESSOAS[dono].nome, papel: 'dono', unidades: unidades.map((u) => u.id), desde: criada }],
    unidades,
    modalidades,
    grade,
    eventos: [],
    visual,
    plano: 'premium',
    status: 'ativa',
    agendaProfessores: false,
    numeros: { alunos: 0, nota: { media: 0, total: 0 }, treinosSemana: 0 },
    criadaEm: criada,
    demo: true,
    ...extra,
  })

  const ftCentro = unidade('centro', 'Centro', 'Av. Dom Pedro II, 1200', 'Centro', SL, -22.1181, -45.0538, { comodidades: ['Estacionamento', 'Vestiário', 'Ar-condicionado', 'Acessibilidade', 'Wi-Fi'], agregadores: ['wellhub', 'totalpass'], precoDesde: 11990 })
  const ftFederal = unidade('federal', 'Federal', 'R. Coronel Justino, 85', 'Federal', SL, -22.1098, -45.0446, { comodidades: ['Vestiário', 'Wi-Fi'], agregadores: ['totalpass'], precoDesde: 9990 })
  const ftCaxambu = unidade('caxambu', 'Caxambu', 'R. Major Penha, 310', 'Centro', CAXAMBU, -21.9768, -44.9334, { comodidades: ['Vestiário', 'Ar-condicionado'], agregadores: ['wellhub'], precoDesde: 9990 })
  const ftPocos = unidade('pocos', 'Poços de Caldas', 'R. Assis Figueiredo, 1500', 'Centro', POCOS, -21.7866, -46.5651, { comodidades: ['Estacionamento', 'Vestiário', 'Piscina'], agregadores: ['wellhub', 'totalpass'], precoDesde: 12990 })
  const forca = base(
    'forca-total',
    'Força Total',
    'rede',
    'marta',
    { preset: 'ferro' },
    [ftCentro, ftFederal, ftCaxambu, ftPocos],
    [oferecida('musculacao', { descricao: 'Sala com 80 aparelhos, área de peso livre e a ficha no app.' }), oferecida('funcional'), oferecida('spinning'), oferecida('jump'), oferecida('zumba'), oferecida('muay-thai', { inclusa: false, precoDesde: 6990 }), oferecida('alongamento')],
    [
      ...['centro', 'federal', 'caxambu', 'pocos'].flatMap((u) => [aula(u, 'funcional', [1, 3, 5], '07:00', { vagas: 16 }), aula(u, 'funcional', [2, 4], '18:30', { vagas: 16 })]),
      aula('centro', 'spinning', [1, 3, 5], '06:30', { vagas: 20, lugares: 20, duracao: 45 }),
      aula('centro', 'spinning', [2, 4], '19:00', { vagas: 20, lugares: 20, duracao: 45 }),
      aula('centro', 'jump', [2, 4], '08:00', { vagas: 18, lugares: 18, duracao: 45 }),
      aula('centro', 'zumba', [1, 3], '19:30', { vagas: 30, reserva: false, duracao: 55 }),
      aula('centro', 'muay-thai', [1, 3, 5], '20:00', { vagas: 22, reserva: false, duracao: 60, sala: 'Tatame', professor: PESSOAS.diego.id }),
      aula('centro', 'alongamento', [6], '09:00', { vagas: 25, reserva: false, duracao: 40 }),
      aula('federal', 'spinning', SEG_SEX, '18:00', { vagas: 16, lugares: 16, duracao: 45 }),
      aula('caxambu', 'zumba', [2, 4], '19:00', { vagas: 25, reserva: false }),
      aula('pocos', 'spinning', SEG_SEX, '07:00', { vagas: 20, lugares: 20 }),
    ],
    { descricao: 'A rede de academias do Sul de Minas: musculação com a ficha no app, aulas coletivas, bike e muay thai.', instagram: 'forcatotal.academia', agendaProfessores: true },
  )
  forca.equipe.push(
    { id: PESSOAS.diego.id, nome: PESSOAS.diego.nome, papel: 'professor', unidades: ['centro', 'federal'], desde: iso(agora - 150 * 86_400_000) },
    { id: PESSOAS.camila.id, nome: PESSOAS.camila.nome, papel: 'professor', unidades: ['caxambu'], desde: iso(agora - 90 * 86_400_000) },
  )
  forca.eventos = [
    { id: 'ev-aulao', titulo: 'Aulão de funcional na praça', descricao: 'Aberto para alunos e amigos. Traga água!', data: somarDias(hojeD(), 9), inicio: '09:00', unidade: 'centro', modalidade: 'funcional', vou: [PESSOAS.ana.id, PESSOAS.sofia.id, PESSOAS.carla.id] },
  ]

  const tatame = base(
    'ct-tatame-sul',
    'CT Tatame Sul',
    'ct',
    'julio',
    { preset: 'tatame' },
    [unidade('sede', 'Sede', 'R. Dr. Lourenço Mendes, 77', 'Nossa Senhora de Fátima', SL, -22.1218, -45.0477, { horario: HORARIO_CT, comodidades: ['Vestiário', 'Tatame de 120 m²', 'Espaço kids'], precoDesde: 13000 })],
    [oferecida('jiu-jitsu', { descricao: 'Turmas adulto e kids, com graduação pela IBJJF.' }), oferecida('muay-thai'), oferecida('boxe'), oferecida('judo')],
    [
      aula('sede', 'jiu-jitsu', SEG_SEX, '19:00', { vagas: 30, reserva: false, duracao: 90, sala: 'Tatame', publico: 'Adulto', professor: PESSOAS.diego.id }),
      aula('sede', 'jiu-jitsu', [2, 4], '17:30', { vagas: 20, reserva: false, duracao: 60, sala: 'Tatame', publico: 'Kids', professor: PESSOAS.diego.id }),
      aula('sede', 'muay-thai', [1, 3, 5], '07:00', { vagas: 20, reserva: false, duracao: 60 }),
      aula('sede', 'muay-thai', [2, 4], '20:30', { vagas: 24, reserva: false, duracao: 60 }),
      aula('sede', 'boxe', [2, 4], '07:00', { vagas: 16, reserva: false }),
      aula('sede', 'judo', [1, 3], '18:00', { vagas: 20, reserva: false, publico: 'Kids' }),
    ],
    { plano: 'basico', descricao: 'Centro de treinamento de lutas em São Lourenço: jiu-jitsu, muay thai, boxe e judô.', instagram: 'cttatamesul' },
  )
  tatame.equipe.push({ id: PESSOAS.diego.id, nome: PESSOAS.diego.nome, papel: 'professor', unidades: ['sede'], desde: iso(agora - 300 * 86_400_000) })
  tatame.eventos = [{ id: 'ev-graduacao', titulo: 'Graduação de faixas', descricao: 'Cerimônia de graduação do semestre, adulto e kids.', data: somarDias(hojeD(), 16), inicio: '10:00', unidade: 'sede', modalidade: 'jiu-jitsu', vou: [PESSOAS.lucas.id, PESSOAS.marcos.id] }]

  const equilibrio = base(
    'studio-equilibrio',
    'Studio Equilíbrio',
    'estudio',
    'helena',
    { preset: 'zen' },
    [unidade('studio', 'Studio', 'R. Antônio Carlos, 240', 'Centro', CARMO, -22.1213, -45.1296, { horario: HORARIO_ESTUDIO, comodidades: ['Reformer', 'Cadillac', 'Chair', 'Estacionamento'], precoDesde: 22000 })],
    [oferecida('pilates-aparelhos', { descricao: 'Turmas de até 4 pessoas, com o aparelho marcado.' }), oferecida('pilates-solo'), oferecida('yoga'), oferecida('alongamento')],
    [
      ...['07:00', '08:00', '17:00', '18:00', '19:00'].map((h) => aula('studio', 'pilates-aparelhos', SEG_SEX, h, { vagas: 4, lugares: 4, duracao: 55, sala: 'Aparelhos' })),
      aula('studio', 'pilates-solo', [2, 4], '09:00', { vagas: 10, duracao: 55 }),
      aula('studio', 'yoga', [1, 3], '19:30', { vagas: 12, duracao: 60 }),
      aula('studio', 'alongamento', [6], '09:00', { vagas: 15, reserva: false, duracao: 40 }),
    ],
    { descricao: 'Pilates de aparelhos e de solo, yoga e alongamento em Carmo de Minas, a 8 km de São Lourenço.', instagram: 'studioequilibrio' },
  )

  const compasso = base(
    'danca-compasso',
    'Escola de Dança Compasso',
    'danca',
    'beatriz',
    { preset: 'ritmo' },
    [unidade('sede', 'Sede', 'R. Batista Luzardo, 510', 'Centro', SL, -22.1139, -45.0563, { horario: HORARIO_ESTUDIO, comodidades: ['Sala espelhada', 'Vestiário', 'Ar-condicionado'], precoDesde: 14000 })],
    [oferecida('ballet', { descricao: 'Do baby class às pontas.' }), oferecida('jazz'), oferecida('danca-de-salao'), oferecida('forro'), oferecida('zumba'), oferecida('hip-hop')],
    [
      aula('sede', 'ballet', [1, 3], '17:00', { vagas: 15, reserva: false, publico: 'Kids', nivel: 'Baby class', duracao: 45 }),
      aula('sede', 'ballet', [2, 4], '18:30', { vagas: 15, reserva: false, nivel: 'Intermediário', duracao: 60 }),
      aula('sede', 'jazz', [1, 3], '19:00', { vagas: 18, reserva: false, duracao: 60 }),
      aula('sede', 'danca-de-salao', [2, 4], '20:00', { vagas: 24, reserva: true, duracao: 60 }),
      aula('sede', 'forro', [5], '20:00', { vagas: 30, reserva: true, duracao: 90 }),
      aula('sede', 'zumba', [6], '10:00', { vagas: 30, reserva: false }),
      aula('sede', 'hip-hop', [2, 4], '17:00', { vagas: 20, reserva: false, publico: 'Juvenil' }),
    ],
    { plano: 'basico', descricao: 'Ballet, jazz, dança de salão, forró, hip hop e zumba no centro de São Lourenço.' },
  )
  compasso.eventos = [{ id: 'ev-festival', titulo: 'Festival de fim de ano', descricao: 'As turmas no palco do Centro de Convenções.', data: somarDias(hojeD(), 38), inicio: '19:00', unidade: 'sede', vou: [PESSOAS.julia.id] }]

  const aguas = base(
    'aguas-claras',
    'Academia Águas Claras',
    'aquatica',
    'roberto',
    { preset: 'oceano' },
    [unidade('sede', 'Sede', 'Av. Camilo Soares, 900', 'Centro', CAXAMBU, -21.9794, -44.9299, { comodidades: ['Piscina aquecida 25 m', 'Vestiário', 'Estacionamento'], agregadores: ['wellhub'], precoDesde: 15000 })],
    [oferecida('natacao', { descricao: 'Natação para bebês, crianças e adultos, piscina aquecida.' }), oferecida('hidroginastica'), oferecida('musculacao')],
    [
      aula('sede', 'natacao', SEG_SEX, '07:00', { vagas: 10, nivel: 'Adulto', duracao: 45, sala: 'Piscina' }),
      aula('sede', 'natacao', [1, 3, 5], '17:00', { vagas: 8, publico: 'Kids', nivel: 'Iniciante', duracao: 45, sala: 'Piscina' }),
      aula('sede', 'hidroginastica', [2, 4], '08:00', { vagas: 20, publico: 'Melhor idade', duracao: 45, sala: 'Piscina' }),
    ],
    { plano: 'basico', descricao: 'Natação e hidroginástica em piscina aquecida, e a sala de musculação.' },
  )

  const box = base(
    'box-serra',
    'Box Serra Cross',
    'box',
    'fernanda',
    { preset: 'energia' },
    [unidade('box', 'Box', 'R. Prefeito Luiz Antônio, 45', 'Centro', ITANHANDU, -22.2958, -44.9365, { horario: HORARIO_ESTUDIO, comodidades: ['Rig', 'Remo', 'Air bike'], precoDesde: 16000 })],
    [oferecida('cross-training', { descricao: 'O WOD do dia no mural e a turma junto.' }), oferecida('lpo'), oferecida('hiit')],
    [
      ...['06:00', '07:00', '12:00', '18:00', '19:00'].map((h) => aula('box', 'cross-training', SEG_SEX, h, { vagas: 14, duracao: 60 })),
      aula('box', 'lpo', [2, 4], '20:00', { vagas: 8 }),
      aula('box', 'hiit', [6], '09:00', { vagas: 16, duracao: 40 }),
    ],
    { descricao: 'Cross training, levantamento olímpico e HIIT em Itanhandu.' },
  )

  const vertice = base(
    'academia-vertice',
    'Academia Vértice',
    'academia',
    'igor',
    { preset: 'neon' },
    [unidade('centro', 'Centro', 'Av. Dr. Lisboa, 700', 'Centro', POUSO_ALEGRE, -22.2301, -45.9356, { precoDesde: 8990, agregadores: ['totalpass'] })],
    [oferecida('musculacao'), oferecida('funcional'), oferecida('spinning')],
    [aula('centro', 'funcional', SEG_SEX, '18:00', { vagas: 20 }), aula('centro', 'spinning', [1, 3, 5], '07:00', { vagas: 18, lugares: 18 })],
    { plano: 'basico', descricao: 'Academia 24 horas em Pouso Alegre (a 92 km: aparece com o raio de 100 km).' },
  )
  return [forca, tatame, equilibrio, compasso, aguas, box, vertice]
}

// ---------- Fichas e treinos ----------

const item = (exercicio: string, series: number, reps: string, carga: number | undefined, descanso: number, extra: Partial<ItemFicha> = {}): ItemFicha => ({ id: `i${exercicio.replace(/[^a-z]/g, '').slice(0, 10)}${series}`, exercicio, series, reps, ...(carga ? { carga } : {}), descanso, ...extra })

const DIVISOES_ANA: Divisao[] = [
  {
    id: 'divA',
    nome: 'Treino A',
    foco: 'Peito, ombro e tríceps',
    dias: [1, 4],
    itens: [
      item('supino-reto', 4, '8-10', 30, 90, { cadencia: '2-0-1' }),
      item('supino-inclinado-halteres', 3, '10-12', 12, 75),
      item('crucifixo-halteres', 3, '12', 8, 60),
      item('desenvolvimento-halteres', 3, '10', 10, 75),
      item('elevacao-lateral', 3, '12-15', 5, 45, { tecnica: 'drop-set', obs: 'Drop na última série' }),
      item('triceps-corda', 3, '12', 20, 45),
    ],
  },
  {
    id: 'divB',
    nome: 'Treino B',
    foco: 'Costas e bíceps',
    dias: [2, 5],
    itens: [item('puxada-frontal', 4, '10', 35, 75), item('remada-baixa', 3, '10-12', 30, 75), item('remada-unilateral', 3, '10', 14, 60), item('face-pull', 3, '15', 12, 45), item('rosca-direta', 3, '10', 15, 60), item('rosca-martelo', 3, '12', 8, 45)],
  },
  {
    id: 'divC',
    nome: 'Treino C',
    foco: 'Pernas e glúteos',
    dias: [3, 6],
    itens: [
      item('agachamento-livre', 4, '8-10', 40, 120),
      item('leg-press', 4, '12', 120, 90),
      item('stiff', 3, '10', 30, 75),
      item('elevacao-pelvica', 4, '10-12', 50, 75),
      item('cadeira-extensora', 3, '12-15', 35, 45, { tecnica: 'rest-pause' }),
      item('panturrilha-em-pe', 4, '15-20', 10, 30),
      item('prancha', 3, '40s', undefined, 30),
    ],
  },
]

const DIVISOES_INICIANTE: Divisao[] = [
  {
    id: 'divA',
    nome: 'Treino A',
    foco: 'Corpo todo',
    itens: [item('agachamento-livre', 3, '12', 20, 90), item('supino-reto', 3, '12', 20, 75), item('puxada-frontal', 3, '12', 25, 75), item('elevacao-lateral', 3, '12', 3, 45), item('prancha', 3, '30s', undefined, 30)],
  },
  {
    id: 'divB',
    nome: 'Treino B',
    foco: 'Corpo todo',
    itens: [item('leg-press', 3, '12', 80, 90), item('remada-baixa', 3, '12', 25, 75), item('flexao', 3, '10', undefined, 60), item('rosca-alternada', 3, '12', 6, 45), item('abdominal-supra', 3, '15', undefined, 30)],
  },
]

const DIVISOES_LUCAS: Divisao[] = [
  {
    id: 'divA',
    nome: 'Treino A',
    foco: 'Força de cima',
    itens: [item('barra-fixa', 4, '6-8', undefined, 90), item('supino-reto', 4, '6-8', 70, 120), item('remada-curvada', 4, '8', 60, 90), item('desenvolvimento-halteres', 3, '8-10', 20, 75)],
  },
  {
    id: 'divB',
    nome: 'Treino B',
    foco: 'Força de baixo',
    itens: [item('levantamento-terra', 4, '5', 110, 150), item('agachamento-livre', 4, '6-8', 90, 120), item('afundo', 3, '10', 16, 75), item('kettlebell-swing', 3, '15', 20, 60)],
  },
]

function ficha(id: string, aluno: ChavePessoa, autor: ChavePessoa, contexto: Ficha['contexto'], titulo: string, divisoes: Divisao[], inicioDias: number, previsaoDias: number, extra: Partial<Ficha> = {}): Ficha {
  const inicio = somarDias(hojeD(), -inicioDias)
  return {
    id,
    aluno: PESSOAS[aluno].id,
    autor: PESSOAS[autor].id,
    autorNome: PESSOAS[autor].nome,
    contexto,
    titulo,
    objetivo: 'Hipertrofia',
    inicio,
    previsao: somarDias(hojeD(), previsaoDias),
    divisoes,
    status: 'ativa',
    criadaEm: diasAtras(inicioDias, '10:00'),
    atualizadaEm: diasAtras(inicioDias, '10:00'),
    publicadaEm: diasAtras(inicioDias, '10:00'),
    vistaEm: diasAtras(inicioDias, '12:00'),
    ...extra,
  }
}

function fichas(): Ficha[] {
  return [
    ficha('fichademoana2', 'ana', 'rafa', { tipo: 'profissional', id: PESSOAS.rafa.id }, 'Hipertrofia, fase 2', DIVISOES_ANA, 22, 20, { obs: 'Aquecimento de 8 min na bike antes. Carga: a última série tem que ser difícil.', modelo: 'modelodemo01' }),
    ficha('fichademoana1', 'ana', 'diego', { tipo: 'empresa', id: 'forca-total', unidade: 'centro' }, 'Adaptação', DIVISOES_INICIANTE, 70, -22, { status: 'arquivada', objetivo: 'Condicionamento' }),
    ficha('fichademoluc1', 'lucas', 'rafa', { tipo: 'profissional', id: PESSOAS.rafa.id }, 'Força para o tatame', DIVISOES_LUCAS, 30, 5, { objetivo: 'Força' }),
    ficha('fichademobru1', 'bruna', 'rafa', { tipo: 'profissional', id: PESSOAS.rafa.id }, 'Hipertrofia, fase 2', DIVISOES_ANA, 15, 27, { modelo: 'modelodemo01' }),
    ficha('fichademomar1', 'marcos', 'rafa', { tipo: 'profissional', id: PESSOAS.rafa.id }, 'Hipertrofia, fase 2', DIVISOES_ANA, 40, -2, { modelo: 'modelodemo01' }),
    ficha('fichademosof1', 'sofia', 'diego', { tipo: 'empresa', id: 'forca-total', unidade: 'centro' }, 'Iniciante', DIVISOES_INICIANTE, 10, 32, { objetivo: 'Saúde e mobilidade' }),
    ficha('fichademocar1', 'carla', 'diego', { tipo: 'empresa', id: 'forca-total', unidade: 'centro' }, 'Emagrecimento', DIVISOES_INICIANTE, 35, 7, { objetivo: 'Emagrecimento' }),
    ficha('fichademolar1', 'larissa', 'camila', { tipo: 'profissional', id: PESSOAS.camila.id }, 'Funcional e força', DIVISOES_INICIANTE, 12, 18, { objetivo: 'Condicionamento' }),
    ficha('fichademoluc0', 'lucas', 'lucas', { tipo: 'propria' }, 'Meu treino de viagem', [DIVISOES_INICIANTE[0]], 60, 10, { status: 'arquivada', objetivo: 'Condicionamento' }),
  ]
}

// Os treinos de quem segue a ficha: N semanas, com a carga subindo aos poucos (e alguns recordes)
function historicoDe(conta: string, f: Ficha, semanas: number, porSemana: number, semente: number, local?: Treino['local']): Treino[] {
  const aleatorio = sorteio(semente)
  const treinos: Treino[] = []
  const totalDias = semanas * 7
  const dias = new Set<number>()
  for (let s = 0; s < semanas; s++) {
    const daSemana = [1, 2, 3, 4, 5, 6].sort(() => aleatorio() - 0.5).slice(0, porSemana)
    for (const d of daSemana) {
      const atras = totalDias - (s * 7 + d)
      if (atras >= 1) dias.add(atras)
    }
  }
  const ordem = [...dias].sort((a, b) => b - a)
  ordem.forEach((atras, i) => {
    const div = f.divisoes[i % f.divisoes.length]
    const progresso = 1 + (i / Math.max(1, ordem.length)) * 0.12
    const exercicios: ExercicioFeito[] = div.itens.map((it) => {
      const reps = Number(it.reps.split('-')[0]) || 0
      return {
        exercicio: it.exercicio,
        nome: EXERCICIO[it.exercicio]?.nome ?? it.exercicio,
        series: Array.from({ length: it.series }, (_, k) => ({ reps: reps ? Math.max(1, reps + (k === it.series - 1 ? -1 : 0)) : 1, carga: it.carga ? Math.round(it.carga * progresso * 2) / 2 : 0, feita: aleatorio() > 0.04 })),
      }
    })
    const hora = ['06:40', '07:10', '12:15', '18:20', '19:05'][Math.floor(aleatorio() * 5)]
    const inicio = diasAtras(atras, hora)
    const duracao = 45 + Math.floor(aleatorio() * 30)
    const antes = melhoresDe(treinos)
    treinos.push({
      id: `t${conta.slice(4, 10)}${String(atras).padStart(3, '0')}`,
      conta,
      nome: `${div.nome} · ${div.foco ?? ''}`.replace(/ · $/, ''),
      origem: 'ficha',
      ficha: f.id,
      divisao: div.id,
      inicio,
      fim: iso(Date.parse(inicio) + duracao * 60_000),
      duracaoMin: duracao,
      exercicios,
      volume: volume(exercicios),
      series: seriesFeitas(exercicios),
      recordes: recordes(exercicios, antes),
      esforco: 6 + Math.floor(aleatorio() * 4),
      ...(local ? { local } : {}),
    })
  })
  return treinos.sort((a, b) => b.inicio.localeCompare(a.inicio))
}

function treinoDeAula(conta: string, modalidade: string, nome: string, atras: number, hora: string, duracao: number, local: Treino['local']): Treino {
  const inicio = diasAtras(atras, hora)
  return { id: `ta${conta.slice(4, 9)}${modalidade.slice(0, 4).replace(/-/g, '')}${atras}`, conta, nome, origem: 'aula', modalidade, inicio, fim: iso(Date.parse(inicio) + duracao * 60_000), duracaoMin: duracao, exercicios: [], volume: 0, series: 0, recordes: [], local }
}

// ---------- A semeadura ----------

type Doc = [string, unknown]

export async function semear() {
  agora = Date.now()
  const docs: Doc[] = []
  const senha = await protegerSenha(`demo-${agora}-sem-login`) // as contas de demonstração não entram com senha
  const contas = new Map<string, ContaGuardada>()
  for (const [chave, p] of Object.entries(PESSOAS) as [ChavePessoa, Pessoa][]) {
    const c: ContaGuardada = {
      id: p.id,
      nome: p.nome,
      usuario: p.usuario,
      publico: p.publico ?? false,
      ...(p.bio ? { bio: p.bio } : {}),
      cidade: p.cidade,
      raio: 50,
      plano: p.mais ? 'mais' : 'gratis',
      metaSemanal: p.meta ?? 3,
      consentimentos: { medidas: chave === 'ana' ? [PESSOAS.rafa.id] : [] },
      criadaEm: iso(agora - 180 * 86_400_000),
      demo: true,
      senha,
      versao: 1,
    }
    contas.set(chave, c)
  }

  // as empresas, as equipes nas contas e o índice do mapa
  const lista = empresas()
  const porSlug = new Map(lista.map((e) => [e.slug, e]))
  for (const e of lista) {
    for (const m of e.equipe) {
      const chave = (Object.keys(PESSOAS) as ChavePessoa[]).find((k) => PESSOAS[k].id === m.id)!
      const c = contas.get(chave)!
      c.empresas = [...(c.empresas ?? []), { slug: e.slug, papel: m.papel }]
    }
  }

  // os profissionais
  const pro = (chave: ChavePessoa, dados: Partial<Profissional> & Pick<Profissional, 'slug' | 'personal'>): Profissional => ({
    id: PESSOAS[chave].id,
    nome: PESSOAS[chave].nome,
    especialidades: [],
    modalidades: ['musculacao'],
    cidade: PESSOAS[chave].cidade,
    raioKm: 15,
    online: false,
    locais: [],
    publico: true,
    visual: { preset: 'neon' },
    plano: 'premium',
    status: 'ativo',
    agenda: AGENDA_PROFESSOR,
    numeros: { alunosInstruidos: 0, alunosAtivos: 0, fichas: 0, treinos: 0, nota: { media: 0, total: 0 } },
    criadoEm: iso(agora - 400 * 86_400_000),
    demo: true,
    ...dados,
  })
  const profissionais: Profissional[] = [
    pro('rafa', {
      slug: 'rafael-moreira',
      personal: true,
      cref: '012345-G/MG',
      especialidades: ['Hipertrofia', 'Emagrecimento', 'Iniciantes', 'Treino feminino'],
      modalidades: ['musculacao', 'funcional'],
      bio: 'Personal há 8 anos em São Lourenço. Treino com método, sem enrolação: ficha clara, carga que sobe e acompanhamento de perto.',
      raioKm: 15,
      online: true,
      locais: [{ tipo: 'unidade', empresa: 'forca-total', unidade: 'centro' }, { tipo: 'domicilio' }, { tipo: 'online' }],
      visual: { preset: 'neon', destaque: '#b6f22e' },
      agenda: { ...AGENDA_PADRAO, locais: ['Força Total · Centro', 'Domicílio', 'Online'] },
      whatsapp: '00999991234',
      instagram: 'rafa.personal',
    }),
    pro('diego', {
      slug: 'diego-alves',
      personal: false,
      plano: 'nenhum',
      cref: '054321-G/MG',
      especialidades: ['Musculação', 'Jiu-jitsu', 'Preparação para luta'],
      modalidades: ['musculacao', 'jiu-jitsu', 'muay-thai'],
      bio: 'Professor na Força Total (Centro e Federal) e faixa preta de jiu-jitsu no CT Tatame Sul.',
      locais: [
        { tipo: 'unidade', empresa: 'forca-total', unidade: 'centro' },
        { tipo: 'unidade', empresa: 'forca-total', unidade: 'federal' },
        { tipo: 'unidade', empresa: 'ct-tatame-sul', unidade: 'sede' },
      ],
      visual: { preset: 'tatame' },
    }),
    pro('camila', {
      slug: 'camila-duarte',
      personal: true,
      plano: 'basico',
      cref: '067890-G/MG',
      especialidades: ['Funcional', 'Corrida', 'Emagrecimento'],
      modalidades: ['funcional', 'corrida', 'musculacao'],
      bio: 'Funcional e corrida em Caxambu. Treino no parque e consultoria online.',
      cidade: CAXAMBU,
      raioKm: 20,
      online: true,
      locais: [{ tipo: 'unidade', empresa: 'forca-total', unidade: 'caxambu' }, { tipo: 'outro', nome: 'Parque das Águas de Caxambu' }, { tipo: 'online' }],
      visual: { preset: 'energia' },
      agenda: { ...AGENDA_PADRAO, locais: ['Força Total · Caxambu', 'Parque das Águas', 'Online'] },
    }),
    pro('patricia', {
      slug: 'patricia-lima',
      personal: true,
      especialidades: ['Hipertrofia', 'Consultoria online'],
      modalidades: ['musculacao'],
      bio: 'Personal em Poços de Caldas. Consultoria online para todo o Brasil.',
      cidade: POCOS,
      raioKm: 15,
      online: true,
      locais: [{ tipo: 'unidade', empresa: 'forca-total', unidade: 'pocos' }, { tipo: 'online' }],
      visual: { preset: 'classica' },
      agenda: { ...AGENDA_PADRAO, locais: ['Força Total · Poços de Caldas', 'Online'] },
    }),
  ]
  for (const p of profissionais) {
    const chave = (Object.keys(PESSOAS) as ChavePessoa[]).find((k) => PESSOAS[k].id === p.id)!
    contas.get(chave)!.profissional = true
  }
  const proPorId = new Map(profissionais.map((p) => [p.id, p]))

  // os vínculos (o aluno com a academia e com o personal)
  const vinculos = new Map<string, Vinculo[]>()
  const alunosEmpresa = new Map<string, AlunoDoPainel[]>()
  const alunosPro = new Map<string, AlunoDoPainel[]>()
  const ligar = (aluno: ChavePessoa, alvo: { tipo: 'empresa' | 'profissional'; id: string; unidade?: string }, desdeDias: number, extra: Partial<AlunoDoPainel> = {}, status: Vinculo['status'] = 'ativo') => {
    const c = contas.get(aluno)!
    const desde = iso(agora - desdeDias * 86_400_000)
    vinculos.set(c.id, [...(vinculos.get(c.id) ?? []), { tipo: alvo.tipo, id: alvo.id, ...(alvo.unidade ? { unidade: alvo.unidade } : {}), status, desde, origem: 'demo' }])
    const mapa = alvo.tipo === 'empresa' ? alunosEmpresa : alunosPro
    mapa.set(alvo.id, [
      ...(mapa.get(alvo.id) ?? []),
      { id: c.id, nome: c.nome, usuario: c.usuario, status, desde, ...(alvo.unidade ? { unidade: alvo.unidade } : {}), modalidades: [], faixas: {}, treinosSemana: 0, medidas: c.consentimentos.medidas.includes(alvo.id), ...extra },
    ])
    if (!c.principal && status === 'ativo') c.principal = { tipo: alvo.tipo, id: alvo.id }
  }
  const FT = (u: string) => ({ tipo: 'empresa' as const, id: 'forca-total', unidade: u })
  ligar('ana', { tipo: 'profissional', id: PESSOAS.rafa.id }, 60)
  ligar('ana', FT('centro'), 120, { modalidades: ['musculacao', 'spinning'], responsavel: PESSOAS.diego.id })
  ligar('lucas', FT('centro'), 300, { modalidades: ['musculacao'] })
  ligar('lucas', { tipo: 'profissional', id: PESSOAS.rafa.id }, 45)
  const desdeLucas = iso(agora - 400 * 86_400_000)
  ligar('lucas', { tipo: 'empresa', id: 'ct-tatame-sul', unidade: 'sede' }, 400, {
    modalidades: ['jiu-jitsu'],
    faixas: {
      'jiu-jitsu': [
        { faixa: 'branca', graus: 4, desde: desdeLucas, por: PESSOAS.diego.nome },
        { faixa: 'azul', graus: 2, desde: iso(agora - 50 * 86_400_000), por: PESSOAS.diego.nome },
      ],
    },
  })
  ligar('bruna', { tipo: 'empresa', id: 'studio-equilibrio', unidade: 'studio' }, 200, { modalidades: ['pilates-aparelhos'] })
  ligar('bruna', { tipo: 'profissional', id: PESSOAS.rafa.id }, 20)
  ligar('marcos', { tipo: 'empresa', id: 'ct-tatame-sul', unidade: 'sede' }, 150, { modalidades: ['muay-thai'], faixas: { 'muay-thai': [{ faixa: 'vermelho', graus: 0, desde: iso(agora - 80 * 86_400_000), por: 'Júlio Castro' }] } })
  ligar('marcos', FT('federal'), 90, { modalidades: ['musculacao'] })
  ligar('marcos', { tipo: 'profissional', id: PESSOAS.rafa.id }, 50)
  ligar('julia', { tipo: 'empresa', id: 'danca-compasso', unidade: 'sede' }, 700, { modalidades: ['ballet', 'jazz'] })
  ligar('pedro', { tipo: 'empresa', id: 'box-serra', unidade: 'box' }, 220, { modalidades: ['cross-training', 'lpo'] })
  ligar('larissa', FT('caxambu'), 100, { modalidades: ['musculacao', 'zumba'] })
  ligar('larissa', { tipo: 'profissional', id: PESSOAS.camila.id }, 30)
  ligar('thiago', { tipo: 'empresa', id: 'aguas-claras', unidade: 'sede' }, 180, { modalidades: ['natacao'] })
  ligar('gabriel', FT('pocos'), 160, { modalidades: ['musculacao', 'spinning'] })
  ligar('gabriel', { tipo: 'profissional', id: PESSOAS.patricia.id }, 70)
  ligar('sofia', FT('centro'), 12, { modalidades: ['musculacao', 'zumba'], responsavel: PESSOAS.diego.id })
  ligar('carla', FT('centro'), 60, { modalidades: ['musculacao', 'spinning'], responsavel: PESSOAS.diego.id })
  // um pedido esperando a aprovação da academia
  ligar('thiago', FT('caxambu'), 1, {}, 'pendente')

  // as fichas, os treinos, as pegadas e o resumo dos alunos no painel
  const todasFichas = fichas()
  const treinos = new Map<string, Treino[]>()
  const somarTreinos = (chave: ChavePessoa, t: Treino[]) => treinos.set(PESSOAS[chave].id, [...(treinos.get(PESSOAS[chave].id) ?? []), ...t])
  const fichaDe = (id: string) => todasFichas.find((f) => f.id === id)!
  somarTreinos('ana', historicoDe(PESSOAS.ana.id, fichaDe('fichademoana2'), 3, 3, 11, { empresa: 'forca-total', unidade: 'centro' }))
  somarTreinos('ana', historicoDe(PESSOAS.ana.id, fichaDe('fichademoana1'), 7, 3, 12, { empresa: 'forca-total', unidade: 'centro' }).filter((t) => Date.parse(t.inicio) < agora - 23 * 86_400_000))
  somarTreinos('ana', [treinoDeAula(PESSOAS.ana.id, 'spinning', 'Aula de bike indoor', 2, '06:30', 45, { empresa: 'forca-total', unidade: 'centro' })])
  somarTreinos('lucas', historicoDe(PESSOAS.lucas.id, fichaDe('fichademoluc1'), 4, 3, 21, { empresa: 'forca-total', unidade: 'centro' }))
  somarTreinos('lucas', [1, 3, 6, 8, 10, 13].map((d) => treinoDeAula(PESSOAS.lucas.id, 'jiu-jitsu', 'Aula de jiu-jitsu', d, '19:00', 90, { empresa: 'ct-tatame-sul', unidade: 'sede' })))
  somarTreinos('bruna', historicoDe(PESSOAS.bruna.id, fichaDe('fichademobru1'), 2, 2, 31))
  somarTreinos('bruna', [2, 4, 9].map((d) => treinoDeAula(PESSOAS.bruna.id, 'pilates-aparelhos', 'Aula de pilates de aparelhos', d, '07:00', 55, { empresa: 'studio-equilibrio', unidade: 'studio' })))
  somarTreinos('marcos', historicoDe(PESSOAS.marcos.id, fichaDe('fichademomar1'), 5, 2, 41, { empresa: 'forca-total', unidade: 'federal' }).filter((t) => Date.parse(t.inicio) < agora - 9 * 86_400_000))
  somarTreinos('marcos', [2, 5, 7].map((d) => treinoDeAula(PESSOAS.marcos.id, 'muay-thai', 'Aula de muay thai', d, '20:30', 60, { empresa: 'ct-tatame-sul', unidade: 'sede' })))
  somarTreinos('julia', [1, 3, 6, 8].map((d) => treinoDeAula(PESSOAS.julia.id, d % 2 ? 'ballet' : 'jazz', d % 2 ? 'Aula de ballet' : 'Aula de jazz', d, '18:30', 60, { empresa: 'danca-compasso', unidade: 'sede' })))
  somarTreinos('pedro', [1, 2, 4, 5, 6].map((d) => treinoDeAula(PESSOAS.pedro.id, 'cross-training', 'WOD do dia', d, '07:00', 60, { empresa: 'box-serra', unidade: 'box' })))
  somarTreinos('sofia', historicoDe(PESSOAS.sofia.id, fichaDe('fichademosof1'), 2, 2, 51, { empresa: 'forca-total', unidade: 'centro' }))
  somarTreinos('carla', historicoDe(PESSOAS.carla.id, fichaDe('fichademocar1'), 5, 1, 61, { empresa: 'forca-total', unidade: 'centro' }).filter((t) => Date.parse(t.inicio) < agora - 12 * 86_400_000))
  somarTreinos('larissa', historicoDe(PESSOAS.larissa.id, fichaDe('fichademolar1'), 2, 3, 71, { empresa: 'forca-total', unidade: 'caxambu' }))
  somarTreinos('thiago', [1, 3, 5].map((d) => treinoDeAula(PESSOAS.thiago.id, 'natacao', 'Aula de natação', d, '07:00', 45, { empresa: 'aguas-claras', unidade: 'sede' })))
  somarTreinos('gabriel', historicoDe(PESSOAS.gabriel.id, { ...fichaDe('fichademosof1'), id: 'fichademogab1' }, 2, 3, 81, { empresa: 'forca-total', unidade: 'pocos' }))

  const semana = inicioDaSemana(hojeD())
  for (const [contaId, lista] of treinos) {
    lista.sort((a, b) => b.inicio.localeCompare(a.inicio))
    const ultimo = lista[0]?.inicio
    const naSemana = lista.filter((t) => dataDe(t.inicio) >= semana).length
    for (const mapa of [alunosEmpresa, alunosPro]) for (const l of mapa.values()) for (const a of l) if (a.id === contaId) Object.assign(a, { ultimoTreino: ultimo, treinosSemana: naSemana })
    // as pegadas
    const lugares = new Map<string, Lugar>()
    for (const t of [...lista].reverse()) {
      if (!t.local) continue
      const k = `${t.local.empresa}/${t.local.unidade}`
      const e = porSlug.get(t.local.empresa)!
      const u = e.unidades.find((x) => x.id === t.local!.unidade)!
      const nome = e.unidades.length > 1 ? `${e.nome} · ${u.nome}` : e.nome
      const atual = lugares.get(k)
      lugares.set(k, atual ? { ...atual, vezes: atual.vezes + 1, ultima: t.inicio } : { empresa: e.slug, unidade: u.id, nome, vezes: 1, primeira: t.inicio, ultima: t.inicio })
    }
    docs.push([CHAVES.lugares(contaId), [...lugares.values()].sort((a, b) => b.ultima.localeCompare(a.ultima))])
    const porAno = new Map<string, Treino[]>()
    for (const t of lista) porAno.set(t.inicio.slice(0, 4), [...(porAno.get(t.inicio.slice(0, 4)) ?? []), t])
    for (const [ano, l] of porAno) docs.push([CHAVES.treinosDo(contaId, ano), l])
  }

  // o resumo das fichas (aluno, profissional, academia) e a ficha atual no painel
  const fichasDoAluno = new Map<string, ResumoFicha[]>()
  const fichasDoPro = new Map<string, FichaDoPainel[]>()
  const fichasDaEmpresa = new Map<string, FichaDoPainel[]>()
  for (const f of todasFichas) {
    docs.push([CHAVES.ficha(f.id), f])
    const aluno = [...contas.values()].find((c) => c.id === f.aluno)!
    fichasDoAluno.set(f.aluno, [...(fichasDoAluno.get(f.aluno) ?? []), { id: f.id, titulo: f.titulo, autor: f.autor, autorNome: f.autorNome, contexto: f.contexto, status: f.status, inicio: f.inicio, previsao: f.previsao, atualizadaEm: f.atualizadaEm, publicadaEm: f.publicadaEm, vistaEm: f.vistaEm, divisoes: f.divisoes.length }])
    if (f.contexto.tipo === 'propria') continue
    const linha: FichaDoPainel = { id: f.id, aluno: f.aluno, alunoNome: aluno.nome, titulo: f.titulo, status: f.status, previsao: f.previsao, inicio: f.inicio, contexto: f.contexto, atualizadaEm: f.atualizadaEm, ...(f.modelo ? { modelo: f.modelo } : {}) }
    fichasDoPro.set(f.autor, [...(fichasDoPro.get(f.autor) ?? []), linha])
    if (f.contexto.tipo === 'empresa') fichasDaEmpresa.set(f.contexto.id, [...(fichasDaEmpresa.get(f.contexto.id) ?? []), linha])
    if (f.status === 'ativa') {
      const mapa = f.contexto.tipo === 'empresa' ? alunosEmpresa : alunosPro
      const alvo = f.contexto.tipo === 'empresa' ? f.contexto.id : f.autor
      const a = mapa.get(alvo)?.find((x) => x.id === f.aluno)
      if (a) a.fichaAtual = { id: f.id, titulo: f.titulo, previsao: f.previsao }
    }
  }

  // os modelos e um exercício próprio do Rafa
  docs.push([CHAVES.modelos(PESSOAS.rafa.id), [{ id: 'modelodemo01', autor: PESSOAS.rafa.id, titulo: 'Hipertrofia, fase 2 (ABC)', objetivo: 'Hipertrofia', semanas: 6, divisoes: DIVISOES_ANA, usos: 3, criadoEm: iso(agora - 60 * 86_400_000) }, { id: 'modelodemo02', autor: PESSOAS.rafa.id, titulo: 'Iniciante (AB)', objetivo: 'Condicionamento', semanas: 4, divisoes: DIVISOES_INICIANTE, usos: 5, criadoEm: iso(agora - 90 * 86_400_000) }]])
  docs.push([CHAVES.exerciciosProprios(PESSOAS.rafa.id), [{ id: 'p-demorafa01', autor: PESSOAS.rafa.id, nome: 'Agachamento com pausa', grupo: 'pernas', base: 'agachamento-livre', equipamento: 'Barra', instrucoes: 'Segure 2 segundos embaixo, sem relaxar o abdômen.', criadoEm: iso(agora - 30 * 86_400_000) }]])

  // as medidas da Ana (a última feita pelo Rafa)
  const medidasAna: Medida[] = [0, 14, 28, 42, 56].map((d, i) => ({
    id: `mdemoana${i}`,
    data: somarDias(hojeD(), -d - 3),
    peso: Math.round((61.8 + i * 0.55) * 10) / 10,
    altura: 165,
    gordura: Math.round((24.5 + i * 0.6) * 10) / 10,
    circ: { cintura: 70 + i, abdomen: 77 + i * 1.2, quadril: 99 + i * 0.4, bracoD: 27.5 - i * 0.2, coxaD: 56 - i * 0.1 },
    fotos: [],
    ...(i === 0 ? { por: { id: PESSOAS.rafa.id, nome: PESSOAS.rafa.nome }, obs: 'Avaliação da fase 2: cintura caindo e a força subindo.' } : {}),
  }))
  docs.push([CHAVES.medidas(PESSOAS.ana.id), medidasAna])

  // as avaliações
  const avaliacao = (de: ChavePessoa, estrelas: number, motivos: string[], texto: string | undefined, dias: number, resposta?: string): Avaliacao => ({ de: PESSOAS[de].id, deNome: PESSOAS[de].nome, estrelas, motivos, ...(texto ? { texto } : {}), em: iso(agora - dias * 86_400_000), ...(resposta ? { resposta: { texto: resposta, em: iso(agora - (dias - 1) * 86_400_000) } } : {}) })
  const avaliacoes: [string, Avaliacao[]][] = [
    [CHAVES.avaliacoes('profissional', PESSOAS.rafa.id), [avaliacao('ana', 5, ['Explica bem', 'Motivador', 'Treinos variados'], 'Em 2 meses com o Rafa eu entendi o que estou fazendo na academia. A ficha no app com o boneco ajuda demais.', 6, 'Obrigado, Ana! Bora pra fase 3 💪'), avaliacao('lucas', 5, ['Pontual', 'Corrige a postura'], 'Meu levantamento terra mudou de nível.', 20), avaliacao('bruna', 5, ['Atencioso', 'Responde rápido'], undefined, 9), avaliacao('marcos', 4, ['Treinos variados'], 'Muito bom, só queria mais horários à noite.', 30, 'Valeu, Marcos! Abri as 20h na quinta.')]],
    [CHAVES.avaliacoes('profissional', PESSOAS.diego.id), [avaliacao('ana', 5, ['Explica bem', 'Atencioso'], 'O Diego montou minha primeira ficha com toda a paciência.', 70), avaliacao('lucas', 5, ['Motivador'], 'O melhor professor de jiu-jitsu da região.', 40), avaliacao('sofia', 5, ['Explica bem'], undefined, 5), avaliacao('carla', 4, ['Pontual'], undefined, 25)]],
    [CHAVES.avaliacoes('profissional', PESSOAS.camila.id), [avaliacao('larissa', 5, ['Motivador', 'Treinos variados'], 'O treino no parque é a melhor parte da semana.', 8), avaliacao('thiago', 4, ['Atencioso'], undefined, 40)]],
    [CHAVES.avaliacoes('profissional', PESSOAS.patricia.id), [avaliacao('gabriel', 5, ['Explica bem', 'Responde rápido'], 'A consultoria online funciona muito bem.', 14)]],
    [CHAVES.avaliacoes('empresa', 'forca-total'), [avaliacao('ana', 5, ['Equipamentos', 'Professores', 'Limpeza'], 'Academia completa e a ficha no app é ótima.', 10, 'Obrigada, Ana! Te esperamos no aulão.'), avaliacao('lucas', 4, ['Equipamentos'], 'Lota no horário das 18h.', 30), avaliacao('sofia', 5, ['Ambiente', 'Atendimento'], undefined, 4), avaliacao('carla', 4, ['Aulas', 'Localização'], undefined, 18), avaliacao('larissa', 5, ['Professores'], 'A unidade de Caxambu é ótima.', 12), avaliacao('gabriel', 4, ['Equipamentos', 'Não lota'], undefined, 22)]],
    [CHAVES.avaliacoes('empresa', 'ct-tatame-sul'), [avaliacao('lucas', 5, ['Professores', 'Ambiente'], 'Família. Treino há mais de um ano aqui.', 50), avaliacao('marcos', 5, ['Professores', 'Aulas'], undefined, 15)]],
    [CHAVES.avaliacoes('empresa', 'studio-equilibrio'), [avaliacao('bruna', 5, ['Atendimento', 'Ambiente', 'Não lota'], 'Turma pequena faz toda a diferença.', 20)]],
    [CHAVES.avaliacoes('empresa', 'danca-compasso'), [avaliacao('julia', 5, ['Professores', 'Aulas'], 'Danço aqui desde pequena.', 60)]],
    [CHAVES.avaliacoes('empresa', 'aguas-claras'), [avaliacao('thiago', 4, ['Aulas', 'Limpeza'], 'Piscina aquecida de verdade.', 35)]],
    [CHAVES.avaliacoes('empresa', 'box-serra'), [avaliacao('pedro', 5, ['Ambiente', 'Professores'], 'A turma das 7h é a melhor.', 11)]],
  ]
  for (const [chave, l] of avaliacoes) docs.push([chave, l])
  const notaPor = new Map(avaliacoes.map(([chave, l]) => [chave, notaDe(l)]))
  for (const e of lista) e.numeros = { alunos: (alunosEmpresa.get(e.slug) ?? []).filter((a) => a.status === 'ativo').length, nota: notaPor.get(CHAVES.avaliacoes('empresa', e.slug)) ?? { media: 0, total: 0 }, treinosSemana: 0 }

  // os números dos profissionais
  for (const p of profissionais) {
    const alunos = alunosPro.get(p.id) ?? []
    const fs = (fichasDoPro.get(p.id) ?? []).filter((f) => f.status !== 'rascunho')
    const instruidos = new Set([...alunos.map((a) => a.id), ...fs.map((f) => f.aluno)])
    const ativos = new Set([...alunos.filter((a) => a.status === 'ativo').map((a) => a.id), ...fs.filter((f) => f.status === 'ativa').map((f) => f.aluno)])
    const extraInstruidos = p.id === PESSOAS.rafa.id ? 118 : p.id === PESSOAS.diego.id ? 236 : p.id === PESSOAS.camila.id ? 41 : 63 // a carreira antes da plataforma
    p.numeros = {
      alunosInstruidos: instruidos.size + extraInstruidos,
      alunosAtivos: ativos.size,
      fichas: fs.length + Math.round(extraInstruidos * 2.2),
      treinos: [...treinos.values()].flat().filter((t) => t.ficha && todasFichas.find((f) => f.id === t.ficha)?.autor === p.id).length + extraInstruidos * 9,
      nota: notaPor.get(CHAVES.avaliacoes('profissional', p.id)) ?? { media: 0, total: 0 },
    }
  }

  // a rede: os posts dos últimos dias, com 💪 e comentários
  const posts: Post[] = []
  const comentarios = new Map<string, Comentario[]>()
  let nPost = 0
  const postar = (autor: ChavePessoa, atras: number, hora: string, dados: Partial<Post>, fortes: ChavePessoa[] = [], coments: [ChavePessoa, string][] = []) => {
    const id = `pdemo${(++nPost).toString().padStart(3, '0')}`
    const c = contas.get(autor)!
    const local = dados.local
    const e = local ? porSlug.get(local.empresa) : undefined
    const u = e?.unidades.find((x) => x.id === local?.unidade)
    const criadoEm = diasAtras(atras, hora)
    const post: Post = {
      id,
      autor: c.id,
      tipo: 'foto',
      criadoEm,
      marcados: e ? [{ tipo: 'empresa', id: e.slug, nome: e.nome }] : [],
      ponto: u?.ponto ?? { lat: c.cidade!.lat, lng: c.cidade!.lng },
      fortes: fortes.map((k) => PESSOAS[k].id),
      comentarios: coments.length,
      denuncias: [],
      ...(c.publico ? {} : { privado: true }),
      ...dados,
    }
    posts.push(post)
    if (coments.length) comentarios.set(id, coments.map(([k, texto], i) => ({ id: `cdemo${nPost}x${i}`, autor: PESSOAS[k].id, texto, criadoEm: iso(Date.parse(criadoEm) + (i + 1) * 23 * 60_000) })))
    return post
  }
  const doTreino = (chave: ChavePessoa, i: number) => {
    const t = treinos.get(PESSOAS[chave].id)!.filter((x) => x.origem === 'ficha')[i]
    return t ? { nome: t.nome, duracaoMin: t.duracaoMin, volume: t.volume, series: t.series, exercicios: t.exercicios.length, recordes: t.recordes.length } : undefined
  }
  const localFT = (u = 'centro') => ({ empresa: 'forca-total', unidade: u, nome: u === 'centro' ? 'Força Total · Centro' : `Força Total · ${porSlug.get('forca-total')!.unidades.find((x) => x.id === u)!.nome}` })
  postar('ana', 0, '07:52', { tipo: 'treino', texto: 'Treino C pago! Agachamento subiu de novo 🔥', treino: doTreino('ana', 0), local: localFT(), marcados: [{ tipo: 'empresa', id: 'forca-total', nome: 'Força Total' }, { tipo: 'profissional', id: PESSOAS.rafa.id, nome: PESSOAS.rafa.nome }] }, ['rafa', 'lucas', 'sofia', 'carla', 'marta'], [['rafa', 'Isso! Semana que vem sobe mais 2,5 kg 😈'], ['sofia', 'Inspiração 👏']])
  postar('lucas', 0, '21:40', { tipo: 'aula', texto: 'Rola de sexta com a turma toda. Oss 🥋', aula: { modalidade: 'jiu-jitsu', nome: 'Aula de jiu-jitsu' }, local: { empresa: 'ct-tatame-sul', unidade: 'sede', nome: 'CT Tatame Sul' }, marcados: [{ tipo: 'empresa', id: 'ct-tatame-sul', nome: 'CT Tatame Sul' }, { tipo: 'profissional', id: PESSOAS.diego.id, nome: PESSOAS.diego.nome }] }, ['diego', 'marcos', 'ana'], [['diego', 'Oss! Treino forte hoje']])
  postar('julia', 1, '19:35', { tipo: 'aula', texto: 'Ensaio para o festival começou 🩰✨', aula: { modalidade: 'ballet', nome: 'Aula de ballet' }, local: { empresa: 'danca-compasso', unidade: 'sede', nome: 'Escola de Dança Compasso' } }, ['beatriz', 'ana', 'sofia'], [['beatriz', 'Vai ser lindo! 💜']])
  postar('pedro', 1, '08:10', { tipo: 'aula', texto: 'WOD de hoje: 21-15-9 de thruster e barra. Quase morri, mas tá pago ✅', aula: { modalidade: 'cross-training', nome: 'WOD do dia' }, local: { empresa: 'box-serra', unidade: 'box', nome: 'Box Serra Cross' } }, ['fernanda', 'lucas'], [['fernanda', 'Mandou muito, Pedro!']])
  postar('bruna', 2, '08:05', { tipo: 'aula', texto: 'Reformer cedinho para começar o dia leve.', aula: { modalidade: 'pilates-aparelhos', nome: 'Aula de pilates de aparelhos' }, local: { empresa: 'studio-equilibrio', unidade: 'studio', nome: 'Studio Equilíbrio' } }, ['helena', 'ana'])
  postar('ana', 2, '07:20', { tipo: 'aula', texto: 'Bike das 6h30 com a turma 🚴‍♀️', aula: { modalidade: 'spinning', nome: 'Aula de bike indoor' }, local: localFT() }, ['carla', 'marta'])
  postar('larissa', 2, '19:10', { tipo: 'treino', texto: 'Treino com a Camila no parque e depois a academia 💪', treino: doTreino('larissa', 0), local: localFT('caxambu'), marcados: [{ tipo: 'profissional', id: PESSOAS.camila.id, nome: PESSOAS.camila.nome }, { tipo: 'empresa', id: 'forca-total', nome: 'Força Total' }] }, ['camila', 'thiago'], [['camila', 'Orgulho dessa aluna!']])
  postar('marcos', 2, '21:45', { tipo: 'aula', texto: 'Muay thai de terça. Canela doendo, coração feliz.', aula: { modalidade: 'muay-thai', nome: 'Aula de muay thai' }, local: { empresa: 'ct-tatame-sul', unidade: 'sede', nome: 'CT Tatame Sul' } }, ['lucas', 'julio'])
  postar('lucas', 3, '20:15', { tipo: 'conquista', conquista: { tipo: 'recorde', texto: 'Recorde no levantamento terra: 130 kg' }, texto: 'Anos atrás eu não levantava nem a barra. Valeu, Rafa!', marcados: [{ tipo: 'profissional', id: PESSOAS.rafa.id, nome: PESSOAS.rafa.nome }] }, ['rafa', 'ana', 'diego', 'pedro', 'bruna', 'marcos'], [['rafa', 'Monstro! Próxima meta: 140 💥'], ['ana', 'Que isso, Lucas!']])
  postar('thiago', 3, '07:55', { tipo: 'aula', texto: '1.500 m sem parar pela primeira vez 🏊', aula: { modalidade: 'natacao', nome: 'Aula de natação' }, local: { empresa: 'aguas-claras', unidade: 'sede', nome: 'Academia Águas Claras' } }, ['roberto', 'larissa'])
  postar('sofia', 3, '19:00', { tipo: 'treino', texto: 'Primeira semana completa! O Diego disse que logo sobe a carga.', treino: doTreino('sofia', 0), local: localFT(), marcados: [{ tipo: 'profissional', id: PESSOAS.diego.id, nome: PESSOAS.diego.nome }] }, ['diego', 'ana', 'carla', 'marta'], [['diego', 'Isso aí, Sofia! Constância é tudo.'], ['marta', 'Bem-vinda à Força Total 💛']])
  postar('rafa', 4, '12:30', { tipo: 'foto', texto: 'Dica do dia: no supino, junte as escápulas e mantenha os pés firmes. O boneco 3D da ficha mostra o movimento certinho. Quem é meu aluno já tem no app 😉' }, ['ana', 'lucas', 'bruna', 'marcos', 'sofia'])
  postar('ana', 4, '19:30', { tipo: 'treino', texto: 'Treino B pago ✅', treino: doTreino('ana', 1), local: localFT() }, ['rafa', 'lucas'])
  postar('carla', 5, '06:58', { tipo: 'aula', texto: 'Bike + musculação. Semana começando bem.', aula: { modalidade: 'spinning', nome: 'Aula de bike indoor' }, local: localFT() }, ['ana', 'sofia'])
  postar('pedro', 5, '08:00', { tipo: 'aula', texto: 'Levantamento olímpico: arranco com 60 kg 🏋️', aula: { modalidade: 'lpo', nome: 'Aula de levantamento olímpico' }, local: { empresa: 'box-serra', unidade: 'box', nome: 'Box Serra Cross' } }, ['fernanda'])
  postar('lucas', 6, '21:00', { tipo: 'conquista', conquista: { tipo: 'faixa', texto: 'Faixa azul de jiu-jitsu, 2 graus' }, texto: 'Mais um grau! Obrigado, professor Diego 🙏', marcados: [{ tipo: 'empresa', id: 'ct-tatame-sul', nome: 'CT Tatame Sul' }, { tipo: 'profissional', id: PESSOAS.diego.id, nome: PESSOAS.diego.nome }] }, ['diego', 'marcos', 'julio', 'ana', 'rafa'], [['diego', 'Merecido!']])
  postar('camila', 6, '07:30', { tipo: 'foto', texto: 'Treino no Parque das Águas às 7h toda terça e quinta. Vem!' }, ['larissa', 'thiago'])
  // longe da região de São Lourenço (Poços de Caldas, a 161 km): só aparece para quem está por lá
  postar('gabriel', 0, '18:40', { tipo: 'treino', texto: 'Treino pago em Poços 💪', treino: doTreino('gabriel', 0), local: localFT('pocos') }, ['patricia'])
  postar('patricia', 1, '12:00', { tipo: 'foto', texto: 'Consultoria online aberta para novos alunos. Chama no chat!' }, ['gabriel'])
  postar('gabriel', 3, '19:20', { tipo: 'aula', texto: 'Bike das 7h em Poços.', aula: { modalidade: 'spinning', nome: 'Aula de bike indoor' }, local: localFT('pocos') }, [])

  const feed: LinhaFeed[] = posts
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    .map((p) => ({ id: p.id, autor: p.autor, criadoEm: p.criadoEm, tipo: p.tipo, ...(p.ponto ? { ponto: p.ponto } : {}), empresas: p.marcados.filter((m) => m.tipo === 'empresa').map((m) => m.id), ...(p.privado ? { privado: true } : {}) }))
  for (const p of posts) docs.push([CHAVES.post(p.id), p])
  for (const [id, l] of comentarios) docs.push([CHAVES.comentarios(id), l])
  const postsDe = new Map<string, string[]>()
  for (const p of posts) postsDe.set(p.autor, [...(postsDe.get(p.autor) ?? []), p.id])
  for (const [autor, ids] of postsDe) docs.push([CHAVES.postsDo(autor), ids])
  const postsDaEmpresa = new Map<string, string[]>()
  for (const p of posts) for (const m of p.marcados.filter((x) => x.tipo === 'empresa')) postsDaEmpresa.set(m.id, [...(postsDaEmpresa.get(m.id) ?? []), p.id])
  for (const [slug, ids] of postsDaEmpresa) docs.push([CHAVES.postsDaEmpresa(slug), ids])

  // quem segue quem (o Marcos tem perfil privado: a Ana pediu para seguir)
  const seguindo = new Map<string, Seguindo>()
  const seguidores = new Map<string, Seguidores>()
  const segue = (de: ChavePessoa, para: ChavePessoa[], pedido = false) => {
    for (const p of para) {
      const a = PESSOAS[de].id
      const b = PESSOAS[p].id
      const s = seguindo.get(a) ?? { seguindo: [], pedidos: [] }
      const t = seguidores.get(b) ?? { aprovados: [], pedidos: [] }
      if (pedido) {
        s.pedidos.push(b)
        t.pedidos.push(a)
      } else {
        s.seguindo.push(b)
        t.aprovados.push(a)
      }
      seguindo.set(a, s)
      seguidores.set(b, t)
    }
  }
  segue('ana', ['rafa', 'lucas', 'sofia', 'carla', 'diego', 'bruna', 'julia'])
  segue('ana', ['marcos'], true)
  segue('lucas', ['ana', 'rafa', 'diego', 'pedro'])
  segue('rafa', ['ana', 'lucas', 'bruna', 'marcos'])
  segue('sofia', ['ana', 'carla', 'diego'])
  segue('carla', ['ana', 'sofia'])
  segue('bruna', ['ana', 'rafa'])
  segue('diego', ['lucas', 'ana', 'sofia'])
  segue('marcos', ['lucas', 'rafa'])
  segue('julia', ['ana'])
  for (const [id, s] of seguindo) docs.push([CHAVES.seguindo(id), s])
  for (const [id, s] of seguidores) docs.push([CHAVES.seguidores(id), s])

  // os desafios
  const desafios: Desafio[] = []
  const desafio = (id: string, nome: string, criador: ChavePessoa, oficial: Desafio['oficial'], inicioAtras: number, duracao: number, pontuacao: Desafio['pontuacao'], codigo: string, participantes: ChavePessoa[], extra: Partial<Desafio> = {}) => {
    const inicio = somarDias(hojeD(), -inicioAtras)
    const fim = somarDias(inicio, duracao - 1)
    const d: Desafio = { id, nome, criador: PESSOAS[criador].id, ...(oficial ? { oficial } : {}), inicio, fim, pontuacao, codigo, publico: !!oficial, participantes: {}, criadoEm: diasAtras(inicioAtras + 1), demo: true, ...extra }
    for (const k of participantes) {
      let p = novoParticipante(PESSOAS[k].nome)
      for (const t of [...(treinos.get(PESSOAS[k].id) ?? [])].reverse()) {
        const dia = dataDe(t.inicio)
        if (dia >= inicio && dia <= fim) p = somarTreino(p, pontuacao, { dia, minutos: t.duracaoMin, em: t.inicio })
      }
      d.participantes[PESSOAS[k].id] = p
    }
    desafios.push(d)
  }
  desafio('desafiodemo01', 'Desafio 30 dias Força Total', 'marta', { tipo: 'empresa', id: 'forca-total', nome: 'Força Total' }, 12, 30, 'dias', 'FORCA30', ['ana', 'lucas', 'sofia', 'carla', 'larissa', 'gabriel', 'marcos'], { descricao: 'Treine 20 dias em 30 e concorra a um mês grátis.', premio: 'Um mês grátis de academia' })
  desafio('desafiodemo02', 'Galera do Tatame', 'lucas', undefined, 20, 45, 'checkins', 'TATAME', ['lucas', 'marcos', 'diego'])
  desafio('desafiodemo03', 'Verão sem desculpa', 'rafa', { tipo: 'profissional', id: PESSOAS.rafa.id, nome: PESSOAS.rafa.nome }, 6, 40, 'minutos', 'VERAO40', ['ana', 'lucas', 'bruna', 'marcos'], { descricao: 'Os minutos de treino de todos os meus alunos. Bora!', premio: 'Uma avaliação física grátis' })
  for (const d of desafios) {
    docs.push([CHAVES.desafio(d.id), d])
    docs.push([CHAVES.codigoDesafio(d.codigo), { id: d.id }])
  }
  const desafiosDe = new Map<string, string[]>()
  for (const d of desafios) for (const id of Object.keys(d.participantes)) desafiosDe.set(id, [...(desafiosDe.get(id) ?? []), d.id])
  for (const [id, l] of desafiosDe) docs.push([CHAVES.desafiosDo(id), l])
  const linhasDesafio: LinhaDesafio[] = desafios.map((d) => ({ id: d.id, nome: d.nome, inicio: d.inicio, fim: d.fim, pontuacao: d.pontuacao, publico: d.publico, ...(d.oficial ? { oficial: d.oficial } : {}), codigo: d.codigo, participantes: Object.keys(d.participantes).length, demo: true }))

  // a agenda do Rafa: as sessões fixas da Ana e do Lucas e algumas avulsas na semana
  const fixas: SessaoFixa[] = [
    { id: 'fixademo01', aluno: PESSOAS.ana.id, alunoNome: PESSOAS.ana.nome, dias: [1, 3, 5], inicio: '07:00', duracao: 60, local: 'Força Total · Centro', desde: somarDias(hojeD(), -50) },
    { id: 'fixademo02', aluno: PESSOAS.lucas.id, alunoNome: PESSOAS.lucas.nome, dias: [2, 4], inicio: '18:00', duracao: 60, local: 'Força Total · Centro', desde: somarDias(hojeD(), -40) },
  ]
  docs.push([CHAVES.fixas(PESSOAS.rafa.id), fixas])
  const avulsas: Sessao[] = [1, 2, 4].map((d, i) => {
    const data = somarDias(hojeD(), d)
    const quem = (['bruna', 'marcos', 'bruna'] as ChavePessoa[])[i]
    const inicio = ['09:00', '17:00', '08:00'][i]
    return { id: `sessaodemo0${i}`, profissional: PESSOAS.rafa.id, aluno: PESSOAS[quem].id, alunoNome: PESSOAS[quem].nome, data, inicio, fim: `${String(Number(inicio.slice(0, 2)) + 1).padStart(2, '0')}:00`, local: i === 1 ? 'Domicílio' : 'Força Total · Centro', status: 'marcada', criadaPor: 'aluno' }
  })
  const porDia = new Map<string, Sessao[]>()
  for (const s of avulsas) porDia.set(s.data, [...(porDia.get(s.data) ?? []), s])
  for (const [data, l] of porDia) docs.push([CHAVES.agenda(PESSOAS.rafa.id, data), l])
  const sessoesDoAluno = new Map<string, SessaoDoAluno[]>()
  for (const s of avulsas) sessoesDoAluno.set(s.aluno, [...(sessoesDoAluno.get(s.aluno) ?? []), { id: s.id, profissional: s.profissional, profissionalNome: PESSOAS.rafa.nome, data: s.data, inicio: s.inicio, fim: s.fim, ...(s.local ? { local: s.local } : {}), status: s.status }])
  for (const [id, l] of sessoesDoAluno) docs.push([CHAVES.sessoesDo(id), l])

  // as reservas de hoje e de amanhã (a bike quase cheia, o pilates lotado com fila)
  const reservasDoAluno = new Map<string, ReservaDoAluno[]>()
  const folhas = new Map<string, FolhaDoDia>()
  const nomesFicticios = ['Paula', 'Renato', 'Cíntia', 'Vagner', 'Elaine', 'Murilo', 'Tânia', 'Otávio', 'Regina', 'Hugo', 'Nádia', 'Sérgio', 'Lívia', 'Caio', 'Denise', 'Fábio', 'Gisele', 'Rui']
  const reservarDemo = (slug: string, modalidade: string, unidadeId: string, inicio: string, d: number, quantos: number, espera: ChavePessoa[] = [], alunos: ChavePessoa[] = []) => {
    const e = porSlug.get(slug)!
    const data = somarDias(hojeD(), d)
    const a = e.grade.find((x) => x.modalidade === modalidade && x.unidade === unidadeId && x.inicio === inicio && x.dias.includes(diaDaSemana(data)))
    if (!a) return
    const chave = CHAVES.folha(slug, unidadeId, data)
    const folha = folhas.get(chave) ?? {}
    const reservas = [
      ...alunos.map((k, i) => ({ conta: PESSOAS[k].id, nome: PESSOAS[k].nome, em: iso(agora - 3600_000 * (i + 2)), ...(a.lugares ? { lugar: i + 3 } : {}) })),
      ...nomesFicticios.slice(0, Math.max(0, quantos - alunos.length)).map((nome, i) => ({ conta: `demofic${slug.slice(0, 4)}${i}`, nome, em: iso(agora - 3600_000 * (i + 5)), ...(a.lugares ? { lugar: i + 3 + alunos.length } : {}) })),
    ].slice(0, a.vagas || 99)
    folha[a.id] = { reservas, espera: espera.map((k) => ({ conta: PESSOAS[k].id, nome: PESSOAS[k].nome, em: iso(agora - 1800_000) })), presentes: [] }
    folhas.set(chave, folha)
    const nome = `${nomeModalidade(modalidade)} · ${e.unidades.length > 1 ? `${e.nome} · ${e.unidades.find((u) => u.id === unidadeId)!.nome}` : e.nome}`
    for (const k of alunos) reservasDoAluno.set(PESSOAS[k].id, [...(reservasDoAluno.get(PESSOAS[k].id) ?? []), { empresa: slug, unidade: unidadeId, aula: a.id, data, inicio: a.inicio, modalidade, nome, situacao: 'reservada', ...(a.lugares ? { lugar: 3 + alunos.indexOf(k) } : {}) }])
    for (const k of espera) reservasDoAluno.set(PESSOAS[k].id, [...(reservasDoAluno.get(PESSOAS[k].id) ?? []), { empresa: slug, unidade: unidadeId, aula: a.id, data, inicio: a.inicio, modalidade, nome, situacao: 'espera' }])
  }
  for (const d of [0, 1, 2, 3]) {
    reservarDemo('forca-total', 'spinning', 'centro', '06:30', d, 17, [], d === 1 || d === 3 ? ['ana', 'carla'] : [])
    reservarDemo('forca-total', 'spinning', 'centro', '19:00', d, 14)
    reservarDemo('forca-total', 'jump', 'centro', '08:00', d, 9)
    reservarDemo('forca-total', 'funcional', 'centro', '07:00', d, 11)
    reservarDemo('studio-equilibrio', 'pilates-aparelhos', 'studio', '07:00', d, 4, d === 1 ? ['ana'] : [], ['bruna'])
    reservarDemo('studio-equilibrio', 'pilates-aparelhos', 'studio', '18:00', d, 3)
    reservarDemo('box-serra', 'cross-training', 'box', '07:00', d, 12, [], ['pedro'])
  }
  for (const [chave, f] of folhas) docs.push([chave, f])
  for (const [id, l] of reservasDoAluno) docs.push([CHAVES.reservasDo(id), l.sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio))])

  // um pedido de aula experimental esperando a resposta da Força Total, e as conversas
  const conversas: Conversa[] = []
  const linhasConversa = new Map<string, LinhaConversa[]>()
  const conversar = async (a: Lado, b: Lado, nomeA: string, nomeB: string, mensagens: [0 | 1, string, number][]) => {
    const id = await idDaConversa(a, b)
    const ms = mensagens.map(([quem, texto, min], i) => ({ id: `mdemo${id.slice(1, 8)}${i}`, de: quem === 0 ? (a.tipo === 'conta' ? a.id : PESSOAS.marta.id) : b.tipo === 'conta' ? b.id : PESSOAS.marta.id, lado: quem === 0 ? a : b, texto, em: iso(agora - min * 60_000) }))
    const ultima = ms[ms.length - 1]
    conversas.push({ id, lados: [a, b], mensagens: ms, lidas: { [chaveDoLado(a)]: ultima.em }, criadaEm: ms[0].em, atualizadaEm: ultima.em })
    const deA = ultima.lado.tipo === a.tipo && ultima.lado.id === a.id
    const curto = ultima.texto.length > 80 ? `${ultima.texto.slice(0, 80)}…` : ultima.texto
    linhasConversa.set(chaveDoLado(a), [...(linhasConversa.get(chaveDoLado(a)) ?? []), { id, com: b, nome: nomeB, ultima: curto, ultimaEm: ultima.em, deMim: deA, lidaEm: ultima.em }])
    linhasConversa.set(chaveDoLado(b), [...(linhasConversa.get(chaveDoLado(b)) ?? []), { id, com: a, nome: nomeA, ultima: curto, ultimaEm: ultima.em, deMim: !deA, ...(deA ? {} : { lidaEm: ultima.em }) }])
    return id
  }
  const conta = (k: ChavePessoa): Lado => ({ tipo: 'conta', id: PESSOAS[k].id })
  await conversar(conta('rafa'), conta('ana'), PESSOAS.rafa.nome, PESSOAS.ana.nome, [
    [0, 'Bom dia, Ana! Subi a carga do agachamento na ficha C. Faz e me conta como foi.', 60 * 26],
    [1, 'Fiz hoje! Senti bem, a última série foi difícil do jeito que você falou 😅', 60 * 3],
    [0, 'Perfeito. Sexta a gente faz a avaliação da fase 2.', 60 * 2],
  ])
  await conversar(conta('ana'), { tipo: 'empresa', id: 'forca-total' }, PESSOAS.ana.nome, 'Força Total', [
    [0, 'Oi! O aulão na praça é aberto para amigos também?', 60 * 30],
    [1, 'É sim, Ana! Pode trazer quem quiser. Só pedir para fazer o cadastro no app 😉', 60 * 29],
  ])
  const conversaExperimental = await conversar(conta('julia'), { tipo: 'empresa', id: 'forca-total' }, PESSOAS.julia.nome, 'Força Total', [[0, 'Oi! Quero fazer uma aula experimental de funcional na Força Total · Centro, amanhã às 07:00.', 50]])
  await conversar(conta('lucas'), conta('diego'), PESSOAS.lucas.nome, PESSOAS.diego.nome, [
    [0, 'Professor, amanhã tem treino de competição?', 60 * 8],
    [1, 'Tem sim, 19h. Chega 15 min antes para aquecer.', 60 * 7],
  ])
  await conversar({ tipo: 'empresa', id: 'forca-total' }, conta('camila'), 'Força Total', PESSOAS.camila.nome, [
    [0, 'Camila, topa dar o aulão de funcional em Caxambu no mês que vem?', 60 * 50],
    [1, 'Topo! Me manda as datas.', 60 * 48],
  ])
  for (const c of conversas) docs.push([CHAVES.conversa(c.id), c])
  for (const [lado, l] of linhasConversa) docs.push([CHAVES.conversasDo(lado as `conta:${string}`), l.sort((a, b) => b.ultimaEm.localeCompare(a.ultimaEm))])
  const experimentais: PedidoExperimental[] = [
    { id: 'expdemo01', conta: PESSOAS.julia.id, nome: PESSOAS.julia.nome, aula: porSlug.get('forca-total')!.grade.find((a) => a.modalidade === 'funcional' && a.unidade === 'centro' && a.inicio === '07:00')!.id, modalidade: 'funcional', unidade: 'centro', data: somarDias(hojeD(), 1), status: 'novo', em: iso(agora - 50 * 60_000), conversa: conversaExperimental },
  ]
  docs.push([CHAVES.experimentais('forca-total'), experimentais])

  // os avisos da Ana (o sino já com alguma coisa)
  docs.push([CHAVES.avisos(PESSOAS.ana.id), [
    { id: 'avdemo1', tipo: 'forte', texto: 'Rafael Moreira e mais 4 deram 💪 no seu post.', link: `/rede/p/${posts.find((p) => p.autor === PESSOAS.ana.id)!.id}`, em: iso(agora - 40 * 60_000) },
    { id: 'avdemo2', tipo: 'mensagem', texto: 'Rafael Moreira: Perfeito. Sexta a gente faz a avaliação da fase 2.', link: `/mensagens/${conversas[0].id}`, em: iso(agora - 120 * 60_000) },
    { id: 'avdemo3', tipo: 'ficha', texto: 'Ficha nova: Hipertrofia, fase 2, de Rafael Moreira.', link: '/fichas/fichademoana2', em: iso(agora - 22 * 86_400_000), lido: true },
  ]])
  docs.push([CHAVES.avisos(PESSOAS.marta.id), [{ id: 'avdemo4', tipo: 'experimental', texto: 'Júlia Rocha pediu uma aula experimental de funcional.', link: '/painel/forca-total/contatos', em: iso(agora - 50 * 60_000) }]])

  // tudo para o armazém: as contas e os ponteiros, as empresas, os profissionais, as listas
  for (const c of contas.values()) {
    docs.push([CHAVES.conta(c.id), c], [CHAVES.usuario(c.usuario), { id: c.id }])
    docs.push([CHAVES.vinculos(c.id), vinculos.get(c.id) ?? []])
    docs.push([CHAVES.fichasDo(c.id), (fichasDoAluno.get(c.id) ?? []).sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm))])
  }
  for (const e of lista) docs.push([CHAVES.empresa(e.slug), e], [CHAVES.pagina(e.slug), { tipo: 'empresa', id: e.slug }], [CHAVES.alunosDaEmpresa(e.slug), alunosEmpresa.get(e.slug) ?? []], [CHAVES.fichasDaEmpresa(e.slug), fichasDaEmpresa.get(e.slug) ?? []])
  for (const p of profissionais) docs.push([CHAVES.profissional(p.id), p], [CHAVES.pagina(p.slug), { tipo: 'profissional', id: p.id }], [CHAVES.alunosDoProfissional(p.id), alunosPro.get(p.id) ?? []], [CHAVES.fichasDoProfissional(p.id), fichasDoPro.get(p.id) ?? []])
  // um endereço que já é de uma página de verdade nunca é sobrescrito pela demonstração
  const ocupadas = new Set<string>()
  for (const [chave] of docs.filter(([k]) => k.startsWith('paginas/') || k.startsWith('empresas/e/'))) {
    const atual = await lerJSON<{ demo?: boolean; tipo?: string; id?: string } | null>(chave, null)
    if (!atual) continue
    const deVerdade = chave.startsWith('empresas/e/') ? !atual.demo : atual.tipo === 'empresa' ? !(await lerJSON<{ demo?: boolean } | null>(CHAVES.empresa(atual.id ?? ''), null))?.demo : !String(atual.id ?? '').startsWith('demo')
    if (deVerdade) ocupadas.add(chave)
  }
  if (ocupadas.size) console.error('Demonstração: endereços já usados por páginas de verdade ficaram de fora', [...ocupadas])
  await emParalelo(docs.filter(([chave]) => !ocupadas.has(chave)), ([chave, valor]) => blobs().setJSON(chave, valor), 48)

  // os índices compartilhados: tira o que era da demonstração e põe o novo
  const idsDemo = new Set([...contas.values()].map((c) => c.id))
  const slugsDemo = new Set(lista.map((e) => e.slug))
  await atualizar<LinhaFeed[]>(CHAVES.feed, [], (l) => [...feed, ...l.filter((x) => !idsDemo.has(x.autor) && !x.id.startsWith('pdemo'))].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)))
  await atualizar<LinhaUnidade[]>(CHAVES.indiceUnidades, [], (l) => [...l.filter((x) => !slugsDemo.has(x.empresa)), ...lista.flatMap((e) => linhasDe(e))])
  await atualizar<LinhaDesafio[]>(CHAVES.desafios, [], (l) => [...linhasDesafio, ...l.filter((x) => !x.id.startsWith('desafiodemo'))])
  for (const p of profissionais) await indexarProfissional(proPorId.get(p.id)!)
}

// ---------- Garantir que a demonstração existe (e está em dia) ----------

type Marca = { versao: number; em: number; fazendo?: number }

let garantida = 0

export async function garantirDemonstracao() {
  // os testes que querem a plataforma vazia desligam a demonstração
  if (env('TURMA_SEM_DEMONSTRACAO')) return
  if (Date.now() - garantida < 60_000) return
  const b = blobs()
  const entrada = await b.getWithMetadata(CHAVES.semente, { type: 'json' })
  const marca = entrada?.data as Marca | undefined
  const emDia = marca && marca.versao === VERSAO_DEMO && Date.now() - marca.em < VALIDADE
  if (emDia) {
    garantida = Date.now()
    return
  }
  // alguém já está recriando (há menos de 1 minuto): segue com o que tem
  if (marca?.fazendo && Date.now() - marca.fazendo < 60_000) return
  const pegar: Marca = { versao: marca?.versao ?? 0, em: marca?.em ?? 0, fazendo: Date.now() }
  const pegou = entrada ? await b.setJSON(CHAVES.semente, pegar, { onlyIfMatch: entrada.etag! }) : await b.setJSON(CHAVES.semente, pegar, { onlyIfNew: true })
  if (!pegou.modified) return
  try {
    await semear()
    await b.setJSON(CHAVES.semente, { versao: VERSAO_DEMO, em: Date.now() } satisfies Marca)
    garantida = Date.now()
  } catch (e) {
    console.error('Demonstração: não deu para criar agora', e instanceof Error ? e.message : e)
    await b.setJSON(CHAVES.semente, { versao: marca?.versao ?? 0, em: 0 } satisfies Marca).catch(() => null)
  }
}

export const esquecerDemonstracao = () => {
  garantida = 0
}

// ---------- A conta de quem experimenta como aluno ----------

// Uma cópia da Ana: as mesmas fichas, treinos, medidas e vínculos, numa conta só dela (some em um
// dia). O que ela faz não aparece para os outros.
export async function criarAlunoDeVisita(): Promise<ContaGuardada> {
  const ana = await lerJSON<ContaGuardada | null>(CHAVES.conta(PESSOAS.ana.id), null)
  if (!ana) throw new Error('A demonstração ainda não existe.')
  const sufixo = Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36)
  const id = `demovisita${sufixo}`.slice(0, 30)
  const usuario = `ana.visita.${sufixo}`.slice(0, 30)
  const [vinculos, fichasLista, medidas, lugares, desafios, sessoes, reservas] = await Promise.all([
    lerJSON<Vinculo[]>(CHAVES.vinculos(ana.id), []),
    lerJSON<ResumoFicha[]>(CHAVES.fichasDo(ana.id), []),
    lerJSON<Medida[]>(CHAVES.medidas(ana.id), []),
    lerJSON<Lugar[]>(CHAVES.lugares(ana.id), []),
    lerJSON<string[]>(CHAVES.desafiosDo(ana.id), []),
    lerJSON<SessaoDoAluno[]>(CHAVES.sessoesDo(ana.id), []),
    lerJSON<ReservaDoAluno[]>(CHAVES.reservasDo(ana.id), []),
  ])
  const anos = [new Date().getFullYear(), new Date().getFullYear() - 1].map(String)
  const treinosPorAno = await Promise.all(anos.map((a) => lerJSON<Treino[]>(CHAVES.treinosDo(ana.id, a), [])))
  const novaFicha = (f: string) => `${f}v${sufixo}`.slice(0, 40)
  const fichasCompletas = await Promise.all(fichasLista.map((f) => lerJSON<Ficha | null>(CHAVES.ficha(f.id), null)))
  const conta: ContaGuardada = { ...ana, id, usuario, publico: false, demo: undefined, visita: true, criadaEm: new Date().toISOString(), consentimentos: { medidas: [PESSOAS.rafa.id] }, versao: 1 }
  const docs: Doc[] = [
    [CHAVES.conta(id), conta],
    [CHAVES.usuario(usuario), { id }],
    [CHAVES.vinculos(id), vinculos],
    [CHAVES.fichasDo(id), fichasLista.map((f) => ({ ...f, id: novaFicha(f.id) }))],
    [CHAVES.medidas(id), medidas],
    [CHAVES.lugares(id), lugares],
    [CHAVES.sessoesDo(id), sessoes],
    [CHAVES.reservasDo(id), reservas.filter((r) => r.situacao !== 'espera')],
    [CHAVES.desafiosDo(id), desafios],
    ...fichasCompletas.filter((f): f is Ficha => !!f).map<Doc>((f) => [CHAVES.ficha(novaFicha(f.id)), { ...f, id: novaFicha(f.id), aluno: id }]),
    ...anos.map<Doc>((a, i) => [CHAVES.treinosDo(id, a), treinosPorAno[i].map((t) => ({ ...t, id: `${t.id}v${sufixo}`.slice(0, 40), conta: id, ficha: t.ficha ? novaFicha(t.ficha) : undefined, post: undefined }))]),
    [CHAVES.avisos(id), [{ id: 'av1', tipo: 'ficha', texto: 'Bem-vinda! Você está experimentando como a Ana, aluna da Força Total e do Rafael Moreira. O que você faz aqui só você vê.', link: '/inicio', em: new Date().toISOString() }]],
  ]
  await emParalelo(docs, ([chave, valor]) => blobs().setJSON(chave, valor), 24)
  // entra nos desafios da Ana com os mesmos pontos (no ranking, só ela se vê)
  for (const d of desafios) await atualizar<Desafio | null>(CHAVES.desafio(d), null, (x) => (x && x.participantes[ana.id] ? { ...x, participantes: { ...x.participantes, [id]: { ...x.participantes[ana.id] } } } : x)).catch(() => null)
  return conta
}

export const ehDaDemonstracao = (id: string) => id.startsWith('demo')
