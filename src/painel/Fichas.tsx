import { useState } from 'react'
import { PiPlus } from 'react-icons/pi'
import { Carregando, Erro, Selo, Vazio } from '../components/ui/basicos'
import { mensagemDeErro, painel } from '../lib/api'
import { useDados } from '../lib/dados'
import { Link } from '../lib/rotas'
import { useSessao } from '../lib/sessao'
import { situacao, TEXTO_SITUACAO, type SituacaoFicha } from '../shared/ficha'
import { textoData } from '../shared/tempo'
import { semAcento } from '../shared/texto'
import { usePainel } from './AppPainel'

// As fichas da academia (seção 9 do estudo): todas as que os professores montaram para os alunos
// dela, com as que estão chegando na troca. Quem tem o perfil de professor abre no montador.

type Filtro = 'ativas' | 'trocar' | 'rascunhos' | 'arquivadas'

const TOM: Record<SituacaoFicha, 'ok' | 'alerta' | 'perigo' | 'neutro'> = { 'em-dia': 'ok', vencendo: 'alerta', vencida: 'perigo', rascunho: 'neutro', arquivada: 'neutro' }
const NOMES: Record<Filtro, string> = { ativas: 'Ativas', trocar: 'Para trocar', rascunhos: 'Rascunhos', arquivadas: 'Arquivadas' }

export function FichasDaAcademia() {
  const c = usePainel()
  const s = useSessao()
  const d = useDados(`painel-fichas:${c.slug}`, () => painel.fichas(c.slug))
  const [filtro, setFiltro] = useState<Filtro>('ativas')
  const [busca, setBusca] = useState('')
  const [unidade, setUnidade] = useState('')
  const ativas = c.empresa.unidades.filter((u) => u.ativa)
  const monta = !!s.profissional

  const cabeca = (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="titulo text-4xl">Fichas</h1>
        <p className="mt-1 max-w-2xl text-sm text-suave">As fichas que os professores montaram para os alunos da academia. O aluno recebe o aviso, vê cada exercício em 3D e treina com ela.</p>
      </div>
      {monta && (
        <Link para={`/pro/fichas/nova?contexto=empresa:${c.slug}`} className="btn btn-anilha btn-m">
          <PiPlus /> Nova ficha
        </Link>
      )}
    </header>
  )
  if (!d.dados)
    return (
      <div className="space-y-5">
        {cabeca}
        {d.erro ? <Erro mensagem={mensagemDeErro(d.erro)} aoTentar={d.recarregar} /> : <Carregando />}
      </div>
    )

  const todas = d.dados.fichas
  const passa = (f: (typeof todas)[number], x: Filtro) => {
    const sit = situacao(f)
    if (x === 'ativas') return f.status === 'ativa'
    if (x === 'trocar') return sit === 'vencendo' || sit === 'vencida'
    if (x === 'rascunhos') return f.status === 'rascunho'
    return f.status === 'arquivada'
  }
  const daUnidade = (f: (typeof todas)[number]) => !unidade || (f.contexto.tipo === 'empresa' && f.contexto.unidade === unidade)
  const filtradas = todas
    .filter((f) => passa(f, filtro) && daUnidade(f) && (!busca || semAcento(`${f.alunoNome} ${f.titulo}`).includes(semAcento(busca))))
    .sort((a, b) => (filtro === 'trocar' ? a.previsao.localeCompare(b.previsao) : b.atualizadaEm.localeCompare(a.atualizadaEm)))

  return (
    <div className="space-y-5">
      {cabeca}
      {!monta && (
        <p className="cartao p-4 text-sm text-suave">
          Para montar fichas também, crie o seu perfil de professor (a mesma conta).{' '}
          <Link para="/comecar/personal?professor=1" className="font-semibold text-texto underline">
            Perfil de professor
          </Link>
        </p>
      )}
      {todas.length === 0 ? (
        <div className="cartao">
          <Vazio titulo="Nenhuma ficha ainda" texto="Os professores da equipe montam as fichas pelo painel deles, com o catálogo de exercícios em 3D." />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(NOMES) as Filtro[]).map((x) => (
              <button key={x} type="button" className="chip" aria-pressed={filtro === x} onClick={() => setFiltro(x)}>
                {NOMES[x]} <span className="text-fraco">{todas.filter((f) => passa(f, x) && daUnidade(f)).length}</span>
              </button>
            ))}
            {ativas.length > 1 && (
              <select className="campo h-9 w-auto py-0 pr-9 text-sm" value={unidade} onChange={(ev) => setUnidade(ev.target.value)} aria-label="Unidade">
                <option value="">Todas as unidades</option>
                {ativas.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            )}
            <input className="campo ml-auto max-w-60" type="search" placeholder="Aluno ou ficha" value={busca} onChange={(ev) => setBusca(ev.target.value)} aria-label="Buscar" />
          </div>
          {filtradas.length === 0 ? (
            <p className="text-sm text-suave">Nada por aqui.</p>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-linha bg-sup">
              {filtradas.map((f) => {
                const sit = situacao(f)
                const u = f.contexto.tipo === 'empresa' && ativas.length > 1 ? ativas.find((x) => f.contexto.tipo === 'empresa' && x.id === f.contexto.unidade) : undefined
                return (
                  <li key={f.id} className="border-t border-linha first:border-t-0">
                    <Link para={monta ? `/pro/fichas/${f.id}` : `/painel/${c.slug}/alunos/${f.aluno}`} className="flex items-center gap-3 px-4 py-3 hover:bg-sup-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{f.alunoNome}</span>
                        <span className="block truncate text-xs text-suave">
                          {f.titulo}
                          {u ? ` · ${u.nome}` : ''} · troca {textoData(f.previsao)}
                        </span>
                      </span>
                      <Selo tom={TOM[sit]}>{TEXTO_SITUACAO[sit]}</Selo>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
