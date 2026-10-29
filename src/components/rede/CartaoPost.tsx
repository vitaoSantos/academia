import { useState } from 'react'
import { PiChatCircle, PiDotsThree, PiFlag, PiMapPin, PiMedal, PiTrash, PiTrophy } from 'react-icons/pi'
import { MARCA } from '../../data/marca'
import { mensagemDeErro, rede, urlMidia } from '../../lib/api'
import { Link, navegar } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { familiaDe, nomeModalidade } from '../../shared/modalidades'
import type { PostVisto } from '../../shared/respostas'
import { numero, tempoAtras } from '../../shared/texto'
import { useAviso } from '../ui/Aviso'
import { Avatar, Selo } from '../ui/basicos'
import { Denunciar } from './Denunciar'

// Um post da rede (seção 16 do estudo): o "treino pago" com o resumo (o tempo, o volume, os
// recordes), a aula, a conquista ou a foto; onde foi, quem foi marcado, o 💪 e os comentários

export const volume = (kgTotal: number) => (kgTotal >= 1000 ? `${numero(kgTotal / 1000, 1)} t` : `${numero(kgTotal)} kg`)

export function CartaoPost({ post, aoMudar, aoApagar, detalhe = false }: { post: PostVisto; aoMudar: (p: PostVisto) => void; aoApagar?: (id: string) => void; detalhe?: boolean }) {
  const s = useSessao()
  const avisar = useAviso()
  const [menu, setMenu] = useState(false)
  const [denunciando, setDenunciando] = useState(false)
  const a = post.autorResumo
  const foto = urlMidia(post.foto)
  const marcados = post.marcados.filter((m) => !(post.local && m.tipo === 'empresa' && m.id === post.local.empresa))

  const forte = async () => {
    if (!s.usuario) return navegar(`/entrar?volta=${encodeURIComponent(location.pathname)}`)
    // muda na hora; o servidor confirma
    aoMudar({ ...post, dei: !post.dei, totalFortes: post.totalFortes + (post.dei ? -1 : 1) })
    try {
      aoMudar((await rede.forte(post.id)).post)
    } catch (e) {
      aoMudar(post)
      avisar(mensagemDeErro(e), 'erro')
    }
  }

  const apagar = async () => {
    setMenu(false)
    if (!confirm('Apagar este post?')) return
    try {
      await rede.apagar(post.id)
      avisar('Post apagado.')
      aoApagar?.(post.id)
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    }
  }

  return (
    <article className="cartao p-4 sm:p-5">
      <header className="flex items-center gap-3">
        <Link para={`/u/${a.usuario}`} className="shrink-0" aria-label={`Perfil de ${a.nome}`}>
          <Avatar nome={a.nome} foto={a.foto} tamanho={42} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-bold">
            <Link para={`/u/${a.usuario}`} className="truncate hover:underline">
              {a.nome}
            </Link>
            {a.profissional && <Selo>Pro</Selo>}
            {a.mais && <Selo tom="marca">+</Selo>}
          </p>
          <p className="truncate text-xs text-fraco">
            {post.local && (
              <>
                <Link para={`/${post.local.empresa}?unidade=${post.local.unidade}`} className="hover:text-texto">
                  <PiMapPin className="-mt-0.5 inline" /> {post.local.nome}
                </Link>
                {' · '}
              </>
            )}
            <Link para={`/rede/p/${post.id}`} className="hover:text-texto">
              <time dateTime={post.criadoEm}>{tempoAtras(post.criadoEm)}</time>
            </Link>
          </p>
        </div>
        {s.usuario && (
          <div className="relative">
            <button type="button" className="grid size-9 place-items-center rounded-full text-xl text-fraco hover:bg-sup-2 hover:text-texto" aria-label="Mais opções" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              <PiDotsThree />
            </button>
            {menu && (
              <div className="absolute top-10 right-0 z-20 w-48 overflow-hidden rounded-2xl border border-linha bg-sup p-1.5 text-sm shadow-2xl" role="menu">
                {post.meu ? (
                  <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-perigo hover:bg-sup-2" onClick={apagar}>
                    <PiTrash /> Apagar
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-sup-2"
                    onClick={() => {
                      setMenu(false)
                      setDenunciando(true)
                    }}
                  >
                    <PiFlag /> Denunciar
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {post.texto && <p className={`mt-3 whitespace-pre-line ${detalhe ? 'text-lg' : ''}`}>{post.texto}</p>}

      {post.treino && (
        <div className="mt-3 rounded-2xl bg-sup-2 p-4">
          <p className="text-[0.68rem] font-bold tracking-widest text-anilha-legivel uppercase">
            {MARCA.checkin} · {post.treino.nome}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="titulo dado text-2xl">{numero(post.treino.duracaoMin)}</p>
              <p className="text-[0.68rem] text-suave">minutos</p>
            </div>
            <div>
              <p className="titulo dado text-2xl">{post.treino.volume >= 1000 ? numero(post.treino.volume / 1000, 1) : numero(post.treino.volume)}</p>
              <p className="text-[0.68rem] text-suave">{post.treino.volume >= 1000 ? 'toneladas' : 'kg de volume'}</p>
            </div>
            <div>
              <p className={`titulo dado text-2xl ${post.treino.recordes ? 'text-anilha-legivel' : ''}`}>{post.treino.recordes || post.treino.series}</p>
              <p className="text-[0.68rem] text-suave">{post.treino.recordes ? (post.treino.recordes === 1 ? 'recorde' : 'recordes') : 'séries'}</p>
            </div>
          </div>
        </div>
      )}

      {post.aula && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-sup-2 p-4">
          <span className="h-10 w-1.5 rounded-full" style={{ background: familiaDe(post.aula.modalidade).cor }} />
          <div>
            <p className="text-[0.68rem] font-bold tracking-widest text-anilha-legivel uppercase">{MARCA.checkin}</p>
            <p className="font-bold">{post.aula.modalidade ? `Aula de ${nomeModalidade(post.aula.modalidade).toLowerCase()}` : post.aula.nome}</p>
          </div>
        </div>
      )}

      {post.conquista && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-anilha/40 bg-anilha-suave p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-anilha text-2xl text-anilha-texto">{post.conquista.tipo === 'recorde' ? <PiTrophy /> : <PiMedal />}</span>
          <p className="font-bold">{post.conquista.texto}</p>
        </div>
      )}

      {foto && (
        <Link para={`/rede/p/${post.id}`} className="mt-3 block overflow-hidden rounded-2xl bg-sup-2">
          <img src={foto} alt="" className={`w-full object-cover ${detalhe ? 'max-h-[80vh] object-contain' : 'max-h-[28rem]'}`} loading="lazy" />
        </Link>
      )}

      {marcados.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {marcados.map((m) =>
            m.link ? (
              <Link key={`${m.tipo}:${m.id}`} para={m.link} className="rounded-full bg-sup-2 px-2.5 py-1 font-semibold text-suave hover:text-texto">
                @{m.nome}
              </Link>
            ) : (
              <span key={`${m.tipo}:${m.id}`} className="rounded-full bg-sup-2 px-2.5 py-1 font-semibold text-suave">
                @{m.nome}
              </span>
            ),
          )}
        </p>
      )}

      <footer className="mt-3 flex items-center gap-1 text-sm">
        <button type="button" onClick={forte} aria-pressed={post.dei} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold transition-colors ${post.dei ? 'bg-anilha-suave text-anilha-legivel' : 'text-suave hover:bg-sup-2 hover:text-texto'}`} aria-label={`Dar força (${post.totalFortes})`}>
          <span className={`text-base transition-transform ${post.dei ? 'scale-110' : 'grayscale'}`} aria-hidden>
            💪
          </span>
          <span className="dado">{post.totalFortes}</span>
        </button>
        {!detalhe && (
          <Link para={`/rede/p/${post.id}`} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-suave hover:bg-sup-2 hover:text-texto" aria-label={`Comentários (${post.comentarios})`}>
            <PiChatCircle className="text-base" />
            <span className="dado">{post.comentarios}</span>
          </Link>
        )}
      </footer>

      <Denunciar aberta={denunciando} aoFechar={() => setDenunciando(false)} alvo={{ tipo: 'post', id: post.id }} />
    </article>
  )
}
