import { motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PiCircleNotch, PiStarFill, PiStar, PiX } from 'react-icons/pi'
import { urlMidia } from '../../lib/api'
import { textoNota } from '../../shared/avaliacao'
import { iniciais } from '../../shared/texto'
import type { Nota } from '../../shared/tipos'

export const easeSuave = [0.22, 1, 0.36, 1] as const
export const mola = { type: 'spring', stiffness: 420, damping: 34 } as const

// O símbolo da Turma: a anilha vista de frente (o aro amarelo, o miolo e o furo da barra)
export function Simbolo({ tamanho = 28, fundo = true, className = '' }: { tamanho?: number; fundo?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={tamanho} height={tamanho} className={className} aria-hidden>
      {fundo && <rect width="64" height="64" rx="15" fill="#0e0f12" />}
      <circle cx="32" cy="32" r="21" fill="none" stroke="#f5c518" strokeWidth="7" />
      <circle cx="32" cy="32" r="12" fill="none" stroke="#f5c518" strokeOpacity="0.45" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="5" fill="#f5c518" />
    </svg>
  )
}

export function Logo({ className = '', tamanho = 28 }: { className?: string; tamanho?: number }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Simbolo tamanho={tamanho} />
      <span className="titulo text-[1.35em] leading-none tracking-[0.02em]">Turma</span>
    </span>
  )
}

export function Girando({ className = '' }: { className?: string }) {
  return <PiCircleNotch className={`animate-[girar_0.8s_linear_infinite] ${className}`} aria-hidden />
}

export function Carregando({ className = '' }: { className?: string }) {
  return (
    <div className={`grid place-items-center py-16 ${className}`} role="status" aria-label="Carregando">
      <Girando className="text-2xl text-fraco" />
    </div>
  )
}

