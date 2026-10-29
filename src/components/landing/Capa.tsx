import { motion } from 'motion/react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { PiArrowRight, PiMapTrifold, PiUsersThree } from 'react-icons/pi'
import { explorar, mensagemDeErro, plataforma, sessao } from '../../lib/api'
import { useDados } from '../../lib/dados'
import { useLocal } from '../../lib/local'
import { Link, navegar } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { EXERCICIO, MUSCULOS } from '../../shared/exercicios'
import { nomeCidade } from '../../shared/geo'
import { numero } from '../../shared/texto'
import { EscolherLocal } from '../local/EscolherCidade'
import { useAviso } from '../ui/Aviso'
import { easeSuave, Girando } from '../ui/basicos'

const Boneco3D = lazy(() => import('../three/Boneco3D'))

// A capa (seção 19 do estudo, a primeira camada): "Onde você treina?", os números da região na hora,
// o boneco treinando ao lado (troca de exercício sozinho) e os atalhos para o mapa e a rede

const VITRINE = ['supino-reto', 'agachamento-livre', 'remada-curvada', 'kettlebell-swing', 'desenvolvimento-halteres', 'levantamento-terra']

const reduzido = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function Capa() {
  const local = useLocal()
  const numeros = useDados(`regiao:${local.ponto.lat.toFixed(3)}:${local.ponto.lng.toFixed(3)}:${local.raio}`, () => explorar({ lat: local.ponto.lat, lng: local.ponto.lng, raio: local.raio }).then((r) => r.numeros))
  const [indice, setIndice] = useState(0)
  useEffect(() => {
    if (reduzido()) return
    const t = setInterval(() => setIndice((i) => (i + 1) % VITRINE.length), 9000)
    return () => clearInterval(t)
  }, [])
  const ex = EXERCICIO[VITRINE[indice]]
  const n = numeros.dados
  const regiao = `${local.cidade.nome} e até ${local.raio} km`
  const busca = `lat=${local.ponto.lat.toFixed(5)}&lng=${local.ponto.lng.toFixed(5)}&raio=${local.raio}`

  return (
    <section className="relative overflow-hidden">
      {/* o brilho amarelo atrás do boneco */}
      <div aria-hidden className="pointer-events-none absolute -top-40 right-[-20%] h-[44rem] w-[44rem] rounded-full opacity-[0.12] blur-3xl" style={{ background: 'radial-gradient(circle, var(--anilha), transparent 65%)' }} />
      <div className="margem relative mx-auto grid max-w-7xl items-center gap-10 pt-8 pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: easeSuave }}>
          <p className="sobre">Academias · personais · lutas · dança · pilates · natação</p>
          <h1 className="titulo mt-5 text-[clamp(3.4rem,11vw,7.2rem)]">
            Onde você
            <br />
            <span className="text-anilha-legivel">treina?</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-suave">
            Ache a academia, o personal e a aula perto de você. Treine com a ficha no celular e o exercício em 3D, e entre na turma da sua cidade.
          </p>

          <div className="mt-7 max-w-xl">
            <EscolherLocal />
          </div>

          {/* os números da região, na hora */}
          <div className="mt-6 flex max-w-xl flex-wrap items-end gap-x-8 gap-y-4" aria-live="polite">
            {n ? (
              <>
                <NumeroRegiao valor={n.unidades} legenda={n.unidades === 1 ? 'academia ou estúdio' : 'academias e estúdios'} />
                <NumeroRegiao valor={n.personais} legenda={n.personais === 1 ? 'personal' : 'personais'} />
                <NumeroRegiao valor={n.modalidades} legenda="modalidades" />
              </>
            ) : numeros.erro ? (
              <p className="text-sm text-suave">{mensagemDeErro(numeros.erro)}</p>
            ) : (
              <Girando className="text-xl text-fraco" />
            )}
          </div>
          <p className="mt-2 text-xs text-fraco">{local.escolhido ? `Em ${regiao}.` : `Mostrando ${nomeCidade(local.cidade)}, a cidade da demonstração. Troque para a sua.`}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link para={`/explorar?${busca}`} className="btn btn-anilha btn-g">
              <PiMapTrifold className="text-xl" /> Ver no mapa
            </Link>
            <Link para="/rede" className="btn btn-contorno btn-g">
              <PiUsersThree className="text-xl" /> Abrir a rede
            </Link>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: easeSuave, delay: 0.1 }} className="relative">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-linha sm:aspect-[5/5]" style={{ background: 'radial-gradient(110% 80% at 50% 10%, var(--sup-2), var(--fundo) 72%)' }}>
            <Suspense fallback={<div className="grid h-full place-items-center text-sm text-fraco">Montando o boneco…</div>}>
              <Boneco3D exercicio={ex.id} cor="#f5c518" interativo={false} />
            </Suspense>
            <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
              <div className="rounded-2xl bg-vidro px-4 py-3 backdrop-blur">
                <p className="text-sm font-bold">{ex.nome}</p>
                <p className="mt-0.5 text-xs text-suave">
                  <span className="mr-1.5 inline-block size-2 rounded-full bg-anilha align-middle" />
                  {ex.principais.map((m) => MUSCULOS[m]).join(', ')}
                </p>
              </div>
              <div className="flex gap-1.5" aria-hidden>
                {VITRINE.map((v, i) => (
                  <span key={v} className={`h-1.5 rounded-full transition-all ${i === indice ? 'w-5 bg-anilha' : 'w-1.5 bg-texto/30'}`} />
                ))}
              </div>
            </div>
          </div>
          <Link para="/exercicios" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-suave hover:text-texto">
            Os 43 exercícios em 3D <PiArrowRight />
          </Link>
        </motion.div>
      </div>
      <Experimentar />
    </section>
  )
}

