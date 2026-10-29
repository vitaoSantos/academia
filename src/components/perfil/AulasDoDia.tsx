import { useState } from 'react'
import { PiCheckCircleFill, PiClockCountdown, PiUserPlus } from 'react-icons/pi'
import { aulas as api, mensagemDeErro, paginas } from '../../lib/api'
import { useDados } from '../../lib/dados'
import { navegar } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { checkinAberto, DIAS_PARA_RESERVAR, HORAS_PARA_CANCELAR, podeCancelar } from '../../shared/aulas'
import { familiaDe, nomeModalidade } from '../../shared/modalidades'
import type { AulaDoDia } from '../../shared/respostas'
import { agoraNoFuso, diaDaSemana, hora, minutos, NOMES_DIAS_CURTOS, somarDias } from '../../shared/tempo'
import { useAviso } from '../ui/Aviso'
import { Carregando, Erro, Folha, Girando, Selo, Vazio } from '../ui/basicos'

// A grade de uma unidade, dia a dia (seção 8 do estudo): reservar a vaga (ou entrar na fila),
// escolher o lugar marcado (a bike), cancelar, "Cheguei" na hora da aula e a aula experimental para
// quem ainda não é aluno
export function AulasDoDia({ slug, unidade, aluno }: { slug: string; unidade: string; aluno: boolean }) {
  const s = useSessao()
  const avisar = useAviso()
  const hoje = agoraNoFuso().data
  const [data, setData] = useState(hoje)
  const dia = useDados(`dia:${slug}:${unidade}:${data}`, () => paginas.dia(slug, unidade, data))
  const [fazendo, setFazendo] = useState<string | null>(null)
  const [lugares, setLugares] = useState<AulaDoDia | null>(null)

  const exigirConta = () => {
    if (s.usuario) return true
    navegar(`/entrar?volta=${encodeURIComponent(location.pathname + location.search)}`)
    return false
  }

  const fazer = async (id: string, acao: () => Promise<unknown>, ok: string) => {
    if (!exigirConta()) return
    setFazendo(id)
    try {
      await acao()
      avisar(ok)
      await dia.recarregar()
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setFazendo(null)
    }
  }

  const reservar = async (a: AulaDoDia, lugar?: number) => {
    if (!exigirConta()) return
    setFazendo(a.aula.id)
    try {
      const r = await api.reservar(slug, a.aula.id, data, lugar)
      avisar(r.resultado === 'espera' ? 'A turma lotou: você entrou na fila. Avisamos se abrir vaga.' : r.lugar ? `Vaga reservada, lugar ${r.lugar}!` : 'Vaga reservada!')
      await dia.recarregar()
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setFazendo(null)
    }
  }

  const dias = Array.from({ length: 7 }, (_, i) => somarDias(hoje, i))

  return (
    <div>
      <div className="sem-barra -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Dia">
        {dias.map((d) => (
          <button key={d} type="button" role="radio" aria-checked={data === d} onClick={() => setData(d)} className="chip flex-col gap-0 px-3.5 py-2">
            <span className="text-[0.65rem] uppercase opacity-70">{d === hoje ? 'hoje' : NOMES_DIAS_CURTOS[diaDaSemana(d)]}</span>
            <span className="dado text-base">{d.slice(8)}</span>
          </button>
        ))}
      </div>

      <div className="mt-4">
        {dia.carregando && !dia.dados ? (
          <Carregando />
        ) : dia.erro && !dia.dados ? (
          <Erro mensagem={mensagemDeErro(dia.erro)} aoTentar={dia.recarregar} />
        ) : dia.dados && dia.dados.aulas.length === 0 && dia.dados.eventos.length === 0 ? (
          <Vazio titulo="Sem aulas neste dia" texto="A musculação funciona no horário da unidade, sem reserva." />
        ) : dia.dados ? (
          <ul className="space-y-2">
            {dia.dados.eventos.map((ev) => (
              <li key={ev.id} className="cartao border-anilha p-4">
                <Selo tom="marca">Evento</Selo>
                <p className="mt-2 font-bold">
                  {ev.inicio} · {ev.titulo}
                </p>
                {ev.descricao && <p className="mt-1 text-sm text-suave">{ev.descricao}</p>}
                <button type="button" className="btn btn-sup btn-p mt-3" onClick={() => fazer(ev.id, () => api.vou(slug, ev.id), 'Combinado!')}>
                  {s.usuario && ev.vou.includes(s.usuario.id) ? 'Não vou mais' : 'Eu vou'} · {ev.vou.length}
                </button>
              </li>
            ))}
            {dia.dados.aulas.map((a) => {
              const fim = hora(minutos(a.aula.inicio) + a.aula.duracao)
              const lotada = a.livres !== null && a.livres <= 0
              const checkin = !!a.minha && checkinAberto(a.aula, data) && !a.presente
              return (
                <li key={a.aula.id} className="cartao flex gap-3 p-4">
                  <span className="mt-1 w-1 shrink-0 self-stretch rounded-full" style={{ background: familiaDe(a.aula.modalidade).cor }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="font-bold">
                        <span className="dado">{a.aula.inicio}</span> · {nomeModalidade(a.aula.modalidade)}
                      </p>
                      <span className="dado text-xs text-suave">
                        {a.aula.vagas ? `${a.reservas}/${a.aula.vagas}` : 'Livre'}
                        {a.espera ? ` · fila ${a.espera}` : ''}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-suave">
                      até {fim}
                      {a.professorNome ? ` · ${a.professorNome}` : ''}
                      {a.aula.sala ? ` · ${a.aula.sala}` : ''}
                      {a.aula.nivel ? ` · ${a.aula.nivel}` : ''}
                      {a.aula.publico ? ` · ${a.aula.publico}` : ''}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {a.presente ? (
                        <Selo tom="ok">
                          <PiCheckCircleFill /> Presença marcada
                        </Selo>
                      ) : a.minha ? (
                        <>
                          <Selo tom="ok">Reservada{a.minha.lugar ? ` · lugar ${a.minha.lugar}` : ''}</Selo>
                          {checkin && (
                            <button type="button" className="btn btn-anilha btn-p" disabled={fazendo === a.aula.id} onClick={() => fazer(a.aula.id, () => api.cheguei(slug, a.aula.id, data), 'Presença marcada. Boa aula!')}>
                              Cheguei
                            </button>
                          )}
                          {podeCancelar(a.aula, data) && (
                            <button type="button" className="btn btn-fantasma btn-p" disabled={fazendo === a.aula.id} onClick={() => fazer(a.aula.id, () => api.cancelar(slug, a.aula.id, data), 'Reserva cancelada.')}>
                              Cancelar
                            </button>
                          )}
                        </>
                      ) : a.naFila ? (
                        <>
                          <Selo tom="alerta">
                            <PiClockCountdown /> {a.naFila}º na fila
                          </Selo>
                          <button type="button" className="btn btn-fantasma btn-p" onClick={() => fazer(a.aula.id, () => api.cancelar(slug, a.aula.id, data), 'Você saiu da fila.')}>
                            Sair da fila
                          </button>
                        </>
                      ) : aluno && a.aula.reserva ? (
                        <button
                          type="button"
                          className="btn btn-anilha btn-p"
                          disabled={fazendo === a.aula.id}
                          onClick={() => (a.aula.lugares && !lotada ? exigirConta() && setLugares(a) : reservar(a))}
                        >
                          {fazendo === a.aula.id ? <Girando /> : lotada ? 'Entrar na fila' : a.aula.lugares ? 'Escolher o lugar' : 'Reservar'}
                        </button>
                      ) : aluno ? (
                        <span className="text-xs text-suave">Sem reserva: é só chegar.</span>
                      ) : (
                        <button type="button" className="btn btn-sup btn-p" disabled={fazendo === a.aula.id} onClick={() => fazer(a.aula.id, () => api.experimental(slug, a.aula.id, data), 'Pedido enviado! A academia confirma pelo chat.')}>
                          <PiUserPlus /> Aula experimental
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}
        {dia.dados && dia.dados.aulas.length > 0 && (
          <p className="mt-3 text-xs text-fraco">
            A reserva abre {DIAS_PARA_RESERVAR} dias antes; dá para cancelar até {HORAS_PARA_CANCELAR} horas antes da aula. Se a turma lotar, entre na fila: a vaga que abrir é sua.
          </p>
        )}
      </div>

      {/* o lugar marcado (spinning, pilates de aparelho) */}
      <Folha aberta={!!lugares} aoFechar={() => setLugares(null)} titulo="Escolha o lugar">
        {lugares && (
          <div className="p-6">
            <p className="titulo text-3xl">Escolha o lugar</p>
            <p className="mt-1 text-sm text-suave">
              {nomeModalidade(lugares.aula.modalidade)} · {lugares.aula.inicio}
            </p>
            <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-6">
              {Array.from({ length: lugares.aula.lugares ?? 0 }, (_, i) => i + 1).map((n) => {
                const ocupado = lugares.lugaresOcupados.includes(n)
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={ocupado}
                    onClick={() => {
                      const a = lugares
                      setLugares(null)
                      void reservar(a, n)
                    }}
                    className="dado aspect-square rounded-xl border border-linha bg-sup-2 text-sm font-bold hover:border-anilha disabled:border-transparent disabled:bg-sup-3 disabled:text-fraco disabled:line-through"
                  >
                    {n}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </Folha>
    </div>
  )
}
