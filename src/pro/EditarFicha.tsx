import { useMemo, useState } from 'react'
import { PiArchive, PiBookmarkSimple, PiCopy } from 'react-icons/pi'
import { ListaDaDivisao } from '../components/ficha/ListaDaDivisao'
import { fichaVazia, Montador, type FichaEmMontagem } from '../components/ficha/Montador'
import { FolhaExercicio } from '../components/ficha/VerExercicio'
import { AppPro } from '../components/layout/AppPro'
import { useAviso } from '../components/ui/Aviso'
import { Campo, Carregando, Erro, Folha, Girando, Selo } from '../components/ui/basicos'
import { fichas, mensagemDeErro, pro, type AlunosDoProfissional } from '../lib/api'
import { esquecer, useDados } from '../lib/dados'
import { Link, navegar, useEndereco } from '../lib/rotas'
import { useSessao } from '../lib/sessao'
import { useTitulo } from '../lib/titulo'
import { copiarDivisoes, previsaoPadrao } from '../shared/ficha'
import { dataDe, diasEntre, hoje, somarDias, textoData } from '../shared/tempo'
import type { ContextoFicha, Divisao } from '../shared/tipos'

// Montar a ficha no painel do profissional (seção 9 do estudo): para qual aluno e em nome de quem
// (do personal ou da academia onde ele dá aula), a partir do zero, de um modelo ou da fase anterior.
// A ficha publicada avisa o aluno; o rascunho fica só com o profissional.

type Opcao = { aluno: string; nome: string; contextos: { valor: string; nome: string; contexto: ContextoFicha }[] }

// Quem pode receber ficha e em nome de quem: os alunos de personal e os das academias
function opcoesDeAlunos(d: AlunosDoProfissional | undefined, proId: string, personal: boolean): Opcao[] {
  const m = new Map<string, Opcao>()
  const por = (id: string, nome: string) => m.get(id) ?? m.set(id, { aluno: id, nome, contextos: [] }).get(id)!
  if (d && personal) for (const a of d.personal.filter((x) => x.status === 'ativo')) por(a.id, a.nome).contextos.push({ valor: `profissional:${proId}`, nome: 'Personal', contexto: { tipo: 'profissional', id: proId } })
  for (const ac of d?.academias ?? [])
    for (const a of ac.alunos.filter((x) => x.status === 'ativo'))
      por(a.id, a.nome).contextos.push({ valor: `empresa:${ac.slug}`, nome: ac.nome, contexto: { tipo: 'empresa', id: ac.slug, ...(a.unidade ? { unidade: a.unidade } : {}) } })
  return [...m.values()].sort((a, b) => a.nome.localeCompare(b.nome))
}

export default function EditarFicha({ id, modelo }: { id?: string; modelo?: string }) {
  const ehModelo = modelo !== undefined
  useTitulo(ehModelo ? 'Modelo de ficha' : id ? 'Ficha' : 'Nova ficha')
  return <AppPro voltar={ehModelo ? '/pro/fichas#modelos' : '/pro/fichas'}>{ehModelo ? <EditarModelo id={modelo === 'novo' ? undefined : modelo} /> : <EditarDoAluno id={id} />}</AppPro>
}

