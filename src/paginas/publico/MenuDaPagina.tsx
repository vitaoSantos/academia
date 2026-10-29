import { MenuConta } from '../../components/layout/MenuConta'
import { LogoDaMarca } from '../../components/marca/Marca'
import { Simbolo } from '../../components/ui/basicos'
import { Link, useEndereco } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import type { Visual } from '../../shared/tipos'

// O topo das páginas com marca (a academia, o personal): a marca na frente e a Turma discreta, com a
// conta (ou entrar) do lado
export function MenuDaPagina({ nome, visual }: { nome: string; visual: Visual }) {
  const s = useSessao()
  const { caminho, busca } = useEndereco()
  const volta = encodeURIComponent(caminho + (busca.toString() ? `?${busca}` : ''))
  return (
    <header className="sticky top-0 z-50 border-b border-linha bg-fundo/90 backdrop-blur-md">
      <div className="margem mx-auto flex h-16 max-w-5xl items-center gap-3">
        <button type="button" onClick={() => scrollTo({ top: 0, behavior: 'smooth' })} className="flex min-w-0 items-center gap-2.5" aria-label={`${nome}, topo da página`}>
          <LogoDaMarca visual={visual} nome={nome} tamanho={32} />
          <span className="titulo truncate text-xl">{nome}</span>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <Link para="/" className="hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold text-fraco hover:text-texto sm:flex" aria-label="Turma, a plataforma">
            <Simbolo tamanho={18} /> na Turma
          </Link>
          {s.usuario ? (
            <MenuConta />
          ) : (
            !s.carregando && (
              <Link para={`/entrar?volta=${volta}`} className="btn btn-sup btn-p">
                Entrar
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  )
}
