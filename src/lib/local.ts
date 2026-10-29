import { useSyncExternalStore } from 'react'
import { RAIO_PADRAO, SAO_LOURENCO, raioValido } from '../shared/geo'
import type { Cidade, Ponto } from '../shared/tipos'

// Onde a pessoa treina (a pergunta da capa): a cidade escolhida ou o GPS, e o raio da região. Vale
// para o mapa, a rede da região e os desafios perto. Sem escolha, a cidade da demonstração.

export type Local = { cidade: Cidade; ponto: Ponto; raio: number; gps: boolean; escolhido: boolean }

const CHAVE = 'turma:local'
const ouvintes = new Set<() => void>()
const PADRAO: Local = { cidade: SAO_LOURENCO, ponto: { lat: SAO_LOURENCO.lat, lng: SAO_LOURENCO.lng }, raio: RAIO_PADRAO, gps: false, escolhido: false }

let atual: Local = ler()

function ler(): Local {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as Local | null
    if (v?.cidade?.nome && Number.isFinite(v.ponto?.lat)) return { ...v, raio: raioValido(v.raio), escolhido: true }
  } catch {
    // sem armazenamento (aba anônima): fica o padrão
  }
  return PADRAO
}

export function definirLocal(l: Omit<Local, 'escolhido'>) {
  atual = { ...l, raio: raioValido(l.raio), escolhido: true }
  try {
    localStorage.setItem(CHAVE, JSON.stringify(atual))
  } catch {
    // vale só nesta visita
  }
  ouvintes.forEach((o) => o())
}

export const definirRaio = (raio: number) => definirLocal({ ...atual, raio })

export function useLocal() {
  return useSyncExternalStore(
    (o) => {
      ouvintes.add(o)
      return () => ouvintes.delete(o)
    },
    () => atual,
    () => PADRAO,
  )
}

export const localAgora = () => atual

// Onde a pessoa está (com a permissão do navegador)
export function minhaPosicao(timeout = 8000): Promise<Ponto | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout, maximumAge: 5 * 60_000 },
    )
  })
}
