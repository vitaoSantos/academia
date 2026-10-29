import { useState } from 'react'
import { mensagemDeErro, MOTIVOS_DENUNCIA, rede } from '../../lib/api'
import { useAviso } from '../ui/Aviso'
import { Folha, Girando } from '../ui/basicos'

// A denúncia (de um post, de um comentário ou de um perfil): com três denúncias o conteúdo some
// até a moderação olhar
export function Denunciar({ aberta, aoFechar, alvo }: { aberta: boolean; aoFechar: () => void; alvo: { tipo: 'post' | 'comentario' | 'perfil'; id: string; autor?: string; post?: string } }) {
  const avisar = useAviso()
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const enviar = async () => {
    if (!motivo) return
    setEnviando(true)
    try {
      await rede.denunciar(alvo, motivo)
      avisar('Obrigado. A moderação vai olhar.')
      aoFechar()
      setMotivo('')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setEnviando(false)
    }
  }
  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo="Denunciar">
      <div className="p-6">
        <h2 className="titulo text-3xl">Denunciar</h2>
        <p className="mt-1 text-sm text-suave">Ninguém fica sabendo quem denunciou.</p>
        <div className="mt-5 space-y-1.5" role="radiogroup" aria-label="Motivo">
          {MOTIVOS_DENUNCIA.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={motivo === m} onClick={() => setMotivo(m)} className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${motivo === m ? 'border-anilha bg-anilha-suave' : 'border-linha hover:border-linha-2'}`}>
              <span className={`size-4 shrink-0 rounded-full border-2 ${motivo === m ? 'border-anilha bg-anilha' : 'border-linha-2'}`} />
              {m}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-anilha btn-m mt-5 w-full" disabled={!motivo || enviando} onClick={enviar}>
          {enviando ? <Girando /> : 'Enviar denúncia'}
        </button>
      </div>
    </Folha>
  )
}