function EditarDoAluno({ id }: { id?: string }) {
  const s = useSessao()
  const avisar = useAviso()
  const p = s.profissional!
  const { busca } = useEndereco()
  const alunos = useDados(`pro-alunos:${p.id}`, () => pro.alunos())
  const biblioteca = useDados('modelos', () => fichas.modelos())
  const existente = useDados(id ? `ficha:${id}` : null, () => fichas.ler(id!))
  const de = busca.get('de')
  const base = useDados(de ? `ficha:${de}` : null, () => fichas.ler(de!))
  const opcoes = useMemo(() => opcoesDeAlunos(alunos.dados, p.id, p.personal), [alunos.dados, p.id, p.personal])
  const [aluno, setAluno] = useState(busca.get('aluno') ?? '')
  const [ctx, setCtx] = useState(busca.get('contexto') ?? '')
  const [copiando, setCopiando] = useState(false)
  const [vendo, setVendo] = useState<string | null>(null)

  const carregando = !alunos.dados || !biblioteca.dados || (id && !existente.dados) || (de && !base.dados)
  if (alunos.erro || existente.erro || base.erro) return <Erro mensagem={mensagemDeErro(alunos.erro ?? existente.erro ?? base.erro)} />
  if (carregando) return <Carregando />

  const f = existente.dados?.ficha
  // a ficha de outro profissional (ou a do próprio aluno): só leitura
  if (f && !existente.dados!.podeEditar)
    return (
      <div>
        <p className="text-xs text-fraco">
          {existente.dados!.aluno.nome} · {existente.dados!.contextoNome}
        </p>
        <h1 className="titulo mt-1 text-4xl">{f.titulo}</h1>
        <p className="mt-2 text-sm text-suave">Montada por {f.autorNome}: só quem montou muda. Você pode usar como base para uma ficha sua.</p>
        <Link para={`/pro/fichas/nova?aluno=${f.aluno}&de=${f.id}`} className="btn btn-sup btn-m mt-4">
          <PiCopy /> Usar como base
        </Link>
        <div className="mt-6 space-y-6">
          {f.divisoes.map((d) => (
            <section key={d.id}>
              <h2 className="mb-2 font-bold">
                {d.nome}
                {d.foco ? ` · ${d.foco}` : ''}
              </h2>
              <ListaDaDivisao divisao={d} proprios={existente.dados!.proprios} aoVer={setVendo} />
            </section>
          ))}
        </div>
        <FolhaExercicio id={vendo} proprio={existente.dados!.proprios.find((x) => x.id === vendo)} aoFechar={() => setVendo(null)} />
      </div>
    )

  // de onde a ficha nasce: ela mesma, um modelo, a fase anterior ou o zero
  const doModelo = biblioteca.dados!.modelos.find((m) => m.id === busca.get('modelo'))
  const anterior = base.dados?.ficha
  const inicio = hoje()
  const inicial: FichaEmMontagem = f
    ? { titulo: f.titulo, objetivo: f.objetivo, inicio: f.inicio, previsao: f.previsao, online: f.online, obs: f.obs, divisoes: f.divisoes }
    : doModelo
      ? { titulo: doModelo.titulo, objetivo: doModelo.objetivo, inicio, previsao: somarDias(inicio, doModelo.semanas * 7), obs: doModelo.obs, divisoes: copiarDivisoes(doModelo.divisoes) }
      : anterior
        ? { titulo: proximaFase(anterior.titulo), objetivo: anterior.objetivo, inicio, previsao: previsaoPadrao(inicio, anterior.online), online: anterior.online, obs: anterior.obs, divisoes: copiarDivisoes(anterior.divisoes) }
        : fichaVazia()

  const alunoAtual = f?.aluno ?? aluno
  const opcao = opcoes.find((o) => o.aluno === alunoAtual)
  const contextoEscolhido = f ? f.contexto : (opcao?.contextos.find((c) => c.valor === ctx) ?? opcao?.contextos[0])?.contexto

  const salvar = async (x: FichaEmMontagem, publicar: boolean) => {
    if (!alunoAtual || !contextoEscolhido) return avisar('Escolha o aluno.', 'erro')
    try {
      const r = await fichas.salvar({
        ...(f ? { id: f.id } : {}),
        aluno: alunoAtual,
        contexto: contextoEscolhido,
        titulo: x.titulo,
        objetivo: x.objetivo,
        inicio: x.inicio,
        previsao: x.previsao,
        online: x.online,
        obs: x.obs,
        divisoes: x.divisoes,
        publicar,
        ...(doModelo ? { modelo: doModelo.id } : anterior?.modelo ? { modelo: anterior.modelo } : {}),
      })
      esquecer('pro-')
      esquecer(`ficha:${r.ficha.id}`)
      avisar(publicar ? `Ficha publicada. ${opcao?.nome.split(' ')[0] ?? 'O aluno'} foi avisado.` : 'Rascunho guardado. O aluno ainda não vê.')
      navegar(`/pro/alunos/${alunoAtual}`)
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    }
  }

  const salvarModelo = async () => {
    if (!f) return
    try {
      await fichas.salvarModelo({ titulo: f.titulo, objetivo: f.objetivo, semanas: Math.max(1, Math.round(diasEntre(f.inicio, f.previsao) / 7)), divisoes: copiarDivisoes(f.divisoes), obs: f.obs })
      esquecer('modelos')
      avisar('Guardado nos modelos. Use em outro aluno quando quiser.')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    }
  }
  const arquivar = async () => {
    if (!f || !confirm('Arquivar esta ficha? Ela sai das ativas do aluno.')) return
    try {
      await fichas.arquivar(f.id)
      esquecer('pro-')
      avisar('Ficha arquivada.')
      navegar(`/pro/alunos/${f.aluno}`)
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    }
  }

  const topo = (
    <>
      <div>
        <p className="sobre">{f ? (f.status === 'rascunho' ? 'Rascunho' : 'Ficha publicada') : 'Nova ficha'}</p>
        <h1 className="titulo mt-1 text-4xl">{f ? f.titulo : doModelo ? `A partir de "${doModelo.titulo}"` : anterior ? 'A próxima fase' : 'Nova ficha'}</h1>
      </div>
      {f ? (
        <div className="cartao flex flex-wrap items-center gap-3 p-4">
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-semibold">{existente.dados!.aluno.nome}</span>
            <span className="block text-xs text-suave">{existente.dados!.contextoNome}</span>
          </span>
          {f.status === 'ativa' && <Selo tom="ok">{f.vistaEm ? `Vista ${textoData(dataDe(f.vistaEm))}` : 'Ainda não vista'}</Selo>}
        </div>
      ) : (
        <div className="cartao grid gap-3 p-4 sm:grid-cols-2">
          <Campo rotulo="Aluno">
            <select
              className="campo"
              value={aluno}
              onChange={(e) => {
                setAluno(e.target.value)
                setCtx('')
              }}
            >
              <option value="">Escolha o aluno</option>
              {opcoes.map((o) => (
                <option key={o.aluno} value={o.aluno}>
                  {o.nome}
                </option>
              ))}
            </select>
          </Campo>
          {opcao && opcao.contextos.length > 1 && (
            <Campo rotulo="Em nome de">
              <select className="campo" value={ctx || opcao.contextos[0].valor} onChange={(e) => setCtx(e.target.value)}>
                {opcao.contextos.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Campo>
          )}
          {!opcoes.length && <p className="text-sm text-suave sm:col-span-2">Você ainda não tem alunos ativos. Convide em Alunos, ou monte um modelo para usar depois.</p>}
        </div>
      )}
      {f && existente.dados!.iguais && existente.dados!.iguais.length > 0 && (
        <p className="rounded-2xl bg-sup-2 px-4 py-3 text-sm text-suave">
          O mesmo treino está com {existente.dados!.iguais.map((x) => x.alunoNome.split(' ')[0]).join(', ')}. Mudar aqui não mexe nas fichas deles.
        </p>
      )}
      {f && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-sup btn-p" onClick={() => setCopiando(true)}>
            <PiCopy /> Usar em outro aluno
          </button>
          <button type="button" className="btn btn-sup btn-p" onClick={salvarModelo}>
            <PiBookmarkSimple /> Salvar como modelo
          </button>
          {f.status !== 'arquivada' && (
            <button type="button" className="btn btn-fantasma btn-p" onClick={arquivar}>
              <PiArchive /> Arquivar
            </button>
          )}
        </div>
      )}
    </>
  )

  return (
    <>
      <Montador
        key={f?.id ?? doModelo?.id ?? anterior?.id ?? 'nova'}
        inicial={inicial}
        proprios={biblioteca.dados!.proprios}
        online={p.personal}
        rascunho
        textoSalvar={f?.status === 'ativa' ? 'Salvar e avisar o aluno' : 'Publicar para o aluno'}
        topo={topo}
        aoSalvar={salvar}
      />
      {f && <Copiar aberta={copiando} aoFechar={() => setCopiando(false)} fichaId={f.id} opcoes={opcoes.filter((o) => o.aluno !== f.aluno)} />}
    </>
  )
}

