import { Vector3 } from 'three'
import { PEDAL, type Equip } from './equipamentos.ts'
import { combinar, curva, duracaoDoRitmo, faseDoRitmo, misturar, resolver, RITMO_PADRAO, type Lado, type Pose, type Ritmo, type V3 } from './esqueleto.ts'

// Os movimentos dos 43 exercícios do catálogo (seção 11 do estudo). Cada um diz o que fica em volta
// do boneco (banco, barra, máquina), o ritmo da repetição e a pose em cada instante. A maioria vai de
// uma pose A (o começo) até uma pose B (o meio da repetição: a barra no peito, a coxa paralela) e
// volta; o que anda em arco (o crucifixo, a elevação lateral, o kettlebell) é calculado ângulo a
// ângulo, para o braço não encurtar no meio do caminho; e o que não tem repetição (o burpee, a
// esteira, a bike) é um ciclo.
//
// Eixos: Y para cima, o boneco de pé olha para +Z, o lado esquerdo dele fica em +X. Metros. As
// contas de cada pose (onde fica o ombro deitado no banco, até onde o braço alcança) estão em
// docs/desenvolvimento.md; o teste test/boneco.test.ts confere que mão e pé chegam aonde a pose manda.

export type Movimento = {
  equip: Equip[]
  periodo: number // segundos de um ciclo (uma repetição, ou duas na rosca alternada)
  pose: (s: number) => Pose
  fase: (s: number) => number // 0 a 1, para os pontos de atenção (0,5 = o meio da repetição)
  parada: Pose // a pose do meio, para quem prefere sem animação
}

// ---------- Contas pequenas ----------

const RAD = Math.PI / 180
const soma = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const menos = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const vezes = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k]
const tamanho = (a: V3) => Math.hypot(a[0], a[1], a[2])
const unit = (a: V3): V3 => vezes(a, 1 / (tamanho(a) || 1))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpV = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
const suave = (t: number) => t * t * (3 - 2 * t)
const espelhoX = (a: V3): V3 => [-a[0], a[1], a[2]]
const v3 = (x: Vector3): V3 => [x.x, x.y, x.z]

// A direção (perpendicular à linha da raiz até a ponta) em que fica o meio: para o cotovelo (ou o
// joelho) cair exatamente onde a pose quer
function polo(raiz: V3, meio: V3, ponta: V3): V3 {
  const eixo = unit(menos(ponta, raiz))
  const d = menos(meio, raiz)
  const k = d[0] * eixo[0] + d[1] * eixo[1] + d[2] * eixo[2]
  return unit(menos(d, vezes(eixo, k)))
}

// Um ponto preso ao quadril ou ao peito, girado só no eixo X (o tronco inclinado para a frente ou
// deitado): as contas das poses
const girarX = (p: V3, graus: number): V3 => {
  const c = Math.cos(graus * RAD)
  const s = Math.sin(graus * RAD)
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]
}

// Os ombros (e o pescoço) de uma pose: as mãos são postas a partir deles
function ombros(p: Pose) {
  const a = resolver(p)
  return { E: v3(a.ombroE), D: v3(a.ombroD), pescoco: v3(a.pescoco) }
}

// Os braços pendurados, esticados, dos ombros (o terra e o stiff): a barra anda com o tronco e fica
// sempre na mão. `frente` é quanto a mão vai à frente do ombro (negativo: atrás).
function pendurados(p: Pose, frente: number, x = 0.24, comprimento = 0.622): Pose {
  const o = ombros(p)
  const mao = (ombro: V3, sx: number): V3 => {
    const dx = sx * x - ombro[0]
    return [sx * x, ombro[1] - Math.sqrt(comprimento * comprimento - dx * dx - frente * frente), ombro[2] + frente]
  }
  return { ...p, E: { ...p.E, mao: mao(o.E, 1) }, D: { ...p.D, mao: mao(o.D, -1) } }
}

// O lado direito é o esquerdo espelhado
function espelharLado(l: Lado): Lado {
  return {
    ...l,
    mao: l.mao && espelhoX(l.mao),
    maoRel: l.maoRel && { em: l.maoRel.em, p: espelhoX(l.maoRel.p) },
    cotovelo: l.cotovelo && espelhoX(l.cotovelo),
    palma: l.palma && espelhoX(l.palma),
    dedos: l.dedos && espelhoX(l.dedos),
    pe: espelhoX(l.pe),
    joelho: l.joelho && espelhoX(l.joelho),
    ...(l.peYaw !== undefined ? { peYaw: -l.peYaw } : {}),
  }
}
const par = (l: Lado) => ({ E: l, D: espelharLado(l) })

type PoseBase = Partial<Omit<Pose, 'E' | 'D'>> & { E: Lado; D: Lado }
const pose = (p: PoseBase): Pose => ({ quadril: [0, 0.925, 0], rotQuadril: [0, 0, 0], coluna: [0, 0, 0], cabeca: [0, 0, 0], equip: {}, ...p })

// Sobe a pose inteira (o colchonete tem 2,5 cm)
function subir(p: Pose, dy: number): Pose {
  const s = (a?: V3): V3 | undefined => a && [a[0], a[1] + dy, a[2]]
  const lado = (l: Lado): Lado => ({ ...l, mao: s(l.mao), pe: s(l.pe)! })
  return { ...p, quadril: s(p.quadril)!, E: lado(p.E), D: lado(p.D) }
}

// ---------- Jeitos de animar ----------

// Várias poses-chave, percorridas por uma curva suave (Catmull-Rom) que passa por todas: sem tranco
// nas chaves do meio
function chaves(...poses: Pose[]) {
  if (poses.length === 2) return (c: number) => misturar(poses[0], poses[1], c)
  return (c: number) => {
    const n = poses.length - 1
    const x = Math.min(n - 1e-9, Math.max(0, c * n))
    const k = Math.floor(x)
    const t = x - k
    const t2 = t * t
    const t3 = t2 * t
    const p = [poses[Math.max(0, k - 1)], poses[k], poses[k + 1], poses[Math.min(n, k + 2)]]
    return combinar(p, [(-t3 + 2 * t2 - t) / 2, (3 * t3 - 5 * t2 + 2) / 2, (-3 * t3 + 4 * t2 + t) / 2, (t3 - t2) / 2])
  }
}

// Vai de A até B no ritmo e volta (0 em A, 1 em B)
function vaiEVolta(equip: Equip[], ritmo: Ritmo, f: (c: number) => Pose): Movimento {
  return { equip, periodo: duracaoDoRitmo(ritmo), pose: (s) => f(curva(ritmo, s)), fase: (s) => faseDoRitmo(ritmo, s), parada: f(1) }
}

