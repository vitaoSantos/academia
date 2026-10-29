import { useState } from 'react'
import { PiCheck, PiMagnifyingGlass, PiPlus } from 'react-icons/pi'
import { buscarExercicios, EQUIPAMENTOS, EXERCICIO, GRUPOS, MUSCULOS, type Grupo } from '../../shared/exercicios'
import type { ExercicioProprio } from '../../shared/tipos'
import { semAcento } from '../../shared/texto'
import { Folha } from '../ui/basicos'

// Escolher um exercício do catálogo (e dos próprios do profissional): a busca, os grupos e os
// sugeridos no topo (os parecidos, na hora de trocar)

const ORDEM = Object.keys(GRUPOS) as Grupo[]

export function EscolherExercicio({
  aberta,
  aoFechar,
  aoEscolher,
  titulo = 'Adicionar exercício',
  sugeridos = [],
  proprios = [],
  escolhidos = [],
}: {
  aberta: boolean
  aoFechar: () => void
  aoEscolher: (id: string) => void
  titulo?: string
  sugeridos?: string[]
  proprios?: ExercicioProprio[]
  escolhidos?: string[]
}) {
  const [busca, setBusca] = useState('')
  const [grupo, setGrupo] = useState<Grupo | null>(null)
  const lista = buscarExercicios(busca, grupo ?? undefined)
  const meus = proprios.filter((p) => !grupo && (!busca || semAcento(p.nome).includes(semAcento(busca))))
  const linha = (id: string, nome: string, sub: string) => {
    const ja = escolhidos.includes(id)
    return (
      <li key={id}>
        <button type="button" onClick={() => aoEscolher(id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-sup-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{nome}</span>
            <span className="block truncate text-xs text-suave">{sub}</span>
          </span>
          <span className={`grid size-8 shrink-0 place-items-center rounded-full ${ja ? 'bg-anilha text-anilha-texto' : 'bg-sup-2 text-suave'}`}>{ja ? <PiCheck /> : <PiPlus />}</span>
        </button>
      </li>
    )
  }
  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo={titulo} largura="max-w-xl">
      <div className="flex max-h-[88dvh] flex-col">
        <div className="border-b border-linha p-5 pb-3">
          <h2 className="titulo pr-10 text-3xl">{titulo}</h2>
          <label className="relative mt-3 block">
            <PiMagnifyingGlass className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg text-fraco" />
            <input className="campo pl-11" type="search" placeholder="Buscar pelo nome, músculo ou aparelho" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar exercício" />
          </label>
          <div className="sem-barra -mx-5 mt-2.5 flex gap-1.5 overflow-x-auto px-5">
            <button type="button" className="chip px-3 py-1.5 text-xs" aria-pressed={grupo === null} onClick={() => setGrupo(null)}>
              Todos
            </button>
            {ORDEM.map((g) => (
              <button key={g} type="button" className="chip px-3 py-1.5 text-xs" aria-pressed={grupo === g} onClick={() => setGrupo(g)}>
                {GRUPOS[g]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2" data-lenis-prevent>
          {sugeridos.length > 0 && !busca && !grupo && (
            <>
              <p className="px-3 pt-2 pb-1 text-[0.68rem] font-bold tracking-widest text-fraco uppercase">Parecidos</p>
              <ul>{sugeridos.filter((id) => EXERCICIO[id]).map((id) => linha(id, EXERCICIO[id].nome, EXERCICIO[id].principais.map((m) => MUSCULOS[m]).join(', ')))}</ul>
            </>
          )}
          {meus.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-[0.68rem] font-bold tracking-widest text-fraco uppercase">Seus exercícios</p>
              <ul>{meus.map((p) => linha(p.id, p.nome, [p.grupo, p.equipamento].filter(Boolean).join(' · ')))}</ul>
            </>
          )}
          <p className="px-3 pt-2 pb-1 text-[0.68rem] font-bold tracking-widest text-fraco uppercase">Catálogo em 3D</p>
          {lista.length === 0 ? <p className="px-3 py-6 text-sm text-suave">Nada com esse nome.</p> : <ul>{lista.map((x) => linha(x.id, x.nome, `${x.principais.map((m) => MUSCULOS[m]).join(', ')} · ${x.equipamento.map((q) => EQUIPAMENTOS[q]).join(', ')}`))}</ul>}
        </div>
      </div>
    </Folha>
  )
}
