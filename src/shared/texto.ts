// Limpeza e formatação de textos que chegam de fora (cadastros, posts, comentários, mensagens).
// O React já escapa tudo na hora de mostrar; aqui é para não guardar lixo: caracteres de controle,
// de direção de texto e invisíveis. O "junta-emoji" (U+200D) fica: sem ele, emojis como 🏋️‍♀️ se
// partem em dois.
const INVISIVEIS = /[\u0000-\u0009\u000B-\u001F\u007F​‌‎‏‪-‮⁦-⁩﻿]/g

// Corta pelo número de caracteres de verdade (não parte um emoji ao meio)
const cortar = (texto: string, max: number) => (texto.length <= max ? texto : Array.from(texto).slice(0, max).join(''))

// Uma linha só, sem espaços repetidos
export function limpar(valor: unknown, max: number) {
  if (typeof valor !== 'string') return ''
  return cortar(valor.replace(/\n/g, ' ').replace(INVISIVEIS, ' ').replace(/\s+/g, ' ').trim(), max)
}

// Texto com parágrafos: mantém quebras de linha (no máximo uma linha em branco seguida)
export function limparTexto(valor: unknown, max: number) {
  if (typeof valor !== 'string') return ''
  const limpo = valor
    .replace(/\r\n?/g, '\n')
    .replace(INVISIVEIS, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return cortar(limpo, max)
}

// Telefone brasileiro: só dígitos, com DDD, sem o 55 (10 ou 11 dígitos)
export function normalizarTelefone(valor: unknown) {
  if (typeof valor !== 'string') return ''
  let d = valor.replace(/\D/g, '')
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2)
  if (d.length === 11 && d[2] !== '9') return ''
  return d.length === 10 || d.length === 11 ? d : ''
}

export function formatarTelefone(d: string) {
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return d
}

export const linkWhatsApp = (telefone: string, mensagem?: string) =>
  `https://wa.me/55${telefone}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''}`

export function normalizarEmail(valor: unknown) {
  if (typeof valor !== 'string') return ''
  const email = valor.trim().toLowerCase().slice(0, 120)
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : ''
}

// O login aceita e-mail ou celular no mesmo campo
export function identificador(valor: unknown): { tipo: 'email' | 'celular'; valor: string } | null {
  if (typeof valor !== 'string') return null
  if (valor.includes('@')) {
    const email = normalizarEmail(valor)
    return email ? { tipo: 'email', valor: email } : null
  }
  const celular = normalizarTelefone(valor)
  return celular ? { tipo: 'celular', valor: celular } : null
}

// @usuario do Instagram, sem o @ e sem o endereço
export function normalizarInstagram(valor: unknown) {
  if (typeof valor !== 'string') return ''
  const usuario = valor
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '')
  return /^[a-zA-Z0-9._]{1,30}$/.test(usuario) ? usuario : ''
}

// Posts, comentários e mensagens entre alunos não aceitam link nem telefone (a porta do golpe e do
// spam). Com a academia e com o profissional, o telefone pode (é o "me chama no zap").
export const temLink = (texto: string) => /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|br|io|app|xyz|me|link|site|online|shop)\b)/i.test(texto)
export const temTelefone = (texto: string) => /(\(?\d{2}\)?\s?)?9?\d{4}[-.\s]?\d{4}/.test(texto.replace(/\d{1,3}(kg|x|min|s|km)\b/gi, ''))

// O CREF como o profissional escreve: "012345-G/MG"
export function normalizarCref(valor: unknown) {
  if (typeof valor !== 'string') return ''
  const v = valor.toUpperCase().replace(/\s+/g, '').replace(/^CREF/, '')
  const m = v.match(/^(\d{3,6})-?([GP])\/?([A-Z]{2})$/)
  return m ? `${m[1].padStart(6, '0')}-${m[2]}/${m[3]}` : ''
}

export function formatarPreco(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: centavos % 100 ? 2 : 0 })
}

export const reais = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// O que a pessoa digitou ("119,90", "1.299,90", "120") em centavos; 0 quando não dá para ler
export function centavosDe(texto: string) {
  const t = texto.trim().replace(/[^\d,.]/g, '')
  const n = parseFloat(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t)
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0
}

export function formatarDuracao(min: number) {
  if (min < 60) return `${Math.round(min)} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

// 1.234 kg, 12,5 kg
export const kg = (valor: number) => `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`
export const numero = (valor: number, casas = 0) => valor.toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: 0 })

// "agora", "há 5 min", "há 3 h", "há 2 dias", "12 de out"
export function tempoAtras(iso: string, agora = Date.now()) {
  const s = Math.max(0, (agora - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'agora'
  if (s < 3600) return `há ${Math.floor(s / 60)} min`
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`
  if (s < 7 * 86400) return `há ${Math.floor(s / 86400)} ${Math.floor(s / 86400) === 1 ? 'dia' : 'dias'}`
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')
}

export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? ''

export const iniciais = (nome: string) =>
  nome
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÀ-Ý]/.test(p))
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

export const SENHA_MINIMA = 8

// O nome curto da empresa (sem "Academia", "Studio", "CT"...): a inicial do ícone e o nome do app
export const nomeCurto = (nome: string) => nome.replace(/^(academia|studio|estúdio|estudio|centro de treinamento|ct|box|escola de dança|escola|espaço|espaco)\s+((das|dos|da|do|de)\s+)?/i, '').trim() || nome

// Máscara do celular enquanto a pessoa digita: (35) 99876-1234
export function mascaraCelular(valor: string) {
  const d = valor.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '').slice(0, 11)
  if (d.length <= 2) return d ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Sem acento e em minúsculas: a busca ignora os dois
export const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// "1 aluno", "3 alunos"
export const plural = (n: number, um: string, varios: string) => `${numero(n)} ${n === 1 ? um : varios}`
