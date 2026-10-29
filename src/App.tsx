import { MotionConfig } from 'motion/react'
import { lazy, Suspense, type ReactNode } from 'react'
import { useEndereco } from './lib/rotas'

// Cada tela é carregada à parte: quem abre o app da academia não baixa o painel, a landing (com o 3D)
// nem o admin antes da hora

const Lab = lazy(() => import('./lab/Lab'))

function Carregando() {
  return <div className="grid min-h-[100svh] place-items-center text-fraco">Carregando…</div>
}

function Tela() {
  const { caminho } = useEndereco()
  const [primeira, segunda] = caminho.split('/').filter(Boolean).map(decodeURIComponent)

  let tela: ReactNode
  if (primeira === 'lab') tela = <Lab inicial={segunda} />
  else tela = <Lab inicial={segunda} />

  return <Suspense fallback={<Carregando />}>{tela}</Suspense>
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Tela />
    </MotionConfig>
  )
}
