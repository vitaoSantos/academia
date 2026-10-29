import { PiCube } from 'react-icons/pi'
import { EXERCICIO, GRUPOS, MUSCULOS } from '../../shared/exercicios'
import { TECNICAS, textoReps } from '../../shared/ficha'
import type { Divisao, ExercicioProprio } from '../../shared/tipos'
import { kg } from '../../shared/texto'
import { Selo } from '../ui/basicos'

// Os exercícios de uma divisão como o aluno lê: a ordem, as séries e as repetições, a carga, o
// descanso, a técnica e o recado do professor. Tocar no exercício abre o 3D.

export const nomeDoItem = (id: string, proprios: ExercicioProprio[] = []) => EXERCICIO[id]?.nome ?? proprios.find((p) => p.id === id)?.nome ?? 'Exercício'

export function textoDescanso(s: number) {
  if (!s) return 'sem descanso'
  if (s < 60) return `${s} s`
  return s % 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s / 60} min`
}

export function ListaDaDivisao({ divisao, proprios = [], aoVer }: { divisao: Divisao; proprios?: ExercicioProprio[]; aoVer: (id: string) => void }) {
  return (
    <ol className="space-y-2">
      {divisao.itens.map((it, i) => {
        const ex = EXERCICIO[it.exercicio]
        const proprio = proprios.find((p) => p.id === it.exercicio)
        const tem3D = !!ex || !!(proprio?.base && EXERCICIO[proprio.base])
        // bi-set e tri-set: os exercícios em sequência ficam unidos pela linha
        const junto = it.tecnica === 'bi-set' || it.tecnica === 'tri-set'
        return (
          <li key={it.id} className={`cartao flex items-stretch gap-3 p-3.5 ${junto ? 'border-l-4 border-l-anilha' : ''}`}>
            <span className="titulo grid w-7 shrink-0 place-items-center self-start pt-0.5 text-2xl text-fraco">{i + 1}</span>
            <button type="button" onClick={() => aoVer(it.exercicio)} className="min-w-0 flex-1 text-left" aria-label={`${nomeDoItem(it.exercicio, proprios)}: ver em 3D`}>
              <span className="block font-bold">{nomeDoItem(it.exercicio, proprios)}</span>
              <span className="mt-0.5 block text-xs text-suave">{ex ? `${GRUPOS[ex.grupo]} · ${ex.principais.map((m) => MUSCULOS[m]).join(', ')}` : (proprio?.grupo ?? '')}</span>
              <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span>
                  <span className="dado font-bold">{it.series}</span> × <span className="dado font-bold">{textoReps(it.reps)}</span>
                </span>
                {it.carga ? <span className="dado text-suave">{kg(it.carga)}</span> : null}
                <span className="text-xs text-fraco">descanso {textoDescanso(it.descanso)}</span>
                {it.cadencia && <span className="text-xs text-fraco">cadência {it.cadencia}</span>}
                {it.tecnica && <Selo>{TECNICAS[it.tecnica]}</Selo>}
              </span>
              {it.obs && <span className="mt-2 block rounded-xl bg-sup-2 px-3 py-2 text-xs text-suave">{it.obs}</span>}
            </button>
            {tem3D && (
              <button type="button" onClick={() => aoVer(it.exercicio)} className="grid size-10 shrink-0 place-items-center self-center rounded-full bg-sup-2 text-xl text-anilha-legivel hover:bg-sup-3" aria-label="Ver em 3D">
                <PiCube />
              </button>
            )}
          </li>
        )
      })}
    </ol>
  )
}
