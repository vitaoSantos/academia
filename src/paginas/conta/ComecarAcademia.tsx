import { useMemo, useState, type ReactNode } from 'react'
import { PiBarbell, PiBuildings, PiFlower, PiHandFist, PiMusicNotes, PiSwimmingPool, PiTimer } from 'react-icons/pi'
import { Topo } from '../../components/layout/Topo'
import { EscolherCidade } from '../../components/local/EscolherCidade'
import { ComMarca, LogoDaMarca } from '../../components/marca/Marca'
import { EscolherEstilo } from '../../components/marca/EscolherEstilo'
import { Mapa } from '../../components/mapa/Mapa'
import { EscolherModalidades } from '../../components/modalidades/EscolherModalidades'
import { Campo, Girando } from '../../components/ui/basicos'
import { mensagemDeErro, sessao } from '../../lib/api'
import { localAgora } from '../../lib/local'
import { navegar, useEndereco } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { temaAgora } from '../../lib/tema'
import { useTitulo } from '../../lib/titulo'
import { corValida } from '../../shared/cores'
import { nomeCidade } from '../../shared/geo'
import { SUGERIDAS } from '../../shared/modalidades'
import { slugificar } from '../../shared/slug'
import { ESTILO_DO_TIPO, ORDEM_TEMAS } from '../../shared/temas'
import { SENHA_MINIMA } from '../../shared/texto'
import type { Cidade, PresetVisual, Ponto, TipoEmpresa } from '../../shared/tipos'

// O cadastro da academia (ou da rede, do estúdio, do CT...): a academia, a primeira unidade no mapa,
// as modalidades, a marca e, para quem ainda não tem, a conta. 30 dias com tudo do Premium.

const TIPOS: { id: TipoEmpresa; nome: string; texto: string; icone: ReactNode }[] = [
  { id: 'academia', nome: 'Academia', texto: 'Musculação e aulas', icone: <PiBarbell /> },
  { id: 'rede', nome: 'Rede de academias', texto: 'Várias unidades', icone: <PiBuildings /> },
  { id: 'estudio', nome: 'Estúdio', texto: 'Pilates, yoga, funcional', icone: <PiFlower /> },
  { id: 'box', nome: 'Box', texto: 'Cross training', icone: <PiTimer /> },
  { id: 'ct', nome: 'CT de lutas', texto: 'Jiu-jitsu, muay thai, boxe', icone: <PiHandFist /> },
  { id: 'danca', nome: 'Escola de dança', texto: 'Ballet, jazz, salão', icone: <PiMusicNotes /> },
  { id: 'aquatica', nome: 'Natação', texto: 'Natação e hidro', icone: <PiSwimmingPool /> },
]

