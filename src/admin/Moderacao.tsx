import { useState } from 'react'
import { PiFlag } from 'react-icons/pi'
import { useAviso } from '../components/ui/Aviso'
import { Carregando, Erro, Selo, Vazio } from '../components/ui/basicos'
import { admin, mensagemDeErro, type DenunciaNoAdmin } from '../lib/api'
import { esquecer, useDados } from '../lib/dados'
import { Link } from '../lib/rotas'
import { tempoAtras } from '../shared/texto'

// A moderação (seção 17 do estudo): as denúncias abertas. Com 3 denúncias o post (ou o comentário)
// já some sozinho; aqui o admin decide: liberar (volta a aparecer), ocultar ou apagar.

const ALVO: Record<DenunciaNoAdmin['alvo']['tipo'], string> = { post: 'Post', comentario: 'Comentário', perfil: 'Perfil' }

export function Moderacao() {
  const avisar = useAviso()
  const d = useDados('admin-moderacao', () => admin.moderacao())
  const [fazendo, setFazendo] = useState<string | null>(null)
  const decidir = async (x: DenunciaNoAdmin, decisao: 'liberar' | 'ocultar' | 'apagar') => {
    if (decisao === 'apagar' && !confirm(`Apagar ${x.alvo.tipo === 'post' ? 'o post' : 'o comentário'} de vez? Não tem volta.`)) return
    setFazendo(x.id)
    try {
      const r = await admin.moderar(x.id, decisao)
      d.definir(() => r)
      esquecer('admin-geral')
      avisar(decisao === 'liberar' ? 'Liberado: volta a aparecer.' : decisao === 'ocultar' ? 'Ocultado: só o autor vê.' : 'Apagado.')
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setFazendo(null)
    }
  }
  return (
    <div className="space-y-5">
      <header>
        <h1 className="titulo text-4xl">Moderação</h1>
        <p className="mt-1 max-w-2xl text-sm text-suave">
          As denúncias abertas, da mais nova para a mais antiga. Com 3 denúncias, o post ou o comentário já sai do feed sozinho até a decisão. Cada decisão fica no registro.
        </p>
      </header>
      {!d.dados ? (
        d.erro ? (
          <Erro mensagem={mensagemDeErro(d.erro)} aoTentar={d.recarregar} />
        ) : (
          <Carregando />
        )
      ) : d.dados.denuncias.length === 0 ? (
        <div className="cartao">
          <Vazio icone={<PiFlag />} titulo="Nenhuma denúncia aberta" texto="Quando alguém denunciar um post, um comentário ou um perfil, aparece aqui." />
        </div>
      ) : (
        <ul className="space-y-2">
          {d.dados.denuncias.map((x) => {
            const link = x.alvo.tipo === 'post' ? `/rede/p/${x.alvo.id}` : x.alvo.tipo === 'comentario' && x.alvo.post ? `/rede/p/${x.alvo.post}` : null
            return (
              <li key={x.id} className={`cartao p-4 ${fazendo === x.id ? 'opacity-60' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Selo tom="alerta">{x.motivo}</Selo>
                  <Selo>{ALVO[x.alvo.tipo]}</Selo>
                  <span className="text-xs text-fraco">{tempoAtras(x.em)}</span>
                  {link && (
                    <Link para={link} className="ml-auto text-xs font-semibold text-suave hover:text-texto">
                      Ver na rede →
                    </Link>
                  )}
                </div>
                <blockquote className="mt-3 rounded-xl border-l-2 border-linha-2 bg-sup-2 px-3 py-2 text-sm break-words whitespace-pre-line">{x.conteudo || '(sem texto: só a foto)'}</blockquote>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn btn-sup btn-p" disabled={!!fazendo} onClick={() => decidir(x, 'liberar')}>
                    Liberar
                  </button>
                  {x.alvo.tipo !== 'perfil' && (
                    <>
                      <button type="button" className="btn btn-sup btn-p" disabled={!!fazendo} onClick={() => decidir(x, 'ocultar')}>
                        Ocultar
                      </button>
                      <button type="button" className="btn btn-perigo btn-p" disabled={!!fazendo} onClick={() => decidir(x, 'apagar')}>
                        Apagar
                      </button>
                    </>
                  )}
                  {x.alvo.tipo === 'perfil' && (
                    <Link para="/admin/contas" className="btn btn-sup btn-p">
                      Ver nas contas
                    </Link>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
