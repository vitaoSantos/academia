import type { Cidade, Ponto } from './tipos.ts'

// Distâncias e a região de quem procura. A região é um raio em volta do ponto da pessoa (o GPS ou o
// centro da cidade que ela escolheu): 50 km por padrão, como no pedido (São Lourenço não vê Poços
// de Caldas, que fica a 161 km).

export const RAIOS = [10, 25, 50, 100] as const
export const RAIO_PADRAO = 50

// A cidade da demonstração (os dados do IBGE)
export const SAO_LOURENCO: Cidade = { codigo: 3163706, nome: 'São Lourenço', uf: 'MG', lat: -22.1166, lng: -45.0506 }

const RAD = Math.PI / 180

export function distanciaKm(a: Ponto, b: Ponto) {
  const dLat = (b.lat - a.lat) * RAD
  const dLng = (b.lng - a.lng) * RAD
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)))
}

export const pontoValido = (p: unknown): p is Ponto =>
  !!p &&
  typeof (p as Ponto).lat === 'number' &&
  typeof (p as Ponto).lng === 'number' &&
  Number.isFinite((p as Ponto).lat) &&
  Number.isFinite((p as Ponto).lng) &&
  Math.abs((p as Ponto).lat) <= 90 &&
  Math.abs((p as Ponto).lng) <= 180

export const arredondarPonto = (p: Ponto): Ponto => ({ lat: Math.round(p.lat * 1e5) / 1e5, lng: Math.round(p.lng * 1e5) / 1e5 })

export const cidadeValida = (c: unknown): c is Cidade =>
  !!c &&
  typeof (c as Cidade).codigo === 'number' &&
  typeof (c as Cidade).nome === 'string' &&
  /^[A-Z]{2}$/.test((c as Cidade).uf) &&
  pontoValido({ lat: (c as Cidade).lat, lng: (c as Cidade).lng })

export const raioValido = (r: unknown) => (RAIOS as readonly number[]).includes(Number(r)) ? Number(r) : RAIO_PADRAO

export const dentro = (centro: Ponto, ponto: Ponto, raioKm: number) => distanciaKm(centro, ponto) <= raioKm

// "800 m", "8 km", "161 km"
export function textoDistancia(km: number) {
  const metros = Math.max(100, Math.round((km * 1000) / 100) * 100)
  if (metros < 1000) return `${metros} m`
  if (km < 10) return `${km.toFixed(1).replace('.', ',').replace(',0', '')} km`
  return `${Math.round(km)} km`
}

export const nomeCidade = (c: Pick<Cidade, 'nome' | 'uf'>) => `${c.nome} (${c.uf})`

// O link do mapa do celular para chegar na unidade
export const comoChegar = (p: Ponto, nome?: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}${nome ? `&destination_place_id=&query=${encodeURIComponent(nome)}` : ''}`
