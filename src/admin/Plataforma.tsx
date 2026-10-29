import { useState, type ReactNode } from 'react'
import { useAviso } from '../components/ui/Aviso'
import { Campo, Carregando, Erro, Girando, Interruptor } from '../components/ui/basicos'
import { admin, mensagemDeErro } from '../lib/api'
import { esquecer, useDados } from '../lib/dados'
import { RAIOS } from '../shared/geo'
import { centavosDe, formatarPreco } from '../shared/texto'
import type { ConfigPlataforma } from '../shared/tipos'

// As regras da plataforma (seção 20 do estudo): os preços, os limites do grátis e do Básico, o
// desconto da rede, os dias de teste, o raio da região, o cadastro aberto e o aviso no topo. A
// landing, o app e os painéis leem daqui.

type Precos = ConfigPlataforma['precos']
type Limites = ConfigPlataforma['limites']

const PRECOS: { id: keyof Precos; nome: string; dica?: string }[] = [
  { id: 'alunoMais', nome: 'Turma+ por mês', dica: 'O aluno' },
  { id: 'alunoMaisAno', nome: 'Turma+ por ano' },
  { id: 'personalBasico', nome: 'Personal Básico' },
  { id: 'personalPremium', nome: 'Personal Premium' },
  { id: 'academiaBasico', nome: 'Academia Básico', dica: 'Por unidade ativa' },
  { id: 'academiaPremium', nome: 'Academia Premium', dica: 'Por unidade ativa' },
]

const LIMITES: { id: keyof Limites; nome: string; min: number; max: number }[] = [
  { id: 'fichasProprias', nome: 'Fichas próprias do aluno grátis', min: 0, max: 20 },
  { id: 'divisoesProprias', nome: 'Divisões em cada ficha própria', min: 1, max: 7 },
  { id: 'diasGrafico', nome: 'Dias de gráfico no grátis', min: 7, max: 730 },
  { id: 'fotosGratis', nome: 'Fotos de evolução no grátis', min: 0, max: 100 },
  { id: 'desafiosGratis', nome: 'Desafios criados ao mesmo tempo (grátis)', min: 0, max: 20 },
  { id: 'alunosPersonalBasico', nome: 'Alunos ativos do personal no Básico', min: 1, max: 1000 },
  { id: 'alunosAcademiaBasico', nome: 'Alunos ativos por unidade no Básico', min: 10, max: 100_000 },
]

