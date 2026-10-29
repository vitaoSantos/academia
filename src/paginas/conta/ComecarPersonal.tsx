import { useState, type KeyboardEvent } from 'react'
import { PiChalkboardTeacher, PiUserCircleCheck, PiX } from 'react-icons/pi'
import { Topo } from '../../components/layout/Topo'
import { EscolherCidade } from '../../components/local/EscolherCidade'
import { ComMarca, LogoDaMarca } from '../../components/marca/Marca'
import { EscolherEstilo } from '../../components/marca/EscolherEstilo'
import { EscolherModalidades } from '../../components/modalidades/EscolherModalidades'
import { Campo, Girando, Interruptor } from '../../components/ui/basicos'
import { mensagemDeErro, sessao } from '../../lib/api'
import { localAgora } from '../../lib/local'
import { navegar, useEndereco } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import { corValida } from '../../shared/cores'
import { nomeCidade } from '../../shared/geo'
import { ORDEM_TEMAS } from '../../shared/temas'
import { SENHA_MINIMA } from '../../shared/texto'
import type { Cidade, PresetVisual } from '../../shared/tipos'

// O perfil profissional: o personal (atende por conta própria, 30 dias grátis) ou o professor (dá
// aula nas academias que o convidam). Uma conta só para os dois.

const SUGESTOES = ['Hipertrofia', 'Emagrecimento', 'Força', 'Idosos', 'Gestantes', 'Reabilitação', 'Corrida', 'Funcional', 'Mobilidade', 'Performance']

