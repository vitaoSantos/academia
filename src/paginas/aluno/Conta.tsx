import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { PiCamera, PiCheckCircleFill, PiSignOut } from 'react-icons/pi'
import { AppAluno, useVinculos } from '../../components/layout/AppAluno'
import { EscolherLocal } from '../../components/local/EscolherCidade'
import { LogoDaMarca } from '../../components/marca/Marca'
import { useAviso } from '../../components/ui/Aviso'
import { Avatar, Campo, Girando, Interruptor, Selo } from '../../components/ui/basicos'
import { MARCA } from '../../data/marca'
import { aluno, mensagemDeErro, plataforma, sessao } from '../../lib/api'
import { esquecer, useDados } from '../../lib/dados'
import { reduzirImagem } from '../../lib/imagem'
import { localAgora } from '../../lib/local'
import { Link, navegar } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { definirPreferencia, usePreferencia, type Preferencia } from '../../lib/tema'
import { useTitulo } from '../../lib/titulo'
import { alunoMais, RECURSOS_ALUNO } from '../../shared/planos'
import { dataPorExtenso, dataDe } from '../../shared/tempo'
import { formatarPreco, SENHA_MINIMA } from '../../shared/texto'

// A conta (seção 6 do estudo): o perfil, a privacidade (público ou privado, muda quando quiser), a
// região do mapa, de quem é o app (a marca), o Turma+, o tema, a senha, quem foi bloqueado e apagar

