import { useState } from 'react'
import { PiCalendarCheck } from 'react-icons/pi'
import { agenda, mensagemDeErro } from '../../lib/api'
import { useDados } from '../../lib/dados'
import { agoraNoFuso, diaDaSemana, NOMES_DIAS_CURTOS, somarDias, textoData } from '../../shared/tempo'
import { useAviso } from '../ui/Aviso'
import { Carregando, Erro, Girando } from '../ui/basicos'

// O aluno marca a sessão com o personal nos horários livres da agenda dele (seção 10 do estudo):
// o dia, o horário e o local. O personal decide se o aluno marca sozinho.
export function MarcarSessao({ pro, aoMarcar }: { pro: { id: string; nome: string }; aoMarcar?: () => void }) {
  const avisar = useAviso()
  const hoje = agoraNoFuso().data
  const [data, setData] = useState(hoje)
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const [local, setLocal] = useState('')
  const [marcando, setMarcando] = useState(false)
  const livres = useDados(`livres:${pro.id}:${data}`, () => agenda.livres(pro.id, data))
  const dias = Array.from({ length: 14 }, (_, i) => somarDias(hoje, i))
  const locais = livres.dados?.agenda.locais ?? []

  const marcar = async () => {
    if (!escolhido) return
    setMarcando(true)
    try {
      await agenda.marcar({ pro: pro.id, data, inicio: escolhido, local: local || locais[0] })
      avisar(`Marcado: ${textoData(data)} às ${escolhido}. ${pro.nome.split(' ')[0]} foi avisado.`)
      setEscolhido(null)
      await livres.recarregar()
      aoMarcar?.()
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
      await livres.recarregar()
    } finally {
      setMarcando(false)
    }
  }

  return (
    <div>
      <div className="sem-barra -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Dia">
        {dias.map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={data === d}
            onClick={() => {
              setData(d)
              setEscolhido(null)
            }}
            className="chip flex-col gap-0 px-3.5 py-2"
          >
            <span className="text-[0.65rem] uppercase opacity-70">{d === hoje ? 'hoje' : NOMES_DIAS_CURTOS[diaDaSemana(d)]}</span>
            <span className="dado text-base">{d.slice(8)}</span>
          </button>
        ))}
      </div>

      <div className="mt-4">
        {livres.carregando && !livres.dados ? (
          <Carregando className="py-8" />
        ) : livres.erro && !livres.dados ? (
          <Erro mensagem={mensagemDeErro(livres.erro)} aoTentar={livres.recarregar} />
        ) : livres.dados && !livres.dados.agenda.ativa ? (
          <p className="text-sm text-suave">A agenda está fechada agora. Combine pelo chat.</p>
        ) : livres.dados && !livres.dados.agenda.alunoMarca ? (
          <p className="text-sm text-suave">{pro.nome.split(' ')[0]} marca os horários com você. Combine pelo chat.</p>
        ) : livres.dados && livres.dados.livres.length === 0 ? (
          <p className="text-sm text-suave">Sem horários livres em {textoData(data)}. Tente outro dia.</p>
        ) : livres.dados ? (
          <>
            <p className="text-xs text-fraco">Sessões de {livres.dados.agenda.duracao} min</p>
            <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Horário">
              {livres.dados.livres.map((h) => (
                <button key={h} type="button" role="radio" aria-checked={escolhido === h} onClick={() => setEscolhido(h)} className="chip dado">
                  {h}
                </button>
              ))}
            </div>
            {locais.length > 1 && (
              <label className="mt-4 block max-w-xs">
                <span className="rotulo">Onde</span>
                <select className="campo" value={local || locais[0]} onChange={(e) => setLocal(e.target.value)}>
                  {locais.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
            )}
            <button type="button" className="btn btn-anilha btn-m mt-4" disabled={!escolhido || marcando} onClick={marcar}>
              {marcando ? <Girando /> : <PiCalendarCheck className="text-lg" />}
              {escolhido ? `Marcar ${textoData(data)} às ${escolhido}` : 'Escolha um horário'}
            </button>
            {livres.dados.agenda.cancelarAte > 0 && <p className="mt-2 text-xs text-fraco">Dá para desmarcar até {livres.dados.agenda.cancelarAte} h antes.</p>}
          </>
        ) : null}
      </div>
    </div>
  )
}
