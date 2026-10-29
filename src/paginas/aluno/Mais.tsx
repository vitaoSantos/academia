import { PiArrowRight } from 'react-icons/pi'
import { AppAluno, ListaMais } from '../../components/layout/AppAluno'
import { Avatar } from '../../components/ui/basicos'
import { Link } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'

// O "Mais" do celular: o perfil e o resto do app
export default function Mais() {
  useTitulo('Mais')
  const s = useSessao()
  const u = s.usuario
  return (
    <AppAluno>
      {u && (
        <Link para={`/u/${u.usuario}`} className="cartao mb-4 flex items-center gap-3 p-4 hover:border-linha-2">
          <Avatar nome={u.nome} foto={u.foto} tamanho={52} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-lg font-bold">{u.nome}</span>
            <span className="block text-sm text-suave">@{u.usuario} · ver o meu perfil</span>
          </span>
          <PiArrowRight className="text-fraco" />
        </Link>
      )}
      <ListaMais />
      {(s.profissional || s.empresas.some((e) => e.papel !== 'professor')) && (
        <ul className="cartao mt-4 divide-y divide-linha overflow-hidden">
          {s.profissional && (
            <li>
              <Link para="/pro" className="flex items-center justify-between px-5 py-4 font-semibold hover:bg-sup-2">
                {s.profissional.personal ? 'Painel do personal' : 'Painel do professor'} <span className="text-fraco">›</span>
              </Link>
            </li>
          )}
          {s.empresas
            .filter((e) => e.papel !== 'professor')
            .map((e) => (
              <li key={e.slug}>
                <Link para={`/painel/${e.slug}`} className="flex items-center justify-between px-5 py-4 font-semibold hover:bg-sup-2">
                  Painel · {e.nome} <span className="text-fraco">›</span>
                </Link>
              </li>
            ))}
        </ul>
      )}
    </AppAluno>
  )
}
