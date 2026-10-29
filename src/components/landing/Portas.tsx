import { motion } from 'motion/react'
import { PiArrowRight, PiBarbell, PiBuildings, PiChalkboardTeacher, PiUserCircleCheck } from 'react-icons/pi'
import { Link } from '../../lib/rotas'
import { easeSuave } from '../ui/basicos'

// As portas de cadastro (a segunda camada da landing): cada um entra pela sua

const PORTAS = [
  {
    para: '/cadastro',
    icone: <PiBarbell />,
    titulo: 'Quero treinar',
    texto: 'Grátis. A ficha do seu professor no celular, o treino ao vivo, as suas medidas e a turma da sua cidade.',
    acao: 'Criar conta',
  },
  {
    para: '/comecar/personal',
    icone: <PiUserCircleCheck />,
    titulo: 'Sou personal',
    texto: 'O app com a sua marca, os seus alunos, fichas que você reaproveita, agenda e a sua página com os seus números.',
    acao: '30 dias grátis',
  },
  {
    para: '/cadastro?papel=professor',
    icone: <PiChalkboardTeacher />,
    titulo: 'Dou aula numa academia',
    texto: 'A academia te convida. Com uma conta só, você aparece em todos os lugares onde dá aula e monta as fichas dos alunos.',
    acao: 'Criar a minha conta',
  },
  {
    para: '/comecar/academia',
    icone: <PiBuildings />,
    titulo: 'Tenho uma academia ou rede',
    texto: 'As unidades no mapa, os professores, as modalidades com grade e reserva, e o app com a sua marca para os alunos.',
    acao: '30 dias grátis',
  },
]

export function Portas() {
  return (
    <section className="margem mx-auto max-w-7xl py-16" aria-labelledby="portas">
      <p className="sobre">Para todo mundo da academia</p>
      <h2 id="portas" className="titulo mt-2 text-5xl sm:text-6xl">
        Entre pela sua porta
      </h2>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PORTAS.map((p, i) => (
          <motion.div key={p.para} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6, ease: easeSuave, delay: i * 0.06 }}>
            <Link para={p.para} className="cartao group flex h-full flex-col p-6 transition-colors hover:border-anilha">
              <span className="grid size-12 place-items-center rounded-2xl bg-anilha-suave text-2xl text-anilha-legivel">{p.icone}</span>
              <span className="titulo mt-5 text-3xl">{p.titulo}</span>
              <span className="mt-2 flex-1 text-sm text-suave">{p.texto}</span>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-anilha-legivel">
                {p.acao} <PiArrowRight className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
