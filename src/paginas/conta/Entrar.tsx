import { useState, type FormEvent } from 'react'
import { Experimentar } from '../../components/landing/Capa'
import { Topo } from '../../components/layout/Topo'
import { Campo, Girando } from '../../components/ui/basicos'
import { mensagemDeErro, sessao } from '../../lib/api'
import { Link, navegar, useEndereco } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'

// Entrar com o e-mail ou o celular e a senha (e voltar para onde estava)
export default function Entrar() {
  useTitulo('Entrar')
  const s = useSessao()
  const { busca } = useEndereco()
  const volta = destinoSeguro(busca.get('volta'))
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      const r = await sessao.entrar(login, senha)
      s.aplicar(r)
      navegar(volta ?? destinoDe(r), { substituir: true })
    } catch (err) {
      setErro(mensagemDeErro(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-[100svh]">
      <Topo />
      <main className="margem mx-auto max-w-md py-12">
        <h1 className="titulo text-5xl">Entrar</h1>
        <p className="mt-2 text-suave">Com o e-mail ou o celular da sua conta.</p>
        <form onSubmit={enviar} className="mt-8 space-y-4">
          <Campo rotulo="E-mail ou celular">
            <input className="campo" autoComplete="username" inputMode="email" value={login} onChange={(e) => setLogin(e.target.value)} required autoFocus />
          </Campo>
          <Campo rotulo="Senha">
            <input className="campo" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </Campo>
          {erro && (
            <p className="text-sm font-medium text-perigo" role="alert">
              {erro}
            </p>
          )}
          <button className="btn btn-anilha btn-g w-full" disabled={enviando}>
            {enviando ? <Girando /> : 'Entrar'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-suave">
          Ainda não tem conta?{' '}
          <Link para={`/cadastro${volta ? `?volta=${encodeURIComponent(volta)}` : ''}`} className="font-bold text-anilha-legivel">
            Criar conta grátis
          </Link>
        </p>
      </main>
      <Experimentar />
    </div>
  )
}

// Para onde vai quem entra: quem tem academia vai ao painel; o profissional, ao dele; o aluno, ao app
export function destinoDe(r: { empresas?: { slug: string; papel: string }[]; profissional?: unknown }) {
  const gestor = r.empresas?.find((e) => e.papel !== 'professor')
  if (gestor) return `/painel/${gestor.slug}`
  if (r.profissional) return '/pro'
  return '/app'
}

// Só endereços do próprio site (sem "//outro-site")
export const destinoSeguro = (v: string | null) => (v && v.startsWith('/') && !v.startsWith('//') ? v : null)
