import type { FonteTitulo } from '../shared/tipos'
import { urlMidia } from './api'

// As fontes do título das marcas: cada uma é baixada só quando uma página ou app usa (a da Turma,
// Big Shoulders, já vem no começo). A fonte enviada pela marca (premium) entra pelo FontFace.

const CARREGAR: Record<FonteTitulo, () => Promise<unknown>> = {
  'big-shoulders': async () => {},
  anton: () => import('@fontsource/anton'),
  oswald: () => import('@fontsource-variable/oswald'),
  bebas: () => import('@fontsource/bebas-neue'),
  unbounded: () => import('@fontsource-variable/unbounded'),
  'space-grotesk': () => import('@fontsource-variable/space-grotesk'),
  montserrat: () => import('@fontsource-variable/montserrat'),
  fraunces: () => import('@fontsource-variable/fraunces'),
  playfair: () => import('@fontsource-variable/playfair-display'),
  'dm-serif': () => import('@fontsource/dm-serif-display'),
  lobster: () => import('@fontsource/lobster'),
}

const carregadas = new Set<string>()

export function carregarFonte(f: FonteTitulo | undefined) {
  if (!f || carregadas.has(f)) return
  carregadas.add(f)
  CARREGAR[f]?.().catch(() => carregadas.delete(f))
}

export function carregarFontePropria(fonte: { id: string } | undefined) {
  if (!fonte || carregadas.has(fonte.id) || typeof FontFace === 'undefined') return
  carregadas.add(fonte.id)
  const face = new FontFace(`Turma ${fonte.id}`, `url(${urlMidia(fonte.id)})`, { display: 'swap' })
  face
    .load()
    .then((f) => document.fonts.add(f))
    .catch(() => carregadas.delete(fonte.id))
}
