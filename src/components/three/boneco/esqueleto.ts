import { Euler, MathUtils, Matrix4, Quaternion, Vector3 } from 'three'

// O esqueleto do boneco (seção 11 do estudo): as proporções de um adulto de 1,75 m e as contas que
// transformam uma pose (onde está o quadril, quanto o tronco inclina, onde as mãos seguram, onde os
// pés pisam) nas posições de cada articulação. Braços e pernas são resolvidos por cinemática inversa
// de dois ossos: a mão nunca solta a barra e o pé nunca escorrega.
//
// Eixos: Y para cima, o boneco de pé olha para +Z; o lado esquerdo dele fica em +X. Metros.

export const PROPORCOES = {
  quadrilMeio: 0.09, // metade da distância entre as articulações do quadril
  lombar: 0.2, // do quadril à cintura
  toracica: 0.33, // da cintura à base do pescoço
  ombroMeio: 0.19, // metade da distância entre os ombros
  ombroAbaixo: 0.05, // o ombro fica um pouco abaixo da base do pescoço
  ombroFrente: 0.0,
  pescoco: 0.1,
  cabeca: 0.115, // raio
  braco: 0.31,
  antebraco: 0.255,
  pegada: 0.075, // do punho ao meio da mão (onde a barra fica)
  coxa: 0.43,
  canela: 0.43,
  tornozelo: 0.075, // altura do tornozelo no chão
  pe: 0.25,
  calcanhar: 0.055, // do tornozelo para trás
}

export type V3 = [number, number, number]

// Um lado do corpo: a mão e o pé que a cinemática inversa persegue.
//  - mao: um ponto do mundo (a barra do supino); maoRel: um ponto preso ao peito (a barra do
//    agachamento, nas costas) ou ao quadril (a barra da elevação pélvica): o tronco anda, a mão vai junto
//  - cotovelo e joelho: para que lado a dobra aponta (uma direção, não um ponto)
//  - palma: para onde a palma olha (no mundo, ou no peito/quadril se a mão for presa a eles); sem ela,
//    a palma olha para a dobra do cotovelo, girada por maoGiro
//  - dedos: a mão espalmada (no chão, na flexão; na beira do banco, no mergulho): os dedos apontam para
//    lá e o alvo `mao` é o meio da palma
//  - pe: o tornozelo; pePitch e peYaw giram o pé no mundo (pitch positivo: a ponta desce). peAngulo
//    prende o pé à canela (90 = neutro, mais que 90 = ponta esticada), para as pernas no ar
export type Lado = {
  mao?: V3
  maoRel?: { em: 'peito' | 'quadril'; p: V3 }
  cotovelo?: V3
  palma?: V3
  dedos?: V3
  maoGiro?: number
  pe: V3
  joelho?: V3
  pePitch?: number
  peYaw?: number
  peAngulo?: number
}

// Uma pose: o quadril (posição e rotação em graus: x inclina para a frente, y gira, z tomba), o
// tronco em relação ao quadril, a cabeça em relação ao peito, e cada lado (a mão e o pé que a
// cinemática inversa persegue, com a direção do cotovelo e do joelho)
export type Pose = {
  quadril: V3
  rotQuadril: V3
  coluna: V3 // flexão (x), giro (y), inclinação lateral (z)
  curva?: number // quanto da coluna dobra no alto das costas (0,5 = meio a meio; o abdominal dobra quase tudo em cima)
  cabeca: V3
  E: Lado
  D: Lado
  equip: Record<string, number>
}

export type Articulacoes = {
  quadril: Vector3
  quadrilE: Vector3
  quadrilD: Vector3
  cintura: Vector3
  pescoco: Vector3
  cabeca: Vector3
  ombroE: Vector3
  ombroD: Vector3
  cotoveloE: Vector3
  cotoveloD: Vector3
  punhoE: Vector3
  punhoD: Vector3
  maoE: Vector3
  maoD: Vector3
  joelhoE: Vector3
  joelhoD: Vector3
  tornozeloE: Vector3
  tornozeloD: Vector3
  rotQuadril: Quaternion
  rotCintura: Quaternion
  rotPeito: Quaternion
  rotCabeca: Quaternion
  rotPeE: Quaternion
  rotPeD: Quaternion
  giroMaoE: number
  giroMaoD: number
  palmaE: Vector3 | null
  palmaD: Vector3 | null
  dedosE: Vector3 | null
  dedosD: Vector3 | null
}

