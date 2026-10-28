import { distanciaKm } from '../../src/shared/geo.ts'
import { MAX_DESTAQUES } from '../../src/shared/planos.ts'
import { semAcento } from '../../src/shared/texto.ts'
import type { Ponto, TipoEmpresa } from '../../src/shared/tipos.ts'
import type { LinhaProfissional, LinhaUnidade, ProfissionalAchado, ResultadoExplorar, UnidadeAchada } from '../../src/shared/respostas.ts'
import { CHAVES, lerJSON } from './store.ts'

// O explorar (seção 15 do estudo): as unidades e os profissionais num raio em volta de quem procura,
// com no máximo 3 destaques no topo (revezando a cada visita) e o resto por distância ou nota.

export type Filtro = { ponto: Ponto; raio: number; tipo?: 'academias' | 'personais' | 'todos'; tiposEmpresa?: TipoEmpresa[]; modalidade?: string; busca?: string; ordem?: 'distancia' | 'nota'; wellhub?: boolean; totalpass?: boolean }

const bate = (busca: string | undefined, ...textos: string[]) => {
  if (!busca) return true
  const alvo = semAcento(textos.join(' '))
  return semAcento(busca)
    .split(/\s+/)
    .filter(Boolean)
    .every((p) => alvo.includes(p))
}

// Os destaques sorteados para esta visita (no máximo 3), o resto na ordem pedida
function comDestaques<T extends { destaque: boolean; km: number; nota: { media: number; total: number } }>(lista: T[], ordem: 'distancia' | 'nota') {
  const ordenar = (a: T, b: T) => (ordem === 'nota' ? b.nota.media * Math.min(1, b.nota.total / 3) - a.nota.media * Math.min(1, a.nota.total / 3) || a.km - b.km : a.km - b.km)
  const candidatos = lista.filter((x) => x.destaque)
  const sorteados = [...candidatos].sort(() => Math.random() - 0.5).slice(0, MAX_DESTAQUES)
  const ids = new Set(sorteados)
  return [...sorteados.map((x) => ({ ...x, destaqueAgora: true })), ...lista.filter((x) => !ids.has(x)).sort(ordenar)]
}

export async function explorar(f: Filtro): Promise<ResultadoExplorar> {
  const [unidades, profissionais] = await Promise.all([lerJSON<LinhaUnidade[]>(CHAVES.indiceUnidades, []), lerJSON<LinhaProfissional[]>(CHAVES.indiceProfissionais, [])])
  const ordem = f.ordem ?? 'distancia'

  const naRegiao = unidades.map((u) => ({ ...u, km: distanciaKm(f.ponto, u.ponto) })).filter((u) => u.km <= f.raio)
  const unidadesAchadas = naRegiao.filter(
    (u) =>
      (!f.modalidade || u.modalidades.includes(f.modalidade)) &&
      (!f.tiposEmpresa?.length || f.tiposEmpresa.includes(u.tipo)) &&
      (!f.wellhub || u.agregadores.includes('wellhub')) &&
      (!f.totalpass || u.agregadores.includes('totalpass')) &&
      bate(f.busca, u.nome, u.unidadeNome, u.cidade.nome, u.bairro ?? ''),
  )

  // o profissional aparece quando atende onde a pessoa está (a cidade e o raio dele) ou dá aula numa
  // academia dentro do raio de quem procura
  const prosComKm = profissionais.map((p) => {
    const base = distanciaKm(f.ponto, p.ponto)
    const locais = p.locais.map((l) => distanciaKm(f.ponto, l.ponto))
    const km = Math.min(base, ...locais)
    const atende = base <= Math.max(f.raio, p.raioKm) || locais.some((k) => k <= f.raio)
    return { ...p, km, atende }
  })
  const filtroPro = (p: (typeof prosComKm)[number]) => (!f.modalidade || p.modalidades.includes(f.modalidade)) && bate(f.busca, p.nome, p.especialidades.join(' '), p.cidade.nome)
  const prosAchados = prosComKm.filter((p) => p.atende && filtroPro(p)).map(({ atende: _a, ...p }) => p)
  // quem atende online e está longe aparece à parte
  const online = prosComKm.filter((p) => !p.atende && p.online && p.personal && filtroPro(p)).map(({ atende: _a, ...p }) => p).sort((a, b) => b.nota.media - a.nota.media).slice(0, 12)

  // as modalidades da região (para os filtros e os números da landing)
  const modalidades = new Map<string, number>()
  for (const u of naRegiao) for (const m of u.modalidades) modalidades.set(m, (modalidades.get(m) ?? 0) + 1)

  const mostrarUnidades = f.tipo !== 'personais'
  const mostrarPros = f.tipo !== 'academias'
  return {
    unidades: mostrarUnidades ? (comDestaques(unidadesAchadas, ordem).slice(0, 200) as UnidadeAchada[]) : [],
    profissionais: mostrarPros ? (comDestaques(prosAchados, ordem).slice(0, 120) as ProfissionalAchado[]) : [],
    online: mostrarPros ? online : [],
    modalidades: [...modalidades.entries()].map(([id, n]) => ({ id, unidades: n })).sort((a, b) => b.unidades - a.unidades),
    numeros: {
      academias: new Set(naRegiao.map((u) => u.empresa)).size,
      unidades: naRegiao.length,
      personais: prosComKm.filter((p) => p.atende && p.personal).length,
      profissionais: prosComKm.filter((p) => p.atende).length,
      modalidades: modalidades.size,
    },
  }
}

