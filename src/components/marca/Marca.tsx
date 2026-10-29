import { createContext, useContext, useEffect, useMemo, type CSSProperties, type ReactNode } from 'react'
import { urlMidia } from '../../lib/api'
import { carregarFonte, carregarFontePropria } from '../../lib/fontes'
import { iniciais, nomeCurto } from '../../shared/texto'
import { temaDe, variaveisDoTema, type TemaFinal } from '../../shared/temas'
import type { Visual } from '../../shared/tipos'

// A marca da academia ou do personal: o estilo, a cor e a fonte que ela escolheu (seção 18 do
// estudo). Tudo o que fica dentro de <ComMarca> veste a marca: os botões, os cartões, os títulos e
// até os músculos do boneco 3D.

export function useMarca(visual?: Partial<Visual> | null): TemaFinal {
  const tema = useMemo(() => temaDe(visual ?? undefined), [visual?.preset, visual?.destaque, visual?.fonte, visual?.fontePropria?.id, visual?.fontePropria?.nome])
  useEffect(() => {
    carregarFonte(tema.fonte)
    carregarFontePropria(visual?.fontePropria)
  }, [tema.fonte, visual?.fontePropria])
  return tema
}

// O tema de quem está em volta (dentro de <ComMarca>), para o que não lê CSS: o boneco 3D, os gráficos
const TemaEmVolta = createContext<TemaFinal | null>(null)
const PADRAO = temaDe(undefined)
export const useTemaEmVolta = () => useContext(TemaEmVolta) ?? PADRAO

export function ComMarca({ visual, className = '', children, estilo }: { visual?: Partial<Visual> | null; className?: string; children: ReactNode; estilo?: CSSProperties }) {
  const tema = useMarca(visual)
  return (
    <TemaEmVolta.Provider value={tema}>
      <div className={`com-marca ${className}`} data-esquema={tema.escuro ? 'escuro' : 'claro'} style={{ ...(variaveisDoTema(tema) as CSSProperties), ...estilo }}>
        {children}
      </div>
    </TemaEmVolta.Provider>
  )
}

// A logo da marca, ou a inicial na cor dela (sem logo enviada)
export function LogoDaMarca({ visual, nome, tamanho = 40, className = '' }: { visual?: Partial<Visual> | null; nome: string; tamanho?: number; className?: string }) {
  const tema = useMarca(visual)
  const url = urlMidia(visual?.logo)
  if (url)
    return (
      <img src={url} alt={`Logo ${nome}`} width={tamanho} height={tamanho} className={`shrink-0 rounded-[22%] object-cover ${className}`} style={{ width: tamanho, height: tamanho, background: tema.superficie }} loading="lazy" />
    )
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-[22%] ${className}`}
      style={{ width: tamanho, height: tamanho, background: tema.destaque, color: tema.destaqueTexto, fontFamily: tema.fonteInfo.familia, fontWeight: tema.fonteInfo.peso, fontSize: tamanho * 0.46, lineHeight: 1 }}
    >
      {(iniciais(nomeCurto(nome)) || nome.charAt(0)).slice(0, 2).toUpperCase()}
    </span>
  )
}