const RAD = MathUtils.DEG2RAD
const quat = (graus: V3, ordem: 'XYZ' | 'YXZ' = 'YXZ') => new Quaternion().setFromEuler(new Euler(graus[0] * RAD, graus[1] * RAD, graus[2] * RAD, ordem))

const v = (a: V3) => new Vector3(a[0], a[1], a[2])

// Os dois ossos (o braço e o antebraço, a coxa e a canela): onde fica o cotovelo (ou o joelho) para a
// ponta alcançar o alvo, do lado para onde o polo aponta. Longe demais, o membro estica na direção do
// alvo.
export function doisOssos(raiz: Vector3, alvo: Vector3, l1: number, l2: number, polo: Vector3) {
  const dir = alvo.clone().sub(raiz)
  let d = dir.length()
  if (d < 1e-5) {
    dir.set(0, -1, 0)
    d = 1e-5
  }
  dir.divideScalar(d)
  const alcance = Math.min(l1 + l2 - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, d))
  const cosA = MathUtils.clamp((l1 * l1 + alcance * alcance - l2 * l2) / (2 * l1 * alcance), -1, 1)
  const senA = Math.sqrt(1 - cosA * cosA)
  // a parte do polo perpendicular à direção do membro
  const p = polo.clone().sub(dir.clone().multiplyScalar(polo.dot(dir)))
  if (p.lengthSq() < 1e-8) p.set(0, 0, 1).sub(dir.clone().multiplyScalar(dir.z))
  p.normalize()
  const meio = raiz.clone().add(dir.clone().multiplyScalar(l1 * cosA)).add(p.multiplyScalar(l1 * senA))
  const ponta = raiz.clone().add(dir.clone().multiplyScalar(alcance))
  return { meio, ponta }
}

const OMBRO_PADRAO: V3 = [0, -1, 0.15]

