import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Quaternion, Vector3 } from 'three'
import { resolver, type Articulacoes, type Lado, type Pose } from '../src/components/three/boneco/esqueleto.ts'
import { MOVIMENTOS } from '../src/components/three/boneco/movimentos.ts'
import { EXERCICIOS } from '../src/shared/exercicios.ts'

// O boneco 3D de cada exercício: a mão chega na barra e o pé chega no chão (a cinemática inversa não
// estica o braço além do que ele tem), nada atravessa o chão, e o movimento não dá saltos

const AMOSTRAS = 96

// Onde a pose manda a mão (no mundo)
function alvoDaMao(l: Lado, a: Articulacoes): Vector3 | null {
  if (l.mao) return new Vector3(...l.mao)
  if (l.maoRel) {
    const rot = l.maoRel.em === 'peito' ? a.rotPeito : a.rotQuadril
    const origem = l.maoRel.em === 'peito' ? a.pescoco : a.quadril
    return new Vector3(...l.maoRel.p).applyQuaternion(rot).add(origem)
  }
  return null
}

// O ponto mais baixo do pé (a caixa do pé, do calcanhar à ponta)
function soloDoPe(tornozelo: Vector3, rot: Quaternion) {
  let menor = Infinity
  for (const x of [-0.046, 0.046])
    for (const y of [-0.075, -0.015])
      for (const z of [-0.055, 0.195]) menor = Math.min(menor, new Vector3(x, y, z).applyQuaternion(rot).add(tornozelo).y)
  return menor
}

const PONTOS: [keyof Articulacoes, number][] = [
  ['joelhoE', 0.058],
  ['joelhoD', 0.058],
  ['cotoveloE', 0.042],
  ['cotoveloD', 0.042],
  ['quadrilE', 0.07],
  ['quadrilD', 0.07],
  ['cabeca', 0.1],
]

test('todo exercício do catálogo tem o boneco', () => {
  const faltam = EXERCICIOS.filter((e) => !MOVIMENTOS[e.id]).map((e) => e.id)
  assert.deepEqual(faltam, [])
  assert.equal(Object.keys(MOVIMENTOS).length, EXERCICIOS.length)
})

test('a mão chega na barra, o pé chega no chão e nada atravessa o chão', () => {
  const problemas: string[] = []
  for (const [id, m] of Object.entries(MOVIMENTOS)) {
    const vistos = new Set<string>()
    const anotar = (texto: string) => {
      if (vistos.has(texto.split(' (')[0])) return
      vistos.add(texto.split(' (')[0])
      problemas.push(`${id}: ${texto}`)
    }
    for (let i = 0; i < AMOSTRAS; i++) {
      const s = (i / AMOSTRAS) * m.periodo
      const p: Pose = m.pose(s)
      const a = resolver(p)
      for (const k of ['E', 'D'] as const) {
        const alvo = alvoDaMao(p[k], a)
        const mao = k === 'E' ? a.maoE : a.maoD
        if (alvo && alvo.distanceTo(mao) > 0.012) anotar(`a mão ${k} não alcança (${alvo.distanceTo(mao).toFixed(3)} m em ${s.toFixed(2)} s)`)
        const pe = new Vector3(...p[k].pe)
        const tornozelo = k === 'E' ? a.tornozeloE : a.tornozeloD
        if (pe.distanceTo(tornozelo) > 0.012) anotar(`o pé ${k} não alcança (${pe.distanceTo(tornozelo).toFixed(3)} m em ${s.toFixed(2)} s)`)
        const solo = soloDoPe(tornozelo, k === 'E' ? a.rotPeE : a.rotPeD)
        if (solo < -0.012) anotar(`o pé ${k} entra no chão (${solo.toFixed(3)} m em ${s.toFixed(2)} s)`)
        const maoY = mao.y - 0.02
        if (maoY < -0.012) anotar(`a mão ${k} entra no chão (${maoY.toFixed(3)} m em ${s.toFixed(2)} s)`)
      }
      for (const [nome, raio] of PONTOS) {
        const y = (a[nome] as Vector3).y - raio
        if (y < -0.012) anotar(`${nome} entra no chão (${y.toFixed(3)} m em ${s.toFixed(2)} s)`)
      }
    }
  }
  assert.deepEqual(problemas, [])
})

test('o movimento não dá saltos', () => {
  const problemas: string[] = []
  const passo = 1 / 120
  for (const [id, m] of Object.entries(MOVIMENTOS)) {
    let antes: Articulacoes | null = null
    let pior = 0
    let onde = ''
    for (let s = 0; s <= m.periodo + 1e-9; s += passo) {
      const a = resolver(m.pose(s))
      if (antes) {
        for (const k of ['maoE', 'maoD', 'cotoveloE', 'cotoveloD', 'joelhoE', 'joelhoD', 'tornozeloE', 'tornozeloD', 'cabeca'] as const) {
          const d = a[k].distanceTo(antes[k])
          if (d > pior) {
            pior = d
            onde = `${k} em ${s.toFixed(2)} s`
          }
        }
      }
      antes = a
    }
    // 8 cm em 1/120 s é 9,6 m/s: só um salto de pose passa disso
    if (pior > 0.08) problemas.push(`${id}: ${pior.toFixed(3)} m (${onde})`)
  }
  assert.deepEqual(problemas, [])
})

test('a fase dos pontos de atenção anda de 0 a 1 e a pose parada existe', () => {
  for (const [id, m] of Object.entries(MOVIMENTOS)) {
    for (let i = 0; i < 20; i++) {
      const f = m.fase((i / 20) * m.periodo)
      assert.ok(f >= 0 && f <= 1, `${id}: fase ${f}`)
    }
    assert.ok(resolver(m.parada).cabeca.y > 0, id)
  }
})
