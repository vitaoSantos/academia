import { useEffect, useState, type ReactNode } from 'react'
import { PiMagnifyingGlass } from 'react-icons/pi'
import { useAviso } from '../components/ui/Aviso'
import { Avatar, Carregando, Erro, Folha, Girando, Selo } from '../components/ui/basicos'
import { enderecoPublico } from '../data/marca'
import { admin, mensagemDeErro, type ContaNoAdmin, type EmpresaNoAdmin, type ProfissionalNoAdmin } from '../lib/api'
import { esquecer, useDados } from '../lib/dados'
import { Link } from '../lib/rotas'
import { textoNota } from '../shared/avaliacao'
import { NOMES_PLANO } from '../shared/planos'
import { dataDe, dataPorExtenso } from '../shared/tempo'
import { plural, semAcento } from '../shared/texto'
import type { Nota, TipoEmpresa } from '../shared/tipos'
import { useAdmin, useMotivo } from './Admin'

// As listas do admin: as empresas, os profissionais e as contas, com a busca e as ações (suspender,
// trocar o plano, estender o teste, bloquear, dar o Turma+). Toda ação pede o motivo.

const TIPOS: Record<TipoEmpresa, string> = { academia: 'Academia', rede: 'Rede', estudio: 'Estúdio', box: 'Box', ct: 'CT de lutas', danca: 'Escola de dança', aquatica: 'Natação' }

type Op = { id: string; nome: string; descricao: string; extra?: 'plano' | 'dias'; perigo?: boolean }
type Extra = { plano?: 'basico' | 'premium'; dias?: number }

// A folha de ação: o que fazer, o motivo e a confirmação
function Acao({ titulo, sub, ops, aoFechar, fazer }: { titulo: string; sub?: string; ops: Op[]; aoFechar: () => void; fazer: (op: string, motivo: string, extra: Extra) => Promise<void> }) {
  const avisar = useAviso()
  const { motivo, campo, valido } = useMotivo()
  // nada vem escolhido: suspender ou bloquear nunca é o padrão
  const [op, setOp] = useState('')
  const [plano, setPlano] = useState<'basico' | 'premium'>('premium')
  const [dias, setDias] = useState(15)
  const [fazendo, setFazendo] = useState(false)
  const escolhida = ops.find((o) => o.id === op)
  const confirmar = async () => {
    if (!escolhida) return
    setFazendo(true)
    try {
      await fazer(op, motivo.trim(), escolhida.extra === 'plano' ? { plano } : escolhida.extra === 'dias' ? { dias } : {})
      avisar('Feito. Ficou no registro.')
      aoFechar()
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setFazendo(false)
    }
  }
  return (
    <Folha aberta aoFechar={aoFechar} titulo={titulo}>
      <div className="space-y-4 p-6">
        <div>
          <h2 className="titulo text-3xl">{titulo}</h2>
          {sub && <p className="mt-1 text-sm text-suave">{sub}</p>}
        </div>
        <div className="space-y-2" role="radiogroup" aria-label="O que fazer">
          {ops.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={op === o.id}
              onClick={() => setOp(o.id)}
              className="block w-full rounded-2xl border border-linha p-3 text-left aria-checked:border-anilha aria-checked:bg-anilha-suave"
            >
              <span className={`block text-sm font-semibold ${o.perigo ? 'text-perigo' : ''}`}>{o.nome}</span>
              <span className="block text-xs text-suave">{o.descricao}</span>
            </button>
          ))}
        </div>
        {escolhida?.extra === 'plano' && (
          <div className="flex gap-1.5" role="radiogroup" aria-label="Plano">
            {(['basico', 'premium'] as const).map((p) => (
              <button key={p} type="button" role="radio" aria-checked={plano === p} className="chip" onClick={() => setPlano(p)}>
                {NOMES_PLANO[p]}
              </button>
            ))}
          </div>
        )}
        {escolhida?.extra === 'dias' && (
          <label className="flex items-center gap-2 text-sm">
            Mais
            <input className="campo h-10 w-20 px-3" type="number" min={1} max={90} value={dias} onChange={(e) => setDias(Math.max(1, Math.min(90, Number(e.target.value) || 1)))} />
            dias de teste com tudo do Premium
          </label>
        )}
        {campo}
        <button type="button" className={`btn btn-m w-full ${escolhida?.perigo ? 'btn-perigo' : 'btn-anilha'}`} disabled={!valido || fazendo || !escolhida} onClick={confirmar}>
          {fazendo ? <Girando /> : escolhida ? escolhida.nome : 'Escolha o que fazer'}
        </button>
      </div>
    </Folha>
  )
}