// A pose vira as posições das articulações (a cada quadro)
export function resolver(pose: Pose): Articulacoes {
  const P = PROPORCOES
  const quadril = v(pose.quadril)
  const rotQuadril = quat(pose.rotQuadril)
  // o tronco curva em dois pedaços (metade da flexão em cada, se a pose não disser outra coisa): a
  // coluna não dobra num ponto só
  const alto = pose.curva ?? 0.5
  const rotCintura = rotQuadril.clone().multiply(quat([pose.coluna[0] * (1 - alto), pose.coluna[1] * (1 - alto), pose.coluna[2] * (1 - alto)]))
  const rotPeito = rotCintura.clone().multiply(quat([pose.coluna[0] * alto, pose.coluna[1] * alto, pose.coluna[2] * alto]))
  const cintura = quadril.clone().add(new Vector3(0, P.lombar, 0).applyQuaternion(rotCintura))
  const pescoco = cintura.clone().add(new Vector3(0, P.toracica, 0).applyQuaternion(rotPeito))
  const rotCabeca = rotPeito.clone().multiply(quat(pose.cabeca))
  const cabeca = pescoco.clone().add(new Vector3(0, P.pescoco + P.cabeca * 0.85, 0.015).applyQuaternion(rotCabeca))
  const ombroE = pescoco.clone().add(new Vector3(P.ombroMeio, -P.ombroAbaixo, P.ombroFrente).applyQuaternion(rotPeito))
  const ombroD = pescoco.clone().add(new Vector3(-P.ombroMeio, -P.ombroAbaixo, P.ombroFrente).applyQuaternion(rotPeito))
  const quadrilE = quadril.clone().add(new Vector3(P.quadrilMeio, 0, 0).applyQuaternion(rotQuadril))
  const quadrilD = quadril.clone().add(new Vector3(-P.quadrilMeio, 0, 0).applyQuaternion(rotQuadril))

  const braco = (ombro: Vector3, lado: Lado, sinal: number) => {
    // sem alvo, o braço fica pendurado ao lado do corpo
    const preso = lado.maoRel ? (lado.maoRel.em === 'peito' ? rotPeito : rotQuadril) : null
    const alvo = lado.mao
      ? v(lado.mao)
      : lado.maoRel
        ? v(lado.maoRel.p).applyQuaternion(preso!).add(lado.maoRel.em === 'peito' ? pescoco : quadril)
        : ombro.clone().add(new Vector3(sinal * 0.05, -(P.braco + P.antebraco + P.pegada) + 0.02, 0.02).applyQuaternion(rotPeito))
    const polo = lado.cotovelo ? v(lado.cotovelo) : new Vector3(...OMBRO_PADRAO).applyQuaternion(rotPeito).add(new Vector3(sinal * 0.3, 0, -0.4).applyQuaternion(rotPeito))
    const palma = lado.palma ? v(lado.palma).applyQuaternion(preso ?? new Quaternion()).normalize() : null
    if (lado.dedos) {
      // a mão espalmada: o braço vai até o punho, e a mão deita na direção dos dedos
      const dedos = v(lado.dedos).normalize()
      const { meio, ponta } = doisOssos(ombro, alvo.clone().addScaledVector(dedos, -P.pegada), P.braco, P.antebraco, polo)
      return { cotovelo: meio, punho: ponta, mao: ponta.clone().addScaledVector(dedos, P.pegada), palma, dedos }
    }
    const { meio, ponta } = doisOssos(ombro, alvo, P.braco, P.antebraco + P.pegada, polo)
    const punho = meio.clone().lerp(ponta, P.antebraco / (P.antebraco + P.pegada))
    return { cotovelo: meio, punho, mao: ponta, palma, dedos: null }
  }
  const be = braco(ombroE, pose.E, 1)
  const bd = braco(ombroD, pose.D, -1)

  const perna = (quadrilLado: Vector3, lado: Lado, sinal: number) => {
    const polo = lado.joelho ? v(lado.joelho) : new Vector3(sinal * 0.15, 0, 1).applyQuaternion(rotQuadril)
    const { meio, ponta } = doisOssos(quadrilLado, v(lado.pe), P.coxa, P.canela, polo)
    return { joelho: meio, tornozelo: ponta, polo }
  }
  const pe = perna(quadrilE, pose.E, 1)
  const pd = perna(quadrilD, pose.D, -1)
  // o pé: o giro do quadril, a ponta um pouco para fora e o quanto a ponta sobe ou desce; ou, com a
  // perna no ar, preso à canela
  const yawQuadril = new Euler().setFromQuaternion(rotQuadril, 'YXZ').y / RAD
  const rotPe = (lado: Lado, sinal: number, perna: { joelho: Vector3; tornozelo: Vector3; polo: Vector3 }) => {
    if (lado.peAngulo === undefined) return quat([lado.pePitch ?? 0, (lado.peYaw ?? yawQuadril) + sinal * 8, 0])
    const canela = perna.tornozelo.clone().sub(perna.joelho).normalize()
    const frente = perna.polo.clone().addScaledVector(canela, -perna.polo.dot(canela))
    if (frente.lengthSq() < 1e-6) frente.set(0, 0, 1).applyQuaternion(rotQuadril).addScaledVector(canela, -canela.dot(new Vector3(0, 0, 1).applyQuaternion(rotQuadril)))
    frente.normalize()
    const a = (lado.peAngulo - 90) * RAD
    const z = frente.clone().multiplyScalar(Math.cos(a)).addScaledVector(canela, Math.sin(a))
    const y = canela.clone().multiplyScalar(-Math.cos(a)).addScaledVector(frente, Math.sin(a))
    const x = y.clone().cross(z)
    return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z))
  }

  return {
    quadril,
    quadrilE,
    quadrilD,
    cintura,
    pescoco,
    cabeca,
    ombroE,
    ombroD,
    cotoveloE: be.cotovelo,
    cotoveloD: bd.cotovelo,
    punhoE: be.punho,
    punhoD: bd.punho,
    maoE: be.mao,
    maoD: bd.mao,
    joelhoE: pe.joelho,
    joelhoD: pd.joelho,
    tornozeloE: pe.tornozelo,
    tornozeloD: pd.tornozelo,
    rotQuadril,
    rotCintura,
    rotPeito,
    rotCabeca,
    rotPeE: rotPe(pose.E, 1, pe),
    rotPeD: rotPe(pose.D, -1, pd),
    giroMaoE: pose.E.maoGiro ?? 0,
    giroMaoD: pose.D.maoGiro ?? 0,
    palmaE: be.palma,
    palmaD: bd.palma,
    dedosE: be.dedos,
    dedosD: bd.dedos,
  }
}

