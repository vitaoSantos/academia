import { createContext, useContext, useEffect, type ReactNode } from 'react'
import {
  PiBuildings,
  PiCalendarDots,
  PiCaretLeft,
  PiChalkboardTeacher,
  PiChartBar,
  PiChatCircleDots,
  PiClipboardText,
  PiConfetti,
  PiCrown,
  PiPaintBrush,
  PiStar,
  PiSquaresFour,
  PiUserPlus,
  PiUsersThree,
} from 'react-icons/pi'
import { MenuConta } from '../components/layout/MenuConta'
import { ComMarca, LogoDaMarca } from '../components/marca/Marca'
import { Carregando, Erro, Selo } from '../components/ui/basicos'
import { useMarcaNoDocumento } from '../hooks/useMarcaNoDocumento'
import { mensagemDeErro, painel, type EmpresaDoPainel } from '../lib/api'
import { useDados } from '../lib/dados'
import { Link, navegar, useEndereco } from '../lib/rotas'
import { useSessao } from '../lib/sessao'
import { NOMES_PLANO } from '../shared/planos'
import { temaDe } from '../shared/temas'
import type { Empresa, PapelEmpresa } from '../shared/tipos'
import { dataDe, diasEntre, hoje } from '../shared/tempo'

// O painel da academia ou da rede (seção 7 do estudo). Cada papel vê o que é dele: o dono e o
// gerente configuram tudo; a recepção cuida dos alunos, dos contatos e da caixa de mensagens; o
// professor vê os alunos, monta as fichas, gradua e marca a presença.

export const PODE = {
  configurar: ['dono', 'gerente'] as PapelEmpresa[],
  alunos: ['dono', 'gerente', 'recepcao'] as PapelEmpresa[],
  treinar: ['dono', 'gerente', 'professor'] as PapelEmpresa[],
  conversar: ['dono', 'gerente', 'recepcao'] as PapelEmpresa[],
}

export const NOMES_PAPEL: Record<PapelEmpresa, string> = { dono: 'Dono', gerente: 'Gerente', recepcao: 'Recepção', professor: 'Professor' }

type Contexto = EmpresaDoPainel & { slug: string; mudar: (e: Empresa) => void; recarregar: () => Promise<void> }
const Ctx = createContext<Contexto | null>(null)
export const usePainel = () => useContext(Ctx)!

type Item = { secao: string; nome: string; icone: ReactNode; papeis?: PapelEmpresa[]; link?: string }

const ITENS: Item[] = [
  { secao: '', nome: 'Visão geral', icone: <PiChartBar /> },
  { secao: 'alunos', nome: 'Alunos', icone: <PiUsersThree /> },
  { secao: 'grade', nome: 'Grade de aulas', icone: <PiCalendarDots /> },
  { secao: 'fichas', nome: 'Fichas', icone: <PiClipboardText />, papeis: PODE.treinar },
  { secao: 'contatos', nome: 'Aula experimental', icone: <PiUserPlus />, papeis: PODE.alunos },
  { secao: 'mensagens', nome: 'Mensagens', icone: <PiChatCircleDots />, papeis: PODE.conversar },
  { secao: 'modalidades', nome: 'Modalidades', icone: <PiSquaresFour />, papeis: PODE.configurar },
  { secao: 'unidades', nome: 'Unidades', icone: <PiBuildings />, papeis: PODE.configurar },
  { secao: 'equipe', nome: 'Equipe', icone: <PiChalkboardTeacher />, papeis: PODE.configurar },
  { secao: 'eventos', nome: 'Eventos', icone: <PiConfetti />, papeis: PODE.configurar },
  { secao: 'avaliacoes', nome: 'Avaliações', icone: <PiStar />, papeis: PODE.configurar },
  { secao: 'aparencia', nome: 'Página e app', icone: <PiPaintBrush />, papeis: PODE.configurar },
  { secao: 'plano', nome: 'Plano', icone: <PiCrown />, papeis: ['dono'] },
]

// Os da barra de baixo no celular (o resto fica no "Mais")
const NO_CELULAR = ['', 'alunos', 'grade', 'mensagens']

