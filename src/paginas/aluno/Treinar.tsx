import { useCallback, useEffect, useState } from 'react'
import { PiArrowRight, PiBarbellBold, PiClipboardText, PiCloudArrowUp, PiPersonSimpleRun, PiPlus, PiTrash } from 'react-icons/pi'
import { EscolherExercicio } from '../../components/ficha/EscolherExercicio'
import { textoDescanso } from '../../components/ficha/ListaDaDivisao'
import { AppAluno, useVinculos } from '../../components/layout/AppAluno'
import { useAviso } from '../../components/ui/Aviso'
import { Carregando, Erro, Folha, Girando } from '../../components/ui/basicos'
import { fichas, mensagemDeErro, treinos } from '../../lib/api'
import { esquecer, useDados } from '../../lib/dados'
import { Link, navegar, useEndereco } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import { enviarPendentes, esquecerTreino, exercicioAoVivo, guardarTreino, novoIdTreino, pendentes, treinoGuardado, type TreinoAoVivo } from '../../lib/treinoLocal'
import { EXERCICIO } from '../../shared/exercicios'
import { textoReps } from '../../shared/ficha'
import { familiaDe, MODALIDADES, nomeModalidade } from '../../shared/modalidades'
import type { FichaCompleta, ResultadoDoTreino, UltimaVez } from '../../shared/respostas'
import { formatarDuracao, kg, plural } from '../../shared/texto'
import { useInicio } from './Inicio'
import { AoVivo } from './treino/AoVivo'
import { Pago } from './treino/Pago'

// O treino ao vivo (seção 10 do estudo). Da ficha, monta a lista com as cargas da última vez; durante
// o treino, cada toque fica guardado no aparelho; no fim, sobe para o servidor (ou entra na fila, sem
// internet) e vira o "treino pago" para postar.

function montarDaFicha(conta: string, d: FichaCompleta, divisaoId: string, ultima: UltimaVez['ultima']): TreinoAoVivo | null {
  const f = d.ficha
  const div = f.divisoes.find((x) => x.id === divisaoId)
  if (!div) return null
  const local = f.contexto.tipo === 'empresa' && f.contexto.unidade ? { empresa: f.contexto.id, unidade: f.contexto.unidade } : undefined
  return {
    id: novoIdTreino(),
    conta,
    ficha: f.id,
    divisao: div.id,
    ...(f.contexto.tipo !== 'propria' ? { autorFicha: f.autor } : {}),
    nome: `${div.nome}${div.foco ? ` · ${div.foco}` : ''}`,
    inicio: null,
    atual: 0,
    exercicios: div.itens.map((it) => exercicioAoVivo(it.exercicio, EXERCICIO[it.exercicio]?.nome ?? d.proprios.find((p) => p.id === it.exercicio)?.nome ?? 'Exercício', it, ultima)),
    ...(local ? { local } : {}),
  }
}

export default function Treinar() {
  useTitulo('Treinar')
  const s = useSessao()
  const conta = s.usuario?.id
  // undefined: ainda lendo o aparelho
  const [treino, setTreino] = useState<TreinoAoVivo | null | undefined>(undefined)
  const [pago, setPago] = useState<{ r: ResultadoDoTreino; autorFicha?: string } | null>(null)

  useEffect(() => {
    if (conta) setTreino(treinoGuardado(conta))
  }, [conta])

  const mudar = useCallback((f: (t: TreinoAoVivo) => TreinoAoVivo) => {
    setTreino((t) => {
      if (!t) return t
      const n = f(t)
      guardarTreino(n)
      return n
    })
  }, [])

  const definir = useCallback(
    (t: TreinoAoVivo | null) => {
      if (t) guardarTreino(t)
      else if (conta) esquecerTreino(conta)
      setTreino(t)
    },
    [conta],
  )

  return (
    <AppAluno semNav={!!treino && !pago}>
      {pago ? (
        <Pago r={pago.r} autorFicha={pago.autorFicha} />
      ) : treino === undefined || !conta ? (
        <Carregando />
      ) : treino === null ? (
        <Escolher conta={conta} aoMontar={definir} />
      ) : !treino.inicio ? (
        <Pronto t={treino} mudar={mudar} aoCancelar={() => definir(null)} />
      ) : (
        <AoVivo
          t={treino}
          mudar={mudar}
          aoDescartar={() => definir(null)}
          aoSalvar={(r) => {
            const autorFicha = treino.autorFicha
            esquecer('inicio:')
            esquecer('historico:')
            definir(null)
            setPago({ r, autorFicha })
          }}
          aoGuardarOffline={() => {
            definir(null)
            navegar('/app')
          }}
        />
      )}
    </AppAluno>
  )
}

