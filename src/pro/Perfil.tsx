import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import { PiCheckCircleFill, PiCopy, PiGlobe, PiHouseLine, PiMapPin, PiPlus, PiX } from 'react-icons/pi'
import { AppPro } from '../components/layout/AppPro'
import { EscolherCidade } from '../components/local/EscolherCidade'
import { EditorAparencia } from '../components/marca/EditorAparencia'
import { EscolherModalidades } from '../components/modalidades/EscolherModalidades'
import { Avaliacoes } from '../components/perfil/Avaliacoes'
import { CartaoCompartilhar } from '../components/perfil/CartaoCompartilhar'
import { useAviso } from '../components/ui/Aviso'
import { Campo, Carregando, Erro, Girando, Interruptor, Selo } from '../components/ui/basicos'
import { enderecoPublico } from '../data/marca'
import { mensagemDeErro, paginas, plataforma, pro, sessao } from '../lib/api'
import { esquecer, useDados } from '../lib/dados'
import { Link } from '../lib/rotas'
import { useSessao } from '../lib/sessao'
import { useTitulo } from '../lib/titulo'
import { textoNota } from '../shared/avaliacao'
import { nomeCidade } from '../shared/geo'
import { ESPECIALIDADES } from '../shared/modalidades'
import { nivelProfissional, NOMES_PLANO, RECURSOS_PERSONAL } from '../shared/planos'
import type { EmpresaPublica } from '../shared/respostas'
import { dataDe, dataPorExtenso } from '../shared/tempo'
import { formatarPreco, mascaraCelular, numero } from '../shared/texto'
import type { Cidade, LocalAtendimento } from '../shared/tipos'

// A página do profissional, vista de dentro (seções 6, 18 e 20 do estudo): o que aparece para todo
// mundo, onde ele atende, a aparência do app (para o personal), o plano e as avaliações

