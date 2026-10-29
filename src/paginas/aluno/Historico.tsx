import { useMemo, useState } from 'react'
import { PiCaretDown, PiFire, PiLockSimple, PiMapPin, PiStarFill, PiTrophy } from 'react-icons/pi'
import { GraficoColunas } from '../../components/graficos/GraficoColunas'
import { AppAluno } from '../../components/layout/AppAluno'
import { LogoDaMarca } from '../../components/marca/Marca'
import { Abas, Avatar, Carregando, Erro, Estrelas, Selo, Vazio } from '../../components/ui/basicos'
import { aluno, mensagemDeErro, treinos } from '../../lib/api'
import { useDados } from '../../lib/dados'
import { Link } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import { nomeModalidade } from '../../shared/modalidades'
import type { Historico as Dados, HistoricoDoAluno } from '../../shared/respostas'
import { agoraNoFuso, dataDe, dataPorExtenso, horaDe, inicioDaSemana, NOMES_MESES, somarDias, textoData } from '../../shared/tempo'
import { formatarDuracao, kg, numero, plural } from '../../shared/texto'
import type { Treino } from '../../shared/tipos'

// O histórico (seção 10 do estudo): os treinos semana a semana contra a meta, cada treino com as
// séries, e a trajetória: onde treinou, com quem e as avaliações que deu

type Aba = 'treinos' | 'trajetoria'

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

export default function Historico() {
  useTitulo('Histórico')
  const s = useSessao()
  const [aba, setAba] = useState<Aba>(() => (location.hash === '#trajetoria' ? 'trajetoria' : 'treinos'))
  const h = useDados(s.usuario ? `historico:${s.usuario.id}` : null, () => treinos.historico())
  return (
    <AppAluno titulo="Histórico">
      <Abas<Aba> className="mb-5" valor={aba} aoMudar={setAba} opcoes={[{ id: 'treinos', rotulo: 'Treinos' }, { id: 'trajetoria', rotulo: 'Trajetória' }]} />
      {aba === 'treinos' ? h.dados ? <Treinos d={h.dados} /> : h.erro ? <Erro mensagem={mensagemDeErro(h.erro)} aoTentar={h.recarregar} /> : <Carregando /> : <Trajetoria />}
    </AppAluno>
  )
}

