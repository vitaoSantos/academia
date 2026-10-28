import { corValida } from '../../src/shared/cores.ts'
import { FONTES, ORDEM_TEMAS } from '../../src/shared/temas.ts'
import { limpar } from '../../src/shared/texto.ts'
import type { FonteTitulo, PresetVisual, Visual } from '../../src/shared/tipos.ts'
import { falhar, type Corpo } from './http.ts'
import { guardarFonte, guardarImagem } from './midia.ts'

// A aparência (o app com a cara de cada um, seção 18 do estudo), igual para a academia e o personal:
// o estilo, a cor, a fonte (ou a da marca, no premium), a logo, a capa, o nome do app e a frase.

export async function visualNovo(atual: Visual, corpo: Corpo, dono: string, premium: boolean): Promise<Visual> {
  const v = (corpo.visual ?? {}) as Record<string, unknown>
  const preset = ORDEM_TEMAS.includes(v.preset as PresetVisual) ? (v.preset as PresetVisual) : atual.preset
  const fonte = typeof v.fonte === 'string' && v.fonte in FONTES ? (v.fonte as FonteTitulo) : undefined
  const nomeApp = limpar(v.nomeApp, 14)
  const boasVindas = limpar(v.boasVindas, 90)
  const logo = corpo.logo ? (await guardarImagem(dono, 'logo', corpo.logo, { max: 600_000 })).id : corpo.semLogo ? undefined : atual.logo
  const capa = corpo.capa ? (await guardarImagem(dono, 'capa', corpo.capa)).id : corpo.semCapa ? undefined : atual.capa
  let fontePropria = corpo.semFonte ? undefined : atual.fontePropria
  if (corpo.fonteArquivo) {
    if (!premium) falhar(402, 'A fonte da sua marca é do plano Premium.')
    const nome = limpar(corpo.fonteNome, 30) || 'Fonte da marca'
    fontePropria = { id: (await guardarFonte(dono, corpo.fonteArquivo)).id, nome }
  }
  return {
    preset,
    ...(corValida(v.destaque) ? { destaque: (v.destaque as string).toLowerCase() } : {}),
    ...(fonte ? { fonte } : {}),
    ...(fontePropria && premium ? { fontePropria } : {}),
    ...(logo ? { logo } : {}),
    ...(capa ? { capa } : {}),
    ...(nomeApp ? { nomeApp } : {}),
    ...(boasVindas ? { boasVindas } : {}),
  }
}