// ---------- Escolher o que treinar ----------

function Escolher({ conta, aoMontar }: { conta: string; aoMontar: (t: TreinoAoVivo) => void }) {
  const { busca } = useEndereco()
  const fichaId = busca.get('ficha')
  const divisaoId = busca.get('divisao')
  const avisar = useAviso()
  const inicio = useInicio()
  const [erro, setErro] = useState<string | null>(null)
  const [aula, setAula] = useState(false)
  const [fila, setFila] = useState(() => pendentes(conta).length)
  const [enviando, setEnviando] = useState(false)

  // veio da ficha: monta direto
  useEffect(() => {
    if (!fichaId || !divisaoId) return
    let vivo = true
    Promise.all([fichas.ler(fichaId), treinos.ultima().catch(() => ({ ultima: {}, melhores: {} }) as UltimaVez)])
      .then(([d, u]) => {
        if (!vivo) return
        const t = montarDaFicha(conta, d, divisaoId, u.ultima)
        if (t) aoMontar(t)
        else setErro('Essa divisão não existe mais na ficha.')
      })
      .catch((e) => vivo && setErro(mensagemDeErro(e)))
    return () => {
      vivo = false
    }
  }, [fichaId, divisaoId, conta, aoMontar])

  const enviar = async () => {
    setEnviando(true)
    const n = await enviarPendentes(conta)
    setEnviando(false)
    setFila(pendentes(conta).length)
    if (n) {
      esquecer('inicio:')
      avisar(n === 1 ? 'O treino subiu!' : `${n} treinos subiram!`)
    } else avisar('Ainda sem conexão. Tentamos de novo depois.', 'erro')
  }

  if (fichaId && divisaoId) return erro ? <Erro mensagem={erro} aoTentar={() => location.reload()} /> : <Carregando />

  const livre = () => aoMontar({ id: novoIdTreino(), conta, nome: 'Treino livre', inicio: null, atual: 0, exercicios: [] })
  const d = inicio.dados
  const p = d?.proximaDivisao
  const ativas = d?.fichas.filter((f) => f.status === 'ativa') ?? []

  return (
    <div className="space-y-4">
      <h1 className="titulo text-4xl">Treinar</h1>

      {fila > 0 && (
        <div className="cartao flex items-center gap-3 border-alerta p-4">
          <PiCloudArrowUp className="shrink-0 text-2xl text-alerta" />
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-bold">{fila === 1 ? 'Um treino' : `${fila} treinos`} esperando internet</span>
            <span className="block text-xs text-suave">Ficou guardado no aparelho. Sobe sozinho quando a conexão voltar.</span>
          </p>
          <button type="button" className="btn btn-sup btn-p" onClick={enviar} disabled={enviando}>
            {enviando ? <Girando /> : 'Enviar'}
          </button>
        </div>
      )}

      {p && (
        <Link para={`/treinar?ficha=${p.ficha}&divisao=${p.divisao}`} substituir className="block rounded-3xl bg-anilha p-5 text-anilha-texto">
          <span className="text-xs font-bold tracking-widest uppercase opacity-75">O treino de hoje</span>
          <span className="titulo mt-1 block text-4xl">{p.nome}</span>
          {p.foco && <span className="block font-semibold opacity-85">{p.foco}</span>}
          <span className="mt-4 inline-flex items-center gap-2 font-bold">
            Preparar <PiArrowRight />
          </span>
        </Link>
      )}

      {ativas.length > 0 && (
        <section aria-labelledby="outras">
          <h2 id="outras" className="mb-2 text-sm font-bold text-suave">
            Outra divisão
          </h2>
          <ul className="space-y-2">
            {ativas.map((f) => (
              <li key={f.id}>
                <Link para={`/fichas/${f.id}`} className="cartao flex items-center gap-3 p-4 hover:border-linha-2">
                  <PiClipboardText className="shrink-0 text-xl text-fraco" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{f.titulo}</span>
                    <span className="block text-xs text-suave">
                      {f.contexto.tipo === 'propria' ? 'Ficha sua' : f.autorNome} · {plural(f.divisoes, 'divisão', 'divisões')}
                    </span>
                  </span>
                  <PiArrowRight className="shrink-0 text-fraco" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={livre} className="cartao flex items-center gap-3 p-4 text-left hover:border-linha-2">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sup-2 text-xl">
            <PiBarbellBold />
          </span>
          <span>
            <span className="block font-bold">Treino livre</span>
            <span className="block text-xs text-suave">Escolha os exercícios na hora</span>
          </span>
        </button>
        <button type="button" onClick={() => setAula(true)} className="cartao flex items-center gap-3 p-4 text-left hover:border-linha-2">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sup-2 text-xl">
            <PiPersonSimpleRun />
          </span>
          <span>
            <span className="block font-bold">Fiz uma aula</span>
            <span className="block text-xs text-suave">Jiu-jitsu, spinning, dança, pilates...</span>
          </span>
        </button>
      </div>

      <RegistrarAula aberta={aula} aoFechar={() => setAula(false)} />
    </div>
  )
}

// ---------- Pronto para começar ----------

function Pronto({ t, mudar, aoCancelar }: { t: TreinoAoVivo; mudar: (f: (t: TreinoAoVivo) => TreinoAoVivo) => void; aoCancelar: () => void }) {
  const [escolhendo, setEscolhendo] = useState(false)
  const ultima = useDados('ultima-vez', () => treinos.ultima())
  const comecar = () => {
    mudar((x) => ({ ...x, inicio: new Date().toISOString(), atual: 0 }))
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }
  const descansoTotal = t.exercicios.reduce((s, e) => s + e.series.length * (e.descanso + (e.tempo ? (e.series[0]?.reps ?? 30) : 40)), 0)
  return (
    <div>
      <p className="sobre">Pronto?</p>
      <h1 className="titulo mt-2 text-4xl sm:text-5xl">{t.nome}</h1>
      {t.exercicios.length > 0 && (
        <p className="mt-2 text-sm text-suave">
          {plural(t.exercicios.length, 'exercício', 'exercícios')} · uns {formatarDuracao(Math.max(10, Math.round(descansoTotal / 60 / 5) * 5))}
        </p>
      )}
      <ol className="mt-5 space-y-2">
        {t.exercicios.map((e, i) => (
          <li key={`${e.exercicio}-${i}`} className="cartao flex items-center gap-3 p-3.5">
            <span className="titulo w-6 text-center text-2xl text-fraco">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{e.nome}</span>
              <span className="block text-xs text-suave">
                {e.series.length} × {textoReps(e.alvo)}
                {e.series[0]?.carga ? ` · ${kg(e.series[0].carga)}` : ''} · descanso {textoDescanso(e.descanso)}
              </span>
            </span>
            {!t.ficha && (
              <button type="button" className="grid size-9 place-items-center rounded-full text-fraco hover:bg-sup-2 hover:text-perigo" aria-label={`Tirar ${e.nome}`} onClick={() => mudar((x) => ({ ...x, exercicios: x.exercicios.filter((_, j) => j !== i) }))}>
                <PiTrash />
              </button>
            )}
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-sup btn-m mt-3 w-full" onClick={() => setEscolhendo(true)}>
        <PiPlus /> Adicionar exercício
      </button>
      <div className="sticky bottom-4 mt-6 flex gap-2">
        <button type="button" className="btn btn-fantasma btn-g" onClick={aoCancelar}>
          Cancelar
        </button>
        <button type="button" className="btn btn-anilha btn-g flex-1 shadow-xl" disabled={!t.exercicios.length} onClick={comecar}>
          <PiBarbellBold className="text-xl" /> Começar
        </button>
      </div>
      <EscolherExercicio
        aberta={escolhendo}
        aoFechar={() => setEscolhendo(false)}
        escolhidos={t.exercicios.map((e) => e.exercicio)}
        aoEscolher={(id) => {
          mudar((x) => ({ ...x, exercicios: [...x.exercicios, exercicioAoVivo(id, EXERCICIO[id]?.nome ?? 'Exercício', null, ultima.dados?.ultima)] }))
          setEscolhendo(false)
        }}
      />
    </div>
  )
}

// ---------- A aula feita (vira um treino com a modalidade) ----------

function RegistrarAula({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const avisar = useAviso()
  const vinculos = useVinculos()
  const academias = (vinculos.dados ?? []).filter((v) => v.tipo === 'empresa' && v.status === 'ativo' && v.unidade)
  const [modalidade, setModalidade] = useState('')
  const [minutos, setMinutos] = useState(60)
  const [local, setLocal] = useState('')
  const [salvando, setSalvando] = useState(false)
  const opcoes = MODALIDADES.filter((m) => m.id !== 'musculacao')
  const salvar = async () => {
    if (!modalidade) return
    setSalvando(true)
    try {
      const fim = new Date()
      const v = academias.find((a) => `${a.id}:${a.unidade}` === local) ?? (local ? undefined : academias[0])
      const r = await treinos.registrar({ id: novoIdTreino(), modalidade, inicio: new Date(fim.getTime() - minutos * 60_000).toISOString(), fim: fim.toISOString(), exercicios: [], ...(v ? { local: { empresa: v.id, unidade: v.unidade! } } : {}) })
      esquecer('inicio:')
      avisar(`Aula de ${nomeModalidade(modalidade).toLowerCase()} registrada! Sequência: ${r.sequencia} ${r.sequencia === 1 ? 'semana' : 'semanas'}.`)
      aoFechar()
      navegar('/app')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setSalvando(false)
    }
  }
  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo="Fiz uma aula">
      <div className="p-6">
        <h2 className="titulo text-3xl">Fiz uma aula</h2>
        <p className="mt-1 text-sm text-suave">Conta na sua semana, na sequência e nos desafios.</p>
        <p className="rotulo mt-5">Qual?</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Modalidade">
          {opcoes.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={modalidade === m.id} className="chip px-3 py-1.5 text-xs" onClick={() => setModalidade(m.id)}>
              <span className="size-2 rounded-full" style={{ background: familiaDe(m.id).cor }} />
              {m.nome}
            </button>
          ))}
        </div>
        <p className="rotulo mt-5">Quanto tempo?</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Duração">
          {[30, 45, 50, 60, 75, 90, 120].map((m) => (
            <button key={m} type="button" role="radio" aria-checked={minutos === m} className="chip dado" onClick={() => setMinutos(m)}>
              {formatarDuracao(m)}
            </button>
          ))}
        </div>
        {academias.length > 0 && (
          <label className="mt-5 block">
            <span className="rotulo">Onde?</span>
            <select className="campo" value={local || `${academias[0].id}:${academias[0].unidade}`} onChange={(e) => setLocal(e.target.value)}>
              {academias.map((a) => (
                <option key={a.id} value={`${a.id}:${a.unidade}`}>
                  {a.unidadeNome ?? a.nome}
                </option>
              ))}
              <option value="fora">Outro lugar</option>
            </select>
          </label>
        )}
        <button type="button" className="btn btn-anilha btn-m mt-6 w-full" disabled={!modalidade || salvando} onClick={salvar}>
          {salvando ? <Girando /> : 'Registrar a aula'}
        </button>
      </div>
    </Folha>
  )
}
