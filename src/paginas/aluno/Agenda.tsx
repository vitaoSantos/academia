import { useState } from 'react'
import { PiCalendarBlank, PiChatCircleDots } from 'react-icons/pi'
import { MarcarSessao } from '../../components/agenda/MarcarSessao'
import { AppAluno, useVinculos } from '../../components/layout/AppAluno'
import { useAviso } from '../../components/ui/Aviso'
import { Carregando, Erro, Selo, Vazio } from '../../components/ui/basicos'
import { agenda, conversas, mensagemDeErro } from '../../lib/api'
import { esquecer, useDados } from '../../lib/dados'
import { Link, navegar } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import type { SessaoDoAluno } from '../../shared/respostas'
import { agoraNoFuso, dataPorExtenso, textoData } from '../../shared/tempo'
import { primeiroNome } from '../../shared/texto'

// A agenda com o personal (seção 10 do estudo): as sessões marcadas, desmarcar com antecedência e
// marcar nos horários livres que ele abriu

const STATUS: Record<SessaoDoAluno['status'], { nome: string; tom: 'ok' | 'alerta' | 'perigo' | 'neutro' }> = {
  marcada: { nome: 'Marcada', tom: 'ok' },
  feita: { nome: 'Feita', tom: 'neutro' },
  faltou: { nome: 'Faltou', tom: 'perigo' },
  cancelada: { nome: 'Desmarcada', tom: 'neutro' },
}

export default function Agenda() {
  useTitulo('Agenda')
  const s = useSessao()
  const avisar = useAviso()
  const dados = useDados(s.usuario ? `agenda:${s.usuario.id}` : null, () => agenda.minhas())
  const minhas = { ...dados, dados: dados.dados?.sessoes }
  const professores = dados.dados?.professores ?? []
  const vinculos = useVinculos()
  const personais = (vinculos.dados ?? []).filter((v) => v.tipo === 'profissional' && v.status === 'ativo')
  const [marcando, setMarcando] = useState<string | null>(null)
  // com quem dá para marcar: o personal e os professores da academia que abriram a agenda
  const comQuem = [...personais.map((p) => ({ id: p.id, nome: p.nome, sub: 'Personal' })), ...professores.map((p) => ({ id: p.id, nome: p.nome, sub: `Professor da ${p.empresaNome}` }))]
  const hoje = agoraNoFuso().data
  const proximas = (minhas.dados ?? []).filter((x) => x.data >= hoje && x.status === 'marcada')
  const antes = (minhas.dados ?? []).filter((x) => !(x.data >= hoje && x.status === 'marcada')).reverse()

  const desmarcar = async (x: SessaoDoAluno) => {
    if (!confirm(`Desmarcar ${textoData(x.data)} às ${x.inicio}?`)) return
    try {
      await agenda.mudar({ pro: x.profissional, id: x.id, data: x.data, status: 'cancelada' })
      avisar('Desmarcada. O seu personal foi avisado.')
      esquecer('inicio:')
      await dados.recarregar()
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    }
  }

  const conversar = async (id: string) => {
    try {
      const { id: conversa } = await conversas.abrir({ tipo: 'conta', id })
      navegar(`/mensagens/${conversa}`)
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    }
  }

  return (
    <AppAluno titulo="Agenda">
      {!minhas.dados ? (
        dados.erro ? (
          <Erro mensagem={mensagemDeErro(dados.erro)} aoTentar={dados.recarregar} />
        ) : (
          <Carregando />
        )
      ) : (
        <div className="space-y-7">
          <section aria-labelledby="proximas">
            <h2 id="proximas" className="mb-2 font-bold">
              Próximas sessões
            </h2>
            {proximas.length === 0 ? (
              <p className="text-sm text-suave">Nenhuma sessão marcada.</p>
            ) : (
              <ul className="space-y-2">
                {proximas.map((x) => (
                  <li key={x.id} className="cartao flex items-center gap-3 p-4">
                    <span className="w-16 shrink-0 text-center">
                      <span className="block text-[0.65rem] font-bold text-fraco uppercase">{textoData(x.data)}</span>
                      <span className="dado block text-lg font-bold">{x.inicio}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">Com {x.profissionalNome}</span>
                      <span className="block truncate text-xs text-suave">
                        até {x.fim}
                        {x.local ? ` · ${x.local}` : ''}
                      </span>
                    </span>
                    <button type="button" className="btn btn-fantasma btn-p" onClick={() => desmarcar(x)}>
                      Desmarcar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {comQuem.length > 0 ? (
            comQuem.map((p) => (
              <section key={p.id} className="cartao p-5" aria-labelledby={`marcar-${p.id}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 id={`marcar-${p.id}`} className="font-bold">
                    Marcar com {primeiroNome(p.nome)}
                    <span className="block text-xs font-normal text-suave">{p.sub}</span>
                  </h2>
                  <button type="button" className="btn btn-fantasma btn-p" onClick={() => conversar(p.id)}>
                    <PiChatCircleDots /> Conversar
                  </button>
                </div>
                {marcando === p.id ? (
                  <div className="mt-4">
                    <MarcarSessao
                      pro={{ id: p.id, nome: p.nome }}
                      aoMarcar={() => {
                        esquecer('inicio:')
                        void dados.recarregar()
                      }}
                    />
                  </div>
                ) : (
                  <button type="button" className="btn btn-anilha btn-m mt-4" onClick={() => setMarcando(p.id)}>
                    <PiCalendarBlank /> Ver os horários livres
                  </button>
                )}
              </section>
            ))
          ) : (
            <div className="cartao">
              <Vazio titulo="Sem agenda por aqui" texto="Quando você treinar com um personal da Turma (ou a sua academia abrir a agenda dos professores), marca os horários nesta tela.">
                <Link para="/explorar?tipo=personais" className="btn btn-sup btn-m">
                  Achar um personal
                </Link>
              </Vazio>
            </div>
          )}

          {antes.length > 0 && (
            <section aria-labelledby="antes">
              <h2 id="antes" className="mb-2 font-bold">
                Anteriores
              </h2>
              <ul className="divide-y divide-linha overflow-hidden rounded-2xl border border-linha bg-sup">
                {antes.slice(0, 20).map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span>
                      {dataPorExtenso(x.data)} · {x.inicio}
                      <span className="block text-xs text-suave">{x.profissionalNome}</span>
                    </span>
                    <Selo tom={STATUS[x.status].tom}>{STATUS[x.status].nome}</Selo>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </AppAluno>
  )
}