export function AppPainel({ slug, children, titulo, voltar, acoes }: { slug: string; children: (c: Contexto) => ReactNode; titulo?: ReactNode; voltar?: string; acoes?: (c: Contexto) => ReactNode }) {
  const s = useSessao()
  const { caminho } = useEndereco()
  const dados = useDados(s.usuario ? `painel:${slug}` : null, () => painel.empresa(slug))
  const d = dados.dados
  const tema = temaDe(d?.empresa.visual)
  useMarcaNoDocumento(d ? { slug, nome: d.empresa.nome, cor: tema.destaque, fundo: tema.fundo } : null)

  useEffect(() => {
    if (!s.carregando && !s.usuario) navegar(`/entrar?volta=${encodeURIComponent(location.pathname + location.search)}`, { substituir: true })
  }, [s.carregando, s.usuario])

  if (!d) {
    return (
      <div className="min-h-[100svh]">
        {dados.erro ? (
          <div className="mx-auto max-w-md pt-24">
            <Erro mensagem={mensagemDeErro(dados.erro)} />
            <p className="text-center">
              <Link para="/app" className="text-sm underline">
                Voltar para o app
              </Link>
            </p>
          </div>
        ) : (
          <Carregando className="min-h-[100svh]" />
        )}
      </div>
    )
  }

  const c: Contexto = { ...d, slug, mudar: (empresa) => dados.definir((x) => ({ ...x!, empresa })), recarregar: dados.recarregar }
  const pode = (i: Item) => !i.papeis || i.papeis.includes(d.papel)
  const itens = ITENS.filter(pode)
  const base = `/painel/${slug}`
  const linkDe = (i: Item) => (i.secao === 'mensagens' ? `/mensagens?como=${slug}` : i.secao ? `${base}/${i.secao}` : base)
  const ativo = (i: Item) => (i.secao ? caminho.startsWith(`${base}/${i.secao}`) : caminho === base)
  const e = d.empresa
  const teste = e.plano === 'teste' && e.testeAte ? diasEntre(hoje(), dataDe(e.testeAte)) : null

  return (
    <Ctx.Provider value={c}>
      <ComMarca visual={e.visual} className="min-h-[100svh]">
        <header className="sticky top-0 z-50 border-b border-linha bg-fundo/90 backdrop-blur-md">
          <div className="margem mx-auto flex h-16 max-w-7xl items-center gap-3">
            {voltar && (
              <Link para={voltar} className="-ml-2 grid size-10 place-items-center rounded-full text-xl text-suave hover:bg-sup-2" aria-label="Voltar">
                <PiCaretLeft />
              </Link>
            )}
            <Link para={base} className="flex min-w-0 items-center gap-2.5">
              <LogoDaMarca visual={e.visual} nome={e.nome} tamanho={34} />
              <span className="min-w-0">
                <span className="titulo block truncate text-lg leading-tight">{e.nome}</span>
                <span className="block text-[0.65rem] font-semibold tracking-wide text-fraco uppercase">Painel · {NOMES_PAPEL[d.papel]}</span>
              </span>
            </Link>
            <div className="ml-auto">
              <MenuConta />
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-7xl">
          <nav aria-label="Painel" className="sticky top-16 hidden h-[calc(100svh-4rem)] w-60 shrink-0 flex-col gap-0.5 overflow-y-auto py-6 pr-4 pl-4 lg:flex">
            {itens.map((i) => (
              <Link
                key={i.secao}
                para={linkDe(i)}
                aria-current={ativo(i) ? 'page' : undefined}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-suave transition-colors hover:bg-sup-2 hover:text-texto aria-[current=page]:bg-sup-2 aria-[current=page]:text-texto"
              >
                <span className="text-lg">{i.icone}</span> {i.nome}
              </Link>
            ))}
            <div className="mt-auto space-y-0.5 pt-6">
              <p className="px-3 text-xs text-fraco">
                {NOMES_PLANO[e.plano]}
                {teste !== null ? ` · ${teste} dias` : ''} · {e.unidades.filter((u) => u.ativa).length} {e.unidades.filter((u) => u.ativa).length === 1 ? 'unidade' : 'unidades'}
              </p>
              <Link para={`/${slug}`} className="block rounded-xl px-3 py-2 text-sm text-suave hover:bg-sup-2 hover:text-texto">
                Ver a página
              </Link>
              {s.profissional && (
                <Link para="/pro" className="block rounded-xl px-3 py-2 text-sm text-suave hover:bg-sup-2 hover:text-texto">
                  O meu painel de professor
                </Link>
              )}
            </div>
          </nav>
          <main className="margem min-w-0 flex-1 pt-5 pb-28 lg:pb-12">
            {(titulo || acoes) && (
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                {titulo && <h1 className="titulo text-4xl">{titulo}</h1>}
                {acoes && <div className="flex flex-wrap gap-2">{acoes(c)}</div>}
              </div>
            )}
            {e.status === 'teste' && teste !== null && teste <= 7 && d.papel === 'dono' && (
              <Link para={`${base}/plano`} className="cartao mb-5 flex items-center gap-3 border-alerta p-4 text-sm">
                <PiCrown className="shrink-0 text-xl text-alerta" />
                <span className="flex-1">
                  <span className="font-bold">O teste acaba em {teste} dias.</span> Escolha o plano para seguir com tudo.
                </span>
              </Link>
            )}
            {children(c)}
          </main>
        </div>

        <nav aria-label="Painel" className="fixed inset-x-0 bottom-0 z-50 border-t border-linha bg-fundo/95 backdrop-blur-md lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="mx-auto grid max-w-md px-2" style={{ gridTemplateColumns: `repeat(${itens.filter((i) => NO_CELULAR.includes(i.secao)).length + 1}, minmax(0, 1fr))` }}>
            {itens
              .filter((i) => NO_CELULAR.includes(i.secao))
              .map((i) => (
                <Link
                  key={i.secao}
                  para={linkDe(i)}
                  aria-current={ativo(i) ? 'page' : undefined}
                  className="flex flex-col items-center gap-1 py-2.5 text-[0.65rem] font-semibold text-fraco aria-[current=page]:text-anilha-legivel"
                >
                  <span className="text-2xl">{i.icone}</span>
                  <span className="truncate">{i.nome.split(' ')[0]}</span>
                </Link>
              ))}
            <Link
              para={`${base}/mais`}
              aria-current={caminho === `${base}/mais` ? 'page' : undefined}
              className="flex flex-col items-center gap-1 py-2.5 text-[0.65rem] font-semibold text-fraco aria-[current=page]:text-anilha-legivel"
            >
              <span className="text-2xl">
                <PiSquaresFour />
              </span>
              Mais
            </Link>
          </div>
        </nav>
      </ComMarca>
    </Ctx.Provider>
  )
}

// O "Mais" do celular: o resto do painel
export function MaisDoPainel({ c }: { c: Contexto }) {
  const itens = ITENS.filter((i) => (!i.papeis || i.papeis.includes(c.papel)) && !NO_CELULAR.includes(i.secao))
  return (
    <>
      <h1 className="titulo mb-5 text-4xl">Mais</h1>
      <ul className="cartao divide-y divide-linha overflow-hidden">
        {itens.map((i) => (
          <li key={i.secao}>
            <Link para={`/painel/${c.slug}/${i.secao}`} className="flex items-center gap-3 px-5 py-4 font-semibold hover:bg-sup-2">
              <span className="text-xl text-suave">{i.icone}</span>
              <span className="flex-1">{i.nome}</span>
              <span className="text-fraco">›</span>
            </Link>
          </li>
        ))}
        <li>
          <Link para={`/${c.slug}`} className="flex items-center justify-between px-5 py-4 font-semibold hover:bg-sup-2">
            Ver a página <span className="text-fraco">›</span>
          </Link>
        </li>
        {c.empresa.status === 'teste' && (
          <li className="px-5 py-4">
            <Selo tom="alerta">Teste grátis</Selo>
          </li>
        )}
      </ul>
    </>
  )
}
