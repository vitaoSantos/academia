import { useState } from 'react'
import { PiCopy, PiPencilSimple, PiPlus, PiTrash, PiVideo } from 'react-icons/pi'
import { AppPro } from '../components/layout/AppPro'
import { useAviso } from '../components/ui/Aviso'
import { Abas, Campo, Carregando, Erro, Folha, Girando, Selo, Vazio } from '../components/ui/basicos'
import { fichas, mensagemDeErro, pro } from '../lib/api'
import { esquecer, useDados } from '../lib/dados'
import { Link } from '../lib/rotas'
import { useSessao } from '../lib/sessao'
import { useTitulo } from '../lib/titulo'
import { EXERCICIOS, GRUPOS, type Grupo } from '../shared/exercicios'
import { situacao, TEXTO_SITUACAO, type SituacaoFicha } from '../shared/ficha'
import { nivelProfissional } from '../shared/planos'
import { textoData } from '../shared/tempo'
import { plural, semAcento } from '../shared/texto'
import type { ExercicioProprio } from '../shared/tipos'

// As fichas do profissional (seção 9 do estudo): as dos alunos, os modelos (o treino igual que vai
// para outro aluno sem montar de novo) e os exercícios próprios (com o vídeo e o 3D de base)

type Aba = 'fichas' | 'modelos' | 'exercicios'
type Filtro = 'ativas' | 'trocar' | 'rascunhos' | 'arquivadas'

const TOM: Record<SituacaoFicha, 'ok' | 'alerta' | 'perigo' | 'neutro'> = { 'em-dia': 'ok', vencendo: 'alerta', vencida: 'perigo', rascunho: 'neutro', arquivada: 'neutro' }

export default function Fichas() {
  useTitulo('Fichas')
  const [aba, setAba] = useState<Aba>(() => (location.hash === '#modelos' ? 'modelos' : location.hash === '#exercicios' ? 'exercicios' : 'fichas'))
  return (
    <AppPro
      titulo="Fichas"
      acoes={
        <Link para="/pro/fichas/nova" className="btn btn-anilha btn-m">
          <PiPlus /> Nova ficha
        </Link>
      }
    >
      <Abas<Aba>
        className="mb-5"
        valor={aba}
        aoMudar={setAba}
        opcoes={[
          { id: 'fichas', rotulo: 'Dos alunos' },
          { id: 'modelos', rotulo: 'Modelos' },
          { id: 'exercicios', rotulo: 'Exercícios seus' },
        ]}
      />
      {aba === 'fichas' ? <DosAlunos /> : aba === 'modelos' ? <Modelos /> : <Proprios />}
    </AppPro>
  )
}

