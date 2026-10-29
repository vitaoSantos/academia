import { useState } from 'react'
import { PiChatCircleDots, PiDotsThree, PiFlag, PiGear, PiLockSimple, PiMapPin, PiProhibit, PiUserCheck, PiUserPlus } from 'react-icons/pi'
import { Rodape } from '../../components/layout/Rodape'
import { Topo } from '../../components/layout/Topo'
import { Denunciar } from '../../components/rede/Denunciar'
import { MARCA } from '../../data/marca'
import { ListaDePosts } from '../../components/rede/ListaDePosts'
import { useAviso } from '../../components/ui/Aviso'
import { Avatar, Carregando, Erro, Folha, Girando, Numero, Selo, Vazio } from '../../components/ui/basicos'
import { conversas, mensagemDeErro, paginas, rede, sessao } from '../../lib/api'
import { useDados } from '../../lib/dados'
import { Link, navegar } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import { faixaDe, SISTEMAS, textoFaixa } from '../../shared/graduacao'
import { MODALIDADE, nomeModalidade } from '../../shared/modalidades'
import type { PerfilPessoa } from '../../shared/respostas'
import { dataDe, NOMES_MESES, textoData } from '../../shared/tempo'
import { numero, primeiroNome } from '../../shared/texto'
import NaoEncontrada from '../NaoEncontrada'

// O perfil da pessoa na rede (seção 6 do estudo): público ou privado (escolha dela, muda quando
// quiser). No privado, quem não segue vê só o nome e a foto e pede para seguir.

export default function Perfil({ usuario }: { usuario: string }) {
  const perfil = useDados(`perfil:${usuario}`, () => paginas.pessoa(usuario))
  const d = perfil.dados
  useTitulo(d ? `${d.pessoa.nome} (@${d.pessoa.usuario})` : undefined)
  if (!d) {
    if (perfil.erro) return <NaoEncontrada mensagem={mensagemDeErro(perfil.erro)} />
    return (
      <div className="min-h-[100svh]">
        <Topo />
        <Carregando className="py-32" />
      </div>
    )
  }
  return <Conteudo d={d} recarregar={perfil.recarregar} definir={perfil.definir} />
}

