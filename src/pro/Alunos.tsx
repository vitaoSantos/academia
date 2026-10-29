import { useState } from 'react'
import { PiMagnifyingGlass, PiShieldCheck, PiUserPlus } from 'react-icons/pi'
import { Convidar } from '../components/convite/Convidar'
import { AppPro } from '../components/layout/AppPro'
import { useAviso } from '../components/ui/Aviso'
import { Avatar, Carregando, Erro, Selo, Vazio } from '../components/ui/basicos'
import { mensagemDeErro, pro } from '../lib/api'
import { esquecer, useDados } from '../lib/dados'
import { Link } from '../lib/rotas'
import { useSessao } from '../lib/sessao'
import { useTitulo } from '../lib/titulo'
import { situacao, TEXTO_SITUACAO } from '../shared/ficha'
import { dataDe, textoData } from '../shared/tempo'
import { primeiroNome, semAcento } from '../shared/texto'
import type { AlunoDoPainel } from '../shared/tipos'

// Os alunos do profissional: os de personal (com os pedidos para aceitar e o limite do plano) e os
// das academias onde ele dá aula

export default function Alunos() {
  useTitulo('Alunos')
  const s = useSessao()
  const avisar = useAviso()
  const p = s.profissional
  const lista = useDados(p ? `pro-alunos:${p.id}` : null, () => pro.alunos())
  const [aba, setAba] = useState<string>(p?.personal ? 'personal' : '')
  const [busca, setBusca] = useState('')
  const [convidando, setConvidando] = useState(false)
  const [fazendo, setFazendo] = useState<string | null>(null)
  const d = lista.dados
  const abas = [...(p?.personal ? [{ id: 'personal', nome: 'Os meus alunos' }] : []), ...(d?.academias.map((a) => ({ id: a.slug, nome: a.nome })) ?? [])]
  const atual = abas.some((a) => a.id === aba) ? aba : abas[0]?.id
  const alunos = !d ? [] : atual === 'personal' ? d.personal : (d.academias.find((a) => a.slug === atual)?.alunos ?? [])
  const filtrados = alunos.filter((a) => a.status !== 'encerrado' && (!busca || semAcento(a.nome).includes(semAcento(busca))))
  const pendentes = filtrados.filter((a) => a.status === 'pendente')
  const ativos = filtrados.filter((a) => a.status === 'ativo')

  const responder = async (a: AlunoDoPainel, op: 'aceitar' | 'recusar') => {
    setFazendo(a.id)
    try {
      const r = await pro.responderAluno(a.id, op)
      lista.definir((x) => (x ? { ...x, personal: r.personal } : x!))
      esquecer('pro-hoje:')
      avisar(op === 'aceitar' ? `${primeiroNome(a.nome)} agora é seu aluno.` : 'Pedido recusado.')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setFazendo(null)
    }
  }

  return (
    <AppPro
      titulo="Alunos"
      acoes={
        p?.personal && (
          <button type="button" className="btn btn-anilha btn-m" onClick={() => setConvidando(true)}>
            <PiUserPlus /> Convidar aluno
          </button>
        )
      }
    >
      {!d ? (
        lista.erro ? <Erro mensagem={mensagemDeErro(lista.erro)} aoTentar={lista.recarregar} /> : <Carregando />
      ) : abas.length === 0 ? (
        <div className="cartao">
          <Vazio titulo="Sem alunos por aqui" texto="Como professor, os alunos aparecem quando a academia aceitar o seu convite de equipe. Atende por conta própria? Ative o perfil de personal na sua página." />
        </div>
      ) : (
        <div className="space-y-5">
          {abas.length > 1 && (
            <div className="sem-barra -mx-4 flex gap-1.5 overflow-x-auto px-4" role="tablist" aria-label="De onde">
              {abas.map((a) => (
                <button key={a.id} type="button" role="tab" aria-selected={a.id === atual} className="chip shrink-0" onClick={() => setAba(a.id)}>
                  {a.nome}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative min-w-60 flex-1">
              <PiMagnifyingGlass className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg text-fraco" />
              <input className="campo pl-11" type="search" placeholder="Buscar aluno" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar aluno" />
            </label>
            {atual === 'personal' && d.limite !== null && (
              <p className="text-sm text-suave">
                {d.personal.filter((a) => a.status === 'ativo').length} de {d.limite} alunos do plano{' '}
                <Link para="/pro/perfil#plano" className="underline">
                  aumentar
                </Link>
              </p>
            )}
          </div>

          {pendentes.length > 0 && (
            <section aria-labelledby="pendentes">
              <h2 id="pendentes" className="mb-2 font-bold">
                Querem treinar com você
              </h2>
              <ul className="space-y-2">
                {pendentes.map((a) => (
                  <li key={a.id} className="cartao flex flex-wrap items-center gap-3 border-anilha p-3.5">
                    <Avatar nome={a.nome} foto={a.foto} tamanho={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{a.nome}</span>
                      <span className="block text-xs text-suave">Pediu {textoData(dataDe(a.desde))}</span>
                    </span>
                    {atual === 'personal' ? (
                      <span className="flex gap-1">
                        <button type="button" className="btn btn-anilha btn-p" disabled={fazendo === a.id} onClick={() => responder(a, 'aceitar')}>
                          Aceitar
                        </button>
                        <button type="button" className="btn btn-fantasma btn-p" disabled={fazendo === a.id} onClick={() => responder(a, 'recusar')}>
                          Recusar
                        </button>
                      </span>
                    ) : (
                      <Selo tom="alerta">A academia aprova</Selo>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="ativos">
            <h2 id="ativos" className="mb-2 font-bold">
              {ativos.length} {ativos.length === 1 ? 'aluno' : 'alunos'}
            </h2>
            {ativos.length === 0 ? (
              <p className="text-sm text-suave">{busca ? 'Ninguém com esse nome.' : 'Nenhum aluno ativo ainda.'}</p>
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-linha bg-sup">
                {ativos.map((a) => (
                  <li key={a.id} className="border-t border-linha first:border-t-0">
                    <Link para={`/pro/alunos/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-sup-2">
                      <Avatar nome={a.nome} foto={a.foto} tamanho={40} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate font-semibold">{a.nome}</span>
                          {a.medidas && <PiShieldCheck className="shrink-0 text-ok" title="Liberou as medidas" />}
                        </span>
                        <span className="block truncate text-xs text-suave">
                          {a.ultimoTreino ? `Treinou ${textoData(dataDe(a.ultimoTreino))}` : 'Sem treino pelo app'} · {a.treinosSemana} na semana
                        </span>
                      </span>
                      {a.fichaAtual ? (
                        <span className="hidden text-right text-xs sm:block">
                          <span className="block max-w-40 truncate font-semibold">{a.fichaAtual.titulo}</span>
                          <span className={situacao({ status: 'ativa', previsao: a.fichaAtual.previsao }) === 'em-dia' ? 'text-suave' : 'text-alerta'}>
                            {TEXTO_SITUACAO[situacao({ status: 'ativa', previsao: a.fichaAtual.previsao })]} · {textoData(a.fichaAtual.previsao)}
                          </span>
                        </span>
                      ) : (
                        <Selo tom="alerta">Sem ficha</Selo>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
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