// A lista com a busca e os filtros numa linha só, em cima
function Lista<T>({
  titulo,
  descricao,
  filtros,
  filtro,
  aoFiltrar,
  busca,
  aoBuscar,
  itens,
  carregando,
  erro,
  aoTentar,
  linha,
}: {
  titulo: string
  descricao: string
  filtros: { id: string; nome: string; n: number }[]
  filtro: string
  aoFiltrar: (f: string) => void
  busca: string
  aoBuscar: (b: string) => void
  itens: T[] | null
  carregando: boolean
  erro?: unknown
  aoTentar: () => void
  linha: (x: T) => ReactNode
}) {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="titulo text-4xl">{titulo}</h1>
        <p className="mt-1 max-w-2xl text-sm text-suave">{descricao}</p>
      </header>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <PiMagnifyingGlass className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fraco" />
          <input className="campo pl-10" type="search" placeholder="Buscar" value={busca} onChange={(e) => aoBuscar(e.target.value)} aria-label={`Buscar em ${titulo.toLowerCase()}`} />
        </div>
        {filtros.map((f) => (
          <button key={f.id} type="button" className="chip" aria-pressed={filtro === f.id} onClick={() => aoFiltrar(f.id)}>
            {f.nome} <span className="text-fraco">{f.n}</span>
          </button>
        ))}
        {carregando && itens && <Girando className="text-fraco" />}
      </div>
      {!itens ? (
        erro ? (
          <Erro mensagem={mensagemDeErro(erro)} aoTentar={aoTentar} />
        ) : (
          <Carregando />
        )
      ) : itens.length === 0 ? (
        <p className="cartao p-5 text-sm text-suave">Nada com esse filtro.</p>
      ) : (
        <ul className="space-y-2">{itens.map(linha)}</ul>
      )}
    </div>
  )
}

// a última leitura fica na tela enquanto a próxima chega
function useUltima<T>(atual: T | undefined) {
  const [ultima, setUltima] = useState<T | undefined>(atual)
  if (atual !== undefined && atual !== ultima) setUltima(atual)
  return atual ?? ultima
}

const ondeTem = (texto: string, busca: string) => !busca || semAcento(texto).includes(semAcento(busca))

// a nota só aparece com 3 avaliações ou mais (antes disso é "Novo")
const textoDaNota = (n: Nota) => (n.total >= 3 ? `nota ${textoNota(n)} (${n.total})` : n.total ? plural(n.total, 'avaliação', 'avaliações') : 'sem avaliações')

// ---------- Empresas ----------

