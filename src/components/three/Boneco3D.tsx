import { useEffect, useRef, useState } from 'react'
import { EXERCICIO, type Camera } from '../../shared/exercicios'
import { criarPalco, type Palco } from './boneco/palco'

// O boneco 3D de um exercício (carregado à parte, com o three.js: quem importa usa lazy). Mostra o
// movimento com o equipamento e os músculos acesos na cor da marca. Sem WebGL, mostra o passo a passo.

type Props = {
  exercicio: string
  cor: string
  camera?: Camera
  velocidade?: number
  pausado?: boolean
  musculos?: boolean
  interativo?: boolean
  className?: string
  aoFase?: (fase: number) => void
  aoTempo?: (fracao: number) => void
  instante?: number | null // parado neste ponto do ciclo (0 a 1)
}

const reduzido = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Boneco3D({ exercicio, cor, camera, velocidade = 1, pausado, musculos = true, interativo = true, className = '', aoFase, aoTempo, instante }: Props) {
  const tela = useRef<HTMLCanvasElement>(null)
  const palco = useRef<Palco | null>(null)
  const [falhou, setFalhou] = useState(false)
  const fase = useRef(aoFase)
  fase.current = aoFase
  const tempo = useRef(aoTempo)
  tempo.current = aoTempo

  // a cena nasce uma vez; as props mudam o que ela mostra
  useEffect(() => {
    try {
      const p = criarPalco({ canvas: tela.current!, cor, reduzido: reduzido(), interativo })
      p.aoFase((f) => fase.current?.(f))
      p.aoTempo((f) => tempo.current?.(f))
      palco.current = p
      p.mostrar(exercicio, camera)
    } catch {
      setFalhou(true)
    }
    return () => {
      palco.current?.liberar()
      palco.current = null
    }
  }, [interativo])

  useEffect(() => {
    palco.current?.mostrar(exercicio, camera)
  }, [exercicio])
  useEffect(() => {
    if (camera) palco.current?.camera(camera)
  }, [camera])
  useEffect(() => {
    palco.current?.velocidade(velocidade)
  }, [velocidade])
  useEffect(() => {
    if (pausado !== undefined) palco.current?.pausar(pausado)
  }, [pausado])
  useEffect(() => {
    palco.current?.musculos(musculos)
  }, [musculos])
  useEffect(() => {
    palco.current?.cor(cor)
  }, [cor])
  useEffect(() => {
    if (instante !== null && instante !== undefined) palco.current?.instante(instante)
  }, [instante, exercicio])

  const ex = EXERCICIO[exercicio]
  if (falhou)
    return (
      <div className={`grid place-items-center p-6 text-center text-sm text-suave ${className}`}>
        <div>
          <p className="font-semibold text-texto">{ex?.nome}</p>
          <p className="mt-1">Seu navegador não abriu o 3D. O passo a passo está logo abaixo.</p>
        </div>
      </div>
    )
  return <canvas ref={tela} className={`block h-full w-full touch-pan-y ${interativo ? 'cursor-grab active:cursor-grabbing' : ''} ${className}`} role="img" aria-label={ex ? `Boneco em 3D fazendo ${ex.nome}` : 'Boneco em 3D'} />
}