// "Treino A" → a próxima fase ganha o número seguinte ("Hipertrofia, fase 2" → "fase 3")
function proximaFase(titulo: string) {
  const m = titulo.match(/^(.*?)(\d+)\s*$/)
  return m ? `${m[1]}${Number(m[2]) + 1}` : `${titulo} (nova fase)`
}

function Copiar({ aberta, aoFechar, fichaId, opcoes }: { aberta: boolean; aoFechar: () => void; fichaId: string; opcoes: Opcao[] }) {
  const avisar = useAviso()
  const [aluno, setAluno] = useState('')
  const [ctx, setCtx] = useState('')
  const [copiando, setCopiando] = useState(false)
  const opcao = opcoes.find((o) => o.aluno === aluno)
  const contexto = (opcao?.contextos.find((c) => c.valor === ctx) ?? opcao?.contextos[0])?.contexto
  const copiar = async () => {
    if (!aluno || !contexto) return
    setCopiando(true)
    try {
      const r = await fichas.copiar(fichaId, aluno, contexto)
      esquecer('pro-')
      avisar(`Pronto: ${opcao!.nome.split(' ')[0]} recebeu a ficha, com as datas a partir de hoje.`)
      aoFechar()
      navegar(`/pro/fichas/${r.ficha.id}`)
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setCopiando(false)
    }
  }
  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo="Usar em outro aluno">
      <div className="space-y-4 p-6">
        <h2 className="titulo text-3xl">Usar em outro aluno</h2>
        <p className="text-sm text-suave">O treino igual vai para o outro aluno, com as datas a partir de hoje. Depois dá para ajustar só a dele.</p>
        <Campo rotulo="Aluno">
          <select className="campo" value={aluno} onChange={(e) => setAluno(e.target.value)}>
            <option value="">Escolha</option>
            {opcoes.map((o) => (
              <option key={o.aluno} value={o.aluno}>
                {o.nome}
              </option>
            ))}
          </select>
        </Campo>
        {opcao && opcao.contextos.length > 1 && (
          <Campo rotulo="Em nome de">
            <select className="campo" value={ctx || opcao.contextos[0].valor} onChange={(e) => setCtx(e.target.value)}>
              {opcao.contextos.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Campo>
        )}
        <button type="button" className="btn btn-anilha btn-m w-full" disabled={!aluno || copiando} onClick={copiar}>
          {copiando ? <Girando /> : 'Mandar a ficha'}
        </button>
      </div>
    </Folha>
  )
}

