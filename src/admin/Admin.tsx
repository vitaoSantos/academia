import { createContext, useContext, useState, type FormEvent, type ReactNode } from 'react'
import { PiBuildings, PiChartBar, PiClipboardText, PiFlag, PiGearSix, PiLockSimple, PiSignOut, PiUserCircle, PiUsers } from 'react-icons/pi'
import { useAviso } from '../components/ui/Aviso'
import { Campo, Carregando, Erro, Girando, Logo } from '../components/ui/basicos'
import { admin, mensagemDeErro } from '../lib/api'
import { esquecer, useDados } from '../lib/dados'
import { Link } from '../lib/rotas'
import { useTitulo } from '../lib/titulo'
import { ContasDoAdmin, EmpresasDoAdmin, ProfissionaisDoAdmin } from './Listas'
import { Moderacao } from './Moderacao'
import { Plataforma } from './Plataforma'
import { Registro } from './Registro'
import { VisaoDoAdmin } from './Visao'

// O admin da plataforma (seção 22 do estudo): os números e a receita, as empresas, os profissionais,
// as contas, a moderação da rede, as regras (preços e limites) e o registro de cada ação. Só entra
// quem tem a senha do ADMIN_PASSWORD (e o código do autenticador, se o ADMIN_TOTP estiver ligado).

type Ctx = { demo: boolean }
const Contexto = createContext<Ctx>({ demo: true })
export const useAdmin = () => useContext(Contexto)

const ABAS: { id: string; nome: string; icone: ReactNode }[] = [
  { id: '', nome: 'Visão geral', icone: <PiChartBar /> },
  { id: 'empresas', nome: 'Empresas', icone: <PiBuildings /> },
  { id: 'profissionais', nome: 'Profissionais', icone: <PiUserCircle /> },
  { id: 'contas', nome: 'Contas', icone: <PiUsers /> },
  { id: 'moderacao', nome: 'Moderação', icone: <PiFlag /> },
  { id: 'plataforma', nome: 'Plataforma', icone: <PiGearSix /> },
  { id: 'registro', nome: 'Registro', icone: <PiClipboardText /> },
]

export default function Admin({ aba = '' }: { aba?: string }) {
  useTitulo('Admin')
  const sessao = useDados('admin-sessao', () => admin.sessao())
  const [demo, setDemo] = useState(true)
  const avisar = useAviso()
  const s = sessao.dados
  if (!s) return <div className="min-h-[100svh]">{sessao.erro ? <Erro mensagem={mensagemDeErro(sessao.erro)} aoTentar={sessao.recarregar} /> : <Carregando className="min-h-[100svh]" />}</div>
  if (!s.entrou) return <Entrada ligado={s.ligado} codigo={s.codigo} aoEntrar={() => void sessao.recarregar()} />

  const atual = ABAS.find((a) => a.id === aba)
  const sair = async () => {
    try {
      await admin.sair()
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    }
    esquecer('admin')
    await sessao.recarregar()
  }
  return (
    <Contexto.Provider value={{ demo }}>
      <div className="min-h-[100svh]">
        <header className="sticky top-0 z-50 border-b border-linha bg-fundo/90 backdrop-blur-md">
          <div className="margem mx-auto flex h-16 max-w-7xl items-center gap-3">
            <Link para="/admin" className="flex items-center gap-2">
              <Logo tamanho={26} />
              <span className="rounded-md bg-sup-3 px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wide uppercase">Admin</span>
            </Link>
            <div className="ml-auto flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-suave">
                <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
                <span className="hidden sm:inline">Com a demonstração</span>
                <span className="sm:hidden">Demo</span>
              </label>
              <button type="button" className="btn btn-sup btn-p" onClick={sair}>
                <PiSignOut /> Sair
              </button>
            </div>
          </div>
          <nav aria-label="Admin" className="sem-barra margem mx-auto flex max-w-7xl gap-1 overflow-x-auto pb-2 lg:hidden">
            {ABAS.map((a) => (
              <Link key={a.id} para={a.id ? `/admin/${a.id}` : '/admin'} aria-current={a.id === aba ? 'page' : undefined} className="chip shrink-0 aria-[current=page]:bg-texto aria-[current=page]:text-fundo">
                {a.nome}
              </Link>
            ))}
          </nav>
        </header>
        <div className="mx-auto flex max-w-7xl">
          <nav aria-label="Admin" className="sticky top-16 hidden h-[calc(100svh-4rem)] w-56 shrink-0 flex-col gap-0.5 py-6 pr-4 pl-4 lg:flex">
            {ABAS.map((a) => (
              <Link
                key={a.id}
                para={a.id ? `/admin/${a.id}` : '/admin'}
                aria-current={a.id === aba ? 'page' : undefined}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-suave transition-colors hover:bg-sup-2 hover:text-texto aria-[current=page]:bg-sup-2 aria-[current=page]:text-texto"
              >
                <span className="text-lg">{a.icone}</span> {a.nome}
              </Link>
            ))}
            <p className="mt-auto px-3 text-xs text-fraco">Cada ação fica no registro, com o motivo.</p>
          </nav>
          <main className="margem min-w-0 flex-1 pt-5 pb-16">
            {!atual ? (
              <p className="cartao p-6">Esta parte do admin não existe.</p>
            ) : aba === '' ? (
              <VisaoDoAdmin />
            ) : aba === 'empresas' ? (
              <EmpresasDoAdmin />
            ) : aba === 'profissionais' ? (
              <ProfissionaisDoAdmin />
            ) : aba === 'contas' ? (
              <ContasDoAdmin />
            ) : aba === 'moderacao' ? (
              <Moderacao />
            ) : aba === 'plataforma' ? (
              <Plataforma />
            ) : (
              <Registro />
            )}
          </main>
        </div>
      </div>
    </Contexto.Provider>
  )
}

