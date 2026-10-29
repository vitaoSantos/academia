import { useState } from 'react'

// Chips com as sugestões e o campo para escrever outra. A ordem segue as sugestões.
export function Etiquetas({ rotulo, valor, sugestoes, max, aoMudar }: { rotulo: string; valor: string[]; sugestoes: string[]; max: number; aoMudar: (v: string[]) => void }) {
  const [nova, setNova] = useState('')
  const todas = [...new Set([...sugestoes, ...valor])]
  const ordenar = (v: string[]) => [...new Set([...sugestoes, ...v])].filter((x) => v.includes(x))
  const por = () => {
    const t = nova.trim()
    if (t && !valor.includes(t) && valor.length < max) aoMudar(ordenar([...valor, t]))
    setNova('')
  }
  return (
    <div>
      <p className="rotulo">{rotulo}</p>
      <div className="flex flex-wrap gap-1.5">
        {todas.map((x) => (
          <button key={x} type="button" className="chip" aria-pressed={valor.includes(x)} onClick={() => aoMudar(valor.includes(x) ? valor.filter((y) => y !== x) : valor.length < max ? ordenar([...valor, x]) : valor)}>
            {x}
          </button>
        ))}
      </div>
      <div className="mt-2 flex max-w-sm gap-2">
        <input
          className="campo"
          value={nova}
          maxLength={30}
          onChange={(ev) => setNova(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter') {
              ev.preventDefault()
              por()
            }
          }}
          placeholder="Outro"
          aria-label={`Outro: ${rotulo.toLowerCase()}`}
        />
        <button type="button" className="btn btn-sup btn-m shrink-0" onClick={por} disabled={!nova.trim()}>
          Pôr
        </button>
      </div>
    </div>
  )
}
