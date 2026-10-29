import { useMemo, useState } from 'react'
import { PiChatCircleDots, PiCheckCircleFill, PiClock, PiInstagramLogo, PiMapPin, PiNavigationArrow, PiWhatsappLogo } from 'react-icons/pi'
import { ComMarca, LogoDaMarca } from '../../components/marca/Marca'
import { Mapa, type Marcador } from '../../components/mapa/Mapa'
import { AulasDoDia } from '../../components/perfil/AulasDoDia'
import { Avaliacoes } from '../../components/perfil/Avaliacoes'
import { useAviso } from '../../components/ui/Aviso'
import { Abas, Avatar, Girando, NotaTexto, Selo } from '../../components/ui/basicos'
import { useMarcaNoDocumento } from '../../hooks/useMarcaNoDocumento'
import { aluno, conversas, mensagemDeErro, urlMidia } from '../../lib/api'
import { Link, navegar, useEndereco } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import { comoChegar } from '../../shared/geo'
import { familiaDe, MODALIDADE, nomeModalidade } from '../../shared/modalidades'
import type { PaginaEmpresa as Dados } from '../../shared/respostas'
import { NOMES_DIAS } from '../../shared/tempo'
import { formatarTelefone, linkWhatsApp, reais } from '../../shared/texto'
import { temaDe } from '../../shared/temas'
import { MenuDaPagina } from './MenuDaPagina'

// A página da academia (seção 7 do estudo), com a marca dela: as unidades no mapa, a grade com as
// reservas, as modalidades (com as faixas), os professores e as avaliações. O aluno pede o vínculo
// ("Sou aluno daqui"); quem não é, pede a aula experimental.

type Aba = 'aulas' | 'unidades' | 'modalidades' | 'professores' | 'avaliacoes'

const NOMES_TIPO: Record<string, string> = { academia: 'Academia', rede: 'Rede de academias', estudio: 'Estúdio', box: 'Box de cross training', ct: 'Centro de treinamento de lutas', danca: 'Escola de dança', aquatica: 'Natação' }

