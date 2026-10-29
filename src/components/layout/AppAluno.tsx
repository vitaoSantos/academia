import { useEffect, type ReactNode } from 'react'
import { PiBarbellBold, PiCaretLeft, PiClipboardText, PiDotsThreeOutline, PiHouse, PiUsersThree } from 'react-icons/pi'
import { useMarcaNoDocumento } from '../../hooks/useMarcaNoDocumento'
import { aluno } from '../../lib/api'
import { useDados } from '../../lib/dados'
import { Link, navegar, useEndereco } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import type { VinculoComMarca } from '../../shared/respostas'
import { temaDe } from '../../shared/temas'
import type { MarcaPrincipal } from '../../shared/tipos'
import { ComMarca, LogoDaMarca } from '../marca/Marca'
import { Carregando, Logo } from '../ui/basicos'
import { MenuConta } from './MenuConta'

// O app do aluno: veste a marca da academia ou do personal dele (a "principal", que ele escolhe na
// conta; sem escolha, a academia). No celular, a barra de baixo com o botão de treinar no meio; no
// computador, a coluna do lado.

export function marcaDoAluno(vinculos: VinculoComMarca[] | undefined, principal?: MarcaPrincipal) {
  const ativos = (vinculos ?? []).filter((v) => v.status === 'ativo')
  return (principal && ativos.find((v) => v.tipo === principal.tipo && v.id === principal.id)) || ativos.find((v) => v.tipo === 'empresa') || ativos[0] || null
}

export function useVinculos() {
  const s = useSessao()
  return useDados(s.usuario ? `vinculos:${s.usuario.id}` : null, () => aluno.vinculos().then((r) => r.vinculos))
}

const ITENS = [
  { para: '/app', nome: 'Início', icone: <PiHouse /> },
  { para: '/fichas', nome: 'Fichas', icone: <PiClipboardText /> },
  { para: '/treinar', nome: 'Treinar', icone: <PiBarbellBold />, centro: true },
  { para: '/rede', nome: 'Rede', icone: <PiUsersThree /> },
  { para: '/mais', nome: 'Mais', icone: <PiDotsThreeOutline /> },
]

const MAIS = [
  { para: '/historico', nome: 'Histórico' },
  { para: '/evolucao', nome: 'Evolução' },
  { para: '/medidas', nome: 'Medidas' },
  { para: '/agenda', nome: 'Agenda' },
  { para: '/aulas', nome: 'Aulas' },
  { para: '/desafios', nome: 'Desafios' },
  { para: '/exercicios', nome: 'Exercícios' },
  { para: '/explorar', nome: 'Explorar' },
  { para: '/conta', nome: 'Conta' },
]

export function AppAluno({ children, titulo, voltar, largo = false, semNav = false }: { children: ReactNode; titulo?: ReactNode; voltar?: string; largo?: boolean; semNav?: boolean }) {
  const s = useSessao()
  const { caminho } = useEndereco()
  const vinculos = useVinculos()
  const marca = marcaDoAluno(vinculos.dados, s.usuario?.principal)
  const tema = temaDe(marca?.visual)
  useMarcaNoDocumento(marca ? { slug: marca.slug, nome: marca.nome, cor: tema.destaque, fundo: tema.fundo } : null)

  // sem conta: entra e volta para cá
  useEffect(() => {
    if (!s.carregando && !s.usuario) navegar(`/entrar?volta=${encodeURIComponent(location.pathname + location.search)}`, { substituir: true })
  }, [s.carregando, s.usuario])

  const ativo = (para: string) => (para === '/app' ? caminho === '/app' : caminho.startsWith(para)) || (para === '/mais' && MAIS.some((m) => caminho.startsWith(m.para)))

  return (
    <ComMarca visual={marca?.visual} className="min-h-[100svh]">
      <header className="sticky top-0 z-50 border-b border-linha bg-fundo/90 backdrop-blur-md">
        <div className="margem mx-auto flex h-16 max-w-6xl items-center gap-3">
          {voltar ? (
            <Link para={voltar} className="-ml-2 grid size-10 place-items-center rounded-full text-xl text-suave hover:bg-sup-2" aria-label="Voltar">
              <PiCaretLeft />
            </Link>
          ) : null}
          <Link para="/app" className="flex min-w-0 items-center gap-2.5" aria-label="Início">
            {marca ? (
              <>
                <LogoDaMarca visual={marca.visual} nome={marca.nome} tamanho={34} />
                <span className="titulo truncate text-xl">{marca.visual.nomeApp || marca.nome}</span>
              </>
            ) : (
              <Logo />
            )}
          </Link>
          <div className="ml-auto">
            <MenuConta />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl">
        {!semNav && (
          <nav aria-label="App" className="sticky top-16 hidden h-[calc(100svh-4rem)] w-56 shrink-0 flex-col gap-0.5 overflow-y-auto py-6 pr-4 pl-4 lg:flex">
            {[...ITENS.filter((i) => i.para !== '/mais'), ...MAIS].map((i) => (
              <Link key={i.para} para={i.para} aria-current={ativo(i.para) && i.para !== '/mais' ? 'page' : undefined} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-suave transition-colors hover:bg-sup-2 hover:text-texto aria-[current=page]:bg-sup-2 aria-[current=page]:text-texto">
                {i.nome}
              </Link>
            ))}
          </nav>
        )}
        <main className={`margem min-w-0 flex-1 pt-5 pb-28 lg:pb-12 ${largo ? '' : 'max-w-3xl'}`}>
          {titulo && <h1 className="titulo mb-5 text-4xl">{titulo}</h1>}
          {s.usuario ? children : <Carregando />}
        </main>
      </div>

      {!semNav && (
        <nav aria-label="App" className="fixed inset-x-0 bottom-0 z-50 border-t border-linha bg-fundo/95 backdrop-blur-md lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="mx-auto grid max-w-md grid-cols-5 px-2">
            {ITENS.map((i) =>
              i.centro ? (
                <Link key={i.para} para={i.para} className="-mt-5 flex flex-col items-center gap-1 text-[0.68rem] font-bold" aria-current={ativo(i.para) ? 'page' : undefined}>
                  <span className="grid size-14 place-items-center rounded-full bg-anilha text-2xl text-anilha-texto shadow-lg ring-4 ring-fundo">{i.icone}</span>
                  {i.nome}
                </Link>
              ) : (
                <Link key={i.para} para={i.para} aria-current={ativo(i.para) ? 'page' : undefined} className="flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-semibold text-fraco aria-[current=page]:text-texto">
                  <span className="text-2xl">{i.icone}</span>
                  {i.nome}
                </Link>
              ),
            )}
          </div>
        </nav>
      )}
    </ComMarca>
  )
}

// A tela "Mais" do celular: o resto do app
export function ListaMais() {
  return (
    <ul className="cartao divide-y divide-linha overflow-hidden">
      {MAIS.map((m) => (
        <li key={m.para}>
          <Link para={m.para} className="flex items-center justify-between px-5 py-4 font-semibold hover:bg-sup-2">
            {m.nome}
            <span className="text-fraco">›</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
