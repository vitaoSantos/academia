import type { Desafio, Participante, Pontuacao } from './tipos.ts'

// Os desafios da rede (seção 16 do estudo), no jeito do GymRats: a pontuação é constância (dias
// ativos, check-ins ou minutos), nunca o corpo. Um check-in conta para todos os desafios abertos de
// quem treinou. Treino com menos de 10 minutos não conta, e no máximo um check-in por hora.

export const MINIMO_MINUTOS = 10
export const INTERVALO_CHECKIN = 60 * 60_000

export const PONTUACOES: Record<Pontuacao, { nome: string; descricao: string; unidade: string }> = {
  dias: { nome: 'Dias ativos', descricao: 'Um ponto por dia com treino', unidade: 'dias' },
  checkins: { nome: 'Check-ins', descricao: 'Um ponto por treino pago', unidade: 'check-ins' },
  minutos: { nome: 'Minutos', descricao: 'Os minutos de treino somados', unidade: 'min' },
}

export const aberto = (d: Pick<Desafio, 'inicio' | 'fim'>, dia: string) => d.inicio <= dia && dia <= d.fim
export const terminou = (d: Pick<Desafio, 'fim'>, dia: string) => dia > d.fim

export const pontosDe = (p: Participante, pontuacao: Pontuacao) => (pontuacao === 'dias' ? p.dias.length : pontuacao === 'checkins' ? p.checkins : p.minutos)

// Soma um treino num participante (devolve o mesmo objeto quando não conta)
export function somarTreino(p: Participante, pontuacao: Pontuacao, treino: { dia: string; minutos: number; em: string }): Participante {
  if (treino.minutos < MINIMO_MINUTOS) return p
  if (p.ultimo && new Date(treino.em).getTime() - new Date(p.ultimo).getTime() < INTERVALO_CHECKIN) return p
  const dias = p.dias.includes(treino.dia) ? p.dias : [...p.dias, treino.dia].sort()
  const novo = { ...p, dias, checkins: p.checkins + 1, minutos: p.minutos + Math.round(treino.minutos), ultimo: treino.em }
  return { ...novo, pontos: pontosDe(novo, pontuacao) }
}

// O ranking: mais pontos primeiro; no empate, quem é Turma+ e depois quem chegou lá antes
export function ranking(d: Pick<Desafio, 'participantes' | 'pontuacao'>, mais: (id: string) => boolean = () => false) {
  return Object.entries(d.participantes)
    .map(([id, p]) => ({ id, ...p, pontos: pontosDe(p, d.pontuacao) }))
    .sort((a, b) => b.pontos - a.pontos || Number(mais(b.id)) - Number(mais(a.id)) || (a.ultimo ?? '').localeCompare(b.ultimo ?? ''))
}

export const novoParticipante = (nome: string): Participante => ({ nome, pontos: 0, dias: [], checkins: 0, minutos: 0 })
