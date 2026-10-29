import { useState } from 'react'
import { avaliacoes as api, mensagemDeErro, type AlvoAvaliacao } from '../../lib/api'
import { MOTIVOS, ROTULOS } from '../../shared/avaliacao'
import type { AvaliacaoVista } from '../../shared/respostas'
import { tempoAtras } from '../../shared/texto'
import type { Avaliacao, Nota } from '../../shared/tipos'
import { useAviso } from '../ui/Aviso'
import { Avatar, Estrelas, Girando } from '../ui/basicos'

// As avaliações (seção 14 do estudo): a nota, as de quem treinou de verdade, a resposta de quem foi
// avaliado e, para quem pode, o formulário (uma por pessoa, dá para mudar)
export function Avaliacoes({ alvo, nota, lista, podeAvaliar, minha, podeResponder, aoMudar }: { alvo: AlvoAvaliacao; nota: Nota; lista: AvaliacaoVista[]; podeAvaliar: boolean; minha?: Avaliacao | null; podeResponder?: boolean; aoMudar: () => void }) {
  const avisar = useAviso()
  const [estrelas, setEstrelas] = useState(minha?.estrelas ?? 0)
  const [motivos, setMotivos] = useState<string[]>(minha?.motivos ?? [])
  const [texto, setTexto] = useState(minha?.texto ?? '')
  const [enviando, setEnviando] = useState(false)
  const [respondendo, setRespondendo] = useState<string | null>(null)
  const [resposta, setResposta] = useState('')
  const opcoes = MOTIVOS[alvo.tipo]

  const enviar = async () => {
    setEnviando(true)
    try {
      await api.avaliar(alvo, { estrelas, motivos, texto })
      avisar(minha ? 'Avaliação atualizada.' : 'Obrigado pela avaliação!')
      aoMudar()
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setEnviando(false)
    }
  }

  const responder = async (de: string) => {
    try {
      await api.responder(alvo, de, resposta)
      setRespondendo(null)
      setResposta('')
      aoMudar()
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    }
  }

  return (
    <div>
      <div className="flex items-end gap-4">
        <p className="titulo dado text-6xl">{nota.total >= 3 ? nota.media.toFixed(1).replace('.', ',') : '—'}</p>
        <div className="pb-1.5">
          <Estrelas valor={nota.media} tamanho={18} />
          <p className="mt-1 text-xs text-suave">{nota.total >= 3 ? `${nota.total} avaliações de quem treinou` : 'Novo: ainda com poucas avaliações'}</p>
        </div>
      </div>

      {podeAvaliar && (
        <div className="cartao mt-6 p-5">
          <p className="font-bold">{minha ? 'A sua avaliação' : 'Como foi treinar aqui?'}</p>
          <div className="mt-3 flex items-center gap-3">
            <Estrelas valor={estrelas} aoMudar={setEstrelas} tamanho={30} />
            <span className="text-sm text-suave">{ROTULOS[estrelas]}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {opcoes.map((m) => (
              <button key={m} type="button" className="chip" aria-pressed={motivos.includes(m)} onClick={() => setMotivos(motivos.includes(m) ? motivos.filter((x) => x !== m) : [...motivos, m].slice(0, 5))}>
                {m}
              </button>
            ))}
          </div>
          <textarea className="campo mt-4 min-h-20" placeholder="Conte como foi (opcional)" value={texto} maxLength={500} onChange={(e) => setTexto(e.target.value)} />
          <button type="button" className="btn btn-anilha btn-m mt-3" disabled={!estrelas || enviando} onClick={enviar}>
            {enviando ? <Girando /> : minha ? 'Atualizar' : 'Avaliar'}
          </button>
        </div>
      )}

      <ul className="mt-6 space-y-4">
        {lista.map((a) => (
          <li key={a.de} className="border-b border-linha pb-4">
            <div className="flex items-center gap-3">
              <Avatar nome={a.autor?.nome ?? a.deNome} foto={a.autor?.foto} tamanho={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{a.autor?.nome ?? a.deNome}</p>
                <p className="text-xs text-fraco">{tempoAtras(a.em)}</p>
              </div>
              <Estrelas valor={a.estrelas} tamanho={14} />
            </div>
            {a.motivos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {a.motivos.map((m) => (
                  <span key={m} className="rounded-full bg-sup-2 px-2 py-0.5 text-xs text-suave">
                    {m}
                  </span>
                ))}
              </div>
            )}
            {a.texto && <p className="mt-2 text-sm">{a.texto}</p>}
            {a.resposta && (
              <p className="mt-3 rounded-xl border-l-2 border-anilha bg-sup-2 px-3 py-2 text-sm">
                <span className="block text-xs font-bold text-suave">Resposta</span>
                {a.resposta.texto}
              </p>
            )}
            {podeResponder && !a.resposta && (
              respondendo === a.de ? (
                <div className="mt-3 flex gap-2">
                  <input className="campo" value={resposta} onChange={(e) => setResposta(e.target.value)} placeholder="Sua resposta (pública)" maxLength={400} />
                  <button type="button" className="btn btn-sup btn-m" disabled={!resposta.trim()} onClick={() => responder(a.de)}>
                    Enviar
                  </button>
                </div>
              ) : (
                <button type="button" className="mt-2 text-xs font-bold text-anilha-legivel" onClick={() => setRespondendo(a.de)}>
                  Responder
                </button>
              )
            )}
          </li>
        ))}
        {!lista.length && <li className="text-sm text-suave">Ninguém avaliou ainda.</li>}
      </ul>
    </div>
  )
}