// ---------- Misturar poses ----------

const misturarV = (a: V3 | undefined, b: V3 | undefined, t: number): V3 | undefined => {
  if (!a) return b
  if (!b) return a
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}
const misturarN = (a: number | undefined, b: number | undefined, t: number) => (a === undefined ? b : b === undefined ? a : a + (b - a) * t)

const misturarLado = (a: Lado, b: Lado, t: number): Lado => ({
  mao: misturarV(a.mao, b.mao, t),
  maoRel: a.maoRel && b.maoRel && a.maoRel.em === b.maoRel.em ? { em: a.maoRel.em, p: misturarV(a.maoRel.p, b.maoRel.p, t)! } : t < 0.5 ? a.maoRel : b.maoRel,
  cotovelo: misturarV(a.cotovelo, b.cotovelo, t),
  palma: misturarV(a.palma, b.palma, t),
  dedos: misturarV(a.dedos, b.dedos, t),
  pe: misturarV(a.pe, b.pe, t)!,
  joelho: misturarV(a.joelho, b.joelho, t),
  // sem pitch (ou sem giro da mão) é zero: misturar com quem tem não pode dar salto
  pePitch: misturarN(a.pePitch ?? 0, b.pePitch ?? 0, t),
  peYaw: misturarN(a.peYaw, b.peYaw, t),
  peAngulo: misturarN(a.peAngulo, b.peAngulo, t),
  maoGiro: misturarN(a.maoGiro ?? 0, b.maoGiro ?? 0, t),
})

export function misturar(a: Pose, b: Pose, t: number): Pose {
  const equip: Record<string, number> = { ...a.equip }
  for (const k of Object.keys(b.equip)) equip[k] = misturarN(a.equip[k], b.equip[k], t)!
  return {
    quadril: misturarV(a.quadril, b.quadril, t)!,
    rotQuadril: misturarV(a.rotQuadril, b.rotQuadril, t)!,
    coluna: misturarV(a.coluna, b.coluna, t)!,
    curva: misturarN(a.curva, b.curva, t),
    cabeca: misturarV(a.cabeca, b.cabeca, t)!,
    E: misturarLado(a.E, b.E, t),
    D: misturarLado(a.D, b.D, t),
    equip,
  }
}

// A soma ponderada de várias poses (a curva que passa por várias poses-chave). O que falta numa pose
// vale o que está na primeira que tem.
export function combinar(poses: Pose[], pesos: number[]): Pose {
  const V = (f: (p: Pose) => V3 | undefined): V3 | undefined => {
    const base = poses.map(f).find(Boolean)
    if (!base) return undefined
    const r: V3 = [0, 0, 0]
    poses.forEach((p, i) => {
      const x = f(p) ?? base
      r[0] += x[0] * pesos[i]
      r[1] += x[1] * pesos[i]
      r[2] += x[2] * pesos[i]
    })
    return r
  }
  const N = (f: (p: Pose) => number | undefined): number | undefined => {
    const base = poses.map(f).find((x) => x !== undefined)
    if (base === undefined) return undefined
    return poses.reduce((s, p, i) => s + (f(p) ?? base) * pesos[i], 0)
  }
  const lado = (k: 'E' | 'D'): Lado => {
    const rel = poses.map((p) => p[k].maoRel).find(Boolean)
    return {
      mao: V((p) => p[k].mao),
      maoRel: rel && { em: rel.em, p: V((p) => (p[k].maoRel?.em === rel.em ? p[k].maoRel!.p : undefined))! },
      cotovelo: V((p) => p[k].cotovelo),
      palma: V((p) => p[k].palma),
      dedos: V((p) => p[k].dedos),
      maoGiro: N((p) => p[k].maoGiro ?? 0),
      pe: V((p) => p[k].pe)!,
      joelho: V((p) => p[k].joelho),
      pePitch: N((p) => p[k].pePitch ?? 0),
      peYaw: N((p) => p[k].peYaw),
      peAngulo: N((p) => p[k].peAngulo),
    }
  }
  const equip: Record<string, number> = {}
  for (const nome of new Set(poses.flatMap((p) => Object.keys(p.equip)))) equip[nome] = N((p) => p.equip[nome])!
  return {
    quadril: V((p) => p.quadril)!,
    rotQuadril: V((p) => p.rotQuadril)!,
    coluna: V((p) => p.coluna)!,
    curva: N((p) => p.curva),
    cabeca: V((p) => p.cabeca)!,
    E: lado('E'),
    D: lado('D'),
    equip,
  }
}