const emReais = (c: number) => (c / 100).toFixed(2).replace('.', ',')

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="cartao p-5 sm:p-6">
      <h2 className="titulo text-2xl">{titulo}</h2>
      {descricao && <p className="mt-1 text-sm text-suave">{descricao}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

export function Plataforma() {
  const d = useDados('admin-plataforma', () => admin.plataforma())
  if (!d.dados) return d.erro ? <Erro mensagem={mensagemDeErro(d.erro)} aoTentar={d.recarregar} /> : <Carregando />
  return <Formulario key={JSON.stringify(d.dados.config)} config={d.dados.config} padrao={d.dados.padrao} aoSalvar={(config) => d.definir((x) => ({ config, padrao: x!.padrao }))} />
}

function Formulario({ config, padrao, aoSalvar }: { config: ConfigPlataforma; padrao: ConfigPlataforma; aoSalvar: (c: ConfigPlataforma) => void }) {
  const avisar = useAviso()
  const [precos, setPrecos] = useState<Record<keyof Precos, string>>(() => Object.fromEntries(PRECOS.map((p) => [p.id, emReais(config.precos[p.id])])) as Record<keyof Precos, string>)
  const [limites, setLimites] = useState<Limites>(config.limites)
  const [desconto, setDesconto] = useState(Math.round(config.descontoRede * 100))
  const [diasTeste, setDiasTeste] = useState(config.diasTeste)
  const [raio, setRaio] = useState(config.raioPadrao)
  const [aberto, setAberto] = useState(config.cadastroAberto)
  const [aviso, setAviso] = useState(config.aviso)
  const [salvando, setSalvando] = useState(false)

  const novo: ConfigPlataforma = {
    precos: Object.fromEntries(PRECOS.map((p) => [p.id, centavosDe(precos[p.id])])) as Precos,
    limites,
    descontoRede: desconto / 100,
    diasTeste,
    raioPadrao: raio,
    cadastroAberto: aberto,
    aviso: aviso.trim(),
  }
  const mudou = JSON.stringify(novo) !== JSON.stringify({ ...config, aviso: config.aviso.trim() })
  const salvar = async () => {
    setSalvando(true)
    try {
      const r = await admin.salvarPlataforma(novo)
      esquecer('plataforma')
      esquecer('admin-')
      aoSalvar(r.config)
      avisar('Regras salvas. A landing, o app e os painéis já usam as novas.')
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="titulo text-4xl">Plataforma</h1>
        <p className="mt-1 max-w-2xl text-sm text-suave">Os preços e os limites dos planos. A landing, o app e os painéis leem daqui; quem já assina não muda de plano sozinho. Cada mudança fica no registro.</p>
      </header>

      <Secao titulo="Preços por mês" descricao="Em reais. O Turma+ anual é o preço do ano inteiro.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRECOS.map((p) => (
            <Campo key={p.id} rotulo={p.nome} dica={`${p.dica ? `${p.dica} · ` : ''}padrão ${formatarPreco(padrao.precos[p.id])}`}>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fraco">R$</span>
                <input className="campo pl-11" inputMode="decimal" value={precos[p.id]} onChange={(e) => setPrecos((x) => ({ ...x, [p.id]: e.target.value.replace(/[^\d,.]/g, '') }))} />
              </div>
            </Campo>
          ))}
        </div>
      </Secao>

      <Secao titulo="Limites" descricao="O que o grátis e o Básico permitem. O que a academia e o personal pagam nunca trava o aluno deles.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LIMITES.map((l) => (
            <Campo key={l.id} rotulo={l.nome} dica={`De ${l.min} a ${l.max.toLocaleString('pt-BR')} · padrão ${padrao.limites[l.id].toLocaleString('pt-BR')}`}>
              <input
                className="campo"
                type="number"
                min={l.min}
                max={l.max}
                value={limites[l.id]}
                onChange={(e) => setLimites((x) => ({ ...x, [l.id]: Math.max(l.min, Math.min(l.max, Math.round(Number(e.target.value) || 0))) }))}
              />
            </Campo>
          ))}
        </div>
      </Secao>

      <Secao titulo="Rede, teste e região">
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo rotulo="Desconto da rede (%)" dica={`A partir de 3 unidades · padrão ${Math.round(padrao.descontoRede * 100)}%`}>
            <input className="campo" type="number" min={0} max={50} value={desconto} onChange={(e) => setDesconto(Math.max(0, Math.min(50, Math.round(Number(e.target.value) || 0))))} />
          </Campo>
          <Campo rotulo="Dias de teste grátis" dica={`Academia e personal · padrão ${padrao.diasTeste}`}>
            <input className="campo" type="number" min={0} max={120} value={diasTeste} onChange={(e) => setDiasTeste(Math.max(0, Math.min(120, Math.round(Number(e.target.value) || 0))))} />
          </Campo>
          <Campo rotulo="Raio da região" dica={`Quem entra sem escolher · padrão ${padrao.raioPadrao} km`}>
            <select className="campo" value={raio} onChange={(e) => setRaio(Number(e.target.value))}>
              {RAIOS.map((r) => (
                <option key={r} value={r}>
                  {r} km
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </Secao>

      <Secao titulo="Cadastro e aviso">
        <div className="space-y-5">
          <Interruptor
            ligado={aberto}
            aoMudar={setAberto}
            rotulo="Cadastro aberto"
            descricao={aberto ? 'Qualquer pessoa cria a conta, a academia e o perfil profissional' : 'Ninguém cria conta nova; quem já tem continua entrando'}
          />
          <Campo rotulo="Aviso no topo de todas as telas" dica={`${aviso.length}/160 · vazio, sem aviso`}>
            <input className="campo" maxLength={160} value={aviso} onChange={(e) => setAviso(e.target.value)} placeholder="Manutenção hoje às 23h: o app fica fora por 10 minutos." />
          </Campo>
        </div>
      </Secao>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-linha bg-fundo/95 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border">
        <p className="min-w-0 flex-1 text-sm text-suave">{mudou ? 'Há mudanças para salvar.' : 'Tudo salvo.'}</p>
        <button type="button" className="btn btn-anilha btn-m" disabled={!mudou || salvando} onClick={salvar}>
          {salvando ? <Girando /> : 'Salvar as regras'}
        </button>
      </div>
    </div>
  )
}
