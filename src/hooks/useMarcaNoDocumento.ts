import { useEffect } from 'react'

// No app da academia (ou do personal), a página veste a marca: o manifesto (quem instala ganha o ícone,
// o nome e a cor dela, e o app abre direto nela), a cor da barra do celular e o ícone da aba. Ao sair,
// volta tudo para a Turma.
export function useMarcaNoDocumento(m: { slug: string; nome: string; cor: string; fundo: string } | null | undefined) {
  useEffect(() => {
    if (!m) return
    const manifesto = document.getElementById('manifesto')
    const corBarra = document.querySelector('meta[name="theme-color"]')
    const icone = document.querySelector('link[rel="icon"]')
    const antes = { manifesto: manifesto?.getAttribute('href'), cor: corBarra?.getAttribute('content'), icone: icone?.getAttribute('href') }
    const slug = encodeURIComponent(m.slug)
    manifesto?.setAttribute('href', `/.netlify/functions/manifesto?slug=${slug}`)
    corBarra?.setAttribute('content', m.fundo)
    icone?.setAttribute('href', `/.netlify/functions/manifesto?icone=${slug}&v=${encodeURIComponent(m.cor)}`)
    return () => {
      if (antes.manifesto) manifesto?.setAttribute('href', antes.manifesto)
      if (antes.cor) corBarra?.setAttribute('content', antes.cor)
      if (antes.icone) icone?.setAttribute('href', antes.icone)
    }
  }, [m?.slug, m?.nome, m?.cor, m?.fundo])
}
