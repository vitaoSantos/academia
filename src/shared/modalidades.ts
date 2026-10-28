import { SISTEMAS } from './graduacao.ts'
import type { ModalidadeOferecida } from './tipos.ts'

// O catálogo de modalidades (seção 8 do estudo): 42 modalidades em 10 famílias. Cada família tem uma
// necessidade própria além da grade: vagas, lugar marcado (a bike, o aparelho do pilates), faixas
// (as lutas), nível (natação, dança) e público (kids, melhor idade).

export type Familia = 'musculacao' | 'funcional' | 'coletivas' | 'bike' | 'corpo-mente' | 'lutas' | 'danca' | 'aquaticas' | 'ar-livre' | 'especiais'

export const FAMILIAS: Record<Familia, { nome: string; cor: string; descricao: string }> = {
  musculacao: { nome: 'Musculação', cor: '#f5c518', descricao: 'A sala de musculação, com a ficha de cada aluno' },
  funcional: { nome: 'Funcional e cross', cor: '#e5484d', descricao: 'Turmas com vagas e o treino do dia no mural' },
  coletivas: { nome: 'Aulas coletivas', cor: '#f07a12', descricao: 'Jump, step, ritmos: livre ou com reserva' },
  bike: { nome: 'Bike', cor: '#3e7bfa', descricao: 'Reserva com a bike marcada' },
  'corpo-mente': { nome: 'Corpo e mente', cor: '#7fa38a', descricao: 'Turmas pequenas e o aparelho marcado' },
  lutas: { nome: 'Lutas', cor: '#d4252f', descricao: 'Faixas e graus, turmas por idade e presença' },
  danca: { nome: 'Dança', cor: '#c8467a', descricao: 'Níveis, turmas por idade e as apresentações' },
  aquaticas: { nome: 'Aquáticas', cor: '#1ea5c9', descricao: 'Níveis e vagas por raia' },
  'ar-livre': { nome: 'Corrida e ar livre', cor: '#2fb171', descricao: 'O ponto de encontro no mapa' },
  especiais: { nome: 'Públicos especiais', cor: '#9b7be0', descricao: 'Kids, melhor idade e gestantes' },
}

export type ModalidadeCatalogo = {
  id: string
  nome: string
  familia: Familia
  descricao: string
  duracao: number // minutos típicos
  vagas: number // por turma, típico (0 = sem limite)
  reserva: boolean // costuma pedir reserva
  lugarMarcado?: boolean
  graduacao?: keyof typeof SISTEMAS
  niveis: string[]
  publicos: string[]
}

const NIVEIS = ['Todos', 'Iniciante', 'Intermediário', 'Avançado']
const ADULTO = ['Adulto']
const IDADES = ['Kids', 'Juvenil', 'Adulto']

const m = (id: string, nome: string, familia: Familia, descricao: string, extra: Partial<ModalidadeCatalogo> = {}): ModalidadeCatalogo => ({
  id,
  nome,
  familia,
  descricao,
  duracao: 60,
  vagas: 20,
  reserva: false,
  niveis: NIVEIS,
  publicos: ADULTO,
  ...extra,
})

