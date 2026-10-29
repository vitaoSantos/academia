import { useMemo, useState } from 'react'
import { PiChatCircleDots, PiCheckCircleFill, PiGlobe, PiHouseLine, PiInstagramLogo, PiLink, PiLockSimple, PiMapPin, PiPencilSimple, PiWhatsappLogo } from 'react-icons/pi'
import { MarcarSessao } from '../../components/agenda/MarcarSessao'
import { ComMarca, useMarca } from '../../components/marca/Marca'
import { Mapa, type Marcador } from '../../components/mapa/Mapa'
import { Avaliacoes } from '../../components/perfil/Avaliacoes'
import { CartaoCompartilhar } from '../../components/perfil/CartaoCompartilhar'
import { useAviso } from '../../components/ui/Aviso'
import { Avatar, Girando, NotaTexto, Numero, Selo } from '../../components/ui/basicos'
import { enderecoPublico } from '../../data/marca'
import { useMarcaNoDocumento } from '../../hooks/useMarcaNoDocumento'
import { aluno, conversas, mensagemDeErro } from '../../lib/api'
import { Link, navegar } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import { textoNota } from '../../shared/avaliacao'
import { nomeCidade } from '../../shared/geo'
import { familiaDe, nomeModalidade } from '../../shared/modalidades'
import type { PaginaProfissional as Dados } from '../../shared/respostas'
import { formatarTelefone, linkWhatsApp, numero, primeiroNome, semAcento } from '../../shared/texto'
import { MenuDaPagina } from './MenuDaPagina'

// A página do personal (ou do professor) — seções 6 e 10 do estudo: a foto, o CREF, os números que
// ele pode mostrar nas redes (alunos instruídos, fichas, treinos), onde atende (as academias, em
// casa, online), a agenda para os alunos marcarem, as avaliações e o cartão para os stories.

