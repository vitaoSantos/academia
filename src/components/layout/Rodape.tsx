import { MARCA } from '../../data/marca'
import { Link } from '../../lib/rotas'
import { Logo } from '../ui/basicos'

export function Rodape() {
  return (
    <footer className="mt-20 border-t border-linha">
      <div className="margem mx-auto grid max-w-7xl gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-suave">{MARCA.slogan}</p>
        </div>
        <div>
          <p className="sobre">Para você</p>
          <ul className="mt-3 space-y-2 text-sm text-suave">
            <li><Link para="/explorar" className="hover:text-texto">Academias e personais perto</Link></li>
            <li><Link para="/rede" className="hover:text-texto">A rede da sua cidade</Link></li>
            <li><Link para="/exercicios" className="hover:text-texto">Exercícios em 3D</Link></li>
            <li><Link para="/cadastro" className="hover:text-texto">Criar conta grátis</Link></li>
          </ul>
        </div>
        <div>
          <p className="sobre">Para quem ensina</p>
          <ul className="mt-3 space-y-2 text-sm text-suave">
            <li><Link para="/comecar/personal" className="hover:text-texto">Sou personal</Link></li>
            <li><Link para="/comecar/academia" className="hover:text-texto">Tenho uma academia</Link></li>
            <li><Link para="/#planos" className="hover:text-texto">Planos e preços</Link></li>
          </ul>
        </div>
        <div>
          <p className="sobre">A Turma</p>
          <ul className="mt-3 space-y-2 text-sm text-suave">
            <li><a href={`mailto:${MARCA.email}`} className="hover:text-texto">{MARCA.email}</a></li>
            <li><Link para="/lab" className="hover:text-texto">Laboratório do boneco 3D</Link></li>
          </ul>
        </div>
      </div>
      <p className="margem mx-auto max-w-7xl pb-10 text-xs text-fraco">
        © {new Date().getFullYear()} {MARCA.nome}. Os exercícios em 3D mostram o movimento de referência; o seu professor ajusta para você.
      </p>
    </footer>
  )
}