function Secao({ id, titulo, children, descricao }: { id: string; titulo: string; descricao?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="cartao scroll-mt-24 p-5" aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`} className="font-bold">
        {titulo}
      </h2>
      {descricao && <p className="mt-1 text-sm text-suave">{descricao}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default function Conta() {
  useTitulo('Conta e privacidade')
  const s = useSessao()
  useEffect(() => {
    if (location.hash) setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 300)
  }, [])
  return (
    <AppAluno titulo="Conta">
      {s.usuario && (
        <div className="space-y-4">
          <Perfil />
          <Privacidade />
          <Regiao />
          <Marca />
          <Mais />
          <Tema />
          {s.usuario.profissional || s.profissional ? (
            <Secao id="pro" titulo="Perfil profissional">
              <Link para="/pro" className="btn btn-sup btn-m">
                Abrir o painel {s.profissional?.personal ? 'do personal' : 'do professor'}
              </Link>
            </Secao>
          ) : (
            <Secao id="pro" titulo="Você é personal ou professor?" descricao="Monte as fichas dos seus alunos com o 3D, tenha a sua página e a agenda.">
              <div className="flex flex-wrap gap-2">
                <Link para="/comecar/personal" className="btn btn-sup btn-m">
                  Sou personal
                </Link>
                <Link para="/comecar/personal?professor=1" className="btn btn-sup btn-m">
                  Sou professor de academia
                </Link>
              </div>
            </Secao>
          )}
          <Senha />
          <Bloqueados />
          <Apagar />
          <button
            type="button"
            className="btn btn-fantasma btn-m w-full"
            onClick={async () => {
              await s.sair()
              navegar('/')
            }}
          >
            <PiSignOut /> Sair da conta
          </button>
        </div>
      )}
    </AppAluno>
  )
}

function Perfil() {
  const s = useSessao()
  const avisar = useAviso()
  const u = s.usuario!
  const [nome, setNome] = useState(u.nome)
  const [usuario, setUsuario] = useState(u.usuario)
  const [bio, setBio] = useState(u.bio ?? '')
  const [meta, setMeta] = useState(u.metaSemanal)
  const [foto, setFoto] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    try {
      s.aplicar(await sessao.perfil({ nome, usuario, bio, metaSemanal: meta, ...(foto ? { foto } : {}) }))
      setFoto(null)
      esquecer('inicio:')
      avisar('Perfil salvo.')
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setSalvando(false)
    }
  }
  return (
    <Secao id="perfil" titulo="Perfil">
      <form onSubmit={salvar} className="space-y-4">
        <div className="flex items-center gap-4">
          {foto ? <img src={foto} alt="" className="size-20 rounded-full object-cover" /> : <Avatar nome={u.nome} foto={u.foto} tamanho={80} />}
          <label className="btn btn-sup btn-p cursor-pointer">
            <PiCamera /> {u.foto || foto ? 'Trocar a foto' : 'Pôr uma foto'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) setFoto(await reduzirImagem(f, 600))
              }}
            />
          </label>
        </div>
        <Campo rotulo="Nome">
          <input className="campo" value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} />
        </Campo>
        <Campo rotulo="Usuário" dica={`O seu perfil: ${MARCA.dominio}/u/${usuario || '...'}`}>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fraco">@</span>
            <input className="campo pl-8" value={usuario} maxLength={30} onChange={(e) => setUsuario(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))} />
          </div>
        </Campo>
        <Campo rotulo="Sobre você">
          <textarea className="campo min-h-20" value={bio} maxLength={240} onChange={(e) => setBio(e.target.value)} placeholder="Treino há 2 anos, foco em força..." />
        </Campo>
        <div>
          <p className="rotulo">Meta de treinos por semana</p>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Meta por semana">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={meta === n} className="chip dado size-10 justify-center p-0" onClick={() => setMeta(n)}>
                {n}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-fraco">A sequência conta as semanas em que você bate a meta.</p>
        </div>
        <button type="submit" className="btn btn-anilha btn-m" disabled={salvando}>
          {salvando ? <Girando /> : 'Salvar o perfil'}
        </button>
      </form>
    </Secao>
  )
}

function Privacidade() {
  const s = useSessao()
  const avisar = useAviso()
  const [mudando, setMudando] = useState(false)
  const u = s.usuario!
  return (
    <Secao id="privacidade" titulo="Privacidade">
      <Interruptor
        ligado={u.publico}
        desativado={mudando || !!u.visita}
        rotulo="Perfil público"
        descricao={u.publico ? 'Qualquer pessoa vê os seus posts e o seu perfil. Para segui-lo não precisa de aprovação.' : 'Só quem você aprovar vê os seus posts, lugares e conquistas. Os outros veem o nome e a foto.'}
        aoMudar={async (v) => {
          setMudando(true)
          try {
            s.aplicar(await sessao.privacidade(v))
            esquecer('feed:')
            avisar(v ? 'O seu perfil agora é público.' : 'O seu perfil agora é privado.')
          } catch (e) {
            avisar(mensagemDeErro(e), 'erro')
          } finally {
            setMudando(false)
          }
        }}
      />
      <p className="mt-4 text-xs text-fraco">As medidas e as fotos de evolução são sempre privadas: em Medidas, você escolhe qual profissional pode ver.</p>
    </Secao>
  )
}

function Regiao() {
  const s = useSessao()
  const avisar = useAviso()
  return (
    <Secao id="regiao" titulo="Sua região" descricao="O mapa, a rede e os desafios mostram o que está perto desta cidade.">
      <EscolherLocal
        aoMudar={async () => {
          const l = localAgora()
          try {
            s.aplicar(await sessao.local(l.cidade, l.raio))
          } catch (e) {
            avisar(mensagemDeErro(e), 'erro')
          }
        }}
      />
    </Secao>
  )
}

function Marca() {
  const s = useSessao()
  const avisar = useAviso()
  const vinculos = useVinculos()
  const ativos = (vinculos.dados ?? []).filter((v) => v.status === 'ativo')
  const [saindo, setSaindo] = useState<string | null>(null)
  const p = s.usuario!.principal
  if (!vinculos.dados?.length) return null
  const escolher = async (tipo: 'empresa' | 'profissional', id: string) => {
    try {
      s.aplicar(await sessao.principal(tipo, id))
      esquecer('inicio:')
      avisar('Pronto: o app agora veste essa marca.')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    }
  }
  const sair = async (tipo: 'empresa' | 'profissional', id: string, nome: string) => {
    if (!confirm(`Deixar de ser aluno de ${nome}? As fichas antigas continuam no seu histórico.`)) return
    setSaindo(id)
    try {
      await aluno.sair(tipo, id)
      esquecer('vinculos:')
      esquecer('inicio:')
      await vinculos.recarregar()
      avisar('Feito.')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setSaindo(null)
    }
  }
  return (
    <Secao id="marca" titulo="Onde você treina" descricao="O app usa as cores e a logo da marca escolhida. Toque para trocar.">
      <ul className="space-y-2">
        {vinculos.dados.map((v) => {
          const escolhida = p ? p.tipo === v.tipo && p.id === v.id : ativos.find((x) => x.tipo === 'empresa')?.id === v.id || (!ativos.some((x) => x.tipo === 'empresa') && ativos[0]?.id === v.id)
          return (
            <li key={`${v.tipo}:${v.id}`} className={`flex items-center gap-3 rounded-2xl border p-3 ${escolhida && v.status === 'ativo' ? 'border-anilha' : 'border-linha'}`}>
              <button type="button" disabled={v.status !== 'ativo'} onClick={() => escolher(v.tipo, v.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <LogoDaMarca visual={v.visual} nome={v.nome} tamanho={40} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{v.unidadeNome ?? v.nome}</span>
                  <span className="block text-xs text-suave">
                    {v.tipo === 'empresa' ? 'Academia' : 'Personal'} · desde {dataPorExtenso(dataDe(v.desde))}
                  </span>
                </span>
                {escolhida && v.status === 'ativo' && <PiCheckCircleFill className="ml-auto shrink-0 text-xl text-anilha-legivel" />}
              </button>
              {v.status === 'pendente' ? (
                <Selo tom="alerta">Aguardando</Selo>
              ) : (
                <button type="button" className="btn btn-fantasma btn-p shrink-0" disabled={saindo === v.id} onClick={() => sair(v.tipo, v.id, v.nome)}>
                  Sair
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </Secao>
  )
}

function Mais() {
  const s = useSessao()
  const avisar = useAviso()
  const config = useDados('plataforma', () => plataforma.ler())
  const [mudando, setMudando] = useState(false)
  const u = s.usuario!
  const tem = alunoMais(u)
  const precos = config.dados?.precos
  const mudar = async (ligar: boolean) => {
    setMudando(true)
    try {
      s.aplicar(await sessao.mais(ligar))
      esquecer('historico:')
      esquecer('evolucao:')
      esquecer('medidas:')
      avisar(ligar ? 'Bem-vindo ao Turma+! (No protótipo, sem cobrança.)' : 'Turma+ cancelado.')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setMudando(false)
    }
  }
  return (
    <section id="mais" className="scroll-mt-24 overflow-hidden rounded-[var(--m-raio,1.5rem)] border border-anilha/50 bg-anilha-suave p-5" aria-labelledby="mais-t">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="mais-t" className="titulo text-3xl">
            Turma+
          </h2>
          <p className="mt-1 text-sm text-suave">{tem ? `Ativo${u.maisAte ? ` até ${dataPorExtenso(dataDe(u.maisAte))}` : ''}.` : 'O que a academia e o personal pagam nunca trava você. O Turma+ é para o que você faz sozinho.'}</p>
        </div>
        {tem && <Selo tom="marca">Ativo</Selo>}
      </div>
      <ul className="mt-4 grid gap-1.5 text-sm sm:grid-cols-2">
        {RECURSOS_ALUNO.mais.map((r) => (
          <li key={r} className="flex gap-2">
            <PiCheckCircleFill className="mt-0.5 shrink-0 text-anilha-legivel" /> {r}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {tem ? (
          <button type="button" className="btn btn-sup btn-m" disabled={mudando || !!u.visita} onClick={() => mudar(false)}>
            {mudando ? <Girando /> : 'Cancelar o Turma+'}
          </button>
        ) : (
          <button type="button" className="btn btn-anilha btn-m" disabled={mudando} onClick={() => mudar(true)}>
            {mudando ? <Girando /> : `Assinar${precos ? ` por ${formatarPreco(precos.alunoMais)}/mês` : ''}`}
          </button>
        )}
        {precos && !tem && <p className="text-xs text-suave">ou {formatarPreco(precos.alunoMaisAno)} por ano</p>}
      </div>
      <p className="mt-3 text-[0.7rem] text-fraco">Protótipo: a assinatura é simulada (30 dias, sem cobrança).</p>
    </section>
  )
}

function Tema() {
  const pref = usePreferencia()
  const opcoes: { id: Preferencia; nome: string }[] = [
    { id: 'escuro', nome: 'Escuro' },
    { id: 'claro', nome: 'Claro' },
    { id: 'sistema', nome: 'Igual ao celular' },
  ]
  return (
    <Secao id="tema" titulo="Aparência" descricao="Fora do app da sua academia (que usa as cores dela).">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tema">
        {opcoes.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={pref === o.id} className="chip" onClick={() => definirPreferencia(o.id)}>
            {o.nome}
          </button>
        ))}
      </div>
    </Secao>
  )
}

function Senha() {
  const s = useSessao()
  const avisar = useAviso()
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [salvando, setSalvando] = useState(false)
  if (s.usuario!.demo || s.usuario!.visita) return null
  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    try {
      s.aplicar(await sessao.senha(atual, nova))
      setAtual('')
      setNova('')
      avisar('Senha trocada. Os outros aparelhos saem da conta.')
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setSalvando(false)
    }
  }
  return (
    <Secao id="senha" titulo="Senha">
      <form onSubmit={salvar} className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Senha atual">
          <input className="campo" type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} />
        </Campo>
        <Campo rotulo="Nova senha" dica={`Pelo menos ${SENHA_MINIMA} caracteres`}>
          <input className="campo" type="password" autoComplete="new-password" minLength={SENHA_MINIMA} value={nova} onChange={(e) => setNova(e.target.value)} />
        </Campo>
        <div>
          <button type="submit" className="btn btn-sup btn-m" disabled={salvando || !atual || nova.length < SENHA_MINIMA}>
            {salvando ? <Girando /> : 'Trocar a senha'}
          </button>
        </div>
      </form>
    </Secao>
  )
}

function Bloqueados() {
  const s = useSessao()
  const avisar = useAviso()
  const total = s.usuario!.bloqueados?.length ?? 0
  const lista = useDados(total ? `bloqueados:${s.usuario!.id}:${total}` : null, () => sessao.bloqueados())
  if (!total) return null
  return (
    <Secao id="bloqueados" titulo="Bloqueados" descricao="Vocês não se veem na rede nem no chat.">
      <ul className="space-y-2">
        {(lista.dados?.pessoas ?? []).map((p) => (
          <li key={p.id} className="flex items-center gap-3">
            <Avatar nome={p.nome} foto={p.foto} tamanho={36} />
            <span className="min-w-0 flex-1 truncate font-semibold">{p.nome}</span>
            <button
              type="button"
              className="btn btn-fantasma btn-p"
              onClick={async () => {
                try {
                  s.aplicar(await sessao.desbloquear(p.id))
                  avisar('Desbloqueado.')
                } catch (e) {
                  avisar(mensagemDeErro(e), 'erro')
                }
              }}
            >
              Desbloquear
            </button>
          </li>
        ))}
      </ul>
    </Secao>
  )
}

function Apagar() {
  const s = useSessao()
  const avisar = useAviso()
  const [aberto, setAberto] = useState(false)
  const [senha, setSenha] = useState('')
  const [apagando, setApagando] = useState(false)
  const u = s.usuario!
  if (u.demo) return null
  const apagar = async () => {
    setApagando(true)
    try {
      s.aplicar(await sessao.apagar(senha))
      navegar('/')
      avisar('A sua conta foi apagada.')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setApagando(false)
    }
  }
  return (
    <Secao id="apagar" titulo="Apagar a conta" descricao="Apaga o perfil, os treinos, as medidas e as fotos. Não dá para desfazer.">
      {aberto ? (
        <div className="space-y-3">
          {!u.visita && (
            <Campo rotulo="Confirme com a sua senha">
              <input className="campo" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </Campo>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn btn-perigo btn-m" disabled={apagando || (!u.visita && !senha)} onClick={apagar}>
              {apagando ? <Girando /> : 'Apagar para sempre'}
            </button>
            <button type="button" className="btn btn-fantasma btn-m" onClick={() => setAberto(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-fantasma btn-p text-perigo" onClick={() => setAberto(true)}>
          Quero apagar a minha conta
        </button>
      )}
    </Secao>
  )
}