// Duas repetições: uma de cada lado (a rosca alternada)
function alternado(equip: Equip[], ritmo: Ritmo, f: (c: number, lado: 'E' | 'D') => Pose): Movimento {
  const d = duracaoDoRitmo(ritmo)
  return {
    equip,
    periodo: d * 2,
    pose: (s) => {
      const t = ((s % (2 * d)) + 2 * d) % (2 * d)
      return f(curva(ritmo, t % d), t < d ? 'E' : 'D')
    },
    fase: (s) => faseDoRitmo(ritmo, s),
    parada: f(1, 'E'),
  }
}

// Um ciclo sem pausa (a esteira, a bike, o polichinelo): f recebe a fração do ciclo
function ciclo(equip: Equip[], periodo: number, f: (u: number) => Pose, parada = 0.25): Movimento {
  const u = (s: number) => (((s / periodo) % 1) + 1) % 1
  return { equip, periodo, pose: (s) => f(u(s)), fase: u, parada: f(parada) }
}

// Uma sequência de poses no tempo (o burpee): cada uma com o instante em que é alcançada
function sequencia(equip: Equip[], passos: { em: number; pose: Pose }[], parada: number): Movimento {
  const total = passos[passos.length - 1].em
  const f = (s: number) => {
    const t = ((s % total) + total) % total
    let i = 0
    while (i < passos.length - 2 && passos[i + 1].em <= t) i++
    const a = passos[i]
    const b = passos[i + 1]
    return misturar(a.pose, b.pose, suave((t - a.em) / (b.em - a.em)))
  }
  return { equip, periodo: total, pose: f, fase: (s) => (((s % total) + total) % total) / total, parada: f(parada) }
}

// A subida primeiro (a rosca, a remada, a puxada): rápida, segura um instante e desce devagar
const CONCENTRICA: Ritmo = { desce: 1.1, pausaBaixo: 0.4, sobe: 2, pausaCima: 0.5 }
const SEGURA: Ritmo = { desce: 1.1, pausaBaixo: 0.9, sobe: 1.9, pausaCima: 0.5 }

// ---------- Poses que se repetem ----------

// Em pé, pés na largura do quadril, braços soltos
const PES_QUADRIL = par({ pe: [0.12, 0.075, 0.01] })

// Deitado no banco reto (supino, crucifixo, tríceps testa): o banco vai de z −0,6 a 0,6, o quadril
// em z 0,3 (os olhos embaixo da barra) e os pés no chão, por fora do banco
const NO_BANCO = { quadril: [0, 0.575, 0.3] as V3, rotQuadril: [-90, 0, 0] as V3 }
const PE_NO_CHAO_DEITADO: Lado = { pe: [0.3, 0.075, 0.74] }
const OMBRO_DEITADO: V3 = [0.19, 0.575, -0.18]

// Sentado no banco com encosto quase em pé (82°): o desenvolvimento
const SENTADO_ENCOSTO = { quadril: [0, 0.53, 0.235] as V3, rotQuadril: [-8, 0, 0] as V3 }

// A mão segurando o halter solto ao lado do corpo, presa ao peito (anda com o tronco)
const HALTER_SOLTO: Lado = { pe: [0, 0, 0], maoRel: { em: 'peito', p: [0.235, -0.65, 0.03] }, palma: [-1, 0, 0], cotovelo: [0.2, 0, -1] }
const comHalteres = (perna: Lado): Lado => ({ ...HALTER_SOLTO, ...perna })

// ---------- Os exercícios ----------

const M: Record<string, Movimento> = {}

// ===== Peito =====

M['supino-reto'] = vaiEVolta([{ tipo: 'banco', em: [0, 0, 0] }, { tipo: 'barra' }], RITMO_PADRAO, (c) =>
  pose({
    ...NO_BANCO,
    ...par({ ...PE_NO_CHAO_DEITADO, mao: lerpV([0.31, 1.18, -0.16], [0.31, 0.745, -0.075], c), cotovelo: lerpV([0.7, -0.3, 0.5], [0.6, -0.7, 0.45], c), palma: [0, 0, 1] }),
  }),
)

M['supino-inclinado-halteres'] = vaiEVolta([{ tipo: 'banco', em: [0, 0, 0], inclinacao: 35 }, { tipo: 'halteres' }], RITMO_PADRAO, (c) =>
  pose({
    quadril: [0, 0.56, 0.161],
    rotQuadril: [-55, 0, 0],
    ...par({ pe: [0.24, 0.075, 0.68], mao: lerpV([0.15, 1.42, -0.2], [0.33, 0.93, -0.16], c), cotovelo: lerpV([0.8, -0.5, 0.2], [0.6, -0.8, 0.15], c), palma: [0, 0, 1] }),
  }),
)

M['supino-declinado'] = vaiEVolta([{ tipo: 'banco', em: [0, 0, 0], inclinacao: -20 }, { tipo: 'barra' }], RITMO_PADRAO, (c) =>
  pose({
    quadril: [0, 0.584, 0.1],
    rotQuadril: [-110, 0, 0],
    // as pernas presas embaixo dos rolos, na ponta alta do banco
    ...par({ pe: [0.1, 0.24, 0.7], joelho: [0, 1, 0.5], peAngulo: 110, mao: lerpV([0.31, 1.03, -0.33], [0.31, 0.62, -0.24], c), cotovelo: lerpV([0.7, -0.3, 0.4], [0.6, -0.7, 0.3], c), palma: [0, 0, 1] }),
  }),
)

{
  // o crucifixo abre em arco: o braço (com o cotovelo um pouco dobrado, sempre igual) gira no ombro
  const braco = 0.585
  M['crucifixo-halteres'] = vaiEVolta([{ tipo: 'banco', em: [0, 0, 0] }, { tipo: 'halteres' }], RITMO_PADRAO, (c) => {
    const a = lerp(-11, 80, c) * RAD
    const dir: V3 = unit([Math.sin(a), Math.cos(a), 0.08])
    return pose({
      ...NO_BANCO,
      ...par({ ...PE_NO_CHAO_DEITADO, mao: soma(OMBRO_DEITADO, vezes(dir, braco)), cotovelo: [Math.cos(a), -Math.sin(a), 0.25], palma: [-Math.cos(a), Math.sin(a), 0] }),
    })
  })
}

