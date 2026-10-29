import {
  Box3,
  CanvasTexture,
  CircleGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  NeutralToneMapping,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Ray,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  DirectionalLight,
  HemisphereLight,
  type BufferGeometry,
  type MeshStandardMaterial,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { EXERCICIO, type Camera } from '../../../shared/exercicios.ts'
import { criarCorpo } from './corpo.ts'
import { criarEquipamento, materiais, type PecaEquipamento } from './equipamentos.ts'
import { resolver, type Articulacoes } from './esqueleto.ts'
import { MOVIMENTOS, type Movimento } from './movimentos.ts'

// O palco do boneco (seção 11 do estudo): uma cena só, com o chão de estúdio, a luz, o boneco e o
// equipamento do exercício. A câmera enquadra o movimento inteiro (o que o corpo e o equipamento
// ocupam durante a repetição) e dá para girar com o dedo e aproximar. Desenha só quando está na tela
// e a aba está aberta; parado e sem ninguém mexendo, não desenha nada.

export type OpcoesPalco = {
  canvas: HTMLCanvasElement
  cor: string
  reduzido: boolean // "movimento reduzido" no sistema: o boneco fica parado no meio da repetição
  interativo?: boolean // girar com o dedo (no card da landing, não)
}

export type Palco = {
  mostrar: (id: string, camera?: Camera) => void
  camera: (c: Camera) => void
  velocidade: (v: number) => void
  pausar: (p: boolean) => void
  musculos: (mostrar: boolean) => void
  cor: (c: string) => void
  aoFase: (f: ((fase: number) => void) | null) => void
  aoTempo: (f: ((fracao: number) => void) | null) => void // quanto do ciclo já foi (a régua do laboratório)
  instante: (fracao: number) => void // para o boneco num ponto do ciclo
  liberar: () => void
}

// De onde a câmera olha (a direção, antes de afastar): o boneco de pé olha para +Z
const DIRECOES: Record<Camera, Vector3> = {
  frente: new Vector3(0.05, 0.16, 1),
  lado: new Vector3(-1, 0.14, 0.12),
  'tres-quartos': new Vector3(-0.78, 0.36, 0.9),
  cima: new Vector3(-0.35, 1.25, 0.6),
  costas: new Vector3(0.12, 0.22, -1),
}

const FOV = 30
const CIMA_MUNDO = new Vector3(0, 1, 0)

// O chão: um disco claro no meio que some nas bordas, com um quadriculado fino (o piso da academia)
function texturaDoChao() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  const centro = g.createRadialGradient(256, 256, 0, 256, 256, 256)
  centro.addColorStop(0, 'rgba(255,255,255,0.16)')
  centro.addColorStop(0.55, 'rgba(255,255,255,0.07)')
  centro.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = centro
  g.fillRect(0, 0, 512, 512)
  // as linhas a cada 50 cm (o disco tem 6 m), mais fracas para fora
  for (let i = 1; i < 12; i++) {
    const p = (i / 12) * 512
    for (const [x0, y0, x1, y1] of [
      [p, 0, p, 512],
      [0, p, 512, p],
    ]) {
      const linha = g.createLinearGradient(x0, y0, x1, y1)
      linha.addColorStop(0, 'rgba(255,255,255,0)')
      linha.addColorStop(0.5, 'rgba(255,255,255,0.07)')
      linha.addColorStop(1, 'rgba(255,255,255,0)')
      g.strokeStyle = linha
      g.lineWidth = 1.2
      g.beginPath()
      g.moveTo(x0, y0)
      g.lineTo(x1, y1)
      g.stroke()
    }
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

// A sombra embaixo do boneco: uma mancha escura e macia (mais barata que sombra de verdade)
function texturaDaSombra() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  r.addColorStop(0, 'rgba(0,0,0,0.55)')
  r.addColorStop(0.5, 'rgba(0,0,0,0.25)')
  r.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 128, 128)
  return new CanvasTexture(c)
}

const PONTOS_DO_CORPO: (keyof Articulacoes)[] = ['cabeca', 'pescoco', 'quadril', 'maoE', 'maoD', 'cotoveloE', 'cotoveloD', 'joelhoE', 'joelhoD', 'tornozeloE', 'tornozeloD', 'ombroE', 'ombroD']