function Conteudo({ d, recarregar, definir }: { d: PerfilPessoa; recarregar: () => Promise<void>; definir: (p: PerfilPessoa) => void }) {
  const s = useSessao()
  const avisar = useAviso()
  const p = d.pessoa
  const [fazendo, setFazendo] = useState(false)
  const [menu, setMenu] = useState(false)
  const [denunciando, setDenunciando] = useState(false)
  const [lista, setLista] = useState<'seguidores' | 'seguindo' | null>(null)
  const [desde] = useState(() => {
    const [a, m] = p.desde.slice(0, 7).split('-').map(Number)
    return `${NOMES_MESES[m - 1]} de ${a}`
  })

  const exigirConta = () => {
    if (s.usuario) return true
    navegar(`/entrar?volta=${encodeURIComponent(`/u/${p.usuario}`)}`)
    return false
  }

  const seguir = async () => {
    if (!exigirConta()) return
    setFazendo(true)
    try {
      if (d.segue === 'nao') {
        const r = await rede.seguir(p.id)
        definir({ ...d, segue: r.segue })
        avisar(r.segue === 'pedido' ? `Pedido enviado. ${primeiroNome(p.nome)} aprova.` : `Seguindo ${primeiroNome(p.nome)}.`)
        if (r.segue === 'sim') void recarregar()
      } else {
        await rede.deixar(p.id)
        definir({ ...d, segue: 'nao' })
        void recarregar()
      }
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setFazendo(false)
    }
  }

  const conversar = async () => {
    if (!exigirConta()) return
    try {
      const { id } = await conversas.abrir({ tipo: 'conta', id: p.id })
      navegar(`/mensagens/${id}`)
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    }
  }

  const bloquear = async () => {
    setMenu(false)
    if (!confirm(`Bloquear ${p.nome}? Vocês deixam de se ver na rede e no chat.`)) return
    try {
      s.aplicar(await sessao.bloquear(p.id))
      avisar('Bloqueado. Dá para desfazer em Conta e privacidade.')
      navegar('/rede')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    }
  }

  return (
    <div className="min-h-[100svh]">
      <Topo />
      <main className="margem mx-auto max-w-3xl py-8 pb-20">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar nome={p.nome} foto={p.foto} tamanho={104} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h1 className="titulo text-4xl sm:text-5xl">{p.nome}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-suave">
                  @{p.usuario}
                  {p.mais && <Selo tom="marca">Turma+</Selo>}
                  {!p.publico && (
                    <Selo>
                      <PiLockSimple /> Privado
                    </Selo>
                  )}
                </p>
              </div>
              {s.usuario && !d.souEu && (
                <div className="relative">
                  <button type="button" className="grid size-10 place-items-center rounded-full text-xl text-fraco hover:bg-sup-2 hover:text-texto" aria-label="Mais opções" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
                    <PiDotsThree />
                  </button>
                  {menu && (
                    <div className="absolute top-11 right-0 z-20 w-52 overflow-hidden rounded-2xl border border-linha bg-sup p-1.5 text-sm shadow-2xl" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-sup-2"
                        onClick={() => {
                          setMenu(false)
                          setDenunciando(true)
                        }}
                      >
                        <PiFlag /> Denunciar perfil
                      </button>
                      <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-perigo hover:bg-sup-2" onClick={bloquear}>
                        <PiProhibit /> Bloquear
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {p.bio && <p className="mt-3 whitespace-pre-line">{p.bio}</p>}
            <p className="mt-2 text-xs text-fraco">
              {p.cidade ? (
                <>
                  <PiMapPin className="-mt-0.5 inline" /> {p.cidade.nome} ({p.cidade.uf}) ·{' '}
                </>
              ) : null}
              Na {MARCA.nome} desde {desde}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {d.souEu ? (
                <Link para="/conta" className="btn btn-sup btn-m">
                  <PiGear /> Editar perfil e privacidade
                </Link>
              ) : (
                <button type="button" className={`btn btn-m ${d.segue === 'nao' ? 'btn-anilha' : 'btn-sup'}`} onClick={seguir} disabled={fazendo}>
                  {fazendo ? <Girando /> : d.segue === 'sim' ? <PiUserCheck /> : <PiUserPlus />}
                  {d.segue === 'sim' ? 'Seguindo' : d.segue === 'pedido' ? 'Pedido enviado' : d.meSegue ? 'Seguir de volta' : 'Seguir'}
                </button>
              )}
              {d.podeConversar && (
                <button type="button" className="btn btn-sup btn-m" onClick={conversar}>
                  <PiChatCircleDots /> Conversar
                </button>
              )}
              {d.profissional?.publico && (
                <Link para={`/${d.profissional.slug}`} className="btn btn-contorno btn-m">
                  Página profissional
                </Link>
              )}
            </div>
            {d.meSegue && !d.souEu && <p className="mt-2 text-xs text-fraco">Segue você</p>}
          </div>
        </header>

        {!d.podeVer ? (
          <div className="cartao mt-8">
            <Vazio icone={<PiLockSimple />} titulo="Perfil privado" texto={`Siga ${primeiroNome(p.nome)} para ver os treinos, os lugares e as conquistas. O pedido precisa ser aprovado.`} />
          </div>
        ) : (
          <>
            {d.numeros && (
              <section aria-label="Números" className="cartao mt-8 grid grid-cols-3 gap-4 p-5 sm:grid-cols-5">
                <Numero valor={numero(d.numeros.treinos)} legenda={`treinos em ${new Date().getFullYear()}`} />
                <Numero valor={numero(d.numeros.sequencia)} legenda={d.numeros.sequencia === 1 ? 'semana seguida' : 'semanas seguidas'} />
                <Numero valor={numero(d.numeros.desafios)} legenda="desafios" />
                <button type="button" className="text-left" onClick={() => setLista('seguidores')}>
                  <Numero valor={numero(d.numeros.seguidores)} legenda="seguidores" />
                </button>
                <button type="button" className="text-left" onClick={() => setLista('seguindo')}>
                  <Numero valor={numero(d.numeros.seguindo)} legenda="seguindo" />
                </button>
              </section>
            )}

            {(d.faixas?.length || d.lugares?.length) ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {d.faixas && d.faixas.length > 0 && (
                  <section className="cartao p-5" aria-labelledby="faixas">
                    <h2 id="faixas" className="font-bold">
                      Graduação
                    </h2>
                    <ul className="mt-3 space-y-3">
                      {d.faixas.map((f) => {
                        const sistema = SISTEMAS[MODALIDADE[f.modalidade]?.graduacao ?? f.modalidade]
                        const faixa = faixaDe(sistema, f.faixa)
                        return (
                          <li key={`${f.empresa}:${f.modalidade}`} className="flex items-center gap-3">
                            <Faixa cor={faixa?.cor ?? '#888'} graus={f.graus} />
                            <span className="text-sm">
                              <span className="font-semibold">{nomeModalidade(f.modalidade)}</span>
                              <span className="block text-xs text-suave">{textoFaixa(faixa, f.graus)}</span>
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )}
                {d.lugares && d.lugares.length > 0 && (
                  <section className="cartao p-5" aria-labelledby="lugares">
                    <h2 id="lugares" className="font-bold">
                      Onde treina
                    </h2>
                    <ul className="mt-3 space-y-2.5">
                      {d.lugares.slice(0, 6).map((l) => (
                        <li key={`${l.empresa}:${l.unidade}`}>
                          <Link para={`/${l.empresa}?unidade=${l.unidade}`} className="flex items-center justify-between gap-3 text-sm hover:text-texto">
                            <span className="truncate font-semibold">{l.nome}</span>
                            <span className="shrink-0 text-xs text-fraco">
                              {l.vezes}× · {textoData(dataDe(l.ultima))}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            ) : null}

            <section className="mt-8" aria-labelledby="posts">
              <h2 id="posts" className="titulo mb-4 text-3xl">
                Posts
              </h2>
              <ListaDePosts
                chave={`feed:perfil:${p.usuario}`}
                carregar={(antes) => rede.feed({ modo: 'perfil', usuario: p.usuario, antes })}
                vazio={<p className="text-sm text-suave">{d.souEu ? 'Depois do treino, poste o seu treino pago.' : 'Nenhum post ainda.'}</p>}
              />
            </section>
          </>
        )}
      </main>
      <Rodape />

      <Denunciar aberta={denunciando} aoFechar={() => setDenunciando(false)} alvo={{ tipo: 'perfil', id: p.id }} />
      <ListaPessoas usuario={p.usuario} tipo={lista} aoFechar={() => setLista(null)} />
    </div>
  )
}

// A faixa desenhada (a cor e os graus na ponta preta)
export function Faixa({ cor, graus = 0, largura = 64 }: { cor: string; graus?: number; largura?: number }) {
  return (
    <span className="relative inline-block h-3.5 shrink-0 rounded-sm border border-linha" style={{ width: largura, background: cor }} aria-hidden>
      <span className="absolute inset-y-0 right-2 flex w-5 items-center gap-0.5 rounded-[1px] bg-[#141414] px-0.5">
        {Array.from({ length: Math.min(graus, 6) }, (_, i) => (
          <span key={i} className="h-full w-0.5 bg-white" />
        ))}
      </span>
    </span>
  )
}

function ListaPessoas({ usuario, tipo, aoFechar }: { usuario: string; tipo: 'seguidores' | 'seguindo' | null; aoFechar: () => void }) {
  const lista = useDados(tipo ? `${tipo}:${usuario}` : null, () => (tipo === 'seguidores' ? rede.seguidores(usuario) : rede.seguindo(usuario)))
  return (
    <Folha aberta={!!tipo} aoFechar={aoFechar} titulo={tipo === 'seguidores' ? 'Seguidores' : 'Seguindo'}>
      <div className="p-6">
        <h2 className="titulo text-3xl">{tipo === 'seguidores' ? 'Seguidores' : 'Seguindo'}</h2>
        <div className="mt-4">
          {lista.carregando && !lista.dados ? (
            <Carregando className="py-8" />
          ) : lista.erro && !lista.dados ? (
            <Erro mensagem={mensagemDeErro(lista.erro)} />
          ) : lista.dados?.pessoas.length === 0 ? (
            <p className="text-sm text-suave">Ninguém por aqui ainda.</p>
          ) : (
            <ul className="space-y-1">
              {lista.dados?.pessoas.map((x) => (
                <li key={x.id}>
                  <Link para={`/u/${x.usuario}`} onClick={aoFechar} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-sup-2">
                    <Avatar nome={x.nome} foto={x.foto} tamanho={38} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{x.nome}</span>
                      <span className="block truncate text-xs text-fraco">@{x.usuario}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Folha>
  )
}