function DosAlunos() {
  const s = useSessao()
  const lista = useDados(s.profissional ? `pro-fichas:${s.profissional.id}` : null, () => pro.fichas())
  const [filtro, setFiltro] = useState<Filtro>('ativas')
  const [busca, setBusca] = useState('')
  if (!lista.dados) return lista.erro ? <Erro mensagem={mensagemDeErro(lista.erro)} aoTentar={lista.recarregar} /> : <Carregando />
  const todas = lista.dados.fichas
  const passa = (f: (typeof todas)[number]) => {
    const sit = situacao(f)
    if (filtro === 'ativas') return f.status === 'ativa'
    if (filtro === 'trocar') return sit === 'vencendo' || sit === 'vencida'
    if (filtro === 'rascunhos') return f.status === 'rascunho'
    return f.status === 'arquivada'
  }
  const filtradas = todas.filter((f) => passa(f) && (!busca || semAcento(`${f.alunoNome} ${f.titulo}`).includes(semAcento(busca)))).sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm))
  const conta = (x: Filtro) => todas.filter((f) => (x === 'ativas' ? f.status === 'ativa' : x === 'trocar' ? ['vencendo', 'vencida'].includes(situacao(f)) : x === 'rascunhos' ? f.status === 'rascunho' : f.status === 'arquivada')).length
  const nomes: Record<Filtro, string> = { ativas: 'Ativas', trocar: 'Para trocar', rascunhos: 'Rascunhos', arquivadas: 'Arquivadas' }
  if (!todas.length)
    return (
      <div className="cartao">
        <Vazio titulo="Nenhuma ficha ainda" texto="Monte a primeira com os exercícios do catálogo em 3D. Dá para guardar como modelo e usar em outros alunos.">
          <Link para="/pro/fichas/nova" className="btn btn-anilha btn-m">
            <PiPlus /> Montar a primeira
          </Link>
        </Vazio>
      </div>
    )
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(nomes) as Filtro[]).map((f) => (
          <button key={f} type="button" className="chip" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
            {nomes[f]} <span className="text-fraco">{conta(f)}</span>
          </button>
        ))}
        <input className="campo ml-auto max-w-60" type="search" placeholder="Aluno ou ficha" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar" />
      </div>
      {filtradas.length === 0 ? (
        <p className="text-sm text-suave">Nada por aqui.</p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-linha bg-sup">
          {filtradas.map((f) => {
            const sit = situacao(f)
            return (
              <li key={f.id} className="border-t border-linha first:border-t-0">
                <Link para={`/pro/fichas/${f.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-sup-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{f.alunoNome}</span>
                    <span className="block truncate text-xs text-suave">
                      {f.titulo} · {f.contexto.tipo === 'empresa' ? 'academia' : 'personal'} · troca {textoData(f.previsao)}
                    </span>
                  </span>
                  <Selo tom={TOM[sit]}>{TEXTO_SITUACAO[sit]}</Selo>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Modelos() {
  const avisar = useAviso()
  const m = useDados('modelos', () => fichas.modelos())
  if (!m.dados) return m.erro ? <Erro mensagem={mensagemDeErro(m.erro)} aoTentar={m.recarregar} /> : <Carregando />
  const apagar = async (id: string, titulo: string) => {
    if (!confirm(`Apagar o modelo "${titulo}"? As fichas que já saíram dele continuam com os alunos.`)) return
    try {
      const r = await fichas.apagarModelo(id)
      m.definir((x) => ({ modelos: r.modelos, proprios: x?.proprios ?? [] }))
      avisar('Modelo apagado.')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-suave">Monte uma vez, use em quantos alunos quiser: o modelo vira a ficha do aluno com as datas dele, e você ainda ajusta o que precisar.</p>
        <Link para="/pro/modelos/novo" className="btn btn-sup btn-m">
          <PiPlus /> Novo modelo
        </Link>
      </div>
      {m.dados.modelos.length === 0 ? (
        <div className="cartao">
          <Vazio titulo="Nenhum modelo ainda" texto="Crie um do zero ou, na ficha de um aluno, toque em “Salvar como modelo”." />
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {m.dados.modelos.map((x) => (
            <li key={x.id} className="cartao flex flex-col p-4">
              <p className="font-bold">{x.titulo}</p>
              <p className="mt-0.5 text-xs text-suave">
                {x.objetivo ? `${x.objetivo} · ` : ''}
                {plural(x.divisoes.length, 'divisão', 'divisões')} · {x.semanas} semanas · {x.usos ? `usado ${x.usos}×` : 'ainda não usado'}
              </p>
              <p className="mt-2 line-clamp-2 text-xs text-fraco">{x.divisoes.map((d) => `${d.nome}${d.foco ? ` (${d.foco})` : ''}`).join(' · ')}</p>
              <div className="mt-auto flex flex-wrap gap-1 pt-3">
                <Link para={`/pro/fichas/nova?modelo=${x.id}`} className="btn btn-anilha btn-p">
                  <PiCopy /> Usar num aluno
                </Link>
                <Link para={`/pro/modelos/${x.id}`} className="btn btn-fantasma btn-p">
                  <PiPencilSimple /> Editar
                </Link>
                <button type="button" className="btn btn-fantasma btn-p ml-auto" aria-label="Apagar" onClick={() => apagar(x.id, x.titulo)}>
                  <PiTrash />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Proprios() {
  const s = useSessao()
  const m = useDados('modelos', () => fichas.modelos())
  const [editando, setEditando] = useState<Partial<ExercicioProprio> | null>(null)
  const premium = !!s.profissional && nivelProfissional(s.profissional) === 'premium'
  if (!m.dados) return m.erro ? <Erro mensagem={mensagemDeErro(m.erro)} aoTentar={m.recarregar} /> : <Carregando />
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-suave">O exercício que não está no catálogo: dê o nome, escolha o movimento de base para o 3D e, se quiser, o link do seu vídeo.</p>
        <button type="button" className="btn btn-sup btn-m" onClick={() => setEditando({ grupo: 'funcional' })}>
          <PiPlus /> Novo exercício
        </button>
      </div>
      {m.dados.proprios.length === 0 ? (
        <p className="text-sm text-suave">Nenhum exercício seu ainda.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {m.dados.proprios.map((x) => (
            <li key={x.id}>
              <button type="button" onClick={() => setEditando(x)} className="cartao flex w-full items-center gap-3 p-4 text-left hover:border-linha-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{x.nome}</span>
                  <span className="block truncate text-xs text-suave">
                    {GRUPOS[x.grupo as Grupo] ?? x.grupo}
                    {x.base ? ` · 3D de ${EXERCICIOS.find((e) => e.id === x.base)?.nome.toLowerCase()}` : ''}
                  </span>
                </span>
                {x.video && <PiVideo className="shrink-0 text-lg text-anilha-legivel" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      <EditarProprio
        atual={editando}
        premium={premium}
        aoFechar={() => setEditando(null)}
        aoSalvar={(x) => {
          m.definir((d) => ({ modelos: d?.modelos ?? [], proprios: [x, ...(d?.proprios ?? []).filter((y) => y.id !== x.id)] }))
          esquecer('ficha:')
          setEditando(null)
        }}
      />
    </div>
  )
}

function EditarProprio({ atual, premium, aoFechar, aoSalvar }: { atual: Partial<ExercicioProprio> | null; premium: boolean; aoFechar: () => void; aoSalvar: (x: ExercicioProprio) => void }) {
  const avisar = useAviso()
  const [x, setX] = useState<Partial<ExercicioProprio>>({})
  const [salvando, setSalvando] = useState(false)
  const [ultimo, setUltimo] = useState<Partial<ExercicioProprio> | null>(null)
  if (atual !== ultimo) {
    setUltimo(atual)
    setX(atual ?? {})
  }
  const salvar = async () => {
    setSalvando(true)
    try {
      const { exercicio } = await fichas.exercicio({ ...x, nome: x.nome ?? '', grupo: x.grupo ?? 'funcional' })
      avisar('Exercício salvo. Ele aparece no montador da ficha.')
      aoSalvar(exercicio)
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setSalvando(false)
    }
  }
  return (
    <Folha aberta={!!atual} aoFechar={aoFechar} titulo="Exercício seu">
      <div className="space-y-4 p-6">
        <h2 className="titulo text-3xl">{x.id ? 'Editar exercício' : 'Novo exercício'}</h2>
        <Campo rotulo="Nome">
          <input className="campo" maxLength={60} value={x.nome ?? ''} onChange={(e) => setX((a) => ({ ...a, nome: e.target.value }))} placeholder="Agachamento búlgaro no step" />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Grupo">
            <select className="campo" value={x.grupo ?? 'funcional'} onChange={(e) => setX((a) => ({ ...a, grupo: e.target.value }))}>
              {(Object.keys(GRUPOS) as Grupo[]).map((g) => (
                <option key={g} value={g}>
                  {GRUPOS[g]}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Aparelho (opcional)">
            <input className="campo" maxLength={40} value={x.equipamento ?? ''} onChange={(e) => setX((a) => ({ ...a, equipamento: e.target.value || undefined }))} placeholder="Step, elástico..." />
          </Campo>
        </div>
        <Campo rotulo="Movimento de base para o 3D (opcional)" dica="O aluno vê o boneco fazendo este movimento, com o seu nome e o seu recado">
          <select className="campo" value={x.base ?? ''} onChange={(e) => setX((a) => ({ ...a, base: e.target.value || undefined }))}>
            <option value="">Sem 3D</option>
            {EXERCICIOS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Vídeo (opcional)" dica={premium ? 'Link do YouTube, Vimeo ou Instagram' : 'O vídeo é do plano Premium'}>
          <input className="campo" disabled={!premium} value={x.video ?? ''} onChange={(e) => setX((a) => ({ ...a, video: e.target.value || undefined }))} placeholder="https://youtube.com/..." />
        </Campo>
        <Campo rotulo="Como fazer (opcional)">
          <textarea className="campo min-h-24" maxLength={800} value={x.instrucoes ?? ''} onChange={(e) => setX((a) => ({ ...a, instrucoes: e.target.value || undefined }))} />
        </Campo>
        <button type="button" className="btn btn-anilha btn-m w-full" disabled={salvando || (x.nome?.trim().length ?? 0) < 3} onClick={salvar}>
          {salvando ? <Girando /> : 'Salvar'}
        </button>
      </div>
    </Folha>
  )
}
