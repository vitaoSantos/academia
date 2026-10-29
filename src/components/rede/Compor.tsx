import { useState } from 'react'
import { PiCamera, PiMedal, PiTag, PiX } from 'react-icons/pi'
import { mensagemDeErro, rede } from '../../lib/api'
import { esquecer, useDados } from '../../lib/dados'
import { reduzirImagem } from '../../lib/imagem'
import { useSessao } from '../../lib/sessao'
import type { PostVisto } from '../../shared/respostas'
import type { Marcado } from '../../shared/tipos'
import { useVinculos } from '../layout/AppAluno'
import { useAviso } from '../ui/Aviso'
import { Avatar, Folha, Girando } from '../ui/basicos'

// Postar na rede (seção 16 do estudo): a foto ou a conquista, com a academia (e a unidade, que leva
// o post para o feed da região), o professor e os amigos marcados. Link e telefone não passam: a
// rede não é lugar de golpe.

type Conquista = 'recorde' | 'faixa' | 'desafio' | 'sequencia'
const CONQUISTAS: { id: Conquista; nome: string; exemplo: string }[] = [
  { id: 'recorde', nome: 'Recorde', exemplo: 'Recorde no supino: 60 kg' },
  { id: 'faixa', nome: 'Faixa nova', exemplo: 'Faixa azul de jiu-jitsu' },
  { id: 'sequencia', nome: 'Sequência', exemplo: '10 semanas sem falhar' },
  { id: 'desafio', nome: 'Desafio', exemplo: 'Terminei o desafio de 30 dias' },
]

