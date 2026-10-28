import { EXERCICIO } from './exercicios.ts'
import { limpar, limparTexto } from './texto.ts'
import { DATA, diasEntre, hoje, somarDias } from './tempo.ts'
import type { Divisao, Ficha, ItemFicha, Tecnica } from './tipos.ts'

// As regras da ficha de treino (seção 9 do estudo), iguais no navegador (que monta) e no servidor
// (que guarda). A data de previsão é quando trocar a ficha: 6 semanas por padrão; no atendimento à
// distância, 30 dias (Resolução CONFEF 542/2024, a conferir).

export const SEMANAS_PADRAO = 6
export const DIAS_ONLINE = 30
export const MAX_DIVISOES = 7
export const MAX_ITENS = 14
export const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

export const TECNICAS: Record<Tecnica, string> = {
  normal: 'Normal',
  'bi-set': 'Bi-set',
  'tri-set': 'Tri-set',
  'drop-set': 'Drop-set',
  piramide: 'Pirâmide',
  'rest-pause': 'Rest-pause',
  isometria: 'Isometria',
}

export const OBJETIVOS = ['Hipertrofia', 'Emagrecimento', 'Força', 'Condicionamento', 'Resistência', 'Saúde e mobilidade', 'Reabilitação', 'Preparação para luta']

export const previsaoPadrao = (inicio: string, online = false) => somarDias(inicio, online ? DIAS_ONLINE : SEMANAS_PADRAO * 7)

// "12", "8-12", "40s", "1min", "20min": o que a série pede
export const REPS = /^(\d{1,3})(?:-(\d{1,3}))?$|^(\d{1,3})(s|min)$/

export function lerReps(reps: string): { min: number; max: number; segundos?: number } {
  const m = reps.trim().match(REPS)
  if (!m) return { min: 10, max: 10 }
  if (m[3]) {
    const n = Number(m[3])
    const segundos = m[4] === 'min' ? n * 60 : n
    return { min: 0, max: 0, segundos }
  }
  const min = Number(m[1])
  const max = m[2] ? Math.max(min, Number(m[2])) : min
  return { min, max }
}

export const textoReps = (reps: string) => {
  const r = lerReps(reps)
  if (r.segundos) return r.segundos >= 60 && r.segundos % 60 === 0 ? `${r.segundos / 60} min` : `${r.segundos} s`
  return r.min === r.max ? `${r.min}` : `${r.min} a ${r.max}`
}

const novoIdLocal = () => Math.random().toString(36).slice(2, 10)

// Limpa um item que veio de fora: o exercício existe, os números estão no lugar
export function limparItem(dado: unknown, exerciciosProprios: Set<string> = new Set()): ItemFicha | null {
  if (!dado || typeof dado !== 'object') return null
  const d = dado as Record<string, unknown>
  const exercicio = typeof d.exercicio === 'string' ? d.exercicio : ''
  if (!EXERCICIO[exercicio] && !exerciciosProprios.has(exercicio)) return null
  const reps = typeof d.reps === 'string' && REPS.test(d.reps.trim()) ? d.reps.trim() : (EXERCICIO[exercicio]?.reps ?? '10')
  const series = Math.min(10, Math.max(1, Math.round(Number(d.series) || 3)))
  const descanso = Math.min(600, Math.max(0, Math.round(Number(d.descanso) || 0)))
  const carga = Number(d.carga)
  const tecnica = typeof d.tecnica === 'string' && d.tecnica in TECNICAS ? (d.tecnica as Tecnica) : undefined
  const cadencia = typeof d.cadencia === 'string' && /^\d-\d-\d(-\d)?$/.test(d.cadencia) ? d.cadencia : undefined
  const obs = limpar(d.obs, 160)
  return {
    id: typeof d.id === 'string' && /^[a-z0-9]{4,16}$/.test(d.id) ? d.id : novoIdLocal(),
    exercicio,
    series,
    reps,
    ...(Number.isFinite(carga) && carga > 0 ? { carga: Math.round(Math.min(carga, 999) * 2) / 2 } : {}),
    descanso,
    ...(tecnica && tecnica !== 'normal' ? { tecnica } : {}),
    ...(cadencia ? { cadencia } : {}),
    ...(obs ? { obs } : {}),
  }
}