{
  // o crossover: de pé entre as polias, um passo à frente, o tronco um pouco inclinado; os braços
  // descem em arco até as mãos se encontrarem na frente do quadril
  const base = pose({ quadril: [0, 0.86, 0], rotQuadril: [14, 0, 0], E: { pe: [0.12, 0.075, 0.28] }, D: { pe: [-0.12, 0.165, -0.3], pePitch: 30 } })
  const o = ombros(base)
  const aberto: V3 = unit([0.95, 0.25, -0.15])
  const fechado: V3 = unit([-0.25, -0.62, 0.75])
  const giro = (c: number): V3 => unit(lerpV(aberto, fechado, c))
  M['crossover'] = vaiEVolta([{ tipo: 'crossover', e: [0.95, 2.1, -0.2], d: [-0.95, 2.1, -0.2] }], CONCENTRICA, (c) => {
    const d = giro(c)
    return pose({
      ...base,
      E: { ...base.E, mao: soma(o.E, vezes(d, 0.575)), cotovelo: lerpV([0, 0.2, -1], [1, 0, -0.2], c), palma: lerpV([0, -0.3, 1], [-1, -0.4, 0.2], c) },
      D: { ...base.D, mao: soma(o.D, vezes(espelhoX(d), 0.575)), cotovelo: lerpV([0, 0.2, -1], [-1, 0, -0.2], c), palma: lerpV([0, -0.3, 1], [1, -0.4, 0.2], c) },
    })
  })
}

{
  // a flexão: o corpo reto gira em volta da ponta dos pés; as mãos ficam no chão, embaixo dos ombros
  const mao: Lado = { pe: [0.1, 0.21, -0.984], pePitch: 65, mao: [0.26, 0.025, 0.36], dedos: [0, 0, 1], palma: [0, -1, 0] }
  const cima = pose({ quadril: [0, 0.4435, -0.1618], rotQuadril: [74.1, 0, 0], cabeca: [-12, 0, 0], ...par({ ...mao, cotovelo: [0.4, 0.2, -0.3] }) })
  const baixo = pose({ quadril: [0, 0.2036, -0.129], rotQuadril: [90.4, 0, 0], cabeca: [-18, 0, 0], ...par({ ...mao, cotovelo: [0.6, 1, -0.45] }) })
  M['flexao'] = vaiEVolta([], RITMO_PADRAO, chaves(cima, baixo))
}

// ===== Costas =====

M['puxada-frontal'] = vaiEVolta([{ tipo: 'puxador', assento: [0, 0.47, 0], roldana: [0, 2.35, 0] }], CONCENTRICA, (c) =>
  pose({
    quadril: [0, 0.58, 0],
    rotQuadril: [lerp(-10, -18, c), 0, 0],
    cabeca: [lerp(-8, 4, c), 0, 0],
    ...par({ pe: [0.12, 0.075, 0.5], joelho: [0, 0.4, 1], mao: lerpV([0.42, 1.6, 0.0], [0.42, 1.09, 0.0], c), cotovelo: lerpV([0.6, -0.3, 0.2], [0.5, -1, -0.5], c), palma: [0, 0, 1] }),
  }),
)

M['remada-curvada'] = vaiEVolta([{ tipo: 'barra' }], CONCENTRICA, (c) =>
  pose({
    quadril: [0, 0.84, -0.13],
    rotQuadril: [50, 0, 0],
    cabeca: [-25, 0, 0],
    ...par({ pe: [0.13, 0.075, 0.12], mao: lerpV([0.24, 0.53, 0.25], [0.24, 0.835, 0.075], c), cotovelo: lerpV([0.2, 0.3, -1], [0.3, 1, -0.7], c), palma: lerpV([0, 0, -1], [0, -0.6, -0.8], c) }),
  }),
)

M['remada-unilateral'] = vaiEVolta([{ tipo: 'banco', em: [0.12, 0, -0.12] }, { tipo: 'halteres', lado: 'D' }], CONCENTRICA, (c) =>
  pose({
    quadril: [0, 0.927, -0.35],
    rotQuadril: [82, 0, 0],
    cabeca: [-12, 0, 0],
    // o joelho e a mão esquerdos no banco; a perna direita no chão e o braço direito rema
    E: { pe: [0.12, 0.51, -0.68], joelho: [0, -1, 0], peAngulo: 150, mao: [0.18, 0.4745, 0.12], dedos: [0, 0, 1], palma: [0, -1, 0], cotovelo: [0.2, 0, -1] },
    D: { pe: [-0.13, 0.075, -0.33], mao: lerpV([-0.21, 0.384, 0.13], [-0.23, 0.86, -0.16], c), cotovelo: lerpV([-0.2, 0.2, -1], [-0.25, 1, -0.5], c), palma: [1, 0, 0] },
  }),
)

M['remada-baixa'] = vaiEVolta([{ tipo: 'remada', assento: [0, 0.42, -0.05], apoio: [0, 0.3, 0.8], roldana: [0, 0.42, 0.95] }], CONCENTRICA, (c) =>
  pose({
    quadril: [0, 0.53, 0],
    rotQuadril: [lerp(14, -4, c), 0, 0],
    ...par({ pe: [0.13, 0.2, 0.735], pePitch: -110, joelho: [0, 1, 0.1], mao: lerpV([0.05, 0.78, 0.66], [0.05, 0.72, 0.15], c), cotovelo: lerpV([0.4, -0.6, -0.4], [0.3, -0.3, -1], c), palma: [-1, 0, 0] }),
  }),
)

M['barra-fixa'] = vaiEVolta([{ tipo: 'barra-fixa', altura: 2.2, z: 0.05 }], CONCENTRICA, (c) => {
  const y = lerp(1.12, 1.56, c)
  const z = lerp(-0.02, -0.12, c)
  return pose({
    quadril: [0, y, z],
    rotQuadril: [lerp(0, -8, c), 0, 0],
    cabeca: [lerp(0, -12, c), 0, 0],
    E: { pe: [0.03, y - 0.68, z - 0.26], joelho: [0, -0.2, 1], peAngulo: 115, mao: [0.32, 2.2, 0.05], cotovelo: lerpV([0.5, -0.5, 0], [0.7, -1, 0.1], c), palma: [0, 0, 1] },
    D: { pe: [-0.04, y - 0.66, z - 0.3], joelho: [0, -0.2, 1], peAngulo: 115, mao: [-0.32, 2.2, 0.05], cotovelo: lerpV([-0.5, -0.5, 0], [-0.7, -1, 0.1], c), palma: [0, 0, 1] },
  })
})