export const MODALIDADES: ModalidadeCatalogo[] = [
  // musculação
  m('musculacao', 'Musculação', 'musculacao', 'Treino com pesos e máquinas, pela ficha montada pelo professor.', { vagas: 0, duracao: 60 }),
  // funcional e cross
  m('funcional', 'Funcional', 'funcional', 'Movimentos do dia a dia com o peso do corpo, elásticos e kettlebell, em circuito.', { vagas: 16, reserva: true, duracao: 50 }),
  m('cross-training', 'Cross training', 'funcional', 'Treino do dia (WOD) com levantamentos, ginástica e condicionamento.', { vagas: 14, reserva: true }),
  m('hiit', 'HIIT', 'funcional', 'Tiros curtos e intensos com pausas, para o condicionamento.', { vagas: 16, reserva: true, duracao: 40 }),
  m('circuito', 'Circuito', 'funcional', 'Estações em sequência, com tempo em cada uma.', { vagas: 16, duracao: 45 }),
  m('lpo', 'Levantamento olímpico', 'funcional', 'Arranco e arremesso, com técnica e progressão de carga.', { vagas: 8, reserva: true, niveis: ['Iniciante', 'Intermediário', 'Avançado'] }),
  m('calistenia', 'Calistenia', 'funcional', 'Força com o peso do corpo: barra, paralela, parada de mão.', { vagas: 12 }),
  // aulas coletivas
  m('jump', 'Jump', 'coletivas', 'Aula aeróbica no mini trampolim, com música.', { vagas: 20, reserva: true, lugarMarcado: true, duracao: 45 }),
  m('step', 'Step', 'coletivas', 'Coreografias na plataforma, para o condicionamento.', { vagas: 20, duracao: 50 }),
  m('gap', 'GAP', 'coletivas', 'Glúteos, abdômen e pernas.', { vagas: 25, duracao: 45 }),
  m('localizada', 'Localizada', 'coletivas', 'Exercícios por grupo muscular com halteres, caneleiras e barras.', { vagas: 25, duracao: 50 }),
  m('zumba', 'Zumba', 'coletivas', 'Dança fitness com ritmos latinos.', { vagas: 30, duracao: 55 }),
  m('ritmos', 'Ritmos', 'coletivas', 'Aula aeróbica dançada com ritmos brasileiros.', { vagas: 30, duracao: 55 }),
  m('fitdance', 'FitDance', 'coletivas', 'As coreografias do momento, para suar dançando.', { vagas: 30, duracao: 50 }),
  // bike
  m('spinning', 'Bike indoor (spinning)', 'bike', 'Pedal com música e variação de carga e ritmo.', { vagas: 24, reserva: true, lugarMarcado: true, duracao: 45 }),
  // corpo e mente
  m('pilates-aparelhos', 'Pilates de aparelhos', 'corpo-mente', 'Reformer, cadillac e chair, em turmas pequenas.', { vagas: 4, reserva: true, lugarMarcado: true, duracao: 55 }),
  m('pilates-solo', 'Pilates de solo', 'corpo-mente', 'O método no colchonete, com bola e elástico.', { vagas: 12, reserva: true, duracao: 55 }),
  m('yoga', 'Yoga', 'corpo-mente', 'Posturas, respiração e relaxamento.', { vagas: 15, reserva: true, duracao: 60 }),
  m('alongamento', 'Alongamento', 'corpo-mente', 'Mobilidade e flexibilidade para todas as idades.', { vagas: 20, duracao: 40 }),
  // lutas
  m('jiu-jitsu', 'Jiu-jitsu', 'lutas', 'Arte suave: quedas, raspagens e finalizações no chão.', { vagas: 30, graduacao: 'jiu-jitsu', publicos: IDADES, duracao: 90 }),
  m('muay-thai', 'Muay thai', 'lutas', 'A arte das oito armas: socos, chutes, joelhadas e cotoveladas.', { vagas: 25, graduacao: 'muay-thai', publicos: IDADES }),
  m('boxe', 'Boxe', 'lutas', 'Técnica de socos, esquivas e condicionamento.', { vagas: 20 }),
  m('kickboxing', 'Kickboxing', 'lutas', 'Socos e chutes, com saco e manopla.', { vagas: 20, graduacao: 'kickboxing' }),
  m('judo', 'Judô', 'lutas', 'Quedas e imobilizações, com disciplina e respeito.', { vagas: 25, graduacao: 'judo', publicos: IDADES }),
  m('karate', 'Karatê', 'lutas', 'Katas e kumite, com as faixas do estilo.', { vagas: 25, graduacao: 'karate', publicos: IDADES }),
  m('taekwondo', 'Taekwondo', 'lutas', 'Chutes, poomsae e luta olímpica.', { vagas: 25, graduacao: 'taekwondo', publicos: IDADES }),
  m('capoeira', 'Capoeira', 'lutas', 'Luta, dança e música: a roda, a ginga e as cordas.', { vagas: 30, graduacao: 'capoeira', publicos: IDADES }),
  m('mma', 'MMA', 'lutas', 'Artes marciais mistas: em pé e no chão.', { vagas: 16, niveis: ['Intermediário', 'Avançado'] }),
  m('krav-maga', 'Krav maga', 'lutas', 'Defesa pessoal para situações reais.', { vagas: 20 }),
  // dança
  m('ballet', 'Ballet', 'danca', 'Técnica clássica, da iniciação às pontas.', { vagas: 15, publicos: IDADES, niveis: ['Baby class', 'Iniciação', 'Intermediário', 'Avançado'] }),
  m('jazz', 'Jazz', 'danca', 'Técnica, giros e coreografia.', { vagas: 18, publicos: IDADES }),
  m('danca-de-salao', 'Dança de salão', 'danca', 'Samba de gafieira, bolero, soltinho e zouk, a dois.', { vagas: 24 }),
  m('forro', 'Forró', 'danca', 'O xote, o baião e o arrasta-pé.', { vagas: 24 }),
  m('hip-hop', 'Hip hop', 'danca', 'Danças urbanas: grooves, freestyle e coreografia.', { vagas: 20, publicos: IDADES }),
  m('danca-do-ventre', 'Dança do ventre', 'danca', 'Movimentos de quadril, braços e a expressão.', { vagas: 15 }),
  // aquáticas
  m('natacao', 'Natação', 'aquaticas', 'Os quatro estilos, da adaptação ao treino.', { vagas: 12, reserva: true, publicos: ['Bebês', 'Kids', 'Adulto'], niveis: ['Adaptação', 'Iniciante', 'Intermediário', 'Avançado'], duracao: 45 }),
  m('hidroginastica', 'Hidroginástica', 'aquaticas', 'Exercícios na água, leves para as articulações.', { vagas: 20, publicos: ['Adulto', 'Melhor idade', 'Gestantes'], duracao: 45 }),
  // corrida e ar livre
  m('corrida', 'Assessoria de corrida', 'ar-livre', 'Planilha e treino em grupo, do 5 km à maratona.', { vagas: 0, duracao: 60 }),
  m('bootcamp', 'Treino ao ar livre', 'ar-livre', 'Funcional na praça ou no parque.', { vagas: 20, duracao: 50 }),
  // públicos especiais
  m('melhor-idade', 'Ginástica para a melhor idade', 'especiais', 'Força, equilíbrio e mobilidade, com cuidado.', { vagas: 15, publicos: ['Melhor idade'], niveis: ['Todos'] }),
  m('gestantes', 'Treino para gestantes', 'especiais', 'Exercício seguro em cada fase da gestação (com liberação médica).', { vagas: 8, reserva: true, publicos: ['Gestantes'], niveis: ['Todos'] }),
  m('kids', 'Recreação kids', 'especiais', 'Brincadeiras que desenvolvem a coordenação.', { vagas: 15, publicos: ['Kids'], niveis: ['Todos'] }),
]