export function EmpresasDoAdmin() {
  const { demo } = useAdmin()
  const d = useDados(`admin-empresas:${demo ? 1 : 0}`, () => admin.empresas(demo))
  const lista = useUltima(d.dados?.empresas)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todas')
  const [alvo, setAlvo] = useState<EmpresaNoAdmin | null>(null)
  const todas = lista ?? []
  const passa = (e: EmpresaNoAdmin, f: string) => f === 'todas' || e.status === f
  const itens = lista ? todas.filter((e) => passa(e, filtro) && ondeTem(`${e.nome} ${e.slug} ${e.unidades.join(' ')}`, busca)) : null
  const estado = (e: EmpresaNoAdmin) =>
    e.status === 'suspensa' ? (
      <Selo tom="perigo">Suspensa</Selo>
    ) : e.plano === 'teste' ? (
      <Selo tom={e.nivel === 'nenhum' ? 'perigo' : 'alerta'}>{e.nivel === 'nenhum' ? 'Teste acabou' : `Teste até ${dataPorExtenso(dataDe(e.testeAte!)).replace(/ de \d{4}$/, '')}`}</Selo>
    ) : (
      <Selo tom={e.plano === 'premium' ? 'marca' : 'neutro'}>{NOMES_PLANO[e.plano]}</Selo>
    )
  return (
    <>
      <Lista
        titulo="Empresas"
        descricao="As academias, as redes, os estúdios, os boxes, os CTs e as escolas. A mensalidade é a do plano pelas unidades ativas, com o desconto de rede."
        filtros={[
          { id: 'todas', nome: 'Todas', n: todas.length },
          { id: 'teste', nome: 'No teste', n: todas.filter((e) => passa(e, 'teste')).length },
          { id: 'ativa', nome: 'Ativas', n: todas.filter((e) => passa(e, 'ativa')).length },
          { id: 'suspensa', nome: 'Suspensas', n: todas.filter((e) => passa(e, 'suspensa')).length },
        ]}
        filtro={filtro}
        aoFiltrar={setFiltro}
        busca={busca}
        aoBuscar={setBusca}
        itens={itens}
        carregando={!d.dados}
        erro={d.erro}
        aoTentar={d.recarregar}
        linha={(e) => (
          <li key={e.slug} className="cartao p-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                  {e.nome} <Selo>{TIPOS[e.tipo]}</Selo>
                  {e.demo && <Selo>Demonstração</Selo>}
                </p>
                <p className="mt-0.5 text-xs text-suave">
                  <Link para={`/${e.slug}`} className="hover:text-texto">
                    {enderecoPublico(e.slug)}
                  </Link>{' '}
                  · desde {dataPorExtenso(dataDe(e.criadaEm))}
                </p>
                <p className="mt-1 text-xs text-fraco">{e.unidades.join(' · ') || 'Sem unidade ativa'}</p>
              </div>
              <div className="shrink-0 text-right">
                {estado(e)}
                <p className="dado mt-1.5 text-sm font-semibold">{e.mensalidade ? `${(e.mensalidade / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês` : '–'}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-suave">
              <span>{plural(e.alunos, 'aluno', 'alunos')}</span>
              <span>{textoDaNota(e.nota)}</span>
              {e.plano === 'teste' && e.planoDepois && <span>depois: {NOMES_PLANO[e.planoDepois]}</span>}
              <button type="button" className="btn btn-sup btn-p ml-auto" onClick={() => setAlvo(e)}>
                Mudar
              </button>
            </div>
          </li>
        )}
      />
      {alvo && (
        <Acao
          key={alvo.slug}
          titulo={alvo.nome}
          sub={`${TIPOS[alvo.tipo]} · ${alvo.unidades.length} ${alvo.unidades.length === 1 ? 'unidade' : 'unidades'}`}
          aoFechar={() => setAlvo(null)}
          ops={[
            alvo.status === 'suspensa'
              ? { id: 'reativar', nome: 'Reativar', descricao: 'Volta ao mapa, à página e ao app dos alunos' }
              : { id: 'suspender', nome: 'Suspender', descricao: 'Sai do mapa e da busca; o painel e o app com a marca param', perigo: true },
            { id: 'plano', nome: 'Trocar o plano', descricao: 'Muda na hora, sem cobrança (no protótipo)', extra: 'plano' },
            ...(alvo.plano === 'teste' ? [{ id: 'teste', nome: 'Estender o teste', descricao: 'Mais dias com tudo do Premium, contados do fim do teste (ou de hoje, se já acabou)', extra: 'dias' as const }] : []),
          ]}
          fazer={async (op, motivo, extra) => {
            await admin.empresa(alvo.slug, op as 'suspender', motivo, extra)
            esquecer('admin-')
            await d.recarregar()
          }}
        />
      )}
    </>
  )
}

// ---------- Profissionais ----------

