import { useState } from 'react'
import { PiCopy, PiShareNetwork, PiTrophy } from 'react-icons/pi'
import { AppAluno } from '../../components/layout/AppAluno'
import { useAviso } from '../../components/ui/Aviso'
import { Avatar, Carregando, Erro, Girando, Selo } from '../../components/ui/basicos'
import { enderecoPublico } from '../../data/marca'
import { desafios, mensagemDeErro } from '../../lib/api'
import { esquecer, useDados } from '../../lib/dados'
import { Link, navegar } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import { PONTUACOES } from '../../shared/desafio'
import { agoraNoFuso, dataPorExtenso, diasEntre } from '../../shared/tempo'
import { numero } from '../../shared/texto'

// Um desafio: o ranking (constância, nunca o corpo), o código para chamar a turma, entrar e sair

export default function Desafio({ id }: { id: string }) {
  const s = useSessao()
  const avisar = useAviso()
  const d = useDados(`desafio:${id}`, () => desafios.ler(id))
  const [fazendo, setFazendo] = useState(false)
  useTitulo(d.dados?.nome ?? 'Desafio')
  if (!d.dados) return <AppAluno voltar="/desafios">{d.erro ? <Erro mensagem={mensagemDeErro(d.erro)} aoTentar={d.recarregar} /> : <Carregando />}</AppAluno>
  const x = d.dados
  const hoje = agoraNoFuso().data
  const p = PONTUACOES[x.pontuacao]
  const faltam = diasEntre(hoje, x.fim)
  const total = Math.max(1, diasEntre(x.inicio, x.fim) + 1)
  const passados = Math.min(total, Math.max(0, diasEntre(x.inicio, hoje) + 1))
  const eu = x.ranking.find((r) => r.id === s.usuario?.id)

  const entrar = async () => {
    setFazendo(true)
    try {
      d.definir(await desafios.entrar({ id: x.id }))
      esquecer('desafios:')
      esquecer('inicio:')
      avisar('Você entrou! Cada treino pago conta pontos.')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setFazendo(false)
    }
  }
  const sair = async () => {
    if (!confirm('Sair do desafio? Os seus pontos somem do ranking.')) return
    try {
      await desafios.sair(x.id)
      esquecer('desafios:')
      esquecer('inicio:')
      navegar('/desafios')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    }
  }
  const compartilhar = async () => {
    const texto = `Entra no desafio "${x.nome}" na Turma! Código ${x.codigo}`
    const url = `https://${enderecoPublico(`desafios/${x.id}`)}`
    try {
      if (navigator.share) await navigator.share({ title: x.nome, text: texto, url })
      else {
        await navigator.clipboard.writeText(`${texto} · ${url}`)
        avisar('Convite copiado.')
      }
    } catch {
      // cancelou
    }
  }

  return (
    <AppAluno voltar="/desafios">
      <p className="flex items-center gap-2 text-xs text-fraco">
        <PiTrophy className="text-base text-anilha-legivel" /> {x.oficial ? `Desafio oficial · ${x.oficial.nome}` : 'Entre amigos'}
      </p>
      <h1 className="titulo mt-1 text-4xl sm:text-5xl">{x.nome}</h1>
      {x.descricao && <p className="mt-2 text-suave">{x.descricao}</p>}
      <p className="mt-2 text-sm text-suave">
        {p.nome}: {p.descricao.toLowerCase()} · de {dataPorExtenso(x.inicio)} a {dataPorExtenso(x.fim)}
      </p>
      {x.premio && <p className="mt-2 text-sm">🏆 Prêmio: {x.premio}</p>}

      <div className="mt-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-sup-3">
          <div className="h-full rounded-full bg-anilha" style={{ width: `${(passados / total) * 100}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-suave">{faltam < 0 ? 'Acabou' : x.inicio > hoje ? `Começa em ${diasEntre(hoje, x.inicio)} dias` : faltam === 0 ? 'Último dia!' : `Faltam ${faltam} dias`}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {x.participo ? (
          <>
            <button type="button" className="btn btn-anilha btn-m" onClick={compartilhar}>
              <PiShareNetwork /> Chamar a turma
            </button>
            <button
              type="button"
              className="btn btn-sup btn-m dado"
              onClick={async () => {
                await navigator.clipboard?.writeText(x.codigo).catch(() => {})
                avisar(`Código ${x.codigo} copiado.`)
              }}
            >
              <PiCopy /> {x.codigo}
            </button>
          </>
        ) : faltam >= 0 ? (
          <button type="button" className="btn btn-anilha btn-m" disabled={fazendo} onClick={entrar}>
            {fazendo ? <Girando /> : 'Entrar no desafio'}
          </button>
        ) : null}
      </div>

      {eu && (
        <div className="cartao mt-5 flex items-center gap-4 p-4">
          <p className="titulo text-5xl">{eu.posicao}º</p>
          <p className="text-sm">
            <span className="font-bold">
              {numero(eu.pontos)} {p.unidade}
            </span>
            <span className="block text-xs text-suave">
              {eu.dias} {eu.dias === 1 ? 'dia' : 'dias'} ativos · {eu.checkins} check-ins · {numero(eu.minutos)} min
            </span>
          </p>
        </div>
      )}

      <section className="mt-6" aria-labelledby="ranking">
        <h2 id="ranking" className="mb-2 font-bold">
          Ranking · {x.total} {x.total === 1 ? 'pessoa' : 'pessoas'}
        </h2>
        <ol className="overflow-hidden rounded-2xl border border-linha bg-sup">
          {x.ranking.map((r) => (
            <li key={r.id} className={`flex items-center gap-3 border-t border-linha px-4 py-3 first:border-t-0 ${r.id === s.usuario?.id ? 'bg-anilha-suave' : ''}`}>
              <span className={`titulo w-8 text-center text-2xl ${r.posicao <= 3 ? 'text-anilha-legivel' : 'text-fraco'}`}>{r.posicao}</span>
              <Link para={r.usuario ? `/u/${r.usuario}` : '#'} className="flex min-w-0 flex-1 items-center gap-2.5">
                <Avatar nome={r.nome} foto={r.foto} tamanho={34} />
                <span className="truncate font-semibold">{r.nome}</span>
                {r.mais && <Selo tom="marca">+</Selo>}
              </Link>
              <span className="dado text-sm font-bold">
                {numero(r.pontos)} <span className="text-xs font-normal text-suave">{p.unidade}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {x.participo && x.criador !== s.usuario?.id && (
        <button type="button" className="btn btn-fantasma btn-p mt-6" onClick={sair}>
          Sair do desafio
        </button>
      )}
    </AppAluno>
  )
}
