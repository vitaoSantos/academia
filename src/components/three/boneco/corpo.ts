import { CapsuleGeometry, Color, Group, Mesh, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3, BoxGeometry, type BufferGeometry } from 'three'
import type { Musculo } from '../../../shared/exercicios.ts'
import { PROPORCOES as P, type Articulacoes } from './esqueleto.ts'

// O corpo do boneco: um manequim (cápsulas nos membros, elipsoides no tronco e na cabeça) e os
// músculos por cima, que acendem na cor da marca: o principal forte, o secundário mais claro.

const CIMA = new Vector3(0, 1, 0)

// Uma peça que vai de uma articulação a outra (o comprimento do osso nunca muda)
function capsula(raio: number, comprimento: number, material: MeshStandardMaterial, segmentos = 10) {
  const m = new Mesh(new CapsuleGeometry(raio, Math.max(0.001, comprimento - raio * 2 * 0.2), 4, segmentos), material)
  m.castShadow = false
  return m
}

function elipsoide(r: [number, number, number], material: MeshStandardMaterial, detalhe = 16) {
  const m = new Mesh(new SphereGeometry(1, detalhe, Math.round(detalhe * 0.75)), material)
  m.scale.set(r[0], r[1], r[2])
  return m
}

const tmpA = new Vector3()
const tmpB = new Vector3()
const tmpQ = new Quaternion()

// A parte de `v` perpendicular ao eixo (normalizada); sem ela (o membro esticado), a reserva
function perpendicular(saida: Vector3, v: Vector3, eixo: Vector3, reserva: Vector3) {
  saida.copy(v).addScaledVector(eixo, -v.dot(eixo))
  if (saida.lengthSq() < 1e-6) saida.copy(reserva).addScaledVector(eixo, -reserva.dot(eixo))
  if (saida.lengthSq() < 1e-6) saida.set(1, 0, 0).addScaledVector(eixo, -eixo.x)
  return saida.normalize()
}

// Gira a peça em volta do próprio eixo até a face Z dela olhar para `alvo` (mais o giro, em graus)
const zLocal = new Vector3()
function alinharZ(m: Mesh, eixo: Vector3, alvo: Vector3, giro: number) {
  zLocal.set(0, 0, 1).applyQuaternion(m.quaternion)
  const angulo = Math.atan2(eixo.dot(zLocal.clone().cross(alvo)), zLocal.dot(alvo))
  m.quaternion.premultiply(tmpQ.setFromAxisAngle(eixo, angulo + (giro * Math.PI) / 180))
}

// Põe a peça entre a e b (o meio, e o eixo Y da peça na direção de a para b)
function entre(m: Mesh, a: Vector3, b: Vector3) {
  m.position.copy(a).add(b).multiplyScalar(0.5)
  tmpA.copy(b).sub(a).normalize()
  m.quaternion.setFromUnitVectors(CIMA, tmpA)
}

type Osso = 'braco' | 'antebraco' | 'coxa' | 'canela'
type Moldura = 'peito' | 'cintura' | 'quadril' | 'ombro'

type DefMusculo =
  | { musculo: Musculo; osso: Osso; lado: 'E' | 'D'; t: number; frente: number; lateral?: number; raios: [number, number, number] }
  | { musculo: Musculo; moldura: Moldura; lado: 'E' | 'D' | 'meio'; centro: [number, number, number]; raios: [number, number, number]; giro?: [number, number, number] }

const DOS_DOIS_LADOS = (d: DefMusculo): DefMusculo[] => {
  if ('osso' in d) return [{ ...d, lado: 'E' }, { ...d, lado: 'D' }]
  if (d.lado === 'meio') return [d]
  return [{ ...d, lado: 'E' }, { ...d, lado: 'D' }]
}

