import { PiArrowRight, PiPlus } from 'react-icons/pi'
import { AppAluno } from '../../components/layout/AppAluno'
import { Carregando, Erro, Selo, Vazio } from '../../components/ui/basicos'
import { fichas, mensagemDeErro } from '../../lib/api'
import { useDados } from '../../lib/dados'
import { Link } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import { situacao, TEXTO_SITUACAO, type SituacaoFicha } from '../../shared/ficha'
import type { ResumoFicha } from '../../shared/respostas'
import { dataPorExtenso, diasEntre, hoje, textoData } from '../../shared/tempo'
import { plural } from '../../shared/texto'

// As fichas do aluno (seção 9 do estudo): as ativas (uma por academia ou personal, e a dele), com a
// data de previsão da troca, e as anteriores

const TOM: Record<SituacaoFicha, 'ok' | 'alerta' | 'perigo' | 'neutro'> = { 'em-dia': 'ok', vencendo: 'alerta', vencida: 'perigo', rascunho: 'neutro', arquivada: 'neutro' }

export default function Fichas() {
  useTitulo('Fichas')
  const s = useSessao()
  const lista = useDados(s.usuario ? `fichas:${s.usuario.id}` : null, () => fichas.minhas().then((r) => r.fichas))
  const ativas = lista.dados?.filter((f) => f.status !== 'arquivada') ?? []
  const anteriores = lista.dados?.filter((f) => f.status === 'arquivada') ?? []
  const temPropria = ativas.some((f) => f.contexto.tipo === 'propria')
  return (
    <AppAluno titulo="Fichas">
      {lista.dados ? (
        <div className="space-y-8">
          {ativas.length === 0 ? (
            <div className="cartao">
              <Vazio titulo="Nenhuma ficha ativa" texto="A ficha que o seu professor ou personal montar aparece aqui, com cada exercício em 3D. Você também pode montar a sua.">
                <Link para="/fichas/nova" className="btn btn-anilha btn-m">
                  <PiPlus /> Montar a minha ficha
                </Link>
              </Vazio>
            </div>
          ) : (
            <section aria-label="Ativas" className="space-y-3">
              {ativas.map((f) => (
                <CartaoFicha key={f.id} f={f} />
              ))}
            </section>
          )}

          {ativas.length > 0 && !temPropria && (
            <Link para="/fichas/nova" className="cartao flex items-center gap-3 border-dashed p-4 text-sm hover:border-linha-2">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sup-2 text-lg">
                <PiPlus />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Montar uma ficha sua</span>
                <span className="block text-xs text-suave">Para treinar sozinho, com os exercícios do catálogo em 3D</span>
              </span>
            </Link>
          )}

          {anteriores.length > 0 && (
            <section aria-labelledby="anteriores">
              <h2 id="anteriores" className="font-bold">
                Anteriores
              </h2>
              <ul className="mt-2 divide-y divide-linha overflow-hidden rounded-2xl border border-linha">
                {anteriores.map((f) => (
                  <li key={f.id}>
                    <Link para={`/fichas/${f.id}`} className="flex items-center justify-between gap-3 bg-sup px-4 py-3 text-sm hover:bg-sup-2">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{f.titulo}</span>
                        <span className="block text-xs text-suave">
                          {f.autorNome} · {dataPorExtenso(f.inicio)}
                        </span>
                      </span>
                      <PiArrowRight className="shrink-0 text-fraco" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : lista.erro ? (
        <Erro mensagem={mensagemDeErro(lista.erro)} aoTentar={lista.recarregar} />
      ) : (
        <Carregando />
      )}
    </AppAluno>
  )
}

function CartaoFicha({ f }: { f: ResumoFicha }) {
  const dia = hoje()
  const sit = situacao(f, dia)
  const total = Math.max(1, diasEntre(f.inicio, f.previsao))
  const passados = Math.min(total, Math.max(0, diasEntre(f.inicio, dia)))
  const faltam = diasEntre(dia, f.previsao)
  const nova = f.publicadaEm && !f.vistaEm
  return (
    <Link para={`/fichas/${f.id}`} className="cartao block p-5 hover:border-linha-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-fraco">{f.contexto.tipo === 'propria' ? 'Ficha sua' : `Por ${f.autorNome}`}</p>
          <p className="titulo mt-1 text-3xl">{f.titulo}</p>
          <p className="mt-1 text-sm text-suave">{plural(f.divisoes, 'divisão', 'divisões')}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {nova && <Selo tom="marca">Nova</Selo>}
          {f.contexto.tipo !== 'propria' && <Selo tom={TOM[sit]}>{TEXTO_SITUACAO[sit]}</Selo>}
          {f.status === 'rascunho' && <Selo>Rascunho</Selo>}
        </div>
      </div>
      {f.contexto.tipo !== 'propria' && f.status === 'ativa' && (
        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-sup-3" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={passados} aria-label="Tempo da ficha">
            <div className={`h-full rounded-full ${sit === 'vencida' ? 'bg-perigo' : sit === 'vencendo' ? 'bg-alerta' : 'bg-anilha'}`} style={{ width: `${(passados / total) * 100}%` }} />
          </div>
          <p className="mt-2 flex justify-between text-xs text-suave">
            <span>Desde {textoData(f.inicio)}</span>
            <span>{faltam < 0 ? `Passou da troca (${textoData(f.previsao)})` : faltam === 0 ? 'Troca hoje' : `Troca ${textoData(f.previsao)}`}</span>
          </p>
        </div>
      )}
    </Link>
  )
}