{
  // o levantamento terra: do chão até a barra passar o joelho, as costas no mesmo ângulo (os joelhos
  // saem do caminho); dali o quadril vai à frente até ficar em pé
  // (o quanto a mão vai à frente do ombro viaja junto, no canal `frente`)
  const lado: Lado = { pe: [0.13, 0.075, 0.02], joelho: [0.2, 0, 1], cotovelo: [0.3, 0, -1], palma: [0, 0, -1] }
  const chao = pose({ quadril: [0, 0.6, -0.26], rotQuadril: [59, 0, 0], cabeca: [-30, 0, 0], ...par(lado), equip: { frente: -0.05 } })
  const joelho = pose({ quadril: [0, 0.825, -0.258], rotQuadril: [55, 0, 0], cabeca: [-26, 0, 0], ...par(lado), equip: { frente: -0.035 } })
  const topo = pose({ quadril: [0, 0.925, 0], rotQuadril: [0, 0, 0], ...par(lado), equip: { frente: 0.09 } })
  const caminho = chaves(chao, joelho, topo)
  M['levantamento-terra'] = vaiEVolta([{ tipo: 'barra' }], { desce: 1.6, pausaBaixo: 0.5, sobe: 2, pausaCima: 0.6 }, (c) => {
    const p = caminho(c)
    return pendurados(p, p.equip.frente)
  })
}

// ===== Ombros =====

M['desenvolvimento-halteres'] = vaiEVolta([{ tipo: 'banco', em: [0, 0, 0], inclinacao: 82 }, { tipo: 'halteres' }], CONCENTRICA, (c) =>
  pose({
    ...SENTADO_ENCOSTO,
    ...par({ pe: [0.2, 0.075, 0.75], mao: lerpV([0.45, 1.2, 0.24], [0.19, 1.6, 0.2], c), cotovelo: lerpV([1, -0.7, 0.15], [1, -0.2, 0.1], c), palma: [0, 0, 1] }),
  }),
)

{
  const base = pose({ quadril: [0, 0.92, 0], rotQuadril: [4, 0, 0], ...par({ pe: [0.13, 0.075, 0.01] }) })
  const o = ombros(base)
  M['elevacao-lateral'] = vaiEVolta([{ tipo: 'halteres' }], CONCENTRICA, (c) => {
    const a = lerp(9, 88, c) * RAD
    const d: V3 = unit([Math.sin(a), -Math.cos(a), 0.14])
    return pose({ ...base, ...par({ ...base.E, mao: soma(o.E, vezes(d, 0.6)), cotovelo: [0, -0.35, -1], palma: [-Math.cos(a), -Math.sin(a), 0] }) })
  })
  M['elevacao-frontal'] = vaiEVolta([{ tipo: 'halteres' }], CONCENTRICA, (c) => {
    const b = lerp(-4, 90, c) * RAD
    const d: V3 = unit([-0.07, -Math.cos(b), Math.sin(b)])
    return pose({ ...base, ...par({ ...base.E, mao: soma(o.E, vezes(d, 0.61)), cotovelo: [0.6, -1, 0], palma: [0, -Math.sin(b), -Math.cos(b)] }) })
  })
}

M['face-pull'] = vaiEVolta([{ tipo: 'polia', em: [0, 1.65, 1.05], pegador: 'corda', coluna: [0, 0, 1.18] }], CONCENTRICA, (c) =>
  pose({
    quadril: [0, 0.89, 0],
    rotQuadril: [-4, 0, 0],
    E: { pe: [0.13, 0.075, 0.2], mao: lerpV([0.06, 1.5, 0.52], [0.2, 1.6, 0.1], c), cotovelo: lerpV([0.6, -0.4, -0.2], [1, 0.15, -0.5], c), palma: lerpV([0, -1, 0.2], [-0.4, 0, 1], c) },
    D: { pe: [-0.13, 0.075, -0.2], mao: lerpV([-0.06, 1.5, 0.52], [-0.2, 1.6, 0.1], c), cotovelo: lerpV([-0.6, -0.4, -0.2], [-1, 0.15, -0.5], c), palma: lerpV([0, -1, 0.2], [0.4, 0, 1], c) },
  }),
)

// ===== Bíceps =====

{
  // as roscas: o cotovelo fica parado ao lado do corpo e só o antebraço gira (γ: 0 é para baixo)
  const base = pose({ ...PES_QUADRIL })
  const o = ombros(base)
  const cotovelo = (x: number): V3 => soma(o.E, vezes(unit([x, -0.305, 0.04]), 0.31))
  const lado = (gama: number, x: number, palma: V3 | null): Lado => {
    const cot = cotovelo(x)
    const g = gama * RAD
    const mao = soma(cot, vezes(unit([0.004, -Math.cos(g), Math.sin(g)]), 0.33))
    return { ...base.E, mao, cotovelo: polo(o.E, cot, mao), ...(palma ? { palma } : {}) }
  }
  const supinada = (g: number): V3 => [0, Math.sin(g * RAD), Math.cos(g * RAD)]
  M['rosca-direta'] = vaiEVolta([{ tipo: 'barra', anilhas: 1 }], CONCENTRICA, (c) => {
    const g = lerp(8, 140, c)
    return pose({ ...base, ...par(lado(g, 0.01, supinada(g))) })
  })
  M['rosca-martelo'] = vaiEVolta([{ tipo: 'halteres' }], CONCENTRICA, (c) => pose({ ...base, ...par(lado(lerp(6, 135, c), 0.035, [-1, 0, 0])) }))
  M['rosca-alternada'] = alternado([{ tipo: 'halteres' }], CONCENTRICA, (c, quem) => {
    const g = lerp(6, 138, c)
    // a palma gira de dentro para cima na primeira metade da subida
    const giro = suave(Math.min(1, c * 1.6))
    const mexe = lado(g, 0.035, unit(lerpV([-1, 0, 0], supinada(g), giro)))
    const parado = lado(6, 0.035, [-1, 0, 0])
    return pose(quem === 'E' ? { ...base, E: mexe, D: espelharLado(parado) } : { ...base, E: parado, D: espelharLado(mexe) })
  })
}

