import { EXERCICIO } from './exercicios.ts'
import { dataDe, inicioDaSemana, somarDias } from './tempo.ts'
import type { ExercicioFeito, Recorde, Treino } from './tipos.ts'

// As contas do treino feito (seção 10 do estudo): o volume, os recordes e a sequência de semanas.
// O navegador mostra no fim do treino; o servidor recalcula ao guardar.

// A força estimada (1 repetição máxima) pela fórmula de Epley
export const forcaEstimada = (carga: number, reps: number) => (reps <= 0 || carga <= 0 ? 0 : reps === 1 ? carga : Math.round(carga * (1 + reps / 30) * 10) / 10)

export function volume(exercicios: ExercicioFeito[]) {
  let v = 0
  for (const e of exercicios) for (const s of e.series) if (s.feita) v += s.carga * s.reps
  return Math.round(v)
}

export const seriesFeitas = (exercicios: ExercicioFeito[]) => exercicios.reduce((n, e) => n + e.series.filter((s) => s.feita).length, 0)

export type Melhores = Record<string, { carga: number; forca: number }>

// O melhor de cada exercício até aqui (a carga mais alta e a maior força estimada)
export function melhoresDe(treinos: Pick<Treino, 'exercicios'>[]): Melhores {
  const m: Melhores = {}
  for (const t of treinos) {
    for (const e of t.exercicios) {
      for (const s of e.series) {
        if (!s.feita || s.carga <= 0) continue
        const atual = m[e.exercicio] ?? { carga: 0, forca: 0 }
        m[e.exercicio] = { carga: Math.max(atual.carga, s.carga), forca: Math.max(atual.forca, forcaEstimada(s.carga, s.reps)) }
      }
    }
  }
  return m
}

// Os recordes do treino novo contra os melhores de antes. Na primeira vez de um exercício não é
// recorde (ainda não há com o que comparar).
export function recordes(exercicios: ExercicioFeito[], antes: Melhores): Recorde[] {
  const lista: Recorde[] = []
  for (const e of exercicios) {
    const prev = antes[e.exercicio]
    if (!prev) continue
    const feitas = e.series.filter((s) => s.feita && s.carga > 0)
    if (!feitas.length) continue
    const carga = Math.max(...feitas.map((s) => s.carga))
    const forca = Math.max(...feitas.map((s) => forcaEstimada(s.carga, s.reps)))
    if (carga > prev.carga) lista.push({ exercicio: e.exercicio, nome: e.nome, tipo: 'carga', valor: carga, antes: prev.carga })
    else if (forca > prev.forca + 0.4) lista.push({ exercicio: e.exercicio, nome: e.nome, tipo: 'forca', valor: forca, antes: prev.forca })
  }
  return lista
}

// A última vez de cada exercício (para preencher a carga e as repetições no treino ao vivo)
export function ultimaVez(treinos: Pick<Treino, 'exercicios' | 'inicio'>[]) {
  const m: Record<string, { reps: number; carga: number }[]> = {}
  const ordenados = [...treinos].sort((a, b) => a.inicio.localeCompare(b.inicio))
  for (const t of ordenados) for (const e of t.exercicios) if (e.series.some((s) => s.feita)) m[e.exercicio] = e.series.filter((s) => s.feita).map((s) => ({ reps: s.reps, carga: s.carga }))
  return m
}

// A sequência: semanas seguidas batendo a meta (padrão 3 treinos). A semana atual conta se já bateu;
// se ainda não, a sequência vem da semana passada. Uma semana falhada por mês é perdoada.
export function sequencia(datas: string[], meta: number, hojeData: string) {
  const porSemana = new Map<string, Set<string>>()
  for (const d of datas) {
    const s = inicioDaSemana(d)
    if (!porSemana.has(s)) porSemana.set(s, new Set())
    porSemana.get(s)!.add(d)
  }
  const bate = (s: string) => (porSemana.get(s)?.size ?? 0) >= meta
  let semana = inicioDaSemana(hojeData)
  let n = 0
  if (bate(semana)) n++
  semana = somarDias(semana, -7)
  const perdoadas = new Set<string>() // os meses que já usaram o perdão
  for (let i = 0; i < 260; i++) {
    if (bate(semana)) n++
    else {
      // a semana falhada entre duas batidas não quebra a sequência (uma vez por mês)
      const mes = semana.slice(0, 7)
      if (n > 0 && !perdoadas.has(mes) && bate(somarDias(semana, -7))) perdoadas.add(mes)
      else break
    }
    semana = somarDias(semana, -7)
  }
  return n
}

export const diasAtivos = (treinos: Pick<Treino, 'inicio'>[]) => [...new Set(treinos.map((t) => dataDe(t.inicio)))]

// O que guardar de um exercício feito: só os exercícios conhecidos, as séries com números no lugar
export function limparExercicioFeito(dado: unknown, proprios: Map<string, string>): ExercicioFeito | null {
  if (!dado || typeof dado !== 'object') return null
  const d = dado as Record<string, unknown>
  const id = typeof d.exercicio === 'string' ? d.exercicio : ''
  const nome = EXERCICIO[id]?.nome ?? proprios.get(id)
  if (!nome) return null
  const series = Array.isArray(d.series)
    ? d.series.slice(0, 12).map((s) => {
        const x = (s ?? {}) as Record<string, unknown>
        return {
          reps: Math.min(999, Math.max(0, Math.round(Number(x.reps) || 0))),
          carga: Math.min(999, Math.max(0, Math.round((Number(x.carga) || 0) * 2) / 2)),
          feita: x.feita === true,
        }
      })
    : []
  if (!series.length) return null
  const obs = typeof d.obs === 'string' ? d.obs.replace(/\s+/g, ' ').trim().slice(0, 160) : ''
  return { exercicio: id, nome, series, ...(obs ? { obs } : {}) }
}
