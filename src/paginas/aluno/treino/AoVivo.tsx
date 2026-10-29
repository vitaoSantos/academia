import { useEffect, useRef, useState } from 'react'
import { PiArrowsLeftRight, PiCaretLeft, PiCaretRight, PiCheckBold, PiCube, PiListBullets, PiMinus, PiNotePencil, PiPlus, PiTimer, PiTrash } from 'react-icons/pi'
import { EscolherExercicio } from '../../../components/ficha/EscolherExercicio'
import { FolhaExercicio } from '../../../components/ficha/VerExercicio'
import { useVinculos } from '../../../components/layout/AppAluno'
import { useAviso } from '../../../components/ui/Aviso'
import { Folha, Girando, Selo } from '../../../components/ui/basicos'
import { CampoNumero } from '../../../components/ui/CampoNumero'
import { useAgora } from '../../../hooks/useAgora'
import { ErroApi, mensagemDeErro, treinos } from '../../../lib/api'
import { useDados } from '../../../lib/dados'
import { bipe, enfileirar, exercicioAoVivo, paraRegistrar, vibrar, type TreinoAoVivo } from '../../../lib/treinoLocal'
import { EXERCICIO, parecidos } from '../../../shared/exercicios'
import { TECNICAS, textoReps } from '../../../shared/ficha'
import type { ResultadoDoTreino } from '../../../shared/respostas'
import { forcaEstimada, recordes, seriesFeitas, volume } from '../../../shared/treino'
import { kg, numero } from '../../../shared/texto'

type Mudar = (f: (t: TreinoAoVivo) => TreinoAoVivo) => void

// O passo da carga pelo aparelho: a anilha da barra (1,25 de cada lado), o halter de 2 em 2, a
// máquina de 5 em 5, o leg press de 10 em 10
function passoDaCarga(id: string) {
  const eq = EXERCICIO[id]?.equipamento ?? []
  if (eq.includes('leg-press')) return 10
  if (eq.some((q) => q === 'polia' || q === 'extensora' || q === 'flexora')) return 5
  if (eq.some((q) => q === 'halter' || q === 'kettlebell')) return 2
  if (eq.includes('barra')) return 2.5
  return 1
}

const relogio = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