{
  // a rosca Scott: o braço deitado no apoio inclinado (43°), o antebraço sobe de quase esticado até
  // passar da vertical
  const base = pose({ quadril: [0, 0.6, -0.1], rotQuadril: [15, 0, 0], ...par({ pe: [0.15, 0.075, 0.2] }) })
  const o = ombros(base)
  const desce: V3 = [0, -Math.sin(43 * RAD), Math.cos(43 * RAD)]
  const cot = soma(o.E, vezes(desce, 0.31))
  const normal: V3 = [0, Math.cos(43 * RAD), Math.sin(43 * RAD)]
  const apoio = menos(lerpV(o.E, cot, 0.5), vezes(normal, 0.077))
  M['rosca-scott'] = vaiEVolta([{ tipo: 'scott', apoio: [0, apoio[1], apoio[2]], assento: [0, 0.49, -0.12], angulo: 43 }, { tipo: 'barra', anilhas: 1 }], CONCENTRICA, (c) => {
    const d = lerp(-25, 100, c) * RAD
    const mao = soma(cot, vezes(unit([-0.06, Math.sin(d), Math.cos(d)]), 0.33))
    return pose({ ...base, ...par({ ...base.E, mao, cotovelo: polo(o.E, cot, mao), palma: [0, Math.cos(d), -Math.sin(d)] }) })
  })
}

// ===== Tríceps =====

{
  // na polia: o cotovelo colado ao corpo, só o antebraço desce (ε: 0 é para baixo)
  const base = pose({ quadril: [0, 0.92, 0], rotQuadril: [8, 0, 0], ...par({ pe: [0.14, 0.075, 0.02] }) })
  const o = ombros(base)
  const cot = soma(o.E, vezes(unit([0.005, -1, 0.12]), 0.31))
  const lado = (eps: number, dx: number, palma: V3): Lado => {
    const e = eps * RAD
    const mao = soma(cot, vezes(unit([dx, -Math.cos(e), Math.sin(e)]), 0.33))
    return { ...base.E, mao, cotovelo: polo(o.E, cot, mao), palma }
  }
  M['triceps-polia'] = vaiEVolta([{ tipo: 'polia', em: [0, 2.05, 0.48], pegador: 'barra', largura: 0.48, coluna: [0, 0, 0.6] }], CONCENTRICA, (c) => {
    const e = lerp(105, 4, c)
    return pose({ ...base, ...par(lado(e, -0.18, [0, -Math.sin(e * RAD), -Math.cos(e * RAD)])) })
  })
  M['triceps-corda'] = vaiEVolta([{ tipo: 'polia', em: [0, 2.05, 0.48], pegador: 'corda', coluna: [0, 0, 0.6] }], CONCENTRICA, (c) => {
    const e = lerp(100, 6, c)
    return pose({ ...base, ...par(lado(e, lerp(-0.42, 0.08, c), unit(lerpV([-1, 0, 0], [-0.6, 0, -0.8], c)))) })
  })
}

{
  // o tríceps testa: o braço parado apontando para cima (um pouco para trás), o antebraço desce até a
  // barra chegar perto da testa
  const cot = soma(OMBRO_DEITADO, vezes(unit([-0.02, Math.cos(10 * RAD), -Math.sin(10 * RAD)]), 0.31))
  M['triceps-testa'] = vaiEVolta([{ tipo: 'banco', em: [0, 0, 0] }, { tipo: 'barra', anilhas: 1 }], RITMO_PADRAO, (c) => {
    const z = lerp(8, 120, c) * RAD
    const mao = soma(cot, vezes(unit([-0.04, Math.cos(z), -Math.sin(z)]), 0.33))
    return pose({ ...NO_BANCO, ...par({ ...PE_NO_CHAO_DEITADO, mao, cotovelo: polo(OMBRO_DEITADO, cot, mao), palma: [0, Math.sin(z), Math.cos(z)] }) })
  })
}

{
  // o tríceps francês: sentado no banco, um halter nas duas mãos; os cotovelos apontam para cima e o
  // antebraço desce atrás da cabeça
  const base = pose({ quadril: [0, 0.53, 0], ...par({ pe: [0.22, 0.075, 0.45] }) })
  const o = ombros(base)
  const cot = soma(o.E, vezes(unit([-0.25, 1, 0.05]), 0.31))
  M['triceps-frances'] = vaiEVolta([{ tipo: 'banco', em: [0, 0, -0.02], giro: 90 }, { tipo: 'halter-duplo' }], RITMO_PADRAO, (c) => {
    const a = lerp(4, 150, c) * RAD
    const mao = soma(cot, vezes(unit([-0.14, Math.cos(a), -Math.sin(a)]), 0.33))
    return pose({ ...base, cabeca: [6, 0, 0], ...par({ ...base.E, mao, cotovelo: polo(o.E, cot, mao), palma: [-1, 0.15, 0] }) })
  })
}

M['mergulho-banco'] = vaiEVolta([{ tipo: 'banco', em: [0, 0, -0.27], giro: 90 }], RITMO_PADRAO, (c) =>
  pose({
    quadril: [0, lerp(0.5, 0.27, c), lerp(0.02, 0.04, c)],
    rotQuadril: [3, 0, 0],
    // as mãos na beira do banco, atrás; os calcanhares no chão, lá na frente
    ...par({ pe: [0.12, 0.09, 0.72], pePitch: -40, joelho: [0, 1, 0.2], mao: [0.2, 0.475, -0.14], dedos: [0, -0.25, 1], palma: [0, -1, 0], cotovelo: [0.2, 0, -1] }),
  }),
)

// ===== Pernas e glúteos =====

{
  // o agachamento: a barra no trapézio (presa ao peito), o quadril vai para trás e para baixo, a barra
  // fica em cima do meio do pé
  const barra: Lado = { pe: [0.17, 0.075, 0.03], peYaw: 10, joelho: [0.35, 0, 1], maoRel: { em: 'peito', p: [0.42, -0.04, -0.11] }, palma: [0, 0, 1], cotovelo: [0.2, -1, -0.5] }
  const cima = pose({ quadril: [0, 0.92, -0.02], rotQuadril: [3, 0, 0], ...par(barra) })
  const baixo = pose({ quadril: [0, 0.44, -0.15], rotQuadril: [38, 0, 0], cabeca: [-22, 0, 0], ...par({ ...barra, cotovelo: [0.2, -1, -0.1] }) })
  M['agachamento-livre'] = vaiEVolta([{ tipo: 'suporte', em: [0, 0, -0.85], altura: 1.35 }, { tipo: 'barra' }], RITMO_PADRAO, chaves(cima, baixo))
}

M['leg-press'] = vaiEVolta([{ tipo: 'leg-press', quadril: [0, 0.45, 0], encosto: 50, trilho: 45 }], RITMO_PADRAO, (c) =>
  pose({
    quadril: [0, 0.45, 0],
    rotQuadril: [-50, 0, 0],
    cabeca: [18, 0, 0],
    ...par({ pe: lerpV([0.14, 1.02, 0.6], [0.14, 0.863, 0.443], c), pePitch: -135, joelho: [0.2, 1, -0.4], mao: [0.3, 0.42, 0.02], palma: [-1, 0, 0], cotovelo: [0.3, 0, -1] }),
  }),
)

