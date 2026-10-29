import {
  ACESFilmicToneMapping,
  Box3,
  CanvasTexture,
  CircleGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
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
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.setClearColor(0x000000, 0)

  const cena = new Scene()
  const pmrem = new PMREMGenerator(renderer)
  const ambiente = new RoomEnvironment()
  cena.environment = pmrem.fromScene(ambiente, 0.04).texture
  cena.environmentIntensity = 0.95
  ambiente.traverse((o) => (o as Mesh).geometry?.dispose())

  const camera = new PerspectiveCamera(FOV, 1, 0.05, 60)
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
    visivel: true,
    ultimo: performance.now(),
    precisa: true, // desenhar o próximo quadro mesmo parado
  }

  function posicionar(a: Articulacoes) {
    corpo.atualizar(a)
    for (const p of pecas) p.atualizar(a, corpo.maos)
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

  // A caixa do movimento inteiro: o corpo em várias fases e o equipamento
  function enquadrar(mov: Movimento) {
    const caixa = estado.caixa.makeEmpty()
    const raio = new Vector3(0.12, 0.12, 0.12)
    for (let i = 0; i < 16; i++) {
      const a = resolver(mov.pose((i / 16) * mov.periodo))
      for (const k of PONTOS_DO_CORPO) {
        const v = a[k] as Vector3
        caixa.expandByPoint(v.clone().add(raio))
        caixa.expandByPoint(v.clone().sub(raio))
      }
      posicionar(a)
      grupoEquip.updateMatrixWorld(true)
      // as máquinas grandes (a torre da polia) entram só um pouco: o que importa é o corpo
      const equip = new Box3().setFromObject(grupoEquip)
      if (!equip.isEmpty()) {
        equip.max.y = Math.min(equip.max.y, caixa.max.y + 0.25)
        caixa.union(equip)
      }
    }
    caixa.min.y = Math.max(0, caixa.min.y)
  }

  // Afasta a câmera até a caixa caber (na altura e na largura da tela)
  function distanciaPara(vista: Camera) {
    const tamanho = estado.caixa.getSize(new Vector3())
    const centro = estado.caixa.getCenter(new Vector3())
    const aspecto = camera.aspect || 1
    const tanV = Math.tan(MathUtils.degToRad(FOV / 2))
    const tanH = tanV * aspecto
    // o raio que a caixa ocupa vista daquele lado (uma conta simples, com folga)
    const dir = DIRECOES[vista].clone().normalize()
    const largura = Math.abs(dir.z) * tamanho.x + Math.abs(dir.x) * tamanho.z + 0.2
    const altura = tamanho.y * (1 - Math.abs(dir.y) * 0.35) + Math.abs(dir.y) * Math.max(tamanho.x, tamanho.z) * 0.6 + 0.2
    const d = Math.max(altura / 2 / tanV, largura / 2 / tanH) + Math.max(tamanho.x, tamanho.z) * 0.3
    return { d: Math.max(2.2, d * 1.04), centro }
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
    grupoEquip.clear()
    geometriasEquip = []
    pecas = mov.equip.map((e) => criarEquipamento(e, mats, geometriasEquip))
    for (const p of pecas) grupoEquip.add(p.grupo)
    estado.id = id
    estado.mov = mov
    estado.relogio = 0
    corpo.acender(ex.principais, ex.secundarios, estado.cor, estado.musculos)
    enquadrar(mov)
    posicionar(resolver(estado.pausado ? mov.parada : mov.pose(0)))
    irPara(vista ?? ex.camera, false)
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
    const dt = Math.min(0.05, (agora - estado.ultimo) / 1000)
    estado.ultimo = agora
    const mov = estado.mov
    if (mov && !estado.pausado) {
      estado.relogio += dt * estado.velocidade
      posicionar(resolver(mov.pose(estado.relogio)))
      estado.aoFase?.(mov.fase(estado.relogio))
    }
    if (estado.voando > 0) {
      estado.voando = Math.max(0, estado.voando - dt / 0.7)
      const t = 1 - estado.voando
      const k = t * t * (3 - 2 * t)
      camera.position.lerpVectors(estado.deCamera, estado.paraCamera, k)
      controles.target.lerpVectors(estado.deAlvo, estado.alvo, k)
    }
    const amortecendo = controles.update(dt)
    renderer.render(cena, camera)
    estado.precisa = false
    // continua enquanto anima, a câmera voa ou o giro do dedo ainda escorrega
    if ((mov && !estado.pausado) || estado.voando > 0 || amortecendo) acordar()
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
    liberar: () => {
      cancelAnimationFrame(quadro)
      observador.disconnect()
      naTela.disconnect()
      document.removeEventListener('visibilitychange', acordar)
      controles.dispose()
      for (const g of geometriasEquip) g.dispose()
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
