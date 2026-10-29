import { useState } from 'react'
import { PiList, PiX } from 'react-icons/pi'
import { Link, useEndereco } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { Logo } from '../ui/basicos'
import { MenuConta } from './MenuConta'

// O topo da plataforma (a landing, o mapa, a rede, as páginas públicas sem marca)

const LINKS = [
  { para: '/explorar', nome: 'Explorar' },
  { para: '/rede', nome: 'Rede' },
  { para: '/exercicios', nome: 'Exercícios' },
  { para: '/#planos', nome: 'Planos' },
]

export function Topo({ transparente = false }: { transparente?: boolean }) {
  const s = useSessao()
  const { caminho } = useEndereco()
  const [menu, setMenu] = useState(false)
  return (
    <header className={`sticky top-0 z-50 ${transparente ? 'bg-transparent' : 'border-b border-linha bg-fundo/85 backdrop-blur-md'}`}>
      <div className="margem mx-auto flex h-16 max-w-7xl items-center gap-4">
        <Link para="/" aria-label="Turma, início" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Principal" className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.para} para={l.para} aria-current={caminho === l.para ? 'page' : undefined} className="rounded-full px-3 py-2 text-sm font-semibold text-suave transition-colors hover:text-texto aria-[current=page]:text-texto">
              {l.nome}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {s.usuario ? (
            <MenuConta />
          ) : (
            !s.carregando && (
              <>
                <Link para="/entrar" className="btn btn-fantasma btn-p hidden sm:inline-flex">
                  Entrar
                </Link>
                <Link para="/cadastro" className="btn btn-anilha btn-p">
                  Criar conta
                </Link>
              </>
            )
          )}
          <button type="button" className="grid size-10 place-items-center rounded-full text-xl text-suave hover:bg-sup-2 md:hidden" aria-label={menu ? 'Fechar o menu' : 'Abrir o menu'} aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            {menu ? <PiX /> : <PiList />}
          </button>
        </div>
      </div>
      {menu && (
        <nav aria-label="Principal" className="margem border-t border-linha bg-fundo pb-4 md:hidden">
          {LINKS.map((l) => (
            <Link key={l.para} para={l.para} onClick={() => setMenu(false)} className="block border-b border-linha py-3.5 text-base font-semibold">
              {l.nome}
            </Link>
          ))}
          {!s.usuario && (
            <Link para="/entrar" onClick={() => setMenu(false)} className="block py-3.5 text-base font-semibold text-suave">
              Já tenho conta: entrar
            </Link>
          )}
        </nav>
      )}
    </header>
  )
}