{
  // a cadeira extensora: o joelho no eixo da máquina, a canela sobe até quase esticar (κ: 0 é para baixo)
  const quadril: V3 = [0, 0.58, 0]
  const joelho: V3 = [0.1, 0.56, 0.43]
  M['cadeira-extensora'] = vaiEVolta([{ tipo: 'extensora', joelho: [0, 0.56, 0.43] }], SEGURA, (c) => {
    const k = lerp(-10, 84, c) * RAD
    const pe = soma(joelho, vezes([0, -Math.cos(k), Math.sin(k)], 0.43))
    return pose({ quadril, rotQuadril: [-5, 0, 0], ...par({ pe, joelho: polo([0.09, 0.58, 0], joelho, pe), peAngulo: 95, mao: [0.3, 0.48, 0.12], palma: [-1, 0, 0], cotovelo: [0.3, 0, -1] }) })
  })
}

{
  // a mesa flexora: deitado de bruços (o boneco virado para −Z), a canela sobe até perto do glúteo
  const joelho: V3 = [0, 0.7, 0.5]
  M['mesa-flexora'] = vaiEVolta([{ tipo: 'flexora', joelho }], CONCENTRICA, (c) => {
    const l = lerp(-3, 112, c) * RAD
    const lado = (x: number): Lado => {
      const j: V3 = [x, 0.7, 0.5]
      return { pe: soma(j, vezes([0, Math.sin(l), Math.cos(l)], 0.43)), joelho: [0, -1, 0], peAngulo: 92, mao: [x * 3, 0.52, -0.82], palma: [0, -1, 0.3], cotovelo: [x * 4, -0.3, 0.3] }
    }
    return pose({ quadril: [0, 0.76, 0.07], rotQuadril: [90, 180, 0], cabeca: [-22, 0, 0], E: lado(-0.1), D: lado(0.1) })
  })
}

M['afundo'] = vaiEVolta([{ tipo: 'halteres' }], RITMO_PADRAO, (c) =>
  pose({
    quadril: [0, lerp(0.82, 0.55, c), lerp(-0.02, -0.04, c)],
    rotQuadril: [2, 0, 0],
    E: comHalteres({ pe: [0.12, 0.075, 0.33], joelho: [0.1, 0, 1] }),
    D: espelharLado(comHalteres({ pe: [0.12, 0.185, -0.38], pePitch: 40, joelho: [0, -1, 0.35] })),
  }),
)

{
  const lado: Lado = { pe: [0.12, 0.075, 0.03], joelho: [0.15, 0, 1], cotovelo: [0.3, 0, -1], palma: [0, 0, -1] }
  const cima = pose({ quadril: [0, 0.9, 0], ...par(lado), equip: { frente: 0.09 } })
  const baixo = pose({ quadril: [0, 0.82, -0.3], rotQuadril: [75, 0, 0], cabeca: [-30, 0, 0], ...par(lado), equip: { frente: 0.0 } })
  M['stiff'] = vaiEVolta([{ tipo: 'barra' }], RITMO_PADRAO, (c) => {
    const p = misturar(cima, baixo, c)
    return pendurados(p, p.equip.frente, 0.22)
  })
}

{
  // a elevação pélvica: a parte de cima das costas parada na beira do banco; o tronco gira ali até
  // ficar reto, alinhado às coxas
  const pescoco: V3 = [0, 0.575, -0.36]
  M['elevacao-pelvica'] = vaiEVolta([{ tipo: 'banco', em: [0, 0, -0.45], giro: 90 }, { tipo: 'barra' }], { desce: 1.1, pausaBaixo: 0.7, sobe: 1.8, pausaCima: 0.4 }, (c) => {
    const t = lerp(-52, -88, c)
    const quadril = menos(pescoco, girarX([0, 0.53, 0], t))
    return pose({
      quadril,
      rotQuadril: [t, 0, 0],
      cabeca: [lerp(32, 38, c), 0, 0],
      ...par({ pe: [0.15, 0.075, 0.55], joelho: [0.1, 1, 0.3], maoRel: { em: 'quadril', p: [0.38, 0.0, 0.2] }, palma: [0, 0, -1], cotovelo: [1, 0, 0.3] }),
    })
  })
}

M['agachamento-bulgaro'] = vaiEVolta([{ tipo: 'banco', em: [0, 0, -0.75], giro: 90 }, { tipo: 'halteres' }], RITMO_PADRAO, (c) =>
  pose({
    quadril: [0, lerp(0.8, 0.5, c), -0.12],
    rotQuadril: [lerp(6, 14, c), 0, 0],
    E: comHalteres({ pe: [0.12, 0.075, 0.25], joelho: [0.1, 0, 1] }),
    // o peito do pé de trás deitado no banco
    D: espelharLado(comHalteres({ pe: [0.12, 0.5, -0.62], pePitch: 175, joelho: [0, -1, 0.3] })),
  }),
)

M['agachamento-sumo'] = vaiEVolta([{ tipo: 'kettlebell' }], RITMO_PADRAO, (c) =>
  pose({
    quadril: [0, lerp(0.88, 0.52, c), lerp(0, -0.05, c)],
    rotQuadril: [lerp(2, 14, c), 0, 0],
    ...par({ pe: [0.36, 0.075, 0.02], peYaw: 27, joelho: [0.6, 0, 0.8], maoRel: { em: 'peito', p: [0.04, -0.62, 0.1] }, palma: [0, 0, -1], cotovelo: [0.6, 0, -0.5] }),
  }),
)

{
  // a panturrilha no degrau: o pé gira em volta da planta, que fica parada na beira do degrau
  const planta = 0.15
  const tornozelo = (graus: number): V3 => {
    const t = graus * RAD
    const y = -0.075 * Math.cos(t) - 0.175 * Math.sin(t)
    const z = -0.075 * Math.sin(t) + 0.175 * Math.cos(t)
    return [0.12, 0.1 - y, planta - z]
  }
  M['panturrilha-em-pe'] = vaiEVolta([{ tipo: 'degrau', em: [0, 0.05, 0.27] }, { tipo: 'halteres' }], SEGURA, (c) => {
    const graus = lerp(-15, 35, c)
    const pe = tornozelo(graus)
    return pose({ quadril: [0, 0.925 + pe[1] - 0.075, pe[2] + 0.01], ...par(comHalteres({ pe, pePitch: graus, joelho: [0.1, 0, 1] })) })
  })
}

