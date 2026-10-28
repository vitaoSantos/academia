import type { Avaliacao, Nota } from './tipos.ts'

// Avaliações (seção 14 do estudo): só avalia quem treinou de verdade (com vínculo, ou check-in na
// unidade). Uma por pessoa, editável. Com menos de 3, aparece "Novo".

export const NOVO = 3

export const ROTULOS = ['', 'Muito ruim', 'Ruim', 'Ok', 'Bom', 'Excelente']

export const MOTIVOS = {
  profissional: ['Explica bem', 'Pontual', 'Motivador', 'Treinos variados', 'Atencioso', 'Corrige a postura', 'Responde rápido'],
  empresa: ['Limpeza', 'Equipamentos', 'Ambiente', 'Atendimento', 'Professores', 'Aulas', 'Não lota', 'Localização'],
}

export function limparAvaliacao(dados: unknown, tipo: 'profissional' | 'empresa'): Pick<Avaliacao, 'estrelas' | 'motivos' | 'texto'> | null {
  if (!dados || typeof dados !== 'object') return null
  const d = dados as Record<string, unknown>
  const estrelas = Math.round(Number(d.estrelas))
  if (!(estrelas >= 1 && estrelas <= 5)) return null
  const validos = MOTIVOS[tipo]
  const motivos = Array.isArray(d.motivos) ? [...new Set(d.motivos.filter((m): m is string => typeof m === 'string' && validos.includes(m)))].slice(0, 5) : []
  const texto = typeof d.texto === 'string' ? d.texto.replace(/\s+/g, ' ').trim().slice(0, 500) : ''
  return { estrelas, motivos, ...(texto ? { texto } : {}) }
}

export function notaDe(lista: Pick<Avaliacao, 'estrelas'>[]): Nota {
  if (!lista.length) return { media: 0, total: 0 }
  const soma = lista.reduce((s, a) => s + a.estrelas, 0)
  return { media: Math.round((soma / lista.length) * 100) / 100, total: lista.length }
}

export const textoNota = (n?: Nota) => (n && n.total >= NOVO ? n.media.toFixed(1).replace('.', ',') : 'Novo')