export function limparDivisoes(dado: unknown, exerciciosProprios?: Set<string>): Divisao[] {
  if (!Array.isArray(dado)) return []
  return dado.slice(0, MAX_DIVISOES).map((d, i) => {
    const x = (d ?? {}) as Record<string, unknown>
    const itens = Array.isArray(x.itens) ? x.itens.slice(0, MAX_ITENS).map((it) => limparItem(it, exerciciosProprios)).filter((it): it is ItemFicha => !!it) : []
    const dias = Array.isArray(x.dias) ? [...new Set(x.dias.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort() : []
    const foco = limpar(x.foco, 60)
    return {
      id: typeof x.id === 'string' && /^[a-z0-9]{4,16}$/.test(x.id) ? x.id : novoIdLocal(),
      nome: limpar(x.nome, 24) || `Treino ${LETRAS[i]}`,
      ...(foco ? { foco } : {}),
      ...(dias.length ? { dias } : {}),
      itens,
    }
  })
}

// O cabeçalho da ficha (título, objetivo, datas, observações)
export function limparCabecalho(d: Record<string, unknown>) {
  const titulo = limpar(d.titulo, 60)
  const objetivo = limpar(d.objetivo, 40)
  const online = d.online === true
  const inicio = typeof d.inicio === 'string' && DATA.test(d.inicio) ? d.inicio : hoje()
  let previsao = typeof d.previsao === 'string' && DATA.test(d.previsao) ? d.previsao : previsaoPadrao(inicio, online)
  if (diasEntre(inicio, previsao) < 7) previsao = somarDias(inicio, 7)
  if (diasEntre(inicio, previsao) > 180) previsao = somarDias(inicio, 180)
  const obs = limparTexto(d.obs, 600)
  return { titulo, objetivo: objetivo || undefined, online: online || undefined, inicio, previsao, obs: obs || undefined }
}

export type SituacaoFicha = 'rascunho' | 'em-dia' | 'vencendo' | 'vencida' | 'arquivada'

export function situacao(f: Pick<Ficha, 'status' | 'previsao'>, dia = hoje()): SituacaoFicha {
  if (f.status === 'rascunho') return 'rascunho'
  if (f.status === 'arquivada') return 'arquivada'
  const faltam = diasEntre(dia, f.previsao)
  if (faltam < 0) return 'vencida'
  if (faltam <= 7) return 'vencendo'
  return 'em-dia'
}

export const TEXTO_SITUACAO: Record<SituacaoFicha, string> = {
  rascunho: 'Rascunho',
  'em-dia': 'Em dia',
  vencendo: 'Troca em breve',
  vencida: 'Hora de trocar',
  arquivada: 'Arquivada',
}

// A próxima divisão da rotação: a seguinte à última feita (fez a A, hoje é a B)
export function proximaDivisao(ficha: Pick<Ficha, 'divisoes'>, ultimaFeita?: string) {
  if (!ficha.divisoes.length) return undefined
  const i = ficha.divisoes.findIndex((d) => d.id === ultimaFeita)
  return ficha.divisoes[(i + 1) % ficha.divisoes.length]
}

// Copia a ficha (para outro aluno, ou de um modelo): ids novos e as datas a partir de hoje
export function copiarDivisoes(divisoes: Divisao[]): Divisao[] {
  return divisoes.map((d) => ({ ...d, id: novoIdLocal(), itens: d.itens.map((it) => ({ ...it, id: novoIdLocal() })) }))
}

export const totalExercicios = (f: Pick<Ficha, 'divisoes'>) => f.divisoes.reduce((s, d) => s + d.itens.length, 0)

// Quanto tempo a divisão leva, por alto: 40 s por série mais o descanso, e o tempo dos exercícios de tempo
export function duracaoEstimada(d: Divisao) {
  let s = 0
  for (const it of d.itens) {
    const r = lerReps(it.reps)
    s += it.series * ((r.segundos ?? 40) + it.descanso)
  }
  return Math.max(10, Math.round(s / 60 / 5) * 5)
}
