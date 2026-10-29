import { useState } from 'react'
import { PiCaretDown, PiTrophy } from 'react-icons/pi'
import { nomeModalidade } from '../../shared/modalidades'
import { dataDe, horaDe, textoData } from '../../shared/tempo'
import { formatarDuracao, kg, numero } from '../../shared/texto'
import type { Treino } from '../../shared/tipos'

// Um treino feito, que abre com as séries de cada exercício (o histórico do aluno e o do professor)
export function LinhaTreino({ t }: { t: Treino }) {
  const [aberto, setAberto] = useState(false)
  return (
    <li className="cartao overflow-hidden">
      <button type="button" className="flex w-full items-center gap-3 p-4 text-left" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        <span className="w-12 shrink-0 text-center">
          <span className="titulo block text-3xl leading-none">{Number(dataDe(t.inicio).slice(8))}</span>
          <span className="text-[0.65rem] font-bold text-fraco uppercase">{textoData(dataDe(t.inicio)).split(',')[0]}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{t.nome}</span>
          <span className="block text-xs text-suave">
            {horaDe(t.inicio)} · {formatarDuracao(t.duracaoMin)}
            {t.volume ? ` · ${numero(t.volume)} kg` : ''}
            {t.series ? ` · ${t.series} séries` : ''}
          </span>
        </span>
        {t.recordes.length > 0 && (
          <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-anilha-legivel" title={t.recordes.length === 1 ? '1 recorde' : `${t.recordes.length} recordes`}>
            <PiTrophy className="text-base" /> {t.recordes.length}
          </span>
        )}
        <PiCaretDown className={`shrink-0 text-fraco transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
      {aberto && (
        <div className="border-t border-linha px-4 py-3 text-sm">
          {t.modalidade && <p className="text-suave">Aula de {nomeModalidade(t.modalidade).toLowerCase()}</p>}
          <ul className="space-y-2">
            {t.exercicios.map((e, i) => (
              <li key={i}>
                <p className="font-semibold">{e.nome}</p>
                <p className="dado text-xs text-suave">
                  {e.series
                    .filter((s) => s.feita)
                    .map((s) => `${s.reps}×${numero(s.carga, 1)}`)
                    .join(' · ')}{' '}
                  kg
                </p>
                {e.obs && <p className="text-xs text-fraco">“{e.obs}”</p>}
              </li>
            ))}
          </ul>
          {t.recordes.length > 0 && (
            <p className="mt-3 text-xs">
              {t.recordes.map((r) => (
                <span key={r.exercicio} className="mr-3 inline-block">
                  🏆 {r.nome}: {kg(r.valor)}
                </span>
              ))}
            </p>
          )}
          {(t.esforco || t.nota) && (
            <p className="mt-3 text-xs text-suave">
              {t.esforco ? `Esforço ${t.esforco}/10` : ''}
              {t.esforco && t.nota ? ' · ' : ''}
              {t.nota ? `“${t.nota}”` : ''}
            </p>
          )}
        </div>
      )}
    </li>
  )
}
