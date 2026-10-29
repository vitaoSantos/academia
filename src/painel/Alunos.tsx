import { useState } from 'react'
import { PiMagnifyingGlass, PiMedal, PiShieldCheck, PiUserPlus } from 'react-icons/pi'
import { AlunoDetalhe } from '../components/aluno/AlunoDetalhe'
import { Convidar } from '../components/convite/Convidar'
import { Faixa } from '../components/perfil/Faixa'
import { useAviso } from '../components/ui/Aviso'
import { Avatar, Campo, Carregando, Erro, Selo, Vazio } from '../components/ui/basicos'
import { mensagemDeErro, painel } from '../lib/api'
import { esquecer, useDados } from '../lib/dados'
import { Link, navegar, useEndereco } from '../lib/rotas'
import { useSessao } from '../lib/sessao'
import { faixaDe, proximaGraduacao, textoFaixa } from '../shared/graduacao'
import { nomeModalidade } from '../shared/modalidades'
import { dataDe, diasEntre, hoje, textoData } from '../shared/tempo'
import { primeiroNome, semAcento } from '../shared/texto'
import type { AlunoDoPainel } from '../shared/tipos'
import { PODE, usePainel } from './AppPainel'

// Os alunos da academia (seção 7 do estudo): quem pediu para entrar, por unidade, quem cuida de cada
// um, as modalidades, as faixas e quem anda sumido

const SUMIDO = 10

