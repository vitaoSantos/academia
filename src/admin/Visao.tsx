import { useState, type ReactNode } from 'react'
import { PiArrowDownRight, PiArrowUpRight, PiWarningCircleFill } from 'react-icons/pi'
import { GraficoColunas } from '../components/graficos/GraficoColunas'
import { dataCurta } from '../components/graficos/GraficoLinha'
import { useAviso } from '../components/ui/Aviso'
import { Carregando, Erro, Girando } from '../components/ui/basicos'
import { admin, mensagemDeErro, type DiaDoAdmin, type GeralDoAdmin } from '../lib/api'
import { esquecer, useDados } from '../lib/dados'
import { Link } from '../lib/rotas'
import { textoData } from '../shared/tempo'
import { formatarPreco, numero, plural } from '../shared/texto'
import { useAdmin } from './Admin'

// A visão geral do admin: a receita do mês (a estimativa pelas assinaturas ativas, pelos preços de
// hoje), os números da plataforma e a atividade dos últimos 14 dias, um gráfico por medida (escalas
// diferentes não dividem eixo).

const compacto = (n: number) => (n < 10_000 ? numero(n) : n.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }))

function Numero({ rotulo, valor, sub, alerta }: { rotulo: string; valor: ReactNode; sub?: ReactNode; alerta?: boolean }) {
  return (
    <div className={`cartao p-4 ${alerta ? 'border-alerta' : ''}`}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-suave">
        {alerta && <PiWarningCircleFill className="text-alerta" aria-hidden />}
        {rotulo}
      </p>
      <p className="mt-1.5 text-3xl font-semibold">{valor}</p>
      {sub && <p className="mt-1 text-xs text-suave">{sub}</p>}
    </div>
  )
}

const MEDIDAS: { id: keyof Omit<DiaDoAdmin, 'data'>; nome: string; unidade: [string, string] }[] = [
  { id: 'cadastros', nome: 'Cadastros', unidade: ['cadastro', 'cadastros'] },
  { id: 'treinos', nome: 'Treinos registrados', unidade: ['treino', 'treinos'] },
  { id: 'reservas', nome: 'Reservas de aula', unidade: ['reserva', 'reservas'] },
  { id: 'posts', nome: 'Posts na rede', unidade: ['post', 'posts'] },
]

