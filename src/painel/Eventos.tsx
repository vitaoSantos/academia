import { useState } from 'react'
import { PiConfetti, PiCrown, PiPencilSimple, PiPlus, PiTrash, PiTrophy } from 'react-icons/pi'
import { CriarDesafio } from '../components/desafios/CriarDesafio'
import { useAviso } from '../components/ui/Aviso'
import { Campo, Folha, Girando, Selo } from '../components/ui/basicos'
import { desafios, mensagemDeErro, painel } from '../lib/api'
import { esquecer, useDados } from '../lib/dados'
import { Link } from '../lib/rotas'
import { PONTUACOES } from '../shared/desafio'
import { nomeModalidade } from '../shared/modalidades'
import { dataPorExtenso, hoje, textoData } from '../shared/tempo'
import { plural } from '../shared/texto'
import type { Evento } from '../shared/tipos'
import { usePainel } from './AppPainel'

// Os eventos (o aulão, o campeonato, a troca de faixas) e os desafios oficiais da academia (seção 16
// do estudo). Os dois são do Premium: aparecem na página, na região e no app dos alunos.

export function Eventos() {
  const c = usePainel()
  const avisar = useAviso()
  const e = c.empresa
  const [editando, setEditando] = useState<Partial<Evento> | null>(null)
  const [criandoDesafio, setCriandoDesafio] = useState(false)
  const centro = e.unidades.find((u) => u.ativa)?.ponto
  const lista = useDados(c.nivel === 'premium' && centro ? `painel-desafios:${c.slug}` : null, () => desafios.publicos(centro))
  const oficiais = (lista.dados?.desafios ?? []).filter((d) => d.oficial?.tipo === 'empresa' && d.oficial.id === c.slug)
  const eventos = [...e.eventos].filter((x) => x.data >= hoje()).sort((a, b) => a.data.localeCompare(b.data) || a.inicio.localeCompare(b.inicio))

  if (c.nivel !== 'premium') {
    return (
      <div className="space-y-5">
        <h1 className="titulo text-4xl">Eventos e desafios</h1>
        <div className="cartao flex flex-col items-start gap-3 p-6">
          <PiCrown className="text-3xl text-anilha-legivel" />
          <p className="titulo text-2xl">Do plano Premium</p>
          <p className="max-w-lg text-sm text-suave">
            O aulão de sábado, a troca de faixas, o campeonato interno e o desafio de 30 dias com prêmio: aparecem na página, no feed da região e no app de cada aluno, que confirma presença com um toque.
          </p>
          {c.papel === 'dono' && (
            <Link para={`/painel/${c.slug}/plano`} className="btn btn-anilha btn-m">
              Ver o Premium
            </Link>
          )}
        </div>
      </div>
    )
  }

  const remover = async (ev: Evento) => {
    if (!confirm(`Tirar o evento "${ev.titulo}"?`)) return
    try {
      c.mudar((await painel.removerEvento(c.slug, ev.id)).empresa)
      esquecer(`pagina:${c.slug}`)
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    }
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="eventos">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 id="eventos" className="titulo text-4xl">
              Eventos
            </h1>
            <p className="mt-1 text-sm text-suave">Na página e no app dos alunos, com o "vou" de cada um.</p>
          </div>
          <button type="button" className="btn btn-anilha btn-m" onClick={() => setEditando({ data: hoje(), inicio: '09:00' })}>
            <PiPlus /> Novo evento
          </button>
        </header>
        {eventos.length === 0 ? (
          <p className="cartao p-4 text-sm text-suave">Nenhum evento marcado.</p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {eventos.map((ev) => {
              const unidade = e.unidades.find((u) => u.id === ev.unidade)
              return (
                <li key={ev.id} className="cartao flex gap-4 p-4">
                  <div className="grid w-14 shrink-0 place-items-center rounded-xl bg-sup-2 py-2 text-center">
                    <span className="titulo text-2xl leading-none">{ev.data.slice(8)}</span>
                    <span className="text-[0.65rem] font-bold text-fraco uppercase">{new Date(`${ev.data}T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '')}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{ev.titulo}</p>
                    <p className="text-xs text-suave">
                      {textoData(ev.data)} às {ev.inicio}
                      {unidade ? ` · ${unidade.nome}` : ''}
                      {ev.modalidade ? ` · ${nomeModalidade(ev.modalidade)}` : ''}
                    </p>
                    {ev.descricao && <p className="mt-1.5 line-clamp-2 text-sm text-suave">{ev.descricao}</p>}
                    <p className="mt-2 text-xs font-semibold">{ev.vou.length ? plural(ev.vou.length, 'pessoa vai', 'pessoas vão') : 'Ninguém confirmou ainda'}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button type="button" className="grid size-9 place-items-center rounded-full text-suave hover:bg-sup-2" onClick={() => setEditando(ev)} aria-label={`Editar ${ev.titulo}`}>
                      <PiPencilSimple />
                    </button>
                    <button type="button" className="grid size-9 place-items-center rounded-full text-perigo hover:bg-sup-2" onClick={() => remover(ev)} aria-label={`Tirar ${ev.titulo}`}>
                      <PiTrash />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="desafios">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="desafios" className="titulo text-3xl">
              Desafios oficiais
            </h2>
            <p className="mt-1 text-sm text-suave">Com o nome da academia, abertos na região e com prêmio. Conta a constância: quem treina mais vezes sobe no ranking.</p>
          </div>
          <button type="button" className="btn btn-sup btn-m" onClick={() => setCriandoDesafio(true)}>
            <PiTrophy /> Novo desafio
          </button>
        </header>
        {lista.dados && oficiais.length === 0 ? (
          <p className="cartao p-4 text-sm text-suave">Nenhum desafio oficial no ar.</p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {oficiais.map((d) => (
              <li key={d.id}>
                <Link para={`/desafios/${d.id}`} className="cartao flex items-center gap-3 p-4 hover:border-linha-2">
                  <PiTrophy className="shrink-0 text-2xl text-anilha-legivel" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{d.nome}</span>
                    <span className="block truncate text-xs text-suave">
                      {PONTUACOES[d.pontuacao].nome} · até {dataPorExtenso(d.fim)} · {plural(d.participantes, 'participante', 'participantes')}
                    </span>
                  </span>
                  {d.inicio > hoje() ? <Selo>Começa {textoData(d.inicio)}</Selo> : <Selo tom="ok">No ar</Selo>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <EditarEvento atual={editando} aoFechar={() => setEditando(null)} />
      <CriarDesafio aberta={criandoDesafio} aoFechar={() => setCriandoDesafio(false)} oficial={{ tipo: 'empresa', id: c.slug, nome: e.nome }} />
    </div>
  )
}

function EditarEvento({ atual, aoFechar }: { atual: Partial<Evento> | null; aoFechar: () => void }) {
  const c = usePainel()
  const avisar = useAviso()
  const e = c.empresa
  const [ev, setEv] = useState<Partial<Evento>>({})
  const [ultimo, setUltimo] = useState<Partial<Evento> | null>(null)
  const [salvando, setSalvando] = useState(false)
  if (atual !== ultimo) {
    setUltimo(atual)
    setEv(atual ?? {})
  }
  const salvar = async () => {
    setSalvando(true)
    try {
      c.mudar((await painel.evento(c.slug, ev)).empresa)
      esquecer(`pagina:${c.slug}`)
      avisar(ev.id ? 'Evento salvo.' : 'Evento marcado: já está na página e no app dos alunos.')
      aoFechar()
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setSalvando(false)
    }
  }
  return (
    <Folha aberta={!!atual} aoFechar={aoFechar} titulo={ev.id ? 'Editar evento' : 'Novo evento'}>
      <div className="space-y-4 p-6">
        <h2 className="titulo flex items-center gap-2 text-3xl">
          <PiConfetti className="text-anilha-legivel" /> {ev.id ? 'Editar evento' : 'Novo evento'}
        </h2>
        <Campo rotulo="Nome">
          <input className="campo" maxLength={60} value={ev.titulo ?? ''} onChange={(x) => setEv({ ...ev, titulo: x.target.value })} placeholder="Aulão de sábado, troca de faixas..." />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Dia">
            <input className="campo" type="date" min={hoje()} value={ev.data ?? ''} onChange={(x) => setEv({ ...ev, data: x.target.value })} />
          </Campo>
          <Campo rotulo="Começa">
            <input className="campo" type="time" step={300} value={ev.inicio ?? ''} onChange={(x) => setEv({ ...ev, inicio: x.target.value })} />
          </Campo>
          <Campo rotulo="Unidade">
            <select className="campo" value={ev.unidade ?? ''} onChange={(x) => setEv({ ...ev, unidade: x.target.value || undefined })}>
              <option value="">{e.unidades.filter((u) => u.ativa).length > 1 ? 'Todas' : 'A academia'}</option>
              {e.unidades
                .filter((u) => u.ativa)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
            </select>
          </Campo>
          <Campo rotulo="Modalidade">
            <select className="campo" value={ev.modalidade ?? ''} onChange={(x) => setEv({ ...ev, modalidade: x.target.value || undefined })}>
              <option value="">Todas</option>
              {e.modalidades.map((m) => (
                <option key={m.id} value={m.id}>
                  {nomeModalidade(m.id)}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo rotulo="Detalhes (opcional)">
          <textarea className="campo min-h-20" maxLength={300} value={ev.descricao ?? ''} onChange={(x) => setEv({ ...ev, descricao: x.target.value })} placeholder="O que levar, se tem vaga para amigos, o valor..." />
        </Campo>
        <button type="button" className="btn btn-anilha btn-m w-full" disabled={salvando || !ev.titulo?.trim() || !ev.data || !ev.inicio} onClick={salvar}>
          {salvando ? <Girando /> : ev.id ? 'Salvar' : 'Marcar o evento'}
        </button>
      </div>
    </Folha>
  )
}
