import { FAMILIAS, MODALIDADES, type Familia } from '../../shared/modalidades'

// As 42 modalidades em 10 famílias, para ligar e desligar com um toque
export function EscolherModalidades({ valor, aoMudar, limite }: { valor: string[]; aoMudar: (v: string[]) => void; limite?: number }) {
  const familias = Object.keys(FAMILIAS) as Familia[]
  const alternar = (id: string) => {
    if (valor.includes(id)) aoMudar(valor.filter((x) => x !== id))
    else if (!limite || valor.length < limite) aoMudar([...valor, id])
  }
  return (
    <div className="space-y-4">
      {familias.map((f) => {
        const lista = MODALIDADES.filter((m) => m.familia === f)
        if (!lista.length) return null
        return (
          <div key={f}>
            <p className="flex items-center gap-2 text-xs font-bold text-suave">
              <span className="size-2 rounded-full" style={{ background: FAMILIAS[f].cor }} />
              {FAMILIAS[f].nome}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {lista.map((m) => (
                <button key={m.id} type="button" className="chip" aria-pressed={valor.includes(m.id)} onClick={() => alternar(m.id)} title={m.descricao}>
                  {m.nome}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