export const MODALIDADE = Object.fromEntries(MODALIDADES.map((x) => [x.id, x])) as Record<string, ModalidadeCatalogo>

export const nomeModalidade = (id: string) => MODALIDADE[id]?.nome ?? id
export const familiaDe = (id: string) => FAMILIAS[MODALIDADE[id]?.familia ?? 'musculacao']

// A modalidade como a academia liga: os padrões do catálogo, com as faixas quando é luta
export function modalidadeInicial(id: string): ModalidadeOferecida | null {
  const c = MODALIDADE[id]
  if (!c) return null
  return {
    id,
    inclusa: true,
    niveis: [...c.niveis],
    publicos: [...c.publicos],
    ...(c.graduacao ? { graduacao: structuredClone(SISTEMAS[c.graduacao]) } : {}),
  }
}

// As modalidades que cada tipo de empresa costuma ter (o cadastro já sugere)
export const SUGERIDAS: Record<string, string[]> = {
  academia: ['musculacao', 'funcional', 'spinning', 'jump', 'zumba', 'alongamento'],
  rede: ['musculacao', 'funcional', 'spinning', 'jump', 'zumba', 'alongamento'],
  estudio: ['pilates-aparelhos', 'pilates-solo', 'yoga', 'funcional'],
  box: ['cross-training', 'lpo', 'hiit', 'calistenia'],
  ct: ['jiu-jitsu', 'muay-thai', 'boxe', 'judo'],
  danca: ['ballet', 'jazz', 'danca-de-salao', 'forro', 'hip-hop', 'zumba'],
  aquatica: ['natacao', 'hidroginastica', 'musculacao'],
}
