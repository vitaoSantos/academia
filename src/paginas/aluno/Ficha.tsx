import { useState } from 'react'
import { PiArchive, PiBarbellBold, PiClock, PiPencilSimple } from 'react-icons/pi'
import { ListaDaDivisao } from '../../components/ficha/ListaDaDivisao'
import { FolhaExercicio } from '../../components/ficha/VerExercicio'
import { AppAluno } from '../../components/layout/AppAluno'
import { useAviso } from '../../components/ui/Aviso'
import { Carregando, Erro, Selo } from '../../components/ui/basicos'
import { fichas, mensagemDeErro } from '../../lib/api'
import { esquecer, useDados } from '../../lib/dados'
import { Link, navegar } from '../../lib/rotas'
import { useTitulo } from '../../lib/titulo'
import { duracaoEstimada, situacao, TEXTO_SITUACAO } from '../../shared/ficha'
import type { FichaCompleta } from '../../shared/respostas'
import { dataPorExtenso, diaDaSemana, hoje, NOMES_DIAS_CURTOS } from '../../shared/tempo'

// A ficha (seção 9 do estudo): as divisões (A, B, C...), cada exercício com as séries, a carga e o
// recado do professor, e o 3D de cada um. O botão leva para o treino ao vivo daquela divisão.

export default function Ficha({ id }: { id: string }) {
  const ficha = useDados(`ficha:${id}`, () => fichas.ler(id))
  useTitulo(ficha.dados?.ficha.titulo ?? 'Ficha')
  return (
    <AppAluno voltar="/fichas">
      {ficha.dados ? <Conteudo d={ficha.dados} /> : ficha.erro ? <Erro mensagem={mensagemDeErro(ficha.erro)} aoTentar={ficha.recarregar} /> : <Carregando />}
    </AppAluno>
  )
}

function Conteudo({ d }: { d: FichaCompleta }) {
  const f = d.ficha
  const avisar = useAviso()
  // abre na divisão do dia (quando o professor marcou os dias) ou na primeira
  const doDia = f.divisoes.find((x) => x.dias?.includes(diaDaSemana(hoje())))
  const [aba, setAba] = useState(doDia?.id ?? f.divisoes[0]?.id)
  const [vendo, setVendo] = useState<string | null>(null)
  const divisao = f.divisoes.find((x) => x.id === aba) ?? f.divisoes[0]
  const sit = situacao(f)
  const propria = f.contexto.tipo === 'propria'

  const arquivar = async () => {
    if (!confirm('Arquivar esta ficha? Ela sai das ativas, mas o histórico fica.')) return
    try {
      await fichas.arquivar(f.id)
      esquecer('fichas:')
      esquecer('inicio:')
      avisar('Ficha arquivada.')
      navegar('/fichas')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    }
  }

  return (
    <div>
      <p className="text-xs text-fraco">{propria ? 'Ficha sua' : `${d.contextoNome}${d.contextoNome !== f.autorNome ? ` · ${f.autorNome}` : ''}`}</p>
      <h1 className="titulo mt-1 text-4xl sm:text-5xl">{f.titulo}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-suave">
        {f.objetivo && <span>{f.objetivo}</span>}
        {!propria && f.status === 'ativa' && <Selo tom={sit === 'em-dia' ? 'ok' : sit === 'vencendo' ? 'alerta' : 'perigo'}>{TEXTO_SITUACAO[sit]}</Selo>}
        {f.status === 'arquivada' && <Selo>Arquivada</Selo>}
        {f.online && <Selo>Online</Selo>}
      </div>
      {!propria && (
        <p className="mt-1 text-xs text-fraco">
          De {dataPorExtenso(f.inicio)} até {dataPorExtenso(f.previsao)} (data de previsão da troca)
        </p>
      )}
      {f.obs && <p className="cartao mt-4 p-4 text-sm whitespace-pre-line">{f.obs}</p>}

      {/* as divisões */}
      <div className="sem-barra -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Divisões">
        {f.divisoes.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={x.id === divisao?.id} onClick={() => setAba(x.id)} className={`min-w-28 shrink-0 rounded-2xl border px-4 py-2.5 text-left transition-colors ${x.id === divisao?.id ? 'border-anilha bg-anilha-suave' : 'border-linha bg-sup hover:border-linha-2'}`}>
            <span className="block text-sm font-bold">{x.nome}</span>
            <span className="block max-w-40 truncate text-xs text-suave">{x.foco ?? `${x.itens.length} exercícios`}</span>
          </button>
        ))}
      </div>

      {divisao && (
        <section className="mt-4" aria-label={divisao.nome}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-suave">
            <span className="flex items-center gap-1.5">
              <PiClock /> uns {duracaoEstimada(divisao)} min · {divisao.itens.length} exercícios
            </span>
            {divisao.dias && divisao.dias.length > 0 && <span>{divisao.dias.map((x) => NOMES_DIAS_CURTOS[x]).join(', ')}</span>}
          </div>
          <ListaDaDivisao divisao={divisao} proprios={d.proprios} aoVer={setVendo} />
          {f.status !== 'arquivada' && (
            <div className="sticky bottom-24 z-10 mt-5 lg:bottom-6">
              <Link para={`/treinar?ficha=${f.id}&divisao=${divisao.id}`} className="btn btn-anilha btn-g w-full shadow-xl">
                <PiBarbellBold className="text-xl" /> Treinar o {divisao.nome}
              </Link>
            </div>
          )}
        </section>
      )}

      {propria && f.status !== 'arquivada' && (
        <div className="mt-8 flex flex-wrap gap-2 border-t border-linha pt-5">
          <Link para={`/fichas/${f.id}/editar`} className="btn btn-sup btn-p">
            <PiPencilSimple /> Editar
          </Link>
          <button type="button" className="btn btn-fantasma btn-p" onClick={arquivar}>
            <PiArchive /> Arquivar
          </button>
        </div>
      )}

      <FolhaExercicio id={vendo} proprio={d.proprios.find((p) => p.id === vendo)} aoFechar={() => setVendo(null)} />
    </div>
  )
}
