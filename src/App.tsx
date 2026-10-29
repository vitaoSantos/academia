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
const Exercicios = lazy(() => import('./paginas/Exercicios'))
const Inicio = lazy(() => import('./paginas/aluno/Inicio'))
const Fichas = lazy(() => import('./paginas/aluno/Fichas'))
const Ficha = lazy(() => import('./paginas/aluno/Ficha'))
const MinhaFicha = lazy(() => import('./paginas/aluno/MinhaFicha'))
const Treinar = lazy(() => import('./paginas/aluno/Treinar'))
const Historico = lazy(() => import('./paginas/aluno/Historico'))
const Evolucao = lazy(() => import('./paginas/aluno/Evolucao'))
const Medidas = lazy(() => import('./paginas/aluno/Medidas'))
const Agenda = lazy(() => import('./paginas/aluno/Agenda'))
const Aulas = lazy(() => import('./paginas/aluno/Aulas'))
const Desafios = lazy(() => import('./paginas/aluno/Desafios'))
const Desafio = lazy(() => import('./paginas/aluno/Desafio'))
const Conta = lazy(() => import('./paginas/aluno/Conta'))
const Avisos = lazy(() => import('./paginas/aluno/Avisos'))
const Mais = lazy(() => import('./paginas/aluno/Mais'))
const Rede = lazy(() => import('./paginas/rede/Rede'))
const Post = lazy(() => import('./paginas/rede/Post'))
const Pedidos = lazy(() => import('./paginas/rede/Pedidos'))
const Mensagens = lazy(() => import('./paginas/mensagens/Mensagens'))
const Conversa = lazy(() => import('./paginas/mensagens/Conversa'))

function Carregando() {
  return (
    <div className="grid min-h-[100svh] place-items-center">
      <Girando className="text-2xl text-fraco" />
    </div>
  )
}

function Tela() {
  const { caminho } = useEndereco()
  const [primeira, segunda, terceira] = caminho.split('/').filter(Boolean).map(decodeURIComponent)

  // o app do aluno
  const aluno: Record<string, () => ReactNode> = {
    app: () => <Inicio />,
    treinar: () => <Treinar />,
    historico: () => <Historico />,
    evolucao: () => <Evolucao />,
    medidas: () => <Medidas />,
    agenda: () => <Agenda />,
    aulas: () => <Aulas />,
    conta: () => <Conta />,
    avisos: () => <Avisos />,
    mais: () => <Mais />,
  }

  let tela: ReactNode
  if (caminho === '/') tela = <Landing />
  else if (primeira && !segunda && aluno[primeira]) tela = aluno[primeira]()
  else if (primeira === 'fichas') tela = !segunda ? <Fichas /> : segunda === 'nova' ? <MinhaFicha /> : terceira === 'editar' ? <MinhaFicha key={segunda} id={segunda} /> : <Ficha key={segunda} id={segunda} />
  else if (primeira === 'desafios') tela = segunda ? <Desafio key={segunda} id={segunda} /> : <Desafios />
  else if (primeira === 'exercicios') tela = <Exercicios key={segunda ?? ''} id={segunda} />
  else if (primeira === 'rede') tela = !segunda ? <Rede /> : segunda === 'pedidos' ? <Pedidos /> : segunda === 'p' && terceira ? <Post key={terceira} id={terceira} /> : <NaoEncontrada />
  else if (primeira === 'mensagens') tela = segunda ? <Conversa key={segunda} id={segunda} /> : <Mensagens />
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
