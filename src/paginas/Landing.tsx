import { PiArrowRight } from 'react-icons/pi'
import { Capa } from '../components/landing/Capa'
import { ComoFunciona } from '../components/landing/ComoFunciona'
import { MonteSeuApp } from '../components/landing/MonteSeuApp'
import { Perguntas } from '../components/landing/Perguntas'
import { Planos } from '../components/landing/Planos'
import { Portas } from '../components/landing/Portas'
import { Rodape } from '../components/layout/Rodape'
import { Topo } from '../components/layout/Topo'
import { MARCA } from '../data/marca'
import { Link } from '../lib/rotas'
import { useTitulo } from '../lib/titulo'

// A landing (seção 19 do estudo): a camada de quem treina (onde você treina, o mapa, a rede), as
// portas de cadastro, como funciona, monte o seu app, os planos e as perguntas
export default function Landing() {
  useTitulo(`${MARCA.nome} · sua academia, seu personal e a sua turma num app só`, { puro: true })
  return (
    <div className="min-h-[100svh]">
      <Topo />
      <main>
        <Capa />
        <Portas />
        <ComoFunciona />
        <MonteSeuApp />
        <Planos />
        <Perguntas />
        <section className="margem mx-auto max-w-7xl py-10">
          <div className="relative overflow-hidden rounded-[2rem] bg-anilha px-6 py-14 text-center text-anilha-texto sm:px-12">
            <h2 className="titulo text-5xl sm:text-7xl">Bora treinar?</h2>
            <p className="mx-auto mt-4 max-w-xl font-medium opacity-80">Crie a sua conta em um minuto, ou traga a sua academia e os seus alunos com 30 dias grátis.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link para="/cadastro" className="btn btn-g bg-anilha-texto text-anilha">
                Criar conta grátis <PiArrowRight />
              </Link>
              <Link para="/comecar/academia" className="btn btn-g border border-anilha-texto/30">
                Tenho uma academia
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Rodape />
    </div>
  )
}
