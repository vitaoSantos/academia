import { useState } from 'react'
import { PiCopy, PiShareNetwork, PiWhatsappLogo } from 'react-icons/pi'
import { encode } from 'uqr'
import { mensagemDeErro } from '../../lib/api'
import type { Convite } from '../../shared/tipos'
import { useAviso } from '../ui/Aviso'
import { Campo, Folha, Girando } from '../ui/basicos'

// O convite (seção 5 do estudo): o link para mandar pelo WhatsApp, com o nome da pessoa (o convite
// abre com "Oi, Bruno!"), e o QR para quem está na frente. Vale 30 dias, uma pessoa por link.

export const linkDoConvite = (codigo: string) => `${location.origin}/convite/${codigo}`

function Qr({ texto }: { texto: string }) {
  const qr = encode(texto, { ecc: 'M', border: 2 })
  const lado = qr.size
  return (
    <svg viewBox={`0 0 ${lado} ${lado}`} className="size-40 rounded-xl bg-white p-1" role="img" aria-label="QR do convite" shapeRendering="crispEdges">
      {qr.data.map((linha, y) => linha.map((cheio, x) => (cheio ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#111" /> : null)))}
    </svg>
  )
}

export function Convidar({ aberta, aoFechar, titulo, explica, criar, mensagem }: { aberta: boolean; aoFechar: () => void; titulo: string; explica: string; criar: (d: { nome?: string; contato?: string }) => Promise<{ convite: Convite }>; mensagem: (nome: string | undefined, link: string) => string }) {
  const avisar = useAviso()
  const [nome, setNome] = useState('')
  const [contato, setContato] = useState('')
  const [criando, setCriando] = useState(false)
  const [convite, setConvite] = useState<Convite | null>(null)
  const link = convite ? linkDoConvite(convite.codigo) : ''
  const texto = convite ? mensagem(convite.nome, link) : ''

  const gerar = async () => {
    setCriando(true)
    try {
      setConvite((await criar({ nome: nome.trim() || undefined, contato: contato.trim() || undefined })).convite)
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setCriando(false)
    }
  }
  const fechar = () => {
    setConvite(null)
    setNome('')
    setContato('')
    aoFechar()
  }
  const numero = contato.replace(/\D/g, '')

  return (
    <Folha aberta={aberta} aoFechar={fechar} titulo={titulo}>
      <div className="p-6">
        <h2 className="titulo text-3xl">{titulo}</h2>
        <p className="mt-1 text-sm text-suave">{explica}</p>
        {!convite ? (
          <div className="mt-5 space-y-4">
            <Campo rotulo="Nome (opcional)" dica="O convite abre chamando pelo nome">
              <input className="campo" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Bruno Teixeira" />
            </Campo>
            <Campo rotulo="WhatsApp (opcional)" dica="Para abrir a conversa já com o link">
              <input className="campo" inputMode="tel" maxLength={20} value={contato} onChange={(e) => setContato(e.target.value)} placeholder="(35) 99999-0000" />
            </Campo>
            <button type="button" className="btn btn-anilha btn-m w-full" disabled={criando} onClick={gerar}>
              {criando ? <Girando /> : 'Gerar o convite'}
            </button>
          </div>
        ) : (
          <div className="mt-5">
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-sup-2 p-4 text-center">
              <Qr texto={link} />
              <p className="dado text-sm break-all">{link}</p>
              <p className="text-xs text-fraco">Vale 30 dias, para uma pessoa</p>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <a href={`https://wa.me/${numero.length >= 10 ? `55${numero.replace(/^55/, '')}` : ''}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer" className="btn btn-anilha btn-m">
                <PiWhatsappLogo /> WhatsApp
              </a>
              <button
                type="button"
                className="btn btn-sup btn-m"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(texto)
                    avisar('Convite copiado.')
                  } catch {
                    avisar(link)
                  }
                }}
              >
                <PiCopy /> Copiar
              </button>
              {typeof navigator.share === 'function' && (
                <button type="button" className="btn btn-sup btn-m" onClick={() => navigator.share({ text: texto }).catch(() => {})}>
                  <PiShareNetwork /> Enviar
                </button>
              )}
            </div>
            <button type="button" className="btn btn-fantasma btn-p mt-4 w-full" onClick={() => setConvite(null)}>
              Gerar outro
            </button>
          </div>
        )}
      </div>
    </Folha>
  )
}
