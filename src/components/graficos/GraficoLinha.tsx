import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { NOMES_MESES, textoData } from '../../shared/tempo'

// A linha do tempo de um número só (a carga, a força, o peso): traço de 2 px na cor da marca, a
// área bem clarinha, a grade em linha fina, o rótulo só no último ponto e no recorde; passar o dedo
// (ou as setas do teclado) mostra o valor de cada dia. A tabela é o par acessível do gráfico.

export type PontoLinha = { data: string; valor: number }

const dia = (d: string) => Date.parse(`${d}T12:00:00Z`)

// "14 set" no eixo (o dia da semana fica para o cursor e a tabela)
export const dataCurta = (d: string) => `${Number(d.slice(8))} ${NOMES_MESES[Number(d.slice(5, 7)) - 1].slice(0, 3)}`

// Os números redondos do eixo (3 a 5 marcas)
function marcas(min: number, max: number, alvo = 4) {
  if (min === max) {
    const folga = Math.max(1, Math.abs(min) * 0.1)
    min -= folga
    max += folga
  }
  const bruto = (max - min) / alvo
  const pot = 10 ** Math.floor(Math.log10(bruto))
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= bruto) ?? 10 * pot
  const ini = Math.floor(min / passo) * passo
  const fim = Math.ceil(max / passo) * passo
  const lista: number[] = []
  for (let v = ini; v <= fim + passo / 2; v += passo) lista.push(Math.round(v * 100) / 100)
  return lista
}

