import { useState } from 'react'
import { PiArrowRight, PiChalkboardTeacher, PiClipboardText, PiUserPlus } from 'react-icons/pi'
import { Convidar } from '../components/convite/Convidar'
import { Carregando, Erro, NotaTexto } from '../components/ui/basicos'
import { mensagemDeErro, painel } from '../lib/api'
import { useDados } from '../lib/dados'
import { Link } from '../lib/rotas'
import { familiaDe, nomeModalidade } from '../shared/modalidades'
import { situacao, TEXTO_SITUACAO } from '../shared/ficha'
import { agoraNoFuso, minutos, textoData } from '../shared/tempo'
import { primeiroNome } from '../shared/texto'
import { PODE, usePainel } from './AppPainel'

// A visão geral da academia (seção 7 do estudo): o que pede atenção hoje

export function Visao() {
  const c = usePainel()
  const v = useDados(`painel-visao:${c.slug}`, () => painel.visao(c.slug))
  const [convidando, setConvidando] = useState<'aluno' | 'professor' | null>(null)
  const base = `/painel/${c.slug}`
  const d = v.dados
  // as aulas que ainda não acabaram (as primeiras; o resto fica na grade)
  const agora = agoraNoFuso().minutos
  const duracao = (aula: string) => c.empresa.grade.find((a) => a.id === aula)?.duracao ?? 60
  const proximas = (d?.ocupacao ?? []).filter((a) => minutos(a.inicio) + duracao(a.aula) > agora)
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="sobre">{c.empresa.unidades.filter((u) => u.ativa).length > 1 ? 'A rede hoje' : 'A academia hoje'}</p>
          <h1 className="titulo mt-1 text-4xl">Visão geral</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-anilha btn-m" onClick={() => setConvidando('aluno')}>
            <PiUserPlus /> Convidar aluno
          </button>
          {PODE.configurar.includes(c.papel) && (
            <button type="button" className="btn btn-sup btn-m" onClick={() => setConvidando('professor')}>
              <PiChalkboardTeacher /> Convidar professor
            </button>
          )}
        </div>
      </header>

      {!d ? (
        v.erro ? <Erro mensagem={mensagemDeErro(v.erro)} aoTentar={v.recarregar} /> : <Carregando />
      ) : (
        <>
          <section aria-label="Números" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Link para={`${base}/alunos`} className="cartao p-4 hover:border-linha-2">
              <p className="titulo text-4xl">
                {d.alunos.ativos}
                {d.alunos.limite !== null && <span className="text-xl text-fraco">/{d.alunos.limite}</span>}
              </p>
              <p className="mt-1 text-xs text-suave">alunos ativos</p>
            </Link>
            <Link para={`${base}/alunos`} className={`cartao p-4 hover:border-linha-2 ${d.alunos.pendentes ? 'border-anilha' : ''}`}>
              <p className="titulo text-4xl">{d.alunos.pendentes}</p>
              <p className="mt-1 text-xs text-suave">pedindo para entrar</p>
            </Link>
            <div className="cartao p-4">
              <p className="titulo text-4xl">{d.treinosSemana}</p>
              <p className="mt-1 text-xs text-suave">treinos na semana</p>
            </div>
            <Link para={`${base}/avaliacoes`} className="cartao p-4 hover:border-linha-2">
              <p className="titulo text-4xl">
                <NotaTexto nota={d.nota} />
              </p>
              <p className="mt-1 text-xs text-suave">{d.avaliacoes} avaliações</p>
            </Link>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="aulas-hoje">
              <div className="mb-2 flex items-baseline justify-between">
                <h2 id="aulas-hoje" className="font-bold">
                  Próximas aulas de hoje
                </h2>
                <Link para={`${base}/grade`} className="text-xs font-semibold text-suave hover:text-texto">
                  Grade completa
                </Link>
              </div>
              {proximas.length === 0 ? (
                <p className="cartao p-4 text-sm text-suave">{d.ocupacao.length ? 'As aulas com reserva de hoje já acabaram.' : 'Nenhuma aula com reserva hoje.'}</p>
              ) : (
                <ul className="space-y-2">
                  {proximas.slice(0, 6).map((a) => {
                    const fracao = a.vagas ? a.reservas / a.vagas : 0
                    return (
                      <li key={a.aula}>
                        <Link para={`${base}/grade/${a.aula}`} className="cartao flex items-center gap-3 p-3.5 hover:border-linha-2">
                          <span className="dado w-12 shrink-0 font-bold">{a.inicio}</span>
                          <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: familiaDe(a.modalidade).cor }} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{nomeModalidade(a.modalidade)}</span>
                            <span className="block truncate text-xs text-suave">{a.unidade}</span>
                          </span>
                          <span className="w-24 shrink-0">
                            <span className="dado block text-right text-xs font-semibold">
                              {a.reservas}/{a.vagas}
                            </span>
                            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-sup-3" role="progressbar" aria-valuenow={a.reservas} aria-valuemax={a.vagas} aria-label="Ocupação">
                              <span className={`block h-full rounded-full ${fracao >= 1 ? 'bg-alerta' : 'bg-anilha'}`} style={{ width: `${Math.min(100, fracao * 100)}%` }} />
                            </span>
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
              {proximas.length > 6 && (
                <Link para={`${base}/grade`} className="mt-2 block text-xs font-semibold text-suave hover:text-texto">
                  + {proximas.length - 6} mais tarde
                </Link>
              )}
            </section>

            <section aria-labelledby="experimentais">
              <div className="mb-2 flex items-baseline justify-between">
                <h2 id="experimentais" className="font-bold">
                  Aula experimental
                </h2>
                {PODE.alunos.includes(c.papel) && (
                  <Link para={`${base}/contatos`} className="text-xs font-semibold text-suave hover:text-texto">
                    Todos os pedidos
                  </Link>
                )}
              </div>
              {d.experimentais.length === 0 ? (
                <p className="cartao p-4 text-sm text-suave">Nenhum pedido novo.</p>
              ) : (
                <ul className="space-y-2">
                  {d.experimentais.map((x) => (
                    <li key={x.id}>
                      <Link para={`${base}/contatos`} className="cartao flex items-center gap-3 border-anilha p-3.5">
                        <PiUserPlus className="shrink-0 text-xl text-anilha-legivel" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{x.nome}</span>
                          <span className="block truncate text-xs text-suave">
                            {nomeModalidade(x.modalidade)} · {textoData(x.data)}
                          </span>
                        </span>
                        <PiArrowRight className="text-fraco" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section aria-labelledby="fichas">
            <h2 id="fichas" className="mb-2 font-bold">
              Fichas chegando na troca
            </h2>
            {d.fichasVencendo.length === 0 ? (
              <p className="cartao p-4 text-sm text-suave">Todas em dia.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {d.fichasVencendo.map((f) => {
                  const sit = situacao(f)
                  return (
                    <li key={f.id}>
                      <Link para={`${base}/alunos/${f.aluno}`} className="cartao flex items-center gap-3 p-3.5 hover:border-linha-2">
                        <PiClipboardText className={`shrink-0 text-xl ${sit === 'vencida' ? 'text-perigo' : 'text-alerta'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{f.alunoNome}</span>
                          <span className="block truncate text-xs text-suave">
                            {f.titulo} · {TEXTO_SITUACAO[sit].toLowerCase()} ({textoData(f.previsao)})
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
          {d.alunos.sumidos > 0 && (
            <p className="text-sm text-suave">
              {d.alunos.sumidos} {d.alunos.sumidos === 1 ? 'aluno ativo não treina' : 'alunos ativos não treinam'} pelo app há mais de 10 dias.{' '}
              <Link para={`${base}/alunos?filtro=sumidos`} className="font-semibold text-texto underline">
                Ver quem
              </Link>
            </p>
          )}
        </>
      )}

      <Convidar
        aberta={convidando === 'aluno'}
        aoFechar={() => setConvidando(null)}
        titulo="Convidar aluno"
        explica={`O aluno abre o link, cria a conta e já fica como aluno da ${c.empresa.nome}: o app ganha a cara da academia.`}
        criar={(x) => painel.convite(c.slug, { tipo: 'aluno', ...x })}
        mensagem={(nome, link) => `${nome ? `Oi, ${primeiroNome(nome)}! ` : 'Oi! '}Na ${c.empresa.nome} a ficha de treino fica no app, com cada exercício em 3D, e dá para reservar as aulas. Entra por aqui: ${link}`}
      />
      <Convidar
        aberta={convidando === 'professor'}
        aoFechar={() => setConvidando(null)}
        titulo="Convidar professor"
        explica="O professor abre o link e entra na equipe: monta as fichas, gradua e marca a presença das aulas. Uma conta serve para todas as academias onde ele dá aula."
        criar={(x) => painel.convite(c.slug, { tipo: 'professor', ...x })}
        mensagem={(nome, link) => `${nome ? `Oi, ${primeiroNome(nome)}! ` : 'Oi! '}Este é o convite para a equipe da ${c.empresa.nome} na Turma: ${link}`}
      />
    </div>
  )
}
