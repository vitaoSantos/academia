import { comAlfa, contraste, HEX, legivel, misturar, textoSobre } from './cores.ts'
import type { FonteTitulo, PresetVisual, Visual } from './tipos.ts'

// Os estilos que a academia e o personal escolhem para o app deles (seção 18 do estudo). Cada estilo
// define as cores, a fonte do título e os cantos; a cor de destaque e a fonte ainda podem mudar. A cor
// de destaque também acende os músculos do boneco 3D.

export type Tema = {
  id: PresetVisual
  nome: string
  descricao: string
  escuro: boolean
  fundo: string
  superficie: string
  superficie2: string
  texto: string
  suave: string
  destaque: string
  detalhe: string
  fonte: FonteTitulo
  raio: number
}

export const TEMAS: Record<PresetVisual, Tema> = {
  ferro: {
    id: 'ferro',
    nome: 'Ferro',
    descricao: 'Grafite e amarelo de anilha. A sala de musculação.',
    escuro: true,
    fundo: '#0f1013',
    superficie: '#17181d',
    superficie2: '#212329',
    texto: '#f4f2ec',
    suave: '#a3a4ab',
    destaque: '#f5c518',
    detalhe: '#e5484d',
    fonte: 'big-shoulders',
    raio: 10,
  },
  neon: {
    id: 'neon',
    nome: 'Neon',
    descricao: 'Preto e verde-limão. Academia 24 horas.',
    escuro: true,
    fundo: '#07090a',
    superficie: '#101416',
    superficie2: '#182024',
    texto: '#effff4',
    suave: '#9fb3a8',
    destaque: '#b6f22e',
    detalhe: '#22d3ee',
    fonte: 'unbounded',
    raio: 14,
  },
  clean: {
    id: 'clean',
    nome: 'Clean',
    descricao: 'Branco, preto e nada sobrando.',
    escuro: false,
    fundo: '#ffffff',
    superficie: '#f4f4f2',
    superficie2: '#e8e8e5',
    texto: '#101010',
    suave: '#5f6166',
    destaque: '#101010',
    detalhe: '#9a9a9a',
    fonte: 'space-grotesk',
    raio: 999,
  },
  energia: {
    id: 'energia',
    nome: 'Energia',
    descricao: 'Laranja e creme. Funcional e cross.',
    escuro: false,
    fundo: '#fbf6ee',
    superficie: '#ffffff',
    superficie2: '#f1e7d8',
    texto: '#1f1408',
    suave: '#6d5a45',
    destaque: '#f0560e',
    detalhe: '#1f1408',
    fonte: 'anton',
    raio: 6,
  },
  tatame: {
    id: 'tatame',
    nome: 'Tatame',
    descricao: 'Preto e vermelho. Centro de treinamento de lutas.',
    escuro: true,
    fundo: '#0b0b0c',
    superficie: '#151516',
    superficie2: '#202022',
    texto: '#f6f3ef',
    suave: '#a6a2a0',
    destaque: '#e3262f',
    detalhe: '#f2f1ec',
    fonte: 'bebas',
    raio: 4,
  },
  zen: {
    id: 'zen',
    nome: 'Zen',
    descricao: 'Areia e sálvia. Pilates e yoga.',
    escuro: false,
    fundo: '#f4efe6',
    superficie: '#fbf8f2',
    superficie2: '#e8dfd0',
    texto: '#2c2a24',
    suave: '#6f6a5e',
    destaque: '#5f8a6e',
    detalhe: '#b08a5a',
    fonte: 'fraunces',
    raio: 18,
  },
  ritmo: {
    id: 'ritmo',
    nome: 'Ritmo',
    descricao: 'Roxo e rosa. Escola de dança.',
    escuro: true,
    fundo: '#120c1f',
    superficie: '#1c1430',
    superficie2: '#281c42',
    texto: '#f8f2ff',
    suave: '#b6a8cf',
    destaque: '#ff4fa3',
    detalhe: '#a78bfa',
    fonte: 'lobster',
    raio: 20,
  },
  oceano: {
    id: 'oceano',
    nome: 'Oceano',
    descricao: 'Azul-marinho e água. Natação e hidro.',
    escuro: true,
    fundo: '#06172a',
    superficie: '#0c2138',
    superficie2: '#132d4a',
    texto: '#eef7ff',
    suave: '#9fb6cc',
    destaque: '#2ec5e8',
    detalhe: '#f5c518',
    fonte: 'montserrat',
    raio: 16,
  },
  classica: {
    id: 'classica',
    nome: 'Clássica',
    descricao: 'Marinho e dourado. Academia de tradição.',
    escuro: false,
    fundo: '#f5f2ea',
    superficie: '#fffdf8',
    superficie2: '#e9e3d4',
    texto: '#14213d',
    suave: '#5b6478',
    destaque: '#14213d',
    detalhe: '#b08a3e',
    fonte: 'playfair',
    raio: 8,
  },
}

export const ORDEM_TEMAS: PresetVisual[] = ['ferro', 'neon', 'clean', 'energia', 'tatame', 'zen', 'ritmo', 'oceano', 'classica']