export function GraficoLinha({ pontos, formatar, rotulo, altura = 220 }: { pontos: PontoLinha[]; formatar: (n: number) => string; rotulo: string; altura?: number }) {
  const caixa = useRef<HTMLDivElement>(null)
  const [largura, setLargura] = useState(600)
  const [ativo, setAtivo] = useState<number | null>(null)
  const [tabela, setTabela] = useState(false)
  const id = useId()

  useEffect(() => {
    const el = caixa.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(260, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const g = useMemo(() => {
    const ordenados = [...pontos].sort((a, b) => a.data.localeCompare(b.data))
    const ys = ordenados.map((p) => p.valor)
    const ticks = marcas(Math.min(...ys), Math.max(...ys))
    const margem = { esq: 44, dir: 18, cima: 22, baixo: 26 }
    const w = largura - margem.esq - margem.dir
    const h = altura - margem.cima - margem.baixo
    const t0 = dia(ordenados[0]?.data ?? '2026-01-01')
    const t1 = dia(ordenados[ordenados.length - 1]?.data ?? '2026-01-01')
    const x = (d: string) => margem.esq + (t1 === t0 ? w / 2 : ((dia(d) - t0) / (t1 - t0)) * w)
    const y0 = ticks[0]
    const y1 = ticks[ticks.length - 1]
    const y = (v: number) => margem.cima + h - ((v - y0) / (y1 - y0 || 1)) * h
    const xy = ordenados.map((p) => ({ ...p, px: x(p.data), py: y(p.valor) }))
    const linha = xy.map((p, i) => `${i ? 'L' : 'M'}${p.px.toFixed(1)},${p.py.toFixed(1)}`).join('')
    const area = xy.length > 1 ? `${linha}L${xy[xy.length - 1].px.toFixed(1)},${margem.cima + h}L${xy[0].px.toFixed(1)},${margem.cima + h}Z` : ''
    const recorde = ys.indexOf(Math.max(...ys))
    // as datas do eixo: o começo, o fim e, se couber, o meio do período (pelo tempo, não pelo ponto)
    const datas: { px: number; data: string; ancora: 'start' | 'middle' | 'end' }[] =
      t1 === t0
        ? [{ px: margem.esq + w / 2, data: ordenados[0].data, ancora: 'middle' }]
        : [
            { px: margem.esq, data: ordenados[0].data, ancora: 'start' },
            ...(w >= 300 ? [{ px: margem.esq + w / 2, data: new Date((t0 + t1) / 2).toISOString().slice(0, 10), ancora: 'middle' as const }] : []),
            { px: margem.esq + w, data: ordenados[ordenados.length - 1].data, ancora: 'end' },
          ]
    return { xy, linha, area, ticks, y, margem, w, h, recorde, datas }
  }, [pontos, largura, altura])

  if (!pontos.length) return null
  const ultimo = g.xy.length - 1
  const atual = ativo !== null ? g.xy[ativo] : null

  const mover = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * largura
    let melhor = 0
    for (let i = 1; i < g.xy.length; i++) if (Math.abs(g.xy[i].px - px) < Math.abs(g.xy[melhor].px - px)) melhor = i
    setAtivo(melhor)
  }
  const tecla = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      setAtivo((a) => Math.max(0, Math.min(ultimo, (a ?? ultimo) + (e.key === 'ArrowLeft' ? -1 : 1))))
    } else if (e.key === 'Escape') setAtivo(null)
  }

  return (
    <figure className="m-0">
      <div ref={caixa} className="relative">
        <svg
          width="100%"
          viewBox={`0 0 ${largura} ${altura}`}
          className="block touch-pan-y overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-anilha focus-visible:ring-offset-2 focus-visible:ring-offset-fundo"
          role="img"
          aria-label={`${rotulo}: ${g.xy.length} pontos, de ${formatar(g.xy[0].valor)} em ${textoData(g.xy[0].data)} a ${formatar(g.xy[ultimo].valor)} em ${textoData(g.xy[ultimo].data)}. Use as setas para ler cada ponto.`}
          aria-describedby={`${id}-leitura`}
          tabIndex={0}
          onPointerMove={mover}
          onPointerDown={mover}
          onPointerLeave={() => setAtivo(null)}
          onKeyDown={tecla}
          onBlur={() => setAtivo(null)}
        >
          {/* a grade */}
          {g.ticks.map((t) => (
            <g key={t}>
              <line x1={g.margem.esq} x2={largura - g.margem.dir} y1={g.y(t)} y2={g.y(t)} stroke="var(--linha)" strokeWidth={1} />
              <text x={g.margem.esq - 8} y={g.y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--fraco)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatar(t)}
              </text>
            </g>
          ))}
          {g.datas.map((p, i) => (
            <text key={i} x={p.px} y={altura - 6} textAnchor={p.ancora} fontSize={11} fill="var(--fraco)">
              {dataCurta(p.data)}
            </text>
          ))}

          {/* a área e a linha */}
          {g.area && <path d={g.area} fill="var(--anilha)" opacity={0.1} />}
          <path d={g.linha} fill="none" stroke="var(--anilha-legivel)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* o recorde e o último, com o valor */}
          {[...new Set([g.recorde, ultimo])].filter((i) => i === ultimo || Math.abs(g.xy[i].px - g.xy[ultimo].px) > 64).map((i) => {
            const p = g.xy[i]
            return (
              <g key={i}>
                <circle cx={p.px} cy={p.py} r={4.5} fill="var(--anilha-legivel)" stroke="var(--sup)" strokeWidth={2} />
                <text x={p.px} y={p.py - 11} textAnchor={i === ultimo ? 'end' : 'middle'} fontSize={12} fontWeight={700} fill="var(--texto)">
                  {formatar(p.valor)}
                </text>
              </g>
            )
          })}

          {/* o cursor */}
          {atual && (
            <g pointerEvents="none">
              <line x1={atual.px} x2={atual.px} y1={g.margem.cima} y2={g.margem.cima + g.h} stroke="var(--suave)" strokeWidth={1} />
              <circle cx={atual.px} cy={atual.py} r={5.5} fill="var(--anilha-legivel)" stroke="var(--sup)" strokeWidth={2} />
            </g>
          )}
        </svg>
        {atual && (
          <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-linha bg-sup px-3 py-2 text-xs shadow-xl" style={{ left: `${Math.min(Math.max((atual.px / largura) * 100, 12), 88)}%` }}>
            <p className="text-sm font-bold">{formatar(atual.valor)}</p>
            <p className="text-suave">{textoData(atual.data)}</p>
          </div>
        )}
        <p id={`${id}-leitura`} className="sr-only" aria-live="polite">
          {atual ? `${formatar(atual.valor)} em ${textoData(atual.data)}` : ''}
        </p>
      </div>
      <figcaption className="mt-2 flex justify-end">
        <button type="button" className="text-xs font-semibold text-suave underline-offset-2 hover:text-texto hover:underline" aria-expanded={tabela} onClick={() => setTabela((v) => !v)}>
          {tabela ? 'Esconder a tabela' : 'Ver em tabela'}
        </button>
      </figcaption>
      {tabela && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-linha" data-lenis-prevent>
          <table className="w-full text-sm">
            <caption className="sr-only">{rotulo}</caption>
            <thead className="sticky top-0 bg-sup-2 text-left text-xs text-suave">
              <tr>
                <th className="px-3 py-2 font-semibold">Dia</th>
                <th className="px-3 py-2 text-right font-semibold">{rotulo}</th>
              </tr>
            </thead>
            <tbody>
              {[...g.xy].reverse().map((p, i) => (
                <tr key={i} className="border-t border-linha">
                  <td className="px-3 py-1.5">{textoData(p.data)}</td>
                  <td className="dado px-3 py-1.5 text-right">{formatar(p.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  )
}
