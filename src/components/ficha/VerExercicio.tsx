import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { PiPause, PiPlay, PiVideo } from 'react-icons/pi'
import { EQUIPAMENTOS, EXERCICIO, MUSCULOS, type Camera } from '../../shared/exercicios'
import type { ExercicioProprio } from '../../shared/tipos'
import { useTemaEmVolta } from '../marca/Marca'
import { Folha } from '../ui/basicos'

const Boneco3D = lazy(() => import('../three/Boneco3D'))

// O exercício em 3D (seção 11 do estudo): o boneco fazendo o movimento na cor da marca, os pontos de
// atenção aparecendo na fase certa da repetição, a câmera e a velocidade; embaixo, o passo a passo e
// os erros comuns. O exercício próprio do professor mostra o movimento base (se tiver) e o vídeo dele.

const CAMERAS: { id: Camera; nome: string }[] = [
  { id: 'frente', nome: 'Frente' },
  { id: 'lado', nome: 'Lado' },
  { id: 'tres-quartos', nome: '3/4' },
  { id: 'costas', nome: 'Costas' },
]

const reduzido = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function Boneco({ id, cor, className = 'aspect-[4/3]' }: { id: string; cor?: string; className?: string }) {
  const ex = EXERCICIO[id]
  const [camera, setCamera] = useState<Camera>(ex?.camera ?? 'tres-quartos')
  const [lento, setLento] = useState(false)
  const [pausado, setPausado] = useState(reduzido)
  const [atencao, setAtencao] = useState<string | null>(null)
  // os músculos acendem na cor da marca em volta (ou no amarelo da Turma)
  const tema = useTemaEmVolta()

  useEffect(() => {
    setCamera(EXERCICIO[id]?.camera ?? 'tres-quartos')
    setAtencao(null)
  }, [id])

  const aoFase = useMemo(() => {
    let atual: string | null = null
    return (f: number) => {
      const texto = ex?.atencao.find((a) => Math.abs(a.em - f) < 0.09)?.texto ?? null
      if (texto !== atual) {
        atual = texto
        setAtencao(texto)
      }
    }
  }, [ex])

  if (!ex) return null
  return (
    <div>
      <div className={`relative overflow-hidden rounded-2xl border border-linha ${className}`} style={{ background: 'radial-gradient(120% 90% at 50% 0%, var(--sup-2), var(--fundo) 72%)' }}>
        <Suspense fallback={<div className="grid h-full place-items-center text-sm text-fraco">Montando o boneco…</div>}>
          <Boneco3D exercicio={id} cor={cor ?? tema.destaque} camera={camera} velocidade={lento ? 0.5 : 1} pausado={pausado} aoFase={aoFase} />
        </Suspense>
        <div aria-live="polite" className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
          {atencao && (
            <p className="rounded-full bg-vidro px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur sm:text-sm">
              <span className="mr-2 inline-block size-2 rounded-full bg-anilha align-middle" />
              {atencao}
            </p>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <div role="radiogroup" aria-label="Câmera" className="flex gap-1">
          {CAMERAS.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={camera === c.id} className="chip px-2.5 py-1 text-xs" onClick={() => setCamera(c.id)}>
              {c.nome}
            </button>
          ))}
        </div>
        <button type="button" className="chip px-2.5 py-1 text-xs" aria-pressed={lento} onClick={() => setLento((l) => !l)}>
          Devagar
        </button>
        <button type="button" className="chip px-2.5 py-1 text-xs" onClick={() => setPausado((p) => !p)} aria-label={pausado ? 'Continuar' : 'Pausar'}>
          {pausado ? <PiPlay /> : <PiPause />}
        </button>
      </div>
    </div>
  )
}

export function VerExercicio({ id, proprio, cor }: { id: string; proprio?: ExercicioProprio; cor?: string }) {
  const ex = EXERCICIO[id]
  const base = proprio?.base && EXERCICIO[proprio.base] ? EXERCICIO[proprio.base] : null
  const mostrar = ex ?? base
  return (
    <div>
      {mostrar ? <Boneco id={mostrar.id} cor={cor} /> : null}
      {proprio && (
        <div className="mt-4">
          {base && <p className="text-xs text-fraco">Movimento de base: {base.nome}</p>}
          {proprio.instrucoes && <p className="mt-2 text-sm whitespace-pre-line">{proprio.instrucoes}</p>}
          {proprio.video && (
            <a href={proprio.video} target="_blank" rel="noreferrer" className="btn btn-sup btn-p mt-3">
              <PiVideo /> Ver o vídeo do professor
            </a>
          )}
        </div>
      )}
      {ex && <InfoExercicio id={ex.id} className="mt-4" />}
    </div>
  )
}

// Os músculos, o equipamento, o passo a passo e os erros comuns
export function InfoExercicio({ id, className = '' }: { id: string; className?: string }) {
  const ex = EXERCICIO[id]
  if (!ex) return null
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap gap-1.5">
        {ex.principais.map((m) => (
          <span key={m} className="chip px-2.5 py-1 text-xs">
            <span className="size-2 rounded-full bg-anilha" /> {MUSCULOS[m]}
          </span>
        ))}
        {ex.secundarios.map((m) => (
          <span key={m} className="chip px-2.5 py-1 text-xs text-suave">
            <span className="size-2 rounded-full bg-anilha opacity-45" /> {MUSCULOS[m]}
          </span>
        ))}
      </div>
      <p className="text-xs text-fraco">{ex.equipamento.map((e) => EQUIPAMENTOS[e]).join(' · ')}</p>
      <div>
        <p className="sobre">Passo a passo</p>
        <ol className="mt-2.5 space-y-2 text-sm">
          {ex.passos.map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="titulo grid size-6 shrink-0 place-items-center rounded-md bg-sup-3 text-base">{i + 1}</span>
              <span className="pt-0.5 text-suave">{p}</span>
            </li>
          ))}
        </ol>
      </div>
      {ex.erros.length > 0 && (
        <div>
          <p className="sobre">Evite</p>
          <ul className="mt-2.5 space-y-1.5 text-sm text-suave">
            {ex.erros.map((e, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-perigo" />
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// O exercício numa folha que sobe (a ficha, o treino ao vivo, o montador da ficha)
export function FolhaExercicio({ id, proprio, aoFechar, children }: { id: string | null; proprio?: ExercicioProprio; aoFechar: () => void; children?: ReactNode }) {
  const nome = id ? (EXERCICIO[id]?.nome ?? proprio?.nome ?? '') : ''
  return (
    <Folha aberta={!!id} aoFechar={aoFechar} titulo={nome} largura="max-w-xl">
      {id && (
        <div className="p-5 sm:p-6">
          <h2 className="titulo pr-10 text-3xl">{nome}</h2>
          <div className="mt-4">
            <VerExercicio id={id} proprio={proprio} />
          </div>
          {children}
        </div>
      )}
    </Folha>
  )
}
