import { useState, type FormEvent } from 'react'
import { PiInfo } from 'react-icons/pi'
import { Topo } from '../../components/layout/Topo'
import { EscolherCidade } from '../../components/local/EscolherCidade'
import { Campo, Girando, Interruptor } from '../../components/ui/basicos'
import { mensagemDeErro, sessao } from '../../lib/api'
import { localAgora } from '../../lib/local'
import { Link, navegar, useEndereco } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import { nomeCidade } from '../../shared/geo'
import { SENHA_MINIMA } from '../../shared/texto'
import type { Cidade } from '../../shared/tipos'
import { destinoSeguro } from './Entrar'

// Criar a conta (o aluno; o professor também começa aqui e depois aceita o convite da academia)
export default function Cadastro() {
  const { busca } = useEndereco()
  const professor = busca.get('papel') === 'professor'
  useTitulo(professor ? 'Conta de professor' : 'Criar conta')
  const s = useSessao()
  const volta = destinoSeguro(busca.get('volta'))
  const local = localAgora()
  const [nome, setNome] = useState(busca.get('nome') ?? '') // o convite já traz o nome
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [cidade, setCidade] = useState<Cidade | null>(local.escolhido ? local.cidade : null)
  const [publico, setPublico] = useState(false)
  const [aceite, setAceite] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!aceite) return setErro('Para criar a conta, aceite os termos e a política de privacidade.')
    setErro('')
    setEnviando(true)
    try {
      s.aplicar(await sessao.cadastro({ nome, login, senha, publico, ...(cidade ? { cidade } : {}) }))
      navegar(volta ?? (professor ? '/comecar/personal?professor=1' : '/app'), { substituir: true })
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
        <h1 className="titulo text-5xl">{professor ? 'Sou professor' : 'Criar conta'}</h1>
        <p className="mt-2 text-suave">{professor ? 'Uma conta só, para todas as academias onde você dá aula.' : 'Grátis. Leva um minuto.'}</p>
        {professor && (
          <p className="cartao mt-5 flex gap-3 p-4 text-sm text-suave">
            <PiInfo className="mt-0.5 shrink-0 text-lg text-anilha-legivel" />
            <span>Depois, abra o link de convite que a academia mandou: você entra na equipe e passa a aparecer na página dela. Sem convite ainda? Monte o seu perfil e peça para a academia te convidar.</span>
          </p>
        )}
        <form onSubmit={enviar} className="mt-8 space-y-4">
          <Campo rotulo="Seu nome">
            <input className="campo" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} autoFocus />
          </Campo>
          <Campo rotulo="E-mail ou celular" dica="Para entrar e recuperar a conta. Não aparece para ninguém.">
            <input className="campo" autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} required />
          </Campo>
          <Campo rotulo="Senha" dica={`Pelo menos ${SENHA_MINIMA} caracteres.`}>
            <input className="campo" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={SENHA_MINIMA} />
          </Campo>
          <div>
            <span className="rotulo">Sua cidade</span>
            <EscolherCidade inicial={cidade ? nomeCidade(cidade) : ''} aoEscolher={setCidade} />
            <span className="mt-1.5 block text-xs text-fraco">Para mostrar a rede e as academias da sua região.</span>
          </div>
          <div className="cartao p-4">
            <Interruptor ligado={publico} aoMudar={setPublico} rotulo="Perfil público" descricao="Desligado: só quem você aprovar vê os seus treinos e posts. Dá para mudar quando quiser." />
          </div>
          <label className="flex items-start gap-3 text-sm text-suave">
            <input type="checkbox" className="mt-1 size-4 accent-[var(--anilha)]" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
            <span>Li e aceito os termos de uso e a política de privacidade. As minhas medidas e fotos de evolução são só minhas, e eu escolho quem pode ver.</span>
          </label>
          {erro && (
            <p className="text-sm font-medium text-perigo" role="alert">
              {erro}
            </p>
          )}
          <button className="btn btn-anilha btn-g w-full" disabled={enviando}>
            {enviando ? <Girando /> : 'Criar conta'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-suave">
          Já tem conta?{' '}
          <Link para={`/entrar${volta ? `?volta=${encodeURIComponent(volta)}` : ''}`} className="font-bold text-anilha-legivel">
            Entrar
          </Link>
        </p>
      </main>
    </div>
  )
}
