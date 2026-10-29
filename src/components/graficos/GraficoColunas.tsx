import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

// Colunas finas (até 24 px, a ponta arredondada e a base reta) para contar por período: os treinos de
// cada semana, com a linha da meta. O valor aparece na coluna escolhida (dedo, mouse ou setas) e na
// tabela.

export type Coluna = { rotulo: string; valor: number; detalhe?: string }

export function GraficoColunas({ colunas, meta, rotulo, altura = 170, unidade = '' }: { colunas: Coluna[]; meta?: number; rotulo: string; altura?: number; unidade?: string }) {
  const caixa = useRef<HTMLDivElement>(null)
  const [largura, setLargura] = useState(600)
  const [ativo, setAtivo] = useState<number | null>(null)
  const [tabela, setTabela] = useState(false)
  const id = useId()

  useEffect(() => {
    const el = caixa.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(240, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (!colunas.length) return null
  const m = { esq: 8, dir: 8, cima: 20, baixo: 24 }
  const w = largura - m.esq - m.dir
  const h = altura - m.cima - m.baixo
  const topo = Math.max(1, meta ?? 0, ...colunas.map((c) => c.valor))
  const faixa = w / colunas.length
  const grossura = Math.min(24, faixa * 0.6)
  const y = (v: number) => m.cima + h - (v / topo) * h
  const base = m.cima + h
  const ultimo = colunas.length - 1
  const tecla = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      setAtivo((a) => Math.max(0, Math.min(ultimo, (a ?? ultimo) + (e.key === 'ArrowLeft' ? -1 : 1))))
    } else if (e.key === 'Escape') setAtivo(null)
  }
  const atual = ativo !== null ? colunas[ativo] : null
  // os rótulos de baixo: todos se couberem; senão, de dois em dois contando do último
  const pulo = faixa < 34 ? 2 : 1

  return (
    <figure className="m-0">
      <div ref={caixa} className="relative">
        <svg
          width="100%"
          viewBox={`0 0 ${largura} ${altura}`}
          className="block touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-anilha focus-visible:ring-offset-2 focus-visible:ring-offset-fundo"
          role="img"
          aria-label={`${rotulo}. Use as setas para ler cada coluna.`}
          aria-describedby={`${id}-leitura`}
          tabIndex={0}
          onKeyDown={tecla}
          onBlur={() => setAtivo(null)}
          onPointerLeave={() => setAtivo(null)}
        >
          <line x1={m.esq} x2={largura - m.dir} y1={base} y2={base} stroke="var(--linha-2)" strokeWidth={1} />
          {meta ? (
            <g>
              <line x1={m.esq} x2={largura - m.dir} y1={y(meta)} y2={y(meta)} stroke="var(--suave)" strokeWidth={1} opacity={0.7} />
              <text x={largura - m.dir} y={y(meta) - 5} textAnchor="end" fontSize={11} fill="var(--suave)">
                meta {meta}
              </text>
            </g>
          ) : null}
          {colunas.map((c, i) => {
            const cx = m.esq + faixa * i + faixa / 2
            const alto = Math.max(c.valor > 0 ? 3 : 0, base - y(c.valor))
            const r = Math.min(4, alto, grossura / 2)
            const x0 = cx - grossura / 2
            const topoY = base - alto
            // a ponta arredondada, a base reta
            const d = alto > 0 ? `M${x0},${base}V${topoY + r}Q${x0},${topoY} ${x0 + r},${topoY}H${x0 + grossura - r}Q${x0 + grossura},${topoY} ${x0 + grossura},${topoY + r}V${base}Z` : ''
            const bate = meta !== undefined && c.valor >= meta
            return (
              <g key={i} onPointerEnter={() => setAtivo(i)} onPointerDown={() => setAtivo(i)}>
                {/* a área de toque é a faixa inteira, não só a coluna */}
                <rect x={m.esq + faixa * i} y={m.cima} width={faixa} height={h + m.baixo} fill="transparent" />
                {d && <path d={d} fill={bate ? 'var(--anilha)' : 'var(--sup-3)'} opacity={ativo === null || ativo === i ? 1 : 0.55} />}
                {(ultimo - i) % pulo === 0 && (
                  <text x={cx} y={altura - 6} textAnchor="middle" fontSize={10.5} fill={ativo === i ? 'var(--texto)' : 'var(--fraco)'}>
                    {c.rotulo}
                  </text>
                )}
                {(ativo === i || (ativo === null && i === ultimo)) && c.valor > 0 && (
                  <text x={cx} y={topoY - 6} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--texto)">
                    {c.valor}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
        {atual?.detalhe && (
          <p className="pointer-events-none absolute top-0 left-0 rounded-lg bg-sup px-2 py-1 text-xs text-suave shadow">
            {atual.detalhe}
          </p>
        )}
        <p id={`${id}-leitura`} className="sr-only" aria-live="polite">
          {atual ? `${atual.rotulo}: ${atual.valor}${unidade}` : ''}
        </p>
      </div>
      <figcaption className="mt-2 flex items-center justify-between gap-3 text-xs text-suave">
        <span className="flex items-center gap-1.5">
          {meta ? (
            <>
              <span className="inline-block size-2.5 rounded-sm bg-anilha" /> bateu a meta
              <span className="ml-2 inline-block size-2.5 rounded-sm bg-sup-3" /> abaixo
            </>
          ) : null}
        </span>
        <button type="button" className="font-semibold underline-offset-2 hover:text-texto hover:underline" aria-expanded={tabela} onClick={() => setTabela((v) => !v)}>
          {tabela ? 'Esconder a tabela' : 'Ver em tabela'}
        </button>
      </figcaption>
      {tabela && (
        <table className="mt-2 w-full overflow-hidden rounded-xl border border-linha text-sm">
          <caption className="sr-only">{rotulo}</caption>
          <tbody>
            {[...colunas].reverse().map((c, i) => (
              <tr key={i} className="border-t border-linha first:border-t-0">
                <td className="px-3 py-1.5">{c.detalhe ?? c.rotulo}</td>
                <td className="dado px-3 py-1.5 text-right">
                  {c.valor}
                  {unidade}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  )
}
