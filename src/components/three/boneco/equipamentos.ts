import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Quaternion, SphereGeometry, TorusGeometry, Vector3, type BufferGeometry, type Object3D } from 'three'
import type { Articulacoes, V3 } from './esqueleto.ts'

// Os equipamentos (seção 11 do estudo), feitos em código como o boneco: a barra com as anilhas, os
// halteres, o kettlebell, os bancos, o suporte, as polias com o cabo e os pegadores, as máquinas
// (puxador, remada, leg press, extensora, flexora, Scott), a barra fixa, o colchonete, o degrau, a
// esteira e a bike. O que o boneco segura segue as mãos (ou os pés) a cada quadro.

export type Equip =
  | { tipo: 'barra'; anilhas?: 0 | 1 | 2 }
  | { tipo: 'halteres'; lado?: 'E' | 'D' }
  | { tipo: 'halter-duplo' } // um halter nas duas mãos (o tríceps francês)
  | { tipo: 'kettlebell' }
  | { tipo: 'banco'; em: V3; inclinacao?: number; giro?: number; comprimento?: number }
  | { tipo: 'suporte'; em: V3; altura: number; giro?: number }
  | { tipo: 'polia'; em: V3; pegador: 'barra' | 'corda' | 'triangulo' | 'd'; largura?: number; coluna?: V3 }
  | { tipo: 'crossover'; e: V3; d: V3 }
  | { tipo: 'puxador'; assento: V3; roldana: V3 }
  | { tipo: 'remada'; assento: V3; apoio: V3; roldana: V3 }
  | { tipo: 'leg-press'; quadril: V3; encosto: number; trilho: number }
  | { tipo: 'extensora'; joelho: V3 }
  | { tipo: 'flexora'; joelho: V3 }
  | { tipo: 'barra-fixa'; altura: number; z?: number }
  | { tipo: 'scott'; apoio: V3; assento: V3; angulo: number }
  | { tipo: 'colchonete'; em?: V3; giro?: number }
  | { tipo: 'degrau'; em: V3 }
  | { tipo: 'esteira' }
  | { tipo: 'bike'; pedivela: V3; selim: V3; guidao: V3 }

export type PecaEquipamento = { grupo: Group; atualizar: (a: Articulacoes, maos: { E: Object3D; D: Object3D }) => void }

export type Materiais = ReturnType<typeof materiais>

export function materiais() {
  return {
    aco: new MeshStandardMaterial({ color: '#c3c7cd', metalness: 0.92, roughness: 0.28 }),
    cromo: new MeshStandardMaterial({ color: '#e1e4e8', metalness: 1, roughness: 0.16 }),
    borracha: new MeshStandardMaterial({ color: '#1d1e22', metalness: 0.1, roughness: 0.75 }),
    estofado: new MeshStandardMaterial({ color: '#2a2c31', metalness: 0.05, roughness: 0.68 }),
    estrutura: new MeshStandardMaterial({ color: '#3f444d', metalness: 0.3, roughness: 0.58 }),
    piso: new MeshStandardMaterial({ color: '#25282e', metalness: 0.08, roughness: 0.86 }), // as bases no chão
    cabo: new MeshStandardMaterial({ color: '#16171a', metalness: 0.3, roughness: 0.5 }),
    corda: new MeshStandardMaterial({ color: '#2b2f38', metalness: 0, roughness: 0.9 }),
    tapete: new MeshStandardMaterial({ color: '#3a4152', metalness: 0, roughness: 0.92 }),
    detalhe: new MeshStandardMaterial({ color: '#f5c518', metalness: 0.2, roughness: 0.5 }),
  }
}

const CIMA = new Vector3(0, 1, 0)
const LADO = new Vector3(1, 0, 0)
const RAD = Math.PI / 180
const v = (a: V3) => new Vector3(a[0], a[1], a[2])

const cilindro = (raio: number, altura: number, mat: MeshStandardMaterial, seg = 16) => new Mesh(new CylinderGeometry(raio, raio, altura, seg), mat)
const caixa = (x: number, y: number, z: number, mat: MeshStandardMaterial) => new Mesh(new BoxGeometry(x, y, z), mat)

