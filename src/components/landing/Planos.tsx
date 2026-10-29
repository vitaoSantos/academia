import { useState } from 'react'
import { PiCheckBold } from 'react-icons/pi'
import { plataforma } from '../../lib/api'
import { useDados } from '../../lib/dados'
import { Link } from '../../lib/rotas'
import { mensalidadeEmpresa, PLATAFORMA_PADRAO, RECURSOS_ALUNO, RECURSOS_EMPRESA, RECURSOS_PERSONAL } from '../../shared/planos'
import { reais } from '../../shared/texto'
import { Abas } from '../ui/basicos'

// Os planos (seção 20 do estudo), em três abas. Os preços vêm do admin (o padrão enquanto carrega).

type Aba = 'voce' | 'personal' | 'academia'

export function Planos() {
  const [aba, setAba] = useState<Aba>('voce')
  const [unidades, setUnidades] = useState(1)
  const config = useDados('plataforma', () => plataforma.ler()).dados ?? PLATAFORMA_PADRAO
  const p = config.precos
  const teste = `${config.diasTeste} dias grátis com tudo do Premium`

  return (
    <section id="planos" className="margem mx-auto max-w-7xl scroll-mt-20 py-16" aria-labelledby="planos-titulo">
      <p className="sobre">Planos</p>
      <h2 id="planos-titulo" className="titulo mt-2 text-5xl sm:text-6xl">
        Quem treina não paga
      </h2>
      <p className="mt-4 max-w-2xl text-suave">Para o aluno, a Turma é grátis (o Turma+ é opcional). A academia e o personal assinam por mês, com o Básico e o Premium, e o plano deles nunca trava o aluno.</p>

      <Abas<Aba>
        className="mt-8 max-w-lg"
        valor={aba}
        aoMudar={setAba}
        opcoes={[
          { id: 'voce', rotulo: 'Para você' },
          { id: 'personal', rotulo: 'Personal' },
          { id: 'academia', rotulo: 'Academia' },
        ]}
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {aba === 'voce' && (
          <>
            <Cartao nome="Grátis" preco="R$ 0" sobre="para sempre" itens={RECURSOS_ALUNO.gratis} acao={{ texto: 'Criar conta grátis', para: '/cadastro' }} />
            <Cartao destaque nome="Turma+" preco={reais(p.alunoMais)} sobre={`por mês, ou ${reais(p.alunoMaisAno)} por ano`} itens={RECURSOS_ALUNO.mais} acao={{ texto: 'Começar grátis', para: '/cadastro' }} nota="Assine dentro do app, quando quiser." />
          </>
        )}
        {aba === 'personal' && (
          <>
            <Cartao nome="Básico" preco={reais(p.personalBasico)} sobre="por mês" itens={RECURSOS_PERSONAL.basico} acao={{ texto: 'Testar grátis', para: '/comecar/personal' }} nota={teste} />
            <Cartao destaque nome="Premium" preco={reais(p.personalPremium)} sobre="por mês" itens={[...RECURSOS_PERSONAL.premium, 'Tudo do Básico']} acao={{ texto: 'Testar grátis', para: '/comecar/personal' }} nota={teste} />
          </>
        )}
        {aba === 'academia' && (
          <>
            <Cartao nome="Básico" preco={reais(p.academiaBasico)} sobre="por unidade, por mês" itens={RECURSOS_EMPRESA.basico} acao={{ texto: 'Testar grátis', para: '/comecar/academia?plano=basico' }} nota={teste} />
            <Cartao destaque nome="Premium" preco={reais(p.academiaPremium)} sobre="por unidade, por mês" itens={[...RECURSOS_EMPRESA.premium, 'Tudo do Básico']} acao={{ texto: 'Testar grátis', para: '/comecar/academia' }} nota={teste} />
            <div className="cartao p-6 lg:col-span-2">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <label className="flex-1">
                  <span className="rotulo">
                    A rede: quantas unidades? <span className="dado text-texto">{unidades}</span>
                  </span>
                  <input type="range" min={1} max={20} value={unidades} onChange={(e) => setUnidades(Number(e.target.value))} className="w-full accent-[var(--anilha)]" aria-label="Unidades" />
                  <span className="text-xs text-fraco">A partir de 3 unidades, {Math.round(config.descontoRede * 100)}% de desconto em todas.</span>
                </label>
                <div className="grid grid-cols-2 gap-6 sm:w-80">
                  <div>
                    <p className="text-xs font-semibold text-suave">Básico</p>
                    <p className="titulo dado mt-1 text-3xl">{reais(mensalidadeEmpresa('basico', unidades, config))}</p>
                    <p className="text-xs text-fraco">por mês</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-suave">Premium</p>
                    <p className="titulo dado mt-1 text-3xl text-anilha-legivel">{reais(mensalidadeEmpresa('premium', unidades, config))}</p>
                    <p className="text-xs text-fraco">por mês</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function Cartao({ nome, preco, sobre, itens, acao, nota, destaque = false }: { nome: string; preco: string; sobre: string; itens: string[]; acao: { texto: string; para: string }; nota?: string; destaque?: boolean }) {
  return (
    <div className={`cartao flex flex-col p-6 sm:p-8 ${destaque ? 'border-anilha ring-1 ring-anilha' : ''}`}>
      <p className="flex items-center gap-2 font-bold">
        {nome}
        {destaque && <span className="rounded-full bg-anilha px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-anilha-texto uppercase">Mais escolhido</span>}
      </p>
      <p className="titulo dado mt-4 text-6xl">{preco}</p>
      <p className="mt-1 text-sm text-suave">{sobre}</p>
      <ul className="mt-6 flex-1 space-y-2.5">
        {itens.map((i) => (
          <li key={i} className="flex gap-2.5 text-sm">
            <PiCheckBold className="mt-0.5 shrink-0 text-anilha-legivel" />
            {i}
          </li>
        ))}
      </ul>
      <Link para={acao.para} className={`btn btn-g mt-8 ${destaque ? 'btn-anilha' : 'btn-contorno'}`}>
        {acao.texto}
      </Link>
      {nota && <p className="mt-3 text-center text-xs text-fraco">{nota}</p>}
    </div>
  )
}
