import { useState, type CSSProperties } from 'react'
import { PiCaretLeft, PiCaretRight, PiCheckBold, PiPlus, PiTrash } from 'react-icons/pi'
import { useAviso } from '../components/ui/Aviso'
import { Avatar, Campo, Carregando, Erro, Folha, Girando, Interruptor, Selo } from '../components/ui/basicos'
import { aulas, mensagemDeErro, painel } from '../lib/api'
import { esquecer, useDados } from '../lib/dados'
import { Link, navegar, useEndereco } from '../lib/rotas'
import { familiaDe, nomeModalidade } from '../shared/modalidades'
import { agoraNoFuso, diaDaSemana, hora, minutos, NOMES_DIAS, NOMES_DIAS_CURTOS, somarDias, textoData } from '../shared/tempo'
import type { Aula } from '../shared/tipos'
import { PODE, usePainel } from './AppPainel'

// A grade de aulas (seção 8 do estudo): a semana de cada unidade, as aulas com vagas, reserva, fila e
// lugar marcado, e a presença de cada aula do dia

const DIAS = [1, 2, 3, 4, 5, 6, 0]

export function Grade() {
  const c = usePainel()
  const e = c.empresa
  const unidades = e.unidades.filter((u) => u.ativa)
  const [unidade, setUnidade] = useState(unidades[0]?.id ?? '')
  const [editando, setEditando] = useState<Partial<Aula> | null>(null)
  const configura = PODE.configurar.includes(c.papel)
  const grade = e.grade.filter((a) => a.unidade === unidade).sort((a, b) => minutos(a.inicio) - minutos(b.inicio))
  const hoje = agoraNoFuso().data
  const diaHoje = diaDaSemana(hoje)
  const nomeProf = (id?: string) => e.equipe.find((m) => m.id === id)?.nome.split(' ')[0]

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="titulo text-4xl">Grade de aulas</h1>
        {configura && (
          <button
            type="button"
            className="btn btn-anilha btn-m"
            disabled={!e.modalidades.length}
            onClick={() => setEditando({ unidade, dias: [1, 3, 5], inicio: '19:00', duracao: 60, vagas: 20, reserva: true, ativa: true })}
          >
            <PiPlus /> Nova aula
          </button>
        )}
      </header>
      {unidades.length > 1 && (
        <div className="sem-barra -mx-4 flex gap-1.5 overflow-x-auto px-4" role="radiogroup" aria-label="Unidade">
          {unidades.map((u) => (
            <button key={u.id} type="button" role="radio" aria-checked={u.id === unidade} className="chip shrink-0" onClick={() => setUnidade(u.id)}>
              {u.nome}
            </button>
          ))}
        </div>
      )}
      {!e.modalidades.length && (
        <p className="cartao p-4 text-sm text-suave">
          Ligue as modalidades da academia antes de montar a grade.{' '}
          <Link para={`/painel/${c.slug}/modalidades`} className="font-semibold text-texto underline">
            Modalidades
          </Link>
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {DIAS.map((dia) => {
          const doDia = grade.filter((a) => a.dias.includes(dia))
          return (
            <section
              key={dia}
              // no celular a semana começa por hoje; na tela grande, de segunda a domingo
              style={{ '--ordem': (DIAS.indexOf(dia) - DIAS.indexOf(diaHoje) + 7) % 7 } as CSSProperties}
              className={`order-(--ordem) rounded-2xl border bg-sup p-3 md:order-none ${dia === diaHoje ? 'border-anilha' : 'border-linha'}`}
              aria-label={NOMES_DIAS[dia]}
            >
              <p className={`mb-2 text-xs font-bold uppercase ${dia === diaHoje ? 'text-anilha-legivel' : 'text-fraco'}`}>
                {NOMES_DIAS[dia]}
                {dia === diaHoje ? ' · hoje' : ''}
              </p>
              {doDia.length === 0 ? (
                <p className="text-xs text-fraco">Sem aulas</p>
              ) : (
                <ul className="space-y-1.5">
                  {doDia.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => (dia === diaHoje && !configura ? navegar(`/painel/${c.slug}/grade/${a.id}`) : configura ? setEditando(a) : navegar(`/painel/${c.slug}/grade/${a.id}?data=${proximaData(dia)}`))}
                        className={`flex w-full items-center gap-2.5 rounded-xl bg-sup-2 px-2.5 py-2 text-left text-xs hover:bg-sup-3 ${a.ativa ? '' : 'opacity-50'}`}
                      >
                        <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: familiaDe(a.modalidade).cor }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold">
                            {a.inicio} · {nomeModalidade(a.modalidade)}
                          </span>
                          <span className="block truncate text-suave">
                            {a.duracao} min
                            {nomeProf(a.professor) ? ` · ${nomeProf(a.professor)}` : ''}
                            {a.vagas ? ` · ${a.vagas} vagas` : ' · livre'}
                            {a.lugares ? ' · lugar marcado' : ''}
                          </span>
                        </span>
                      </button>
                      {dia === diaHoje && a.ativa && (
                        <Link para={`/painel/${c.slug}/grade/${a.id}`} className="mt-0.5 block px-2.5 text-[0.7rem] font-semibold text-anilha-legivel hover:underline">
                          Presença de hoje →
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
      {configura && <EditarAula atual={editando} aoFechar={() => setEditando(null)} />}
    </div>
  )
}

// O próximo dia da semana `dia` a partir de hoje
function proximaData(dia: number) {
  const hoje = agoraNoFuso().data
  for (let i = 0; i < 7; i++) if (diaDaSemana(somarDias(hoje, i)) === dia) return somarDias(hoje, i)
  return hoje
}

function EditarAula({ atual, aoFechar }: { atual: Partial<Aula> | null; aoFechar: () => void }) {
  const c = usePainel()
  const avisar = useAviso()
  const e = c.empresa
  const [a, setA] = useState<Partial<Aula> & { lugarMarcado?: boolean }>({})
  const [ultimo, setUltimo] = useState<Partial<Aula> | null>(null)
  const [salvando, setSalvando] = useState(false)
  if (atual !== ultimo) {
    setUltimo(atual)
    setA(atual ? { ...atual, lugarMarcado: !!atual.lugares } : {})
  }
  const modalidade = e.modalidades.find((m) => m.id === a.modalidade)
  const salvar = async () => {
    setSalvando(true)
    try {
      const r = await painel.salvarAula(c.slug, a)
      c.mudar(r.empresa)
      esquecer(`dia:${c.slug}`)
      esquecer(`pagina:${c.slug}`)
      avisar('Aula salva. A grade da página já mudou.')
      aoFechar()
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setSalvando(false)
    }
  }
  const remover = async () => {
    if (!a.id || !confirm('Tirar esta aula da grade? As reservas já feitas somem.')) return
    try {
      c.mudar((await painel.removerAula(c.slug, a.id)).empresa)
      aoFechar()
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    }
  }
  return (
    <Folha aberta={!!atual} aoFechar={aoFechar} titulo={a.id ? 'Editar aula' : 'Nova aula'} largura="max-w-xl">
      <div className="space-y-4 p-6">
        <h2 className="titulo text-3xl">{a.id ? 'Editar aula' : 'Nova aula'}</h2>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Modalidade" className="col-span-2">
            <select className="campo" value={a.modalidade ?? ''} onChange={(ev) => setA((x) => ({ ...x, modalidade: ev.target.value }))}>
              <option value="">Escolha</option>
              {e.modalidades.map((m) => (
                <option key={m.id} value={m.id}>
                  {nomeModalidade(m.id)}
                </option>
              ))}
            </select>
          </Campo>
          {e.unidades.filter((u) => u.ativa).length > 1 && (
            <Campo rotulo="Unidade" className="col-span-2">
              <select className="campo" value={a.unidade ?? ''} onChange={(ev) => setA((x) => ({ ...x, unidade: ev.target.value }))}>
                {e.unidades
                  .filter((u) => u.ativa)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
              </select>
            </Campo>
          )}
          <div className="col-span-2">
            <p className="rotulo">Dias</p>
            <div className="flex flex-wrap gap-1.5">
              {DIAS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className="chip"
                  aria-pressed={!!a.dias?.includes(d)}
                  onClick={() => setA((x) => ({ ...x, dias: x.dias?.includes(d) ? x.dias.filter((y) => y !== d) : [...(x.dias ?? []), d].sort() }))}
                >
                  {NOMES_DIAS_CURTOS[d]}
                </button>
              ))}
            </div>
          </div>
          <Campo rotulo="Começa">
            <input className="campo" type="time" step={300} value={a.inicio ?? ''} onChange={(ev) => setA((x) => ({ ...x, inicio: ev.target.value }))} />
          </Campo>
          <Campo rotulo="Duração (min)" dica={a.inicio && a.duracao ? `até ${hora(minutos(a.inicio) + a.duracao)}` : undefined}>
            <input className="campo" type="number" min={15} max={240} step={5} value={a.duracao ?? 60} onChange={(ev) => setA((x) => ({ ...x, duracao: Number(ev.target.value) }))} />
          </Campo>
          <Campo rotulo="Professor">
            <select className="campo" value={a.professor ?? ''} onChange={(ev) => setA((x) => ({ ...x, professor: ev.target.value || undefined }))}>
              <option value="">A definir</option>
              {e.equipe
                .filter((m) => m.papel !== 'recepcao')
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
            </select>
          </Campo>
          <Campo rotulo="Sala (opcional)">
            <input className="campo" maxLength={30} value={a.sala ?? ''} onChange={(ev) => setA((x) => ({ ...x, sala: ev.target.value || undefined }))} placeholder="Sala 2, tatame..." />
          </Campo>
          <Campo rotulo="Vagas" dica="0 = sem limite (não tem reserva)">
            <input className="campo" type="number" min={0} max={500} value={a.vagas ?? 0} onChange={(ev) => setA((x) => ({ ...x, vagas: Number(ev.target.value) }))} />
          </Campo>
          <Campo rotulo="Nível (opcional)">
            <select className="campo" value={a.nivel ?? ''} onChange={(ev) => setA((x) => ({ ...x, nivel: ev.target.value || undefined }))}>
              <option value="">Todos</option>
              {(modalidade?.niveis.length ? modalidade.niveis : ['Iniciante', 'Intermediário', 'Avançado']).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Público (opcional)" className="col-span-2">
            <select className="campo" value={a.publico ?? ''} onChange={(ev) => setA((x) => ({ ...x, publico: ev.target.value || undefined }))}>
              <option value="">Todos</option>
              {(modalidade?.publicos.length ? modalidade.publicos : ['Kids', 'Juvenil', 'Adulto', 'Feminino', '60+']).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Campo>
        </div>
        <Interruptor
          ligado={!!a.reserva}
          desativado={!a.vagas}
          aoMudar={(v) => setA((x) => ({ ...x, reserva: v }))}
          rotulo="Reserva pelo app"
          descricao="O aluno reserva a vaga (abre 7 dias antes); lotou, entra na fila"
        />
        <Interruptor
          ligado={!!a.lugarMarcado}
          desativado={!a.vagas || !a.reserva}
          aoMudar={(v) => setA((x) => ({ ...x, lugarMarcado: v, lugares: v ? x.lugares || x.vagas : undefined }))}
          rotulo="Lugar marcado"
          descricao="Para a bike, o aparelho de pilates: o aluno escolhe o número"
        />
        {a.lugarMarcado && (
          <Campo rotulo="Quantos lugares">
            <input className="campo" type="number" min={1} max={60} value={a.lugares ?? a.vagas ?? 1} onChange={(ev) => setA((x) => ({ ...x, lugares: Number(ev.target.value) }))} />
          </Campo>
        )}
        <Interruptor ligado={a.ativa !== false} aoMudar={(v) => setA((x) => ({ ...x, ativa: v }))} rotulo="Aula ativa" descricao="Desligada, some da grade sem perder a configuração" />
        <div className="flex gap-2">
          <button type="button" className="btn btn-anilha btn-m flex-1" disabled={salvando || !a.modalidade || !a.dias?.length || !a.inicio} onClick={salvar}>
            {salvando ? <Girando /> : 'Salvar a aula'}
          </button>
          {a.id && (
            <button type="button" className="btn btn-fantasma btn-m text-perigo" onClick={remover} aria-label="Tirar a aula">
              <PiTrash />
            </button>
          )}
        </div>
      </div>
    </Folha>
  )
}

// A aula de um dia: quem reservou (com o lugar), a fila e a presença
export function AulaDoDia({ id }: { id: string }) {
  const c = usePainel()
  const avisar = useAviso()
  const { busca } = useEndereco()
  const [data, setData] = useState(busca.get('data') ?? agoraNoFuso().data)
  const d = useDados(`painel-aula:${c.slug}:${id}:${data}`, () => painel.aula(c.slug, id, data))
  const [marcados, setMarcados] = useState<Set<string> | null>(null)
  const [salvando, setSalvando] = useState(false)
  const x = d.dados
  const presentes = marcados ?? new Set(x?.presentes ?? [])
  const salvar = async () => {
    if (!x) return
    setSalvando(true)
    try {
      await aulas.presenca(c.slug, id, data, [...presentes])
      setMarcados(null)
      await d.recarregar()
      avisar('Presença salva. Conta nos desafios e na frequência dos alunos.')
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setSalvando(false)
    }
  }
  const ir = (n: number) => {
    setMarcados(null)
    setData((v) => somarDias(v, n))
  }
  if (!x) return d.erro ? <Erro mensagem={mensagemDeErro(d.erro)} aoTentar={d.recarregar} /> : <Carregando />
  const a = x.aula
  const unidade = c.empresa.unidades.find((u) => u.id === a.unidade)
  const professor = c.empresa.equipe.find((m) => m.id === a.professor)
  const acontece = a.dias.includes(diaDaSemana(data))
  return (
    <div className="space-y-5">
      <Link para={`/painel/${c.slug}/grade`} className="text-sm font-semibold text-suave hover:text-texto">
        ← Grade
      </Link>
      <header>
        <p className="flex items-center gap-2 text-xs text-fraco">
          <span className="size-2 rounded-full" style={{ background: familiaDe(a.modalidade).cor }} /> {unidade?.nome}
          {a.sala ? ` · ${a.sala}` : ''}
          {professor ? ` · ${professor.nome}` : ''}
        </p>
        <h1 className="titulo mt-1 text-4xl">
          {a.inicio} · {nomeModalidade(a.modalidade)}
        </h1>
      </header>
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-sup btn-p" onClick={() => ir(-1)} aria-label="Dia anterior">
          <PiCaretLeft />
        </button>
        <p className="min-w-0 flex-1 text-center text-sm font-semibold capitalize">{textoData(data)}</p>
        <button type="button" className="btn btn-sup btn-p" onClick={() => ir(1)} aria-label="Próximo dia">
          <PiCaretRight />
        </button>
      </div>
      {!acontece ? (
        <p className="cartao p-4 text-sm text-suave">Esta aula não acontece neste dia da semana.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="cartao p-3.5">
              <p className="text-2xl font-bold">
                {x.reservas.length}
                {a.vagas ? <span className="text-base text-fraco">/{a.vagas}</span> : null}
              </p>
              <p className="text-xs text-suave">reservas</p>
            </div>
            <div className="cartao p-3.5">
              <p className="text-2xl font-bold">{x.espera.length}</p>
              <p className="text-xs text-suave">na fila</p>
            </div>
            <div className="cartao p-3.5">
              <p className="text-2xl font-bold">{presentes.size}</p>
              <p className="text-xs text-suave">presentes</p>
            </div>
          </div>
          <section aria-labelledby="presenca">
            <h2 id="presenca" className="mb-2 font-bold">
              Presença
            </h2>
            {x.reservas.length === 0 ? (
              <p className="text-sm text-suave">{a.reserva ? 'Ninguém reservou ainda.' : 'Aula sem reserva: o aluno marca "Cheguei" no app quando chega.'}</p>
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-linha bg-sup">
                {[...x.reservas]
                  .sort((p, q) => (p.lugar ?? 999) - (q.lugar ?? 999) || p.nome.localeCompare(q.nome))
                  .map((r) => {
                    const esta = presentes.has(r.conta)
                    return (
                      <li key={r.conta} className="border-t border-linha first:border-t-0">
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-sup-2"
                          aria-pressed={esta}
                          onClick={() =>
                            setMarcados(() => {
                              const n = new Set(presentes)
                              if (n.has(r.conta)) n.delete(r.conta)
                              else n.add(r.conta)
                              return n
                            })
                          }
                        >
                          {r.lugar ? <span className="dado grid size-9 shrink-0 place-items-center rounded-lg bg-sup-3 text-sm font-bold">{r.lugar}</span> : <Avatar nome={r.nome} tamanho={36} />}
                          <span className="min-w-0 flex-1 truncate font-semibold">{r.nome}</span>
                          <span className={`grid size-8 place-items-center rounded-lg ${esta ? 'bg-anilha text-anilha-texto' : 'border-2 border-linha-2 text-transparent'}`}>
                            <PiCheckBold />
                          </span>
                        </button>
                      </li>
                    )
                  })}
              </ul>
            )}
            {marcados && (
              <button type="button" className="btn btn-anilha btn-m mt-3 w-full" disabled={salvando} onClick={salvar}>
                {salvando ? <Girando /> : 'Salvar a presença'}
              </button>
            )}
          </section>
          {x.espera.length > 0 && (
            <section aria-labelledby="fila">
              <h2 id="fila" className="mb-2 font-bold">
                Fila de espera
              </h2>
              <ol className="space-y-1 text-sm">
                {x.espera.map((r, i) => (
                  <li key={r.conta} className="flex items-center gap-2">
                    <Selo>{i + 1}º</Selo> {r.nome}
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-xs text-fraco">Se alguém cancelar, o primeiro da fila entra sozinho e recebe o aviso.</p>
            </section>
          )}
        </>
      )}
    </div>
  )
}
