import { useState } from 'react'
import { PiShareNetwork } from 'react-icons/pi'
import { encode } from 'uqr'
import { MARCA } from '../../data/marca'
import { carregarFonte } from '../../lib/fontes'
import { temaDe } from '../../shared/temas'
import type { Visual } from '../../shared/tipos'
import { useAviso } from '../ui/Aviso'
import { Girando } from '../ui/basicos'

// O cartão para os stories (1080 × 1920): o nome, os números, a nota e o QR da página, nas cores da
// marca. No celular abre o compartilhar; no computador, baixa a imagem.

type Dados = { slug: string; nome: string; subtitulo: string; numeros: { valor: string; legenda: string }[]; visual: Visual }

async function desenhar(d: Dados): Promise<Blob> {
  const tema = temaDe(d.visual)
  carregarFonte(tema.fonte)
  await document.fonts.ready
  const c = document.createElement('canvas')
  c.width = 1080
  c.height = 1920
  const g = c.getContext('2d')!
  // o fundo com a cor da marca escorrendo de cima
  g.fillStyle = tema.fundo
  g.fillRect(0, 0, 1080, 1920)
  const brilho = g.createRadialGradient(540, 0, 0, 540, 0, 1300)
  brilho.addColorStop(0, tema.destaque + '66')
  brilho.addColorStop(1, tema.destaque + '00')
  g.fillStyle = brilho
  g.fillRect(0, 0, 1080, 1920)
  const fonte = tema.fonteInfo.familia
  const caixa = (t: string) => (tema.fonteInfo.caixaAlta ? t.toUpperCase() : t)
  g.fillStyle = tema.texto
  g.textAlign = 'center'
  // o nome (quebra em duas linhas se precisar)
  g.font = `${tema.fonteInfo.peso} 132px ${fonte}`
  const palavras = caixa(d.nome).split(' ')
  const linhas: string[] = []
  for (const p of palavras) {
    const atual = linhas[linhas.length - 1]
    if (atual && g.measureText(`${atual} ${p}`).width < 940) linhas[linhas.length - 1] = `${atual} ${p}`
    else linhas.push(p)
  }
  linhas.slice(0, 3).forEach((l, i) => g.fillText(l, 540, 420 + i * 140))
  g.font = '600 44px Manrope Variable, sans-serif'
  g.fillStyle = tema.suave
  g.fillText(d.subtitulo, 540, 420 + Math.min(3, linhas.length) * 140 + 10)
  // os números
  const y = 900
  const larg = 1080 / d.numeros.length
  d.numeros.forEach((n, i) => {
    const x = larg * i + larg / 2
    g.fillStyle = tema.destaque
    g.font = `${tema.fonteInfo.peso} 120px ${fonte}`
    g.fillText(caixa(n.valor), x, y)
    g.fillStyle = tema.suave
    g.font = '600 36px Manrope Variable, sans-serif'
    g.fillText(n.legenda, x, y + 60)
  })
  // o QR da página
  const qr = encode(`https://${MARCA.dominio}/${d.slug}`, { ecc: 'M', border: 1 })
  const lado = 440
  const passo = lado / qr.size
  const qx = 540 - lado / 2
  const qy = 1180
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.roundRect(qx - 30, qy - 30, lado + 60, lado + 60, 36)
  g.fill()
  g.fillStyle = '#111111'
  qr.data.forEach((linha, yy) => linha.forEach((cheio, xx) => cheio && g.fillRect(qx + xx * passo, qy + yy * passo, passo + 0.5, passo + 0.5)))
  g.fillStyle = tema.texto
  g.font = '700 40px Manrope Variable, sans-serif'
  g.fillText(`${MARCA.dominio}/${d.slug}`, 540, qy + lado + 110)
  return new Promise((resolve) => c.toBlob((b) => resolve(b!), 'image/png'))
}

export function CartaoCompartilhar(d: Dados) {
  const avisar = useAviso()
  const [fazendo, setFazendo] = useState(false)
  const compartilhar = async () => {
    setFazendo(true)
    try {
      const blob = await desenhar(d)
      const arquivo = new File([blob], `${d.slug}-turma.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: d.nome, text: `${d.nome} na ${MARCA.nome}` }).catch(() => {})
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = arquivo.name
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 2000)
        avisar('Cartão baixado. É só postar nos stories.')
      }
    } catch {
      avisar('Não deu para montar o cartão agora.', 'erro')
    } finally {
      setFazendo(false)
    }
  }
  return (
    <button type="button" className="btn btn-sup btn-m" onClick={compartilhar} disabled={fazendo}>
      {fazendo ? <Girando /> : <PiShareNetwork className="text-lg" />} Cartão para os stories
    </button>
  )
}
