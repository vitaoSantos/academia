import { useMemo, useState } from 'react'
import { PiCaretLeft, PiCaretRight, PiGear, PiPlus, PiRepeat, PiTrash, PiX } from 'react-icons/pi'
import { AppPro } from '../components/layout/AppPro'
import { useAviso } from '../components/ui/Aviso'
import { Campo, Carregando, Erro, Folha, Girando, Interruptor, Selo } from '../components/ui/basicos'
import { agenda, mensagemDeErro, pro } from '../lib/api'
import { esquecer, useDados } from '../lib/dados'
import { useSessao } from '../lib/sessao'
import { useTitulo } from '../lib/titulo'
import { agoraNoFuso, diaDaSemana, inicioDaSemana, NOMES_DIAS, NOMES_DIAS_CURTOS, somarDias, textoData } from '../shared/tempo'
import type { ConfigAgenda, Janela, Sessao } from '../shared/tipos'

// A agenda do profissional (seção 13 do estudo): a semana com as sessões, marcar para um aluno, as
// sessões fixas (seg/qua/sex 7h) e os horários livres de cada dia, onde o aluno marca sozinho

const STATUS: Record<Sessao['status'], { nome: string; tom: 'ok' | 'perigo' | 'neutro' | 'marca' }> = {
  marcada: { nome: 'Marcada', tom: 'marca' },
  feita: { nome: 'Feita', tom: 'ok' },
  faltou: { nome: 'Faltou', tom: 'perigo' },
  cancelada: { nome: 'Desmarcada', tom: 'neutro' },
}

