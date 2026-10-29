import { useState } from 'react'
import { AppAluno } from '../../components/layout/AppAluno'
import { useAviso } from '../../components/ui/Aviso'
import { Avatar, Carregando, Erro, Vazio } from '../../components/ui/basicos'
import { mensagemDeErro, rede } from '../../lib/api'
import { esquecer, useDados } from '../../lib/dados'
import { Link } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'

// Quem pediu para seguir (o perfil privado aprova um por um)
export default function Pedidos() {
  useTitulo('Pedidos para seguir')
  const s = useSessao()
  const avisar = useAviso()
  const lista = useDados(s.usuario ? `pedidos:${s.usuario.id}` : null, () => rede.pedidos())
  const [fazendo, setFazendo] = useState<string | null>(null)
  const responder = async (id: string, aceitar: boolean) => {
    setFazendo(id)
    try {
      await rede.pedido(id, aceitar)
      lista.definir((d) => ({ pedidos: (d?.pedidos ?? []).filter((p) => p.id !== id) }))
      esquecer(`perfil:`)
      avisar(aceitar ? 'Aprovado: agora essa pessoa vê os seus posts.' : 'Recusado.')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setFazendo(null)
    }
  }
  return (
    <AppAluno titulo="Pedidos para seguir" voltar="/rede">
      {!lista.dados ? (
        lista.erro ? <Erro mensagem={mensagemDeErro(lista.erro)} /> : <Carregando />
      ) : lista.dados.pedidos.length === 0 ? (
        <div className="cartao">
          <Vazio titulo="Nenhum pedido" texto="Com o perfil privado, quem quiser seguir você pede aqui e você aprova." />
        </div>
      ) : (
        <ul className="space-y-2">
          {lista.dados.pedidos.map((p) => (
            <li key={p.id} className="cartao flex items-center gap-3 p-3.5">
              <Link para={`/u/${p.usuario}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar nome={p.nome} foto={p.foto} tamanho={42} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{p.nome}</span>
                  <span className="block truncate text-xs text-fraco">@{p.usuario}</span>
                </span>
              </Link>
              <button type="button" className="btn btn-anilha btn-p" disabled={fazendo === p.id} onClick={() => responder(p.id, true)}>
                Aprovar
              </button>
              <button type="button" className="btn btn-fantasma btn-p" disabled={fazendo === p.id} onClick={() => responder(p.id, false)}>
                Recusar
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppAluno>
  )
}
