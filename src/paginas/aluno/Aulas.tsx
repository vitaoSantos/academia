import { useState } from 'react'
import { AppAluno, useVinculos } from '../../components/layout/AppAluno'
import { AulasDoDia } from '../../components/perfil/AulasDoDia'
import { useAviso } from '../../components/ui/Aviso'
import { Carregando, Selo, Vazio } from '../../components/ui/basicos'
import { aulas, mensagemDeErro } from '../../lib/api'
import { esquecer, useDados } from '../../lib/dados'
import { Link } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import { podeCancelar } from '../../shared/aulas'
import { familiaDe, nomeModalidade } from '../../shared/modalidades'
import type { ReservaDoAluno } from '../../shared/respostas'
import { agoraNoFuso, textoData } from '../../shared/tempo'

// As aulas (seção 8 do estudo): as reservas do aluno (com a fila e o lugar marcado) e a grade de
// cada academia dele para reservar

export default function Aulas() {
  useTitulo('Aulas')
  const s = useSessao()
  const avisar = useAviso()
  const reservas = useDados(s.usuario ? `reservas:${s.usuario.id}` : null, () => aulas.minhas().then((r) => r.reservas))
  const vinculos = useVinculos()
  const academias = (vinculos.dados ?? []).filter((v) => v.tipo === 'empresa' && v.status === 'ativo')
  const [escolhida, setEscolhida] = useState(0)
  const academia = academias[Math.min(escolhida, academias.length - 1)]
  const hoje = agoraNoFuso().data
  const proximas = (reservas.dados ?? []).filter((r) => r.data >= hoje)

  const cancelar = async (r: ReservaDoAluno) => {
    try {
      await aulas.cancelar(r.empresa, r.aula, r.data)
      avisar(r.situacao === 'espera' ? 'Você saiu da fila.' : 'Reserva cancelada.')
      esquecer('inicio:')
      esquecer(`dia:${r.empresa}`)
      await reservas.recarregar()
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    }
  }

  return (
    <AppAluno titulo="Aulas">
      <div className="space-y-7">
        <section aria-labelledby="reservas">
          <h2 id="reservas" className="mb-2 font-bold">
            Suas reservas
          </h2>
          {!reservas.dados ? (
            <Carregando className="py-6" />
          ) : proximas.length === 0 ? (
            <p className="text-sm text-suave">Nenhuma aula reservada.</p>
          ) : (
            <ul className="space-y-2">
              {proximas.map((r) => (
                <li key={`${r.aula}${r.data}`} className="cartao flex items-center gap-3 p-4">
                  <span className="w-16 shrink-0 text-center">
                    <span className="block text-[0.65rem] font-bold text-fraco uppercase">{textoData(r.data)}</span>
                    <span className="dado block text-lg font-bold">{r.inicio}</span>
                  </span>
                  <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: familiaDe(r.modalidade).cor }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{nomeModalidade(r.modalidade)}</span>
                    <span className="block truncate text-xs text-suave">
                      {r.nome.split(' · ').slice(1).join(' · ')}
                      {r.lugar ? ` · lugar ${r.lugar}` : ''}
                    </span>
                  </span>
                  {r.situacao === 'espera' ? <Selo tom="alerta">Na fila</Selo> : r.situacao === 'experimental' ? <Selo>Experimental</Selo> : null}
                  {r.situacao !== 'experimental' && (r.situacao === 'espera' || podeCancelar({ inicio: r.inicio }, r.data)) && (
                    <button type="button" className="btn btn-fantasma btn-p" onClick={() => cancelar(r)}>
                      {r.situacao === 'espera' ? 'Sair' : 'Cancelar'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {academias.length === 0 ? (
          <div className="cartao">
            <Vazio titulo="Sem academia por aqui" texto="Quando você for aluno de uma academia na Turma, a grade de aulas dela aparece aqui para reservar.">
              <Link para="/explorar" className="btn btn-sup btn-m">
                Achar uma academia
              </Link>
            </Vazio>
          </div>
        ) : (
          <section aria-labelledby="grade">
            <h2 id="grade" className="mb-2 font-bold">
              Reservar
            </h2>
            {academias.length > 1 && (
              <div className="mb-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Academia">
                {academias.map((a, i) => (
                  <button key={a.id} type="button" role="radio" aria-checked={i === escolhida} className="chip" onClick={() => setEscolhida(i)}>
                    {a.unidadeNome ?? a.nome}
                  </button>
                ))}
              </div>
            )}
            {academia?.unidade ? <AulasDoDia key={`${academia.id}:${academia.unidade}`} slug={academia.id} unidade={academia.unidade} aluno /> : null}
            <Link para={`/${academia?.id}`} className="mt-4 inline-block text-sm font-semibold text-suave hover:text-texto">
              Abrir a página da {academia?.nome}
            </Link>
          </section>
        )}
      </div>
    </AppAluno>
  )
}