// Os músculos: posição no osso (t de 0 a 1 ao longo dele, e quanto vai para a frente) ou no tronco
const MUSCULOS: DefMusculo[] = ([
  { musculo: 'peitoral', moldura: 'peito', lado: 'E', centro: [0.085, 0.235, 0.098], raios: [0.088, 0.066, 0.038], giro: [0, 0.25, 0.25] },
  { musculo: 'deltoide-anterior', moldura: 'ombro', lado: 'E', centro: [0.004, -0.02, 0.04], raios: [0.04, 0.062, 0.032] },
  { musculo: 'deltoide-lateral', moldura: 'ombro', lado: 'E', centro: [0.034, -0.015, 0], raios: [0.03, 0.064, 0.044] },
  { musculo: 'deltoide-posterior', moldura: 'ombro', lado: 'E', centro: [0.004, -0.02, -0.04], raios: [0.04, 0.06, 0.03] },
  { musculo: 'trapezio', moldura: 'peito', lado: 'E', centro: [0.065, 0.315, -0.045], raios: [0.085, 0.045, 0.035], giro: [0, 0, -0.35] },
  { musculo: 'romboides', moldura: 'peito', lado: 'E', centro: [0.05, 0.23, -0.103], raios: [0.045, 0.065, 0.026] },
  { musculo: 'dorsal', moldura: 'peito', lado: 'E', centro: [0.13, 0.13, -0.055], raios: [0.05, 0.125, 0.06], giro: [0, 0, 0.18] },
  { musculo: 'lombar', moldura: 'cintura', lado: 'E', centro: [0.045, 0.14, -0.098], raios: [0.04, 0.095, 0.03] },
  { musculo: 'abdomen', moldura: 'cintura', lado: 'meio', centro: [0, 0.16, 0.098], raios: [0.085, 0.13, 0.032] },
  { musculo: 'obliquos', moldura: 'cintura', lado: 'E', centro: [0.122, 0.15, 0.035], raios: [0.035, 0.1, 0.06] },
  { musculo: 'gluteos', moldura: 'quadril', lado: 'E', centro: [0.078, 0.0, -0.1], raios: [0.082, 0.088, 0.055] },
  { musculo: 'biceps', osso: 'braco', lado: 'E', t: 0.55, frente: 0.032, raios: [0.034, 0.1, 0.03] },
  { musculo: 'triceps', osso: 'braco', lado: 'E', t: 0.45, frente: -0.034, raios: [0.036, 0.11, 0.032] },
  { musculo: 'antebraco', osso: 'antebraco', lado: 'E', t: 0.32, frente: 0.018, raios: [0.036, 0.09, 0.032] },
  { musculo: 'quadriceps', osso: 'coxa', lado: 'E', t: 0.52, frente: 0.048, raios: [0.062, 0.165, 0.045] },
  { musculo: 'posteriores', osso: 'coxa', lado: 'E', t: 0.5, frente: -0.045, raios: [0.055, 0.16, 0.04] },
  { musculo: 'adutores', osso: 'coxa', lado: 'E', t: 0.3, frente: 0, lateral: -0.045, raios: [0.035, 0.12, 0.045] },
  { musculo: 'panturrilha', osso: 'canela', lado: 'E', t: 0.3, frente: -0.038, raios: [0.042, 0.1, 0.04] },
] as DefMusculo[]).flatMap(DOS_DOIS_LADOS)

export type Corpo = {
  grupo: Group
  maos: { E: Mesh; D: Mesh }
  atualizar: (a: Articulacoes) => void
  acender: (principais: Musculo[], secundarios: Musculo[], cor: string, mostrar: boolean) => void
  liberar: () => void
}