export const FONTES: Record<FonteTitulo, { nome: string; familia: string; peso: number; caixaAlta: boolean; espaco: string }> = {
  'big-shoulders': { nome: 'Big Shoulders', familia: '"Big Shoulders Display Variable", "Arial Narrow", sans-serif', peso: 800, caixaAlta: true, espaco: '0.01em' },
  anton: { nome: 'Anton', familia: 'Anton, Impact, sans-serif', peso: 400, caixaAlta: true, espaco: '0.01em' },
  oswald: { nome: 'Oswald', familia: '"Oswald Variable", "Arial Narrow", sans-serif', peso: 600, caixaAlta: true, espaco: '0.02em' },
  bebas: { nome: 'Bebas Neue', familia: '"Bebas Neue", Impact, sans-serif', peso: 400, caixaAlta: true, espaco: '0.03em' },
  unbounded: { nome: 'Unbounded', familia: '"Unbounded Variable", system-ui, sans-serif', peso: 700, caixaAlta: false, espaco: '-0.02em' },
  'space-grotesk': { nome: 'Space Grotesk', familia: '"Space Grotesk Variable", system-ui, sans-serif', peso: 700, caixaAlta: false, espaco: '-0.03em' },
  montserrat: { nome: 'Montserrat', familia: '"Montserrat Variable", system-ui, sans-serif', peso: 800, caixaAlta: false, espaco: '-0.02em' },
  fraunces: { nome: 'Fraunces', familia: '"Fraunces Variable", Georgia, serif', peso: 600, caixaAlta: false, espaco: '-0.02em' },
  playfair: { nome: 'Playfair', familia: '"Playfair Display Variable", Georgia, serif', peso: 700, caixaAlta: false, espaco: '-0.01em' },
  'dm-serif': { nome: 'DM Serif', familia: '"DM Serif Display", Georgia, serif', peso: 400, caixaAlta: false, espaco: '-0.01em' },
  lobster: { nome: 'Lobster', familia: 'Lobster, "Brush Script MT", cursive', peso: 400, caixaAlta: false, espaco: '0' },
}

export const ORDEM_FONTES: FonteTitulo[] = ['big-shoulders', 'anton', 'oswald', 'bebas', 'unbounded', 'space-grotesk', 'montserrat', 'fraunces', 'playfair', 'dm-serif', 'lobster']

// Sugestões de destaque mostradas no configurador (qualquer cor vale)
export const CORES_DESTAQUE = ['#f5c518', '#b6f22e', '#f0560e', '#e3262f', '#ff4fa3', '#a78bfa', '#2ec5e8', '#3e7bfa', '#2fb171', '#5f8a6e', '#b08a3e', '#14213d', '#101010']

export type TemaFinal = Tema & {
  destaqueTexto: string // o texto em cima do botão
  destaqueLegivel: string // o destaque como texto em cima do fundo
  fonteInfo: (typeof FONTES)[FonteTitulo]
}

// O nome da família da fonte enviada pela marca (o navegador registra com esse nome)
export const familiaPropria = (id: string) => `"Turma ${id}"`

export function temaDe(visual: Partial<Pick<Visual, 'preset' | 'destaque' | 'fonte' | 'fontePropria'>> | undefined): TemaFinal {
  const base = TEMAS[visual?.preset ?? 'ferro'] ?? TEMAS.ferro
  let destaque = visual?.destaque && HEX.test(visual.destaque) ? visual.destaque.toLowerCase() : base.destaque
  // destaque quase igual ao fundo some: escurece ou clareia até aparecer
  if (contraste(destaque, base.fundo) < 1.6) destaque = misturar(destaque, base.escuro ? '#ffffff' : '#000000', 0.45)
  const fonte = visual?.fonte && FONTES[visual.fonte] ? visual.fonte : base.fonte
  // a fonte da marca vale no lugar da escolhida, com a escolhida de reserva enquanto carrega
  const propria = visual?.fontePropria
  const fonteInfo = propria ? { nome: propria.nome, familia: `${familiaPropria(propria.id)}, ${FONTES[fonte].familia}`, peso: 400, caixaAlta: false, espaco: '0' } : FONTES[fonte]
  return { ...base, destaque, fonte, destaqueTexto: textoSobre(destaque), destaqueLegivel: legivel(destaque, base.fundo, 3), fonteInfo }
}

// Variáveis CSS aplicadas em tudo o que leva a marca (a página, o app do aluno, os cartões)
export function variaveisDoTema(t: TemaFinal): Record<string, string> {
  return {
    '--m-fundo': t.fundo,
    '--m-sup': t.superficie,
    '--m-sup-2': t.superficie2,
    '--m-texto': t.texto,
    '--m-suave': t.suave,
    '--m-linha': comAlfa(t.texto, t.escuro ? 0.13 : 0.12),
    '--m-destaque': t.destaque,
    '--m-destaque-texto': t.destaqueTexto,
    '--m-destaque-legivel': t.destaqueLegivel,
    '--m-destaque-suave': comAlfa(t.destaque, t.escuro ? 0.18 : 0.12),
    '--m-detalhe': t.detalhe,
    '--m-fonte': t.fonteInfo.familia,
    '--m-fonte-peso': String(t.fonteInfo.peso),
    '--m-fonte-caixa': t.fonteInfo.caixaAlta ? 'uppercase' : 'none',
    '--m-fonte-espaco': t.fonteInfo.espaco,
    '--m-raio': `${Math.min(t.raio, 24)}px`,
    '--m-raio-botao': `${t.raio}px`,
  }
}

// O estilo que cada tipo de empresa já ganha no cadastro
export const ESTILO_DO_TIPO: Record<string, PresetVisual> = {
  academia: 'ferro',
  rede: 'ferro',
  estudio: 'zen',
  box: 'energia',
  ct: 'tatame',
  danca: 'ritmo',
  aquatica: 'oceano',
  personal: 'neon',
}
