import { useState } from 'react'
import { PiArrowDown, PiArrowUp, PiPencilSimple, PiPlus, PiTrash } from 'react-icons/pi'
import { EscolherModalidades } from '../components/modalidades/EscolherModalidades'
import { Faixa } from '../components/perfil/Faixa'
import { useAviso } from '../components/ui/Aviso'
import { Campo, Folha, Girando, Interruptor } from '../components/ui/basicos'
import { Etiquetas } from '../components/ui/Etiquetas'
import { mensagemDeErro, painel } from '../lib/api'
import { esquecer } from '../lib/dados'
import { SISTEMAS } from '../shared/graduacao'
import { FAMILIAS, MODALIDADE, familiaDe, nomeModalidade } from '../shared/modalidades'
import { centavosDe, formatarPreco, plural } from '../shared/texto'
import type { ModalidadeOferecida, SistemaGraduacao } from '../shared/tipos'
import { usePainel } from './AppPainel'

// As modalidades da academia (seção 8 do estudo): o que ela oferece, o que vem no plano, os níveis,
// os públicos e as faixas de cada luta. Desligar tira a modalidade da página e as turmas da grade.

export function Modalidades() {
  const c = usePainel()
  const avisar = useAviso()
  const e = c.empresa
  const [editando, setEditando] = useState<ModalidadeOferecida | null>(null)
  const [mudando, setMudando] = useState(false)
  const turmas = (id: string) => e.grade.filter((a) => a.modalidade === id && a.ativa).length

  const mudarLista = async (ids: string[]) => {
    const ligar = ids.find((id) => !e.modalidades.some((m) => m.id === id))
    const id = ligar ?? e.modalidades.find((m) => !ids.includes(m.id))?.id
    if (!id) return
    if (!ligar && !confirm(`Desligar ${nomeModalidade(id)}? Ela sai da página${turmas(id) ? ` e ${turmas(id) === 1 ? 'a turma da grade fica desligada' : `as ${turmas(id)} turmas da grade ficam desligadas`}` : ''}.`))
      return
    setMudando(true)
    try {
      c.mudar((await painel.modalidade(c.slug, id, { ligada: !!ligar })).empresa)
      esquecer(`pagina:${c.slug}`)
      avisar(ligar ? `${nomeModalidade(id)} entrou. Agora é montar as turmas na grade.` : `${nomeModalidade(id)} saiu da página.`)
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setMudando(false)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="titulo text-4xl">Modalidades</h1>
        <p className="mt-1 max-w-2xl text-sm text-suave">
          O que a academia oferece. Cada uma aparece na página, entra no filtro do mapa da região e ganha as turmas na grade. Nas lutas, as faixas que os professores graduam.
        </p>
      </header>

      {e.modalidades.length === 0 ? (
        <p className="cartao p-4 text-sm text-suave">Nenhuma modalidade ligada ainda. Escolha abaixo.</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {e.modalidades.map((m) => {
            const n = turmas(m.id)
            return (
              <li key={m.id} className="cartao flex gap-3 p-4">
                <span className="w-1 shrink-0 rounded-full" style={{ background: familiaDe(m.id).cor }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{nomeModalidade(m.id)}</p>
                      <p className="text-xs text-suave">
                        {FAMILIAS[MODALIDADE[m.id]?.familia ?? 'musculacao'].nome} · {n ? plural(n, 'turma', 'turmas') : MODALIDADE[m.id]?.vagas === 0 ? 'treino livre' : 'sem turma na grade'} ·{' '}
                        {m.inclusa ? 'no plano' : m.precoDesde ? `a partir de ${formatarPreco(m.precoDesde)}` : 'à parte'}
                      </p>
                    </div>
                    <button type="button" className="btn btn-sup btn-p shrink-0" onClick={() => setEditando(m)} aria-label={`Editar ${nomeModalidade(m.id)}`}>
                      <PiPencilSimple /> Editar
                    </button>
                  </div>
                  {(m.niveis.length > 0 || m.publicos.length > 0) && (
                    <p className="mt-2 text-xs text-fraco">{[m.niveis.length ? `Níveis: ${m.niveis.join(', ')}` : '', m.publicos.length ? `Público: ${m.publicos.join(', ')}` : ''].filter(Boolean).join(' · ')}</p>
                  )}
                  {m.graduacao && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5" title={m.graduacao.nome}>
                      {m.graduacao.faixas.slice(0, 10).map((f) => (
                        <Faixa key={f.id} cor={f.cor} ponta={f.ponta} largura={34} />
                      ))}
                      <span className="text-xs text-fraco">{m.graduacao.faixas.length} faixas</span>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <section className="cartao p-5" aria-labelledby="ligar">
        <h2 id="ligar" className="titulo text-2xl">
          Ligar e desligar
        </h2>
        <p className="mt-1 mb-4 text-sm text-suave">As 42 modalidades do catálogo, em 10 famílias. Um toque liga; outro desliga.</p>
        <fieldset disabled={mudando} className="disabled:opacity-60">
          <EscolherModalidades valor={e.modalidades.map((m) => m.id)} aoMudar={mudarLista} />
        </fieldset>
      </section>

      <EditarModalidade atual={editando} aoFechar={() => setEditando(null)} />
    </div>
  )
}

function EditarModalidade({ atual, aoFechar }: { atual: ModalidadeOferecida | null; aoFechar: () => void }) {
  const c = usePainel()
  const avisar = useAviso()
  const [m, setM] = useState<ModalidadeOferecida | null>(null)
  const [preco, setPreco] = useState('')
  const [ultimo, setUltimo] = useState<ModalidadeOferecida | null>(null)
  const [salvando, setSalvando] = useState(false)
  if (atual !== ultimo) {
    setUltimo(atual)
    setM(atual ? structuredClone(atual) : null)
    setPreco(atual?.precoDesde ? (atual.precoDesde / 100).toFixed(2).replace('.', ',') : '')
  }
  const catalogo = m ? MODALIDADE[m.id] : undefined
  const salvar = async () => {
    if (!m) return
    setSalvando(true)
    try {
      const r = await painel.modalidade(c.slug, m.id, {
        descricao: m.descricao ?? '',
        inclusa: m.inclusa,
        precoDesde: m.inclusa ? 0 : centavosDe(preco),
        niveis: m.niveis,
        publicos: m.publicos,
        graduacao: m.graduacao ?? null,
      })
      c.mudar(r.empresa)
      esquecer(`pagina:${c.slug}`)
      avisar(`${nomeModalidade(m.id)} salva.`)
      aoFechar()
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setSalvando(false)
    }
  }
  return (
    <Folha aberta={!!m} aoFechar={aoFechar} titulo={m ? nomeModalidade(m.id) : undefined} largura="max-w-2xl">
      {m && (
        <div className="space-y-5 p-6">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold text-suave">
              <span className="size-2 rounded-full" style={{ background: familiaDe(m.id).cor }} /> {catalogo ? FAMILIAS[catalogo.familia].nome : ''}
            </p>
            <h2 className="titulo mt-1 text-3xl">{nomeModalidade(m.id)}</h2>
          </div>
          <Campo rotulo="Como é na academia" dica="Aparece na página. Vazio, entra o texto do catálogo.">
            <textarea className="campo min-h-20" maxLength={300} value={m.descricao ?? ''} placeholder={catalogo?.descricao} onChange={(ev) => setM({ ...m, descricao: ev.target.value })} />
          </Campo>
          <Interruptor
            ligado={m.inclusa}
            aoMudar={(v) => setM({ ...m, inclusa: v })}
            rotulo="Vem no plano da academia"
            descricao={m.inclusa ? 'O aluno da academia faz sem pagar à parte' : 'Cobrada à parte: mostre a partir de quanto'}
          />
          {!m.inclusa && (
            <Campo rotulo="A partir de (R$ por mês)" className="max-w-xs">
              <input className="campo" inputMode="decimal" value={preco} onChange={(ev) => setPreco(ev.target.value.replace(/[^\d,.]/g, ''))} placeholder="120,00" />
            </Campo>
          )}
          <Etiquetas rotulo="Níveis das turmas" valor={m.niveis} sugestoes={catalogo?.niveis ?? []} max={8} aoMudar={(niveis) => setM({ ...m, niveis })} />
          <Etiquetas
            rotulo="Público"
            valor={m.publicos}
            sugestoes={[...new Set([...(catalogo?.publicos ?? []), 'Kids', 'Juvenil', 'Adulto', 'Feminino', 'Melhor idade'])]}
            max={6}
            aoMudar={(publicos) => setM({ ...m, publicos })}
          />
          <EditorFaixas sistema={m.graduacao} padrao={catalogo?.graduacao} luta={catalogo?.familia === 'lutas'} aoMudar={(graduacao) => setM({ ...m, graduacao })} />
          <button type="button" className="btn btn-anilha btn-m w-full" disabled={salvando} onClick={salvar}>
            {salvando ? <Girando /> : 'Salvar'}
          </button>
        </div>
      )}
    </Folha>
  )
}

// As faixas da luta: a lista na ordem da graduação, com a cor, a listra e quantos graus cabem
function EditorFaixas({ sistema, padrao, luta, aoMudar }: { sistema?: SistemaGraduacao; padrao?: string; luta: boolean; aoMudar: (s: SistemaGraduacao | undefined) => void }) {
  const doCatalogo = padrao ? SISTEMAS[padrao] : undefined
  if (!sistema) {
    if (!luta && !doCatalogo) return null
    return (
      <div>
        <p className="rotulo">Faixas</p>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-linha-2 p-4">
          <p className="min-w-0 flex-1 text-sm text-suave">Sem faixas. Com elas, o professor gradua pelo painel e a faixa aparece no perfil do aluno.</p>
          <button
            type="button"
            className="btn btn-sup btn-m"
            onClick={() => aoMudar(doCatalogo ? structuredClone(doCatalogo) : { id: 'propria', nome: 'Faixas da academia', faixas: [{ id: 'branca', nome: 'Branca', cor: '#f2f1ec' }] })}
          >
            <PiPlus /> Usar faixas
          </button>
        </div>
      </div>
    )
  }
  const faixas = sistema.faixas
  const mudar = (i: number, f: Partial<(typeof faixas)[number]>) => aoMudar({ ...sistema, faixas: faixas.map((x, j) => (j === i ? { ...x, ...f } : x)) })
  const mover = (i: number, para: number) => {
    if (para < 0 || para >= faixas.length) return
    const n = [...faixas]
    const [x] = n.splice(i, 1)
    n.splice(para, 0, x)
    aoMudar({ ...sistema, faixas: n })
  }
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="rotulo">Faixas, da primeira à última</p>
        <div className="flex gap-3 text-xs font-semibold">
          {doCatalogo && (
            <button type="button" className="text-suave hover:text-texto" onClick={() => confirm(`Voltar para ${doCatalogo.nome}?`) && aoMudar(structuredClone(doCatalogo))}>
              Voltar ao padrão
            </button>
          )}
          <button type="button" className="text-perigo hover:underline" onClick={() => confirm('Tirar as faixas desta modalidade? O histórico dos alunos fica guardado.') && aoMudar(undefined)}>
            Tirar as faixas
          </button>
        </div>
      </div>
      <Campo rotulo="Nome do sistema" className="mb-3">
        <input className="campo" maxLength={50} value={sistema.nome} onChange={(ev) => aoMudar({ ...sistema, nome: ev.target.value })} />
      </Campo>
      <ol className="space-y-2">
        {faixas.map((f, i) => (
          <li key={f.id} className="rounded-2xl border border-linha p-3">
            <div className="flex items-center gap-2">
              <Faixa cor={f.cor} ponta={f.ponta} graus={f.graus ?? 0} largura={56} />
              <input className="campo h-10 min-w-0 flex-1" maxLength={30} value={f.nome} onChange={(ev) => mudar(i, { nome: ev.target.value })} aria-label={`Nome da faixa ${i + 1}`} />
              <button type="button" className="grid size-9 shrink-0 place-items-center rounded-full text-suave hover:bg-sup-2 disabled:opacity-30" disabled={i === 0} onClick={() => mover(i, i - 1)} aria-label="Subir">
                <PiArrowUp />
              </button>
              <button
                type="button"
                className="grid size-9 shrink-0 place-items-center rounded-full text-suave hover:bg-sup-2 disabled:opacity-30"
                disabled={i === faixas.length - 1}
                onClick={() => mover(i, i + 1)}
                aria-label="Descer"
              >
                <PiArrowDown />
              </button>
              <button
                type="button"
                className="grid size-9 shrink-0 place-items-center rounded-full text-perigo hover:bg-sup-2 disabled:opacity-30"
                disabled={faixas.length === 1}
                onClick={() => aoMudar({ ...sistema, faixas: faixas.filter((_, j) => j !== i) })}
                aria-label={`Tirar a faixa ${f.nome}`}
              >
                <PiTrash />
              </button>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 pl-1 text-xs text-suave">
              <label className="flex items-center gap-2">
                Cor
                <input type="color" className="h-7 w-10 cursor-pointer rounded border border-linha bg-transparent" value={f.cor} onChange={(ev) => mudar(i, { cor: ev.target.value })} />
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!f.ponta} onChange={(ev) => mudar(i, { ponta: ev.target.checked ? '#f2f1ec' : undefined })} />
                Listra
                {f.ponta && (
                  <input type="color" className="h-7 w-10 cursor-pointer rounded border border-linha bg-transparent" value={f.ponta} onChange={(ev) => mudar(i, { ponta: ev.target.value })} aria-label="Cor da listra" />
                )}
              </label>
              <label className="flex items-center gap-2">
                Graus
                <input type="number" min={0} max={10} className="campo h-8 w-16 px-2" value={f.graus ?? 0} onChange={(ev) => mudar(i, { graus: Math.max(0, Math.min(10, Number(ev.target.value) || 0)) || undefined })} />
              </label>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="btn btn-sup btn-m mt-3"
        disabled={faixas.length >= 20}
        onClick={() => aoMudar({ ...sistema, faixas: [...faixas, { id: `f${Math.random().toString(36).slice(2, 8)}`, nome: 'Nova faixa', cor: '#8d939c' }] })}
      >
        <PiPlus /> Pôr uma faixa
      </button>
      {!!sistema.kids?.length && (
        <p className="mt-2 text-xs text-fraco">
          As {sistema.kids.length} faixas kids seguem o padrão de {doCatalogo?.nome ?? sistema.nome}.
        </p>
      )}
    </div>
  )
}
