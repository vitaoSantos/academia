import { useEffect, useState } from 'react'
import { PiLockSimple, PiTrendUp } from 'react-icons/pi'
import { dataCurta, GraficoLinha } from '../../components/graficos/GraficoLinha'
import { AppAluno } from '../../components/layout/AppAluno'
import { Carregando, Erro, Vazio } from '../../components/ui/basicos'
import { mensagemDeErro, treinos } from '../../lib/api'
import { useDados } from '../../lib/dados'
import { Link } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import { nomeExercicio } from '../../shared/exercicios'
import { dataPorExtenso } from '../../shared/tempo'
import { kg, numero } from '../../shared/texto'

// A evolução de cada exercício (seção 10 do estudo): a carga mais alta de cada treino, a força
// estimada (1 repetição máxima, pela fórmula de Epley) e o volume. Um número por vez (nunca dois
// eixos no mesmo gráfico).

type Medida = 'carga' | 'forca' | 'volume'

const MEDIDAS: { id: Medida; nome: string; explica: string }[] = [
  { id: 'carga', nome: 'Carga', explica: 'A maior carga de cada treino' },
  { id: 'forca', nome: 'Força estimada', explica: 'Quanto você levantaria uma vez (estimativa pela carga e as repetições)' },
  { id: 'volume', nome: 'Volume', explica: 'Carga × repetições somadas no treino' },
]

export default function Evolucao() {
  useTitulo('Evolução')
  const s = useSessao()
  const [exercicio, setExercicio] = useState('')
  const [medida, setMedida] = useState<Medida>('carga')
  const ev = useDados(s.usuario ? `evolucao:${s.usuario.id}:${exercicio}` : null, () => treinos.evolucao(exercicio))
  // trocando de exercício, o gráfico anterior fica (mais apagado) até o novo chegar
  const [anterior, setAnterior] = useState(ev.dados)
  useEffect(() => {
    if (ev.dados) setAnterior(ev.dados)
  }, [ev.dados])
  const d = ev.dados ?? anterior
  const atual = d?.exercicio ?? exercicio
  const pontos = (d?.pontos ?? []).map((p) => ({ data: p.data, valor: p[medida] })).filter((p) => p.valor > 0)
  const primeiro = pontos[0]?.valor
  const ultimo = pontos[pontos.length - 1]?.valor
  const melhor = pontos.length ? Math.max(...pontos.map((p) => p.valor)) : 0
  const ganho = primeiro && ultimo ? Math.round(((ultimo - primeiro) / primeiro) * 100) : 0
  const formatar = (n: number) => (medida === 'volume' ? `${numero(n)} kg` : kg(n))

  return (
    <AppAluno titulo="Evolução">
      {!d ? (
        ev.erro ? <Erro mensagem={mensagemDeErro(ev.erro)} aoTentar={ev.recarregar} /> : <Carregando />
      ) : !d.maisFeitos.length ? (
        <div className="cartao">
          <Vazio icone={<PiTrendUp />} titulo="Os gráficos aparecem depois dos primeiros treinos" texto="Registre os treinos no app com a carga de cada série: aqui você vê a carga subir, exercício por exercício.">
            <Link para="/treinar" className="btn btn-anilha btn-m">
              Treinar agora
            </Link>
          </Vazio>
        </div>
      ) : (
        <div className="space-y-5">
          {/* o exercício */}
          <div className="sem-barra -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Exercício">
            {d.maisFeitos.slice(0, 12).map((x) => (
              <button key={x.id} type="button" role="radio" aria-checked={atual === x.id} className="chip shrink-0" onClick={() => setExercicio(x.id)}>
                {x.nome} <span className="text-fraco">{x.vezes}×</span>
              </button>
            ))}
          </div>

          <section className={`cartao p-4 transition-opacity sm:p-5 ${!ev.dados ? 'opacity-60' : ''}`} aria-labelledby="titulo-grafico">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="titulo-grafico" className="font-bold">
                  {nomeExercicio(atual)}
                </h2>
                <p className="text-xs text-suave">{MEDIDAS.find((m) => m.id === medida)!.explica}</p>
              </div>
              <div className="flex gap-1" role="radiogroup" aria-label="O que mostrar">
                {MEDIDAS.map((m) => (
                  <button key={m.id} type="button" role="radio" aria-checked={medida === m.id} className="chip px-3 py-1.5 text-xs" onClick={() => setMedida(m.id)}>
                    {m.nome}
                  </button>
                ))}
              </div>
            </div>

            {pontos.length >= 2 ? (
              <>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-sup-2 p-3">
                    <p className="text-xs text-suave">Agora</p>
                    <p className="text-xl font-bold">{formatar(ultimo)}</p>
                  </div>
                  <div className="rounded-2xl bg-sup-2 p-3">
                    <p className="text-xs text-suave">Melhor</p>
                    <p className="text-xl font-bold">{formatar(melhor)}</p>
                  </div>
                  <div className="rounded-2xl bg-sup-2 p-3">
                    <p className="text-xs text-suave">Desde {dataCurta(pontos[0].data)}</p>
                    <p className={`text-xl font-bold ${ganho > 0 ? 'text-ok' : ''}`}>
                      {ganho > 0 ? '+' : ''}
                      {ganho}%
                    </p>
                  </div>
                </div>
                <div className="mt-5">
                  <GraficoLinha pontos={pontos} formatar={formatar} rotulo={`${MEDIDAS.find((m) => m.id === medida)!.nome} no ${nomeExercicio(atual).toLowerCase()}`} />
                </div>
              </>
            ) : (
              <p className="mt-6 text-sm text-suave">Faça esse exercício mais uma vez para o gráfico aparecer.</p>
            )}
          </section>

          {d.janela && (
            <p className="flex items-start gap-2 rounded-2xl bg-sup-2 p-4 text-sm text-suave">
              <PiLockSimple className="mt-0.5 shrink-0 text-lg" />
              <span>
                No plano grátis, os gráficos mostram desde {dataPorExtenso(d.janela)}. Com o{' '}
                <Link para="/conta#mais" className="font-semibold text-texto underline">
                  Turma+
                </Link>
                , desde o primeiro treino.
              </span>
            </p>
          )}
        </div>
      )}
    </AppAluno>
  )
}
