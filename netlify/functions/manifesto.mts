import { textoSobre } from '../../src/shared/cores.ts'
import { temaDe } from '../../src/shared/temas.ts'
import { nomeCurto } from '../../src/shared/texto.ts'
import { lerEmpresa } from '../lib/empresas.ts'
import { lerPagina } from '../lib/paginas.ts'
import { lerProfissional } from '../lib/profissionais.ts'

// O app de cada academia e de cada personal (PWA): quem adiciona o app da Força Total à tela inicial
// ganha o ícone, o nome e a cor da Força Total, e o app abre direto nela. Sem loja.
// GET ?slug=forca-total  ·  ?icone=forca-total (o ícone em SVG, com a inicial)

function iconeSvg(nome: string, cor: string, fundo: string) {
  const letra = nomeCurto(nome).charAt(0).toUpperCase() || 'T'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${fundo}"/><circle cx="256" cy="256" r="168" fill="${cor}"/><text x="256" y="322" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="200" fill="${textoSobre(cor)}">${letra.replace(/[<>&"]/g, '')}</text></svg>`
}

async function marca(slug: string) {
  const pagina = await lerPagina(slug)
  if (!pagina) return null
  if (pagina.tipo === 'empresa') {
    const e = await lerEmpresa(pagina.id)
    return e ? { slug, nome: e.nome, curto: e.visual.nomeApp, visual: e.visual, descricao: `As fichas, as aulas e a turma da ${e.nome}.` } : null
  }
  const p = await lerProfissional(pagina.id)
  return p ? { slug, nome: p.nome, curto: p.visual.nomeApp, visual: p.visual, descricao: `Os treinos e a agenda com ${p.nome}.` } : null
}

export default async (req: Request) => {
  const url = new URL(req.url)
  const slugIcone = url.searchParams.get('icone')
  if (slugIcone) {
    const m = await marca(slugIcone)
    const tema = temaDe(m?.visual)
    return new Response(iconeSvg(m?.nome ?? 'Turma', tema.destaque, tema.fundo), { headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=600' } })
  }
  const m = await marca(url.searchParams.get('slug') ?? '')
  if (!m) return new Response('{}', { status: 404, headers: { 'content-type': 'application/manifest+json' } })
  const tema = temaDe(m.visual)
  const icone = m.visual.logo ? { src: `/.netlify/functions/midia?id=${m.visual.logo}`, sizes: '512x512', type: 'image/webp' } : { src: `/.netlify/functions/manifesto?icone=${encodeURIComponent(m.slug)}`, sizes: 'any', type: 'image/svg+xml' }
  const curto = m.curto || (m.nome.length > 14 ? nomeCurto(m.nome).slice(0, 14) : m.nome)
  const manifesto = {
    id: `/${m.slug}`,
    name: m.nome,
    short_name: curto,
    description: m.descricao,
    start_url: `/${m.slug}?app=1`,
    scope: '/',
    display: 'standalone',
    background_color: tema.fundo,
    theme_color: tema.fundo,
    lang: 'pt-BR',
    icons: [
      { ...icone, purpose: 'any' },
      { ...icone, purpose: 'maskable' },
    ],
  }
  return new Response(JSON.stringify(manifesto), { headers: { 'content-type': 'application/manifest+json; charset=utf-8', 'cache-control': 'public, max-age=300' } })
}
