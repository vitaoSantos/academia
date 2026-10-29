import { useState } from 'react'
import { PiMapPin, PiPencilSimpleLine, PiTrophy, PiUserPlus } from 'react-icons/pi'
import { Moldura } from '../../components/layout/Moldura'
import { EscolherLocal } from '../../components/local/EscolherCidade'
import { Compor } from '../../components/rede/Compor'
import { ListaDePosts } from '../../components/rede/ListaDePosts'
import { Abas, Avatar, Folha } from '../../components/ui/basicos'
import { rede } from '../../lib/api'
import { useDados } from '../../lib/dados'
import { useLocal } from '../../lib/local'
import { Link } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'

// A rede (seção 16 do estudo): o feed da região (só o que está no raio escolhido: quem treina em São
// Lourenço não vê Poços de Caldas), quem a pessoa segue e a turma da academia dela

type Aba = 'perto' | 'seguindo' | 'academia'

export default function Rede() {
  useTitulo('Rede')
  const s = useSessao()
  const local = useLocal()
  const [aba, setAba] = useState<Aba>('perto')
  const [compondo, setCompondo] = useState(false)
  const [regiao, setRegiao] = useState(false)
  const [versao, setVersao] = useState(0)
  const pedidos = useDados(s.usuario && !s.usuario.publico ? `pedidos:${s.usuario.id}` : null, () => rede.pedidos())
  const logado = !!s.usuario
  const atual: Aba = logado ? aba : 'perto'
  const chave =
    atual === 'perto'
      ? `feed:perto:${local.ponto.lat.toFixed(3)}:${local.ponto.lng.toFixed(3)}:${local.raio}:${versao}`
      : `feed:${atual}:${s.usuario?.id}:${versao}`

  return (
    <Moldura largo={false}>
      <div className="flex items-end justify-between gap-3">
        <h1 className="titulo text-4xl">Rede</h1>
        <Link para="/desafios" className="btn btn-fantasma btn-p">
          <PiTrophy /> Desafios
        </Link>
      </div>

      {logado && (
        <Abas<Aba>
          className="mt-4"
          valor={atual}
          aoMudar={setAba}
          opcoes={[
            { id: 'perto', rotulo: 'Perto' },
            { id: 'seguindo', rotulo: 'Seguindo' },
            { id: 'academia', rotulo: 'Minha academia' },
          ]}
        />
      )}

      {atual === 'perto' && (
        <button type="button" onClick={() => setRegiao(true)} className="mt-3 flex items-center gap-1.5 text-sm text-suave hover:text-texto">
          <PiMapPin /> Perto de {local.cidade.nome} ({local.cidade.uf}) · até {local.raio} km <span className="underline">trocar</span>
        </button>
      )}

      {pedidos.dados && pedidos.dados.pedidos.length > 0 && (
        <Link para="/rede/pedidos" className="cartao mt-4 flex items-center gap-3 p-4 hover:border-linha-2">
          <PiUserPlus className="text-xl text-anilha-legivel" />
          <span className="flex-1 text-sm font-semibold">
            {pedidos.dados.pedidos.length === 1 ? `${pedidos.dados.pedidos[0].nome} quer seguir você` : `${pedidos.dados.pedidos.length} pedidos para seguir você`}
          </span>
          <span className="text-xs text-suave">Ver</span>
        </Link>
      )}

      <div className="mt-4">
        <ListaDePosts
          key={chave}
          chave={chave}
          carregar={(antes) => rede.feed({ modo: atual, ...(atual === 'perto' ? { lat: local.ponto.lat, lng: local.ponto.lng, raio: local.raio } : {}), antes })}
          antes={
            logado ? (
              <button type="button" onClick={() => setCompondo(true)} className="cartao flex w-full items-center gap-3 p-4 text-left hover:border-linha-2">
                <Avatar nome={s.usuario!.nome} foto={s.usuario!.foto} tamanho={40} />
                <span className="flex-1 text-suave">Como foi o treino?</span>
                <PiPencilSimpleLine className="text-xl text-fraco" />
              </button>
            ) : (
              <div className="cartao flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <p className="flex-1 text-sm text-suave">Entre para postar, dar 💪 e seguir a turma da sua cidade.</p>
                <Link para="/cadastro?volta=/rede" className="btn btn-anilha btn-p">
                  Criar conta grátis
                </Link>
              </div>
            )
          }
          vazio={
            <div className="cartao p-6 text-center text-sm text-suave">
              {atual === 'perto'
                ? `Ninguém postou perto de ${local.cidade.nome} ainda. Que tal ser o primeiro?`
                : atual === 'seguindo'
                  ? 'Siga pessoas da sua academia para ver os treinos delas aqui.'
                  : 'Quando você for aluno de uma academia, a turma dela aparece aqui.'}
            </div>
          }
        />
      </div>

      {logado && <Compor aberta={compondo} aoFechar={() => setCompondo(false)} aoPostar={() => setVersao((v) => v + 1)} />}
      <Folha aberta={regiao} aoFechar={() => setRegiao(false)} titulo="A sua região">
        <div className="p-6">
          <h2 className="titulo text-3xl">A sua região</h2>
          <p className="mt-1 mb-4 text-sm text-suave">O feed mostra os posts das academias e das pessoas dentro do raio.</p>
          <EscolherLocal aoMudar={() => setVersao((v) => v + 1)} />
        </div>
      </Folha>
    </Moldura>
  )
}
