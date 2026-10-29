import { useState } from 'react'
import { PiCheckCircleFill } from 'react-icons/pi'
import { useAviso } from '../components/ui/Aviso'
import { Carregando, Girando, Selo } from '../components/ui/basicos'
import { mensagemDeErro, painel, plataforma } from '../lib/api'
import { esquecer, useDados } from '../lib/dados'
import { mensalidadeEmpresa, NOMES_PLANO, RECURSOS_EMPRESA } from '../shared/planos'
import { dataDe, dataPorExtenso } from '../shared/tempo'
import { formatarPreco, numero } from '../shared/texto'
import { usePainel } from './AppPainel'

// O plano da academia (seção 20 do estudo): por unidade, com o desconto da rede a partir de 3. O
// aluno nunca paga pelo que a academia assina, e o limite do Básico é de alunos ativos por unidade.

export function PlanoDaAcademia() {
  const c = usePainel()
  const avisar = useAviso()
  const e = c.empresa
  const config = useDados('plataforma', () => plataforma.ler())
  const alunos = useDados(`painel-visao:${c.slug}`, () => painel.visao(c.slug))
  const [mudando, setMudando] = useState<string | null>(null)
  const unidades = Math.max(1, e.unidades.filter((u) => u.ativa).length)
  const mudar = async (plano: 'basico' | 'premium') => {
    setMudando(plano)
    try {
      c.mudar((await painel.plano(c.slug, plano)).empresa)
      await c.recarregar()
      esquecer(`pagina:${c.slug}`)
      esquecer(`painel-visao:${c.slug}`)
      avisar(`Plano ${NOMES_PLANO[plano]} ativo. (No protótipo, sem cobrança.)`)
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setMudando(null)
    }
  }
  if (!config.dados) return <Carregando />
  const cfg = config.dados
  const desconto = unidades >= 3 ? Math.round(cfg.descontoRede * 100) : 0
  const ativos = alunos.dados?.alunos.ativos
  const limiteBasico = cfg.limites.alunosAcademiaBasico * unidades

  return (
    <div className="space-y-5">
      <header>
        <h1 className="titulo text-4xl">Plano</h1>
        <p className="mt-1 max-w-2xl text-sm text-suave">
          {e.plano === 'teste' && e.testeAte
            ? `Teste grátis com tudo do Premium até ${dataPorExtenso(dataDe(e.testeAte))}. Depois, ${NOMES_PLANO[e.planoDepois ?? 'premium']}: troque quando quiser.`
            : `A academia está no ${NOMES_PLANO[e.plano]}.`}{' '}
          O preço é por unidade ativa{unidades >= 3 ? `, com ${desconto}% de desconto de rede` : '; a partir de 3 unidades, a rede tem desconto'}.
        </p>
      </header>

      {ativos !== undefined && (
        <p className="text-sm">
          <span className="font-bold">{numero(ativos)}</span> alunos ativos em {unidades} {unidades === 1 ? 'unidade' : 'unidades'}
          {ativos > limiteBasico ? <span className="text-alerta"> · acima do limite do Básico ({numero(limiteBasico)})</span> : <span className="text-suave"> · o Básico vai até {numero(limiteBasico)}</span>}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {(['basico', 'premium'] as const).map((x) => {
          const atual = e.plano === x || (e.plano === 'teste' && (e.planoDepois ?? 'premium') === x)
          const porUnidade = x === 'premium' ? cfg.precos.academiaPremium : cfg.precos.academiaBasico
          const total = mensalidadeEmpresa(x, unidades, cfg)
          const bloqueado = x === 'basico' && ativos !== undefined && ativos > limiteBasico
          return (
            <div key={x} className={`cartao p-5 ${x === 'premium' ? 'border-anilha' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="titulo text-3xl">{NOMES_PLANO[x]}</p>
                {atual && <Selo tom="ok">{e.plano === 'teste' ? 'Depois do teste' : 'Atual'}</Selo>}
              </div>
              <p className="mt-2">
                <span className="text-3xl font-bold">{formatarPreco(total)}</span>
                <span className="text-sm text-suave">/mês</span>
              </p>
              <p className="text-xs text-fraco">
                {formatarPreco(porUnidade)} por unidade × {unidades}
                {desconto ? ` − ${desconto}%` : ''}
              </p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {(x === 'premium' ? [...RECURSOS_EMPRESA.basico.slice(1), ...RECURSOS_EMPRESA.premium] : RECURSOS_EMPRESA.basico).map((r) => (
                  <li key={r} className="flex gap-2">
                    <PiCheckCircleFill className="mt-0.5 shrink-0 text-anilha-legivel" /> {r}
                  </li>
                ))}
              </ul>
              {(!atual || e.plano === 'teste') && e.plano !== x && (
                <button type="button" className={`btn btn-m mt-5 w-full ${x === 'premium' ? 'btn-anilha' : 'btn-sup'}`} disabled={!!mudando || bloqueado} onClick={() => mudar(x)}>
                  {mudando === x ? <Girando /> : e.plano === 'teste' ? `Assinar o ${NOMES_PLANO[x]} agora` : `Mudar para o ${NOMES_PLANO[x]}`}
                </button>
              )}
              {bloqueado && <p className="mt-2 text-xs text-alerta">Com mais alunos ativos que o limite, o Básico não cabe.</p>}
            </div>
          )
        })}
      </div>
      <p className="text-[0.7rem] text-fraco">Protótipo: a assinatura é simulada, o plano muda na hora e não há cobrança. O aluno nunca paga pelo que a academia assina; o professor da equipe também não.</p>
    </div>
  )
}
