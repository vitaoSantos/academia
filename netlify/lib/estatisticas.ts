import { agoraNoFuso } from '../../src/shared/tempo.ts'
import { atualizar, CHAVES, lerJSON } from './store.ts'

// Os números de cada dia para o admin (cadastros, treinos, check-ins na rede, aulas reservadas),
// somados quando acontecem. A demonstração conta à parte.

export type NumerosDoDia = { cadastros: number; treinos: number; posts: number; reservas: number; demo: { cadastros: number; treinos: number; posts: number; reservas: number } }

const VAZIO: NumerosDoDia = { cadastros: 0, treinos: 0, posts: 0, reservas: 0, demo: { cadastros: 0, treinos: 0, posts: 0, reservas: 0 } }

export async function somarNoDia(campo: keyof Omit<NumerosDoDia, 'demo'>, demo = false) {
  const data = agoraNoFuso().data
  await atualizar<NumerosDoDia>(CHAVES.dia(data), VAZIO, (d) => (demo ? { ...d, demo: { ...d.demo, [campo]: d.demo[campo] + 1 } } : { ...d, [campo]: d[campo] + 1 })).catch(() => null)
}

export const lerDia = (data: string) => lerJSON<NumerosDoDia>(CHAVES.dia(data), VAZIO)
