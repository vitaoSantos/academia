import { useEffect, type ReactNode } from 'react'
import { PiBarbell, PiBell, PiCalendarCheck, PiChatCircleDots, PiClipboardText, PiHandFist, PiMedal, PiStar, PiTag, PiTrophy, PiUserPlus, PiUsersThree } from 'react-icons/pi'
import { AppAluno } from '../../components/layout/AppAluno'
import { Carregando, Erro, Vazio } from '../../components/ui/basicos'
import { avisos, mensagemDeErro } from '../../lib/api'
import { useDados } from '../../lib/dados'
import { Link } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import { tempoAtras } from '../../shared/texto'
import type { TipoAviso } from '../../shared/tipos'

// O sino: a ficha nova, a vaga que abriu na fila, o 💪, quem pediu para seguir, a faixa nova...
// Abrir a tela marca tudo como lido.

const ICONES: Record<TipoAviso, ReactNode> = {
  ficha: <PiClipboardText />,
  'ficha-vencendo': <PiClipboardText />,
  sessao: <PiCalendarCheck />,
  aula: <PiBarbell />,
  espera: <PiCalendarCheck />,
  experimental: <PiUsersThree />,
  forte: <PiHandFist />,
  comentario: <PiChatCircleDots />,
  seguidor: <PiUserPlus />,
  'pedido-seguir': <PiUserPlus />,
  mensagem: <PiChatCircleDots />,
  desafio: <PiTrophy />,
  avaliacao: <PiStar />,
  convite: <PiUserPlus />,
  vinculo: <PiUsersThree />,
  graduacao: <PiMedal />,
  marcado: <PiTag />,
}

export default function Avisos() {
  useTitulo('Avisos')
  const s = useSessao()
  const lista = useDados(s.usuario ? `avisos:${s.usuario.id}` : null, () => avisos.ler())
  // abriu: marca como lido (os contadores do topo atualizam)
  useEffect(() => {
    if (!lista.dados?.naoLidos) return
    void avisos.lidos().then(() => s.atualizar())
  }, [lista.dados?.naoLidos])

  return (
    <AppAluno titulo="Avisos">
      {!lista.dados ? (
        lista.erro ? <Erro mensagem={mensagemDeErro(lista.erro)} aoTentar={lista.recarregar} /> : <Carregando />
      ) : lista.dados.avisos.length === 0 ? (
        <div className="cartao">
          <Vazio icone={<PiBell />} titulo="Nada por aqui" texto="Quando chegar ficha nova, abrir vaga na aula ou alguém der 💪 no seu treino, avisamos aqui." />
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-linha bg-sup">
          {lista.dados.avisos.map((a) => (
            <li key={a.id} className="border-t border-linha first:border-t-0">
              <Link para={a.link} className={`flex items-start gap-3 px-4 py-3.5 hover:bg-sup-2 ${a.lido ? '' : 'bg-anilha-suave'}`}>
                <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full text-lg ${a.lido ? 'bg-sup-2 text-suave' : 'bg-anilha text-anilha-texto'}`}>{ICONES[a.tipo] ?? <PiBell />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">{a.texto}</span>
                  <span className="mt-0.5 block text-xs text-fraco">{tempoAtras(a.em)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppAluno>
  )
}