export function criarPalco({ canvas, cor, reduzido, interativo = true }: OpcoesPalco): Palco {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = SRGBColorSpace
  // o tom neutro não lava a cor da marca (o amarelo continua amarelo)
  renderer.toneMapping = NeutralToneMapping
  renderer.toneMappingExposure = 1
  renderer.setClearColor(0x000000, 0)

  const cena = new Scene()
  const pmrem = new PMREMGenerator(renderer)
  const ambiente = new RoomEnvironment()
  cena.environment = pmrem.fromScene(ambiente, 0.04).texture
  cena.environmentIntensity = 0.42
  ambiente.traverse((o) => (o as Mesh).geometry?.dispose())

  // a luz anda com a câmera: de qualquer lado que se olhe, o boneco tem a luz principal do alto à
  // esquerda (o volume dos músculos aparece) e o contorno de trás o separa do fundo escuro
  const camera = new PerspectiveCamera(FOV, 1, 0.05, 60)
  cena.add(camera)
  const mira = new Object3D()
  mira.position.set(0, 0, -4)
  camera.add(mira)
  const principal = new DirectionalLight('#fff4e6', 2.3)
  principal.position.set(-2.2, 2.6, 0.6)
  principal.target = mira
  const preenche = new DirectionalLight('#d7e4ff', 0.55)
  preenche.position.set(2.6, 0.4, 0.4)
  preenche.target = mira
  const contorno = new DirectionalLight('#ffffff', 1.5)
  contorno.position.set(0.8, 2.4, -7.5)
  contorno.target = mira
  camera.add(principal, preenche, contorno)
  cena.add(new HemisphereLight('#ffffff', '#2a2c33', 0.35))
  const controles = new OrbitControls(camera, canvas)
  controles.enableDamping = true
  controles.dampingFactor = 0.08
  controles.enablePan = false
  controles.maxPolarAngle = Math.PI * 0.53
  controles.minDistance = 1.2
  controles.maxDistance = 9
  controles.enabled = interativo
  controles.rotateSpeed = 0.7
  // no celular, arrastar na vertical rola a página; na horizontal (ou com dois dedos) mexe no boneco
  canvas.style.touchAction = interativo ? 'pan-y' : 'auto'

  // o chão e a sombra
  const texChao = texturaDoChao()
  const chao = new Mesh(new CircleGeometry(3, 64), new MeshBasicMaterial({ map: texChao, transparent: true, depthWrite: false }))
  chao.rotation.x = -Math.PI / 2
  chao.renderOrder = -2
  cena.add(chao)
  const texSombra = texturaDaSombra()
  const sombra = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: texSombra, transparent: true, depthWrite: false }))
  sombra.rotation.x = -Math.PI / 2
  sombra.position.y = 0.002
  sombra.renderOrder = -1
  cena.add(sombra)

  const corpo = criarCorpo()
  cena.add(corpo.grupo)
  const mats = materiais()
  let pecas: PecaEquipamento[] = []
  let geometriasEquip: BufferGeometry[] = []
  const grupoEquip = new Group()
  cena.add(grupoEquip)
  // as peças que ficam transparentes quando tapam o corpo (cada uma com o material dela)
  let afastaveis: { malha: Mesh; material: MeshStandardMaterial; opacidade: number }[] = []
  // os pontos do corpo que não podem sumir atrás do equipamento
  const alvos = Array.from({ length: 6 }, () => new Vector3())

  const estado = {
    id: '',
    mov: null as Movimento | null,
    vista: 'tres-quartos' as Camera,
    velocidade: 1,
    pausado: reduzido,
    musculos: true,
    cor,
    relogio: 0, // o tempo do movimento (anda com a velocidade)
    alvo: new Vector3(0, 0.9, 0),
    distancia: 4,
    caixa: new Box3(),
    voando: 0, // a câmera indo para a vista nova (1 → 0)
    deCamera: new Vector3(),
    deAlvo: new Vector3(),
    paraCamera: new Vector3(),
    aoFase: null as ((f: number) => void) | null,
    aoTempo: null as ((f: number) => void) | null,
    visivel: true,
    ultimo: performance.now(),
    precisa: true, // desenhar o próximo quadro mesmo parado
  }

  function posicionar(a: Articulacoes) {
    corpo.atualizar(a)
    for (const p of pecas) p.atualizar(a, corpo.maos)
    alvos[0].copy(a.quadril).add(a.pescoco).multiplyScalar(0.5)
    alvos[1].copy(a.cabeca)
    alvos[2].copy(a.maoE)
    alvos[3].copy(a.maoD)
    alvos[4].copy(a.joelhoE)
    alvos[5].copy(a.joelhoD)
    // a sombra embaixo do que o corpo ocupa no chão
    let x0 = Infinity
    let x1 = -Infinity
    let z0 = Infinity
    let z1 = -Infinity
    for (const k of PONTOS_DO_CORPO) {
      const v = a[k] as Vector3
      x0 = Math.min(x0, v.x)
      x1 = Math.max(x1, v.x)
      z0 = Math.min(z0, v.z)
      z1 = Math.max(z1, v.z)
    }
    sombra.position.x = (x0 + x1) / 2
    sombra.position.z = (z0 + z1) / 2
    sombra.scale.set(x1 - x0 + 0.7, z1 - z0 + 0.7, 1)
  }

  // O que está entre a câmera e o corpo (a anilha vista de lado, a torre da polia vista de frente)
  // fica quase transparente, aos poucos; devolve se ainda está mudando
  const raio = new Ray()
  const caixaPeca = new Box3()
  const batida = new Vector3()
  function afastar(dt: number) {
    if (!afastaveis.length) return false
    grupoEquip.updateMatrixWorld()
    let mudando = false
    for (const p of afastaveis) {
      caixaPeca.setFromObject(p.malha).expandByScalar(0.03)
      let tapa = false
      for (const alvo of alvos) {
        const ate = camera.position.distanceTo(alvo)
        raio.origin.copy(camera.position)
        raio.direction.copy(alvo).sub(camera.position).normalize()
        if (raio.intersectBox(caixaPeca, batida) && batida.distanceTo(camera.position) < ate - 0.08) {
          tapa = true
          break
        }
      }
      const meta = tapa ? 0.14 : 1
      const nova = dt > 0 ? p.opacidade + (meta - p.opacidade) * Math.min(1, dt * 7) : meta
      p.opacidade = Math.abs(nova - meta) < 0.01 ? meta : nova
      if (p.opacidade !== meta) mudando = true
      p.material.opacity = p.opacidade
      p.material.depthWrite = p.opacidade > 0.98
    }
    return mudando
  }

  // Os pontos que precisam aparecer durante o movimento inteiro: as articulações (com a grossura do
  // corpo) em várias fases e cada peça do equipamento que se mexe ou fica perto (a estrutura grande,
  // como a torre da polia, pode sair pela borda)
  const pontos: Vector3[] = []
  function enquadrar(mov: Movimento) {
    pontos.length = 0
    const caixa = estado.caixa.makeEmpty()
    const pecaCaixa = new Box3()
    const folga = [new Vector3(0.11, 0, 0), new Vector3(-0.11, 0, 0), new Vector3(0, 0.12, 0), new Vector3(0, -0.06, 0), new Vector3(0, 0, 0.11), new Vector3(0, 0, -0.11)]
    for (let i = 0; i < 16; i++) {
      const a = resolver(mov.pose((i / 16) * mov.periodo))
      for (const k of PONTOS_DO_CORPO) for (const f of folga) pontos.push((a[k] as Vector3).clone().add(f))
      posicionar(a)
      grupoEquip.updateMatrixWorld(true)
      grupoEquip.traverse((o) => {
        const m = o as Mesh
        if (!m.isMesh || m.userData.estrutura) return
        pecaCaixa.setFromObject(m)
        for (let c = 0; c < 8; c++) pontos.push(new Vector3(c & 1 ? pecaCaixa.max.x : pecaCaixa.min.x, c & 2 ? pecaCaixa.max.y : pecaCaixa.min.y, c & 4 ? pecaCaixa.max.z : pecaCaixa.min.z))
      })
    }
    for (const p of pontos) {
      p.y = Math.max(0, p.y)
      caixa.expandByPoint(p)
    }
  }

  // Afasta a câmera até todos os pontos caberem na tela, com folga em cima e embaixo (onde ficam as
  // etiquetas e o ponto de atenção): cada ponto pede uma distância, vale a maior. A mira fica no
  // meio do que aparece, visto daquele lado.
  function distanciaPara(vista: Camera) {
    const dir = DIRECOES[vista].clone().normalize()
    const direita = new Vector3().crossVectors(dir.clone().negate(), CIMA_MUNDO).normalize()
    const cima = new Vector3().crossVectors(direita, dir.clone().negate()).normalize()
    // o meio na tela: o centro dos pontos projetados naquele plano
    let x0 = Infinity
    let x1 = -Infinity
    let y0 = Infinity
    let y1 = -Infinity
    const base = estado.caixa.getCenter(new Vector3())
    const v = new Vector3()
    for (const p of pontos) {
      v.copy(p).sub(base)
      const x = v.dot(direita)
      const y = v.dot(cima)
      x0 = Math.min(x0, x)
      x1 = Math.max(x1, x)
      y0 = Math.min(y0, y)
      y1 = Math.max(y1, y)
    }
    const centro = base.clone().addScaledVector(direita, (x0 + x1) / 2).addScaledVector(cima, (y0 + y1) / 2)
    // em cima sobra pouco; embaixo sobra mais (é onde aparece o ponto de atenção)
    const tan = Math.tan(MathUtils.degToRad(FOV / 2))
    const tanCima = tan * 0.9
    const tanBaixo = tan * 0.7
    const tanH = tan * (camera.aspect || 1) * 0.9
    // a mira desce o tanto que o espaço de baixo pede a mais, para o corpo ficar centrado no que sobra
    centro.addScaledVector(cima, ((y1 - y0) / 2) * ((tanBaixo - tanCima) / (tanCima + tanBaixo)))
    let d = 0
    for (const p of pontos) {
      v.copy(p).sub(centro)
      const z = v.dot(dir)
      const y = v.dot(cima)
      d = Math.max(d, z + Math.abs(v.dot(direita)) / tanH, z + Math.abs(y) / (y > 0 ? tanCima : tanBaixo))
    }
    return { d: Math.max(1.6, d), centro }
  }

  function irPara(vista: Camera, voar: boolean) {
    estado.vista = vista
    const { d, centro } = distanciaPara(vista)
    estado.distancia = d
    estado.paraCamera.copy(centro).addScaledVector(DIRECOES[vista].clone().normalize(), d)
    if (voar && !reduzido) {
      estado.deCamera.copy(camera.position)
      estado.deAlvo.copy(controles.target)
      estado.alvo.copy(centro)
      estado.voando = 1
    } else {
      estado.alvo.copy(centro)
      controles.target.copy(centro)
      camera.position.copy(estado.paraCamera)
      estado.voando = 0
    }
    estado.precisa = true
  }

  function mostrar(id: string, vista?: Camera) {
    const mov = MOVIMENTOS[id]
    const ex = EXERCICIO[id]
    if (!mov || !ex) return
    // o equipamento do exercício anterior sai
    for (const g of geometriasEquip) g.dispose()
    for (const p of afastaveis) p.material.dispose()
    grupoEquip.clear()
    geometriasEquip = []
    pecas = mov.equip.map((e) => criarEquipamento(e, mats, geometriasEquip))
    for (const p of pecas) grupoEquip.add(p.grupo)
    afastaveis = []
    grupoEquip.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh || !m.userData.afastavel) return
      const material = (m.material as MeshStandardMaterial).clone()
      material.transparent = true
      m.material = material
      afastaveis.push({ malha: m, material, opacidade: 1 })
    })
    estado.id = id
    estado.mov = mov
    estado.relogio = 0
    corpo.acender(ex.principais, ex.secundarios, estado.cor, estado.musculos)
    enquadrar(mov)
    posicionar(resolver(estado.pausado ? mov.parada : mov.pose(0)))
    irPara(vista ?? ex.camera, false)
    afastar(0)
  }

  function tamanho() {
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    if (estado.mov) irPara(estado.vista, false)
    estado.precisa = true
  }
  const observador = new ResizeObserver(tamanho)
  observador.observe(canvas)
  tamanho()

  // desenha só quando aparece na tela
  const naTela = new IntersectionObserver(([e]) => {
    estado.visivel = e.isIntersecting
    if (estado.visivel) acordar()
  })
  naTela.observe(canvas)

  let quadro = 0
  function acordar() {
    if (!quadro) {
      estado.ultimo = performance.now()
      quadro = requestAnimationFrame(desenhar)
    }
  }
  const mexeu = () => {
    estado.precisa = true
    acordar()
  }
  controles.addEventListener('change', mexeu)
  controles.addEventListener('start', () => {
    estado.voando = 0
    mexeu()
  })
  document.addEventListener('visibilitychange', acordar)

  function desenhar(agora: number) {
    quadro = 0
    if (!estado.visivel || document.hidden) return
    const dt = Math.max(0, Math.min(0.05, (agora - estado.ultimo) / 1000))
    estado.ultimo = agora
    const mov = estado.mov
    if (mov && !estado.pausado) {
      estado.relogio += dt * estado.velocidade
      posicionar(resolver(mov.pose(estado.relogio)))
      estado.aoFase?.(mov.fase(estado.relogio))
      estado.aoTempo?.((((estado.relogio / mov.periodo) % 1) + 1) % 1)
    }
    if (estado.voando > 0) {
      estado.voando = Math.max(0, estado.voando - dt / 0.7)
      const t = 1 - estado.voando
      const k = t * t * (3 - 2 * t)
      camera.position.lerpVectors(estado.deCamera, estado.paraCamera, k)
      controles.target.lerpVectors(estado.deAlvo, estado.alvo, k)
    }
    const amortecendo = controles.update(dt)
    const sumindo = afastar(dt)
    renderer.render(cena, camera)
    estado.precisa = false
    // continua enquanto anima, a câmera voa, o giro do dedo ainda escorrega ou uma peça está sumindo
    if ((mov && !estado.pausado) || estado.voando > 0 || amortecendo || sumindo) acordar()
  }

  return {
    mostrar: (id, vista) => {
      mostrar(id, vista)
      mexeu()
    },
    camera: (vista) => {
      if (!estado.mov) return
      irPara(vista, true)
      mexeu()
    },
    velocidade: (v) => {
      estado.velocidade = v
    },
    pausar: (p) => {
      estado.pausado = p
      // pausado no movimento reduzido: a pose do meio da repetição
      if (p && reduzido && estado.mov) posicionar(resolver(estado.mov.parada))
      mexeu()
    },
    musculos: (m) => {
      estado.musculos = m
      const ex = EXERCICIO[estado.id]
      if (ex) corpo.acender(ex.principais, ex.secundarios, estado.cor, m)
      mexeu()
    },
    cor: (c) => {
      estado.cor = c
      const ex = EXERCICIO[estado.id]
      if (ex) corpo.acender(ex.principais, ex.secundarios, c, estado.musculos)
      mexeu()
    },
    aoFase: (f) => {
      estado.aoFase = f
    },
    aoTempo: (f) => {
      estado.aoTempo = f
    },
    instante: (fracao) => {
      const mov = estado.mov
      if (!mov) return
      estado.pausado = true
      estado.relogio = Math.min(0.9999, Math.max(0, fracao)) * mov.periodo
      posicionar(resolver(mov.pose(estado.relogio)))
      estado.aoFase?.(mov.fase(estado.relogio))
      mexeu()
    },
    liberar: () => {
      cancelAnimationFrame(quadro)
      observador.disconnect()
      naTela.disconnect()
      document.removeEventListener('visibilitychange', acordar)
      controles.dispose()
      for (const g of geometriasEquip) g.dispose()
      for (const p of afastaveis) p.material.dispose()
      for (const m of Object.values(mats)) m.dispose()
      corpo.liberar()
      chao.geometry.dispose()
      ;(chao.material as MeshBasicMaterial).dispose()
      sombra.geometry.dispose()
      ;(sombra.material as MeshBasicMaterial).dispose()
      texChao.dispose()
      texSombra.dispose()
      cena.environment?.dispose()
      pmrem.dispose()
      renderer.dispose()
    },
  }
}
