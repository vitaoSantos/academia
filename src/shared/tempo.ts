// Horas e datas no fuso de Brasília. Roda igual no navegador e no servidor (que fica em UTC): a
// grade das aulas, a agenda e a semana dos treinos são calculadas no horário de Brasília.

export const FUSO = 'America/Sao_Paulo'
// O fuso de Brasília não tem horário de verão desde 2019: o deslocamento é fixo
export const DESLOCAMENTO = '-03:00'

export const HORA = /^([01]\d|2[0-3]):[0-5]\d$/
export const DATA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

export const minutos = (hora: string) => {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

export const hora = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export type Agora = { data: string; minutos: number; dia: number }

// Data, minuto e dia da semana atuais no fuso de Brasília
export function agoraNoFuso(ref: Date = new Date()): Agora {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(ref)
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '00'
  const data = `${parte('year')}-${parte('month')}-${parte('day')}`
  return { data, minutos: Number(parte('hour')) * 60 + Number(parte('minute')), dia: diaDaSemana(data) }
}

export const hoje = (ref?: Date) => agoraNoFuso(ref).data

export function somarDias(data: string, dias: number) {
  const d = new Date(`${data}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

export const diasEntre = (de: string, ate: string) => Math.round((new Date(`${ate}T12:00:00Z`).getTime() - new Date(`${de}T12:00:00Z`).getTime()) / 86_400_000)

export const diaDaSemana = (data: string) => new Date(`${data}T12:00:00Z`).getUTCDay()
export const mesDe = (data: string) => data.slice(0, 7)

// A segunda-feira da semana de uma data (a semana dos treinos começa na segunda)
export const inicioDaSemana = (data: string) => somarDias(data, -((diaDaSemana(data) + 6) % 7))

// Instante (ISO) de uma data e hora locais
export const instante = (data: string, horaLocal: string) => new Date(`${data}T${horaLocal}:00${DESLOCAMENTO}`).toISOString()

// Data e hora locais de um instante
export const dataDe = (iso: string) => agoraNoFuso(new Date(iso)).data
export const horaDe = (iso: string) => hora(agoraNoFuso(new Date(iso)).minutos)

export const NOMES_DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
export const NOMES_DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export const NOMES_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

// "seg, 3 de nov", "hoje", "amanhã"
export function textoData(data: string, ref = hoje()) {
  const d = diasEntre(ref, data)
  if (d === 0) return 'hoje'
  if (d === 1) return 'amanhã'
  if (d === -1) return 'ontem'
  const [, m, dia] = data.split('-').map(Number)
  return `${NOMES_DIAS_CURTOS[diaDaSemana(data)]}, ${dia} de ${NOMES_MESES[m - 1].slice(0, 3)}`
}

// "3 de novembro de 2026"
export function dataPorExtenso(data: string) {
  const [a, m, d] = data.split('-').map(Number)
  return `${d} de ${NOMES_MESES[m - 1]} de ${a}`
}
