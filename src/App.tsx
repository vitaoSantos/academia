import { MotionConfig } from 'motion/react'
import { lazy, Suspense, type ReactNode } from 'react'
import { AvisoProvider } from './components/ui/Aviso'
import { Girando } from './components/ui/basicos'
import { useEndereco } from './lib/rotas'
import { SessaoProvider } from './lib/sessao'
import { slugValido, USUARIO } from './shared/slug'

// Cada tela é carregada à parte: quem abre o app da academia não baixa o painel, a landing (com o 3D)
// nem o admin antes da hora

const Landing = lazy(() => import('./paginas/Landing'))
const Lab = lazy(() => import('./lab/Lab'))
const Explorar = lazy(() => import('./paginas/Explorar'))
const NaoEncontrada = lazy(() => import('./paginas/NaoEncontrada'))
const Entrar = lazy(() => import('./paginas/conta/Entrar'))
const Cadastro = lazy(() => import('./paginas/conta/Cadastro'))
const ComecarAcademia = lazy(() => import('./paginas/conta/ComecarAcademia'))
const ComecarPersonal = lazy(() => import('./paginas/conta/ComecarPersonal'))
const Pagina = lazy(() => import('./paginas/publico/Pagina'))
const Perfil = lazy(() => import('./paginas/publico/Perfil'))
const Convite = lazy(() => import('./paginas/publico/Convite'))

function Carregando() {
  return (
    <div className="grid min-h-[100svh] place-items-center">
      <Girando className="text-2xl text-fraco" />
    </div>
  )
}

function Tela() {
  const { caminho } = useEndereco()
  const [primeira, segunda] = caminho.split('/').filter(Boolean).map(decodeURIComponent)

  let tela: ReactNode
  if (caminho === '/') tela = <Landing />
  else if (primeira === 'lab') tela = <Lab inicial={segunda} />
  else if (primeira === 'explorar') tela = <Explorar />
  else if (caminho === '/entrar') tela = <Entrar />
  else if (caminho === '/cadastro') tela = <Cadastro />
  else if (caminho === '/comecar/academia') tela = <ComecarAcademia />
  else if (caminho === '/comecar/personal') tela = <ComecarPersonal />
  else if (primeira === 'u' && segunda && USUARIO.test(segunda.toLowerCase())) tela = <Perfil key={segunda} usuario={segunda.toLowerCase()} />
  else if (primeira === 'convite' && segunda) tela = <Convite codigo={segunda} />
  else if (primeira && !segunda && slugValido(primeira.toLowerCase())) tela = <Pagina key={primeira} slug={primeira.toLowerCase()} />
  else tela = <NaoEncontrada />

  return <Suspense fallback={<Carregando />}>{tela}</Suspense>
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AvisoProvider>
        <SessaoProvider>
          <Tela />
        </SessaoProvider>
      </AvisoProvider>
    </MotionConfig>
  )
}
