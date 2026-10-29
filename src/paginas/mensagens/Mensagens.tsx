import { PiChatCircleDots } from 'react-icons/pi'
import { AppAluno } from '../../components/layout/AppAluno'
import { Avatar, Carregando, Erro, Vazio } from '../../components/ui/basicos'
import { conversas, mensagemDeErro } from '../../lib/api'
import { useDados } from '../../lib/dados'
import { Link, navegar, useEndereco } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import { tempoAtras } from '../../shared/texto'

// As conversas (seção 17 do estudo): as da pessoa e, para quem atende a academia (dono, gerente,
// recepção), a caixa da academia, que a equipe responde junto

export const caixasDaEquipe = (empresas: { slug: string; nome: string; papel: string }[]) => empresas.filter((e) => ['dono', 'gerente', 'recepcao'].includes(e.papel))

export default function Mensagens() {
  useTitulo('Mensagens')
  const s = useSessao()
  const { busca } = useEndereco()
  const como = busca.get('como') ?? ''
  const caixas = caixasDaEquipe(s.empresas)
  const lista = useDados(s.usuario ? `conversas:${s.usuario.id}:${como}` : null, () => conversas.lista(como || undefined))
  const sufixo = como ? `?como=${encodeURIComponent(como)}` : ''
  return (
    <AppAluno titulo="Mensagens">
      {caixas.length > 0 && (
        <div className="sem-barra -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4" role="tablist" aria-label="Caixa">
          <button type="button" role="tab" aria-selected={!como} className="chip shrink-0" onClick={() => navegar('/mensagens', { substituir: true })}>
            As minhas
          </button>
          {caixas.map((c) => (
            <button key={c.slug} type="button" role="tab" aria-selected={como === c.slug} className="chip shrink-0" onClick={() => navegar(`/mensagens?como=${c.slug}`, { substituir: true })}>
              Caixa da {c.nome}
            </button>
          ))}
        </div>
      )}
      {!lista.dados ? (
        lista.erro ? <Erro mensagem={mensagemDeErro(lista.erro)} aoTentar={lista.recarregar} /> : <Carregando />
      ) : lista.dados.conversas.length === 0 ? (
        <div className="cartao">
          <Vazio icone={<PiChatCircleDots />} titulo="Nenhuma conversa ainda" texto="Fale com a sua academia e com o seu personal pela página deles. Entre alunos, a conversa abre quando os dois se seguem.">
            <Link para="/explorar" className="btn btn-sup btn-m">
              Achar academia e personal
            </Link>
          </Vazio>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-linha bg-sup">
          {lista.dados.conversas.map((c) => {
            const nova = !c.deMim && (!c.lidaEm || c.lidaEm < c.ultimaEm)
            return (
              <li key={c.id} className="border-t border-linha first:border-t-0">
                <Link para={`/mensagens/${c.id}${sufixo}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-sup-2">
                  <Avatar nome={c.nome} tamanho={44} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate ${nova ? 'font-bold' : 'font-semibold'}`}>{c.nome}</span>
                      <span className="shrink-0 text-xs text-fraco">{tempoAtras(c.ultimaEm)}</span>
                    </span>
                    <span className={`block truncate text-sm ${nova ? 'text-texto' : 'text-suave'}`}>
                      {c.deMim ? 'Você: ' : ''}
                      {c.ultima}
                    </span>
                  </span>
                  {nova && <span className="size-2.5 shrink-0 rounded-full bg-anilha" aria-label="Nova" />}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </AppAluno>
  )
}