// Espelha uma pose (o que é do lado esquerdo vai para o direito): os exercícios unilaterais
export function espelhar(p: Pose): Pose {
  const x = (a?: V3): V3 | undefined => (a ? [-a[0], a[1], a[2]] : undefined)
  const lado = (l: Lado): Lado => ({
    ...l,
    mao: x(l.mao),
    ...(l.maoRel ? { maoRel: { em: l.maoRel.em, p: x(l.maoRel.p)! } } : {}),
    cotovelo: x(l.cotovelo),
    palma: x(l.palma),
    dedos: x(l.dedos),
    pe: x(l.pe)!,
    joelho: x(l.joelho),
    ...(l.peYaw !== undefined ? { peYaw: -l.peYaw } : {}),
  })
  return { ...p, quadril: x(p.quadril)!, rotQuadril: [p.rotQuadril[0], -p.rotQuadril[1], -p.rotQuadril[2]], coluna: [p.coluna[0], -p.coluna[1], -p.coluna[2]], cabeca: [p.cabeca[0], -p.cabeca[1], -p.cabeca[2]], E: lado(p.D), D: lado(p.E) }
}

// O ritmo da repetição: a descida (excêntrica) mais lenta, uma pausa embaixo, a subida e uma pausa
// em cima. Devolve quanto da pose B entra (0 em cima, 1 embaixo).
export type Ritmo = { desce: number; pausaBaixo: number; sobe: number; pausaCima: number }

export const RITMO_PADRAO: Ritmo = { desce: 2, pausaBaixo: 0.35, sobe: 1.1, pausaCima: 0.55 }

export const duracaoDoRitmo = (r: Ritmo) => r.desce + r.pausaBaixo + r.sobe + r.pausaCima

const suave = (t: number) => t * t * (3 - 2 * t)
const suaveSaida = (t: number) => 1 - (1 - t) * (1 - t)

export function curva(r: Ritmo, segundos: number) {
  const total = duracaoDoRitmo(r)
  const t = ((segundos % total) + total) % total
  if (t < r.desce) return suave(t / r.desce)
  if (t < r.desce + r.pausaBaixo) return 1
  if (t < r.desce + r.pausaBaixo + r.sobe) return 1 - suaveSaida((t - r.desce - r.pausaBaixo) / r.sobe)
  return 0
}

// A fase da repetição (0 a 1) para os pontos de atenção: 0,25 descendo, 0,5 embaixo, 0,75 subindo
export function faseDoRitmo(r: Ritmo, segundos: number) {
  const total = duracaoDoRitmo(r)
  const t = ((segundos % total) + total) % total
  if (t < r.desce) return (t / r.desce) * 0.45
  if (t < r.desce + r.pausaBaixo) return 0.45 + ((t - r.desce) / r.pausaBaixo) * 0.1
  if (t < r.desce + r.pausaBaixo + r.sobe) return 0.55 + ((t - r.desce - r.pausaBaixo) / r.sobe) * 0.4
  return 0.95 + ((t - r.desce - r.pausaBaixo - r.sobe) / r.pausaCima) * 0.05
}
