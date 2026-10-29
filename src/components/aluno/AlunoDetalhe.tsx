import { useState, type ReactNode } from 'react'
import { PiChatCircleDots, PiLockSimple, PiPlus } from 'react-icons/pi'
import { conversas, mensagemDeErro } from '../../lib/api'
import { Link, navegar } from '../../lib/rotas'
import { situacao, TEXTO_SITUACAO } from '../../shared/ficha'
import { faixaDe, SISTEMAS, textoFaixa } from '../../shared/graduacao'
import { MODALIDADE, nomeModalidade } from '../../shared/modalidades'
import type { AlunoParaOProfissional } from '../../shared/respostas'
import { dataDe, dataPorExtenso, diasEntre, hoje, inicioDaSemana, textoData } from '../../shared/tempo'
import type { SistemaGraduacao } from '../../shared/tipos'
import { PainelMedidas } from '../medidas/Medidas'
import { Faixa } from '../perfil/Faixa'
import { LinhaTreino } from '../treino/LinhaTreino'
import { useAviso } from '../ui/Aviso'
import { Abas, Avatar, Selo } from '../ui/basicos'

// O aluno visto por quem acompanha (seção 13 do estudo): as fichas, os treinos que ele fez com elas,
// as medidas (só com o consentimento dele) e as faixas. Serve ao personal, ao professor e à academia.

type Aba = 'fichas' | 'treinos' | 'medidas' | 'faixas'