function Treinos({ d }: { d: Dados }) {
  const hoje = agoraNoFuso().data
  const semanas = useMemo(() => {
    const atual = inicioDaSemana(hoje)
    const lista = Array.from({ length: 12 }, (_, i) => somarDias(atual, -7 * (11 - i)))
    const dias = new Map<string, Set<string>>()
    for (const t of d.treinos) {
      const sem = inicioDaSemana(dataDe(t.inicio))
      if (!dias.has(sem)) dias.set(sem, new Set())
      dias.get(sem)!.add(dataDe(t.inicio))
    }
    return lista.map((sem) => ({ rotulo: `${Number(sem.slice(8))}/${NOMES_MESES[Number(sem.slice(5, 7)) - 1].slice(0, 3)}`, valor: dias.get(sem)?.size ?? 0, detalhe: `Semana de ${textoData(sem)}` }))
  }, [d.treinos, hoje])
  const porMes = useMemo(() => {
    const m = new Map<string, Treino[]>()
    for (const t of d.treinos) {
      const chave = dataDe(t.inicio).slice(0, 7)
      m.set(chave, [...(m.get(chave) ?? []), t])
    }
    return [...m.entries()]
  }, [d.treinos])
  const doMes = d.treinos.filter((t) => dataDe(t.inicio).slice(0, 7) === hoje.slice(0, 7)).length

  if (!d.treinos.length)
    return (
      <div className="cartao">
        <Vazio titulo="Nenhum treino ainda" texto="Cada treino que você terminar no app aparece aqui, com as cargas e os recordes.">
          <Link para="/treinar" className="btn btn-anilha btn-m">
            Treinar agora
          </Link>
        </Vazio>
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2">
        <div className="cartao p-4">
          <p className="titulo text-4xl">{doMes}</p>
          <p className="mt-1 text-xs text-suave">treinos em {NOMES_MESES[Number(hoje.slice(5, 7)) - 1]}</p>
        </div>
        <div className="cartao p-4">
          <p className="titulo flex items-center gap-1 text-4xl">
            {d.sequencia}
            <PiFire className="text-2xl text-anilha-legivel" />
          </p>
          <p className="mt-1 text-xs text-suave">{d.sequencia === 1 ? 'semana seguida' : 'semanas seguidas'}</p>
        </div>
        <div className="cartao p-4">
          <p className="titulo text-4xl">{d.meta}</p>
          <p className="mt-1 text-xs text-suave">
            treinos por semana{' '}
            <Link para="/conta" className="underline">
              (mudar)
            </Link>
          </p>
        </div>
      </div>

      <section className="cartao p-4 sm:p-5" aria-labelledby="semanas">
        <h2 id="semanas" className="font-bold">
          Dias de treino por semana
        </h2>
        <p className="mb-3 text-xs text-suave">As últimas 12 semanas; a linha é a sua meta</p>
        <GraficoColunas colunas={semanas} meta={d.meta} rotulo="Dias de treino por semana" unidade=" dias" />
      </section>

      {d.janela && (
        <p className="flex items-start gap-2 rounded-2xl bg-sup-2 p-4 text-sm text-suave">
          <PiLockSimple className="mt-0.5 shrink-0 text-lg" />
          <span>
            No plano grátis aparecem os treinos desde {dataPorExtenso(d.janela)}. Os mais antigos continuam guardados: com o{' '}
            <Link para="/conta#mais" className="font-semibold text-texto underline">
              Turma+
            </Link>
            , o histórico completo volta.
          </span>
        </p>
      )}

      {porMes.map(([mes, lista]) => (
        <section key={mes} aria-labelledby={`mes-${mes}`}>
          <h2 id={`mes-${mes}`} className="mb-2 text-sm font-bold text-suave">
            {maiuscula(NOMES_MESES[Number(mes.slice(5, 7)) - 1])} de {mes.slice(0, 4)} · {plural(lista.length, 'treino', 'treinos')}
          </h2>
          <ul className="space-y-2">
            {lista.map((t) => (
              <LinhaTreino key={t.id} t={t} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function LinhaTreino({ t }: { t: Treino }) {
  const [aberto, setAberto] = useState(false)
  return (
    <li className="cartao overflow-hidden">
      <button type="button" className="flex w-full items-center gap-3 p-4 text-left" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        <span className="w-12 shrink-0 text-center">
          <span className="titulo block text-3xl leading-none">{Number(dataDe(t.inicio).slice(8))}</span>
          <span className="text-[0.65rem] font-bold text-fraco uppercase">{textoData(dataDe(t.inicio)).split(',')[0]}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{t.nome}</span>
          <span className="block text-xs text-suave">
            {horaDe(t.inicio)} · {formatarDuracao(t.duracaoMin)}
            {t.volume ? ` · ${numero(t.volume)} kg` : ''}
            {t.series ? ` · ${t.series} séries` : ''}
          </span>
        </span>
        {t.recordes.length > 0 && (
          <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-anilha-legivel" title={t.recordes.length === 1 ? '1 recorde' : `${t.recordes.length} recordes`}>
            <PiTrophy className="text-base" /> {t.recordes.length}
          </span>
        )}
        <PiCaretDown className={`shrink-0 text-fraco transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
      {aberto && (
        <div className="border-t border-linha px-4 py-3 text-sm">
          {t.modalidade && <p className="text-suave">Aula de {nomeModalidade(t.modalidade).toLowerCase()}</p>}
          <ul className="space-y-2">
            {t.exercicios.map((e, i) => (
              <li key={i}>
                <p className="font-semibold">{e.nome}</p>
                <p className="dado text-xs text-suave">
                  {e.series
                    .filter((s) => s.feita)
                    .map((s) => `${s.reps}×${numero(s.carga, 1)}`)
                    .join(' · ')}{' '}
                  kg
                </p>
                {e.obs && <p className="text-xs text-fraco">“{e.obs}”</p>}
              </li>
            ))}
          </ul>
          {t.recordes.length > 0 && (
            <p className="mt-3 text-xs">
              {t.recordes.map((r) => (
                <span key={r.exercicio} className="mr-3 inline-block">
                  🏆 {r.nome}: {kg(r.valor)}
                </span>
              ))}
            </p>
          )}
          {(t.esforco || t.nota) && (
            <p className="mt-3 text-xs text-suave">
              {t.esforco ? `Esforço ${t.esforco}/10` : ''}
              {t.esforco && t.nota ? ' · ' : ''}
              {t.nota ? `“${t.nota}”` : ''}
            </p>
          )}
        </div>
      )}
    </li>
  )
}

// ---------- A trajetória ----------

function Trajetoria() {
  const s = useSessao()
  const h = useDados(s.usuario ? `trajetoria:${s.usuario.id}` : null, () => aluno.historico())
  if (!h.dados) return h.erro ? <Erro mensagem={mensagemDeErro(h.erro)} aoTentar={h.recarregar} /> : <Carregando />
  const d: HistoricoDoAluno = h.dados
  const vazio = !d.lugares.length && !d.academias.length && !d.profissionais.length
  if (vazio)
    return (
      <div className="cartao">
        <Vazio titulo="A sua trajetória começa aqui" texto="As academias onde você treinar, os professores que montarem as suas fichas e as avaliações que você der aparecem nesta aba." />
      </div>
    )
  return (
    <div className="space-y-7">
      {d.paraAvaliar.length > 0 && (
        <section className="cartao p-4" aria-labelledby="avaliar">
          <h2 id="avaliar" className="font-bold">
            Conte como foi
          </h2>
          <p className="text-xs text-suave">A sua avaliação ajuda quem procura academia e personal na região.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {d.paraAvaliar.map((a) => (
              <Link key={`${a.tipo}:${a.id}`} para={`${a.link ?? '/'}${a.tipo === 'empresa' ? '?aba=avaliacoes' : '#avaliacoes'}`} className="btn btn-sup btn-p">
                <PiStarFill className="text-anilha-legivel" /> Avaliar {a.nome}
              </Link>
            ))}
          </div>
        </section>
      )}

      {d.lugares.length > 0 && (
        <section aria-labelledby="lugares">
          <h2 id="lugares" className="mb-2 font-bold">
            Onde você treinou
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {d.lugares.map((l) => (
              <li key={`${l.empresa}:${l.unidade}`}>
                <Link para={`/${l.empresa}?unidade=${l.unidade}`} className="cartao flex items-center gap-3 p-4 hover:border-linha-2">
                  <PiMapPin className="shrink-0 text-xl text-fraco" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{l.nome}</span>
                    <span className="block text-xs text-suave">
                      {plural(l.vezes, 'treino', 'treinos')} · desde {textoData(dataDe(l.primeira))}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.academias.length > 0 && (
        <section aria-labelledby="academias">
          <h2 id="academias" className="mb-2 font-bold">
            Academias
          </h2>
          <ul className="space-y-2">
            {d.academias.map((a) => (
              <li key={a.slug}>
                <Link para={`/${a.slug}`} className="cartao flex items-center gap-3 p-4 hover:border-linha-2">
                  <LogoDaMarca visual={a.visual} nome={a.nome} tamanho={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{a.unidadeNome ?? a.nome}</span>
                    <span className="block text-xs text-suave">
                      Desde {dataPorExtenso(dataDe(a.desde))}
                      {a.ate ? ` até ${dataPorExtenso(dataDe(a.ate))}` : ''}
                    </span>
                  </span>
                  {a.status === 'ativo' ? <Selo tom="ok">Aluno</Selo> : a.status === 'pendente' ? <Selo tom="alerta">Aguardando</Selo> : <Selo>Antes</Selo>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.profissionais.length > 0 && (
        <section aria-labelledby="professores">
          <h2 id="professores" className="mb-2 font-bold">
            Quem treinou você
          </h2>
          <ul className="space-y-2">
            {d.profissionais.map((p) => {
              const conteudo = (
                <>
                  <Avatar nome={p.nome} foto={p.foto} tamanho={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.nome}</span>
                    <span className="block text-xs text-suave">
                      {p.onde.join(', ')} · {p.fichas ? plural(p.fichas, 'ficha', 'fichas') : 'sem ficha ainda'} · desde {textoData(p.desde)}
                    </span>
                  </span>
                </>
              )
              return (
                <li key={p.id}>
                  {p.slug ? (
                    <Link para={`/${p.slug}`} className="cartao flex items-center gap-3 p-4 hover:border-linha-2">
                      {conteudo}
                    </Link>
                  ) : (
                    <div className="cartao flex items-center gap-3 p-4">{conteudo}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {d.avaliacoes.length > 0 && (
        <section aria-labelledby="avaliacoes">
          <h2 id="avaliacoes" className="mb-2 font-bold">
            Suas avaliações
          </h2>
          <ul className="space-y-2">
            {d.avaliacoes.map((a) => (
              <li key={`${a.tipo}:${a.id}`} className="cartao p-4">
                <div className="flex items-center justify-between gap-3">
                  <Link para={a.link ?? '/'} className="truncate font-semibold hover:underline">
                    {a.nome}
                  </Link>
                  <Estrelas valor={a.estrelas} tamanho={14} />
                </div>
                {a.motivos.length > 0 && <p className="mt-1 text-xs text-suave">{a.motivos.join(' · ')}</p>}
                {a.texto && <p className="mt-2 text-sm">{a.texto}</p>}
                {a.resposta && (
                  <p className="mt-2 rounded-xl bg-sup-2 px-3 py-2 text-sm">
                    <span className="block text-xs font-semibold text-suave">Resposta</span>
                    {a.resposta.texto}
                  </p>
                )}
                <p className="mt-2 text-xs text-fraco">{textoData(dataDe(a.em))}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
