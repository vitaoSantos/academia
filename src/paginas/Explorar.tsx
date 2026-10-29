import { useEffect, useMemo, useState } from 'react'
import { PiCrown, PiGlobeSimple, PiListBullets, PiMagnifyingGlass, PiMapTrifold, PiStarFill } from 'react-icons/pi'
import { EscolherLocal } from '../components/local/EscolherCidade'
import { LogoDaMarca } from '../components/marca/Marca'
import { Mapa, type Linha, type Marcador } from '../components/mapa/Mapa'
import { Rodape } from '../components/layout/Rodape'
import { Topo } from '../components/layout/Topo'
import { Avatar, Carregando, Erro, NotaTexto, Selo, Vazio } from '../components/ui/basicos'
import { explorar, mensagemDeErro } from '../lib/api'
import { useDados } from '../lib/dados'
import { definirLocal, useLocal } from '../lib/local'
import { Link, useEndereco } from '../lib/rotas'
import { usePreferencia, temaAgora } from '../lib/tema'
import { useTitulo } from '../lib/titulo'
import { nomeCidade, textoDistancia } from '../shared/geo'
import { nomeModalidade } from '../shared/modalidades'
import type { ProfissionalAchado, UnidadeAchada } from '../shared/respostas'
import { reais } from '../shared/texto'

// O mapa da região (seção 15 do estudo): as academias, os estúdios, os CTs e os personais num raio
// em volta de quem procura. Não pede conta.

type Tipo = 'todos' | 'academias' | 'personais'

const NOMES_TIPO: Record<string, string> = { academia: 'Academia', rede: 'Academia', estudio: 'Estúdio', box: 'Box', ct: 'CT de lutas', danca: 'Escola de dança', aquatica: 'Natação' }

// Um círculo (o raio da região) como linha no mapa
function circulo(lat: number, lng: number, km: number): [number, number][] {
  const pontos: [number, number][] = []
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * 2 * Math.PI
    pontos.push([lng + (km / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.cos(a), lat + (km / 110.57) * Math.sin(a)])
  }
  return pontos
}

