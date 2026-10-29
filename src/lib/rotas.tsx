import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

// Roteador mínimo: o endereço decide a tela (/, /joao, /painel/agenda...). Sem biblioteca: só
// history.pushState e o evento popstate.

const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((o) => o())

if (typeof window !== 'undefined') window.addEventListener('popstate', avisar)

// Quem cuida da rolagem suave (Lenis) se registra aqui; sem ele, rola do jeito do navegador
let rolador: ((alvo: HTMLElement) => void) | null = null
export const registrarRolador = (f: typeof rolador) => {
  rolador = f
}

export function rolarPara(id: string, tentativas = 20) {
  const el = document.getElementById(id)
  if (!el) {
    // a tela nova ainda está montando
    if (tentativas > 0) setTimeout(() => rolarPara(id, tentativas - 1), 60)
    return
  }
  if (rolador) rolador(el)
  else el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}

export function navegar(para: string, { substituir = false, manterRolagem = false } = {}) {
  const [semHash, hash] = para.split('#')
  const atual = location.pathname + location.search
  if (semHash && semHash !== atual) {
    if (substituir) history.replaceState(null, '', semHash)
    else history.pushState(null, '', semHash)
    avisar()
    if (!manterRolagem && !hash) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }
  if (hash) rolarPara(hash)
}

export function useEndereco() {
  const href = useSyncExternalStore(
    (o) => {
      ouvintes.add(o)
      return () => ouvintes.delete(o)
    },
    () => location.pathname + location.search,
    () => '/',
  )
  const url = new URL(href, 'http://x')
  return { caminho: url.pathname.replace(/\/+$/, '') || '/', busca: url.searchParams }
}

type PropsLink = AnchorHTMLAttributes<HTMLAnchorElement> & { para: string; substituir?: boolean }

// Link que troca de tela sem recarregar (o Ctrl/Cmd+clique continua abrindo em outra aba)
export function Link({ para, substituir, onClick, ...resto }: PropsLink) {
  function clicar(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || resto.target === '_blank') return
    if (/^https?:|^mailto:|^tel:/.test(para)) return
    e.preventDefault()
    navegar(para, { substituir })
  }
  return <a href={para} onClick={clicar} {...resto} />
}
