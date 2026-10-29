import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { PiArrowsClockwise, PiPause, PiPlay } from 'react-icons/pi'
import { Link, useEndereco } from '../lib/rotas'
import { CORES_DESTAQUE } from '../shared/temas'
import { EQUIPAMENTOS, EXERCICIO, EXERCICIOS, GRUPOS, MUSCULOS, type Camera, type Grupo } from '../shared/exercicios'
import { textoReps } from '../shared/ficha'

const Boneco3D = lazy(() => import('../components/three/Boneco3D'))

// O laboratório do boneco 3D (seção 11 do estudo): os 43 exercícios do catálogo, com a troca de
// câmera, a velocidade, os músculos, a cor da marca e os pontos de atenção na fase certa. Também é o
// lugar para conferir um movimento novo antes de ele ir para as fichas.

const CAMERAS: { id: Camera; nome: string }[] = [
  { id: 'frente', nome: 'Frente' },
  { id: 'lado', nome: 'Lado' },
  { id: 'tres-quartos', nome: '3/4' },
  { id: 'cima', nome: 'Cima' },
  { id: 'costas', nome: 'Costas' },
]

const ORDEM_GRUPOS = Object.keys(GRUPOS) as Grupo[]
const reduzido = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Lab({ inicial }: { inicial?: string }) {
  const { busca } = useEndereco()
  const id = inicial && EXERCICIO[inicial] ? inicial : 'supino-reto'
  const ex = EXERCICIO[id]
  const pedida = busca.get('camera') as Camera | null
  const [camera, setCamera] = useState<Camera>(pedida ?? ex.camera)
  const [velocidade, setVelocidade] = useState(1)
  // ?fase=0.5 abre parado naquele ponto da repetição (as fotos de conferência usam)
  const faseInicial = busca.get('fase') !== null ? Number(busca.get('fase')) : null
  const [pausado, setPausado] = useState(() => faseInicial !== null || reduzido())
  const [instante, setInstante] = useState<number | null>(faseInicial)
  const regua = useRef<HTMLInputElement>(null)
  const [musculos, setMusculos] = useState(true)
  const [cor, setCor] = useState(busca.get('cor') ? `#${busca.get('cor')}` : '#f5c518')
  const [atencao, setAtencao] = useState<string | null>(null)
  const [grupo, setGrupo] = useState<Grupo | null>(null)

  // cada exercício abre na câmera que mostra melhor o movimento
  useEffect(() => {
    setCamera(pedida ?? EXERCICIO[id].camera)
    setAtencao(null)
    if (regua.current) regua.current.value = '0'
    document.title = `${EXERCICIO[id].nome} · laboratório 3D · Turma`
  }, [id])

  // o ponto de atenção da fase em que o boneco está
  const aoFase = useMemo(() => {
    let atual: string | null = null
    return (f: number) => {
      const perto = ex.atencao.find((a) => Math.abs(a.em - f) < 0.09)
      const texto = perto?.texto ?? null
      if (texto !== atual) {
        atual = texto
        setAtencao(texto)
      }
    }
  }, [ex])

  const lista = grupo ? EXERCICIOS.filter((e) => e.grupo === grupo) : EXERCICIOS

  return (
    <div className="min-h-[100svh] bg-fundo text-texto">
      <header className="margem mx-auto flex max-w-[1500px] items-end justify-between gap-4 pt-6 pb-4">
        <div>
          <p className="sobre">Turma · laboratório</p>
          <h1 className="titulo mt-1 text-4xl sm:text-5xl">
            O boneco <span className="text-anilha-legivel">3D</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-suave">
            Os {EXERCICIOS.length} exercícios do catálogo, com o movimento descrito pela biomecânica: a barra no caminho certo, o pé parado no chão e os músculos que trabalham acesos na cor da marca.
          </p>
        </div>
      </header>

      <div className="margem mx-auto grid max-w-[1500px] gap-4 pb-10 lg:grid-cols-[17rem_minmax(0,1fr)_21rem]">
        {/* o boneco */}
        <section className="lg:order-2">
          <div className="cartao relative overflow-hidden">
            <div className="aspect-[4/5] w-full sm:aspect-[16/11]" style={{ background: 'radial-gradient(120% 90% at 50% 0%, var(--sup-2), var(--fundo) 70%)' }}>
              <Suspense fallback={<div className="grid h-full place-items-center text-sm text-fraco">Montando o boneco…</div>}>
                <Boneco3D
                  exercicio={id}
                  cor={cor}
                  camera={camera}
                  velocidade={velocidade}
                  pausado={pausado}
                  musculos={musculos}
                  aoFase={aoFase}
                  instante={instante}
                  aoTempo={(f) => {
                    if (regua.current) regua.current.value = String(Math.round(f * 1000))
                  }}
                />
              </Suspense>
            </div>
            {/* o ponto de atenção da fase */}
            <div aria-live="polite" className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
              {atencao && (
                <p className="rounded-full bg-vidro px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur sm:px-4 sm:py-2 sm:text-sm" style={{ color: 'var(--texto)' }}>
                  <span className="mr-2 inline-block size-2 rounded-full align-middle" style={{ background: cor }} />
                  {atencao}
                </p>
              )}
            </div>
          </div>

          {/* os controles */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label="Câmera" className="flex flex-wrap gap-1.5">
              {CAMERAS.map((c) => (
                <button key={c.id} role="radio" aria-checked={camera === c.id} className="chip" onClick={() => setCamera(c.id)}>
                  {c.nome}
                </button>
              ))}
            </div>
            <span className="mx-1 hidden h-5 w-px bg-linha-2 sm:block" aria-hidden />
            <div role="radiogroup" aria-label="Velocidade" className="flex gap-1.5">
              {[0.5, 1].map((v) => (
                <button key={v} role="radio" aria-checked={velocidade === v} className="chip dado" onClick={() => setVelocidade(v)}>
                  {v === 0.5 ? '0,5×' : '1×'}
                </button>
              ))}
            </div>
            <button
              className="btn btn-sup btn-p"
              onClick={() => {
                setInstante(null)
                setPausado((p) => !p)
              }}
              aria-label={pausado ? 'Continuar' : 'Pausar'}
            >
              {pausado ? <PiPlay /> : <PiPause />}
              {pausado ? 'Continuar' : 'Pausar'}
            </button>
            <button className="chip" aria-pressed={musculos} onClick={() => setMusculos((m) => !m)}>
              Músculos
            </button>
            <button className="btn btn-fantasma btn-p" onClick={() => setCamera(ex.camera)} title="Voltar para a câmera do exercício">
              <PiArrowsClockwise /> Câmera do exercício
            </button>
          </div>
          {/* a régua: arrastar para o boneco parar em qualquer ponto do movimento */}
          <label className="mt-3 flex items-center gap-3">
            <span className="shrink-0 text-xs text-fraco">Fase</span>
            <input
              ref={regua}
              type="range"
              min={0}
              max={999}
              defaultValue={faseInicial !== null ? Math.round(faseInicial * 1000) : 0}
              className="w-full accent-[var(--anilha)]"
              aria-label="Fase do movimento"
              onChange={(e) => {
                setPausado(true)
                setInstante(Number(e.target.value) / 1000)
              }}
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-fraco">Cor da marca</span>
            {CORES_DESTAQUE.map((c) => (
              <button
                key={c}
                aria-label={`Cor ${c}`}
                aria-pressed={cor === c}
                onClick={() => setCor(c)}
                className="size-6 rounded-full border border-linha-2 transition-transform aria-pressed:scale-110 aria-pressed:ring-2 aria-pressed:ring-texto aria-pressed:ring-offset-2 aria-pressed:ring-offset-fundo"
                style={{ background: c }}
              />
            ))}
          </div>
        </section>

        {/* o que o exercício pede */}
        <aside className="space-y-4 lg:order-3">
          <div className="cartao p-5">
            <p className="sobre">
              {GRUPOS[ex.grupo]} · {ex.equipamento.map((e) => EQUIPAMENTOS[e]).join(' · ')}
            </p>
            <h2 className="titulo mt-2 text-3xl">{ex.nome}</h2>
            <p className="mt-2 text-sm text-suave">
              {ex.series} séries de {ex.medida === 'tempo' ? textoReps(ex.reps) : `${textoReps(ex.reps)} repetições`} · descanso de {ex.descanso} s
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {ex.principais.map((m) => (
                <span key={m} className="chip">
                  <span className="size-2 rounded-full" style={{ background: cor }} /> {MUSCULOS[m]}
                </span>
              ))}
              {ex.secundarios.map((m) => (
                <span key={m} className="chip text-suave">
                  <span className="size-2 rounded-full opacity-50" style={{ background: cor }} /> {MUSCULOS[m]}
                </span>
              ))}
            </div>
          </div>
          <div className="cartao p-5">
            <p className="sobre">Passo a passo</p>
            <ol className="mt-3 space-y-2.5 text-sm">
              {ex.passos.map((p, i) => (
                <li key={i} className="flex gap-3">
                  <span className="titulo grid size-6 shrink-0 place-items-center rounded-md bg-sup-3 text-base">{i + 1}</span>
                  <span className="pt-0.5 text-suave">{p}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="cartao p-5">
            <p className="sobre">Erros comuns</p>
            <ul className="mt-3 space-y-2 text-sm text-suave">
              {ex.erros.map((e, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-perigo" />
                  {e}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* os exercícios */}
        <nav aria-label="Exercícios" className="lg:order-1">
          <div className="sem-barra -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2 lg:flex-wrap">
            <button className="chip" aria-pressed={grupo === null} onClick={() => setGrupo(null)}>
              Todos
            </button>
            {ORDEM_GRUPOS.map((g) => (
              <button key={g} className="chip" aria-pressed={grupo === g} onClick={() => setGrupo(g)}>
                {GRUPOS[g]}
              </button>
            ))}
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
            {lista.map((e) => (
              <li key={e.id}>
                <Link
                  para={`/lab/${e.id}`}
                  substituir
                  aria-current={e.id === id ? 'page' : undefined}
                  className="block rounded-lg px-3 py-2 text-sm text-suave transition-colors hover:bg-sup-2 hover:text-texto aria-[current=page]:bg-anilha-suave aria-[current=page]:font-semibold aria-[current=page]:text-texto"
                >
                  {e.nome}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