export default function PaginaProfissional({ d, recarregar }: { d: Dados; recarregar: () => void }) {
  const p = d.profissional
  const s = useSessao()
  const avisar = useAviso()
  const tema = useMarca(p.visual)
  useTitulo(p.nome, { puro: true })
  useMarcaNoDocumento(p.personal ? { slug: p.slug, nome: p.nome, cor: tema.destaque, fundo: tema.fundo } : null)
  const [pedindo, setPedindo] = useState(false)
  const souAluno = d.vinculo?.status === 'ativo'
  const funcao = p.personal ? 'Personal trainer' : 'Professor'

  const pedir = async () => {
    if (!s.usuario) return navegar(`/cadastro?volta=${encodeURIComponent(`/${p.slug}`)}`)
    setPedindo(true)
    try {
      await aluno.pedir({ profissional: p.id })
      avisar(`Pedido enviado! ${primeiroNome(p.nome)} confirma e as fichas aparecem no seu app.`)
      recarregar()
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setPedindo(false)
    }
  }

  const conversar = async () => {
    if (!s.usuario) return navegar(`/entrar?volta=${encodeURIComponent(`/${p.slug}`)}`)
    try {
      const { id } = await conversas.abrir({ tipo: 'conta', id: p.id })
      navegar(`/mensagens/${id}`)
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    }
  }

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://${enderecoPublico(p.slug)}`)
      avisar('Link copiado.')
    } catch {
      avisar(`O link é ${enderecoPublico(p.slug)}`)
    }
  }

  const marcadores = useMemo<Marcador[]>(
    () =>
      d.locais.map((l) => ({
        id: `${l.empresa}:${l.unidade}`,
        lat: l.ponto.lat,
        lng: l.ponto.lng,
        ancora: 'bottom' as const,
        conteudo: (
          <Link para={`/${l.slug}?unidade=${l.unidade}`} className="flex flex-col items-center" aria-label={l.nome}>
            <span className="max-w-40 truncate rounded-full border-2 border-white px-2.5 py-1 text-xs font-bold shadow-lg" style={{ background: tema.destaque, color: tema.destaqueTexto }}>
              {l.nome}
            </span>
            <span className="-mt-1 size-2 rotate-45 bg-white" />
          </Link>
        ),
      })),
    [d.locais, tema.destaque, tema.destaqueTexto],
  )

  // o perfil fora do ar: só o nome (os alunos continuam vendo tudo)
  if (d.privado) {
    return (
      <ComMarca visual={p.visual} className="min-h-[100svh]">
        <MenuDaPagina nome={p.nome} visual={p.visual} />
        <main className="margem mx-auto flex max-w-md flex-col items-center py-24 text-center">
          <Avatar nome={p.nome} foto={p.foto} tamanho={96} />
          <h1 className="titulo mt-5 text-4xl">{p.nome}</h1>
          <p className="mt-3 flex items-center gap-2 text-suave">
            <PiLockSimple /> Este perfil não está aberto ao público.
          </p>
          <p className="mt-2 text-sm text-fraco">Se você treina com {primeiroNome(p.nome)}, entre na sua conta para ver.</p>
          {!s.usuario && (
            <Link para={`/entrar?volta=${encodeURIComponent(`/${p.slug}`)}`} className="btn btn-anilha btn-m mt-6">
              Entrar
            </Link>
          )}
        </main>
      </ComMarca>
    )
  }

  const outros = p.locais.filter((l) => l.tipo !== 'unidade')
  // a especialidade com o nome de uma modalidade já aparece na modalidade
  const especialidades = p.especialidades.filter((e) => !p.modalidades.some((m) => semAcento(nomeModalidade(m)) === semAcento(e)))
  const n = p.numeros
  const numeros = [
    { valor: numero(n.alunosInstruidos), legenda: n.alunosInstruidos === 1 ? 'aluno instruído' : 'alunos instruídos' },
    { valor: numero(n.fichas), legenda: n.fichas === 1 ? 'ficha montada' : 'fichas montadas' },
    { valor: numero(n.treinos), legenda: 'treinos dos alunos' },
  ]
  const agendaAberta = p.agenda.ativa && p.agenda.alunoMarca

  return (
    <ComMarca visual={p.visual} className="min-h-[100svh]">
      <MenuDaPagina nome={p.nome} visual={p.visual} />

      <header className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-48 left-1/2 h-[30rem] w-[52rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl" style={{ background: `radial-gradient(closest-side, ${tema.destaque}, transparent)` }} />
        <div className="margem relative mx-auto max-w-5xl pt-10 pb-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <span className="w-fit rounded-full p-1" style={{ background: `conic-gradient(${tema.destaque}, ${tema.detalhe}, ${tema.destaque})` }}>
              <span className="block rounded-full border-4 border-fundo">
                <Avatar nome={p.nome} foto={p.foto} tamanho={124} />
              </span>
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Selo tom="marca">{funcao}</Selo>
                {p.destaque && <Selo>Destaque</Selo>}
                {p.online && <Selo tom="ok">Atende online</Selo>}
              </div>
              <h1 className="titulo mt-3 text-5xl sm:text-6xl">{p.nome}</h1>
              <p className="mt-2 text-sm text-suave">
                {p.cref ? `CREF ${p.cref} · ` : ''}
                {nomeCidade(p.cidade)} · <NotaTexto nota={n.nota} />
              </p>
            </div>
          </div>

          {p.bio && <p className="mt-6 max-w-3xl whitespace-pre-line text-suave">{p.bio}</p>}

          {(especialidades.length > 0 || p.modalidades.length > 0) && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {especialidades.map((e) => (
                <span key={e} className="chip">
                  {e}
                </span>
              ))}
              {p.modalidades.map((m) => (
                <span key={m} className="chip">
                  <span className="size-2 rounded-full" style={{ background: familiaDe(m).cor }} />
                  {nomeModalidade(m)}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {d.souEu ? (
              <>
                <Link para="/pro" className="btn btn-anilha btn-m">
                  Abrir o painel
                </Link>
                <Link para="/pro/perfil" className="btn btn-sup btn-m">
                  <PiPencilSimple /> Editar a página
                </Link>
              </>
            ) : souAluno ? (
              <Link para="/app" className="btn btn-anilha btn-m">
                <PiCheckCircleFill /> Você treina com {primeiroNome(p.nome)}
              </Link>
            ) : d.vinculo?.status === 'pendente' ? (
              <span className="btn btn-sup btn-m cursor-default">Pedido enviado, aguardando</span>
            ) : p.personal ? (
              <button type="button" className="btn btn-anilha btn-m" onClick={pedir} disabled={pedindo}>
                {pedindo ? <Girando /> : `Quero treinar com ${primeiroNome(p.nome)}`}
              </button>
            ) : null}
            {!d.souEu && (
              <button type="button" className="btn btn-sup btn-m" onClick={conversar}>
                <PiChatCircleDots /> Conversar
              </button>
            )}
            {p.whatsapp &&
              !d.souEu &&
              (p.demo ? (
                <button type="button" className="btn btn-sup btn-m" onClick={() => avisar('Na demonstração o WhatsApp não liga para ninguém. Use o chat da Turma.')}>
                  <PiWhatsappLogo /> WhatsApp
                </button>
              ) : (
                <a href={linkWhatsApp(p.whatsapp, `Olá, ${primeiroNome(p.nome)}! Vi seu perfil na Turma.`)} target="_blank" rel="noreferrer" className="btn btn-sup btn-m">
                  <PiWhatsappLogo /> {formatarTelefone(p.whatsapp)}
                </a>
              ))}
            {p.instagram && (
              <a href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noreferrer" className="btn btn-fantasma btn-m" aria-label="Instagram">
                <PiInstagramLogo className="text-lg" />
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="margem mx-auto max-w-5xl space-y-12 pb-20">
        {/* os números (o que ele mostra nas redes) */}
        <section aria-label="Números" className="cartao grid grid-cols-3 gap-4 p-5 sm:p-7">
          {numeros.map((x) => (
            <Numero key={x.legenda} valor={x.valor} legenda={x.legenda} />
          ))}
        </section>

        <section aria-labelledby="onde">
          <h2 id="onde" className="titulo text-3xl">
            {p.personal ? 'Onde atende' : 'Onde dá aula'}
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
            {d.locais.length > 0 && (
              <div className="h-72 overflow-hidden rounded-2xl border border-linha lg:h-80">
                <Mapa centro={d.locais[0].ponto} zoom={14} marcadores={marcadores} ajustar={d.locais.length > 1 ? d.locais.map((l) => l.ponto) : undefined} tema={tema.escuro ? 'escuro' : 'claro'} className="h-full" />
              </div>
            )}
            <ul className={`space-y-2 ${d.locais.length ? '' : 'lg:col-span-2'}`}>
              {d.locais.map((l) => (
                <li key={`${l.empresa}:${l.unidade}`}>
                  <Link para={`/${l.slug}?unidade=${l.unidade}`} className="cartao flex items-center gap-3 p-4 hover:border-linha-2">
                    <PiMapPin className="shrink-0 text-xl text-fraco" />
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{l.nome}</span>
                      <span className="block text-xs text-suave">{nomeCidade(l.cidade)}</span>
                    </span>
                  </Link>
                </li>
              ))}
              {outros.map((l, i) => (
                <li key={i} className="cartao flex items-center gap-3 p-4">
                  {l.tipo === 'online' ? <PiGlobe className="shrink-0 text-xl text-fraco" /> : l.tipo === 'domicilio' ? <PiHouseLine className="shrink-0 text-xl text-fraco" /> : <PiMapPin className="shrink-0 text-xl text-fraco" />}
                  <span className="min-w-0">
                    <span className="block font-bold">{l.tipo === 'online' ? 'Online' : l.tipo === 'domicilio' ? 'Na sua casa' : l.tipo === 'outro' ? l.nome : ''}</span>
                    <span className="block text-xs text-suave">{l.tipo === 'online' ? 'Ficha e acompanhamento pelo app, de qualquer lugar' : l.tipo === 'domicilio' ? `Até ${p.raioKm} km de ${p.cidade.nome}` : 'Ao ar livre'}</span>
                  </span>
                </li>
              ))}
              {!d.locais.length && !outros.length && <li className="text-sm text-suave">{nomeCidade(p.cidade)}</li>}
            </ul>
          </div>
        </section>

        {p.agenda.ativa && (
          <section aria-labelledby="agenda">
            <h2 id="agenda" className="titulo text-3xl">
              Agenda
            </h2>
            {souAluno && agendaAberta ? (
              <div className="cartao mt-4 p-5">
                <MarcarSessao pro={{ id: p.id, nome: p.nome }} />
              </div>
            ) : (
              <p className="mt-3 max-w-xl text-sm text-suave">
                {d.souEu
                  ? 'Seus alunos marcam aqui nos horários livres. Configure em Painel › Agenda.'
                  : souAluno
                    ? `${primeiroNome(p.nome)} marca os horários com você. Combine pelo chat.`
                    : `Sessões de ${p.agenda.duracao} min${p.agenda.locais.length ? ` em ${p.agenda.locais.join(', ')}` : ''}. Os alunos marcam os horários pelo app.`}
              </p>
            )}
          </section>
        )}

        <section aria-labelledby="avaliacoes">
          <h2 id="avaliacoes" className="titulo text-3xl">
            Avaliações
          </h2>
          <div className="mt-4">
            <Avaliacoes alvo={{ tipo: 'profissional', id: p.id }} nota={n.nota} lista={d.avaliacoes} podeAvaliar={d.podeAvaliar} minha={d.minhaAvaliacao} podeResponder={d.souEu} aoMudar={recarregar} />
          </div>
        </section>

        <section aria-labelledby="compartilhar" className="cartao flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="compartilhar" className="font-bold">
              {d.souEu ? 'Mostre o seu trabalho' : p.personal ? 'Conhece alguém procurando personal?' : 'Compartilhe'}
            </h2>
            <p className="mt-1 text-sm text-suave">
              {d.souEu ? 'O cartão com os seus números e o QR da página, pronto para os stories.' : 'Mande o link desta página:'} {enderecoPublico(p.slug)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-sup btn-m" onClick={copiarLink}>
              <PiLink /> Copiar link
            </button>
            <CartaoCompartilhar slug={p.slug} nome={p.nome} subtitulo={`${funcao}${p.cref ? ` · CREF ${p.cref}` : ''} · ${p.cidade.nome}`} numeros={[...numeros, { valor: textoNota(n.nota), legenda: n.nota.total ? `nota em ${n.nota.total} avaliações` : 'nota' }]} visual={p.visual} />
          </div>
        </section>
      </main>
    </ComMarca>
  )
}
