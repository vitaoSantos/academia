import { useState } from 'react'
import { PiArrowRight, PiCalendarCheck, PiChatCircleDots, PiClipboardText, PiPlus, PiUserPlus, PiWarningCircle } from 'react-icons/pi'
import { Convidar } from '../components/convite/Convidar'
import { AppPro } from '../components/layout/AppPro'
import { useAviso } from '../components/ui/Aviso'
import { Avatar, Carregando, Erro, NotaTexto, Selo } from '../components/ui/basicos'
import { agenda, conversas, mensagemDeErro, pro } from '../lib/api'
import { useDados } from '../lib/dados'
import { Link, navegar } from '../lib/rotas'
import { useSessao } from '../lib/sessao'
import { useTitulo } from '../lib/titulo'
import { situacao, TEXTO_SITUACAO } from '../shared/ficha'
import { nivelProfissional, NOMES_PLANO } from '../shared/planos'
import type { Sessao } from '../shared/tipos'
import { agoraNoFuso, dataDe, dataPorExtenso, diasEntre, textoData } from '../shared/tempo'
import { numero, primeiroNome } from '../shared/texto'

// O dia do profissional (seção 13 do estudo): as sessões de hoje, as fichas para trocar (a data de
// previsão chegando), os alunos sumidos e os números que ele mostra nas redes