function NumeroRegiao({ valor, legenda }: { valor: number; legenda: string }) {
  return (
    <div>
      <p className="titulo dado text-5xl">{numero(valor)}</p>
      <p className="mt-1 text-xs font-semibold text-suave">{legenda}</p>
    </div>
  )
}

// Experimentar sem cadastro: a conta de aluno da visita (some em um dia) e os painéis prontos
export function Experimentar() {
  const s = useSessao()
  const avisar = useAviso()
  const [entrando, setEntrando] = useState<string | null>(null)
  // o admin pode tirar a demonstração (no lançamento): aí não tem o que experimentar
  const noAr = useDados('plataforma', () => plataforma.ler()).dados?.demonstracao !== false
  const entrar = async (papel: 'aluno' | 'personal' | 'professor' | 'academia') => {
    setEntrando(papel)
    try {
      s.aplicar(await sessao.demo(papel))
      navegar(papel === 'aluno' ? '/app' : papel === 'academia' ? '/painel/forca-total' : '/pro')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setEntrando(null)
    }
  }
  const papeis = [
    { id: 'aluno', nome: 'Aluno', texto: 'Ana: a ficha do personal, o treino de hoje e a rede' },
    { id: 'personal', nome: 'Personal', texto: 'Rafael: alunos, fichas, agenda e a página dele' },
    { id: 'professor', nome: 'Professor', texto: 'Diego: dá aula em três lugares' },
    { id: 'academia', nome: 'Academia', texto: 'Força Total: a rede com quatro unidades' },
  ] as const
  if (!noAr) return null
  return (
    <div className="margem mx-auto max-w-7xl pb-6">
      <div className="cartao flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
        <div className="lg:w-64">
          <p className="font-bold">Experimente sem cadastro</p>
          <p className="mt-1 text-sm text-suave">Entre numa conta pronta da demonstração.</p>
        </div>
        <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {papeis.map((p) => (
            <button key={p.id} type="button" disabled={!!entrando} onClick={() => entrar(p.id)} className="group flex flex-col justify-start rounded-2xl border border-linha bg-sup-2 px-4 py-3 text-left transition-colors hover:border-anilha disabled:opacity-60">
              <span className="flex items-center justify-between font-bold">
                {p.nome}
                {entrando === p.id ? <Girando /> : <PiArrowRight className="text-fraco transition-transform group-hover:translate-x-0.5 group-hover:text-anilha-legivel" />}
              </span>
              <span className="mt-0.5 block text-xs text-suave">{p.texto}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