export function ProfissionaisDoAdmin() {
  const { demo } = useAdmin()
  const d = useDados(`admin-profissionais:${demo ? 1 : 0}`, () => admin.profissionais(demo))
  const lista = useUltima(d.dados?.profissionais)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [alvo, setAlvo] = useState<ProfissionalNoAdmin | null>(null)
  const todos = lista ?? []
  const passa = (p: ProfissionalNoAdmin, f: string) => f === 'todos' || (f === 'personais' ? p.personal : f === 'professores' ? !p.personal : p.status === 'suspenso')
  const itens = lista ? todos.filter((p) => passa(p, filtro) && ondeTem(`${p.nome} ${p.slug} ${p.cidade} ${p.cref ?? ''}`, busca)) : null
  return (
    <>
      <Lista
        titulo="Profissionais"
        descricao="Os personais (que assinam o plano) e os professores das academias (que não pagam). O CREF é o que o profissional informou."
        filtros={[
          { id: 'todos', nome: 'Todos', n: todos.length },
          { id: 'personais', nome: 'Personais', n: todos.filter((p) => passa(p, 'personais')).length },
          { id: 'professores', nome: 'Professores', n: todos.filter((p) => passa(p, 'professores')).length },
          { id: 'suspensos', nome: 'Suspensos', n: todos.filter((p) => passa(p, 'suspensos')).length },
        ]}
        filtro={filtro}
        aoFiltrar={setFiltro}
        busca={busca}
        aoBuscar={setBusca}
        itens={itens}
        carregando={!d.dados}
        erro={d.erro}
        aoTentar={d.recarregar}
        linha={(p) => (
          <li key={p.id} className="cartao p-4">
            <div className="flex flex-wrap items-start gap-3">
              <Avatar nome={p.nome} tamanho={40} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                  {p.nome} <Selo>{p.personal ? 'Personal' : 'Professor'}</Selo>
                  {p.demo && <Selo>Demonstração</Selo>}
                  {!p.publico && <Selo>Página fechada</Selo>}
                </p>
                <p className="mt-0.5 text-xs text-suave">
                  {p.publico ? (
                    <Link para={`/${p.slug}`} className="hover:text-texto">
                      {enderecoPublico(p.slug)}
                    </Link>
                  ) : (
                    enderecoPublico(p.slug)
                  )}{' '}
                  · {p.cidade}
                  {p.cref ? ` · CREF ${p.cref}` : ' · sem CREF'}
                </p>
              </div>
              <div className="shrink-0">
                {p.status === 'suspenso' ? (
                  <Selo tom="perigo">Suspenso</Selo>
                ) : p.personal ? (
                  <Selo tom={p.nivel === 'nenhum' ? 'perigo' : p.plano === 'teste' ? 'alerta' : p.plano === 'premium' ? 'marca' : 'neutro'}>
                    {p.plano === 'teste' ? (p.nivel === 'nenhum' ? 'Teste acabou' : 'No teste') : NOMES_PLANO[p.plano]}
                  </Selo>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-suave">
              <span>{plural(p.numeros.alunosAtivos, 'aluno ativo', 'alunos ativos')}</span>
              <span>{plural(p.numeros.alunosInstruidos, 'instruído', 'instruídos')}</span>
              <span>{plural(p.numeros.fichas, 'ficha', 'fichas')}</span>
              <span>{textoDaNota(p.numeros.nota)}</span>
              <button type="button" className="btn btn-sup btn-p ml-auto" onClick={() => setAlvo(p)}>
                Mudar
              </button>
            </div>
          </li>
        )}
      />
      {alvo && (
        <Acao
          key={alvo.id}
          titulo={alvo.nome}
          sub={alvo.personal ? 'Personal trainer' : 'Professor (não assina plano)'}
          aoFechar={() => setAlvo(null)}
          ops={[
            alvo.status === 'suspenso'
              ? { id: 'reativar', nome: 'Reativar', descricao: 'A página e o app com a marca voltam' }
              : { id: 'suspender', nome: 'Suspender', descricao: 'Sai do mapa e da busca; não atende pelo app', perigo: true },
            ...(alvo.personal
              ? [
                  { id: 'plano', nome: 'Trocar o plano', descricao: 'Muda na hora, sem cobrança (no protótipo)', extra: 'plano' as const },
                  ...(alvo.plano === 'teste' ? [{ id: 'teste', nome: 'Estender o teste', descricao: 'Mais dias com tudo do Premium, contados de hoje', extra: 'dias' as const }] : []),
                ]
              : []),
          ]}
          fazer={async (op, motivo, extra) => {
            await admin.profissional(alvo.id, op as 'suspender', motivo, extra)
            esquecer('admin-')
            await d.recarregar()
          }}
        />
      )}
    </>
  )
}

// ---------- Contas ----------

export function ContasDoAdmin() {
  const { demo } = useAdmin()
  const [busca, setBusca] = useState('')
  const [termo, setTermo] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setTermo(busca.trim()), 300)
    return () => clearTimeout(t)
  }, [busca])
  const d = useDados(`admin-contas:${demo ? 1 : 0}:${termo}`, () => admin.usuarios(termo, demo))
  const lista = useUltima(d.dados?.usuarios)
  const [filtro, setFiltro] = useState('todas')
  const [alvo, setAlvo] = useState<ContaNoAdmin | null>(null)
  const todas = lista ?? []
  const passa = (c: ContaNoAdmin, f: string) => f === 'todas' || (f === 'mais' ? c.plano === 'mais' : f === 'bloqueadas' ? c.bloqueado : c.empresas.length > 0 || !!c.profissional)
  const itens = lista ? todas.filter((c) => passa(c, filtro)) : null
  return (
    <>
      <Lista
        titulo="Contas"
        descricao="As pessoas: alunos, profissionais e quem cuida das academias. A busca olha o nome, o @, o e-mail e o celular (as 200 mais novas que batem)."
        filtros={[
          { id: 'todas', nome: 'Todas', n: todas.length },
          { id: 'mais', nome: 'Turma+', n: todas.filter((c) => passa(c, 'mais')).length },
          { id: 'trabalho', nome: 'Profissionais e equipes', n: todas.filter((c) => passa(c, 'trabalho')).length },
          { id: 'bloqueadas', nome: 'Bloqueadas', n: todas.filter((c) => passa(c, 'bloqueadas')).length },
        ]}
        filtro={filtro}
        aoFiltrar={setFiltro}
        busca={busca}
        aoBuscar={setBusca}
        itens={itens}
        carregando={!d.dados}
        erro={d.erro}
        aoTentar={d.recarregar}
        linha={(c) => (
          <li key={c.id} className="cartao p-4">
            <div className="flex flex-wrap items-start gap-3">
              <Avatar nome={c.nome} foto={c.foto} tamanho={40} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                  {c.nome}
                  {c.plano === 'mais' && <Selo tom="marca">Turma+</Selo>}
                  {c.bloqueado && <Selo tom="perigo">Bloqueada</Selo>}
                  {c.demo && <Selo>Demonstração</Selo>}
                  {!c.publico && <Selo>Perfil fechado</Selo>}
                </p>
                <p className="mt-0.5 truncate text-xs text-suave">
                  <Link para={`/u/${c.usuario}`} className="hover:text-texto">
                    @{c.usuario}
                  </Link>
                  {[c.email, c.celular, c.cidade].filter(Boolean).map((x) => ` · ${x}`)}
                </p>
                <p className="mt-1 text-xs text-fraco">
                  Desde {dataPorExtenso(dataDe(c.criadaEm))}
                  {c.profissional ? ' · perfil profissional' : ''}
                  {c.empresas.map((e) => ` · ${e.papel} em ${e.slug}`)}
                </p>
              </div>
              <button type="button" className="btn btn-sup btn-p shrink-0" onClick={() => setAlvo(c)}>
                Mudar
              </button>
            </div>
          </li>
        )}
      />
      {alvo && (
        <Acao
          key={alvo.id}
          titulo={alvo.nome}
          sub={`@${alvo.usuario}`}
          aoFechar={() => setAlvo(null)}
          ops={[
            alvo.bloqueado
              ? { id: 'desbloquear', nome: 'Desbloquear', descricao: 'A pessoa volta a entrar' }
              : { id: 'bloquear', nome: 'Bloquear a conta', descricao: 'Sai de todos os aparelhos e não entra mais', perigo: true },
            alvo.plano === 'mais'
              ? { id: 'gratis', nome: 'Voltar ao grátis', descricao: 'Tira o Turma+' }
              : { id: 'mais', nome: 'Dar o Turma+ por um ano', descricao: 'Cortesia: parceria, influenciador, reclamação resolvida' },
          ]}
          fazer={async (op, motivo) => {
            await admin.usuario(alvo.id, op as 'bloquear', motivo)
            esquecer('admin-')
            await d.recarregar()
          }}
        />
      )}
    </>
  )
}