// Um cilindro de altura 1 esticado de a até b (o cabo da polia, as alavancas das máquinas)
function ligar(m: Mesh, a: Vector3, b: Vector3) {
  const d = b.clone().sub(a)
  const comprimento = d.length()
  m.position.copy(a).add(b).multiplyScalar(0.5)
  if (comprimento > 1e-6) m.quaternion.setFromUnitVectors(CIMA, d.normalize())
  m.scale.set(1, Math.max(comprimento, 1e-3), 1)
}

// Uma peça parada entre dois pontos (um tubo da estrutura)
function tubo(raio: number, a: Vector3, b: Vector3, mat: MeshStandardMaterial) {
  const m = cilindro(raio, 1, mat, 10)
  ligar(m, a, b)
  return m
}

const meioDasMaos = (a: Articulacoes) => a.maoE.clone().add(a.maoD).multiplyScalar(0.5)

// O que pode ficar na frente do boneco (as anilhas vistas de lado, a torre da polia) fica
// transparente quando tapa o corpo: o palco cuida disso a cada quadro. A estrutura grande (a torre,
// o suporte) também não entra no enquadramento: pode sair pela borda da tela.
const afastavel = <T extends Mesh>(m: T) => {
  m.userData.afastavel = true
  return m
}
const estrutura = <T extends Mesh>(m: T) => {
  m.userData.afastavel = true
  m.userData.estrutura = true
  return m
}

// Onde o pedal fica em relação ao tornozelo, no pé (embaixo da planta): os movimentos da bike usam
// a mesma conta para pôr o pé no pedal
export const PEDAL = new Vector3(0, -0.085, 0.09)