export default function Agenda() {
  useTitulo('Agenda')
  const s = useSessao()
  const avisar = useAviso()
  const p = s.profissional
  const [de, setDe] = useState(() => inicioDaSemana(agoraNoFuso().data))
  const semana = useDados(p ? `pro-agenda:${p.id}:${de}` : null, () => agenda.semana(de))
  const [marcando, setMarcando] = useState(false)
  const [fixando, setFixando] = useState(false)
  const [configurando, setConfigurando] = useState(false)
  const hoje = agoraNoFuso().data
  const d = semana.dados

  const mudar = async (x: Sessao, status: 'feita' | 'faltou' | 'cancelada') => {
    try {
      await agenda.mudar({ pro: p!.id, id: x.id, data: x.data, status })
      esquecer('pro-')
      await semana.recarregar()
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    }
  }

  return (
    <AppPro
      titulo="Agenda"
      acoes={
        <>
          <button type="button" className="btn btn-anilha btn-m" onClick={() => setMarcando(true)}>
            <PiPlus /> Marcar
          </button>
          <button type="button" className="btn btn-sup btn-m" onClick={() => setFixando(true)}>
            <PiRepeat /> Fixa
          </button>
          <button type="button" className="btn btn-sup btn-m" onClick={() => setConfigurando(true)} aria-label="Horários e regras">
            <PiGear />
          </button>
        </>
      }
    >
      {!d ? (
        semana.erro ? <Erro mensagem={mensagemDeErro(semana.erro)} aoTentar={semana.recarregar} /> : <Carregando />
      ) : (
        <div className="space-y-6">
          {!d.agenda.ativa && (
            <div className="cartao flex flex-wrap items-center gap-3 border-alerta p-4">
              <p className="min-w-0 flex-1 text-sm">
                <span className="font-bold">A agenda está desligada.</span>
                <span className="block text-xs text-suave">{p?.personal ? 'Abra os seus horários para os alunos marcarem sozinhos.' : 'Abra os seus horários para os alunos das academias que liberam a agenda dos professores.'}</span>
              </p>
              <button type="button" className="btn btn-sup btn-p" onClick={() => setConfigurando(true)}>
                Abrir os horários
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-sup btn-p" onClick={() => setDe((x) => somarDias(x, -7))} aria-label="Semana anterior">
              <PiCaretLeft />
            </button>
            <p className="min-w-0 flex-1 text-center text-sm font-semibold">
              {textoData(de)} a {textoData(somarDias(de, 6))}
            </p>
            <button type="button" className="btn btn-sup btn-p" onClick={() => setDe((x) => somarDias(x, 7))} aria-label="Próxima semana">
              <PiCaretRight />
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-7">
            {d.dias.map((dia) => (
              <section key={dia.data} aria-label={textoData(dia.data)} className={`rounded-2xl border p-3 ${dia.data === hoje ? 'border-anilha' : 'border-linha'} bg-sup`}>
                <p className={`mb-2 text-xs font-bold uppercase ${dia.data === hoje ? 'text-anilha-legivel' : 'text-fraco'}`}>
                  {NOMES_DIAS_CURTOS[diaDaSemana(dia.data)]} {Number(dia.data.slice(8))}
                </p>
                {dia.sessoes.length === 0 ? (
                  <p className="text-xs text-fraco">–</p>
                ) : (
                  <ul className="space-y-1.5">
                    {dia.sessoes.map((x) => (
                      <li key={x.id} className={`rounded-xl px-2.5 py-2 text-xs ${x.status === 'cancelada' ? 'bg-sup-2 opacity-60' : 'bg-sup-2'}`}>
                        <p className="dado font-bold">
                          {x.inicio}
                          {x.fixa && <PiRepeat className="ml-1 inline text-fraco" title="Fixa" />}
                        </p>
                        <p className="truncate font-semibold">{x.alunoNome}</p>
                        {x.local && <p className="truncate text-fraco">{x.local}</p>}
                        {x.status === 'marcada' ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {dia.data <= hoje && (
                              <>
                                <button type="button" className="rounded-lg bg-ok/15 px-2 py-0.5 font-semibold text-ok" onClick={() => mudar(x, 'feita')}>
                                  Feita
                                </button>
                                <button type="button" className="rounded-lg bg-perigo/15 px-2 py-0.5 font-semibold text-perigo" onClick={() => mudar(x, 'faltou')}>
                                  Faltou
                                </button>
                              </>
                            )}
                            <button type="button" className="rounded-lg px-2 py-0.5 text-suave hover:text-texto" onClick={() => confirm(`Desmarcar ${x.alunoNome} às ${x.inicio}? O aluno é avisado.`) && mudar(x, 'cancelada')} aria-label="Desmarcar">
                              <PiX />
                            </button>
                          </div>
                        ) : (
                          <Selo tom={STATUS[x.status].tom} className="mt-1">
                            {STATUS[x.status].nome}
                          </Selo>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <section aria-labelledby="fixas">
            <h2 id="fixas" className="mb-2 font-bold">
              Sessões fixas
            </h2>
            {d.fixas.length === 0 ? (
              <p className="text-sm text-suave">Nenhuma. O aluno que vem sempre no mesmo horário ganha a sessão fixa: ela entra na agenda toda semana.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {d.fixas.map((f) => (
                  <li key={f.id} className="cartao flex items-center gap-3 p-3.5">
                    <PiRepeat className="shrink-0 text-xl text-anilha-legivel" />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block truncate font-semibold">{f.alunoNome}</span>
                      <span className="block truncate text-xs text-suave">
                        {f.dias.map((x) => NOMES_DIAS_CURTOS[x]).join(', ')} · {f.inicio}
                        {f.local ? ` · ${f.local}` : ''}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="grid size-9 place-items-center rounded-full text-fraco hover:text-perigo"
                      aria-label="Tirar a fixa"
                      onClick={async () => {
                        if (!confirm(`Tirar a sessão fixa de ${f.alunoNome}?`)) return
                        try {
                          await agenda.apagarFixa(f.id)
                          await semana.recarregar()
                        } catch (e) {
                          avisar(mensagemDeErro(e), 'erro')
                        }
                      }}
                    >
                      <PiTrash />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {p && d && (
        <>
          <MarcarParaAluno aberta={marcando} aoFechar={() => setMarcando(false)} config={d.agenda} aoMarcar={() => void semana.recarregar()} />
          <NovaFixa aberta={fixando} aoFechar={() => setFixando(false)} config={d.agenda} aoCriar={() => void semana.recarregar()} />
          <Configurar
            aberta={configurando}
            aoFechar={() => setConfigurando(false)}
            config={d.agenda}
            aoSalvar={(a) => {
              semana.definir((x) => (x ? { ...x, agenda: a } : x!))
              void s.atualizar()
            }}
          />
        </>
      )}
    </AppPro>
  )
}

// Os alunos que podem ter sessão: os de personal (e os da academia, quando ela libera a agenda)
function useAlunosDaAgenda() {
  const s = useSessao()
  const lista = useDados(s.profissional ? `pro-alunos:${s.profissional.id}` : null, () => pro.alunos())
  return useMemo(() => {
    const d = lista.dados
    if (!d) return []
    const todos = [...d.personal, ...d.academias.flatMap((a) => a.alunos)].filter((a) => a.status === 'ativo')
    return todos.filter((a, i) => todos.findIndex((b) => b.id === a.id) === i).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [lista.dados])
}

function MarcarParaAluno({ aberta, aoFechar, config, aoMarcar }: { aberta: boolean; aoFechar: () => void; config: ConfigAgenda; aoMarcar: () => void }) {
  const s = useSessao()
  const avisar = useAviso()
  const alunos = useAlunosDaAgenda()
  const [aluno, setAluno] = useState('')
  const [data, setData] = useState(agoraNoFuso().data)
  const [inicio, setInicio] = useState('07:00')
  const [local, setLocal] = useState('')
  const [marcando, setMarcando] = useState(false)
  const marcar = async () => {
    setMarcando(true)
    try {
      await agenda.marcar({ pro: s.profissional!.id, aluno, data, inicio, local: local || config.locais[0] })
      esquecer('pro-')
      avisar('Sessão marcada. O aluno foi avisado.')
      aoMarcar()
      aoFechar()
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setMarcando(false)
    }
  }
  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo="Marcar sessão">
      <div className="space-y-4 p-6">
        <h2 className="titulo text-3xl">Marcar sessão</h2>
        <Campo rotulo="Aluno">
          <select className="campo" value={aluno} onChange={(e) => setAluno(e.target.value)}>
            <option value="">Escolha</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Dia">
            <input className="campo" type="date" min={agoraNoFuso().data} value={data} onChange={(e) => setData(e.target.value)} />
          </Campo>
          <Campo rotulo="Horário" dica={`Sessão de ${config.duracao} min`}>
            <input className="campo" type="time" step={300} value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </Campo>
        </div>
        {config.locais.length > 1 && (
          <Campo rotulo="Onde">
            <select className="campo" value={local || config.locais[0]} onChange={(e) => setLocal(e.target.value)}>
              {config.locais.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Campo>
        )}
        <button type="button" className="btn btn-anilha btn-m w-full" disabled={!aluno || marcando} onClick={marcar}>
          {marcando ? <Girando /> : 'Marcar e avisar'}
        </button>
      </div>
    </Folha>
  )
}

function NovaFixa({ aberta, aoFechar, config, aoCriar }: { aberta: boolean; aoFechar: () => void; config: ConfigAgenda; aoCriar: () => void }) {
  const avisar = useAviso()
  const s = useSessao()
  const lista = useDados(s.profissional ? `pro-alunos:${s.profissional.id}` : null, () => pro.alunos())
  const alunos = (lista.dados?.personal ?? []).filter((a) => a.status === 'ativo')
  const [aluno, setAluno] = useState('')
  const [dias, setDias] = useState<number[]>([1, 3, 5])
  const [inicio, setInicio] = useState('07:00')
  const [local, setLocal] = useState('')
  const [criando, setCriando] = useState(false)
  const criar = async () => {
    setCriando(true)
    try {
      await agenda.fixa({ aluno, dias, inicio, local: local || config.locais[0] })
      avisar('Sessão fixa criada. Entra na agenda toda semana.')
      aoCriar()
      aoFechar()
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setCriando(false)
    }
  }
  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo="Sessão fixa">
      <div className="space-y-4 p-6">
        <h2 className="titulo text-3xl">Sessão fixa</h2>
        <p className="text-sm text-suave">Para o aluno de personal que vem sempre nos mesmos dias e horário.</p>
        <Campo rotulo="Aluno">
          <select className="campo" value={aluno} onChange={(e) => setAluno(e.target.value)}>
            <option value="">Escolha</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </Campo>
        <div>
          <p className="rotulo">Dias</p>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 0].map((dia) => (
              <button key={dia} type="button" className="chip" aria-pressed={dias.includes(dia)} onClick={() => setDias((l) => (l.includes(dia) ? l.filter((x) => x !== dia) : [...l, dia].sort()))}>
                {NOMES_DIAS_CURTOS[dia]}
              </button>
            ))}
          </div>
        </div>
        <Campo rotulo="Horário">
          <input className="campo" type="time" step={300} value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </Campo>
        {config.locais.length > 1 && (
          <Campo rotulo="Onde">
            <select className="campo" value={local || config.locais[0]} onChange={(e) => setLocal(e.target.value)}>
              {config.locais.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Campo>
        )}
        <button type="button" className="btn btn-anilha btn-m w-full" disabled={!aluno || !dias.length || criando} onClick={criar}>
          {criando ? <Girando /> : 'Criar a fixa'}
        </button>
      </div>
    </Folha>
  )
}

function Configurar({ aberta, aoFechar, config, aoSalvar }: { aberta: boolean; aoFechar: () => void; config: ConfigAgenda; aoSalvar: (a: ConfigAgenda) => void }) {
  const avisar = useAviso()
  const [a, setA] = useState<ConfigAgenda>(config)
  const [novoLocal, setNovoLocal] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [ultimo, setUltimo] = useState(config)
  if (config !== ultimo) {
    setUltimo(config)
    setA(config)
  }
  const janelasDo = (dia: number) => a.janelas.filter((j) => j.dia === dia)
  const mudarJanela = (alvo: Janela, nova: Partial<Janela>) => setA((x) => ({ ...x, janelas: x.janelas.map((j) => (j === alvo ? { ...j, ...nova } : j)) }))
  const salvar = async () => {
    setSalvando(true)
    try {
      const r = await agenda.config(a)
      aoSalvar(r.agenda)
      avisar('Agenda salva.')
      aoFechar()
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setSalvando(false)
    }
  }
  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo="Horários e regras" largura="max-w-2xl">
      <div className="space-y-5 p-6">
        <h2 className="titulo text-3xl">Horários e regras</h2>
        <Interruptor ligado={a.ativa} aoMudar={(v) => setA((x) => ({ ...x, ativa: v }))} rotulo="Agenda aberta" descricao="Desligada, ninguém marca e os horários somem da página" />
        <Interruptor ligado={a.alunoMarca} aoMudar={(v) => setA((x) => ({ ...x, alunoMarca: v }))} rotulo="O aluno marca sozinho" descricao="Nos horários livres; desligado, você marca para ele" />
        <div className="grid grid-cols-3 gap-3">
          <Campo rotulo="Sessão">
            <select className="campo" value={a.duracao} onChange={(e) => setA((x) => ({ ...x, duracao: Number(e.target.value) }))}>
              {[30, 45, 50, 60, 75, 90].map((n) => (
                <option key={n} value={n}>
                  {n} min
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Marcar com" dica="de antecedência">
            <select className="campo" value={a.antecedencia} onChange={(e) => setA((x) => ({ ...x, antecedencia: Number(e.target.value) }))}>
              {[0, 1, 2, 3, 6, 12, 24, 48].map((n) => (
                <option key={n} value={n}>
                  {n ? `${n} h` : 'na hora'}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Desmarcar até" dica="antes da sessão">
            <select className="campo" value={a.cancelarAte} onChange={(e) => setA((x) => ({ ...x, cancelarAte: Number(e.target.value) }))}>
              {[0, 2, 4, 6, 12, 24, 48].map((n) => (
                <option key={n} value={n}>
                  {n ? `${n} h` : 'a qualquer hora'}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div>
          <p className="rotulo">Horários livres de cada dia</p>
          <ul className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 0].map((dia) => (
              <li key={dia} className="flex flex-wrap items-center gap-2 rounded-2xl border border-linha p-2.5">
                <span className="w-16 shrink-0 text-sm font-semibold capitalize">{NOMES_DIAS[dia].slice(0, 3)}</span>
                {janelasDo(dia).map((j, i) => (
                  <span key={i} className="flex items-center gap-1 rounded-xl bg-sup-2 px-2 py-1">
                    <input className="dado w-[4.6rem] bg-transparent text-sm outline-none" type="time" step={900} value={j.inicio} onChange={(e) => mudarJanela(j, { inicio: e.target.value })} aria-label={`Começo, ${NOMES_DIAS[dia]}`} />
                    <span className="text-fraco">–</span>
                    <input className="dado w-[4.6rem] bg-transparent text-sm outline-none" type="time" step={900} value={j.fim} onChange={(e) => mudarJanela(j, { fim: e.target.value })} aria-label={`Fim, ${NOMES_DIAS[dia]}`} />
                    <button type="button" className="text-fraco hover:text-perigo" aria-label="Tirar o horário" onClick={() => setA((x) => ({ ...x, janelas: x.janelas.filter((y) => y !== j) }))}>
                      <PiX />
                    </button>
                  </span>
                ))}
                <button type="button" className="chip px-2.5 py-1 text-xs" onClick={() => setA((x) => ({ ...x, janelas: [...x.janelas, { dia, inicio: janelasDo(dia).length ? '17:00' : '07:00', fim: janelasDo(dia).length ? '21:00' : '11:00' }] }))}>
                  <PiPlus /> horário
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="rotulo">Onde as sessões acontecem</p>
          <div className="flex flex-wrap gap-1.5">
            {a.locais.map((l) => (
              <span key={l} className="chip">
                {l}
                <button type="button" aria-label={`Tirar ${l}`} onClick={() => setA((x) => ({ ...x, locais: x.locais.filter((y) => y !== l) }))}>
                  <PiX />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input className="campo" maxLength={40} value={novoLocal} onChange={(e) => setNovoLocal(e.target.value)} placeholder="Força Total · Centro, Domicílio, Parque..." />
            <button
              type="button"
              className="btn btn-sup btn-m shrink-0"
              disabled={!novoLocal.trim()}
              onClick={() => {
                setA((x) => ({ ...x, locais: [...new Set([...x.locais, novoLocal.trim()])].slice(0, 8) }))
                setNovoLocal('')
              }}
            >
              Pôr
            </button>
          </div>
        </div>

        <button type="button" className="btn btn-anilha btn-m w-full" disabled={salvando} onClick={salvar}>
          {salvando ? <Girando /> : 'Salvar a agenda'}
        </button>
      </div>
    </Folha>
  )
}
