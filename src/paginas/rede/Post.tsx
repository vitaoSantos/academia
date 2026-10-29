import { useState, type FormEvent } from 'react'
import { PiFlag, PiPaperPlaneRight, PiTrash } from 'react-icons/pi'
import { Moldura } from '../../components/layout/Moldura'
import { CartaoPost } from '../../components/rede/CartaoPost'
import { Denunciar } from '../../components/rede/Denunciar'
import { useAviso } from '../../components/ui/Aviso'
import { Avatar, Carregando, Erro, Girando } from '../../components/ui/basicos'
import { mensagemDeErro, rede } from '../../lib/api'
import { useDados } from '../../lib/dados'
import { Link, navegar } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import type { ComentarioVisto } from '../../shared/respostas'
import { tempoAtras } from '../../shared/texto'

// Um post com os comentários (sem link e sem telefone; o dono do post apaga qualquer comentário)

export default function Post({ id }: { id: string }) {
  useTitulo('Post')
  const s = useSessao()
  const avisar = useAviso()
  const p = useDados(`post:${id}`, () => rede.post(id))
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [denunciando, setDenunciando] = useState<ComentarioVisto | null>(null)

  const comentar = async (e: FormEvent) => {
    e.preventDefault()
    if (!s.usuario) return navegar(`/entrar?volta=${encodeURIComponent(`/rede/p/${id}`)}`)
    if (!texto.trim()) return
    setEnviando(true)
    try {
      const { comentarios } = await rede.comentar(id, texto.trim())
      p.definir((d) => (d ? { post: { ...d.post, comentarios: comentarios.length }, comentarios } : d!))
      setTexto('')
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setEnviando(false)
    }
  }

  const apagar = async (c: ComentarioVisto) => {
    try {
      const { comentarios } = await rede.apagarComentario(id, c.id)
      p.definir((d) => (d ? { post: { ...d.post, comentarios: comentarios.length }, comentarios } : d!))
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    }
  }

  return (
    <Moldura largo={false}>
      <Link para="/rede" className="text-sm font-semibold text-suave hover:text-texto">
        ← Rede
      </Link>
      <div className="mt-3">
        {!p.dados ? (
          p.erro ? <Erro mensagem={mensagemDeErro(p.erro)} /> : <Carregando />
        ) : (
          <>
            <CartaoPost post={p.dados.post} detalhe aoMudar={(x) => p.definir((d) => (d ? { ...d, post: x } : d!))} aoApagar={() => navegar('/rede')} />
            <section className="mt-5" aria-labelledby="comentarios">
              <h2 id="comentarios" className="mb-3 font-bold">
                {p.dados.comentarios.length ? `${p.dados.comentarios.length} ${p.dados.comentarios.length === 1 ? 'comentário' : 'comentários'}` : 'Comentários'}
              </h2>
              <ul className="space-y-3">
                {p.dados.comentarios.map((c) => (
                  <li key={c.id} className="flex gap-3">
                    <Link para={c.autorResumo ? `/u/${c.autorResumo.usuario}` : '#'} className="shrink-0">
                      <Avatar nome={c.autorResumo?.nome ?? '?'} foto={c.autorResumo?.foto} tamanho={34} />
                    </Link>
                    <div className="min-w-0 flex-1 rounded-2xl bg-sup px-3.5 py-2.5">
                      <p className="flex items-baseline gap-2 text-sm">
                        <span className="font-bold">{c.autorResumo?.nome ?? 'Alguém'}</span>
                        <span className="text-xs text-fraco">{tempoAtras(c.criadoEm)}</span>
                      </p>
                      <p className="mt-0.5 text-sm whitespace-pre-line">{c.texto}</p>
                    </div>
                    {s.usuario && (c.meu || p.dados!.post.meu) ? (
                      <button type="button" className="grid size-8 shrink-0 place-items-center self-center rounded-full text-fraco hover:text-perigo" aria-label="Apagar o comentário" onClick={() => apagar(c)}>
                        <PiTrash />
                      </button>
                    ) : s.usuario ? (
                      <button type="button" className="grid size-8 shrink-0 place-items-center self-center rounded-full text-fraco hover:text-texto" aria-label="Denunciar o comentário" onClick={() => setDenunciando(c)}>
                        <PiFlag />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
              <form onSubmit={comentar} className="sticky bottom-24 mt-4 flex gap-2 rounded-2xl bg-fundo py-2 lg:bottom-4">
                <input className="campo" maxLength={400} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={s.usuario ? 'Comente...' : 'Entre para comentar'} aria-label="Comentário" onFocus={() => !s.usuario && navegar(`/entrar?volta=${encodeURIComponent(`/rede/p/${id}`)}`)} />
                <button type="submit" className="btn btn-anilha btn-m shrink-0 px-4" disabled={enviando || !texto.trim()} aria-label="Enviar">
                  {enviando ? <Girando /> : <PiPaperPlaneRight className="text-lg" />}
                </button>
              </form>
            </section>
          </>
        )}
      </div>
      {denunciando && <Denunciar aberta aoFechar={() => setDenunciando(null)} alvo={{ tipo: 'comentario', id: denunciando.id, autor: denunciando.autor, post: id }} />}
    </Moldura>
  )
}