export default function Hoje() {
  useTitulo('Hoje')
  const s = useSessao()
  const avisar = useAviso()
  const hoje = useDados(s.profissional ? `pro-hoje:${s.profissional.id}` : null, () => pro.hoje())
  const [convidando, setConvidando] = useState(false)
  const p = s.profissional
  const d = hoje.dados

  const mudar = async (x: Sessao, status: 'feita' | 'faltou' | 'cancelada') => {
    try {
      await agenda.mudar({ pro: p!.id, id: x.id, data: x.data, status })
      await hoje.recarregar()
      avisar(status === 'feita' ? 'Sessão feita.' : status === 'faltou' ? 'Falta marcada.' : 'Sessão desmarcada. O aluno foi avisado.')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    }
  }
  const conversar = async (id: string) => {
    try {
      navegar(`/mensagens/${(await conversas.abrir({ tipo: 'conta', id })).id}`)
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    }
  }

  const h = Math.floor(agoraNoFuso().minutos / 60)
  const saudacao = h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  const nivel = p ? nivelProfissional(p) : 'nenhum'
  const testeAcaba = p?.plano === 'teste' && p.testeAte ? diasEntre(agoraNoFuso().data, dataDe(p.testeAte)) : null

  return (
    <AppPro>
      {p && (
        <div className="space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-suave">
                {saudacao}, {primeiroNome(p.nome)}
              </p>
              <h1 className="titulo mt-1 text-4xl">Hoje</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link para="/pro/fichas/nova" className="btn btn-anilha btn-m">
                <PiPlus /> Nova ficha
              </Link>
              {p.personal && (
                <button type="button" className="btn btn-sup btn-m" onClick={() => setConvidando(true)}>
                  <PiUserPlus /> Convidar aluno
                </button>
              )}
            </div>
          </header>

          {p.personal && (testeAcaba !== null || nivel === 'nenhum') && (
            <Link para="/pro/perfil#plano" className="cartao flex items-center gap-3 border-alerta p-4">
              <PiWarningCircle className="shrink-0 text-2xl text-alerta" />
              <span className="min-w-0 flex-1 text-sm">
                <span className="block font-bold">{nivel === 'nenhum' ? 'O teste acabou' : `Teste grátis: ${testeAcaba} ${testeAcaba === 1 ? 'dia' : 'dias'} com tudo do Premium`}</span>
                <span className="block text-xs text-suave">{nivel === 'nenhum' ? 'Escolha o plano para seguir atendendo os seus alunos pelo app.' : 'Escolha o plano quando quiser. Sem cartão até lá.'}</span>
              </span>
              <PiArrowRight className="shrink-0 text-fraco" />
            </Link>
          )}

          {!d ? (
            hoje.erro ? <Erro mensagem={mensagemDeErro(hoje.erro)} aoTentar={hoje.recarregar} /> : <Carregando />
          ) : (
            <>
              <section aria-label="Números" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="cartao p-4">
                  <p className="titulo text-4xl">
                    {d.ativos}
                    {d.limite !== null && <span className="text-xl text-fraco">/{d.limite}</span>}
                  </p>
                  <p className="mt-1 text-xs text-suave">alunos ativos{p.personal ? ` · ${NOMES_PLANO[p.plano]}` : ''}</p>
                </div>
                <div className="cartao p-4">
                  <p className="titulo text-4xl">{numero(d.numeros.alunosInstruidos)}</p>
                  <p className="mt-1 text-xs text-suave">alunos instruídos</p>
                </div>
                <div className="cartao p-4">
                  <p className="titulo text-4xl">{numero(d.numeros.treinos)}</p>
                  <p className="mt-1 text-xs text-suave">treinos com as suas fichas</p>
                </div>
                <div className="cartao p-4">
                  <p className="titulo text-4xl">
                    <NotaTexto nota={d.numeros.nota} />
                  </p>
                  <p className="mt-1 text-xs text-suave">{d.numeros.nota.total} avaliações</p>
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-2">
                <section aria-labelledby="sessoes">
                  <div className="mb-2 flex items-baseline justify-between">
                    <h2 id="sessoes" className="font-bold">
                      Sessões de hoje
                    </h2>
                    <Link para="/pro/agenda" className="text-xs font-semibold text-suave hover:text-texto">
                      Agenda da semana
                    </Link>
                  </div>
                  {d.sessoes.length === 0 ? (
                    <p className="cartao p-4 text-sm text-suave">{p.agenda.ativa ? 'Nenhuma sessão marcada para hoje.' : 'A agenda está desligada. Abra os seus horários em Agenda.'}</p>
                  ) : (
                    <ul className="space-y-2">
                      {d.sessoes.map((x) => (
                        <li key={x.id} className="cartao flex items-center gap-3 p-3.5">
                          <span className="dado w-12 shrink-0 text-center font-bold">{x.inicio}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{x.alunoNome}</span>
                            <span className="block truncate text-xs text-suave">
                              até {x.fim}
                              {x.local ? ` · ${x.local}` : ''}
                              {x.fixa ? ' · fixa' : ''}
                            </span>
                          </span>
                          {x.status === 'marcada' ? (
                            <span className="flex shrink-0 gap-1">
                              <button type="button" className="btn btn-sup btn-p" onClick={() => mudar(x, 'feita')}>
                                <PiCalendarCheck /> Feita
                              </button>
                              <button type="button" className="btn btn-fantasma btn-p" onClick={() => mudar(x, 'faltou')}>
                                Faltou
                              </button>
                            </span>
                          ) : (
                            <Selo tom={x.status === 'feita' ? 'ok' : x.status === 'faltou' ? 'perigo' : 'neutro'}>{x.status === 'feita' ? 'Feita' : x.status === 'faltou' ? 'Faltou' : 'Desmarcada'}</Selo>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section aria-labelledby="trocar">
                  <h2 id="trocar" className="mb-2 font-bold">
                    Fichas para trocar
                  </h2>
                  {d.vencendo.length === 0 ? (
                    <p className="cartao p-4 text-sm text-suave">Todas as fichas em dia.</p>
                  ) : (
                    <ul className="space-y-2">
                      {d.vencendo.map((f) => {
                        const sit = situacao(f)
                        return (
                          <li key={f.id} className="cartao flex items-center gap-3 p-3.5">
                            <PiClipboardText className={`shrink-0 text-xl ${sit === 'vencida' ? 'text-perigo' : 'text-alerta'}`} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold">{f.alunoNome}</span>
                              <span className="block truncate text-xs text-suave">
                                {f.titulo} · {TEXTO_SITUACAO[sit].toLowerCase()} ({textoData(f.previsao)})
                              </span>
                            </span>
                            <Link para={`/pro/fichas/nova?aluno=${f.aluno}&de=${f.id}`} className="btn btn-sup btn-p shrink-0">
                              Nova fase
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              </div>

              {d.alunosSumidos.length > 0 && (
                <section aria-labelledby="sumidos">
                  <h2 id="sumidos" className="mb-2 font-bold">
                    Sumidos há mais de uma semana
                  </h2>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {d.alunosSumidos.map((a) => (
                      <li key={a.id} className="cartao flex items-center gap-3 p-3.5">
                        <Link para={`/pro/alunos/${a.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                          <Avatar nome={a.nome} foto={a.foto} tamanho={38} />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{a.nome}</span>
                            <span className="block truncate text-xs text-suave">{a.ultimoTreino ? `Último treino ${textoData(dataDe(a.ultimoTreino))}` : 'Ainda não treinou pelo app'}</span>
                          </span>
                        </Link>
                        <button type="button" className="btn btn-fantasma btn-p shrink-0" onClick={() => conversar(a.id)} aria-label={`Conversar com ${a.nome}`}>
                          <PiChatCircleDots className="text-lg" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {d.academias.length > 0 && (
                <section aria-labelledby="academias">
                  <h2 id="academias" className="mb-2 font-bold">
                    Onde você dá aula
                  </h2>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {d.academias.map((a) => (
                      <li key={a.slug}>
                        <Link para={`/painel/${a.slug}`} className="cartao flex items-center justify-between gap-3 p-4 hover:border-linha-2">
                          <span>
                            <span className="block font-semibold">{a.nome}</span>
                            <span className="block text-xs text-suave">
                              {a.alunos} alunos · {a.papel === 'professor' ? 'professor' : a.papel}
                            </span>
                          </span>
                          <PiArrowRight className="text-fraco" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <p className="text-xs text-fraco">Atualizado em {dataPorExtenso(agoraNoFuso().data)}.</p>
            </>
          )}
        </div>
      )}
      <Convidar
        aberta={convidando}
        aoFechar={() => setConvidando(false)}
        titulo="Convidar aluno"
        explica="O aluno abre o link, cria a conta (ou entra) e já fica com você: as fichas aparecem no app com a sua marca."
        criar={(x) => pro.convite(x)}
        mensagem={(nome, link) => `${nome ? `Oi, ${primeiroNome(nome)}! ` : 'Oi! '}Vamos treinar juntos pelo app: lá você vê a sua ficha com cada exercício em 3D e registra o treino. Entra por aqui: ${link}`}
      />
    </AppPro>
  )
}