function Atividade({ dias }: { dias: DiaDoAdmin[] }) {
  return (
    <section aria-labelledby="atividade">
      <h2 id="atividade" className="titulo mb-3 text-2xl">
        Atividade nos últimos 14 dias
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {MEDIDAS.map((m) => {
          const soma = (l: DiaDoAdmin[]) => l.reduce((n, d) => n + d[m.id], 0)
          const agora = soma(dias.slice(-7))
          const antes = soma(dias.slice(-14, -7))
          const variacao = antes ? (agora - antes) / antes : null
          const sobe = variacao !== null && variacao > 0
          return (
            <div key={m.id} className="cartao p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="text-sm font-semibold text-suave">{m.nome}</h3>
                <p className="text-xs">
                  {variacao === null ? (
                    <span className="text-fraco">{agora ? 'sem os 7 dias antes para comparar' : 'nada ainda'}</span>
                  ) : variacao === 0 ? (
                    <span className="text-suave">igual aos 7 dias antes</span>
                  ) : (
                    <span className={`inline-flex items-center gap-0.5 font-semibold ${sobe ? 'text-ok' : 'text-perigo'}`}>
                      {sobe ? <PiArrowUpRight aria-hidden /> : <PiArrowDownRight aria-hidden />}
                      {sobe ? '+' : '−'}
                      {Math.round(Math.abs(variacao) * 100)}% <span className="font-normal text-suave">vs. os 7 dias antes</span>
                    </span>
                  )}
                </p>
              </div>
              <p className="mt-1 text-2xl font-semibold">
                {compacto(agora)} <span className="text-sm font-normal text-suave">nos últimos 7 dias</span>
              </p>
              <div className="mt-3">
                <GraficoColunas
                  altura={120}
                  rotulo={`${m.nome} por dia, nos últimos 14 dias`}
                  recentes={{ n: 7, nome: 'últimos 7 dias', antes: '7 dias antes' }}
                  colunas={dias.map((d) => ({ rotulo: dataCurta(d.data), valor: d[m.id], detalhe: `${textoData(d.data)}: ${numero(d[m.id])} ${d[m.id] === 1 ? m.unidade[0] : m.unidade[1]}` }))}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function VisaoDoAdmin() {
  const { demo } = useAdmin()
  const avisar = useAviso()
  const g = useDados(`admin-geral:${demo ? 1 : 0}`, () => admin.geral(demo))
  // a última leitura fica na tela enquanto a próxima chega (ao ligar e desligar a demonstração)
  const [ultima, setUltima] = useState<GeralDoAdmin | null>(null)
  if (g.dados && g.dados !== ultima) setUltima(g.dados)
  const d = g.dados ?? ultima
  const [recriando, setRecriando] = useState(false)
  if (!d) return g.erro ? <Erro mensagem={mensagemDeErro(g.erro)} aoTentar={g.recarregar} /> : <Carregando />
  const r = d.receita
  const parte = (v: number) => (r.total ? `${Math.round((v / r.total) * 100)}%` : '–')

  const recriar = async () => {
    if (!confirm('Recriar a demonstração? As contas de demonstração voltam ao começo; o resto da plataforma não muda.')) return
    setRecriando(true)
    try {
      await admin.recriarDemo()
      esquecer('admin')
      await g.recarregar()
      avisar('Demonstração recriada.')
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setRecriando(false)
    }
  }

  return (
    <div className={`space-y-8 transition-opacity ${g.dados ? '' : 'opacity-60'}`}>
      <section aria-labelledby="receita" className="grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-end">
        <div>
          <h1 id="receita" className="text-sm font-semibold text-suave">
            Receita mensal estimada {demo ? '(com a demonstração)' : ''}
          </h1>
          <p className="mt-1 text-5xl font-semibold tracking-tight sm:text-6xl">{formatarPreco(r.total)}</p>
          <p className="mt-2 max-w-xl text-xs text-fraco">As assinaturas ativas fora do teste, pelos preços de hoje. No protótipo, nada é cobrado: é a conta que o plano daria.</p>
        </div>
        <dl className="cartao divide-y divide-linha text-sm">
          {[
            ['Academias e redes', r.academias],
            ['Personais', r.personais],
            ['Turma+ dos alunos', r.alunos],
          ].map(([nome, valor]) => (
            <div key={nome as string} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
              <dt className="text-suave">{nome}</dt>
              <dd className="dado font-semibold">
                {formatarPreco(valor as number)} <span className="ml-1 text-xs font-normal text-fraco">{parte(valor as number)}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label="Números da plataforma" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Numero rotulo="Contas" valor={compacto(d.contas)} sub={`${numero(d.turmaMais)} no Turma+`} />
        <Numero rotulo="Empresas" valor={compacto(d.empresas.total)} sub={`${plural(d.empresas.ativas, 'ativa', 'ativas')} · ${d.empresas.teste} no teste${d.empresas.suspensas ? ` · ${plural(d.empresas.suspensas, 'suspensa', 'suspensas')}` : ''}`} />
        <Numero rotulo="Unidades no mapa" valor={compacto(d.empresas.unidades)} />
        <Numero rotulo="Alunos nas academias" valor={compacto(d.empresas.alunos)} />
        <Numero rotulo="Profissionais" valor={compacto(d.profissionais.total)} sub={`${plural(d.profissionais.personais, 'personal', 'personais')} · ${plural(d.profissionais.professores, 'professor', 'professores')}`} />
        <Link para="/admin/moderacao" className="block">
          <Numero rotulo="Denúncias abertas" valor={d.denuncias} sub={d.denuncias ? 'Ver na moderação' : 'Nada para olhar'} alerta={d.denuncias > 0} />
        </Link>
      </section>

      <Atividade dias={d.dias} />

      <section className="cartao flex flex-wrap items-center gap-4 p-5" aria-labelledby="demo">
        <div className="min-w-0 flex-1">
          <h2 id="demo" className="font-semibold">
            Demonstração
          </h2>
          <p className="mt-1 text-sm text-suave">As contas de exemplo (a Força Total, o Rafa, a Ana...) se recriam sozinhas a cada três dias. Recrie agora se alguém bagunçou.</p>
        </div>
        <button type="button" className="btn btn-sup btn-m" disabled={recriando} onClick={recriar}>
          {recriando ? <Girando /> : 'Recriar agora'}
        </button>
      </section>
    </div>
  )
}