// ===== Abdômen =====

{
  // a prancha: parada, respirando (o tronco sobe e desce um pouquinho)
  const lado: Lado = { pe: [0.1, 0.21, -1.027], pePitch: 72, mao: [0.15, 0.017, 0.62], dedos: [0, 0, 1], palma: [0, -1, 0], cotovelo: [0, -1, -0.2] }
  const a = subir(pose({ quadril: [0, 0.3023, -0.177], rotQuadril: [83.7, 0, 0], cabeca: [-8, 0, 0], ...par(lado) }), 0.025)
  const b = subir(pose({ quadril: [0, 0.31, -0.177], rotQuadril: [83.3, 0, 0], coluna: [-1.5, 0, 0], cabeca: [-10, 0, 0], ...par(lado) }), 0.025)
  M['prancha'] = vaiEVolta([{ tipo: 'colchonete', em: [0, 0.0125, -0.3] }], { desce: 1.6, pausaBaixo: 0.4, sobe: 1.6, pausaCima: 0.4 }, chaves(a, b))
}

{
  // deitado no colchonete: o quadril e as costas no chão
  const deitado = { quadril: [0, 0.165, 0.2] as V3 }
  M['abdominal-supra'] = vaiEVolta([{ tipo: 'colchonete', em: [0, 0.0125, 0.05] }], CONCENTRICA, (c) =>
    pose({
      ...deitado,
      // a coluna dobra quase toda no alto das costas; a bacia gira um pouco para a lombar ficar no chão
      rotQuadril: [lerp(-90, -97, c), 0, 0],
      coluna: [lerp(0, 38, c), 0, 0],
      curva: 0.85,
      cabeca: [lerp(0, 12, c), 0, 0],
      ...par({ pe: [0.13, 0.1, 0.8], maoRel: { em: 'peito', p: [0.145, 0.19, 0.02] }, palma: [-1, 0, 0], cotovelo: [1, 0, 0.15] }),
    }),
  )
  M['elevacao-pernas'] = vaiEVolta([{ tipo: 'colchonete', em: [0, 0.0125, 0.15] }], CONCENTRICA, (c) => {
    const t = lerp(12, 88, c) * RAD
    const lado = (x: number): Lado => ({
      pe: [x, 0.165 + 0.845 * Math.sin(t), 0.2 + 0.845 * Math.cos(t)],
      joelho: [0, Math.cos(t), -Math.sin(t)],
      peAngulo: 100,
      mao: [x * 2.8, 0.042, 0.32],
      dedos: [0, 0, 1],
      palma: [0, -1, 0],
      cotovelo: [x * 10, 0.3, 0],
    })
    return pose({ ...deitado, rotQuadril: [-90, 0, 0], E: lado(0.09), D: lado(-0.09) })
  })
}

// ===== Funcional e cardio =====

{
  // todas as chaves dizem onde fica a mão (no mundo), para a mistura entre elas não dar salto
  // (a mão em pé também diz para onde os dedos apontam: assim ela deita no chão aos poucos)
  const NO_CHAO = { mao: [0.22, 0.017, 0.42] as V3, dedos: [0, 0, 1] as V3, palma: [0, -1, 0] as V3, cotovelo: [0.5, 0, -1] as V3 }
  const emPe = pose({ ...par({ pe: [0.15, 0.075, 0.02], joelho: [0.15, 0, 1], mao: [0.235, 0.805, 0.04], dedos: [0.05, -1, 0.05], palma: [-1, 0, 0], cotovelo: [0.2, 0, -1] }) })
  const descendo = pose({ quadril: [0, 0.62, -0.1], rotQuadril: [45, 0, 0], cabeca: [-25, 0, 0], ...par({ pe: [0.17, 0.075, 0.02], joelho: [0.4, 0, 1], mao: [0.23, 0.36, 0.33], dedos: [0, -1, 0.15], palma: [-0.6, 0, -0.8], cotovelo: [0.3, 0, -1] }) })
  const agachado = pose({ quadril: [0, 0.38, -0.12], rotQuadril: [70, 0, 0], cabeca: [-30, 0, 0], ...par({ pe: [0.2, 0.075, 0.02], joelho: [0.7, 0, 0.7], ...NO_CHAO }) })
  const pulando = pose({ quadril: [0, 0.41, -0.2], rotQuadril: [72, 0, 0], cabeca: [-25, 0, 0], ...par({ pe: [0.15, 0.3, -0.5], pePitch: 40, joelho: [0.3, -0.4, 1], ...NO_CHAO }) })
  const prancha = pose({ quadril: [0, 0.4435, -0.1418], rotQuadril: [74.1, 0, 0], cabeca: [-12, 0, 0], ...par({ pe: [0.12, 0.21, -0.964], pePitch: 65, joelho: [0.2, -1, 0.3], ...NO_CHAO, cotovelo: [0.4, 0.2, -0.3] }) })
  const subindo = pose({ quadril: [0, 0.86, -0.03], rotQuadril: [8, 0, 0], ...par({ pe: [0.15, 0.075, 0.02], joelho: [0.15, 0, 1], mao: [0.3, 1.45, 0.25], dedos: [0.1, 0.6, 0.8], palma: [-0.5, 0, 1], cotovelo: [0.5, -0.5, -1] }) })
  const salto = pose({ quadril: [0, 1.12, 0.02], ...par({ pe: [0.15, 0.3, 0.03], pePitch: 18, joelho: [0.15, 0, 1], mao: [0.21, 2.23, 0.08], dedos: [0, 1, 0], palma: [0, 0, 1], cotovelo: [0.5, 0, -1] }) })
  const chegada = pose({ quadril: [0, 0.8, -0.06], rotQuadril: [12, 0, 0], ...par({ pe: [0.15, 0.075, 0.02], joelho: [0.15, 0, 1], mao: [0.32, 1.2, 0.3], dedos: [0.1, 0.4, 0.9], palma: [-0.5, -0.5, 1], cotovelo: [0.5, -0.5, -1] }) })
  M['burpee'] = sequencia(
    [{ tipo: 'colchonete', em: [0, 0.0125, -0.3] }],
    [
      { em: 0, pose: emPe },
      { em: 0.24, pose: descendo },
      { em: 0.45, pose: agachado },
      { em: 0.62, pose: pulando },
      { em: 0.82, pose: prancha },
      { em: 1.12, pose: prancha },
      { em: 1.3, pose: pulando },
      { em: 1.5, pose: agachado },
      { em: 1.66, pose: descendo },
      { em: 1.84, pose: subindo },
      { em: 2.0, pose: salto },
      { em: 2.25, pose: chegada },
      { em: 2.7, pose: emPe },
    ].map((p) => ({ ...p, pose: subir(p.pose, 0.025) })),
    0.95,
  )
}

