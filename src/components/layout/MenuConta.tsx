import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PiBell, PiBuildings, PiChalkboardTeacher, PiChatCircleDots, PiGear, PiHouse, PiSignOut, PiUserCircle } from 'react-icons/pi'
import { Link, navegar } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { Avatar } from '../ui/basicos'

// O sino, as mensagens e o menu da conta (o app do aluno, os painéis da academia e do profissional)
export function MenuConta() {
  const s = useSessao()
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => !caixa.current?.contains(e.target as Node) && setAberto(false)
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto])
  if (!s.usuario) return null
  const u = s.usuario
  const contador = (n: number) => (n > 0 ? <span className="absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full bg-perigo px-1 text-[0.62rem] leading-4 font-bold text-white">{n > 9 ? '9+' : n}</span> : null)
  return (
    <div className="flex items-center gap-1">
      <Link para="/mensagens" className="relative grid size-10 place-items-center rounded-full text-xl text-suave hover:bg-sup-2 hover:text-texto" aria-label={`Mensagens${s.naoLidas.mensagens ? ` (${s.naoLidas.mensagens} não lidas)` : ''}`}>
        <PiChatCircleDots />
        {contador(s.naoLidas.mensagens)}
      </Link>
      <Link para="/avisos" className="relative grid size-10 place-items-center rounded-full text-xl text-suave hover:bg-sup-2 hover:text-texto" aria-label={`Avisos${s.naoLidas.avisos ? ` (${s.naoLidas.avisos} novos)` : ''}`}>
        <PiBell />
        {contador(s.naoLidas.avisos)}
      </Link>
      <div ref={caixa} className="relative">
        <button type="button" onClick={() => setAberto((a) => !a)} className="ml-1 grid place-items-center rounded-full" aria-label="Sua conta" aria-expanded={aberto}>
          <Avatar nome={u.nome} foto={u.foto} tamanho={36} />
        </button>
        {aberto && (
          <div className="absolute top-12 right-0 z-[70] w-64 overflow-hidden rounded-2xl border border-linha bg-sup p-1.5 text-sm shadow-2xl" role="menu">
            <div className="px-3 py-2.5">
              <p className="truncate font-bold">{u.nome}</p>
              <p className="truncate text-xs text-fraco">@{u.usuario}</p>
            </div>
            <Item para="/app" icone={<PiHouse />} fechar={() => setAberto(false)}>
              Meu treino
            </Item>
            {s.profissional && (
              <Item para="/pro" icone={<PiChalkboardTeacher />} fechar={() => setAberto(false)}>
                {s.profissional.personal ? 'Painel do personal' : 'Painel do professor'}
              </Item>
            )}
            {s.empresas
              .filter((e) => e.papel !== 'professor')
              .map((e) => (
                <Item key={e.slug} para={`/painel/${e.slug}`} icone={<PiBuildings />} fechar={() => setAberto(false)}>
                  <span className="truncate">{e.nome}</span>
                </Item>
              ))}
            <Item para={`/u/${u.usuario}`} icone={<PiUserCircle />} fechar={() => setAberto(false)}>
              Meu perfil
            </Item>
            <Item para="/conta" icone={<PiGear />} fechar={() => setAberto(false)}>
              Conta e privacidade
            </Item>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-suave hover:bg-sup-2 hover:text-texto"
              onClick={async () => {
                setAberto(false)
                await s.sair()
                navegar('/')
              }}
            >
              <PiSignOut className="text-lg" /> Sair
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Item({ para, icone, children, fechar }: { para: string; icone: ReactNode; children: ReactNode; fechar: () => void }) {
  return (
    <Link para={para} role="menuitem" onClick={fechar} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-sup-2">
      <span className="text-lg text-suave">{icone}</span>
      {children}
    </Link>
  )
}
