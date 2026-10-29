import { CORES_DESTAQUE, ORDEM_TEMAS, TEMAS } from '../../shared/temas'
import type { PresetVisual } from '../../shared/tipos'

// O estilo (os 9 prontos) e a cor de destaque da marca
export function EscolherEstilo({ preset, destaque, aoMudar }: { preset: PresetVisual; destaque?: string; aoMudar: (v: { preset: PresetVisual; destaque?: string }) => void }) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Estilo">
        {ORDEM_TEMAS.map((id) => {
          const t = TEMAS[id]
          return (
            <button key={id} type="button" role="radio" aria-checked={preset === id} onClick={() => aoMudar({ preset: id })} className="rounded-2xl border border-linha p-2 text-left transition-colors aria-checked:border-anilha aria-checked:ring-2 aria-checked:ring-anilha">
              <span className="flex h-9 items-end gap-1 rounded-lg p-1.5" style={{ background: t.fundo }}>
                <span className="h-full w-3 rounded" style={{ background: t.destaque }} />
                <span className="h-3/5 w-3 rounded" style={{ background: t.superficie2 }} />
                <span className="h-2/5 w-3 rounded" style={{ background: t.detalhe }} />
              </span>
              <span className="mt-1.5 block text-xs font-bold">{t.nome}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-fraco">{TEMAS[preset].descricao}</p>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Cor de destaque">
        {CORES_DESTAQUE.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={(destaque ?? TEMAS[preset].destaque) === c}
            aria-label={`Cor ${c}`}
            onClick={() => aoMudar({ preset, destaque: c })}
            className="size-8 rounded-full border border-linha-2 transition-transform aria-checked:scale-110 aria-checked:ring-2 aria-checked:ring-texto aria-checked:ring-offset-2 aria-checked:ring-offset-fundo"
            style={{ background: c }}
          />
        ))}
        <label className="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-linha-2 text-xs text-suave" title="Outra cor">
          +
          <input type="color" className="absolute inset-0 cursor-pointer opacity-0" value={destaque ?? TEMAS[preset].destaque} onChange={(e) => aoMudar({ preset, destaque: e.target.value })} aria-label="Outra cor" />
        </label>
      </div>
    </div>
  )
}
