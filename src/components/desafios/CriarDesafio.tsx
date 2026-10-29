import { useState } from 'react'
import { desafios, mensagemDeErro } from '../../lib/api'
import { navegar } from '../../lib/rotas'
import { PONTUACOES } from '../../shared/desafio'
import { hoje, somarDias } from '../../shared/tempo'
import type { Pontuacao } from '../../shared/tipos'
import { useAviso } from '../ui/Aviso'
import { Campo, Folha, Girando, Interruptor } from '../ui/basicos'

// Criar um desafio (seção 16 do estudo): entre amigos (com o código para chamar a turma) ou o oficial
// da academia e do personal (público na região, com prêmio)

export function CriarDesafio({ aberta, aoFechar, oficial }: { aberta: boolean; aoFechar: () => void; oficial?: { tipo: 'empresa' | 'profissional'; id?: string; nome: string } }) {
  const avisar = useAviso()
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [inicio, setInicio] = useState(hoje())
  const [fim, setFim] = useState(somarDias(hoje(), 29))
  const [pontuacao, setPontuacao] = useState<Pontuacao>('dias')
  const [publico, setPublico] = useState(!!oficial)
  const [premio, setPremio] = useState('')
  const [criando, setCriando] = useState(false)
  const criar = async () => {
    setCriando(true)
    try {
      const d = await desafios.criar({ nome, descricao: descricao || undefined, inicio, fim, pontuacao, publico, premio: premio || undefined, ...(oficial ? { oficial: { tipo: oficial.tipo, ...(oficial.id ? { id: oficial.id } : {}) } } : {}) })
      avisar(`Desafio criado! Código: ${d.codigo}`)
      aoFechar()
      navegar(`/desafios/${d.id}`)
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setCriando(false)
    }
  }
  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo="Novo desafio">
      <div className="p-6">
        <h2 className="titulo text-3xl">{oficial ? `Desafio da ${oficial.nome}` : 'Novo desafio'}</h2>
        <p className="mt-1 text-sm text-suave">Conta a constância, nunca o corpo: quem treinar mais vezes sobe no ranking.</p>
        <div className="mt-5 space-y-4">
          <Campo rotulo="Nome">
            <input className="campo" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="30 dias sem falhar" />
          </Campo>
          <Campo rotulo="Descrição (opcional)">
            <input className="campo" maxLength={200} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Começa">
              <input className="campo" type="date" min={hoje()} value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </Campo>
            <Campo rotulo="Termina">
              <input className="campo" type="date" min={somarDias(inicio, 1)} max={somarDias(inicio, 120)} value={fim} onChange={(e) => setFim(e.target.value)} />
            </Campo>
          </div>
          <div>
            <p className="rotulo">Como pontua</p>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Pontuação">
              {(Object.keys(PONTUACOES) as Pontuacao[]).map((p) => (
                <button key={p} type="button" role="radio" aria-checked={pontuacao === p} onClick={() => setPontuacao(p)} className={`rounded-2xl border p-3 text-left transition-colors ${pontuacao === p ? 'border-anilha bg-anilha-suave' : 'border-linha hover:border-linha-2'}`}>
                  <span className="block text-sm font-bold">{PONTUACOES[p].nome}</span>
                  <span className="block text-xs text-suave">{PONTUACOES[p].descricao}</span>
                </button>
              ))}
            </div>
          </div>
          {oficial ? (
            <Campo rotulo="Prêmio (opcional)">
              <input className="campo" maxLength={80} value={premio} onChange={(e) => setPremio(e.target.value)} placeholder="Uma camiseta, um mês grátis..." />
            </Campo>
          ) : (
            <Interruptor ligado={publico} aoMudar={setPublico} rotulo="Aparecer na rede" descricao="Desligado, só entra quem tiver o código" />
          )}
        </div>
        <button type="button" className="btn btn-anilha btn-m mt-6 w-full" disabled={criando || nome.trim().length < 3} onClick={criar}>
          {criando ? <Girando /> : 'Criar o desafio'}
        </button>
      </div>
    </Folha>
  )
}
