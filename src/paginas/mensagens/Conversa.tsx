import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PiPaperPlaneRight } from 'react-icons/pi'
import { AppAluno } from '../../components/layout/AppAluno'
import { useAviso } from '../../components/ui/Aviso'
import { Avatar, Carregando, Erro, Girando } from '../../components/ui/basicos'
import { conversas, mensagemDeErro } from '../../lib/api'
import { esquecer, useDados } from '../../lib/dados'
import { Link, useEndereco } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import { dataDe, horaDe, textoData } from '../../shared/tempo'

// Uma conversa: as mensagens por dia, a caixa de texto embaixo e a atualização a cada poucos
// segundos enquanto a tela está aberta

export default function Conversa({ id }: { id: string }) {
  const s = useSessao()
  const avisar = useAviso()
  const { busca } = useEndereco()
  const como = busca.get('como') || undefined
  const c = useDados(`conversa:${id}:${como ?? ''}`, () => conversas.ler(id, como))
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const fim = useRef<HTMLDivElement>(null)
  const total = c.dados?.mensagens.length ?? 0
  useTitulo(c.dados ? `Conversa com ${c.dados.outro.nome}` : 'Conversa')

  // a mensagem nova aparece sozinha (a cada 5 s, com a tela à vista)
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && void c.recarregar(), 5000)
    return () => clearInterval(t)
  }, [c.recarregar])
  // abriu a conversa: os contadores do topo mudam
  useEffect(() => {
    if (!c.dados) return
    esquecer('conversas:')
    void s.atualizar()
  }, [!!c.dados])
  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'end' })
  }, [total])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const t = texto.trim()
    if (!t) return
    setEnviando(true)
    try {
      await conversas.enviar(id, t, como)
      setTexto('')
      await c.recarregar()
      // a resposta da demonstração chega logo depois
      setTimeout(() => void c.recarregar(), 1500)
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setEnviando(false)
    }
  }

  const d = c.dados
  return (
    <AppAluno voltar={`/mensagens${como ? `?como=${como}` : ''}`} semNav>
      {!d ? (
        c.erro ? <Erro mensagem={mensagemDeErro(c.erro)} /> : <Carregando />
      ) : (
        <div className="flex min-h-[calc(100svh-9rem)] flex-col">
          <Link para={d.outro.link} className="flex items-center gap-3 border-b border-linha pb-4">
            <Avatar nome={d.outro.nome} foto={d.outro.foto} tamanho={44} />
            <span className="min-w-0">
              <span className="block truncate text-lg font-bold">{d.outro.nome}</span>
              <span className="block text-xs text-suave">{d.outro.tipo === 'empresa' ? 'A equipe responde por aqui' : 'Ver o perfil'}</span>
            </span>
          </Link>
          {d.eu.tipo === 'empresa' && <p className="mt-3 rounded-xl bg-anilha-suave px-3 py-2 text-xs">Você está respondendo pela caixa da academia: a pessoa vê o nome da academia e o seu primeiro nome.</p>}

          <ol className="flex-1 space-y-1.5 py-4" aria-live="polite">
            {d.mensagens.length === 0 && <li className="py-10 text-center text-sm text-suave">Diga oi! 👋</li>}
            {d.mensagens.map((m, i) => {
              const dia = dataDe(m.em)
              const novoDia = i === 0 || dataDe(d.mensagens[i - 1].em) !== dia
              const mesmoAutor = i > 0 && d.mensagens[i - 1].nome === m.nome && !novoDia
              return (
                <li key={m.id}>
                  {novoDia && <p className="py-3 text-center text-xs font-semibold text-fraco">{textoData(dia)}</p>}
                  <div className={`flex ${m.meu ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] ${mesmoAutor ? '' : 'mt-1.5'}`}>
                      {!m.meu && !mesmoAutor && m.lado.tipo === 'empresa' && <p className="mb-0.5 px-1 text-[0.7rem] font-semibold text-suave">{m.nome}</p>}
                      <p className={`rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line ${m.meu ? 'rounded-br-md bg-anilha text-anilha-texto' : 'rounded-bl-md bg-sup-2'} ${m.tipo === 'experimental' ? 'border border-anilha' : ''}`}>
                        {m.texto}
                        <span className={`ml-2 align-bottom text-[0.65rem] ${m.meu ? 'opacity-70' : 'text-fraco'}`}>{horaDe(m.em)}</span>
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
            <div ref={fim} />
          </ol>

          <form onSubmit={enviar} className="sticky bottom-0 -mx-4 flex gap-2 border-t border-linha bg-fundo/95 px-4 py-3 backdrop-blur" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
            <textarea
              className="campo max-h-32 min-h-11 resize-none py-2.5"
              rows={1}
              maxLength={1000}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }
              }}
              placeholder="Mensagem"
              aria-label="Mensagem"
            />
            <button type="submit" className="btn btn-anilha btn-m shrink-0 px-4" disabled={enviando || !texto.trim()} aria-label="Enviar">
              {enviando ? <Girando /> : <PiPaperPlaneRight className="text-lg" />}
            </button>
          </form>
        </div>
      )}
    </AppAluno>
  )
}
