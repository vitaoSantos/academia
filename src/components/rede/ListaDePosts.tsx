import { useEffect, useState, type ReactNode } from 'react'
import { mensagemDeErro } from '../../lib/api'
import { useDados } from '../../lib/dados'
import type { Feed, PostVisto } from '../../shared/respostas'
import { Carregando, Erro, Girando } from '../ui/basicos'
import { CartaoPost } from './CartaoPost'

// Uma lista de posts com "ver mais" (o feed, o perfil, a academia)
export function ListaDePosts({ chave, carregar, vazio, antes }: { chave: string | null; carregar: (antes?: string) => Promise<Feed>; vazio: ReactNode; antes?: ReactNode }) {
  const primeira = useDados(chave, () => carregar())
  const [posts, setPosts] = useState<PostVisto[] | null>(null)
  const [mais, setMais] = useState<string | null>(null)
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    if (!primeira.dados) return
    setPosts(primeira.dados.posts)
    setMais(primeira.dados.mais)
  }, [primeira.dados])

  const verMais = async () => {
    if (!mais) return
    setBuscando(true)
    try {
      const r = await carregar(mais)
      setPosts((l) => [...(l ?? []), ...r.posts.filter((p) => !l?.some((x) => x.id === p.id))])
      setMais(r.mais)
    } finally {
      setBuscando(false)
    }
  }

  const mudar = (p: PostVisto) => setPosts((l) => l?.map((x) => (x.id === p.id ? p : x)) ?? l)
  const tirar = (id: string) => setPosts((l) => l?.filter((x) => x.id !== id) ?? l)

  if (!posts) {
    if (primeira.erro) return <Erro mensagem={mensagemDeErro(primeira.erro)} aoTentar={primeira.recarregar} />
    return <Carregando />
  }
  return (
    <div className="space-y-3">
      {antes}
      {posts.length === 0 ? vazio : posts.map((p) => <CartaoPost key={p.id} post={p} aoMudar={mudar} aoApagar={tirar} />)}
      {mais && (
        <button type="button" className="btn btn-sup btn-m w-full" onClick={verMais} disabled={buscando}>
          {buscando ? <Girando /> : 'Ver mais'}
        </button>
      )}
    </div>
  )
}
