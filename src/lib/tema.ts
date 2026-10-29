import { useSyncExternalStore } from 'react'

// Escuro ou claro. A Turma é escura por padrão (o grafite da sala de musculação); a pessoa pode
// escolher o claro, ou seguir o celular.

export type Preferencia = 'escuro' | 'claro' | 'sistema'
export type Tema = 'escuro' | 'claro'

const CHAVE = 'turma:tema'
const ouvintes = new Set<() => void>()

function lerPreferencia(): Preferencia {
  try {
    const v = localStorage.getItem(CHAVE)
    return v === 'claro' || v === 'sistema' ? v : 'escuro'
  } catch {
    return 'escuro'
  }
}

export function temaAgora(p: Preferencia = lerPreferencia()): Tema {
  if (p === 'sistema') return matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'escuro'
  return p
}

// Uma tela pode fixar o tema enquanto está aberta (a página da academia usa o estilo dela)
let fixo: Tema | null = null
export function fixarTema(t: Tema | null) {
  fixo = t
  aplicarTema()
}

export function aplicarTema() {
  const tema = fixo ?? temaAgora()
  document.documentElement.dataset.tema = tema
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'claro' ? '#f3f2ee' : '#0e0f12')
}

export function definirPreferencia(p: Preferencia) {
  try {
    if (p === 'escuro') localStorage.removeItem(CHAVE)
    else localStorage.setItem(CHAVE, p)
  } catch {
    // sem armazenamento: vale só nesta visita
  }
  aplicarTema()
  ouvintes.forEach((o) => o())
}

export function usePreferencia() {
  return useSyncExternalStore(
    (o) => {
      ouvintes.add(o)
      return () => ouvintes.delete(o)
    },
    lerPreferencia,
    () => 'escuro' as Preferencia,
  )
}

if (typeof window !== 'undefined') matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => lerPreferencia() === 'sistema' && aplicarTema())