export default function PaginaEmpresa({ d, recarregar }: { d: Dados; recarregar: () => void }) {
  const e = d.empresa
  const s = useSessao()
  const avisar = useAviso()
  const { busca } = useEndereco()
  const tema = temaDe(e.visual)
  useTitulo(e.nome, { puro: true })
  useMarcaNoDocumento({ slug: e.slug, nome: e.nome, cor: tema.destaque, fundo: tema.fundo })
  const ativas = e.unidades.filter((u) => u.ativa)
  const [unidadeId, setUnidadeId] = useState(busca.get('unidade') && ativas.some((u) => u.id === busca.get('unidade')) ? busca.get('unidade')! : (d.vinculo?.unidade ?? ativas[0]?.id ?? ''))
  const unidade = ativas.find((u) => u.id === unidadeId) ?? ativas[0]
  const temGrade = e.grade.some((a) => a.ativa)
  const [aba, setAba] = useState<Aba>(() => {
    const pedida = busca.get('aba') as Aba | null
    return pedida && ['aulas', 'unidades', 'modalidades', 'professores', 'avaliacoes'].includes(pedida) && (pedida !== 'aulas' || temGrade) ? pedida : temGrade ? 'aulas' : 'unidades'
  })
  const [pedindo, setPedindo] = useState(false)
  const souAluno = d.vinculo?.status === 'ativo'

  const pedir = async () => {
    if (!s.usuario) return navegar(`/cadastro?volta=${encodeURIComponent(`/${e.slug}`)}`)
    setPedindo(true)
    try {
      await aluno.pedir({ empresa: e.slug, unidade: unidade?.id })
      avisar('Pedido enviado! A academia confirma e as fichas aparecem no seu app.')
      recarregar()
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setPedindo(false)
    }
  }

  const conversar = async () => {
    if (!s.usuario) return navegar(`/entrar?volta=${encodeURIComponent(`/${e.slug}`)}`)
    try {
      const { id } = await conversas.abrir({ tipo: 'empresa', id: e.slug })
      navegar(`/mensagens/${id}`)
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    }
  }

  const marcadores = useMemo<Marcador[]>(
    () =>
      ativas.map((u) => ({
        id: u.id,
        lat: u.ponto.lat,
        lng: u.ponto.lng,
        ancora: 'bottom' as const,
        z: u.id === unidade?.id ? 20 : 10,
        conteudo: (
          <button type="button" onClick={() => setUnidadeId(u.id)} className="flex flex-col items-center" aria-label={u.nome}>
            <span className={`grid size-9 place-items-center rounded-full border-[3px] border-white text-xs font-black shadow-lg ${u.id === unidade?.id ? 'scale-125' : ''}`} style={{ background: tema.destaque, color: tema.destaqueTexto }}>
              {u.nome.charAt(0)}
            </span>
            <span className="-mt-1 size-2 rotate-45 bg-white" />
          </button>
        ),
      })),
    [ativas, unidade?.id, tema.destaque, tema.destaqueTexto],
  )

  const capa = urlMidia(e.visual.capa)

  return (
    <ComMarca visual={e.visual} className="min-h-[100svh]">
      <MenuDaPagina nome={e.visual.nomeApp || e.nome} visual={e.visual} />

      {/* a capa */}
      <header className="relative">
        <div className="h-40 w-full sm:h-56" style={capa ? { backgroundImage: `url(${capa})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: `linear-gradient(135deg, ${tema.destaque}, ${tema.detalhe})`, opacity: 0.85 }} />
        <div className="margem mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <LogoDaMarca visual={e.visual} nome={e.nome} tamanho={112} className="-mt-14 border-4 border-fundo shadow-xl sm:-mt-16" />
            <div className="min-w-0 flex-1 sm:pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="titulo text-4xl sm:text-5xl">{e.nome}</h1>
                {e.destaque && <Selo tom="marca">Destaque</Selo>}
              </div>
              <p className="mt-1 text-sm text-suave">
                {NOMES_TIPO[e.tipo] ?? 'Academia'} · {ativas.length > 1 ? `${ativas.length} unidades` : unidade?.cidade.nome} · <NotaTexto nota={e.numeros.nota} /> · {d.alunos} alunos na Turma
              </p>
            </div>
          </div>

          {e.descricao && <p className="mt-5 max-w-3xl text-suave">{e.descricao}</p>}

          <div className="mt-6 flex flex-wrap gap-2">
            {souAluno ? (
              <Link para="/app" className="btn btn-anilha btn-m">
                <PiCheckCircleFill /> Você é aluno · abrir o app
              </Link>
            ) : d.vinculo?.status === 'pendente' ? (
              <span className="btn btn-sup btn-m cursor-default">Pedido enviado, aguardando a academia</span>
            ) : !d.souEquipe ? (
              <button type="button" className="btn btn-anilha btn-m" onClick={pedir} disabled={pedindo}>
                {pedindo ? <Girando /> : 'Sou aluno daqui'}
              </button>
            ) : (
              <Link para={`/painel/${e.slug}`} className="btn btn-anilha btn-m">
                Abrir o painel
              </Link>
            )}
            {!d.souEquipe && (
              <button type="button" className="btn btn-sup btn-m" onClick={conversar}>
                <PiChatCircleDots /> Conversar
              </button>
            )}
            {unidade?.whatsapp &&
              (e.demo ? (
                <button type="button" className="btn btn-sup btn-m" onClick={() => avisar('Na demonstração o WhatsApp não liga para ninguém. Use o chat da Turma.')}>
                  <PiWhatsappLogo /> WhatsApp
                </button>
              ) : (
                <a href={linkWhatsApp(unidade.whatsapp, `Olá! Vi a ${e.nome} na Turma.`)} target="_blank" rel="noreferrer" className="btn btn-sup btn-m">
                  <PiWhatsappLogo /> {formatarTelefone(unidade.whatsapp)}
                </a>
              ))}
            {e.instagram && (
              <a href={`https://instagram.com/${e.instagram}`} target="_blank" rel="noreferrer" className="btn btn-fantasma btn-m" aria-label="Instagram">
                <PiInstagramLogo className="text-lg" />
              </a>
            )}
          </div>

          {ativas.length > 1 && (
            <div className="mt-6">
              <p className="rotulo">Unidade</p>
              <div className="sem-barra -mx-4 flex gap-1.5 overflow-x-auto px-4" role="radiogroup" aria-label="Unidade">
                {ativas.map((u) => (
                  <button key={u.id} type="button" role="radio" aria-checked={u.id === unidade?.id} className="chip" onClick={() => setUnidadeId(u.id)}>
                    {u.nome} <span className="text-fraco">· {u.cidade.nome}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Abas<Aba>
            className="mt-8"
            valor={aba}
            aoMudar={setAba}
            opcoes={[...(temGrade ? [{ id: 'aulas' as Aba, rotulo: 'Aulas' }] : []), { id: 'unidades', rotulo: ativas.length > 1 ? 'Unidades' : 'Onde fica' }, { id: 'modalidades', rotulo: 'Modalidades' }, { id: 'professores', rotulo: 'Professores' }, { id: 'avaliacoes', rotulo: 'Avaliações' }]}
          />
        </div>
      </header>

      <main className="margem mx-auto max-w-5xl py-8 pb-20">
        {aba === 'aulas' && unidade && <AulasDoDia key={unidade.id} slug={e.slug} unidade={unidade.id} aluno={souAluno || d.souEquipe} />}

        {aba === 'unidades' && unidade && (
          <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
            <div className="h-80 overflow-hidden rounded-2xl border border-linha lg:h-[28rem]">
              <Mapa centro={unidade.ponto} zoom={ativas.length > 1 ? 12 : 15} marcadores={marcadores} ajustar={ativas.length > 1 ? ativas.map((u) => u.ponto) : undefined} tema={tema.escuro ? 'escuro' : 'claro'} className="h-full" />
            </div>
            <div className="space-y-4">
              <div className="cartao p-5">
                <p className="titulo text-2xl">{unidade.nome}</p>
                <p className="mt-2 flex gap-2 text-sm">
                  <PiMapPin className="mt-0.5 shrink-0 text-fraco" />
                  <span>
                    {unidade.endereco}
                    {unidade.bairro ? `, ${unidade.bairro}` : ''}
                    <br />
                    {unidade.cidade.nome} ({unidade.cidade.uf})
                  </span>
                </p>
                <a href={comoChegar(unidade.ponto)} target="_blank" rel="noreferrer" className="btn btn-sup btn-p mt-4">
                  <PiNavigationArrow /> Como chegar
                </a>
                {unidade.precoDesde ? <p className="mt-4 text-sm">A partir de <span className="font-bold">{reais(unidade.precoDesde)}</span> por mês</p> : null}
                {unidade.agregadores.length > 0 && <p className="mt-1 text-sm text-suave">Aceita {unidade.agregadores.map((a) => (a === 'wellhub' ? 'Wellhub' : 'TotalPass')).join(' e ')}</p>}
              </div>
              <div className="cartao p-5">
                <p className="flex items-center gap-2 font-bold">
                  <PiClock /> Horário
                </p>
                <ul className="mt-3 space-y-1 text-sm">
                  {[1, 2, 3, 4, 5, 6, 0].map((dia) => {
                    const h = unidade.horario.find((x) => x.dia === dia)
                    return (
                      <li key={dia} className="flex justify-between">
                        <span className="capitalize text-suave">{NOMES_DIAS[dia]}</span>
                        <span className="dado">{h ? `${h.abre} às ${h.fecha}` : 'Fechado'}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
              {unidade.comodidades.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {unidade.comodidades.map((c) => (
                    <span key={c} className="chip">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {aba === 'modalidades' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {e.modalidades.map((m) => (
              <div key={m.id} className="cartao p-5">
                <p className="flex items-center gap-2 font-bold">
                  <span className="size-2.5 rounded-full" style={{ background: familiaDe(m.id).cor }} />
                  {nomeModalidade(m.id)}
                </p>
                <p className="mt-1 text-sm text-suave">{m.descricao || MODALIDADE[m.id]?.descricao}</p>
                <p className="mt-3 text-xs text-fraco">
                  {m.inclusa ? 'Incluída no plano' : m.precoDesde ? `À parte, a partir de ${reais(m.precoDesde)}/mês` : 'À parte'}
                  {m.publicos.length ? ` · ${m.publicos.join(', ')}` : ''}
                </p>
                {m.graduacao && (
                  <div className="mt-3 flex flex-wrap gap-1" aria-label="Faixas">
                    {m.graduacao.faixas.map((f) => (
                      <span key={f.id} title={f.nome} className="h-2.5 w-7 rounded-sm border border-linha" style={{ background: f.cor }} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {aba === 'professores' && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {d.professores.map((p) => (
              <Link key={p.id} para={`/${p.slug}`} className="cartao flex items-center gap-3 p-4 hover:border-linha-2">
                <span className="rounded-full border-[3px]" style={{ borderColor: p.cor }}>
                  <Avatar nome={p.nome} foto={p.foto} tamanho={48} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold">{p.nome}</span>
                  <span className="block truncate text-xs text-suave">{p.especialidades.slice(0, 2).join(', ') || (p.personal ? 'Personal' : 'Professor')}</span>
                  <NotaTexto nota={p.nota} className="text-xs" />
                </span>
              </Link>
            ))}
            {!d.professores.length && <p className="text-sm text-suave">Os professores aparecem aqui quando aceitam o convite da academia.</p>}
          </div>
        )}

        {aba === 'avaliacoes' && <Avaliacoes alvo={{ tipo: 'empresa', id: e.slug }} nota={e.numeros.nota} lista={d.avaliacoes} podeAvaliar={d.podeAvaliar} minha={d.minhaAvaliacao} podeResponder={d.souEquipe} aoMudar={recarregar} />}
      </main>
    </ComMarca>
  )
}
