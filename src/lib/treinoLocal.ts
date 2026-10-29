import { EXERCICIO } from '../shared/exercicios'
import { lerReps } from '../shared/ficha'
import type { UltimaVez } from '../shared/respostas'
import type { ItemFicha, Tecnica } from '../shared/tipos'
import { ErroApi, treinos, type TreinoParaRegistrar } from './api'

// O treino ao vivo fica guardado no aparelho a cada toque (seção 10 do estudo): fechar o app, ficar
// sem bateria ou sem sinal no meio do treino não perde nada. O treino terminado sem internet entra na
// fila e sobe sozinho quando a conexão volta (o id do treino evita contar duas vezes).

export type SerieAoVivo = { reps: number; carga: number; feita: boolean }

export type ExercicioAoVivo = {
  exercicio: string
  nome: string
  series: SerieAoVivo[]
  alvo: string // o que a ficha pede ("8-12", "40s")
  cargaSugerida?: number
  descanso: number
  tecnica?: Tecnica
  recado?: string // o recado do professor no item
  nota?: string // o que o aluno anota
  tempo?: boolean // exercício de tempo: as "reps" são segundos
}

export type TreinoAoVivo = {
  id: string
  conta: string
  ficha?: string
  divisao?: string
  autorFicha?: string // quem montou (para marcar no post)
  nome: string
  inicio: string | null // null: ainda não começou (a tela de "pronto?")
  exercicios: ExercicioAoVivo[]
  atual: number
  descansoAte?: number // o fim do descanso (ms)
  descansoTotal?: number
  local?: { empresa: string; unidade: string }
}

// Um exercício pronto para o treino: as séries pedidas, com a carga e as repetições da última vez
export function exercicioAoVivo(id: string, nome: string, item: Pick<ItemFicha, 'series' | 'reps' | 'descanso' | 'carga' | 'tecnica' | 'obs'> | null, ultima: UltimaVez['ultima'] = {}): ExercicioAoVivo {
  const ex = EXERCICIO[id]
  const alvo = item?.reps ?? ex?.reps ?? '10'
  const r = lerReps(alvo)
  const antes = ultima[id] ?? []
  const n = item?.series ?? ex?.series ?? 3
  return {
    exercicio: id,
    nome,
    alvo,
    descanso: item?.descanso ?? ex?.descanso ?? 60,
    ...(item?.carga ? { cargaSugerida: item.carga } : {}),
    ...(item?.tecnica ? { tecnica: item.tecnica } : {}),
    ...(item?.obs ? { recado: item.obs } : {}),
    ...(r.segundos ? { tempo: true } : {}),
    series: Array.from({ length: n }, (_, i) => ({
      reps: antes[i]?.reps ?? r.segundos ?? (r.max || 10),
      carga: antes[i]?.carga ?? antes[antes.length - 1]?.carga ?? item?.carga ?? 0,
      feita: false,
    })),
  }
}

const chave = (conta: string) => `turma:treino:${conta}`
const FILA = 'turma:fila-treinos'

function ler<T>(k: string): T | null {
  try {
    const v = localStorage.getItem(k)
    return v ? (JSON.parse(v) as T) : null
  } catch {
    return null
  }
}

function gravar(k: string, v: unknown) {
  try {
    if (v === null) localStorage.removeItem(k)
    else localStorage.setItem(k, JSON.stringify(v))
  } catch {
    // sem espaço ou modo privado: segue só na memória
  }
}

export const treinoGuardado = (conta: string) => ler<TreinoAoVivo>(chave(conta))
export const guardarTreino = (t: TreinoAoVivo) => gravar(chave(t.conta), t)
export const esquecerTreino = (conta: string) => gravar(chave(conta), null)

export const novoIdTreino = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`

// O que vai para o servidor: só as séries com número
export function paraRegistrar(t: TreinoAoVivo, extra: { esforco?: number; nota?: string; local?: TreinoAoVivo['local'] }, fim = new Date()): TreinoParaRegistrar {
  return {
    id: t.id,
    ...(t.ficha ? { ficha: t.ficha } : {}),
    ...(t.divisao ? { divisao: t.divisao } : {}),
    nome: t.nome,
    inicio: t.inicio ?? fim.toISOString(),
    fim: fim.toISOString(),
    exercicios: t.exercicios
      .map((e) => ({ exercicio: e.exercicio, series: e.series.map((s) => ({ reps: s.reps, carga: s.carga, feita: s.feita })), ...(e.nota ? { obs: e.nota } : {}) }))
      .filter((e) => e.series.some((s) => s.feita)),
    ...(extra.esforco ? { esforco: extra.esforco } : {}),
    ...(extra.nota ? { nota: extra.nota } : {}),
    ...(extra.local ? { local: extra.local } : {}),
  }
}

// ---------- A fila de quem terminou sem internet ----------

type Pendente = { conta: string; treino: TreinoParaRegistrar }

export const pendentes = (conta: string) => (ler<Pendente[]>(FILA) ?? []).filter((p) => p.conta === conta)

export function enfileirar(conta: string, treino: TreinoParaRegistrar) {
  const fila = ler<Pendente[]>(FILA) ?? []
  gravar(FILA, [...fila.filter((p) => p.treino.id !== treino.id), { conta, treino }])
}

// Manda o que ficou na fila; devolve quantos subiram
export async function enviarPendentes(conta: string) {
  let enviados = 0
  for (const p of pendentes(conta)) {
    try {
      await treinos.registrar(p.treino)
      enviados++
      gravar(FILA, (ler<Pendente[]>(FILA) ?? []).filter((x) => x.treino.id !== p.treino.id))
    } catch (e) {
      // sem conexão: tenta depois; recusado pelo servidor (velho demais, inválido): sai da fila
      if (e instanceof ErroApi && e.status >= 400 && e.status < 500) gravar(FILA, (ler<Pendente[]>(FILA) ?? []).filter((x) => x.treino.id !== p.treino.id))
      else break
    }
  }
  return enviados
}

// ---------- O aviso do fim do descanso ----------

let audio: AudioContext | null = null

// Um bipe curto (o navegador só deixa tocar depois de um toque na tela, que o "feito" já é)
export function bipe() {
  try {
    audio ??= new AudioContext()
    const o = audio.createOscillator()
    const g = audio.createGain()
    o.type = 'sine'
    o.frequency.value = 880
    g.gain.setValueAtTime(0.0001, audio.currentTime)
    g.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.35)
    o.connect(g).connect(audio.destination)
    o.start()
    o.stop(audio.currentTime + 0.4)
  } catch {
    // sem áudio
  }
}

export const vibrar = (padrao: number[]) => {
  try {
    navigator.vibrate?.(padrao)
  } catch {
    // sem vibração
  }
}