export default function ComecarPersonal() {
  const { busca } = useEndereco()
  const s = useSessao()
  const [personal, setPersonal] = useState(busca.get('professor') !== '1')
  useTitulo(personal ? 'Sou personal' : 'Perfil de professor')
  const local = localAgora()
  const [passo, setPasso] = useState(0)
  const [cref, setCref] = useState('')
  const [especialidades, setEspecialidades] = useState<string[]>([])
  const [novaEsp, setNovaEsp] = useState('')
  const [modalidades, setModalidades] = useState<string[]>(['musculacao'])
  const [cidade, setCidade] = useState<Cidade | null>(s.usuario?.cidade ?? (local.escolhido ? local.cidade : null))
  const [raioKm, setRaioKm] = useState(15)
  const [online, setOnline] = useState(false)
  const [publico, setPublico] = useState(true)
  const [bio, setBio] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [instagram, setInstagram] = useState('')
  const estilo = busca.get('estilo') as PresetVisual | null
  const [visual, setVisual] = useState<{ preset: PresetVisual; destaque?: string }>({ preset: estilo && ORDEM_TEMAS.includes(estilo) ? estilo : 'neon', ...(corValida(`#${busca.get('cor')}`) ? { destaque: `#${busca.get('cor')}` } : {}) })
  const [conta, setConta] = useState({ nome: '', login: '', senha: '' })
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const passos = ['Como você atende', 'Onde e como falar com você', ...(personal ? ['A sua marca'] : []), ...(s.usuario ? [] : ['A sua conta'])]
  const ultimo = passo === passos.length - 1
  const nome = s.usuario?.nome ?? conta.nome

  const addEsp = (texto: string) => {
    const t = texto.trim()
    if (t && !especialidades.includes(t) && especialidades.length < 8) setEspecialidades([...especialidades, t])
    setNovaEsp('')
  }

  const terminar = async () => {
    setErro('')
    setEnviando(true)
    try {
      if (!s.usuario) s.aplicar(await sessao.cadastro({ nome: conta.nome, login: conta.login, senha: conta.senha, ...(cidade ? { cidade } : {}) }))
      const r = await sessao.profissional({ personal, cref: cref || undefined, especialidades, modalidades, ...(cidade ? { cidade } : {}), raioKm, online, publico, bio, whatsapp: whatsapp || undefined, instagram: instagram || undefined, visual })
      s.aplicar(r)
      navegar('/pro?novo=1', { substituir: true })
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  }

  const etapa = passos[passo]
  const podeSeguir = etapa === 'Onde e como falar com você' ? !!cidade : etapa === 'A sua conta' ? conta.nome.trim().length >= 2 && !!conta.login && conta.senha.length >= SENHA_MINIMA : modalidades.length > 0

  if (s.profissional && !enviando)
    return (
      <div className="min-h-[100svh]">
        <Topo />
        <main className="margem mx-auto max-w-md py-16 text-center">
          <h1 className="titulo text-4xl">Você já tem o perfil profissional</h1>
          <button type="button" className="btn btn-anilha btn-g mt-6" onClick={() => navegar('/pro')}>
            Abrir o meu painel
          </button>
        </main>
      </div>
    )

  return (
    <div className="min-h-[100svh]">
      <Topo />
      <main className="margem mx-auto max-w-2xl py-10">
        <p className="sobre">{personal ? '30 dias com tudo do Premium, sem cartão' : 'Grátis para o professor'}</p>
        <h1 className="titulo mt-2 text-5xl">{personal ? 'Sou personal' : 'Perfil de professor'}</h1>

        <ol className="mt-6 flex gap-1.5" aria-label="Passos">
          {passos.map((p, i) => (
            <li key={p} className="flex-1" aria-current={i === passo ? 'step' : undefined}>
              <span className={`block h-1.5 rounded-full ${i <= passo ? 'bg-anilha' : 'bg-sup-3'}`} />
              <span className={`mt-2 hidden text-xs font-semibold sm:block ${i === passo ? 'text-texto' : 'text-fraco'}`}>{p}</span>
            </li>
          ))}
        </ol>

        <div className="mt-8 space-y-6">
          {etapa === 'Como você atende' && (
            <>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Como você atende">
                <button type="button" role="radio" aria-checked={personal} onClick={() => setPersonal(true)} className="cartao flex gap-3 p-4 text-left aria-checked:border-anilha aria-checked:ring-1 aria-checked:ring-anilha">
                  <PiUserCircleCheck className="shrink-0 text-2xl text-anilha-legivel" />
                  <span>
                    <span className="font-bold">Personal</span>
                    <span className="mt-1 block text-xs text-suave">Tenho os meus alunos: app com a minha marca, agenda e plano mensal.</span>
                  </span>
                </button>
                <button type="button" role="radio" aria-checked={!personal} onClick={() => setPersonal(false)} className="cartao flex gap-3 p-4 text-left aria-checked:border-anilha aria-checked:ring-1 aria-checked:ring-anilha">
                  <PiChalkboardTeacher className="shrink-0 text-2xl text-anilha-legivel" />
                  <span>
                    <span className="font-bold">Professor de academia</span>
                    <span className="mt-1 block text-xs text-suave">Dou aula onde as academias me convidam. Grátis para mim.</span>
                  </span>
                </button>
              </div>
              <Campo rotulo="CREF" dica="Assim: 012345-G/MG. Aparece na sua página.">
                <input className="campo" value={cref} onChange={(e) => setCref(e.target.value)} placeholder="012345-G/MG" />
              </Campo>
              <div>
                <span className="rotulo">Especialidades</span>
                <div className="flex flex-wrap gap-1.5">
                  {especialidades.map((e) => (
                    <button key={e} type="button" className="chip" aria-pressed onClick={() => setEspecialidades(especialidades.filter((x) => x !== e))} aria-label={`Tirar ${e}`}>
                      {e} <PiX />
                    </button>
                  ))}
                </div>
                <input
                  className="campo mt-2"
                  value={novaEsp}
                  placeholder="Escreva e aperte Enter"
                  onChange={(e) => setNovaEsp(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addEsp(novaEsp)
                    }
                  }}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SUGESTOES.filter((x) => !especialidades.includes(x)).map((x) => (
                    <button key={x} type="button" className="chip text-suave" onClick={() => addEsp(x)}>
                      + {x}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="rotulo">Modalidades que você ensina</span>
                <EscolherModalidades valor={modalidades} aoMudar={setModalidades} limite={12} />
              </div>
            </>
          )}

          {etapa === 'Onde e como falar com você' && (
            <>
              <div>
                <span className="rotulo">A cidade onde você atende</span>
                <EscolherCidade inicial={cidade ? nomeCidade(cidade) : ''} aoEscolher={setCidade} />
              </div>
              {personal && (
                <label className="block">
                  <span className="rotulo">
                    Até onde você vai (na casa do aluno, no parque): <span className="dado text-texto">{raioKm} km</span>
                  </span>
                  <input type="range" min={1} max={60} value={raioKm} onChange={(e) => setRaioKm(Number(e.target.value))} className="w-full accent-[var(--anilha)]" />
                </label>
              )}
              <div className="cartao space-y-4 p-4">
                {personal && <Interruptor ligado={online} aoMudar={setOnline} rotulo="Também atendo online" descricao="Você aparece para quem procura de qualquer cidade." />}
                <Interruptor ligado={publico} aoMudar={setPublico} rotulo="Perfil público" descricao="Desligado, a sua página sai do mapa; os seus alunos continuam vendo." />
              </div>
              <Campo rotulo="Sobre você" dica="Formação, como você trabalha, o que gosta de ensinar.">
                <textarea className="campo min-h-28" value={bio} maxLength={600} onChange={(e) => setBio(e.target.value)} />
              </Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo rotulo="WhatsApp" dica="Aparece na sua página.">
                  <input className="campo" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                </Campo>
                <Campo rotulo="Instagram">
                  <input className="campo" placeholder="@seuperfil" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
                </Campo>
              </div>
            </>
          )}

          {etapa === 'A sua marca' && (
            <div className="grid gap-8 sm:grid-cols-[1fr_15rem]">
              <EscolherEstilo preset={visual.preset} destaque={visual.destaque} aoMudar={setVisual} />
              <ComMarca visual={visual} className="cartao h-fit p-5">
                <div className="flex items-center gap-3">
                  <LogoDaMarca visual={visual} nome={nome || 'Personal'} tamanho={44} />
                  <p className="titulo text-2xl">{nome || 'Seu nome'}</p>
                </div>
                <p className="mt-4 text-sm text-suave">O app dos seus alunos fica assim.</p>
                <span className="btn btn-anilha btn-m mt-4 w-full">Treinar</span>
              </ComMarca>
            </div>
          )}

          {etapa === 'A sua conta' && (
            <>
              <Campo rotulo="Seu nome">
                <input className="campo" autoComplete="name" value={conta.nome} onChange={(e) => setConta({ ...conta, nome: e.target.value })} />
              </Campo>
              <Campo rotulo="E-mail ou celular">
                <input className="campo" autoComplete="username" value={conta.login} onChange={(e) => setConta({ ...conta, login: e.target.value })} />
              </Campo>
              <Campo rotulo="Senha" dica={`Pelo menos ${SENHA_MINIMA} caracteres.`}>
                <input className="campo" type="password" autoComplete="new-password" value={conta.senha} onChange={(e) => setConta({ ...conta, senha: e.target.value })} />
              </Campo>
              <p className="text-xs text-fraco">Ao continuar, você aceita os termos de uso e a política de privacidade.</p>
            </>
          )}
        </div>

        {erro && (
          <p className="mt-6 text-sm font-medium text-perigo" role="alert">
            {erro}
          </p>
        )}
        <div className="mt-8 flex gap-3">
          {passo > 0 && (
            <button type="button" className="btn btn-contorno btn-g" onClick={() => setPasso((p) => p - 1)}>
              Voltar
            </button>
          )}
          <button type="button" className="btn btn-anilha btn-g flex-1" disabled={!podeSeguir || enviando} onClick={() => (ultimo ? terminar() : setPasso((p) => p + 1))}>
            {enviando ? <Girando /> : ultimo ? (personal ? 'Começar os 30 dias' : 'Criar o meu perfil') : 'Continuar'}
          </button>
        </div>
      </main>
    </div>
  )
}
