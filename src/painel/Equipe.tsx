import { useState } from 'react'
import { PiChalkboardTeacher, PiTrash } from 'react-icons/pi'
import { Convidar } from '../components/convite/Convidar'
import { useAviso } from '../components/ui/Aviso'
import { Avatar, Interruptor, Selo } from '../components/ui/basicos'
import { mensagemDeErro, painel } from '../lib/api'
import { esquecer } from '../lib/dados'
import { useSessao } from '../lib/sessao'
import { dataDe, dataPorExtenso } from '../shared/tempo'
import { primeiroNome } from '../shared/texto'
import type { MembroEquipe, PapelEmpresa } from '../shared/tipos'
import { NOMES_PAPEL, usePainel } from './AppPainel'

// A equipe (seção 7 do estudo): quem faz o quê e em quais unidades. O professor entra pelo convite
// com a conta dele, a mesma que ele usa nas outras academias e como personal.

const O_QUE_FAZ: Record<PapelEmpresa, string> = {
  dono: 'Tudo, inclusive o plano',
  gerente: 'Configura a academia, a grade e a equipe',
  recepcao: 'Alunos, aula experimental e a caixa de mensagens',
  professor: 'Fichas, graduação e a presença das aulas',
}

export function Equipe() {
  const c = usePainel()
  const s = useSessao()
  const avisar = useAviso()
  const e = c.empresa
  const [convidando, setConvidando] = useState(false)
  const [mudando, setMudando] = useState<string | null>(null)
  const ativas = e.unidades.filter((u) => u.ativa)

  const mudar = async (m: MembroEquipe, papel: PapelEmpresa, unidades = m.unidades) => {
    setMudando(m.id)
    try {
      c.mudar((await painel.equipe(c.slug, m.id, papel, unidades)).empresa)
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setMudando(null)
    }
  }
  const remover = async (m: MembroEquipe) => {
    if (!confirm(`Tirar ${m.nome} da equipe? As turmas dele ficam sem professor; as fichas que ele montou continuam com os alunos.`)) return
    setMudando(m.id)
    try {
      c.mudar((await painel.removerEquipe(c.slug, m.id)).empresa)
      avisar(`${primeiroNome(m.nome)} saiu da equipe.`)
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setMudando(null)
    }
  }
  const ordem: PapelEmpresa[] = ['dono', 'gerente', 'recepcao', 'professor']
  const equipe = [...e.equipe].sort((a, b) => ordem.indexOf(a.papel) - ordem.indexOf(b.papel) || a.nome.localeCompare(b.nome))

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo text-4xl">Equipe</h1>
          <p className="mt-1 max-w-2xl text-sm text-suave">Cada papel vê o que é dele. Para a recepção e a gerência, convide a pessoa e troque o papel aqui depois que ela entrar.</p>
        </div>
        <button type="button" className="btn btn-anilha btn-m" onClick={() => setConvidando(true)}>
          <PiChalkboardTeacher /> Convidar professor
        </button>
      </header>

      <ul className="cartao divide-y divide-linha overflow-hidden">
        {equipe.map((m) => {
          const eu = m.id === s.usuario?.id
          const fixo = m.papel === 'dono' || eu
          return (
            <li key={m.id} className={`p-4 sm:p-5 ${mudando === m.id ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-center gap-3">
                <Avatar nome={m.nome} tamanho={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {m.nome}
                    {eu ? <span className="text-fraco"> · você</span> : ''}
                  </p>
                  <p className="text-xs text-suave">
                    {O_QUE_FAZ[m.papel]} · desde {dataPorExtenso(dataDe(m.desde))}
                  </p>
                </div>
                {fixo ? (
                  <Selo tom={m.papel === 'dono' ? 'marca' : 'neutro'}>{NOMES_PAPEL[m.papel]}</Selo>
                ) : (
                  <div className="flex items-center gap-1">
                    <select className="campo h-10 w-auto py-0 pr-9 text-sm" value={m.papel} disabled={mudando === m.id} onChange={(ev) => mudar(m, ev.target.value as PapelEmpresa)} aria-label={`Papel de ${m.nome}`}>
                      {(['gerente', 'recepcao', 'professor'] as const).map((p) => (
                        <option key={p} value={p}>
                          {NOMES_PAPEL[p]}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="grid size-10 place-items-center rounded-full text-perigo hover:bg-sup-2" onClick={() => remover(m)} aria-label={`Tirar ${m.nome} da equipe`}>
                      <PiTrash />
                    </button>
                  </div>
                )}
              </div>
              {ativas.length > 1 && m.papel !== 'dono' && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-14 text-xs">
                  <span className="text-fraco">Unidades:</span>
                  <button type="button" className="chip" aria-pressed={m.unidades.length === 0} disabled={fixo || mudando === m.id} onClick={() => mudar(m, m.papel, [])}>
                    Todas
                  </button>
                  {ativas.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="chip"
                      aria-pressed={m.unidades.includes(u.id)}
                      disabled={fixo || mudando === m.id}
                      onClick={() => {
                        const lista = m.unidades.includes(u.id) ? m.unidades.filter((x) => x !== u.id) : [...m.unidades, u.id]
                        mudar(m, m.papel, lista.length === ativas.length ? [] : lista)
                      }}
                    >
                      {u.nome}
                    </button>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <section className="cartao p-5" aria-label="Agenda dos professores">
        <Interruptor
          ligado={e.agendaProfessores}
          desativado={mudando === 'agenda'}
          rotulo="Agenda dos professores"
          descricao="Ligada, o aluno da academia marca horário com o professor pela agenda dele, nos dias e horas que ele abrir (como no personal). Desligada, só as aulas da grade."
          aoMudar={async (v) => {
            setMudando('agenda')
            try {
              c.mudar((await painel.agendaProfessores(c.slug, v)).empresa)
              esquecer('agenda')
              avisar(v ? 'Os alunos já podem marcar horário com os professores.' : 'Agenda dos professores desligada.')
            } catch (err) {
              avisar(mensagemDeErro(err), 'erro')
            } finally {
              setMudando(null)
            }
          }}
        />
      </section>

      <Convidar
        aberta={convidando}
        aoFechar={() => setConvidando(false)}
        titulo="Convidar professor"
        explica="O professor abre o link e entra na equipe: monta as fichas, gradua e marca a presença das aulas. Uma conta serve para todas as academias onde ele dá aula."
        criar={(x) => painel.convite(c.slug, { tipo: 'professor', ...x })}
        mensagem={(nome, link) => `${nome ? `Oi, ${primeiroNome(nome)}! ` : 'Oi! '}Este é o convite para a equipe da ${e.nome} na Turma: ${link}`}
      />
    </div>
  )
}
