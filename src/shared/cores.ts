// As contas de cor da marca de cada academia e de cada personal: o contraste do texto se ajusta
// sozinho à cor que eles escolherem.

export const HEX = /^#[0-9a-f]{6}$/i

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const canal = (c: number) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function luminancia(hex: string) {
  const [r, g, b] = rgb(hex)
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

export function contraste(a: string, b: string) {
  const [la, lb] = [luminancia(a), luminancia(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

// Texto que fica legível em cima de uma cor (branco ou quase preto)
export const textoSobre = (fundo: string) => (contraste(fundo, '#ffffff') >= contraste(fundo, '#0d0e11') ? '#ffffff' : '#0d0e11')

export function misturar(a: string, b: string, t: number) {
  const [ra, ga, ba] = rgb(a)
  const [rb, gb, bb] = rgb(b)
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0')
  return `#${c(ra, rb)}${c(ga, gb)}${c(ba, bb)}`
}

export const comAlfa = (hex: string, alfa: number) => {
  const [r, g, b] = rgb(hex)
  return `rgb(${r} ${g} ${b} / ${alfa})`
}

// Escurece ou clareia uma cor até ela ler bem em cima do fundo
export function legivel(cor: string, fundo: string, alvo = 3) {
  if (contraste(cor, fundo) >= alvo) return cor
  const direcao = luminancia(fundo) > 0.4 ? '#000000' : '#ffffff'
  for (let t = 0.08; t <= 1; t += 0.08) {
    const c = misturar(cor, direcao, t)
    if (contraste(c, fundo) >= alvo) return c
  }
  return direcao
}

export const corValida = (v: unknown): v is string => typeof v === 'string' && HEX.test(v)

// As cores das anilhas olímpicas (25, 20, 15, 10 e 5 kg): a paleta das séries dos gráficos e das
// famílias de modalidade
export const ANILHAS = { vermelha: '#e5484d', azul: '#3e7bfa', amarela: '#f5c518', verde: '#2fb171', branca: '#e8e6df' }