export default function Explorar() {
  useTitulo('Academias e personais perto de você')
  const { busca } = useEndereco()
  const local = useLocal()
  const tema = temaAgora(usePreferencia())

  // o endereço manda primeiro (o link da capa já vem com a região)
  useEffect(() => {
    const lat = Number(busca.get('lat'))
    const lng = Number(busca.get('lng'))
    if (Number.isFinite(lat) && Number.isFinite(lng) && busca.get('lat')) {
      const raio = Number(busca.get('raio')) || local.raio
      if (Math.abs(lat - local.ponto.lat) > 1e-4 || Math.abs(lng - local.ponto.lng) > 1e-4 || raio !== local.raio) definirLocal({ ...local, ponto: { lat, lng }, raio })
    }
  }, [])

  const [tipo, setTipo] = useState<Tipo>((busca.get('tipo') as Tipo) || 'todos')
  const [modalidade, setModalidade] = useState(busca.get('modalidade') ?? '')
  const [termo, setTermo] = useState('')
  const [buscaFeita, setBuscaFeita] = useState('')
  const [ordem, setOrdem] = useState<'distancia' | 'nota'>('distancia')
  const [agregador, setAgregador] = useState<'' | 'wellhub' | 'totalpass'>('')
  const [vista, setVista] = useState<'mapa' | 'lista'>('lista')
  const [escolhido, setEscolhido] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setBuscaFeita(termo.trim()), 350)
    return () => clearTimeout(t)
  }, [termo])

  const chave = `explorar:${local.ponto.lat.toFixed(4)}:${local.ponto.lng.toFixed(4)}:${local.raio}:${tipo}:${modalidade}:${buscaFeita}:${ordem}:${agregador}`
  const r = useDados(chave, () =>
    explorar({ lat: local.ponto.lat, lng: local.ponto.lng, raio: local.raio, tipo, modalidade: modalidade || undefined, busca: buscaFeita || undefined, ordem, wellhub: agregador === 'wellhub', totalpass: agregador === 'totalpass' }),
  )
  const dados = r.dados

  const marcadores = useMemo<Marcador[]>(() => {
    if (!dados) return []
    const m: Marcador[] = [
      {
        id: 'voce',
        lat: local.ponto.lat,
        lng: local.ponto.lng,
        z: 1,
        conteudo: (
          <span className="relative grid size-5 place-items-center" title="Você">
            <span className="absolute size-5 animate-ping rounded-full bg-info/40" />
            <span className="size-3.5 rounded-full border-2 border-white bg-info shadow" />
          </span>
        ),
      },
    ]
    for (const u of dados.unidades)
      m.push({
        id: `u-${u.empresa}-${u.unidade}`,
        lat: u.ponto.lat,
        lng: u.ponto.lng,
        ancora: 'bottom',
        z: escolhido === `u-${u.empresa}-${u.unidade}` ? 30 : u.destaqueAgora ? 20 : 10,
        conteudo: (
          <button type="button" onClick={() => setEscolhido(`u-${u.empresa}-${u.unidade}`)} className="flex flex-col items-center" aria-label={`${u.nome} · ${u.unidadeNome}`}>
            <span className={`grid size-9 place-items-center rounded-full border-[3px] border-white text-xs font-black shadow-lg transition-transform ${escolhido === `u-${u.empresa}-${u.unidade}` ? 'scale-125' : ''}`} style={{ background: u.cor, color: '#111' }}>
              {u.nome.charAt(0)}
            </span>
            <span className="-mt-1 size-2 rotate-45 bg-white" />
          </button>
        ),
      })
    for (const p of dados.profissionais)
      m.push({
        id: `p-${p.id}`,
        lat: p.ponto.lat,
        lng: p.ponto.lng,
        z: escolhido === `p-${p.id}` ? 30 : 12,
        conteudo: (
          <button type="button" onClick={() => setEscolhido(`p-${p.id}`)} className={`rounded-full border-[3px] shadow-lg transition-transform ${escolhido === `p-${p.id}` ? 'scale-125' : ''}`} style={{ borderColor: p.cor }} aria-label={p.nome}>
            <Avatar nome={p.nome} foto={p.foto} tamanho={32} />
          </button>
        ),
      })
    return m
  }, [dados, escolhido, local.ponto.lat, local.ponto.lng])

  const linhas = useMemo<Linha[]>(() => [{ id: 'raio', caminho: circulo(local.ponto.lat, local.ponto.lng, local.raio), cor: '#f5c518', largura: 2, tracejada: true, opacidade: 0.8 }], [local.ponto.lat, local.ponto.lng, local.raio])
  const ajustar = useMemo(() => {
    const c = circulo(local.ponto.lat, local.ponto.lng, local.raio)
    return [c[0], c[18], c[36], c[54]].map(([lng, lat]) => ({ lat, lng }))
  }, [local.ponto.lat, local.ponto.lng, local.raio])

  const selecionado = escolhido && dados ? (escolhido.startsWith('u-') ? dados.unidades.find((u) => `u-${u.empresa}-${u.unidade}` === escolhido) : dados.profissionais.find((p) => `p-${p.id}` === escolhido)) : null

  const destaques = dados ? [...dados.unidades.filter((u) => u.destaqueAgora), ...dados.profissionais.filter((p) => p.destaqueAgora)] : []
  const total = dados ? dados.unidades.length + dados.profissionais.length : 0

  return (
    <div className="min-h-[100svh]">
      <Topo />
      <div className="mx-auto max-w-[1600px] lg:grid lg:grid-cols-[minmax(0,34rem)_1fr]">
        {/* os filtros e a lista */}
        <section className="margem py-6 lg:h-[calc(100svh-4rem)] lg:overflow-y-auto" aria-label="Resultados">
          <h1 className="titulo text-4xl">Perto de você</h1>
          <p className="mt-1 text-sm text-suave">
            {nomeCidade(local.cidade)} e até {local.raio} km{local.gps ? ' (pelo GPS)' : ''}
          </p>
          <div className="mt-4">
            <EscolherLocal />
          </div>

          <div className="mt-5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="O que procurar">
            {(['todos', 'academias', 'personais'] as Tipo[]).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={tipo === t} className="chip" onClick={() => setTipo(t)}>
                {{ todos: 'Tudo', academias: 'Academias e estúdios', personais: 'Personais' }[t]}
              </button>
            ))}
          </div>

          <div className="relative mt-3">
            <PiMagnifyingGlass className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fraco" aria-hidden />
            <input className="campo pl-10" placeholder="Nome, bairro ou especialidade" value={termo} onChange={(e) => setTermo(e.target.value)} aria-label="Buscar" />
          </div>

          {dados && dados.modalidades.length > 0 && (
            <div className="sem-barra -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Modalidade">
              <button type="button" role="radio" aria-checked={!modalidade} className="chip" onClick={() => setModalidade('')}>
                Todas as modalidades
              </button>
              {dados.modalidades.map((m) => (
                <button key={m.id} type="button" role="radio" aria-checked={modalidade === m.id} className="chip" onClick={() => setModalidade(modalidade === m.id ? '' : m.id)}>
                  {nomeModalidade(m.id)} <span className="dado text-fraco">{m.unidades}</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <button type="button" className="chip" aria-pressed={ordem === 'nota'} onClick={() => setOrdem(ordem === 'nota' ? 'distancia' : 'nota')}>
              <PiStarFill /> Melhor nota primeiro
            </button>
            <button type="button" className="chip" aria-pressed={agregador === 'wellhub'} onClick={() => setAgregador(agregador === 'wellhub' ? '' : 'wellhub')}>
              Aceita Wellhub
            </button>
            <button type="button" className="chip" aria-pressed={agregador === 'totalpass'} onClick={() => setAgregador(agregador === 'totalpass' ? '' : 'totalpass')}>
              Aceita TotalPass
            </button>
            <button type="button" className="chip ml-auto lg:hidden" onClick={() => setVista(vista === 'mapa' ? 'lista' : 'mapa')}>
              {vista === 'mapa' ? <PiListBullets /> : <PiMapTrifold />} {vista === 'mapa' ? 'Lista' : 'Mapa'}
            </button>
          </div>

          {/* no celular, o mapa entra no lugar da lista */}
          {vista === 'mapa' && (
            <div className="mt-4 h-[60svh] overflow-hidden rounded-2xl border border-linha lg:hidden">
              <Mapa centro={local.ponto} zoom={9} regiao predios={false} marcadores={marcadores} linhas={linhas} ajustar={ajustar} folga={30} tema={tema} className="h-full" />
            </div>
          )}

          <div className={`mt-5 ${vista === 'mapa' ? 'hidden lg:block' : ''}`} aria-live="polite">
            {r.carregando && !dados ? (
              <Carregando />
            ) : r.erro && !dados ? (
              <Erro mensagem={mensagemDeErro(r.erro)} aoTentar={r.recarregar} />
            ) : dados && total === 0 && dados.online.length === 0 ? (
              <Vazio titulo="Nada por aqui ainda" texto={`Não achamos ${modalidade ? nomeModalidade(modalidade).toLowerCase() : 'academias nem personais'} a até ${local.raio} km. Aumente a distância ou troque a cidade.`}>
                {local.raio < 100 && (
                  <button type="button" className="btn btn-sup btn-m" onClick={() => definirLocal({ ...local, raio: 100 })}>
                    Procurar até 100 km
                  </button>
                )}
              </Vazio>
            ) : dados ? (
              <>
                <p className="text-sm text-suave">
                  {total} {total === 1 ? 'lugar' : 'lugares'} perto de você
                </p>
                {destaques.length > 0 && (
                  <div className="mt-4">
                    <p className="sobre flex items-center gap-1.5">
                      <PiCrown className="text-anilha-legivel" /> Destaques da região
                    </p>
                    <div className="mt-2 space-y-2">
                      {destaques.map((d) => ('empresa' in d ? <CartaoUnidade key={`d-${d.empresa}-${d.unidade}`} u={d} /> : <CartaoProfissional key={`d-${d.id}`} p={d} />))}
                    </div>
                  </div>
                )}
                {dados.unidades.filter((u) => !u.destaqueAgora).length > 0 && (
                  <div className="mt-6">
                    <p className="sobre">Academias, estúdios e CTs</p>
                    <div className="mt-2 space-y-2">
                      {dados.unidades
                        .filter((u) => !u.destaqueAgora)
                        .map((u) => (
                          <CartaoUnidade key={`${u.empresa}-${u.unidade}`} u={u} />
                        ))}
                    </div>
                  </div>
                )}
                {dados.profissionais.filter((p) => !p.destaqueAgora).length > 0 && (
                  <div className="mt-6">
                    <p className="sobre">Personais e professores</p>
                    <div className="mt-2 space-y-2">
                      {dados.profissionais
                        .filter((p) => !p.destaqueAgora)
                        .map((p) => (
                          <CartaoProfissional key={p.id} p={p} />
                        ))}
                    </div>
                  </div>
                )}
                {dados.online.length > 0 && (
                  <div className="mt-6">
                    <p className="sobre flex items-center gap-1.5">
                      <PiGlobeSimple /> Atendem online (de qualquer lugar)
                    </p>
                    <div className="mt-2 space-y-2">
                      {dados.online.map((p) => (
                        <CartaoProfissional key={`o-${p.id}`} p={p} online />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </section>

        {/* o mapa (computador) */}
        <div className="relative hidden h-[calc(100svh-4rem)] lg:sticky lg:top-16 lg:block">
          <Mapa centro={local.ponto} zoom={9} regiao predios={false} marcadores={marcadores} linhas={linhas} ajustar={ajustar} folga={40} tema={tema} className="h-full" />
          {selecionado && (
            <div className="absolute right-4 bottom-4 left-4 mx-auto max-w-md">
              <div className="relative">
                {'empresa' in selecionado ? <CartaoUnidade u={selecionado} /> : <CartaoProfissional p={selecionado} />}
                <button type="button" onClick={() => setEscolhido(null)} className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-sup-3 text-sm" aria-label="Fechar">
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="lg:hidden">
        <Rodape />
      </div>
    </div>
  )
}

function CartaoUnidade({ u }: { u: UnidadeAchada }) {
  return (
    <Link para={`/${u.empresa}${u.unidades > 1 ? `?unidade=${u.unidade}` : ''}`} className="cartao flex gap-3.5 p-4 transition-colors hover:border-linha-2">
      <LogoDaMarca visual={{ preset: 'ferro', destaque: u.cor, logo: u.logo }} nome={u.nome} tamanho={52} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 font-bold">
            <span className="block truncate">{u.nome}</span>
            {u.unidades > 1 && <span className="block truncate text-sm font-semibold text-suave">{u.unidadeNome}</span>}
          </p>
          <span className="dado shrink-0 text-sm font-bold">{textoDistancia(u.km)}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-fraco">
          {NOMES_TIPO[u.tipo] ?? 'Academia'} · {u.bairro ? `${u.bairro}, ` : ''}
          {u.cidade.nome}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          {u.destaqueAgora && <Selo tom="marca">Destaque</Selo>}
          <NotaTexto nota={u.nota} className="font-semibold" />
          {u.modalidades.slice(0, 3).map((m) => (
            <span key={m} className="rounded-full bg-sup-2 px-2 py-0.5 text-suave">
              {nomeModalidade(m)}
            </span>
          ))}
          {u.modalidades.length > 3 && <span className="text-fraco">+{u.modalidades.length - 3}</span>}
        </div>
        {(u.precoDesde || u.agregadores.length > 0) && (
          <p className="mt-2 text-xs text-suave">
            {u.precoDesde ? `A partir de ${reais(u.precoDesde)}/mês` : ''}
            {u.precoDesde && u.agregadores.length ? ' · ' : ''}
            {u.agregadores.map((a) => (a === 'wellhub' ? 'Wellhub' : 'TotalPass')).join(' e ')}
          </p>
        )}
      </div>
    </Link>
  )
}

function CartaoProfissional({ p, online = false }: { p: ProfissionalAchado; online?: boolean }) {
  return (
    <Link para={`/${p.slug}`} className="cartao flex gap-3.5 p-4 transition-colors hover:border-linha-2">
      <span className="rounded-full border-[3px]" style={{ borderColor: p.cor }}>
        <Avatar nome={p.nome} foto={p.foto} tamanho={46} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-bold">{p.nome}</p>
          {!online && <span className="dado shrink-0 text-sm font-bold">{textoDistancia(p.km)}</span>}
        </div>
        <p className="mt-0.5 truncate text-xs text-fraco">
          {p.personal ? 'Personal' : 'Professor'} · {p.especialidades.slice(0, 2).join(', ') || nomeModalidade(p.modalidades[0] ?? 'musculacao')}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          {p.destaqueAgora && <Selo tom="marca">Destaque</Selo>}
          {p.online && <Selo tom="ok">Online</Selo>}
          <NotaTexto nota={p.nota} className="font-semibold" />
          {p.alunos > 0 && <span className="text-suave">· {p.alunos} alunos instruídos</span>}
        </div>
        {p.locais.length > 0 && <p className="mt-1.5 truncate text-xs text-suave">Dá aula em: {p.locais.map((l) => l.nome).join(', ')}</p>}
      </div>
    </Link>
  )
}
