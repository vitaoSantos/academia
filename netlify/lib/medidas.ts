import { alunoMais } from '../../src/shared/planos.ts'
import { DATA, hoje } from '../../src/shared/tempo.ts'
import { limparTexto } from '../../src/shared/texto.ts'
import type { Circunferencia, Medida } from '../../src/shared/tipos.ts'
import type { ContaGuardada } from './auth.ts'
import { falhar, type Corpo } from './http.ts'
import { apagarMidia, guardarImagem } from './midia.ts'
import { lerPlataforma } from './plataforma.ts'
import { atualizar, CHAVES, lerJSON, novoId } from './store.ts'

// As medidas (seção 12 do estudo): dado sensível de saúde. Ficam privadas sempre; o profissional só
// vê (e lança a avaliação física) com o consentimento do aluno. As fotos de evolução são privadas.

export const CIRCUNFERENCIAS: Circunferencia[] = ['pescoco', 'ombro', 'peito', 'bracoD', 'bracoE', 'cintura', 'abdomen', 'quadril', 'coxaD', 'coxaE', 'panturrilha']

const faixa = (v: unknown, min: number, max: number) => {
  const n = Math.round(Number(v) * 10) / 10
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined
}

export const lerMedidas = (conta: string) => lerJSON<Medida[]>(CHAVES.medidas(conta), [])

export async function salvarMedida(dono: ContaGuardada | { id: string; plano: 'gratis' | 'mais'; maisAte?: string }, corpo: Corpo, por?: { id: string; nome: string }) {
  const data = typeof corpo.data === 'string' && DATA.test(corpo.data) && corpo.data <= hoje() ? corpo.data : hoje()
  const circ: Medida['circ'] = {}
  const c = (corpo.circ ?? {}) as Record<string, unknown>
  for (const k of CIRCUNFERENCIAS) {
    const v = faixa(c[k], 10, 250)
    if (v !== undefined) circ[k] = v
  }
  const peso = faixa(corpo.peso, 20, 350)
  const altura = faixa(corpo.altura, 90, 250)
  const gordura = faixa(corpo.gordura, 2, 70)
  const obs = limparTexto(corpo.obs, 300)
  if (peso === undefined && altura === undefined && gordura === undefined && !Object.keys(circ).length && !corpo.foto) falhar(400, 'Preencha pelo menos uma medida.')

  // as fotos de evolução: 3 no grátis, sem limite no Turma+
  const fotos: string[] = []
  if (corpo.foto && !por) {
    const lista = await lerMedidas(dono.id)
    const total = lista.reduce((n, m) => n + m.fotos.length, 0)
    if (!alunoMais(dono) && total >= (await lerPlataforma()).limites.fotosGratis) falhar(402, 'No plano grátis cabem 3 fotos de evolução. Com o Turma+, sem limite e com o lado a lado.')
    fotos.push((await guardarImagem(dono.id, 'evolucao', corpo.foto, { privada: true })).id)
  }

  const id = typeof corpo.id === 'string' && corpo.id ? corpo.id : novoId()
  let salva: Medida | undefined
  await atualizar<Medida[]>(CHAVES.medidas(dono.id), [], (lista) => {
    const antes = lista.find((m) => m.id === id)
    if (antes?.por && !por) falhar(403, 'A avaliação física do profissional não pode ser mudada aqui.')
    salva = {
      id,
      data,
      ...(peso !== undefined ? { peso } : {}),
      ...(altura !== undefined ? { altura } : {}),
      ...(gordura !== undefined ? { gordura } : {}),
      circ,
      fotos: [...(antes?.fotos ?? []), ...fotos],
      ...(obs ? { obs } : {}),
      ...(por ? { por } : antes?.por ? { por: antes.por } : {}),
    }
    return [salva, ...lista.filter((m) => m.id !== id)].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 400)
  })
  return salva!
}

export async function apagarMedida(conta: string, id: string) {
  let fotos: string[] = []
  await atualizar<Medida[]>(CHAVES.medidas(conta), [], (l) => {
    const m = l.find((x) => x.id === id)
    if (!m) return l
    fotos = m.fotos
    return l.filter((x) => x.id !== id)
  })
  await Promise.all(fotos.map((f) => apagarMidia(f)))
}