// A tela fica acesa durante o treino (quando o navegador deixa)
function useTelaAcesa() {
  useEffect(() => {
    let trava: { release: () => Promise<void> } | null = null
    const pedir = async () => {
      try {
        trava = await (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null
      } catch {
        trava = null
      }
    }
    void pedir()
    const voltar = () => document.visibilityState === 'visible' && void pedir()
    document.addEventListener('visibilitychange', voltar)
    return () => {
      document.removeEventListener('visibilitychange', voltar)
      void trava?.release().catch(() => {})
    }
  }, [])
}

export function AoVivo({ t, mudar, aoDescartar, aoSalvar, aoGuardarOffline }: { t: TreinoAoVivo; mudar: Mudar; aoDescartar: () => void; aoSalvar: (r: ResultadoDoTreino) => void; aoGuardarOffline: () => void }) {
  useTelaAcesa()
  const agora = useAgora(500)
  const [vendo, setVendo] = useState<string | null>(null)
  const [lista, setLista] = useState(false)
  const [adicionando, setAdicionando] = useState<'novo' | 'trocar' | null>(null)
  const [anotando, setAnotando] = useState(false)
  const [terminando, setTerminando] = useState(false)
  const ultima = useDados('ultima-vez', () => treinos.ultima())
  const i = Math.min(t.atual, Math.max(0, t.exercicios.length - 1))
  const e = t.exercicios[i]
  const descansando = !!t.descansoAte && t.descansoAte > agora
  const avisado = useRef<number | null>(null)

  // o fim do descanso: vibra e apita uma vez
  useEffect(() => {
    if (!t.descansoAte || t.descansoAte > agora || avisado.current === t.descansoAte) return
    avisado.current = t.descansoAte
    vibrar([180, 90, 180])
    bipe()
    mudar((x) => ({ ...x, descansoAte: undefined }))
  }, [agora, t.descansoAte, mudar])

  const serie = (j: number, d: Partial<{ reps: number; carga: number; feita: boolean }>) =>
    mudar((x) => ({ ...x, exercicios: x.exercicios.map((ex, k) => (k === i ? { ...ex, series: ex.series.map((s, m) => (m === j ? { ...s, ...d } : s)) } : ex)) }))

  const feita = (j: number) => {
    const marcando = !e.series[j].feita
    mudar((x) => {
      const exercicios = x.exercicios.map((ex, k) => (k === i ? { ...ex, series: ex.series.map((s, m) => (m === j ? { ...s, feita: marcando } : s)) } : ex))
      if (!marcando) return { ...x, exercicios }
      const terminouEste = exercicios[i].series.every((s) => s.feita)
      const ultimoDoTreino = terminouEste && exercicios.slice(i + 1).every((ex) => ex.series.every((s) => s.feita))
      const descanso = e.descanso
      return {
        ...x,
        exercicios,
        // o descanso começa; terminou o exercício, já mostra o próximo
        ...(descanso > 0 && !ultimoDoTreino ? { descansoAte: Date.now() + descanso * 1000, descansoTotal: descanso } : { descansoAte: undefined }),
        ...(terminouEste && i < exercicios.length - 1 ? { atual: i + 1 } : {}),
      }
    })
    if (marcando) vibrar([30])
    if (marcando && e.series.every((s, m) => m === j || s.feita) && i < t.exercicios.length - 1) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const ir = (k: number) => {
    mudar((x) => ({ ...x, atual: Math.max(0, Math.min(x.exercicios.length - 1, k)) }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const feitas = seriesFeitas(t.exercicios.map((x) => ({ exercicio: x.exercicio, nome: x.nome, series: x.series })))
  const total = t.exercicios.reduce((n, x) => n + x.series.length, 0)
  const antes = ultima.dados?.ultima[e?.exercicio ?? ''] ?? []
  const melhor = ultima.dados?.melhores[e?.exercicio ?? '']

  if (!e)
    return (
      <div className="py-10 text-center">
        <p className="font-bold">Nenhum exercício no treino</p>
        <button type="button" className="btn btn-anilha btn-m mt-4" onClick={() => setAdicionando('novo')}>
          <PiPlus /> Adicionar exercício
        </button>
        <EscolherExercicio
          aberta={adicionando === 'novo'}
          aoFechar={() => setAdicionando(null)}
          aoEscolher={(id) => {
            mudar((x) => ({ ...x, exercicios: [...x.exercicios, exercicioAoVivo(id, EXERCICIO[id]?.nome ?? 'Exercício', null, ultima.dados?.ultima)] }))
            setAdicionando(null)
          }}
        />
      </div>
    )

  return (
    <div className="pb-40">
      {/* o topo do treino: o nome, o cronômetro, o progresso */}
      <div className="sticky top-16 z-30 -mx-4 border-b border-linha bg-fundo/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-b-2xl">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{t.nome}</p>
            <p className="text-xs text-suave">
              <span className="dado">{relogio(agora - Date.parse(t.inicio!))}</span> · {feitas} de {total} séries
            </p>
          </div>
          <button type="button" className="grid size-10 place-items-center rounded-full bg-sup-2 text-xl" aria-label="Todos os exercícios" onClick={() => setLista(true)}>
            <PiListBullets />
          </button>
          <button type="button" className="btn btn-anilha btn-p" onClick={() => setTerminando(true)}>
            Terminar
          </button>
        </div>
        <div className="mt-2.5 flex gap-1" aria-hidden>
          {t.exercicios.map((x, k) => {
            const n = x.series.filter((s) => s.feita).length
            return (
              <button key={k} type="button" tabIndex={-1} onClick={() => ir(k)} className={`h-1.5 flex-1 overflow-hidden rounded-full ${k === i ? 'bg-texto/30' : 'bg-sup-3'}`}>
                <span className="block h-full rounded-full bg-anilha transition-all" style={{ width: `${(n / Math.max(1, x.series.length)) * 100}%` }} />
              </button>
            )
          })}
        </div>
      </div>

      {/* o exercício da vez */}
      <section className="mt-5" aria-live="polite">
        <p className="text-xs font-semibold text-fraco">
          Exercício {i + 1} de {t.exercicios.length}
        </p>
        <div className="mt-1 flex items-start gap-3">
          <h1 className="titulo min-w-0 flex-1 text-4xl">{e.nome}</h1>
          {(EXERCICIO[e.exercicio] || e.exercicio.startsWith('p-')) && (
            <button type="button" className="flex shrink-0 flex-col items-center gap-0.5 rounded-2xl bg-sup-2 px-3 py-2 text-anilha-legivel hover:bg-sup-3" onClick={() => setVendo(e.exercicio)}>
              <PiCube className="text-2xl" />
              <span className="text-[0.62rem] font-bold">3D</span>
            </button>
          )}
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-suave">
          <span>
            <span className="font-bold text-texto">{e.series.length}</span> × <span className="font-bold text-texto">{textoReps(e.alvo)}</span>
          </span>
          {e.cargaSugerida ? <span>sugerido {kg(e.cargaSugerida)}</span> : null}
          <span className="flex items-center gap-1">
            <PiTimer /> {e.descanso} s
          </span>
          {e.tecnica && <Selo tom="marca">{TECNICAS[e.tecnica]}</Selo>}
        </p>
        {e.recado && <p className="mt-3 rounded-2xl bg-anilha-suave px-4 py-3 text-sm">“{e.recado}”</p>}
        {antes.length > 0 && (
          <p className="mt-2 text-xs text-fraco">
            Última vez: {antes.map((s) => `${s.reps}${e.tempo ? 's' : ''}×${numero(s.carga, 1)}`).join(' · ')} kg
            {melhor?.carga ? ` · melhor ${kg(melhor.carga)}` : ''}
          </p>
        )}

        {/* as séries */}
        <div className="mt-4">
          <div className="grid grid-cols-[1.75rem_1fr_1fr_3rem] items-center gap-2 px-1 text-[0.65rem] font-bold tracking-wider text-fraco uppercase">
            <span>#</span>
            <span className="text-center">kg</span>
            <span className="text-center">{e.tempo ? 'segundos' : 'reps'}</span>
            <span className="sr-only">Feita</span>
          </div>
          <ol className="mt-1.5 space-y-2">
            {e.series.map((s, j) => {
              const recorde = s.feita && melhor && (s.carga > melhor.carga || forcaEstimada(s.carga, s.reps) > melhor.forca + 0.4)
              return (
                <li key={j} className={`grid grid-cols-[1.75rem_1fr_1fr_3rem] items-center gap-2 rounded-2xl p-1.5 transition-colors ${s.feita ? 'bg-anilha-suave' : ''}`}>
                  <span className={`titulo text-center text-2xl ${s.feita ? 'text-anilha-legivel' : 'text-fraco'}`}>{j + 1}</span>
                  <CampoNumero valor={s.carga} passo={passoDaCarga(e.exercicio)} rotulo={`carga da série ${j + 1}`} aoMudar={(n) => serie(j, { carga: n })} compacto />
                  <CampoNumero valor={s.reps} passo={e.tempo ? 5 : 1} max={e.tempo ? 3600 : 999} rotulo={`${e.tempo ? 'segundos' : 'repetições'} da série ${j + 1}`} aoMudar={(n) => serie(j, { reps: Math.round(n) })} compacto />
                  <button
                    type="button"
                    onClick={() => feita(j)}
                    aria-pressed={s.feita}
                    aria-label={`Série ${j + 1} feita`}
                    className={`relative grid h-10 place-items-center rounded-xl text-lg transition-colors ${s.feita ? 'bg-anilha text-anilha-texto' : 'border-2 border-linha-2 text-fraco hover:border-anilha'}`}
                  >
                    <PiCheckBold />
                    {recorde && <span className="absolute -top-2 -right-1 rounded-full bg-texto px-1 text-[0.55rem] font-black text-fundo">PR</span>}
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn btn-fantasma btn-p" onClick={() => mudar((x) => ({ ...x, exercicios: x.exercicios.map((ex, k) => (k === i ? { ...ex, series: [...ex.series, { ...(ex.series[ex.series.length - 1] ?? { reps: 10, carga: 0 }), feita: false }] } : ex)) }))}>
              <PiPlus /> Série
            </button>
            {e.series.length > 1 && (
              <button type="button" className="btn btn-fantasma btn-p" onClick={() => mudar((x) => ({ ...x, exercicios: x.exercicios.map((ex, k) => (k === i ? { ...ex, series: ex.series.slice(0, -1) } : ex)) }))}>
                <PiMinus /> Série
              </button>
            )}
            <button type="button" className="btn btn-fantasma btn-p" onClick={() => setAnotando(true)}>
              <PiNotePencil /> {e.nota ? 'Anotação' : 'Anotar'}
            </button>
            <button type="button" className="btn btn-fantasma btn-p" onClick={() => setAdicionando('trocar')}>
              <PiArrowsLeftRight /> Trocar
            </button>
          </div>
          {e.nota && <p className="mt-2 rounded-xl bg-sup-2 px-3 py-2 text-sm text-suave">{e.nota}</p>}
        </div>
      </section>

      {/* embaixo: o descanso, ou anterior/próximo */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-linha bg-fundo/95 backdrop-blur-md" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="mx-auto max-w-3xl px-4 py-3">
          {descansando ? (
            <Descanso ate={t.descansoAte!} total={t.descansoTotal ?? e.descanso} agora={agora} mudar={mudar} proximo={t.exercicios[i]?.series.every((s) => s.feita) ? undefined : e.nome} />
          ) : (
            <div className="flex gap-2">
              <button type="button" className="btn btn-sup btn-m" onClick={() => ir(i - 1)} disabled={i === 0} aria-label="Exercício anterior">
                <PiCaretLeft />
              </button>
              {i < t.exercicios.length - 1 ? (
                <button type="button" className="btn btn-sup btn-m min-w-0 flex-1" onClick={() => ir(i + 1)}>
                  <span className="shrink-0 text-suave">Próximo:</span>
                  <span className="min-w-0 truncate">{t.exercicios[i + 1].nome}</span>
                  <PiCaretRight className="shrink-0" />
                </button>
              ) : (
                <button type="button" className="btn btn-anilha btn-m flex-1" onClick={() => setTerminando(true)}>
                  Terminar o treino
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* todos os exercícios */}
      <Folha aberta={lista} aoFechar={() => setLista(false)} titulo="Exercícios do treino">
        <div className="p-5">
          <h2 className="titulo text-3xl">Exercícios</h2>
          <ol className="mt-4 space-y-1.5">
            {t.exercicios.map((x, k) => {
              const n = x.series.filter((s) => s.feita).length
              return (
                <li key={k} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      ir(k)
                      setLista(false)
                    }}
                    className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left ${k === i ? 'bg-anilha-suave' : 'hover:bg-sup-2'}`}
                  >
                    <span className="titulo w-5 text-xl text-fraco">{k + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{x.nome}</span>
                    <span className={`dado text-xs ${n === x.series.length ? 'text-ok' : 'text-suave'}`}>
                      {n}/{x.series.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="grid size-9 place-items-center rounded-full text-fraco hover:bg-sup-2 hover:text-perigo"
                    aria-label={`Tirar ${x.nome}`}
                    onClick={() => mudar((y) => ({ ...y, exercicios: y.exercicios.filter((_, m) => m !== k), atual: Math.max(0, y.atual > k ? y.atual - 1 : y.atual) }))}
                  >
                    <PiTrash />
                  </button>
                </li>
              )
            })}
          </ol>
          <button type="button" className="btn btn-sup btn-m mt-4 w-full" onClick={() => setAdicionando('novo')}>
            <PiPlus /> Adicionar exercício
          </button>
          <button
            type="button"
            className="btn btn-fantasma btn-p mt-6 w-full text-perigo"
            onClick={() => {
              if (confirm('Descartar este treino? O que você marcou não vai ser guardado.')) aoDescartar()
            }}
          >
            Descartar o treino
          </button>
        </div>
      </Folha>

      <EscolherExercicio
        aberta={!!adicionando}
        titulo={adicionando === 'trocar' ? `Trocar ${e.nome}` : 'Adicionar exercício'}
        sugeridos={adicionando === 'trocar' ? parecidos(e.exercicio).map((x) => x.id) : []}
        escolhidos={t.exercicios.map((x) => x.exercicio)}
        aoFechar={() => setAdicionando(null)}
        aoEscolher={(id) => {
          const novo = exercicioAoVivo(id, EXERCICIO[id]?.nome ?? 'Exercício', null, ultima.dados?.ultima)
          if (adicionando === 'trocar') {
            // mantém as séries e o descanso pedidos na ficha; troca o exercício
            mudar((x) => ({ ...x, exercicios: x.exercicios.map((ex, k) => (k === i ? { ...novo, series: novo.series.slice(0, ex.series.length).concat(ex.series.slice(novo.series.length).map((s) => ({ ...s, feita: false }))), descanso: ex.descanso, alvo: ex.alvo, recado: ex.recado } : ex)) }))
          } else {
            mudar((x) => ({ ...x, exercicios: [...x.exercicios, novo], atual: x.exercicios.length }))
            setLista(false)
          }
          setAdicionando(null)
        }}
      />

      <Anotar aberta={anotando} valor={e.nota ?? ''} aoFechar={() => setAnotando(false)} aoSalvar={(nota) => mudar((x) => ({ ...x, exercicios: x.exercicios.map((ex, k) => (k === i ? { ...ex, nota: nota || undefined } : ex)) }))} />

      <FolhaExercicio id={vendo} aoFechar={() => setVendo(null)} />

      <Terminar aberta={terminando} t={t} aoFechar={() => setTerminando(false)} melhores={ultima.dados?.melhores ?? {}} aoSalvar={aoSalvar} aoGuardarOffline={aoGuardarOffline} />
    </div>
  )
}

function Descanso({ ate, total, agora, mudar, proximo }: { ate: number; total: number; agora: number; mudar: Mudar; proximo?: string }) {
  const falta = Math.max(0, ate - agora)
  const fracao = Math.min(1, falta / (total * 1000))
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-suave">Descanso{proximo ? '' : ' · já vem o próximo exercício'}</p>
          <p className="titulo dado text-4xl leading-none">{relogio(falta + 999)}</p>
        </div>
        <button type="button" className="btn btn-sup btn-p dado" onClick={() => mudar((x) => ({ ...x, descansoAte: Math.max(Date.now() + 1000, (x.descansoAte ?? Date.now()) - 15_000) }))}>
          −15
        </button>
        <button type="button" className="btn btn-sup btn-p dado" onClick={() => mudar((x) => ({ ...x, descansoAte: (x.descansoAte ?? Date.now()) + 15_000, descansoTotal: (x.descansoTotal ?? total) + 15 }))}>
          +15
        </button>
        <button type="button" className="btn btn-anilha btn-p" onClick={() => mudar((x) => ({ ...x, descansoAte: undefined }))}>
          Pular
        </button>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-sup-3">
        <div className="h-full rounded-full bg-anilha transition-[width] duration-500 ease-linear" style={{ width: `${fracao * 100}%` }} />
      </div>
    </div>
  )
}

function Anotar({ aberta, valor, aoFechar, aoSalvar }: { aberta: boolean; valor: string; aoFechar: () => void; aoSalvar: (v: string) => void }) {
  const [texto, setTexto] = useState(valor)
  useEffect(() => setTexto(valor), [valor, aberta])
  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo="Anotação">
      <div className="p-6">
        <h2 className="titulo text-3xl">Anotação</h2>
        <p className="mt-1 text-sm text-suave">O banco na 3ª posição, o ombro incomodou... O seu professor vê no histórico.</p>
        <textarea className="campo mt-4 min-h-28" maxLength={160} value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus />
        <button
          type="button"
          className="btn btn-anilha btn-m mt-4 w-full"
          onClick={() => {
            aoSalvar(texto.trim())
            aoFechar()
          }}
        >
          Guardar
        </button>
      </div>
    </Folha>
  )
}

// ---------- Terminar: o resumo, o esforço e onde foi ----------

function Terminar({ aberta, t, aoFechar, melhores, aoSalvar, aoGuardarOffline }: { aberta: boolean; t: TreinoAoVivo; aoFechar: () => void; melhores: Record<string, { carga: number; forca: number }>; aoSalvar: (r: ResultadoDoTreino) => void; aoGuardarOffline: () => void }) {
  const avisar = useAviso()
  const vinculos = useVinculos()
  const academias = (vinculos.dados ?? []).filter((v) => v.tipo === 'empresa' && v.status === 'ativo' && v.unidade)
  const [esforco, setEsforco] = useState(0)
  const [nota, setNota] = useState('')
  const [local, setLocal] = useState<string>(() => (t.local ? `${t.local.empresa}:${t.local.unidade}` : ''))
  const [salvando, setSalvando] = useState(false)
  const exercicios = t.exercicios.map((x) => ({ exercicio: x.exercicio, nome: x.nome, series: x.series }))
  const feitas = seriesFeitas(exercicios)
  const prs = recordes(exercicios, melhores)
  const minutos = Math.max(1, Math.round((Date.now() - Date.parse(t.inicio!)) / 60_000))
  const curto = Date.now() - Date.parse(t.inicio!) < 60_000
  const escolhido = local === 'fora' ? undefined : (academias.find((a) => `${a.id}:${a.unidade}` === local) ?? (local ? undefined : academias[0]))
  const ondeValor = local || (academias[0] ? `${academias[0].id}:${academias[0].unidade}` : 'fora')

  const salvar = async () => {
    if (!feitas) return avisar('Marque pelo menos uma série feita.', 'erro')
    setSalvando(true)
    const dados = paraRegistrar(t, { esforco: esforco || undefined, nota: nota.trim() || undefined, local: escolhido ? { empresa: escolhido.id, unidade: escolhido.unidade! } : undefined })
    try {
      aoSalvar(await treinos.registrar(dados))
    } catch (e) {
      if (e instanceof ErroApi && e.status === 0) {
        // sem internet: guarda e sobe depois
        enfileirar(t.conta, dados)
        avisar('Sem internet agora: o treino ficou guardado no aparelho e sobe sozinho depois.')
        aoGuardarOffline()
      } else avisar(mensagemDeErro(e), 'erro')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo="Terminar o treino">
      <div className="p-6">
        <h2 className="titulo text-3xl">Terminar o treino</h2>
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-sup-2 p-4 text-center">
          <div>
            <p className="titulo dado text-3xl">{minutos}</p>
            <p className="text-[0.68rem] text-suave">{minutos === 1 ? 'minuto' : 'minutos'}</p>
          </div>
          <div>
            <p className="titulo dado text-3xl">{numero(volume(exercicios))}</p>
            <p className="text-[0.68rem] text-suave">kg de volume</p>
          </div>
          <div>
            <p className="titulo dado text-3xl">{feitas}</p>
            <p className="text-[0.68rem] text-suave">séries</p>
          </div>
        </div>
        {prs.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {prs.map((r) => (
              <li key={r.exercicio} className="flex items-center gap-2">
                <Selo tom="marca">Recorde</Selo> {r.nome}: {r.tipo === 'carga' ? kg(r.valor) : `força ${kg(r.valor)}`}
              </li>
            ))}
          </ul>
        )}
        {feitas < t.exercicios.reduce((n, x) => n + x.series.length, 0) && <p className="mt-3 text-xs text-fraco">As séries não marcadas não entram.</p>}

        <p className="rotulo mt-5">Como foi o esforço?</p>
        <div className="grid grid-cols-10 gap-1" role="radiogroup" aria-label="Esforço de 1 a 10">
          {Array.from({ length: 10 }, (_, k) => k + 1).map((n) => (
            <button key={n} type="button" role="radio" aria-checked={esforco === n} onClick={() => setEsforco(esforco === n ? 0 : n)} className={`dado h-10 rounded-lg text-sm font-bold ${esforco === n ? 'bg-anilha text-anilha-texto' : 'bg-sup-2 text-suave'}`}>
              {n}
            </button>
          ))}
        </div>
        <p className="mt-1 flex justify-between text-[0.65rem] text-fraco">
          <span>leve</span>
          <span>no limite</span>
        </p>

        {academias.length > 0 && (
          <label className="mt-4 block">
            <span className="rotulo">Onde você treinou?</span>
            <select className="campo" value={ondeValor} onChange={(ev) => setLocal(ev.target.value)}>
              {academias.map((a) => (
                <option key={a.id} value={`${a.id}:${a.unidade}`}>
                  {a.unidadeNome ?? a.nome}
                </option>
              ))}
              <option value="fora">Em casa ou em outro lugar</option>
            </select>
          </label>
        )}
        <label className="mt-4 block">
          <span className="rotulo">Recado para o professor (opcional)</span>
          <input className="campo" maxLength={200} value={nota} onChange={(ev) => setNota(ev.target.value)} placeholder="Senti o joelho no afundo" />
        </label>

        {curto && <p className="mt-5 text-xs text-alerta">O treino começou há menos de 1 minuto: dá para salvar depois do primeiro minuto.</p>}
        <button type="button" className="btn btn-anilha btn-g mt-6 w-full" disabled={salvando || curto} onClick={salvar}>
          {salvando ? <Girando /> : 'Salvar o treino'}
        </button>
        <button type="button" className="btn btn-fantasma btn-p mt-2 w-full" onClick={aoFechar}>
          Voltar ao treino
        </button>
      </div>
    </Folha>
  )
}