export function criarCorpo(): Corpo {
  const grupo = new Group()
  const pele = new MeshStandardMaterial({ color: '#d5d8dd', roughness: 0.58, metalness: 0.04 })
  const junta = new MeshStandardMaterial({ color: '#9fa5ae', roughness: 0.5, metalness: 0.08 })
  const musculoBase = new MeshStandardMaterial({ color: '#cbcfd5', roughness: 0.6, metalness: 0.03 })
  const principal = new MeshStandardMaterial({ color: '#f5c518', roughness: 0.42, metalness: 0.05, emissive: new Color('#f5c518'), emissiveIntensity: 0.35 })
  const secundario = new MeshStandardMaterial({ color: '#f5e2a0', roughness: 0.5, metalness: 0.04, emissive: new Color('#f5c518'), emissiveIntensity: 0.12 })
  const materiais = [pele, junta, musculoBase, principal, secundario]
  const geometrias: BufferGeometry[] = []
  const add = <T extends Mesh>(m: T) => {
    grupo.add(m)
    geometrias.push(m.geometry)
    return m
  }

  // o tronco e a cabeça
  const pelve = add(elipsoide([0.172, 0.105, 0.118], pele))
  const abdomen = add(elipsoide([0.15, 0.13, 0.108], pele))
  const peito = add(elipsoide([0.185, 0.205, 0.118], pele))
  const pescoco = add(capsula(0.045, P.pescoco + 0.05, pele, 8))
  const cabeca = add(elipsoide([0.094, 0.116, 0.104], pele, 20))
  const nariz = add(elipsoide([0.018, 0.022, 0.02], junta, 8))
  // os membros
  const membro = (raio: number, comprimento: number) => add(capsula(raio, comprimento, pele))
  const bracoE = membro(0.047, P.braco)
  const bracoD = membro(0.047, P.braco)
  const antE = membro(0.039, P.antebraco)
  const antD = membro(0.039, P.antebraco)
  const coxaE = membro(0.074, P.coxa)
  const coxaD = membro(0.074, P.coxa)
  const canE = membro(0.052, P.canela)
  const canD = membro(0.052, P.canela)
  const esfera = (r: number) => add(elipsoide([r, r, r], junta, 10))
  const juntas = { ombroE: esfera(0.056), ombroD: esfera(0.056), cotE: esfera(0.042), cotD: esfera(0.042), punE: esfera(0.033), punD: esfera(0.033), joeE: esfera(0.058), joeD: esfera(0.058), torE: esfera(0.04), torD: esfera(0.04), quaE: esfera(0.07), quaD: esfera(0.07) }
  const mao = () => add(new Mesh(new BoxGeometry(0.082, 0.1, 0.034), pele))
  const maoE = mao()
  const maoD = mao()
  const pe = () => {
    const m = add(new Mesh(new BoxGeometry(0.092, 0.06, P.pe), pele))
    return m
  }
  const peE = pe()
  const peD = pe()

  // os músculos
  const musculos = MUSCULOS.map((d) => ({ d, malha: add(elipsoide(d.raios, musculoBase, 12)) }))

  const frente = new Vector3()
  const lateral = new Vector3()
  const eixo = new Vector3()
  const atualizar = (a: Articulacoes) => {
    // tronco: as três peças seguem a rotação de cada pedaço da coluna
    pelve.position.copy(new Vector3(0, 0.035, -0.01).applyQuaternion(a.rotQuadril).add(a.quadril))
    pelve.quaternion.copy(a.rotQuadril)
    abdomen.position.copy(new Vector3(0, 0.15, 0.005).applyQuaternion(a.rotCintura).add(a.quadril))
    abdomen.quaternion.copy(a.rotCintura)
    peito.position.copy(new Vector3(0, 0.19, 0.004).applyQuaternion(a.rotPeito).add(a.cintura))
    peito.quaternion.copy(a.rotPeito)
    entre(pescoco, a.pescoco, tmpB.copy(a.cabeca).lerp(a.pescoco, 0.45))
    cabeca.position.copy(a.cabeca)
    cabeca.quaternion.copy(a.rotCabeca)
    nariz.position.copy(new Vector3(0, -0.01, 0.1).applyQuaternion(a.rotCabeca).add(a.cabeca))
    // os membros e as juntas
    entre(bracoE, a.ombroE, a.cotoveloE)
    entre(bracoD, a.ombroD, a.cotoveloD)
    entre(antE, a.cotoveloE, a.punhoE)
    entre(antD, a.cotoveloD, a.punhoD)
    entre(coxaE, a.quadrilE, a.joelhoE)
    entre(coxaD, a.quadrilD, a.joelhoD)
    entre(canE, a.joelhoE, a.tornozeloE)
    entre(canD, a.joelhoD, a.tornozeloD)
    juntas.ombroE.position.copy(a.ombroE)
    juntas.ombroD.position.copy(a.ombroD)
    juntas.cotE.position.copy(a.cotoveloE)
    juntas.cotD.position.copy(a.cotoveloD)
    juntas.punE.position.copy(a.punhoE)
    juntas.punD.position.copy(a.punhoD)
    juntas.joeE.position.copy(a.joelhoE)
    juntas.joeD.position.copy(a.joelhoD)
    juntas.torE.position.copy(a.tornozeloE)
    juntas.torD.position.copy(a.tornozeloD)
    juntas.quaE.position.copy(a.quadrilE)
    juntas.quaD.position.copy(a.quadrilD)
    // a mão: na direção do antebraço (ou dos dedos, espalmada), com a palma para onde a pose mandou
    // ou para o lado da dobra do cotovelo (como na rosca), girada pelo giro da pose
    const colocarMao = (m: Mesh, punho: Vector3, ponta: Vector3, cotovelo: Vector3, ombro: Vector3, giro: number, palma: Vector3 | null) => {
      eixo.copy(ponta).sub(punho).normalize()
      m.position.copy(punho).addScaledVector(eixo, 0.05)
      m.quaternion.setFromUnitVectors(CIMA, eixo)
      if (palma) {
        perpendicular(frente, palma, eixo, tmpA.set(0, 0, 1).applyQuaternion(a.rotPeito))
        alinharZ(m, eixo, frente, 0)
        return
      }
      perpendicular(frente, tmpB.copy(ombro).sub(cotovelo), eixo, tmpA.set(0, 0, 1).applyQuaternion(a.rotPeito))
      alinharZ(m, eixo, frente, giro)
    }
    colocarMao(maoE, a.punhoE, a.maoE, a.cotoveloE, a.ombroE, a.giroMaoE, a.palmaE)
    colocarMao(maoD, a.punhoD, a.maoD, a.cotoveloD, a.ombroD, -a.giroMaoD, a.palmaD)
    // o pé: do calcanhar à ponta, a partir do tornozelo
    const colocarPe = (m: Mesh, tornozelo: Vector3, rot: Quaternion) => {
      m.quaternion.copy(rot)
      m.position.copy(new Vector3(0, -0.045, P.pe / 2 - P.calcanhar).applyQuaternion(rot).add(tornozelo))
    }
    colocarPe(peE, a.tornozeloE, a.rotPeE)
    colocarPe(peD, a.tornozeloD, a.rotPeD)

    // os músculos seguem o osso (ou o pedaço do tronco)
    for (const { d, malha } of musculos) {
      const sinal = d.lado === 'D' ? -1 : 1
      if ('osso' in d) {
        const E = sinal > 0
        const [ini, fim] =
          d.osso === 'braco' ? [E ? a.ombroE : a.ombroD, E ? a.cotoveloE : a.cotoveloD] : d.osso === 'antebraco' ? [E ? a.cotoveloE : a.cotoveloD, E ? a.punhoE : a.punhoD] : d.osso === 'coxa' ? [E ? a.quadrilE : a.quadrilD, E ? a.joelhoE : a.joelhoD] : [E ? a.joelhoE : a.joelhoD, E ? a.tornozeloE : a.tornozeloD]
        eixo.copy(fim).sub(ini).normalize()
        // a frente do osso: no braço e no antebraço, o lado da dobra do cotovelo; na coxa e na canela,
        // o contrário da dobra do joelho. Esticado, a frente do peito (ou do quadril).
        const peitoFrente = tmpA.set(0, 0, 1).applyQuaternion(d.osso === 'braco' || d.osso === 'antebraco' ? a.rotPeito : a.rotQuadril)
        if (d.osso === 'braco') perpendicular(frente, tmpB.copy(E ? a.punhoE : a.punhoD).sub(ini), eixo, peitoFrente)
        else if (d.osso === 'antebraco') perpendicular(frente, tmpB.copy(E ? a.ombroE : a.ombroD).sub(ini), eixo, peitoFrente)
        else {
          const dobra = d.osso === 'coxa' ? tmpB.copy(E ? a.tornozeloE : a.tornozeloD).sub(fim) : tmpB.copy(E ? a.quadrilE : a.quadrilD).sub(ini)
          perpendicular(frente, dobra.multiplyScalar(-1), eixo, peitoFrente)
        }
        lateral.copy(eixo).cross(frente).normalize().multiplyScalar(sinal)
        malha.position.copy(ini).lerp(fim, d.t).addScaledVector(frente, d.frente).addScaledVector(lateral, d.lateral ?? 0)
        malha.quaternion.setFromUnitVectors(CIMA, eixo)
        alinharZ(malha, eixo, frente, 0)
      } else {
        const rot = d.moldura === 'peito' || d.moldura === 'ombro' ? a.rotPeito : d.moldura === 'cintura' ? a.rotCintura : a.rotQuadril
        const origem = d.moldura === 'peito' ? a.cintura : d.moldura === 'ombro' ? (sinal > 0 ? a.ombroE : a.ombroD) : a.quadril
        const c = new Vector3(d.centro[0] * sinal, d.centro[1], d.centro[2])
        malha.position.copy(c.applyQuaternion(rot).add(origem))
        malha.quaternion.copy(rot)
        if (d.giro) malha.quaternion.multiply(tmpQ.setFromAxisAngle(new Vector3(d.giro[0], d.giro[1] * sinal, d.giro[2] * sinal).normalize(), new Vector3(...d.giro).length()))
      }
    }
  }

  const acender = (principais: Musculo[], secundarios: Musculo[], cor: string, mostrar: boolean) => {
    const c = new Color(cor)
    principal.color.copy(c)
    principal.emissive.copy(c)
    secundario.color.copy(c).lerp(new Color('#ffffff'), 0.55)
    secundario.emissive.copy(c)
    for (const { d, malha } of musculos) {
      malha.material = !mostrar ? musculoBase : principais.includes(d.musculo) ? principal : secundarios.includes(d.musculo) ? secundario : musculoBase
    }
  }

  return {
    grupo,
    maos: { E: maoE, D: maoD },
    atualizar,
    acender,
    liberar: () => {
      for (const g of geometrias) g.dispose()
      for (const m of materiais) m.dispose()
    },
  }
}
