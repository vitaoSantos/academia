import { diaDaSemana, instante, minutos, somarDias, type Agora } from './tempo.ts'
import type { Aula, Reserva, SituacaoAula } from './tipos.ts'

// As aulas das modalidades (seção 8 do estudo): a grade de cada unidade, a reserva com vagas, a
// lista de espera que anda sozinha, o lugar marcado e a presença. A mesma regra no navegador e no
// servidor; no servidor, a folha de cada dia é gravada com escrita condicional.

export const DIAS_PARA_RESERVAR = 7 // a reserva abre 7 dias antes
export const HORAS_PARA_CANCELAR = 2 // e o cancelamento fecha 2 horas antes
export const CHECKIN_ANTES = 15 // "Cheguei" vale de 15 min antes
export const CHECKIN_DEPOIS = 30 // até 30 min depois do começo

export const SITUACAO_VAZIA: SituacaoAula = { reservas: [], espera: [], presentes: [] }

export const aulasDoDia = (grade: Aula[], unidade: string, data: string) =>
  grade.filter((a) => a.ativa && a.unidade === unidade && a.dias.includes(diaDaSemana(data))).sort((a, b) => minutos(a.inicio) - minutos(b.inicio))

export const comecaEm = (a: Pick<Aula, 'inicio'>, data: string) => new Date(instante(data, a.inicio)).getTime()

export function reservaAberta(a: Pick<Aula, 'inicio'>, data: string, agora: Agora, agoraMs = Date.now()) {
  if (data < agora.data || data > somarDias(agora.data, DIAS_PARA_RESERVAR)) return false
  return comecaEm(a, data) > agoraMs
}

export const podeCancelar = (a: Pick<Aula, 'inicio'>, data: string, agoraMs = Date.now()) => comecaEm(a, data) - agoraMs >= HORAS_PARA_CANCELAR * 3600_000

export function checkinAberto(a: Pick<Aula, 'inicio'>, data: string, agoraMs = Date.now()) {
  const c = comecaEm(a, data)
  return agoraMs >= c - CHECKIN_ANTES * 60_000 && agoraMs <= c + CHECKIN_DEPOIS * 60_000
}

export const vagasLivres = (a: Pick<Aula, 'vagas'>, s: SituacaoAula) => (a.vagas > 0 ? Math.max(0, a.vagas - s.reservas.length) : Infinity)

export const lugaresOcupados = (s: SituacaoAula) => new Set(s.reservas.map((r) => r.lugar).filter((l): l is number => !!l))

export type ResultadoReserva = { situacao: SituacaoAula; resultado: 'reservada' | 'espera' | 'ja-tinha' }

// Reserva uma vaga (ou entra na fila). Com lugar marcado, o lugar escolhido precisa estar livre.
export function reservar(a: Pick<Aula, 'vagas' | 'lugares'>, s: SituacaoAula, pessoa: Reserva): ResultadoReserva {
  if (s.reservas.some((r) => r.conta === pessoa.conta) || s.espera.some((r) => r.conta === pessoa.conta)) return { situacao: s, resultado: 'ja-tinha' }
  if (vagasLivres(a, s) <= 0) return { situacao: { ...s, espera: [...s.espera, { conta: pessoa.conta, nome: pessoa.nome, em: pessoa.em }] }, resultado: 'espera' }
  let lugar = pessoa.lugar
  if (a.lugares) {
    const ocupados = lugaresOcupados(s)
    if (!lugar || lugar > a.lugares || ocupados.has(lugar)) {
      // sem lugar escolhido (ou o escolhido acabou de ser pego): o primeiro livre
      lugar = Array.from({ length: a.lugares }, (_, i) => i + 1).find((l) => !ocupados.has(l))
    }
  } else lugar = undefined
  return { situacao: { ...s, reservas: [...s.reservas, { conta: pessoa.conta, nome: pessoa.nome, em: pessoa.em, ...(lugar ? { lugar } : {}) }] }, resultado: 'reservada' }
}

// Cancela a reserva (ou sai da fila). Se abriu vaga, o primeiro da fila entra sozinho.
export function cancelar(a: Pick<Aula, 'vagas' | 'lugares'>, s: SituacaoAula, conta: string): { situacao: SituacaoAula; promovido?: Reserva } {
  const estava = s.reservas.find((r) => r.conta === conta)
  if (!estava) return { situacao: { ...s, espera: s.espera.filter((r) => r.conta !== conta) } }
  const reservas = s.reservas.filter((r) => r.conta !== conta)
  const [primeiro, ...resto] = s.espera
  if (!primeiro) return { situacao: { ...s, reservas } }
  const promovido = { ...primeiro, ...(a.lugares && estava.lugar ? { lugar: estava.lugar } : {}) }
  return { situacao: { ...s, reservas: [...reservas, promovido], espera: resto }, promovido }
}

export const posicaoNaFila = (s: SituacaoAula, conta: string) => s.espera.findIndex((r) => r.conta === conta) + 1