export function criarEquipamento(e: Equip, m: Materiais, geometrias: BufferGeometry[]): PecaEquipamento {
  const g = new Group()
  const add = <T extends Mesh>(x: T, pai: Object3D = g) => {
    pai.add(x)
    geometrias.push(x.geometry)
    return x
  }
  const parado = { grupo: g, atualizar: () => {} }
  switch (e.tipo) {
    case 'barra': {
      // a barra olímpica (encurtada para caber na tela) com as anilhas de borracha
      const barra = new Group()
      g.add(barra)
      add(cilindro(0.0135, 1.78, m.aco), barra).rotation.z = Math.PI / 2
      const n = e.anilhas ?? 2
      for (const s of [-1, 1]) {
        const luva = afastavel(add(cilindro(0.025, 0.32, m.cromo), barra))
        luva.rotation.z = Math.PI / 2
        luva.position.x = s * 0.74
        const trava = add(cilindro(0.04, 0.03, m.aco), barra)
        trava.rotation.z = Math.PI / 2
        trava.position.x = s * 0.585
        for (let i = 0; i < n; i++) {
          const raio = n === 1 ? 0.16 : i === 0 ? 0.225 : 0.16
          const anilha = afastavel(add(cilindro(raio, 0.05, m.borracha, 28), barra))
          anilha.rotation.z = Math.PI / 2
          anilha.position.x = s * (0.63 + i * 0.055)
          const aro = afastavel(add(new Mesh(new TorusGeometry(raio - 0.025, 0.006, 6, 32), m.detalhe), barra))
          aro.rotation.y = Math.PI / 2
          aro.position.x = s * (0.63 + i * 0.055 + 0.026)
        }
      }
      return {
        grupo: g,
        atualizar: (a) => {
          barra.position.copy(meioDasMaos(a))
          barra.quaternion.setFromUnitVectors(LADO, a.maoE.clone().sub(a.maoD).normalize())
        },
      }
    }
    case 'halteres':
    case 'halter-duplo': {
      const halter = () => {
        const h = new Group()
        g.add(h)
        add(cilindro(0.016, 0.14, m.cromo), h).rotation.z = Math.PI / 2
        for (const s of [-1, 1]) {
          const cabeca = add(cilindro(0.055, 0.075, m.borracha, 6), h)
          cabeca.rotation.z = Math.PI / 2
          cabeca.position.x = s * 0.105
        }
        return h
      }
      if (e.tipo === 'halter-duplo') {
        // um halter só, em pé entre as duas mãos, na direção dos antebraços
        const h = halter()
        return {
          grupo: g,
          atualizar: (a) => {
            const eixo = a.maoE.clone().sub(a.cotoveloE).add(a.maoD).sub(a.cotoveloD).normalize()
            h.position.copy(meioDasMaos(a)).addScaledVector(eixo, -0.03)
            h.quaternion.setFromUnitVectors(LADO, eixo)
          },
        }
      }
      const hE = e.lado !== 'D' ? halter() : null
      const hD = e.lado !== 'E' ? halter() : null
      const q = new Quaternion()
      const lateral = new Vector3()
      const centro = new Vector3()
      return {
        grupo: g,
        atualizar: (_a, maos) => {
          // o halter atravessa a palma (o eixo X da mão)
          for (const [h, mao] of [
            [hE, maos.E],
            [hD, maos.D],
          ] as const) {
            if (!h) continue
            mao.getWorldQuaternion(q)
            lateral.set(1, 0, 0).applyQuaternion(q)
            h.position.copy(mao.getWorldPosition(centro)).add(new Vector3(0, 0.035, 0).applyQuaternion(q))
            h.quaternion.setFromUnitVectors(LADO, lateral)
          }
        },
      }
    }
    case 'kettlebell': {
      const k = new Group()
      g.add(k)
      const bola = add(new Mesh(new SphereGeometry(0.11, 20, 16), m.borracha), k)
      bola.position.y = -0.15
      const alca = add(new Mesh(new TorusGeometry(0.07, 0.014, 8, 20, Math.PI), m.borracha), k)
      alca.position.y = -0.05
      return {
        grupo: g,
        atualizar: (a) => {
          const meio = meioDasMaos(a)
          const cot = a.cotoveloE.clone().add(a.cotoveloD).multiplyScalar(0.5)
          k.position.copy(meio)
          k.quaternion.setFromUnitVectors(CIMA, cot.sub(meio).normalize())
        },
      }
    }
    case 'banco': {
      // o banco: o estofado (reto, inclinado ou declinado) sobre os pés
      const comprimento = e.comprimento ?? 1.2
      const assento = add(caixa(0.3, 0.075, comprimento, m.estofado))
      assento.position.set(0, 0.42, 0)
      const inc = e.inclinacao ?? 0
      if (inc) {
        // o encosto: a parte da cabeça (para −Z) sobe no inclinado e desce no declinado
        assento.scale.z = 0.42
        assento.position.z = comprimento * 0.29
        const encosto = add(caixa(0.3, 0.075, comprimento * 0.62, m.estofado))
        const ang = inc * RAD
        encosto.rotation.x = ang
        encosto.position.set(0, 0.42 + Math.sin(ang) * comprimento * 0.31, comprimento * 0.08 - Math.cos(ang) * comprimento * 0.31)
        const alto = 0.42 + Math.sin(ang) * comprimento * 0.4
        const apoio = add(cilindro(0.025, Math.max(0.1, alto), m.estrutura))
        apoio.position.set(0, Math.max(0.1, alto) / 2, -comprimento * 0.35 * Math.cos(ang))
        if (inc < 0) {
          // o declinado prende as pernas: a coluna na ponta e os rolos de espuma
          const coluna = add(caixa(0.06, 0.62, 0.06, m.estrutura))
          coluna.position.set(0, 0.31, comprimento * 0.5 + 0.25)
          for (const y of [0.36, 0.6]) {
            const rolo = add(cilindro(0.05, 0.42, m.estofado))
            rolo.rotation.z = Math.PI / 2
            rolo.position.set(0, y, comprimento * 0.5 + 0.17)
          }
        }
      }
      for (const z of [-comprimento * 0.4, comprimento * 0.4]) {
        const pe = add(caixa(0.06, 0.4, 0.06, m.estrutura))
        pe.position.set(0, 0.2, z)
        const base = add(caixa(0.42, 0.04, 0.08, m.piso))
        base.position.set(0, 0.02, z)
      }
      g.position.copy(v(e.em))
      g.rotation.y = (e.giro ?? 0) * RAD
      return parado
    }
    case 'suporte': {
      for (const s of [-1, 1]) {
        const montante = estrutura(add(caixa(0.07, e.altura + 0.45, 0.07, m.estrutura)))
        montante.position.set(s * 0.56, (e.altura + 0.45) / 2, 0)
        const gancho = add(caixa(0.05, 0.05, 0.13, m.aco))
        gancho.position.set(s * 0.56, e.altura - 0.05, 0.08)
        const base = estrutura(add(caixa(0.09, 0.04, 0.7, m.piso)))
        base.position.set(s * 0.56, 0.02, 0)
      }
      const travessa = estrutura(add(caixa(1.2, 0.06, 0.06, m.estrutura)))
      travessa.position.set(0, e.altura + 0.42, 0)
      g.traverse((o) => (o as Mesh).isMesh && estrutura(o as Mesh))
      g.position.copy(v(e.em))
      g.rotation.y = (e.giro ?? 0) * RAD
      return parado
    }
    case 'polia': {
      // a coluna da máquina, a roldana, o cabo até o pegador
      const roldana = v(e.em)
      const coluna = e.coluna ? v(e.coluna) : new Vector3(roldana.x, 0, roldana.z + 0.12)
      const torre = estrutura(add(caixa(0.16, 2.3, 0.16, m.estrutura)))
      torre.position.set(coluna.x, 1.15, coluna.z)
      const base = estrutura(add(caixa(0.6, 0.05, 0.6, m.piso)))
      base.position.set(coluna.x, 0.025, coluna.z)
      estrutura(add(tubo(0.02, roldana, new Vector3(coluna.x, roldana.y, coluna.z), m.estrutura)))
      const r = add(new Mesh(new TorusGeometry(0.05, 0.016, 8, 20), m.aco))
      r.position.copy(roldana)
      r.rotation.y = Math.PI / 2
      const cabo = add(cilindro(0.005, 1, m.cabo, 6))
      const pegador = new Group()
      g.add(pegador)
      if (e.pegador === 'barra') add(cilindro(0.013, e.largura ?? 0.5, m.cromo), pegador).rotation.z = Math.PI / 2
      const cordaE = e.pegador === 'corda' ? add(cilindro(0.016, 1, m.corda, 8)) : null
      const cordaD = e.pegador === 'corda' ? add(cilindro(0.016, 1, m.corda, 8)) : null
      if (e.pegador === 'triangulo') {
        const t = add(new Mesh(new TorusGeometry(0.075, 0.012, 6, 3), m.cromo), pegador)
        t.rotation.y = Math.PI / 2
      }
      if (e.pegador === 'd') add(new Mesh(new TorusGeometry(0.06, 0.01, 6, 16), m.cromo), pegador)
      const no = new Vector3()
      return {
        grupo: g,
        atualizar: (a) => {
          const ponta = meioDasMaos(a)
          // a corda: as duas pontas nas mãos, o nó um pouco antes, na direção da roldana
          if (cordaE && cordaD) {
            no.copy(ponta).lerp(roldana, 0.14 / Math.max(0.2, ponta.distanceTo(roldana)))
            ligar(cordaE, no, a.maoE)
            ligar(cordaD, no, a.maoD)
            ligar(cabo, roldana, no)
            return
          }
          ligar(cabo, roldana, ponta)
          pegador.position.copy(ponta)
          const eixo = a.maoE.clone().sub(a.maoD)
          if (eixo.lengthSq() > 1e-4) pegador.quaternion.setFromUnitVectors(LADO, eixo.normalize())
          else pegador.quaternion.setFromUnitVectors(CIMA, roldana.clone().sub(ponta).normalize())
        },
      }
    }
    case 'crossover': {
      const pontos = [v(e.e), v(e.d)]
      for (const p of pontos) {
        const torre = estrutura(add(caixa(0.16, 2.4, 0.16, m.estrutura)))
        torre.position.set(p.x + Math.sign(p.x) * 0.12, 1.2, p.z)
        const r = add(new Mesh(new TorusGeometry(0.05, 0.016, 8, 20), m.aco))
        r.position.copy(p)
        add(tubo(0.02, p, new Vector3(p.x + Math.sign(p.x) * 0.12, p.y, p.z), m.estrutura))
      }
      const topo = estrutura(add(caixa(Math.abs(pontos[0].x - pontos[1].x) + 0.4, 0.1, 0.16, m.estrutura)))
      topo.position.set((pontos[0].x + pontos[1].x) / 2, 2.4, pontos[0].z)
      const cabos = [add(cilindro(0.005, 1, m.cabo, 6)), add(cilindro(0.005, 1, m.cabo, 6))]
      const alcas = [add(new Mesh(new TorusGeometry(0.05, 0.01, 6, 16), m.cromo)), add(new Mesh(new TorusGeometry(0.05, 0.01, 6, 16), m.cromo))]
      return {
        grupo: g,
        atualizar: (a) => {
          ligar(cabos[0], pontos[0], a.maoE)
          ligar(cabos[1], pontos[1], a.maoD)
          alcas[0].position.copy(a.maoE)
          alcas[1].position.copy(a.maoD)
          alcas[0].quaternion.setFromUnitVectors(new Vector3(0, 0, 1), a.maoE.clone().sub(a.punhoE).normalize().cross(LADO).normalize())
          alcas[1].quaternion.copy(alcas[0].quaternion)
        },
      }
    }
    case 'puxador': {
      // o puxador (puxada frontal): o banco, o apoio das coxas, a torre e a roldana lá em cima
      const s = v(e.assento)
      const banco = add(caixa(0.42, 0.08, 0.42, m.estofado))
      banco.position.copy(s)
      const coluna = add(caixa(0.07, s.y, 0.07, m.estrutura))
      coluna.position.set(s.x, s.y / 2, s.z)
      for (const x of [-0.13, 0.13]) {
        const rolo = add(cilindro(0.055, 0.2, m.estofado))
        rolo.rotation.z = Math.PI / 2
        rolo.position.set(s.x + x, s.y + 0.24, s.z + 0.3)
      }
      add(tubo(0.025, new Vector3(s.x, s.y, s.z + 0.15), new Vector3(s.x, s.y + 0.24, s.z + 0.3), m.estrutura))
      const r = v(e.roldana)
      const torre = estrutura(add(caixa(0.16, r.y + 0.15, 0.16, m.estrutura)))
      torre.position.set(r.x, (r.y + 0.15) / 2, s.z - 0.55)
      add(tubo(0.03, new Vector3(r.x, r.y + 0.05, s.z - 0.55), new Vector3(r.x, r.y + 0.05, r.z), m.estrutura))
      const roldana = add(new Mesh(new TorusGeometry(0.05, 0.016, 8, 20), m.aco))
      roldana.position.copy(r)
      roldana.rotation.y = Math.PI / 2
      const cabo = add(cilindro(0.005, 1, m.cabo, 6))
      // a barra longa com as pontas dobradas
      const barra = new Group()
      g.add(barra)
      add(cilindro(0.014, 1.0, m.cromo), barra).rotation.z = Math.PI / 2
      for (const sx of [-1, 1]) {
        const ponta = add(cilindro(0.014, 0.22, m.cromo), barra)
        ponta.position.set(sx * 0.57, -0.05, 0)
        ponta.rotation.z = sx * 1.1
      }
      return {
        grupo: g,
        atualizar: (a) => {
          const meio = meioDasMaos(a)
          ligar(cabo, r, meio)
          barra.position.copy(meio)
          barra.quaternion.setFromUnitVectors(LADO, a.maoE.clone().sub(a.maoD).normalize())
        },
      }
    }
    case 'remada': {
      // a remada baixa: o banco comprido, o apoio dos pés e a polia embaixo, na frente
      const s = v(e.assento)
      const banco = add(caixa(0.36, 0.08, 1.0, m.estofado))
      banco.position.set(s.x, s.y, s.z + 0.15)
      const viga = add(caixa(0.12, 0.08, 1.9, m.piso))
      viga.position.set(s.x, 0.04, s.z + 0.55)
      for (const z of [s.z - 0.25, s.z + 0.45]) {
        const pe = add(caixa(0.06, s.y, 0.06, m.estrutura))
        pe.position.set(s.x, s.y / 2, z)
      }
      const ap = v(e.apoio)
      const apoio = add(caixa(0.5, 0.36, 0.04, m.estrutura))
      apoio.position.copy(ap)
      apoio.rotation.x = -0.35
      const r = v(e.roldana)
      const torre = estrutura(add(caixa(0.18, 2.1, 0.18, m.estrutura)))
      torre.position.set(r.x, 1.05, r.z + 0.16)
      const roldana = add(new Mesh(new TorusGeometry(0.05, 0.016, 8, 20), m.aco))
      roldana.position.copy(r)
      roldana.rotation.y = Math.PI / 2
      const cabo = add(cilindro(0.005, 1, m.cabo, 6))
      const triangulo = add(new Mesh(new TorusGeometry(0.075, 0.012, 6, 3), m.cromo))
      return {
        grupo: g,
        atualizar: (a) => {
          const meio = meioDasMaos(a)
          ligar(cabo, r, meio)
          triangulo.position.copy(meio)
          triangulo.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), LADO)
          triangulo.rotateZ(Math.PI / 2)
        },
      }
    }
    case 'leg-press': {
      // o leg press 45°: o banco reclinado na inclinação do tronco, os trilhos e a plataforma, que anda
      // com os pés
      const q = v(e.quadril)
      const inc = e.encosto * RAD
      const sobe = new Vector3(0, Math.cos(inc), -Math.sin(inc)) // a direção do tronco
      const normal = new Vector3(0, Math.sin(inc), Math.cos(inc)) // a frente do tronco
      const encosto = add(caixa(0.5, 0.08, 0.8, m.estofado))
      encosto.position.copy(q).addScaledVector(sobe, 0.32).addScaledVector(normal, -0.16)
      encosto.quaternion.setFromUnitVectors(new Vector3(0, 0, -1), sobe)
      const assento = add(caixa(0.5, 0.08, 0.4, m.estofado))
      assento.position.copy(q).add(new Vector3(0, -0.13, 0.1))
      assento.rotation.x = -0.25
      const trilho = new Vector3(0, Math.sin(e.trilho * RAD), Math.cos(e.trilho * RAD))
      const base = add(caixa(0.8, 0.08, 2.0, m.piso))
      base.position.set(q.x, 0.04, q.z + 0.55)
      const pe = add(caixa(0.5, q.y - 0.17, 0.12, m.estrutura))
      pe.position.set(q.x, (q.y - 0.17) / 2, q.z)
      const plataforma = new Group()
      g.add(plataforma)
      add(caixa(0.62, 0.62, 0.05, m.estrutura), plataforma)
      for (const s of [-1, 1]) {
        const pino = afastavel(add(cilindro(0.025, 0.24, m.aco), plataforma))
        pino.rotation.z = Math.PI / 2
        pino.position.set(s * 0.42, 0.05, -0.08)
        for (let i = 0; i < 2; i++) {
          const anilha = afastavel(add(cilindro(0.2, 0.04, m.borracha, 24), plataforma))
          anilha.rotation.z = Math.PI / 2
          anilha.position.set(s * (0.36 + i * 0.05), 0.05, -0.08)
        }
      }
      plataforma.quaternion.setFromUnitVectors(new Vector3(0, 0, -1), trilho)
      const trilhos = [-0.34, 0.34].map((x) => ({ x, t: add(cilindro(0.025, 1, m.aco)) }))
      // as alças do lado do banco
      for (const s of [-1, 1]) add(tubo(0.016, new Vector3(q.x + s * 0.3, q.y - 0.03, q.z - 0.12), new Vector3(q.x + s * 0.3, q.y - 0.03, q.z + 0.16), m.aco))
      const acima = new Vector3(0, trilho.z, -trilho.y) // na plataforma, a direção da ponta dos pés
      return {
        grupo: g,
        atualizar: (a) => {
          // a plataforma encosta na sola (7,5 cm do tornozelo) e anda no trilho
          const pes = a.tornozeloE.clone().add(a.tornozeloD).multiplyScalar(0.5)
          plataforma.position.copy(pes).addScaledVector(trilho, 0.1).addScaledVector(acima, 0.06)
          for (const { x, t } of trilhos) {
            const meio = plataforma.position.clone().addScaledVector(trilho, 0.07).setX(q.x + x)
            ligar(t, meio.clone().addScaledVector(trilho, -0.75), meio.clone().addScaledVector(trilho, 0.55))
          }
        },
      }
    }
    case 'extensora':
    case 'flexora': {
      const joelho = v(e.joelho)
      const deitado = e.tipo === 'flexora'
      if (deitado) {
        // a mesa flexora: o banco com o quadril um pouco mais alto, o apoio das mãos lá na frente
        const banco = add(caixa(0.44, 0.08, 1.35, m.estofado))
        banco.position.set(joelho.x, joelho.y - 0.1, joelho.z - 0.72)
        banco.rotation.x = 0.07
        const pegador = add(cilindro(0.016, 0.62, m.aco))
        pegador.rotation.z = Math.PI / 2
        pegador.position.set(joelho.x, joelho.y - 0.18, joelho.z - 1.32)
        for (const z of [joelho.z - 1.2, joelho.z - 0.25]) {
          const pe = add(caixa(0.08, joelho.y - 0.14, 0.08, m.estrutura))
          pe.position.set(joelho.x, (joelho.y - 0.14) / 2, z)
        }
      } else {
        // a cadeira extensora: o assento, o encosto atrás das costas e as alças do lado
        const assento = add(caixa(0.46, 0.09, 0.5, m.estofado))
        assento.position.set(joelho.x, joelho.y - 0.1, joelho.z - 0.26)
        const encosto = add(caixa(0.46, 0.62, 0.09, m.estofado))
        encosto.position.set(joelho.x, joelho.y + 0.3, joelho.z - 0.63)
        encosto.rotation.x = -0.1
        const pe = add(caixa(0.1, joelho.y - 0.14, 0.1, m.estrutura))
        pe.position.set(joelho.x, (joelho.y - 0.14) / 2, joelho.z - 0.3)
        for (const s of [-1, 1]) add(tubo(0.016, new Vector3(joelho.x + s * 0.3, joelho.y - 0.08, joelho.z - 0.45), new Vector3(joelho.x + s * 0.3, joelho.y - 0.08, joelho.z - 0.1), m.aco))
      }
      const pivo = new Vector3(joelho.x + 0.3, joelho.y, joelho.z)
      const eixoMaquina = add(cilindro(0.035, 0.12, m.aco))
      eixoMaquina.rotation.z = Math.PI / 2
      eixoMaquina.position.copy(pivo)
      const torre = estrutura(add(caixa(0.12, joelho.y, 0.12, m.estrutura)))
      torre.position.set(pivo.x + 0.08, joelho.y / 2, pivo.z)
      const alavanca = add(cilindro(0.02, 1, m.aco))
      const rolo = add(cilindro(0.05, 0.4, m.estofado))
      rolo.rotation.z = Math.PI / 2
      const ponta = new Vector3()
      return {
        grupo: g,
        atualizar: (a) => {
          const tornozelos = a.tornozeloE.clone().add(a.tornozeloD).multiplyScalar(0.5)
          const joelhos = a.joelhoE.clone().add(a.joelhoD).multiplyScalar(0.5)
          const canela = tornozelos.clone().sub(joelhos).normalize()
          // o lado da ponta do pé: o rolo da extensora fica ali (na frente da canela); o da flexora, atrás
          const dedos = new Vector3(0, 0, 1).applyQuaternion(a.rotPeE)
          dedos.addScaledVector(canela, -dedos.dot(canela)).normalize()
          rolo.position.copy(tornozelos).addScaledVector(dedos, deitado ? -0.1 : 0.1).addScaledVector(canela, -0.03)
          ligar(alavanca, pivo, ponta.copy(rolo.position).setX(pivo.x))
        },
      }
    }
    case 'barra-fixa': {
      const z = e.z ?? 0.05
      const barra = add(cilindro(0.016, 1.3, m.cromo))
      barra.rotation.z = Math.PI / 2
      barra.position.set(0, e.altura, z)
      for (const s of [-1, 1]) {
        const coluna = estrutura(add(caixa(0.07, e.altura + 0.1, 0.07, m.estrutura)))
        coluna.position.set(s * 0.65, (e.altura + 0.1) / 2, z)
        const base = estrutura(add(caixa(0.09, 0.04, 0.9, m.piso)))
        base.position.set(s * 0.65, 0.02, z)
      }
      return parado
    }
    case 'scott': {
      // o banco Scott: o apoio inclinado dos braços e o assento
      const ap = v(e.apoio)
      const apoio = add(caixa(0.56, 0.06, 0.34, m.estofado))
      apoio.position.copy(ap)
      apoio.rotation.x = e.angulo * RAD
      const as = v(e.assento)
      const assento = add(caixa(0.4, 0.08, 0.36, m.estofado))
      assento.position.copy(as)
      add(tubo(0.035, new Vector3(as.x, 0, as.z), new Vector3(as.x, as.y, as.z), m.estrutura))
      add(tubo(0.035, new Vector3(ap.x, 0, ap.z + 0.15), new Vector3(ap.x, ap.y - 0.05, ap.z + 0.05), m.estrutura))
      const base = add(caixa(0.5, 0.04, Math.abs(ap.z - as.z) + 0.5, m.piso))
      base.position.set(as.x, 0.02, (ap.z + as.z) / 2)
      return parado
    }
    case 'colchonete': {
      const tapete = add(caixa(0.62, 0.025, 1.85, m.tapete))
      tapete.position.copy(v(e.em ?? [0, 0.0125, 0]))
      tapete.rotation.y = (e.giro ?? 0) * RAD
      return parado
    }
    case 'degrau': {
      const d = add(caixa(0.7, 0.1, 0.32, m.estrutura))
      d.position.copy(v(e.em))
      return parado
    }
    case 'esteira': {
      const base = add(caixa(0.78, 0.16, 1.8, m.piso))
      base.position.set(0, 0.08, 0.05)
      const lona = add(caixa(0.56, 0.02, 1.55, m.borracha))
      lona.position.set(0, 0.17, 0.05)
      for (const s of [-1, 1]) {
        const coluna = estrutura(add(caixa(0.05, 1.05, 0.05, m.estrutura)))
        coluna.position.set(s * 0.36, 0.6, 0.85)
        const corrimao = add(cilindro(0.02, 0.6, m.aco))
        corrimao.rotation.x = Math.PI / 2
        corrimao.position.set(s * 0.36, 1.1, 0.58)
      }
      const painel = estrutura(add(caixa(0.7, 0.2, 0.08, m.estrutura)))
      painel.position.set(0, 1.18, 0.88)
      painel.rotation.x = -0.4
      return parado
    }
    case 'bike': {
      const c = v(e.pedivela)
      const s = v(e.selim)
      const gd = v(e.guidao)
      const selim = add(caixa(0.16, 0.05, 0.26, m.estofado))
      selim.position.copy(s)
      add(tubo(0.025, s.clone().add(new Vector3(0, -0.03, 0)), c, m.aco))
      add(tubo(0.03, c, new Vector3(c.x, 0.05, c.z - 0.3), m.estrutura))
      add(tubo(0.03, c, new Vector3(gd.x, gd.y - 0.08, gd.z - 0.05), m.estrutura))
      const guidao = add(cilindro(0.016, 0.44, m.aco))
      guidao.rotation.z = Math.PI / 2
      guidao.position.copy(gd)
      const volante = add(cilindro(0.23, 0.05, m.cromo, 32))
      volante.rotation.z = Math.PI / 2
      volante.position.set(c.x, 0.3, c.z + 0.38)
      add(tubo(0.03, new Vector3(c.x, 0.3, c.z + 0.38), new Vector3(c.x, 0.05, c.z + 0.45), m.estrutura))
      const base = add(caixa(0.5, 0.05, 1.15, m.piso))
      base.position.set(c.x, 0.025, c.z)
      const eixo = add(cilindro(0.04, 0.1, m.aco))
      eixo.rotation.z = Math.PI / 2
      eixo.position.copy(c)
      const pedivela = [add(cilindro(0.012, 1, m.aco)), add(cilindro(0.012, 1, m.aco))]
      const pedais = [add(caixa(0.1, 0.02, 0.07, m.borracha)), add(caixa(0.1, 0.02, 0.07, m.borracha))]
      return {
        grupo: g,
        atualizar: (a) => {
          // o pedal fica embaixo da planta do pé (um pouco à frente e abaixo do tornozelo)
          ;[a.tornozeloE, a.tornozeloD].forEach((t, i) => {
            const rot = i === 0 ? a.rotPeE : a.rotPeD
            const pedal = t.clone().add(PEDAL.clone().applyQuaternion(rot))
            pedais[i].position.copy(pedal)
            pedais[i].quaternion.copy(rot)
            const x = c.x + (i === 0 ? 0.1 : -0.1)
            ligar(pedivela[i], new Vector3(x, c.y, c.z), new Vector3(x, pedal.y, pedal.z))
          })
        },
      }
    }
  }
}
