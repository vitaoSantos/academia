import { diaDaSemana, hora, instante, minutos, somarDias, type Agora } from './tempo.ts'
import type { ConfigAgenda, Janela, Sessao, SessaoFixa } from './tipos.ts'

// A agenda entre o personal e o aluno (seção 13 do estudo). A mesma regra no navegador (mostrar os
// horários livres) e no servidor (aceitar a marcação). O horário é sempre o de Brasília.

export const AGENDA_PADRAO: ConfigAgenda = {
  ativa: true,
  janelas: [
    ...[1, 2, 3, 4, 5].flatMap((dia) => [
      { dia, inicio: '06:00', fim: '10:00' },
      { dia, inicio: '17:00', fim: '21:00' },
    ]),
    { dia: 6, inicio: '08:00', fim: '12:00' },
  ],
  duracao: 60,
  antecedencia: 2,
  cancelarAte: 12,
  alunoMarca: true,
  locais: [],
}

// O professor da academia: a agenda vem desligada (o aluno costuma só aparecer)
export const AGENDA_PROFESSOR: ConfigAgenda = { ...AGENDA_PADRAO, ativa: false, janelas: [], alunoMarca: false }

export const DIAS_A_FRENTE = 30

const sobrepoe = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1

// Os horários livres de um dia: dentro das janelas, sem bater com as sessões marcadas, e com a
// antecedência mínima a partir de agora
export function horariosLivres(config: ConfigAgenda, data: string, sessoes: Pick<Sessao, 'inicio' | 'fim' | 'status'>[], agora: Agora): string[] {
  if (!config.ativa) return []
  if (data < agora.data || data > somarDias(agora.data, DIAS_A_FRENTE)) return []
  const dia = diaDaSemana(data)
  const ocupadas = sessoes.filter((s) => s.status === 'marcada' || s.status === 'feita').map((s) => [minutos(s.inicio), minutos(s.fim)] as const)
  const minimo = data === agora.data ? agora.minutos + config.antecedencia * 60 : -1
  const livres: string[] = []
  for (const j of config.janelas.filter((x) => x.dia === dia)) {
    const fim = minutos(j.fim)
    for (let t = minutos(j.inicio); t + config.duracao <= fim; t += config.duracao) {
      if (t < minimo) continue
      if (ocupadas.some(([a, b]) => sobrepoe(t, t + config.duracao, a, b))) continue
      livres.push(hora(t))
    }
  }
  return livres
}

// O aluno desmarca até X horas antes; o personal desmarca quando quiser
export function podeDesmarcar(s: Pick<Sessao, 'data' | 'inicio' | 'status'>, config: Pick<ConfigAgenda, 'cancelarAte'>, quem: 'aluno' | 'profissional', agoraMs = Date.now()) {
  if (s.status !== 'marcada') return false
  if (quem === 'profissional') return true
  return new Date(instante(s.data, s.inicio)).getTime() - agoraMs >= config.cancelarAte * 3600_000
}

// As datas em que uma sessão fixa acontece (seg/qua/sex 7h) entre duas datas
export function datasDaFixa(fixa: Pick<SessaoFixa, 'dias' | 'desde'>, de: string, ate: string) {
  const datas: string[] = []
  for (let d = de < fixa.desde ? fixa.desde : de; d <= ate; d = somarDias(d, 1)) if (fixa.dias.includes(diaDaSemana(d))) datas.push(d)
  return datas
}

export function janelasValidas(dado: unknown): Janela[] {
  if (!Array.isArray(dado)) return []
  const HORA = /^([01]\d|2[0-3]):[0-5]\d$/
  return dado
    .slice(0, 40)
    .map((j) => (j ?? {}) as Record<string, unknown>)
    .filter((j) => Number.isInteger(j.dia) && (j.dia as number) >= 0 && (j.dia as number) <= 6 && HORA.test(String(j.inicio)) && HORA.test(String(j.fim)) && minutos(String(j.inicio)) < minutos(String(j.fim)))
    .map((j) => ({ dia: j.dia as number, inicio: String(j.inicio), fim: String(j.fim) }))
}

export const fimDaSessao = (inicio: string, duracao: number) => hora(minutos(inicio) + duracao)