export function AlunoDetalhe({
  d,
  linkFicha,
  linkNovaFicha,
  sistemas = {},
  acoesFaixa,
  topo,
}: {
  d: AlunoParaOProfissional
  linkFicha: (id: string) => string
  linkNovaFicha?: (c: AlunoParaOProfissional['contextos'][number]) => string
  sistemas?: Record<string, SistemaGraduacao | undefined> // as faixas que a academia usa
  acoesFaixa?: (modalidade: string) => ReactNode
  topo?: ReactNode
}) {
  const avisar = useAviso()
  const [aba, setAba] = useState<Aba>('fichas')
  const a = d.aluno
  const dia = hoje()
  const semana = inicioDaSemana(dia)
  const daSemana = d.treinos.filter((t) => dataDe(t.inicio) >= semana).length
  const ultimo = d.treinos[0]
  const temFaixas = Object.keys(d.faixas).length > 0 || !!acoesFaixa

  const conversar = async () => {
    try {
      navegar(`/mensagens/${(await conversas.abrir({ tipo: 'conta', id: a.id })).id}`)
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    }
  }

  return (
    <div>
      <header className="flex flex-wrap items-center gap-4">
        <Avatar nome={a.nome} foto={a.foto} tamanho={72} />
        <div className="min-w-0 flex-1">
          <h1 className="titulo text-4xl break-words">{a.nome}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-suave">
            {a.usuario && (
              <Link para={`/u/${a.usuario}`} className="hover:text-texto">
                @{a.usuario}
              </Link>
            )}
            {d.contextos.map((c) => (
              <Selo key={`${c.tipo}:${c.id}`}>{c.tipo === 'profissional' ? 'Personal' : c.nome}</Selo>
            ))}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <button type="button" className="btn btn-sup btn-m" onClick={conversar}>
            <PiChatCircleDots /> Conversar
          </button>
          {linkNovaFicha &&
            d.contextos.map((c) => (
              <Link key={`${c.tipo}:${c.id}`} para={linkNovaFicha(c)} className="btn btn-anilha btn-m">
                <PiPlus /> Ficha{d.contextos.length > 1 ? ` · ${c.tipo === 'profissional' ? 'personal' : c.nome}` : ''}
              </Link>
            ))}
        </div>
      </header>
      {topo}

      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="cartao p-3.5">
          <p className="text-2xl font-bold">{daSemana}</p>
          <p className="text-xs text-suave">treinos na semana</p>
        </div>
        <div className="cartao p-3.5">
          <p className="text-2xl font-bold">{ultimo ? diasEntre(dataDe(ultimo.inicio), dia) : '–'}</p>
          <p className="text-xs text-suave">{ultimo ? 'dias desde o último' : 'sem treino ainda'}</p>
        </div>
        <div className="cartao p-3.5">
          <p className="text-2xl font-bold">{d.treinos.length}</p>
          <p className="text-xs text-suave">treinos registrados</p>
        </div>
      </div>

      <Abas<Aba>
        className="mt-5"
        valor={aba}
        aoMudar={setAba}
        opcoes={[
          { id: 'fichas', rotulo: 'Fichas' },
          { id: 'treinos', rotulo: 'Treinos' },
          { id: 'medidas', rotulo: 'Medidas' },
          ...(temFaixas ? [{ id: 'faixas' as Aba, rotulo: 'Faixas' }] : []),
        ]}
      />

      <div className="mt-5">
        {aba === 'fichas' &&
          (d.fichas.length === 0 ? (
            <p className="text-sm text-suave">Nenhuma ficha ainda.</p>
          ) : (
            <ul className="space-y-2">
              {d.fichas.map((f) => {
                const sit = situacao(f)
                return (
                  <li key={f.id}>
                    <Link para={linkFicha(f.id)} className="cartao flex items-center gap-3 p-4 hover:border-linha-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{f.titulo}</span>
                        <span className="block truncate text-xs text-suave">
                          {f.contexto.tipo === 'propria' ? 'A ficha do próprio aluno' : f.autorNome} · {dataPorExtenso(f.inicio)}
                          {f.vistaEm ? ' · vista' : f.status === 'ativa' ? ' · ainda não vista' : ''}
                        </span>
                      </span>
                      <Selo tom={sit === 'em-dia' ? 'ok' : sit === 'vencendo' ? 'alerta' : sit === 'vencida' ? 'perigo' : 'neutro'}>{TEXTO_SITUACAO[sit]}</Selo>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ))}

        {aba === 'treinos' &&
          (d.treinos.length === 0 ? (
            <p className="text-sm text-suave">O aluno ainda não registrou treinos pelo app.</p>
          ) : (
            <ul className="space-y-2">
              {d.treinos.map((t) => (
                <LinhaTreino key={t.id} t={t} />
              ))}
            </ul>
          ))}

        {aba === 'medidas' &&
          (d.medidas === null ? (
            <div className="cartao flex items-start gap-3 p-5">
              <PiLockSimple className="mt-0.5 shrink-0 text-xl text-fraco" />
              <p className="text-sm text-suave">As medidas são do aluno. Quando ele liberar para você (em Medidas, no app dele), elas aparecem aqui e você pode lançar a avaliação física.</p>
            </div>
          ) : (
            <PainelMedidas alunoId={a.id} profissional />
          ))}

        {aba === 'faixas' && (
          <ul className="space-y-3">
            {Object.entries(d.faixas).map(([modalidade, historico]) => {
              const ultima = historico[historico.length - 1]
              const sistema = sistemas[modalidade] ?? SISTEMAS[MODALIDADE[modalidade]?.graduacao ?? modalidade]
              const faixa = ultima ? faixaDe(sistema, ultima.faixa) : undefined
              return (
                <li key={modalidade} className="cartao p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Faixa cor={faixa?.cor ?? '#888'} graus={ultima?.graus ?? 0} largura={80} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{nomeModalidade(modalidade)}</span>
                      <span className="block text-xs text-suave">
                        {textoFaixa(faixa, ultima?.graus ?? 0)}
                        {ultima ? ` · desde ${textoData(dataDe(ultima.desde))}, por ${ultima.por}` : ''}
                      </span>
                    </span>
                    {acoesFaixa?.(modalidade)}
                  </div>
                  {historico.length > 1 && (
                    <ol className="mt-3 space-y-1 border-t border-linha pt-3 text-xs text-suave">
                      {[...historico].reverse().slice(1).map((h, i) => (
                        <li key={i}>
                          {textoFaixa(faixaDe(sistema, h.faixa), h.graus)} · {dataPorExtenso(dataDe(h.desde))}
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              )
            })}
            {Object.keys(d.faixas).length === 0 && <p className="text-sm text-suave">Sem graduação ainda.</p>}
          </ul>
        )}
      </div>
    </div>
  )
}