// A foto da pessoa, ou as iniciais num círculo
export function Avatar({ nome, foto, tamanho = 40, cor, className = '' }: { nome: string; foto?: string; tamanho?: number; cor?: string; className?: string }) {
  const [falhou, setFalhou] = useState(false)
  const url = !falhou ? urlMidia(foto) : undefined
  if (url) return <img src={url} alt="" width={tamanho} height={tamanho} onError={() => setFalhou(true)} className={`shrink-0 rounded-full object-cover ${className}`} style={{ width: tamanho, height: tamanho }} loading="lazy" />
  return (
    <span
      className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-bold ${cor ? '' : 'bg-sup-3 text-texto'} ${className}`}
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.36, ...(cor ? { background: cor, color: '#111' } : {}) }}
      aria-hidden
    >
      {iniciais(nome) || '·'}
    </span>
  )
}

// A nota com a estrela ("★ 4,9" ou "Novo")
export function NotaTexto({ nota, className = '' }: { nota?: Nota; className?: string }) {
  const t = textoNota(nota)
  return (
    <span className={`dado inline-flex items-center gap-1 ${className}`}>
      {t === 'Novo' ? (
        'Novo'
      ) : (
        <>
          <PiStarFill className="text-anilha-legivel" aria-hidden />
          {t}
          {nota && <span className="text-fraco">({nota.total})</span>}
        </>
      )}
    </span>
  )
}

// As estrelas: de enfeite ou para escolher (1 a 5)
export function Estrelas({ valor, aoMudar, tamanho = 22, className = '' }: { valor: number; aoMudar?: (v: number) => void; tamanho?: number; className?: string }) {
  if (!aoMudar)
    return (
      <span className={`inline-flex gap-0.5 text-anilha-legivel ${className}`} aria-label={`${valor} de 5 estrelas`}>
        {[1, 2, 3, 4, 5].map((n) => (n <= Math.round(valor) ? <PiStarFill key={n} style={{ fontSize: tamanho }} /> : <PiStar key={n} className="opacity-40" style={{ fontSize: tamanho }} />))}
      </span>
    )
  return (
    <span role="radiogroup" aria-label="Estrelas" className={`inline-flex gap-1 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={valor === n} aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`} onClick={() => aoMudar(n)} className="text-anilha-legivel transition-transform active:scale-90">
          {n <= valor ? <PiStarFill style={{ fontSize: tamanho }} /> : <PiStar className="opacity-50" style={{ fontSize: tamanho }} />}
        </button>
      ))}
    </span>
  )
}

// Folha que sobe de baixo (celular) ou janela no centro (computador)
export function Folha({
  aberta,
  aoFechar,
  titulo,
  children,
  largura = 'max-w-lg',
  className = '',
  semFechar = false,
}: {
  aberta: boolean
  aoFechar: () => void
  titulo?: string
  children: ReactNode
  largura?: string
  className?: string
  semFechar?: boolean
}) {
  const caixa = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!aberta) return
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', tecla)
    const rolagem = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    caixa.current?.focus()
    return () => {
      window.removeEventListener('keydown', tecla)
      document.documentElement.style.overflow = rolagem
    }
  }, [aberta, aoFechar])
  if (!aberta) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={titulo} data-lenis-prevent>
      <button type="button" className="absolute inset-0 bg-black/60" onClick={aoFechar} aria-label="Fechar" tabIndex={-1} />
      <motion.div
        ref={caixa}
        tabIndex={-1}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={mola}
        className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-linha bg-sup text-texto shadow-2xl outline-none sm:rounded-3xl ${largura} ${className}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {!semFechar && (
          <button type="button" onClick={aoFechar} className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full bg-sup-2 text-lg text-suave hover:text-texto" aria-label="Fechar">
            <PiX />
          </button>
        )}
        {children}
      </motion.div>
    </div>
  )
}

export function Vazio({ titulo, texto, children, icone }: { titulo: string; texto?: ReactNode; children?: ReactNode; icone?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icone && <div className="text-3xl text-fraco">{icone}</div>}
      <p className="text-lg font-bold">{titulo}</p>
      {texto && <p className="max-w-sm text-sm text-suave">{texto}</p>}
      {children}
    </div>
  )
}

export function Erro({ mensagem, aoTentar }: { mensagem: string; aoTentar?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center" role="alert">
      <p className="text-sm text-suave">{mensagem}</p>
      {aoTentar && (
        <button type="button" className="btn btn-p btn-contorno" onClick={aoTentar}>
          Tentar de novo
        </button>
      )}
    </div>
  )
}

export function Campo({ rotulo, dica, erro, children, className = '' }: { rotulo: ReactNode; dica?: ReactNode; erro?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="rotulo">{rotulo}</span>
      {children}
      {erro ? <span className="mt-1.5 block text-xs font-medium text-perigo">{erro}</span> : dica ? <span className="mt-1.5 block text-xs text-fraco">{dica}</span> : null}
    </label>
  )
}

export function Interruptor({ ligado, aoMudar, rotulo, descricao, desativado }: { ligado: boolean; aoMudar: (v: boolean) => void; rotulo: ReactNode; descricao?: ReactNode; desativado?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-start justify-between gap-4 ${desativado ? 'opacity-50' : ''}`}>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{rotulo}</span>
        {descricao && <span className="mt-0.5 block text-xs text-suave">{descricao}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={ligado}
        disabled={desativado}
        onClick={() => aoMudar(!ligado)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${ligado ? 'bg-anilha' : 'bg-sup-3'}`}
      >
        <span className={`absolute top-0.5 left-0 size-5 rounded-full bg-white shadow transition-transform duration-300 ${ligado ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
    </label>
  )
}

// Abas em pílula (Perto · Seguindo · Minha academia; Hoje · Semana)
export function Abas<T extends string>({ opcoes, valor, aoMudar, className = '' }: { opcoes: { id: T; rotulo: ReactNode }[]; valor: T; aoMudar: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={`sem-barra flex gap-1 overflow-x-auto rounded-2xl bg-sup-2 p-1 ${className}`}>
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={o.id === valor}
          onClick={() => aoMudar(o.id)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${o.id === valor ? 'bg-texto text-fundo' : 'text-suave hover:text-texto'}`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

// O selo pequeno ao lado do nome (Premium, Destaque, Online, Pendente)
export function Selo({ children, tom = 'neutro', className = '' }: { children: ReactNode; tom?: 'neutro' | 'marca' | 'ok' | 'alerta' | 'perigo'; className?: string }) {
  const cores = {
    neutro: 'bg-sup-3 text-suave',
    marca: 'bg-anilha text-anilha-texto',
    ok: 'bg-ok/15 text-ok',
    alerta: 'bg-alerta/15 text-alerta',
    perigo: 'bg-perigo/15 text-perigo',
  }[tom]
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.68rem] font-bold tracking-wide whitespace-nowrap uppercase ${cores} ${className}`}>{children}</span>
}

// O número grande com a legenda (os números da região, do personal, do treino)
export function Numero({ valor, legenda, className = '' }: { valor: ReactNode; legenda: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="titulo dado text-4xl">{valor}</p>
      <p className="mt-1 text-xs font-semibold text-suave">{legenda}</p>
    </div>
  )
}