{
  const base = pose({ ...PES_QUADRIL })
  const o = ombros(base)
  M['polichinelo'] = ciclo(
    [],
    1,
    (u) => {
      const abre = (1 - Math.cos(2 * Math.PI * u)) / 2
      const salto = 0.07 * Math.abs(Math.sin(2 * Math.PI * u))
      const a = lerp(10, 168, abre) * RAD
      const d: V3 = unit([Math.sin(a), -Math.cos(a), 0.1])
      return pose({
        quadril: [0, 0.925 - 0.05 * abre + salto, 0],
        ...par({ pe: [0.1 + 0.27 * abre, 0.075 + salto, 0.02], pePitch: salto * 250, peYaw: 10 * abre, mao: soma(o.E, vezes(d, 0.6)), cotovelo: [0, 0, -1], palma: [-1, 0, 0.3] }),
      })
    },
    0.5,
  )
}

{
  // o kettlebell: o quadril estende com força e os braços (esticados) sobem no embalo, um pouco depois
  M['kettlebell-swing'] = vaiEVolta([{ tipo: 'kettlebell' }], { desce: 0.55, pausaBaixo: 0.08, sobe: 0.6, pausaCima: 0.12 }, (c) => {
    const t = lerp(64, -2, c)
    const quadril = lerpV([0, 0.82, -0.24], [0, 0.925, 0], c)
    const base = pose({ quadril, rotQuadril: [t, 0, 0], cabeca: [lerp(-35, 0, c), 0, 0], ...par({ pe: [0.2, 0.075, 0.05], peYaw: 10, joelho: [0.3, 0, 1] }) })
    const o = ombros(base)
    const phi = lerp(8, 95, Math.pow(c, 1.25)) * RAD
    const d = girarX([0, -Math.cos(phi), Math.sin(phi)], t)
    const mao = (ombro: V3, x: number): V3 => {
      const m = soma(ombro, vezes(d, 0.62))
      return [x, m[1], m[2]]
    }
    return pose({
      ...base,
      E: { ...base.E, mao: mao(o.E, 0.04), palma: lerpV([0, 0, -1], [0, -1, 0], c), cotovelo: [0.3, 0, -1] },
      D: { ...base.D, mao: mao(o.D, -0.04), palma: lerpV([0, 0, -1], [0, -1, 0], c), cotovelo: [-0.3, 0, -1] },
    })
  })
}

{
  // a esteira: a passada (o pé apoiado anda para trás com a lona, o outro passa pelo ar) e os braços
  // dobrados balançando ao contrário das pernas
  const lona = 0.18 + 0.075
  const pe = (u: number, x: number): Lado => {
    if (u < 0.42) {
      const k = u / 0.42
      return { pe: [x, lona, 0.22 - 0.46 * k], pePitch: -8 + 34 * k * k }
    }
    const k = (u - 0.42) / 0.58
    return { pe: [x, lona + 0.3 * Math.pow(Math.sin(Math.PI * k), 1.4) + 0.05 * Math.sin(Math.PI * Math.min(1, k * 2)), -0.24 + 0.46 * (1 - Math.cos(Math.PI * k)) / 2], pePitch: lerp(26, -8, k) + 10 * Math.sin(Math.PI * k) }
  }
  M['esteira'] = ciclo([{ tipo: 'esteira' }], 0.72, (u) => {
    const pa = (b: number) => 30 * Math.sin(2 * Math.PI * (u + b))
    // (de pé na lona, 18 cm acima do chão)
    const base = pose({ quadril: [0, 1.06 + 0.022 * Math.cos(4 * Math.PI * u), 0], rotQuadril: [7, 0, 0], coluna: [0, 7 * Math.sin(2 * Math.PI * u), 0], E: pe(u, 0.1), D: pe((u + 0.5) % 1, -0.1) })
    const o = ombros(base)
    const braco = (ombro: V3, angulo: number, x: number): Lado => {
      const a = angulo * RAD
      const cot = soma(ombro, vezes(unit([x * 0.06, -Math.cos(a), Math.sin(a)]), 0.31))
      const mao = soma(cot, vezes(unit([-x * 0.25, -Math.cos(a + 1.45), Math.sin(a + 1.45)]), 0.33))
      return { pe: [0, 0, 0], mao, cotovelo: polo(ombro, cot, mao), palma: [-x * 1, 0, 0] }
    }
    const bE = braco(o.E, pa(0.5), 1)
    const bD = braco(o.D, pa(0), -1)
    return pose({ ...base, E: { ...base.E, mao: bE.mao, cotovelo: bE.cotovelo, palma: bE.palma }, D: { ...base.D, mao: bD.mao, cotovelo: bD.cotovelo, palma: bD.palma } })
  })
}

{
  // a bike: os pedais giram em volta do eixo e o pé vai junto (a planta em cima do pedal)
  const eixo: V3 = [0, 0.36, 0.05]
  const raio = 0.17
  const pedal = new Vector3(...PEDAL)
  const pe = (giro: number, x: number): Lado => {
    const pitch = 12 + 14 * Math.sin(giro)
    const p: V3 = [x, eixo[1] + raio * Math.cos(giro), eixo[2] + raio * Math.sin(giro)]
    // o tornozelo é o pedal menos o deslocamento da planta, girado com o pé
    const t = Math.PI / 180
    const d = pedal.clone().applyAxisAngle(new Vector3(1, 0, 0), pitch * t)
    return { pe: [p[0] - d.x, p[1] - d.y, p[2] - d.z], pePitch: pitch, peYaw: 0, joelho: [0.1, 0.3, 1] }
  }
  M['bike'] = ciclo([{ tipo: 'bike', pedivela: eixo, selim: [0, 0.93, -0.3], guidao: [0, 1.1, 0.4] }], 1, (u) => {
    const g = 2 * Math.PI * u
    const lado = (x: number, giro: number): Lado => ({ ...pe(giro, x), mao: [x * 1.7, 1.1, 0.4], palma: [0, -1, 0.2], cotovelo: [x * 3, 0, -1] })
    return pose({ quadril: [0, 1.0, -0.3], rotQuadril: [35, 0, 0], cabeca: [-28, 0, 0], E: lado(0.12, g), D: lado(-0.12, g + Math.PI) })
  })
}

export const MOVIMENTOS = M

export const movimentoDe = (id: string): Movimento | undefined => M[id]
