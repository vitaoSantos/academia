import { useState, type ReactNode } from 'react'
import { PiArrowDown, PiArrowUp, PiCaretDown, PiCopy, PiCube, PiPlus, PiTrash } from 'react-icons/pi'
import { EXERCICIO, GRUPOS } from '../../shared/exercicios'
import { duracaoEstimada, LETRAS, MAX_DIVISOES, MAX_ITENS, OBJETIVOS, previsaoPadrao, REPS, TECNICAS, textoReps } from '../../shared/ficha'
import { diasEntre, hoje, NOMES_DIAS_CURTOS, somarDias } from '../../shared/tempo'
import { kg } from '../../shared/texto'
import type { Divisao, ExercicioProprio, ItemFicha, Tecnica } from '../../shared/tipos'
import { useAviso } from '../ui/Aviso'
import { Campo, Girando, Interruptor } from '../ui/basicos'
import { CampoNumero } from '../ui/CampoNumero'
import { EscolherExercicio } from './EscolherExercicio'
import { nomeDoItem, textoDescanso } from './ListaDaDivisao'
import { FolhaExercicio } from './VerExercicio'

// O montador da ficha (seção 9 do estudo): o cabeçalho (o nome, o objetivo, o começo e a data de
// previsão da troca), as divisões (A, B, C... com os dias) e os exercícios do catálogo em 3D com as
// séries, as repetições, a carga, o descanso, a técnica e o recado. Serve à ficha do aluno, à do
// profissional e ao modelo.

export type FichaEmMontagem = { titulo: string; objetivo?: string; inicio: string; previsao: string; online?: boolean; obs?: string; divisoes: Divisao[] }

const idNovo = () => Math.random().toString(36).slice(2, 10)
const DESCANSOS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240]

export const fichaVazia = (): FichaEmMontagem => ({ titulo: '', inicio: hoje(), previsao: previsaoPadrao(hoje()), divisoes: [{ id: idNovo(), nome: 'Treino A', itens: [] }] })

export function itemDoCatalogo(exercicio: string): ItemFicha {
  const ex = EXERCICIO[exercicio]
  return { id: idNovo(), exercicio, series: ex?.series ?? 3, reps: ex?.reps ?? '10-12', descanso: ex?.descanso ?? 60 }
}