function Entrada({ ligado, codigo, aoEntrar }: { ligado: boolean; codigo: boolean; aoEntrar: () => void }) {
  const [senha, setSenha] = useState('')
  const [numero, setNumero] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)
  const entrar = async (e: FormEvent) => {
    e.preventDefault()
    setErro('')
    setEntrando(true)
    try {
      await admin.entrar(senha, codigo ? numero : undefined)
      aoEntrar()
    } catch (err) {
      setErro(mensagemDeErro(err))
    } finally {
      setEntrando(false)
    }
  }
  return (
    <main className="margem mx-auto grid min-h-[100svh] max-w-sm place-items-center">
      <div className="w-full">
        <Logo tamanho={30} />
        <h1 className="titulo mt-6 text-4xl">Admin</h1>
        {!ligado ? (
          <div className="cartao mt-5 flex gap-3 p-5 text-sm text-suave">
            <PiLockSimple className="mt-0.5 shrink-0 text-xl text-fraco" />
            <p>
              O admin está desligado. Para ligar, defina a variável <code className="dado text-texto">ADMIN_PASSWORD</code> nas variáveis do site (e, se quiser o segundo fator, a{' '}
              <code className="dado text-texto">ADMIN_TOTP</code> em base32).
            </p>
          </div>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={entrar}>
            <Campo rotulo="Senha">
              <input className="campo" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus />
            </Campo>
            {codigo && (
              <Campo rotulo="Código do autenticador">
                <input className="campo dado tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={numero} onChange={(e) => setNumero(e.target.value.replace(/\D/g, ''))} />
              </Campo>
            )}
            {erro && (
              <p className="text-sm font-medium text-perigo" role="alert">
                {erro}
              </p>
            )}
            <button type="submit" className="btn btn-anilha btn-g w-full" disabled={entrando || !senha || (codigo && numero.length !== 6)}>
              {entrando ? <Girando /> : 'Entrar'}
            </button>
            <p className="text-xs text-fraco">Oito tentativas erradas travam o acesso por 15 minutos.</p>
          </form>
        )}
      </div>
    </main>
  )
}

// A folha de ação do admin: o que fazer e o motivo (obrigatório, fica no registro)
export function useMotivo() {
  const [motivo, setMotivo] = useState('')
  const campo = (
    <Campo rotulo="Motivo" dica="Obrigatório. Fica no registro do admin.">
      <textarea className="campo min-h-20" maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Pedido do cliente por e-mail, pagamento em atraso, conteúdo impróprio..." />
    </Campo>
  )
  return { motivo, setMotivo, campo, valido: motivo.trim().length >= 3 }
}
