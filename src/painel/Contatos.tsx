import { useState } from 'react'
import { PiChatCircleDots, PiCheck, PiUserPlus, PiX } from 'react-icons/pi'
import { useAviso } from '../components/ui/Aviso'
import { Abas, Avatar, Carregando, Erro, Girando, Selo, Vazio } from '../components/ui/basicos'
import { aulas, conversas, mensagemDeErro, painel } from '../lib/api'
import { esquecer, useDados } from '../lib/dados'
import { navegar } from '../lib/rotas'
import { familiaDe, nomeModalidade } from '../shared/modalidades'
import { textoData } from '../shared/tempo'
import { tempoAtras } from '../shared/texto'
import type { PedidoExperimental } from '../shared/tipos'
import { usePainel } from './AppPainel'

// A aula experimental (seção 9 do estudo): quem pediu pela página, em qual aula e dia. Confirmar
// reserva a vaga e manda a mensagem na conversa; depois da aula, marcar como feita.

type Filtro = PedidoExperimental['status']

const TEXTO: Record<Filtro, string> = { novo: 'Novo', confirmado: 'Confirmado', feito: 'Feito', recusado: 'Recusado' }

export function Contatos() {
  const c = usePainel()
  const avisar = useAviso()
  const d = useDados(`painel-contatos:${c.slug}`, () => painel.contatos(c.slug))
  const [filtro, setFiltro] = useState<Filtro>('novo')
  const [mudando, setMudando] = useState<string | null>(null)
  const e = c.empresa
  const pedidos = [...(d.dados?.pedidos ?? [])].sort((a, b) => (filtro === 'novo' || filtro === 'confirmado' ? a.data.localeCompare(b.data) : b.em.localeCompare(a.em)))
  const conta = (s: Filtro) => pedidos.filter((p) => p.status === s).length

  const responder = async (p: PedidoExperimental, status: 'confirmado' | 'feito' | 'recusado') => {
    setMudando(p.id)
    try {
      const r = await aulas.responderExperimental(c.slug, p.id, status)
      d.definir((x) => ({ pedidos: (x?.pedidos ?? []).map((y) => (y.id === p.id ? r.pedido : y)) }))
      esquecer(`painel-visao:${c.slug}`)
      avisar(
        status === 'confirmado'
          ? `Confirmado: a vaga de ${p.nome.split(' ')[0]} está reservada e a mensagem foi na conversa.`
          : status === 'feito'
            ? 'Aula marcada como feita.'
            : 'Pedido recusado. Mandamos a mensagem para combinar outro dia.',
      )
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setMudando(null)
    }
  }
  const conversar = async (p: PedidoExperimental) => {
    try {
      navegar(`/mensagens/${p.conversa ?? (await conversas.abrir({ tipo: 'conta', id: p.conta }, c.slug)).id}?como=${c.slug}`)
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="titulo text-4xl">Aula experimental</h1>
        <p className="mt-1 max-w-2xl text-sm text-suave">Os pedidos feitos pela página da academia. Confirmar reserva a vaga na aula e avisa a pessoa na conversa.</p>
      </header>
      {!d.dados ? (
        d.erro ? (
          <Erro mensagem={mensagemDeErro(d.erro)} aoTentar={d.recarregar} />
        ) : (
          <Carregando />
        )
      ) : (
        <>
          <Abas<Filtro> valor={filtro} aoMudar={setFiltro} opcoes={(['novo', 'confirmado', 'feito', 'recusado'] as const).map((s) => ({ id: s, rotulo: `${TEXTO[s]}${conta(s) ? ` · ${conta(s)}` : ''}` }))} />
          {pedidos.filter((p) => p.status === filtro).length === 0 ? (
            <Vazio
              icone={<PiUserPlus />}
              titulo={filtro === 'novo' ? 'Nenhum pedido novo' : `Nenhum pedido ${TEXTO[filtro].toLowerCase()}`}
              texto="A página da academia tem o botão de aula experimental em cada aula da grade."
            />
          ) : (
            <ul className="space-y-2">
              {pedidos
                .filter((p) => p.status === filtro)
                .map((p) => {
                  const a = e.grade.find((x) => x.id === p.aula)
                  const unidade = e.unidades.find((u) => u.id === p.unidade)
                  return (
                    <li key={p.id} className={`cartao p-4 ${mudando === p.id ? 'opacity-60' : ''}`}>
                      <div className="flex flex-wrap items-center gap-3">
                        <Avatar nome={p.nome} tamanho={44} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{p.nome}</p>
                          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-suave">
                            <span className="size-2 rounded-full" style={{ background: familiaDe(p.modalidade).cor }} />
                            {nomeModalidade(p.modalidade)} · {textoData(p.data)}
                            {a ? ` às ${a.inicio}` : ''}
                            {e.unidades.length > 1 && unidade ? ` · ${unidade.nome}` : ''}
                          </p>
                          <p className="mt-0.5 text-[0.7rem] text-fraco">Pediu {tempoAtras(p.em)}</p>
                        </div>
                        <Selo tom={p.status === 'novo' ? 'alerta' : p.status === 'confirmado' ? 'ok' : 'neutro'}>{TEXTO[p.status]}</Selo>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {p.status === 'novo' && (
                          <>
                            <button type="button" className="btn btn-anilha btn-p" disabled={!!mudando} onClick={() => responder(p, 'confirmado')}>
                              {mudando === p.id ? <Girando /> : <PiCheck />} Confirmar
                            </button>
                            <button type="button" className="btn btn-sup btn-p" disabled={!!mudando} onClick={() => responder(p, 'recusado')}>
                              <PiX /> Outro dia
                            </button>
                          </>
                        )}
                        {p.status === 'confirmado' && (
                          <button type="button" className="btn btn-anilha btn-p" disabled={!!mudando} onClick={() => responder(p, 'feito')}>
                            <PiCheck /> Fez a aula
                          </button>
                        )}
                        <button type="button" className="btn btn-sup btn-p" onClick={() => conversar(p)}>
                          <PiChatCircleDots /> Conversar
                        </button>
                      </div>
                    </li>
                  )
                })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