export function Montador({
  inicial,
  proprios = [],
  limiteDivisoes = MAX_DIVISOES,
  datas = true,
  online = false,
  rascunho = false,
  textoSalvar = 'Salvar',
  topo,
  aoSalvar,
}: {
  inicial: FichaEmMontagem
  proprios?: ExercicioProprio[]
  limiteDivisoes?: number
  datas?: boolean // a ficha do aluno tem as datas; o modelo, não
  online?: boolean // o profissional marca o atendimento online (a previsão vira 30 dias)
  rascunho?: boolean // o profissional pode guardar sem publicar
  textoSalvar?: string
  topo?: ReactNode
  aoSalvar: (f: FichaEmMontagem, publicar: boolean) => Promise<void>
}) {
  const avisar = useAviso()
  const [f, setF] = useState<FichaEmMontagem>(inicial)
  const [aba, setAba] = useState<string | undefined>(inicial.divisoes[0]?.id)
  const [escolhendo, setEscolhendo] = useState(false)
  const [aberto, setAberto] = useState<string | null>(null)
  const [vendo, setVendo] = useState<string | null>(null)
  const [salvando, setSalvando] = useState<'rascunho' | 'publicar' | null>(null)
  const div = f.divisoes.find((d) => d.id === aba) ?? f.divisoes[0]

  const mudarDiv = (id: string, m: (d: Divisao) => Divisao) => setF((x) => ({ ...x, divisoes: x.divisoes.map((d) => (d.id === id ? m(d) : d)) }))
  const mudarItem = (itemId: string, m: Partial<ItemFicha>) => div && mudarDiv(div.id, (d) => ({ ...d, itens: d.itens.map((it) => (it.id === itemId ? { ...it, ...m } : it)) }))
  const mover = (i: number, para: number) =>
    div &&
    mudarDiv(div.id, (d) => {
      if (para < 0 || para >= d.itens.length) return d
      const itens = [...d.itens]
      const [it] = itens.splice(i, 1)
      itens.splice(para, 0, it)
      return { ...d, itens }
    })

  const novaDivisao = () => {
    if (f.divisoes.length >= limiteDivisoes) return avisar(limiteDivisoes < MAX_DIVISOES ? `No plano grátis a ficha tem até ${limiteDivisoes} divisões. Com o Turma+, até ${MAX_DIVISOES}.` : `A ficha tem até ${MAX_DIVISOES} divisões.`, 'erro')
    const d: Divisao = { id: idNovo(), nome: `Treino ${LETRAS[f.divisoes.length]}`, itens: [] }
    setF((x) => ({ ...x, divisoes: [...x.divisoes, d] }))
    setAba(d.id)
  }

  const salvar = async (publicar: boolean) => {
    if (!f.titulo.trim()) return avisar('Dê um nome para a ficha.', 'erro')
    if (f.divisoes.every((d) => !d.itens.length)) return avisar('Coloque pelo menos um exercício.', 'erro')
    const reps = f.divisoes.flatMap((d) => d.itens).find((it) => !REPS.test(it.reps.trim()))
    if (reps) return avisar(`As repetições de "${nomeDoItem(reps.exercicio, proprios)}" ficam assim: 12, 8-12, 40s ou 20min.`, 'erro')
    setSalvando(publicar ? 'publicar' : 'rascunho')
    try {
      await aoSalvar({ ...f, divisoes: f.divisoes.filter((d) => d.itens.length) }, publicar)
    } finally {
      setSalvando(null)
    }
  }

  const semanas = Math.round(diasEntre(f.inicio, f.previsao) / 7)

  return (
    <div className="space-y-5 pb-28">
      {topo}
      {/* o cabeçalho */}
      <section className="cartao space-y-4 p-5" aria-label="A ficha">
        <Campo rotulo="Nome da ficha">
          <input className="campo" maxLength={60} value={f.titulo} onChange={(e) => setF((x) => ({ ...x, titulo: e.target.value }))} placeholder="Hipertrofia, fase 1" />
        </Campo>
        <div>
          <p className="rotulo">Objetivo</p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Objetivo">
            {OBJETIVOS.map((o) => (
              <button key={o} type="button" role="radio" aria-checked={f.objetivo === o} className="chip px-3 py-1.5 text-xs" onClick={() => setF((x) => ({ ...x, objetivo: x.objetivo === o ? undefined : o }))}>
                {o}
              </button>
            ))}
          </div>
        </div>
        {datas && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Começa">
                <input
                  className="campo"
                  type="date"
                  value={f.inicio}
                  onChange={(e) => {
                    const inicio = e.target.value
                    // mantém a mesma duração
                    setF((x) => ({ ...x, inicio, previsao: somarDias(inicio, Math.max(7, diasEntre(x.inicio, x.previsao))) }))
                  }}
                />
              </Campo>
              <Campo rotulo="Previsão da troca" dica={`${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`}>
                <input className="campo" type="date" min={somarDias(f.inicio, 7)} max={somarDias(f.inicio, 180)} value={f.previsao} onChange={(e) => setF((x) => ({ ...x, previsao: e.target.value }))} />
              </Campo>
            </div>
            {online && (
              <Interruptor
                ligado={!!f.online}
                aoMudar={(v) => setF((x) => ({ ...x, online: v || undefined, previsao: previsaoPadrao(x.inicio, v) }))}
                rotulo="Atendimento a distância"
                descricao="Na prescrição online a ficha é revista a cada 30 dias"
              />
            )}
          </>
        )}
        <Campo rotulo="Recado geral (opcional)">
          <textarea className="campo min-h-16" maxLength={600} value={f.obs ?? ''} onChange={(e) => setF((x) => ({ ...x, obs: e.target.value || undefined }))} placeholder="Aqueça 5 minutos na esteira antes. Cadência controlada." />
        </Campo>
      </section>

      {/* as divisões */}
      <div className="sem-barra -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Divisões">
        {f.divisoes.map((d) => (
          <button key={d.id} type="button" role="tab" aria-selected={d.id === div?.id} onClick={() => setAba(d.id)} className={`min-w-24 shrink-0 rounded-2xl border px-4 py-2.5 text-left transition-colors ${d.id === div?.id ? 'border-anilha bg-anilha-suave' : 'border-linha bg-sup hover:border-linha-2'}`}>
            <span className="block text-sm font-bold">{d.nome}</span>
            <span className="block text-xs text-suave">{d.itens.length} exercícios</span>
          </button>
        ))}
        <button type="button" onClick={novaDivisao} className="grid min-w-14 shrink-0 place-items-center rounded-2xl border border-dashed border-linha-2 text-xl text-suave hover:text-texto" aria-label="Nova divisão">
          <PiPlus />
        </button>
      </div>

      {div && (
        <section aria-label={div.nome} className="space-y-3">
          <div className="cartao grid gap-3 p-4 sm:grid-cols-2">
            <Campo rotulo="Nome da divisão">
              <input className="campo" maxLength={24} value={div.nome} onChange={(e) => mudarDiv(div.id, (d) => ({ ...d, nome: e.target.value }))} />
            </Campo>
            <Campo rotulo="Foco (opcional)">
              <input className="campo" maxLength={60} value={div.foco ?? ''} onChange={(e) => mudarDiv(div.id, (d) => ({ ...d, foco: e.target.value || undefined }))} placeholder="Peito, ombro e tríceps" />
            </Campo>
            <div className="sm:col-span-2">
              <p className="rotulo">Dias (opcional)</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {[1, 2, 3, 4, 5, 6, 0].map((dia) => (
                  <button
                    key={dia}
                    type="button"
                    className="chip px-3 py-1.5 text-xs capitalize"
                    aria-pressed={!!div.dias?.includes(dia)}
                    onClick={() => mudarDiv(div.id, (d) => ({ ...d, dias: d.dias?.includes(dia) ? d.dias.filter((x) => x !== dia) : [...(d.dias ?? []), dia].sort() }))}
                  >
                    {NOMES_DIAS_CURTOS[dia]}
                  </button>
                ))}
                <span className="ml-auto text-xs text-fraco">uns {duracaoEstimada(div)} min</span>
              </div>
            </div>
            {f.divisoes.length > 1 && (
              <div className="sm:col-span-2">
                <button
                  type="button"
                  className="btn btn-fantasma btn-p text-perigo"
                  onClick={() => {
                    if (div.itens.length && !confirm(`Tirar o ${div.nome} com ${div.itens.length} exercícios?`)) return
                    setF((x) => ({ ...x, divisoes: x.divisoes.filter((d) => d.id !== div.id) }))
                    setAba(f.divisoes.find((d) => d.id !== div.id)?.id)
                  }}
                >
                  <PiTrash /> Tirar esta divisão
                </button>
              </div>
            )}
          </div>

          <ol className="space-y-2">
            {div.itens.map((it, i) => {
              const ex = EXERCICIO[it.exercicio]
              const proprio = proprios.find((p) => p.id === it.exercicio)
              const editando = aberto === it.id
              return (
                <li key={it.id} className="cartao overflow-hidden">
                  <div className="flex items-center gap-2 p-3">
                    <span className="titulo w-6 shrink-0 text-center text-2xl text-fraco">{i + 1}</span>
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setAberto(editando ? null : it.id)} aria-expanded={editando}>
                      <span className="block truncate font-semibold">{nomeDoItem(it.exercicio, proprios)}</span>
                      <span className="block truncate text-xs text-suave">
                        {it.series} × {REPS.test(it.reps.trim()) ? textoReps(it.reps) : it.reps}
                        {it.carga ? ` · ${kg(it.carga)}` : ''} · {textoDescanso(it.descanso)}
                        {it.tecnica ? ` · ${TECNICAS[it.tecnica]}` : ''}
                        {ex ? ` · ${GRUPOS[ex.grupo]}` : proprio ? ` · ${proprio.grupo}` : ''}
                      </span>
                    </button>
                    {(ex || (proprio?.base && EXERCICIO[proprio.base])) && (
                      <button type="button" className="grid size-9 shrink-0 place-items-center rounded-full text-anilha-legivel hover:bg-sup-2" aria-label="Ver em 3D" onClick={() => setVendo(it.exercicio)}>
                        <PiCube className="text-lg" />
                      </button>
                    )}
                    <button type="button" className="grid size-9 shrink-0 place-items-center rounded-full text-fraco hover:bg-sup-2" aria-label={editando ? 'Fechar' : 'Editar'} onClick={() => setAberto(editando ? null : it.id)}>
                      <PiCaretDown className={`transition-transform ${editando ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  {editando && (
                    <div className="grid gap-3 border-t border-linha p-4 sm:grid-cols-2">
                      <div>
                        <p className="rotulo">Séries</p>
                        <CampoNumero valor={it.series} min={1} max={10} rotulo="séries" aoMudar={(n) => mudarItem(it.id, { series: Math.round(n) || 1 })} />
                      </div>
                      <Campo rotulo="Repetições" dica="12, 8-12, 40s ou 20min" erro={REPS.test(it.reps.trim()) ? undefined : 'Assim: 12, 8-12, 40s ou 20min'}>
                        <input className="campo" value={it.reps} maxLength={8} onChange={(e) => mudarItem(it.id, { reps: e.target.value })} />
                      </Campo>
                      <div>
                        <p className="rotulo">Carga sugerida (kg)</p>
                        <CampoNumero valor={it.carga ?? 0} passo={2.5} max={999} rotulo="carga" aoMudar={(n) => mudarItem(it.id, { carga: n || undefined })} />
                      </div>
                      <Campo rotulo="Descanso">
                        <select className="campo" value={it.descanso} onChange={(e) => mudarItem(it.id, { descanso: Number(e.target.value) })}>
                          {[...new Set([...DESCANSOS, it.descanso])]
                            .sort((a, b) => a - b)
                            .map((s) => (
                              <option key={s} value={s}>
                                {textoDescanso(s)}
                              </option>
                            ))}
                        </select>
                      </Campo>
                      <Campo rotulo="Técnica">
                        <select className="campo" value={it.tecnica ?? 'normal'} onChange={(e) => mudarItem(it.id, { tecnica: e.target.value === 'normal' ? undefined : (e.target.value as Tecnica) })}>
                          {(Object.keys(TECNICAS) as Tecnica[]).map((t) => (
                            <option key={t} value={t}>
                              {TECNICAS[t]}
                            </option>
                          ))}
                        </select>
                      </Campo>
                      <Campo rotulo="Cadência (opcional)" dica="Descida-pausa-subida, ex.: 3-0-1">
                        <input className="campo" value={it.cadencia ?? ''} maxLength={7} placeholder="3-0-1" onChange={(e) => mudarItem(it.id, { cadencia: e.target.value || undefined })} />
                      </Campo>
                      <Campo rotulo="Recado (opcional)" className="sm:col-span-2">
                        <input className="campo" maxLength={160} value={it.obs ?? ''} placeholder="Desça devagar, sem tirar o quadril do banco" onChange={(e) => mudarItem(it.id, { obs: e.target.value || undefined })} />
                      </Campo>
                      <div className="flex flex-wrap gap-1 sm:col-span-2">
                        <button type="button" className="btn btn-fantasma btn-p" disabled={i === 0} onClick={() => mover(i, i - 1)}>
                          <PiArrowUp /> Subir
                        </button>
                        <button type="button" className="btn btn-fantasma btn-p" disabled={i === div.itens.length - 1} onClick={() => mover(i, i + 1)}>
                          <PiArrowDown /> Descer
                        </button>
                        <button type="button" className="btn btn-fantasma btn-p" disabled={div.itens.length >= MAX_ITENS} onClick={() => mudarDiv(div.id, (d) => ({ ...d, itens: [...d.itens.slice(0, i + 1), { ...it, id: idNovo() }, ...d.itens.slice(i + 1)] }))}>
                          <PiCopy /> Duplicar
                        </button>
                        <button type="button" className="btn btn-fantasma btn-p ml-auto text-perigo" onClick={() => mudarDiv(div.id, (d) => ({ ...d, itens: d.itens.filter((x) => x.id !== it.id) }))}>
                          <PiTrash /> Tirar
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
          <button type="button" className="btn btn-sup btn-m w-full border-dashed" disabled={div.itens.length >= MAX_ITENS} onClick={() => setEscolhendo(true)}>
            <PiPlus /> {div.itens.length >= MAX_ITENS ? `Até ${MAX_ITENS} exercícios por divisão` : 'Adicionar exercício'}
          </button>
        </section>
      )}

      {/* salvar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-linha bg-fundo/95 backdrop-blur-md lg:sticky lg:-mx-4 lg:rounded-2xl lg:border" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="mx-auto flex max-w-3xl gap-2 px-4 py-3">
          {rascunho && (
            <button type="button" className="btn btn-sup btn-m" disabled={!!salvando} onClick={() => salvar(false)}>
              {salvando === 'rascunho' ? <Girando /> : 'Rascunho'}
            </button>
          )}
          <button type="button" className="btn btn-anilha btn-m flex-1" disabled={!!salvando} onClick={() => salvar(true)}>
            {salvando === 'publicar' ? <Girando /> : textoSalvar}
          </button>
        </div>
      </div>

      <EscolherExercicio
        aberta={escolhendo}
        aoFechar={() => setEscolhendo(false)}
        proprios={proprios}
        escolhidos={div?.itens.map((it) => it.exercicio) ?? []}
        aoEscolher={(id) => {
          if (!div) return
          const p = proprios.find((x) => x.id === id)
          const item = p ? { id: idNovo(), exercicio: id, series: 3, reps: '10-12', descanso: 60 } : itemDoCatalogo(id)
          mudarDiv(div.id, (d) => ({ ...d, itens: [...d.itens, item] }))
          if (div.itens.length + 1 >= MAX_ITENS) setEscolhendo(false)
        }}
      />
      <FolhaExercicio id={vendo} proprio={proprios.find((p) => p.id === vendo)} aoFechar={() => setVendo(null)} />
    </div>
  )
}
