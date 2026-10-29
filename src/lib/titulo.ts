import { useEffect } from 'react'
import { MARCA } from '../data/marca'

// O título da aba (e da prévia quando a pessoa salva ou compartilha a página)
export function useTitulo(titulo: string | undefined, { puro = false } = {}) {
  useEffect(() => {
    if (titulo) document.title = puro ? titulo : `${titulo} · ${MARCA.nome}`
  }, [titulo, puro])
}