function Secao({ id, titulo, descricao, children }: { id: string; titulo: string; descricao?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="cartao scroll-mt-24 p-5 sm:p-6" aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`} className="titulo text-2xl">
        {titulo}
      </h2>
      {descricao && <p className="mt-1 text-sm text-suave">{descricao}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

export default function Perfil() {
  useTitulo('A minha página')
  const s = useSessao()
  const perfil = useDados(s.profissional ? `pro-perfil:${s.profissional.id}` : null, () => pro.perfil())
  useEffect(() => {
    if (location.hash && perfil.dados) setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 200)
  }, [!!perfil.dados])
  const p = s.profissional
  return (
    <AppPro titulo="A minha página">
      {!perfil.dados || !p ? (
        perfil.erro ? <Erro mensagem={mensagemDeErro(perfil.erro)} aoTentar={perfil.recarregar} /> : <Carregando />
      ) : (
        <div className="space-y-5">
          <Compartilhar />
          <Dados />
          <Locais academias={perfil.dados.academias} />
          {p.personal && (
            <Secao id="aparencia" titulo="O seu app" descricao="Os seus alunos treinam no app com a sua cara: as cores, a fonte, a logo e o nome no ícone do celular.">
              <EditorAparencia
                visual={p.visual}
                nome={p.nome}
                premium={nivelProfissional(p) === 'premium'}
                aoSalvar={async (m) => {
                  await pro.aparencia(m)
                  await s.atualizar()
                  esquecer(`pagina:${p.slug}`)
                }}
              />
            </Secao>
          )}
          {p.personal && <Plano />}
          <Secao id="avaliacoes" titulo="Avaliações" descricao="Só quem treina (ou treinou) com você avalia. A sua resposta aparece embaixo da avaliação, na página.">
            <Avaliacoes alvo={{ tipo: 'profissional', id: p.id }} nota={p.numeros.nota} lista={perfil.dados.avaliacoes} podeAvaliar={false} podeResponder aoMudar={() => void perfil.recarregar()} />
          </Secao>
        </div>
      )}
    </AppPro>
  )
}

function Compartilhar() {
  const s = useSessao()
  const avisar = useAviso()
  const p = s.profissional!
  const [mudando, setMudando] = useState(false)
  const link = `https://${enderecoPublico(p.slug)}`
  const n = p.numeros
  return (
    <Secao id="pagina" titulo="A sua página" descricao="O link para a bio do Instagram e o cartão com os seus números para os stories.">
      <div className="flex flex-wrap items-center gap-2">
        <Link para={`/${p.slug}`} className="dado min-w-0 flex-1 truncate rounded-xl bg-sup-2 px-4 py-3 text-sm font-semibold hover:bg-sup-3">
          {enderecoPublico(p.slug)}
        </Link>
        <button
          type="button"
          className="btn btn-sup btn-m"
          onClick={async () => {
            await navigator.clipboard?.writeText(link).catch(() => {})
            avisar('Link copiado.')
          }}
        >
          <PiCopy /> Copiar
        </button>
        <CartaoCompartilhar
          slug={p.slug}
          nome={p.nome}
          subtitulo={`${p.personal ? 'Personal trainer' : 'Professor'}${p.cref ? ` · CREF ${p.cref}` : ''} · ${p.cidade.nome}`}
          numeros={[
            { valor: numero(n.alunosInstruidos), legenda: 'alunos instruídos' },
            { valor: numero(n.fichas), legenda: 'fichas montadas' },
            { valor: numero(n.treinos), legenda: 'treinos dos alunos' },
            { valor: textoNota(n.nota), legenda: n.nota.total ? `nota em ${n.nota.total} avaliações` : 'nota' },
          ]}
          visual={p.visual}
        />
      </div>
      <div className="mt-5">
        <Interruptor
          ligado={p.publico}
          desativado={mudando}
          rotulo="Página aberta ao público"
          descricao={p.publico ? 'Aparece no mapa da região e qualquer pessoa vê a página.' : 'Fora do mapa: só os seus alunos veem a página. Mude quando quiser.'}
          aoMudar={async (v) => {
            setMudando(true)
            try {
              await pro.publico(v)
              await s.atualizar()
              esquecer(`pagina:${p.slug}`)
              avisar(v ? 'A página está aberta.' : 'A página saiu do ar para o público.')
            } catch (e) {
              avisar(mensagemDeErro(e), 'erro')
            } finally {
              setMudando(false)
            }
          }}
        />
      </div>
    </Secao>
  )
}

function Dados() {
  const s = useSessao()
  const avisar = useAviso()
  const p = s.profissional!
  const [personal, setPersonal] = useState(p.personal)
  const [cref, setCref] = useState(p.cref ?? '')
  const [especialidades, setEspecialidades] = useState(p.especialidades)
  const [nova, setNova] = useState('')
  const [modalidades, setModalidades] = useState(p.modalidades)
  const [bio, setBio] = useState(p.bio ?? '')
  const [cidade, setCidade] = useState<Cidade>(p.cidade)
  const [raioKm, setRaioKm] = useState(p.raioKm)
  const [whatsapp, setWhatsapp] = useState(mascaraCelular(p.whatsapp ?? ''))
  const [instagram, setInstagram] = useState(p.instagram ?? '')
  const [salvando, setSalvando] = useState(false)
  const porEspecialidade = () => {
    const t = nova.trim()
    if (t && !especialidades.includes(t) && especialidades.length < 8) setEspecialidades([...especialidades, t])
    setNova('')
  }
  const salvar = async () => {
    if (personal && !p.personal && !confirm('Atender como personal começa o teste de 30 dias com tudo do Premium. Depois você escolhe o plano. Seguir?')) return
    setSalvando(true)
    try {
      s.aplicar(await sessao.profissional({ personal, cref: cref || undefined, especialidades, modalidades, cidade, raioKm, bio, whatsapp: whatsapp || undefined, instagram: instagram || undefined }))
      esquecer(`pagina:${p.slug}`)
      esquecer('pro-')
      avisar('Página atualizada.')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setSalvando(false)
    }
  }
  return (
    <Secao id="dados" titulo="Sobre você" descricao="O que aparece na página e no mapa da região. O nome e a foto vêm da sua conta.">
      <div className="space-y-5">
        <Interruptor ligado={personal} desativado={p.personal} aoMudar={setPersonal} rotulo="Atendo como personal" descricao={p.personal ? `Plano: ${NOMES_PLANO[p.plano]}` : 'Atende por conta própria: os seus alunos, as fichas, a agenda e o app com a sua marca (30 dias grátis)'} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="CREF" dica="Assim: 012345-G/MG">
            <input className="campo" value={cref} maxLength={14} onChange={(e) => setCref(e.target.value.toUpperCase())} />
          </Campo>
          <Campo rotulo="Instagram">
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fraco">@</span>
              <input className="campo pl-8" value={instagram} maxLength={30} onChange={(e) => setInstagram(e.target.value.replace(/^@/, ''))} />
            </div>
          </Campo>
          <Campo rotulo="WhatsApp" dica="Aparece como botão na página">
            <input className="campo" inputMode="tel" value={whatsapp} maxLength={20} onChange={(e) => setWhatsapp(mascaraCelular(e.target.value))} placeholder="(35) 99999-0000" />
          </Campo>
          <Campo rotulo="Atende até (km)" dica={`A partir de ${nomeCidade(cidade)}`}>
            <input className="campo" type="number" min={1} max={150} value={raioKm} onChange={(e) => setRaioKm(Number(e.target.value) || 1)} />
          </Campo>
        </div>
        <Campo rotulo="Cidade">
          <EscolherCidade inicial={nomeCidade(cidade)} aoEscolher={setCidade} />
        </Campo>
        <Campo rotulo="Sobre você">
          <textarea className="campo min-h-24" maxLength={600} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A sua formação, o seu jeito de treinar, para quem você é ideal..." />
        </Campo>
        <div>
          <p className="rotulo">Especialidades</p>
          <div className="flex flex-wrap gap-1.5">
            {especialidades.map((e) => (
              <span key={e} className="chip" aria-pressed>
                {e}
                <button type="button" aria-label={`Tirar ${e}`} onClick={() => setEspecialidades(especialidades.filter((x) => x !== e))}>
                  <PiX />
                </button>
              </span>
            ))}
            {ESPECIALIDADES.filter((x) => !especialidades.includes(x)).map((x) => (
              <button key={x} type="button" className="chip text-suave" onClick={() => especialidades.length < 8 && setEspecialidades([...especialidades, x])}>
                <PiPlus /> {x}
              </button>
            ))}
          </div>
          <div className="mt-2 flex max-w-sm gap-2">
            <input className="campo" value={nova} maxLength={30} onChange={(e) => setNova(e.target.value)} onKeyDown={(e: KeyboardEvent) => e.key === 'Enter' && (e.preventDefault(), porEspecialidade())} placeholder="Outra especialidade" />
            <button type="button" className="btn btn-sup btn-m shrink-0" onClick={porEspecialidade}>
              Pôr
            </button>
          </div>
        </div>
        <div>
          <p className="rotulo">Modalidades</p>
          <EscolherModalidades valor={modalidades} aoMudar={setModalidades} limite={12} />
        </div>
        <button type="button" className="btn btn-anilha btn-m" disabled={salvando} onClick={salvar}>
          {salvando ? <Girando /> : 'Salvar'}
        </button>
      </div>
    </Secao>
  )
}

function Locais({ academias }: { academias: { slug: string; nome: string }[] }) {
  const s = useSessao()
  const avisar = useAviso()
  const p = s.profissional!
  const [locais, setLocais] = useState<LocalAtendimento[]>(p.locais)
  const [outro, setOutro] = useState('')
  const [salvando, setSalvando] = useState(false)
  // as unidades das academias onde ele dá aula
  const [unidades, setUnidades] = useState<{ empresa: string; unidade: string; nome: string }[]>([])
  useEffect(() => {
    let vivo = true
    Promise.all(academias.map((a) => paginas.ler(a.slug).catch(() => null))).then((r) => {
      if (!vivo) return
      setUnidades(r.flatMap((x) => (x && x.tipo === 'empresa' ? (x.empresa as EmpresaPublica).unidades.filter((u) => u.ativa).map((u) => ({ empresa: x.empresa.slug, unidade: u.id, nome: x.empresa.unidades.length > 1 ? `${x.empresa.nome} · ${u.nome}` : x.empresa.nome })) : [])))
    })
    return () => {
      vivo = false
    }
  }, [academias])
  const tem = (l: LocalAtendimento) => locais.some((x) => x.tipo === l.tipo && (l.tipo !== 'unidade' || (x.tipo === 'unidade' && x.empresa === l.empresa && x.unidade === l.unidade)) && (l.tipo !== 'outro' || (x.tipo === 'outro' && x.nome === l.nome)))
  const alternar = (l: LocalAtendimento) => setLocais((x) => (tem(l) ? x.filter((y) => !(y.tipo === l.tipo && JSON.stringify(y) === JSON.stringify(l))) : [...x, l]))
  const salvar = async () => {
    setSalvando(true)
    try {
      await pro.locais(locais)
      await s.atualizar()
      esquecer(`pagina:${p.slug}`)
      avisar('Locais salvos: aparecem na página e no mapa.')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setSalvando(false)
    }
  }
  const opcao = (l: LocalAtendimento, icone: ReactNode, nome: string, sub?: string) => (
    <button key={JSON.stringify(l)} type="button" aria-pressed={tem(l)} onClick={() => alternar(l)} className="flex items-center gap-3 rounded-2xl border border-linha p-3 text-left aria-pressed:border-anilha aria-pressed:bg-anilha-suave">
      <span className="text-xl text-fraco">{icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{nome}</span>
        {sub && <span className="block truncate text-xs text-suave">{sub}</span>}
      </span>
      {tem(l) && <PiCheckCircleFill className="shrink-0 text-lg text-anilha-legivel" />}
    </button>
  )
  return (
    <Secao id="locais" titulo="Onde você atende" descricao="O link da sua página mostra todos os lugares: o aluno de cada academia acha você lá.">
      <div className="grid gap-2 sm:grid-cols-2">
        {unidades.map((u) => opcao({ tipo: 'unidade', empresa: u.empresa, unidade: u.unidade }, <PiMapPin />, u.nome, 'Academia'))}
        {opcao({ tipo: 'domicilio' }, <PiHouseLine />, 'Na casa do aluno', `Até ${p.raioKm} km`)}
        {opcao({ tipo: 'online' }, <PiGlobe />, 'Online', 'Ficha e acompanhamento pelo app')}
        {locais
          .filter((l): l is Extract<LocalAtendimento, { tipo: 'outro' }> => l.tipo === 'outro')
          .map((l) => opcao(l, <PiMapPin />, l.nome, 'Outro lugar'))}
      </div>
      <div className="mt-3 flex max-w-md gap-2">
        <input className="campo" maxLength={60} value={outro} onChange={(e) => setOutro(e.target.value)} placeholder="Outro lugar: Parque da Ilha, condomínio..." />
        <button
          type="button"
          className="btn btn-sup btn-m shrink-0"
          disabled={!outro.trim()}
          onClick={() => {
            setLocais((x) => [...x, { tipo: 'outro', nome: outro.trim() }])
            setOutro('')
          }}
        >
          Pôr
        </button>
      </div>
      <button type="button" className="btn btn-anilha btn-m mt-5" disabled={salvando} onClick={salvar}>
        {salvando ? <Girando /> : 'Salvar os locais'}
      </button>
    </Secao>
  )
}

function Plano() {
  const s = useSessao()
  const avisar = useAviso()
  const p = s.profissional!
  const config = useDados('plataforma', () => plataforma.ler())
  const [mudando, setMudando] = useState<string | null>(null)
  const nivel = nivelProfissional(p)
  const mudar = async (plano: 'basico' | 'premium') => {
    setMudando(plano)
    try {
      await pro.plano(plano)
      await s.atualizar()
      esquecer('pro-')
      avisar(`Plano ${NOMES_PLANO[plano]} ativo. (No protótipo, sem cobrança.)`)
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setMudando(null)
    }
  }
  const precos = config.dados?.precos
  return (
    <Secao
      id="plano"
      titulo="Plano"
      descricao={
        p.plano === 'teste' && p.testeAte
          ? `Teste grátis com tudo do Premium até ${dataPorExtenso(dataDe(p.testeAte))}. Escolha o plano quando quiser.`
          : nivel === 'nenhum'
            ? 'O teste acabou: escolha o plano para seguir atendendo pelo app.'
            : `Você está no ${NOMES_PLANO[p.plano]}.`
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {(['basico', 'premium'] as const).map((x) => {
          const atual = p.plano === x
          return (
            <div key={x} className={`rounded-2xl border p-5 ${x === 'premium' ? 'border-anilha' : 'border-linha'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="titulo text-2xl">{NOMES_PLANO[x]}</p>
                {atual && <Selo tom="ok">Atual</Selo>}
              </div>
              {precos && (
                <p className="mt-1">
                  <span className="text-2xl font-bold">{formatarPreco(x === 'premium' ? precos.personalPremium : precos.personalBasico)}</span>
                  <span className="text-sm text-suave">/mês</span>
                </p>
              )}
              <ul className="mt-3 space-y-1.5 text-sm">
                {(x === 'premium' ? [...RECURSOS_PERSONAL.basico.slice(1), ...RECURSOS_PERSONAL.premium] : RECURSOS_PERSONAL.basico).map((r) => (
                  <li key={r} className="flex gap-2">
                    <PiCheckCircleFill className="mt-0.5 shrink-0 text-anilha-legivel" /> {r}
                  </li>
                ))}
              </ul>
              {!atual && (
                <button type="button" className={`btn btn-m mt-4 w-full ${x === 'premium' ? 'btn-anilha' : 'btn-sup'}`} disabled={!!mudando} onClick={() => mudar(x)}>
                  {mudando === x ? <Girando /> : `Ficar no ${NOMES_PLANO[x]}`}
                </button>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[0.7rem] text-fraco">Protótipo: a assinatura é simulada, o plano muda na hora e não há cobrança. O aluno nunca paga pelo que você assina.</p>
    </Secao>
  )
}
