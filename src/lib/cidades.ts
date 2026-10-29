import type { ApiMunicipios, Municipio } from 'municipios-brasil'
import type { Cidade, Ponto } from '../shared/tipos'

// As 5.571 cidades do IBGE, carregadas só quando alguém vai escolher a cidade (é um arquivo à parte,
// fora do começo do app). Depois de carregadas, a busca é na hora, a cada letra.

let api: Promise<ApiMunicipios> | null = null

export function carregarCidades() {
  api ??= import('municipios-brasil').then((m) => m.carregarMunicipios())
  return api
}

const cidade = (m: Municipio): Cidade => ({ codigo: m.codigoIbge, nome: m.nome, uf: m.uf, lat: m.latitude, lng: m.longitude })

export async function buscarCidades(termo: string, limite = 8): Promise<Cidade[]> {
  const t = termo.trim()
  if (t.length < 2) return []
  // "são lourenço mg" ou "São Lourenço - MG": a UF no fim filtra
  const uf = t.match(/[\s,(/-]+([a-zA-Z]{2})\)?$/)?.[1]?.toUpperCase()
  const nome = uf ? t.slice(0, t.length - t.match(/[\s,(/-]+[a-zA-Z]{2}\)?$/)![0].length) : t
  const m = await carregarCidades()
  try {
    return m.buscar(nome, { limite, ...(uf ? { uf: uf as never } : {}) }).map(cidade)
  } catch {
    return m.buscar(t, { limite }).map(cidade)
  }
}

// A cidade do GPS (a mais perto do ponto)
export async function cidadeDoPonto(p: Ponto): Promise<Cidade | null> {
  const m = await carregarCidades()
  try {
    return cidade(m.maisProxima({ latitude: p.lat, longitude: p.lng }).cidade)
  } catch {
    return null
  }
}