export default function ComecarAcademia() {
  useTitulo('Cadastrar a academia')
  const s = useSessao()
  const { busca } = useEndereco()
  const local = localAgora()
  const [passo, setPasso] = useState(0)
  const [nome, setNome] = useState(busca.get('nome') ?? '')
  const [tipo, setTipo] = useState<TipoEmpresa>('academia')
  const [plano, setPlano] = useState<'basico' | 'premium'>(busca.get('plano') === 'basico' ? 'basico' : 'premium')
  const [cidade, setCidade] = useState<Cidade | null>(local.escolhido ? local.cidade : null)
  const [ponto, setPonto] = useState<Ponto | null>(null)
  const [unidade, setUnidade] = useState({ nome: '', endereco: '', bairro: '', whatsapp: '' })
  const [modalidades, setModalidades] = useState<string[]>(SUGERIDAS.academia)
  const estiloDaLanding = busca.get('estilo') as PresetVisual | null
  const [visual, setVisual] = useState<{ preset: PresetVisual; destaque?: string }>({
    preset: estiloDaLanding && ORDEM_TEMAS.includes(estiloDaLanding) ? estiloDaLanding : 'ferro',
    ...(corValida(`#${busca.get('cor')}`) ? { destaque: `#${busca.get('cor')}` } : {}),
  })
  const [conta, setConta] = useState({ nome: '', login: '', senha: '' })
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const passos = ['A academia', 'A unidade', 'Modalidades', 'A marca', ...(s.usuario ? [] : ['A sua conta'])]
  const slug = useMemo(() => slugificar(nome), [nome])

  const podeSeguir = [nome.trim().length >= 2, !!cidade && unidade.endereco.trim().length >= 5, modalidades.length > 0, true, conta.nome.trim().length >= 2 && !!conta.login && conta.senha.length >= SENHA_MINIMA][passo]

  const terminar = async () => {
    if (!cidade) return
    setErro('')
    setEnviando(true)
    try {
      const r = await sessao.empresa({
        empresa: nome.trim(),
        tipo,
        cidade,
        plano,
        modalidades,
        visual,
        unidade: { nome: unidade.nome || (tipo === 'rede' ? 'Centro' : 'Matriz'), endereco: unidade.endereco, bairro: unidade.bairro, whatsapp: unidade.whatsapp, ...(ponto ? { ponto } : {}) },
        ...(s.usuario ? {} : conta),
      })
      s.aplicar(r)
      navegar(`/painel/${r.empresa}?novo=1`, { substituir: true })
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  }

  const seguir = () => (passo === passos.length - 1 ? terminar() : setPasso((p) => p + 1))

  return (
    <div className="min-h-[100svh]">
      <Topo />
      <main className="margem mx-auto max-w-2xl py-10">
        <p className="sobre">30 dias com tudo do Premium, sem cartão</p>
        <h1 className="titulo mt-2 text-5xl">Cadastrar a academia</h1>

        <ol className="mt-6 flex gap-1.5" aria-label="Passos">
          {passos.map((p, i) => (
            <li key={p} className="flex-1" aria-current={i === passo ? 'step' : undefined}>
              <span className={`block h-1.5 rounded-full ${i <= passo ? 'bg-anilha' : 'bg-sup-3'}`} />
              <span className={`mt-2 hidden text-xs font-semibold sm:block ${i === passo ? 'text-texto' : 'text-fraco'}`}>{p}</span>
            </li>
          ))}
        </ol>

        <div className="mt-8">
          {passo === 0 && (
            <div className="space-y-6">
              <Campo rotulo="O nome da academia" dica={slug ? `A página fica em turma.app/${slug}` : undefined}>
                <input className="campo" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={50} autoFocus />
              </Campo>
              <div>
                <span className="rotulo">O que é</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tipo">
                  {TIPOS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={tipo === t.id}
                      onClick={() => {
                        setTipo(t.id)
                        setModalidades(SUGERIDAS[t.id] ?? [])
                        if (!estiloDaLanding) setVisual({ preset: ESTILO_DO_TIPO[t.id] ?? 'ferro' })
                      }}
                      className="cartao flex flex-col items-start gap-1 p-4 text-left aria-checked:border-anilha aria-checked:ring-1 aria-checked:ring-anilha"
                    >
                      <span className="text-2xl text-anilha-legivel">{t.icone}</span>
                      <span className="text-sm font-bold">{t.nome}</span>
                      <span className="text-xs text-suave">{t.texto}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="rotulo">Depois do teste</span>
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Plano">
                  {(['basico', 'premium'] as const).map((p) => (
                    <button key={p} type="button" role="radio" aria-checked={plano === p} onClick={() => setPlano(p)} className="cartao p-4 text-left aria-checked:border-anilha aria-checked:ring-1 aria-checked:ring-anilha">
                      <span className="font-bold">{p === 'basico' ? 'Básico' : 'Premium'}</span>
                      <span className="mt-1 block text-xs text-suave">{p === 'basico' ? 'Até 300 alunos por unidade, grade, reservas e o app com a sua marca' : 'Alunos sem limite, destaque na região, desafios oficiais e relatórios'}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-fraco">Dá para trocar no painel. Nada é cobrado no teste.</p>
              </div>
            </div>
          )}

          {passo === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-suave">{tipo === 'rede' ? 'Comece pela primeira unidade; as outras entram pelo painel.' : 'Onde fica a academia (aparece no mapa da região).'}</p>
              <div>
                <span className="rotulo">A cidade</span>
                <EscolherCidade
                  inicial={cidade ? nomeCidade(cidade) : ''}
                  aoEscolher={(c) => {
                    setCidade(c)
                    setPonto(null)
                  }}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
                <Campo rotulo="Endereço">
                  <input className="campo" placeholder="Rua, número" value={unidade.endereco} onChange={(e) => setUnidade({ ...unidade, endereco: e.target.value })} />
                </Campo>
                <Campo rotulo="Bairro">
                  <input className="campo" value={unidade.bairro} onChange={(e) => setUnidade({ ...unidade, bairro: e.target.value })} />
                </Campo>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo rotulo="O nome da unidade" dica="Centro, Shopping, Matriz…">
                  <input className="campo" placeholder={tipo === 'rede' ? 'Centro' : 'Matriz'} value={unidade.nome} onChange={(e) => setUnidade({ ...unidade, nome: e.target.value })} maxLength={30} />
                </Campo>
                <Campo rotulo="WhatsApp da recepção">
                  <input className="campo" inputMode="tel" value={unidade.whatsapp} onChange={(e) => setUnidade({ ...unidade, whatsapp: e.target.value })} />
                </Campo>
              </div>
              {cidade && (
                <div>
                  <span className="rotulo">O pino no mapa</span>
                  <div className="relative h-64 overflow-hidden rounded-2xl border border-linha">
                    <Mapa key={cidade.codigo} centro={ponto ?? cidade} zoom={14} tema={temaAgora()} aoMoverCentro={setPonto} className="h-full" />
                    <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full text-4xl drop-shadow" aria-hidden>
                      📍
                    </span>
                  </div>
                  <span className="mt-1.5 block text-xs text-fraco">Arraste o mapa até o pino ficar em cima da academia.</span>
                </div>
              )}
            </div>
          )}

          {passo === 2 && (
            <div>
              <p className="mb-4 text-sm text-suave">Já deixamos as mais comuns para {TIPOS.find((t) => t.id === tipo)?.nome.toLowerCase()}. A grade de horários, as faixas e as vagas você ajusta no painel.</p>
              <EscolherModalidades valor={modalidades} aoMudar={setModalidades} />
            </div>
          )}

          {passo === 3 && (
            <div className="grid gap-8 sm:grid-cols-[1fr_15rem]">
              <EscolherEstilo preset={visual.preset} destaque={visual.destaque} aoMudar={setVisual} />
              <ComMarca visual={visual} className="cartao h-fit overflow-hidden p-5">
                <div className="flex items-center gap-3">
                  <LogoDaMarca visual={visual} nome={nome || 'Academia'} tamanho={44} />
                  <p className="titulo text-2xl">{nome || 'Academia'}</p>
                </div>
                <p className="mt-4 text-sm text-suave">É assim que o aluno vê o app. A logo e a capa entram pelo painel.</p>
                <span className="btn btn-anilha btn-m mt-4 w-full">Treinar</span>
              </ComMarca>
            </div>
          )}

          {passo === 4 && !s.usuario && (
            <div className="space-y-4">
              <p className="text-sm text-suave">A conta de quem cuida da academia (você entra no painel com ela).</p>
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
            </div>
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
          <button type="button" className="btn btn-anilha btn-g flex-1" disabled={!podeSeguir || enviando} onClick={seguir}>
            {enviando ? <Girando /> : passo === passos.length - 1 ? 'Criar a academia' : 'Continuar'}
          </button>
        </div>
      </main>
    </div>
  )
}
