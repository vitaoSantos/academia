import { useState, type FormEvent } from 'react'
import { PiPlus, PiTrophy } from 'react-icons/pi'
import { CriarDesafio } from '../../components/desafios/CriarDesafio'
import { AppAluno } from '../../components/layout/AppAluno'
import { useAviso } from '../../components/ui/Aviso'
import { Carregando, Girando, Selo } from '../../components/ui/basicos'
import { desafios, mensagemDeErro } from '../../lib/api'
import { useDados } from '../../lib/dados'
import { useLocal } from '../../lib/local'
import { Link, navegar } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import { PONTUACOES } from '../../shared/desafio'
import type { DesafioResumo } from '../../shared/respostas'
import { agoraNoFuso, textoData } from '../../shared/tempo'
import { numero, primeiroNome } from '../../shared/texto'

// Os desafios (seção 16 do estudo): os seus, os oficiais da região e entrar pelo código

export default function Desafios() {
  useTitulo('Desafios')
  const s = useSessao()
  const local = useLocal()
  const avisar = useAviso()
  const meus = useDados(s.usuario ? `desafios:${s.usuario.id}` : null, () => desafios.meus().then((r) => r.desafios))
  const publicos = useDados(`desafios-publicos:${local.ponto.lat.toFixed(2)}:${local.ponto.lng.toFixed(2)}`, () => desafios.publicos(local.ponto).then((r) => r.desafios))
  const [codigo, setCodigo] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [criando, setCriando] = useState(false)
  const hoje = agoraNoFuso().data
  const ids = new Set((meus.dados ?? []).map((d) => d.id))
  const abertos = (meus.dados ?? []).filter((d) => d.fim >= hoje)
  const acabados = (meus.dados ?? []).filter((d) => d.fim < hoje)
  const daRegiao = (publicos.dados ?? []).filter((d) => !ids.has(d.id) && d.fim >= hoje)

  const entrar = async (e: FormEvent) => {
    e.preventDefault()
    if (!codigo.trim()) return
    setEntrando(true)
    try {
      const d = await desafios.entrar({ codigo: codigo.trim() })
      navegar(`/desafios/${d.id}`)
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setEntrando(false)
    }
  }

  return (
    <AppAluno titulo="Desafios">
      <div className="space-y-7">
        <div className="flex flex-col gap-2 sm:flex-row">
          <form onSubmit={entrar} className="flex flex-1 gap-2">
            <input className="campo dado uppercase" maxLength={10} placeholder="Código do desafio" value={codigo} onChange={(e) => setCodigo(e.target.value)} aria-label="Código do desafio" />
            <button type="submit" className="btn btn-sup btn-m shrink-0" disabled={entrando || !codigo.trim()}>
              {entrando ? <Girando /> : 'Entrar'}
            </button>
          </form>
          <button type="button" className="btn btn-anilha btn-m" onClick={() => setCriando(true)}>
            <PiPlus /> Criar desafio
          </button>
        </div>

        <section aria-labelledby="seus">
          <h2 id="seus" className="mb-2 font-bold">
            Os seus
          </h2>
          {!meus.dados ? <Carregando className="py-6" /> : abertos.length === 0 ? <p className="text-sm text-suave">Você não está em nenhum desafio agora. Entre num da região ou chame a turma com um código.</p> : <Lista lista={abertos} />}
        </section>

        {daRegiao.length > 0 && (
          <section aria-labelledby="regiao">
            <h2 id="regiao" className="mb-2 font-bold">
              Na sua região
            </h2>
            <Lista lista={daRegiao} />
          </section>
        )}

        {acabados.length > 0 && (
          <section aria-labelledby="acabados">
            <h2 id="acabados" className="mb-2 font-bold text-suave">
              Já acabaram
            </h2>
            <Lista lista={acabados} />
          </section>
        )}
      </div>
      <CriarDesafio aberta={criando} aoFechar={() => setCriando(false)} />
    </AppAluno>
  )
}

function Lista({ lista }: { lista: DesafioResumo[] }) {
  const hoje = agoraNoFuso().data
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {lista.map((d) => (
        <li key={d.id}>
          <Link para={`/desafios/${d.id}`} className="cartao flex h-full flex-col p-4 hover:border-linha-2">
            <span className="flex items-center gap-2 text-xs text-fraco">
              <PiTrophy className="text-base text-anilha-legivel" />
              {d.oficial ? d.oficial.nome : 'Entre amigos'} · {d.inicio > hoje ? `começa ${textoData(d.inicio)}` : d.fim < hoje ? `acabou ${textoData(d.fim)}` : `até ${textoData(d.fim)}`}
            </span>
            <span className="mt-1 font-bold">{d.nome}</span>
            <span className="mt-auto flex items-end justify-between gap-2 pt-3 text-xs text-suave">
              <span>
                {d.participantes} {d.participantes === 1 ? 'pessoa' : 'pessoas'} · {PONTUACOES[d.pontuacao].nome.toLowerCase()}
              </span>
              {d.posicao ? (
                <Selo tom={d.posicao === 1 ? 'marca' : 'neutro'}>
                  {d.posicao}º · {numero(d.pontos ?? 0)} {PONTUACOES[d.pontuacao].unidade}
                </Selo>
              ) : d.lider ? (
                <span>
                  1º {primeiroNome(d.lider.nome)}
                </span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
