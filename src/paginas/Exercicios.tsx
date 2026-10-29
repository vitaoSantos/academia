import { useState, type ReactNode } from 'react'
import { PiArrowLeft, PiMagnifyingGlass } from 'react-icons/pi'
import { Boneco, InfoExercicio } from '../components/ficha/VerExercicio'
import { AppAluno } from '../components/layout/AppAluno'
import { Rodape } from '../components/layout/Rodape'
import { Topo } from '../components/layout/Topo'
import { Link } from '../lib/rotas'
import { useSessao } from '../lib/sessao'
import { useTitulo } from '../lib/titulo'
import { EQUIPAMENTOS, EXERCICIO, EXERCICIOS, GRUPOS, MUSCULOS, buscarExercicios, type Grupo } from '../shared/exercicios'
import { textoReps } from '../shared/ficha'

// O catálogo de exercícios em 3D (seção 11 do estudo), aberto a todo mundo. Quem está logado vê
// dentro do app (com a marca da academia); quem não está, com o topo da Turma.

const ORDEM = Object.keys(GRUPOS) as Grupo[]
const NIVEIS = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' }

function Moldura({ children }: { children: ReactNode }) {
  const s = useSessao()
  if (s.usuario) return <AppAluno largo>{children}</AppAluno>
  return (
    <div className="min-h-[100svh]">
      <Topo />
      <main className="margem mx-auto max-w-6xl py-8 pb-20">{children}</main>
      <Rodape />
    </div>
  )
}

export default function Exercicios({ id }: { id?: string }) {
  const ex = id ? EXERCICIO[id] : undefined
  useTitulo(ex ? `${ex.nome} em 3D` : 'Exercícios em 3D')
  return <Moldura>{ex ? <Detalhe id={ex.id} /> : <Catalogo />}</Moldura>
}

function Catalogo() {
  const [busca, setBusca] = useState('')
  const [grupo, setGrupo] = useState<Grupo | null>(null)
  const lista = buscarExercicios(busca, grupo ?? undefined)
  return (
    <>
      <p className="sobre">Catálogo</p>
      <h1 className="titulo mt-2 text-5xl">Os {EXERCICIOS.length} exercícios em 3D</h1>
      <p className="mt-3 max-w-2xl text-suave">O boneco mostra o movimento certo, com os músculos que trabalham acesos. Gire, mude a câmera, deixe devagar. O seu professor monta a ficha com eles.</p>

      <label className="relative mt-6 block max-w-md">
        <PiMagnifyingGlass className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg text-fraco" />
        <input className="campo pl-11" type="search" placeholder="Supino, agachamento, bíceps..." value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar exercício" />
      </label>
      <div className="sem-barra -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
        <button type="button" className="chip" aria-pressed={grupo === null} onClick={() => setGrupo(null)}>
          Todos
        </button>
        {ORDEM.map((g) => (
          <button key={g} type="button" className="chip" aria-pressed={grupo === g} onClick={() => setGrupo(g)}>
            {GRUPOS[g]}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <p className="mt-10 text-sm text-suave">Nenhum exercício com esse nome. Tente outra palavra.</p>
      ) : (
        <ul className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((x) => (
            <li key={x.id}>
              <Link para={`/exercicios/${x.id}`} className="cartao flex h-full flex-col p-4 transition-colors hover:border-linha-2">
                <span className="text-[0.65rem] font-bold tracking-widest text-fraco uppercase">{GRUPOS[x.grupo]}</span>
                <span className="mt-1 font-bold">{x.nome}</span>
                <span className="mt-1 text-xs text-suave">{x.principais.map((m) => MUSCULOS[m]).join(', ')}</span>
                <span className="mt-auto pt-3 text-xs text-fraco">{x.equipamento.map((q) => EQUIPAMENTOS[q]).join(' · ')}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function Detalhe({ id }: { id: string }) {
  const ex = EXERCICIO[id]
  return (
    <>
      <Link para="/exercicios" className="inline-flex items-center gap-1.5 text-sm font-semibold text-suave hover:text-texto">
        <PiArrowLeft /> Todos os exercícios
      </Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <p className="sobre">
            {GRUPOS[ex.grupo]} · {NIVEIS[ex.nivel]}
          </p>
          <h1 className="titulo mt-2 text-4xl sm:text-5xl">{ex.nome}</h1>
          <div className="mt-4">
            <Boneco key={id} id={id} className="aspect-[4/5] sm:aspect-[16/11]" />
          </div>
        </div>
        <aside className="lg:pt-24">
          <div className="cartao p-5">
            <p className="text-sm text-suave">
              Sugestão: <span className="font-bold text-texto">{ex.series} séries</span> de <span className="font-bold text-texto">{ex.medida === 'tempo' ? textoReps(ex.reps) : `${textoReps(ex.reps)} repetições`}</span>, descanso de {ex.descanso} s. O seu
              professor ajusta para você.
            </p>
            <InfoExercicio id={id} className="mt-5" />
          </div>
          {ex.variacoes && ex.variacoes.length > 0 && (
            <div className="mt-4">
              <p className="sobre">Variações</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ex.variacoes
                  .filter((v) => EXERCICIO[v])
                  .map((v) => (
                    <Link key={v} para={`/exercicios/${v}`} className="chip">
                      {EXERCICIO[v].nome}
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
