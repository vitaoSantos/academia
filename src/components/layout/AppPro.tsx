import { useEffect, type ReactNode } from 'react'
import { PiBuildings, PiCalendarBlank, PiCaretLeft, PiChatCircleDots, PiClipboardText, PiHouse, PiIdentificationCard, PiUsersThree } from 'react-icons/pi'
import { useMarcaNoDocumento } from '../../hooks/useMarcaNoDocumento'
import { Link, navegar, useEndereco } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { temaDe } from '../../shared/temas'
import { ComMarca, LogoDaMarca } from '../marca/Marca'
import { Carregando, Selo } from '../ui/basicos'
import { MenuConta } from './MenuConta'

// O painel do profissional (personal e professor): o dia, os alunos, as fichas, a agenda e a página.
// Veste a marca do personal (é o app dele também).

const ITENS = [
  { para: '/pro', nome: 'Hoje', icone: <PiHouse /> },
  { para: '/pro/alunos', nome: 'Alunos', icone: <PiUsersThree /> },
  { para: '/pro/fichas', nome: 'Fichas', icone: <PiClipboardText /> },
  { para: '/pro/agenda', nome: 'Agenda', icone: <PiCalendarBlank /> },
  { para: '/pro/perfil', nome: 'Página', icone: <PiIdentificationCard /> },
]

export function AppPro({ children, titulo, voltar, acoes }: { children: ReactNode; titulo?: ReactNode; voltar?: string; acoes?: ReactNode }) {
  const s = useSessao()
  const { caminho } = useEndereco()
  const p = s.profissional
  const tema = temaDe(p?.visual)
  useMarcaNoDocumento(p?.personal ? { slug: p.slug, nome: p.nome, cor: tema.destaque, fundo: tema.fundo } : null)

  useEffect(() => {
    if (s.carregando) return
    if (!s.usuario) navegar(`/entrar?volta=${encodeURIComponent(location.pathname + location.search)}`, { substituir: true })
    else if (!s.profissional) navegar('/comecar/personal', { substituir: true })
  }, [s.carregando, s.usuario, s.profissional])

  const ativo = (para: string) => (para === '/pro' ? caminho === '/pro' : caminho.startsWith(para))
  const academias = s.empresas.filter((e) => e.papel === 'professor' || e.papel === 'gerente' || e.papel === 'dono')

  return (
    <ComMarca visual={p?.visual} className="min-h-[100svh]">
      <header className="sticky top-0 z-50 border-b border-linha bg-fundo/90 backdrop-blur-md">
        <div className="margem mx-auto flex h-16 max-w-7xl items-center gap-3">
          {voltar && (
            <Link para={voltar} className="-ml-2 grid size-10 place-items-center rounded-full text-xl text-suave hover:bg-sup-2" aria-label="Voltar">
              <PiCaretLeft />
            </Link>
          )}
          <Link para="/pro" className="flex min-w-0 items-center gap-2.5">
            {p && <LogoDaMarca visual={p.visual} nome={p.nome} tamanho={34} />}
            <span className="min-w-0">
              <span className="titulo block truncate text-lg leading-tight">{p?.personal ? p.visual.nomeApp || p.nome : 'Painel do professor'}</span>
              <span className="block text-[0.65rem] font-semibold tracking-wide text-fraco uppercase">{p?.personal ? 'Painel do personal' : p?.nome}</span>
            </span>
          </Link>
          <div className="ml-auto">
            <MenuConta />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <nav aria-label="Painel" className="sticky top-16 hidden h-[calc(100svh-4rem)] w-60 shrink-0 flex-col gap-0.5 overflow-y-auto py-6 pr-4 pl-4 lg:flex">
          {ITENS.map((i) => (
            <Link key={i.para} para={i.para} aria-current={ativo(i.para) ? 'page' : undefined} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-suave transition-colors hover:bg-sup-2 hover:text-texto aria-[current=page]:bg-sup-2 aria-[current=page]:text-texto">
              <span className="text-lg">{i.icone}</span> {i.nome}
            </Link>
          ))}
          <Link para="/mensagens" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-suave hover:bg-sup-2 hover:text-texto">
            <span className="text-lg">
              <PiChatCircleDots />
            </span>
            Mensagens {s.naoLidas.mensagens > 0 && <Selo tom="marca">{s.naoLidas.mensagens}</Selo>}
          </Link>
          {academias.length > 0 && (
            <>
              <p className="mt-5 mb-1 px-3 text-[0.65rem] font-bold tracking-widest text-fraco uppercase">Onde dá aula</p>
              {academias.map((e) => (
                <Link key={e.slug} para={`/painel/${e.slug}`} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-suave hover:bg-sup-2 hover:text-texto">
                  <PiBuildings className="shrink-0 text-lg" /> <span className="truncate">{e.nome}</span>
                </Link>
              ))}
            </>
          )}
          <div className="mt-auto space-y-0.5 pt-6">
            {p && (
              <Link para={`/${p.slug}`} className="block rounded-xl px-3 py-2 text-sm text-suave hover:bg-sup-2 hover:text-texto">
                Ver a minha página
              </Link>
            )}
            <Link para="/app" className="block rounded-xl px-3 py-2 text-sm text-suave hover:bg-sup-2 hover:text-texto">
              O meu treino (aluno)
            </Link>
          </div>
        </nav>
        <main className="margem min-w-0 flex-1 pt-5 pb-28 lg:pb-12">
          {(titulo || acoes) && (
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              {titulo && <h1 className="titulo text-4xl">{titulo}</h1>}
              {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
            </div>
          )}
          {s.usuario && s.profissional ? children : <Carregando />}
        </main>
      </div>

      <nav aria-label="Painel" className="fixed inset-x-0 bottom-0 z-50 border-t border-linha bg-fundo/95 backdrop-blur-md lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="mx-auto grid max-w-md grid-cols-5 px-2">
          {ITENS.map((i) => (
            <Link key={i.para} para={i.para} aria-current={ativo(i.para) ? 'page' : undefined} className="flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-semibold text-fraco aria-[current=page]:text-anilha-legivel">
              <span className="text-2xl">{i.icone}</span>
              {i.nome}
            </Link>
          ))}
        </div>
      </nav>
    </ComMarca>
  )
}