export function Alunos() {
  const c = usePainel()
  const avisar = useAviso()
  const { busca: q } = useEndereco()
  const lista = useDados(`painel-alunos:${c.slug}`, () => painel.alunos(c.slug))
  const [busca, setBusca] = useState('')
  const [unidade, setUnidade] = useState('')
  const [sumidos, setSumidos] = useState(q.get('filtro') === 'sumidos')
  const [convidando, setConvidando] = useState(false)
  const [fazendo, setFazendo] = useState<string | null>(null)
  const e = c.empresa
  const unidades = e.unidades.filter((u) => u.ativa)
  const dia = hoje()

  const responder = async (a: AlunoDoPainel, op: 'aprovar' | 'recusar') => {
    setFazendo(a.id)
    try {
      lista.definir(await painel.alunoOp(c.slug, a.id, op))
      esquecer(`painel-visao:${c.slug}`)
      avisar(op === 'aprovar' ? `${primeiroNome(a.nome)} agora é aluno: o app dele já tem a cara da ${e.nome}.` : 'Pedido recusado.')
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setFazendo(null)
    }
  }

  if (!lista.dados) return lista.erro ? <Erro mensagem={mensagemDeErro(lista.erro)} aoTentar={lista.recarregar} /> : <Carregando />
  const todos = lista.dados.alunos.filter((a) => a.status !== 'encerrado')
  const passa = (a: AlunoDoPainel) =>
    (!unidade || a.unidade === unidade) && (!busca || semAcento(a.nome).includes(semAcento(busca))) && (!sumidos || !a.ultimoTreino || diasEntre(dataDe(a.ultimoTreino), dia) > SUMIDO)
  const pendentes = todos.filter((a) => a.status === 'pendente' && passa(a))
  const ativos = todos.filter((a) => a.status === 'ativo' && passa(a))
  const nomeDe = (id?: string) => e.equipe.find((m) => m.id === id)?.nome

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="titulo text-4xl">Alunos</h1>
        <button type="button" className="btn btn-anilha btn-m" onClick={() => setConvidando(true)}>
          <PiUserPlus /> Convidar aluno
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-56 flex-1">
          <PiMagnifyingGlass className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg text-fraco" />
          <input className="campo pl-11" type="search" placeholder="Buscar aluno" value={busca} onChange={(ev) => setBusca(ev.target.value)} aria-label="Buscar aluno" />
        </label>
        {unidades.length > 1 && (
          <select className="campo w-auto" value={unidade} onChange={(ev) => setUnidade(ev.target.value)} aria-label="Unidade">
            <option value="">Todas as unidades</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        )}
        <button type="button" className="chip" aria-pressed={sumidos} onClick={() => setSumidos((x) => !x)}>
          Sumidos
        </button>
        {lista.dados.limite !== null && (
          <p className="w-full text-xs text-suave sm:w-auto">
            {todos.filter((a) => a.status === 'ativo').length} de {lista.dados.limite} alunos do plano
          </p>
        )}
      </div>

      {pendentes.length > 0 && (
        <section aria-labelledby="pendentes">
          <h2 id="pendentes" className="mb-2 font-bold">
            Pediram para entrar
          </h2>
          <ul className="space-y-2">
            {pendentes.map((a) => (
              <li key={a.id} className="cartao flex flex-wrap items-center gap-3 border-anilha p-3.5">
                <Avatar nome={a.nome} foto={a.foto} tamanho={40} />
                <span className="min-w-0 flex-1 basis-40">
                  <span className="block truncate font-semibold">{a.nome}</span>
                  <span className="block text-xs text-suave">
                    {a.unidade ? `${unidades.find((u) => u.id === a.unidade)?.nome ?? ''} · ` : ''}pediu {textoData(dataDe(a.desde))}
                  </span>
                </span>
                {PODE.alunos.includes(c.papel) ? (
                  <span className="flex gap-1">
                    <button type="button" className="btn btn-anilha btn-p" disabled={fazendo === a.id} onClick={() => responder(a, 'aprovar')}>
                      Aprovar
                    </button>
                    <button type="button" className="btn btn-fantasma btn-p" disabled={fazendo === a.id} onClick={() => responder(a, 'recusar')}>
                      Recusar
                    </button>
                  </span>
                ) : (
                  <Selo tom="alerta">A recepção aprova</Selo>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="ativos">
        <h2 id="ativos" className="mb-2 font-bold">
          {ativos.length} {ativos.length === 1 ? 'aluno' : 'alunos'}
          {sumidos ? ' sumidos' : ''}
        </h2>
        {ativos.length === 0 ? (
          <div className="cartao">
            <Vazio titulo={busca || sumidos ? 'Ninguém por aqui' : 'Nenhum aluno ainda'} texto={busca || sumidos ? undefined : 'Mande o link de convite pelo WhatsApp, ou peça para o aluno procurar a academia no app e tocar em “Sou aluno daqui”.'} />
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-linha bg-sup">
            {ativos.map((a) => (
              <li key={a.id} className="border-t border-linha first:border-t-0">
                <Link para={`/painel/${c.slug}/alunos/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-sup-2">
                  <Avatar nome={a.nome} foto={a.foto} tamanho={40} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-semibold">{a.nome}</span>
                      {a.medidas && <PiShieldCheck className="shrink-0 text-ok" title="Liberou as medidas" />}
                    </span>
                    <span className="block truncate text-xs text-suave">
                      {[unidades.length > 1 ? unidades.find((u) => u.id === a.unidade)?.nome : null, nomeDe(a.responsavel) ? `com ${primeiroNome(nomeDe(a.responsavel)!)}` : null, a.modalidades.map(nomeModalidade).join(', ') || null]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-right text-xs sm:block">
                    <span className="block text-suave">{a.ultimoTreino ? `Treinou ${textoData(dataDe(a.ultimoTreino))}` : 'Sem treino pelo app'}</span>
                    {a.fichaAtual ? <span className="block max-w-40 truncate font-semibold">{a.fichaAtual.titulo}</span> : <span className="text-fraco">Sem ficha da academia</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Convidar
        aberta={convidando}
        aoFechar={() => setConvidando(false)}
        titulo="Convidar aluno"
        explica={`O aluno abre o link, cria a conta e já fica como aluno da ${e.nome}: o app ganha a cara da academia.`}
        criar={(x) => painel.convite(c.slug, { tipo: 'aluno', ...(unidade ? { unidade } : {}), ...x })}
        mensagem={(nome, link) => `${nome ? `Oi, ${primeiroNome(nome)}! ` : 'Oi! '}Na ${e.nome} a ficha de treino fica no app, com cada exercício em 3D, e dá para reservar as aulas. Entra por aqui: ${link}`}
      />
    </div>
  )
}

export function AlunoDaAcademia({ id }: { id: string }) {
  const c = usePainel()
  const s = useSessao()
  const avisar = useAviso()
  const d = useDados(`painel-aluno:${c.slug}:${id}`, () => painel.aluno(c.slug, id))
  const lista = useDados(`painel-alunos:${c.slug}`, () => painel.alunos(c.slug))
  const linha = lista.dados?.alunos.find((a) => a.id === id)
  const e = c.empresa
  const unidades = e.unidades.filter((u) => u.ativa)
  const professores = e.equipe.filter((m) => m.papel !== 'recepcao')
  const comFaixa = e.modalidades.filter((m) => m.graduacao)

  const op = async (o: 'unidade' | 'responsavel' | 'modalidades' | 'remover', extra: { unidade?: string; responsavel?: string; modalidades?: string[] } = {}) => {
    try {
      lista.definir(await painel.alunoOp(c.slug, id, o, extra))
      if (o === 'remover') {
        avisar('O aluno saiu da academia.')
        navegar(`/painel/${c.slug}/alunos`)
      } else avisar('Salvo.')
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    }
  }

  const graduar = async (modalidade: string) => {
    const m = e.modalidades.find((x) => x.id === modalidade)!
    const historico = linha?.faixas[modalidade] ?? []
    const prox = proximaGraduacao(m.graduacao!, historico[historico.length - 1])
    const texto = textoFaixa(faixaDe(m.graduacao, prox.faixa), prox.graus)
    if (!confirm(`Graduar ${primeiroNome(linha?.nome ?? 'o aluno')}: ${texto} de ${nomeModalidade(modalidade).toLowerCase()}?`)) return
    try {
      lista.definir(await painel.graduar(c.slug, id, modalidade))
      await d.recarregar()
      avisar(`${texto}! O aluno recebe o aviso e a faixa aparece no perfil dele.`)
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    }
  }

  if (!d.dados) return d.erro ? <Erro mensagem={mensagemDeErro(d.erro)} aoTentar={d.recarregar} /> : <Carregando />

  const gestao =
    linha && (PODE.alunos.includes(c.papel) || PODE.treinar.includes(c.papel)) ? (
      <section className="cartao mt-5 grid gap-4 p-4 sm:grid-cols-2" aria-label="Na academia">
        {unidades.length > 1 && (
          <Campo rotulo="Unidade">
            <select className="campo" value={linha.unidade ?? ''} onChange={(ev) => op('unidade', { unidade: ev.target.value })}>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </Campo>
        )}
        <Campo rotulo="Professor responsável">
          <select className="campo" value={linha.responsavel ?? ''} onChange={(ev) => op('responsavel', { responsavel: ev.target.value })}>
            <option value="">Ninguém em especial</option>
            {professores.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </Campo>
        <div className="sm:col-span-2">
          <p className="rotulo">Modalidades que faz</p>
          <div className="flex flex-wrap gap-1.5">
            {e.modalidades.map((m) => (
              <button
                key={m.id}
                type="button"
                className="chip px-3 py-1.5 text-xs"
                aria-pressed={linha.modalidades.includes(m.id)}
                onClick={() => op('modalidades', { modalidades: linha.modalidades.includes(m.id) ? linha.modalidades.filter((x) => x !== m.id) : [...linha.modalidades, m.id] })}
              >
                {nomeModalidade(m.id)}
              </button>
            ))}
          </div>
        </div>
        {PODE.treinar.includes(c.papel) && comFaixa.some((m) => linha.modalidades.includes(m.id) || linha.faixas[m.id]) && (
          <div className="sm:col-span-2">
            <p className="rotulo">Graduação</p>
            <ul className="space-y-2">
              {comFaixa
                .filter((m) => linha.modalidades.includes(m.id) || linha.faixas[m.id])
                .map((m) => {
                  const h = linha.faixas[m.id] ?? []
                  const atual = h[h.length - 1]
                  const faixa = atual ? faixaDe(m.graduacao, atual.faixa) : undefined
                  return (
                    <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-linha p-3">
                      {faixa ? <Faixa cor={faixa.cor} ponta={faixa.ponta} graus={atual.graus} /> : <span className="h-3.5 w-16 rounded-sm border border-dashed border-linha-2" />}
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block font-semibold">{nomeModalidade(m.id)}</span>
                        <span className="block text-xs text-suave">{faixa ? textoFaixa(faixa, atual.graus) : 'Sem faixa ainda'}</span>
                      </span>
                      <button type="button" className="btn btn-sup btn-p" onClick={() => graduar(m.id)}>
                        <PiMedal /> {faixa ? 'Graduar' : 'Dar a primeira faixa'}
                      </button>
                    </li>
                  )
                })}
            </ul>
          </div>
        )}
        {PODE.alunos.includes(c.papel) && (
          <div className="sm:col-span-2">
            <button type="button" className="btn btn-fantasma btn-p text-perigo" onClick={() => confirm(`Tirar ${linha.nome} da academia? O histórico dele continua com ele.`) && op('remover')}>
              Tirar da academia
            </button>
          </div>
        )}
      </section>
    ) : null

  return (
    <AlunoDetalhe
      d={d.dados}
      linkFicha={(f) => (s.profissional ? `/pro/fichas/${f}` : `/painel/${c.slug}/fichas`)}
      linkNovaFicha={s.profissional && PODE.treinar.includes(c.papel) ? (x) => (x.tipo === 'empresa' && x.id === c.slug ? `/pro/fichas/nova?aluno=${id}&contexto=empresa:${c.slug}` : null) : undefined}
      sistemas={Object.fromEntries(e.modalidades.map((m) => [m.id, m.graduacao]))}
      topo={gestao}
    />
  )
}