export function Compor({ aberta, aoFechar, aoPostar }: { aberta: boolean; aoFechar: () => void; aoPostar: (p: PostVisto) => void }) {
  const s = useSessao()
  const avisar = useAviso()
  const vinculos = useVinculos()
  const seguindo = useDados(aberta && s.usuario ? `seguindo:${s.usuario.usuario}` : null, () => rede.seguindo(s.usuario!.usuario))
  const [tipo, setTipo] = useState<'foto' | 'conquista'>('foto')
  const [texto, setTexto] = useState('')
  const [foto, setFoto] = useState<string | null>(null)
  const [conquista, setConquista] = useState<Conquista>('recorde')
  const [conquistaTexto, setConquistaTexto] = useState('')
  const [marcados, setMarcados] = useState<Pick<Marcado, 'tipo' | 'id' | 'nome'>[]>([])
  const [local, setLocal] = useState('')
  const [marcando, setMarcando] = useState(false)
  const [postando, setPostando] = useState(false)
  const ativos = (vinculos.dados ?? []).filter((v) => v.status === 'ativo')
  const unidades = ativos.filter((v) => v.tipo === 'empresa' && v.unidade)
  const opcoes: Pick<Marcado, 'tipo' | 'id' | 'nome'>[] = [
    ...ativos.map((v) => ({ tipo: v.tipo === 'empresa' ? ('empresa' as const) : ('profissional' as const), id: v.id, nome: v.nome })),
    ...(seguindo.dados?.pessoas ?? []).map((p) => ({ tipo: 'pessoa' as const, id: p.id, nome: p.nome })),
  ].filter((o, i, l) => l.findIndex((x) => x.tipo === o.tipo && x.id === o.id) === i)
  const marcado = (o: Pick<Marcado, 'tipo' | 'id'>) => marcados.some((m) => m.tipo === o.tipo && m.id === o.id)

  const limpar = () => {
    setTexto('')
    setFoto(null)
    setConquistaTexto('')
    setMarcados([])
    setLocal('')
  }

  const postar = async () => {
    setPostando(true)
    try {
      const u = unidades.find((v) => `${v.id}:${v.unidade}` === local)
      const { post } = await rede.publicar({
        tipo,
        ...(texto.trim() ? { texto: texto.trim() } : {}),
        ...(tipo === 'foto' && foto ? { foto } : {}),
        ...(tipo === 'conquista' ? { conquista: { tipo: conquista, texto: conquistaTexto.trim() } } : {}),
        marcados: marcados.map((m) => ({ tipo: m.tipo, id: m.id })),
        ...(u ? { local: { empresa: u.id, unidade: u.unidade! } } : {}),
      })
      esquecer('feed:')
      aoPostar(post)
      limpar()
      aoFechar()
      avisar('Postado!')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setPostando(false)
    }
  }

  const pode = tipo === 'foto' ? !!foto || !!texto.trim() : conquistaTexto.trim().length >= 3
  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo="Postar">
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3">
          {s.usuario && <Avatar nome={s.usuario.nome} foto={s.usuario.foto} tamanho={40} />}
          <h2 className="titulo text-3xl">Postar</h2>
        </div>
        <div className="mt-4 flex gap-1.5" role="radiogroup" aria-label="Tipo">
          <button type="button" role="radio" aria-checked={tipo === 'foto'} className="chip" onClick={() => setTipo('foto')}>
            <PiCamera /> Foto ou texto
          </button>
          <button type="button" role="radio" aria-checked={tipo === 'conquista'} className="chip" onClick={() => setTipo('conquista')}>
            <PiMedal /> Conquista
          </button>
        </div>

        {tipo === 'conquista' && (
          <div className="mt-4 rounded-2xl border border-linha p-4">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Conquista">
              {CONQUISTAS.map((c) => (
                <button key={c.id} type="button" role="radio" aria-checked={conquista === c.id} className="chip px-3 py-1.5 text-xs" onClick={() => setConquista(c.id)}>
                  {c.nome}
                </button>
              ))}
            </div>
            <input className="campo mt-3" maxLength={120} value={conquistaTexto} onChange={(e) => setConquistaTexto(e.target.value)} placeholder={CONQUISTAS.find((c) => c.id === conquista)!.exemplo} aria-label="A conquista" />
          </div>
        )}

        <textarea className="campo mt-4 min-h-24" maxLength={600} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={tipo === 'foto' ? 'Como foi o treino?' : 'Conte a história (opcional)'} aria-label="Texto" />

        {tipo === 'foto' &&
          (foto ? (
            <div className="relative mt-3 overflow-hidden rounded-2xl">
              <img src={foto} alt="A foto do post" className="max-h-72 w-full object-cover" />
              <button type="button" className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-black/60 text-white" aria-label="Tirar a foto" onClick={() => setFoto(null)}>
                <PiX />
              </button>
            </div>
          ) : (
            <label className="btn btn-sup btn-p mt-3 cursor-pointer">
              <PiCamera /> Foto
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (f) setFoto(await reduzirImagem(f, 1400))
                }}
              />
            </label>
          ))}

        {unidades.length > 0 && (
          <label className="mt-4 block">
            <span className="rotulo">Onde (leva o post para o feed da região)</span>
            <select className="campo" value={local} onChange={(e) => setLocal(e.target.value)}>
              <option value="">Sem lugar</option>
              {unidades.map((v) => (
                <option key={v.id} value={`${v.id}:${v.unidade}`}>
                  {v.unidadeNome ?? v.nome}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-4">
          <button type="button" className="btn btn-fantasma btn-p" aria-expanded={marcando} onClick={() => setMarcando((m) => !m)}>
            <PiTag /> Marcar {marcados.length ? `(${marcados.length})` : 'academia, professor ou amigos'}
          </button>
          {marcando && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {opcoes.length === 0 && <p className="text-xs text-suave">Siga pessoas ou entre numa academia para marcar.</p>}
              {opcoes.map((o) => (
                <button
                  key={`${o.tipo}:${o.id}`}
                  type="button"
                  aria-pressed={marcado(o)}
                  className="chip px-3 py-1.5 text-xs"
                  onClick={() => setMarcados((l) => (marcado(o) ? l.filter((m) => !(m.tipo === o.tipo && m.id === o.id)) : [...l, o].slice(0, 6)))}
                >
                  @{o.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" className="btn btn-anilha btn-m mt-6 w-full" disabled={!pode || postando} onClick={postar}>
          {postando ? <Girando /> : 'Postar'}
        </button>
        <p className="mt-2 text-center text-[0.7rem] text-fraco">{s.usuario?.publico ? 'Perfil público: todo mundo vê.' : 'Perfil privado: só quem você aprovou vê.'} Link e telefone não são aceitos.</p>
      </div>
    </Folha>
  )
}
