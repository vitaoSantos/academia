import { useState } from 'react'
import { Carregando, Erro } from '../components/ui/basicos'
import { admin, mensagemDeErro } from '../lib/api'
import { useDados } from '../lib/dados'
import { NOMES_MESES } from '../shared/tempo'

// O registro do admin: cada entrada, cada mudança e o motivo, mês a mês. Não se apaga.

const nomeMes = (m: string) => `${NOMES_MESES[Number(m.slice(5)) - 1]} de ${m.slice(0, 4)}`
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

export function Registro() {
  const [mes, setMes] = useState<string | undefined>(undefined)
  const d = useDados(`admin-registro:${mes ?? ''}`, () => admin.registro(mes))
  const r = d.dados
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo text-4xl">Registro</h1>
          <p className="mt-1 max-w-2xl text-sm text-suave">Tudo o que foi feito no admin, com a hora e o motivo. Não dá para apagar.</p>
        </div>
        {r && (
          <select className="campo h-10 w-auto py-0 pr-9 text-sm" value={r.mes} onChange={(e) => setMes(e.target.value)} aria-label="Mês">
            {r.meses.map((m) => (
              <option key={m} value={m}>
                {nomeMes(m)}
              </option>
            ))}
          </select>
        )}
      </header>
      {!r ? (
        d.erro ? (
          <Erro mensagem={mensagemDeErro(d.erro)} aoTentar={d.recarregar} />
        ) : (
          <Carregando />
        )
      ) : r.acoes.length === 0 ? (
        <p className="cartao p-5 text-sm text-suave">Nada registrado em {nomeMes(r.mes)}.</p>
      ) : (
        <ol className="cartao divide-y divide-linha overflow-hidden">
          {r.acoes.map((a) => (
            <li key={a.id} className="flex flex-wrap gap-x-4 gap-y-0.5 px-4 py-3 text-sm">
              <span className="dado w-24 shrink-0 text-xs text-fraco tabular-nums">{quando(a.em)}</span>
              <span className="min-w-0 flex-1">
                <span className="block">{a.texto}</span>
                {a.motivo && <span className="block text-xs text-suave">Motivo: {a.motivo}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