function EditarModelo({ id }: { id?: string }) {
  const avisar = useAviso()
  const biblioteca = useDados('modelos', () => fichas.modelos())
  const [semanas, setSemanas] = useState<number | null>(null)
  if (!biblioteca.dados) return biblioteca.erro ? <Erro mensagem={mensagemDeErro(biblioteca.erro)} /> : <Carregando />
  const m = id ? biblioteca.dados.modelos.find((x) => x.id === id) : undefined
  if (id && !m) return <Erro mensagem="Modelo não encontrado." />
  const sem = semanas ?? m?.semanas ?? 6
  const inicial: FichaEmMontagem = m ? { titulo: m.titulo, objetivo: m.objetivo, inicio: hoje(), previsao: somarDias(hoje(), m.semanas * 7), obs: m.obs, divisoes: m.divisoes as Divisao[] } : fichaVazia()
  return (
    <Montador
      key={m?.id ?? 'novo'}
      inicial={inicial}
      proprios={biblioteca.dados.proprios}
      datas={false}
      textoSalvar="Salvar o modelo"
      topo={
        <>
          <div>
            <p className="sobre">Modelo</p>
            <h1 className="titulo mt-1 text-4xl">{m ? m.titulo : 'Novo modelo'}</h1>
            <p className="mt-1 text-sm text-suave">O modelo não tem aluno nem datas: vira ficha quando você usa num aluno.</p>
          </div>
          <div className="cartao p-4">
            <p className="rotulo">Duração da fase</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Semanas">
              {[4, 6, 8, 10, 12].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={sem === n} className="chip" onClick={() => setSemanas(n)}>
                  {n} semanas
                </button>
              ))}
            </div>
          </div>
        </>
      }
      aoSalvar={async (x) => {
        try {
          await fichas.salvarModelo({ ...(m ? { id: m.id } : {}), titulo: x.titulo, objetivo: x.objetivo, semanas: sem, divisoes: x.divisoes, obs: x.obs })
          esquecer('modelos')
          avisar('Modelo salvo.')
          navegar('/pro/fichas#modelos')
        } catch (e) {
          avisar(mensagemDeErro(e), 'erro')
        }
      }}
    />
  )
}
