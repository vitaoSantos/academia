import { useEffect, useState } from 'react'
import { PiMinus, PiPlus } from 'react-icons/pi'

// O número com − e + dos lados (a carga, as repetições): grande para o dedo suado, aceita vírgula
const texto = (n: number) => (Number.isFinite(n) ? String(n).replace('.', ',') : '')

export function CampoNumero({ valor, aoMudar, passo = 1, min = 0, max = 999, rotulo, compacto = false }: { valor: number; aoMudar: (n: number) => void; passo?: number; min?: number; max?: number; rotulo: string; compacto?: boolean }) {
  const [digitado, setDigitado] = useState(texto(valor))
  useEffect(() => setDigitado(texto(valor)), [valor])
  const limitar = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100))
  const somar = (d: number) => aoMudar(limitar((Number.isFinite(valor) ? valor : 0) + d))
  const botao = `grid shrink-0 place-items-center rounded-xl bg-sup-2 text-suave hover:bg-sup-3 hover:text-texto active:scale-95 ${compacto ? 'size-8' : 'size-10'}`
  return (
    <div className="flex items-center gap-1">
      <button type="button" className={botao} onClick={() => somar(-passo)} aria-label={`Menos ${rotulo}`} tabIndex={-1}>
        <PiMinus />
      </button>
      <input
        className={`dado w-full min-w-0 rounded-xl border border-linha bg-sup text-center font-bold outline-none focus:border-anilha ${compacto ? 'h-8 text-sm' : 'h-10 text-base'}`}
        inputMode="decimal"
        aria-label={rotulo}
        value={digitado}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d,.]/g, '')
          setDigitado(t)
          const n = Number(t.replace(',', '.'))
          if (t && Number.isFinite(n)) aoMudar(limitar(n))
        }}
        onBlur={() => setDigitado(texto(valor))}
      />
      <button type="button" className={botao} onClick={() => somar(passo)} aria-label={`Mais ${rotulo}`} tabIndex={-1}>
        <PiPlus />
      </button>
    </div>
  )
}
