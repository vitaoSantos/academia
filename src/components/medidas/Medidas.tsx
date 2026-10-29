import { useMemo, useState } from 'react'
import { PiCamera, PiPlus, PiRuler, PiTrash } from 'react-icons/pi'
import { medidas as api, mensagemDeErro, urlMidia, type MedidaParaSalvar } from '../../lib/api'
import { useDados } from '../../lib/dados'
import { reduzirImagem } from '../../lib/imagem'
import { Link } from '../../lib/rotas'
import type { MedidasDoAluno } from '../../shared/respostas'
import { dataPorExtenso, hoje, textoData } from '../../shared/tempo'
import { numero } from '../../shared/texto'
import type { Circunferencia, Medida } from '../../shared/tipos'
import { GraficoLinha } from '../graficos/GraficoLinha'
import { useAviso } from '../ui/Aviso'
import { Abas, Campo, Carregando, Erro, Folha, Girando, Selo, Vazio } from '../ui/basicos'

// As medidas (seção 12 do estudo), dado sensível: o peso, a gordura e as circunferências no tempo, e
// as fotos de evolução. O aluno lança as dele; o profissional, com o consentimento, lança a avaliação
// física (que o aluno vê, mas não muda).

export const NOMES_CIRC: Record<Circunferencia, string> = {
  pescoco: 'Pescoço',
  ombro: 'Ombros',
  peito: 'Peito',
  bracoD: 'Braço direito',
  bracoE: 'Braço esquerdo',
  cintura: 'Cintura',
  abdomen: 'Abdômen',
  quadril: 'Quadril',
  coxaD: 'Coxa direita',
  coxaE: 'Coxa esquerda',
  panturrilha: 'Panturrilha',
}

type Serie = { id: string; nome: string; unidade: string; valor: (m: Medida) => number | undefined }

const SERIES: Serie[] = [
  { id: 'peso', nome: 'Peso', unidade: 'kg', valor: (m) => m.peso },
  { id: 'gordura', nome: 'Gordura', unidade: '%', valor: (m) => m.gordura },
  ...(Object.keys(NOMES_CIRC) as Circunferencia[]).map((c) => ({ id: c, nome: NOMES_CIRC[c], unidade: 'cm', valor: (m: Medida) => m.circ[c] })),
]

export function PainelMedidas({ alunoId, profissional = false }: { alunoId?: string; profissional?: boolean }) {
  const dados = useDados(`medidas:${alunoId ?? 'eu'}`, () => api.ler(alunoId))
  const [aba, setAba] = useState<'medidas' | 'fotos'>('medidas')
  const [nova, setNova] = useState(false)
  if (!dados.dados) return dados.erro ? <Erro mensagem={mensagemDeErro(dados.erro)} aoTentar={dados.recarregar} /> : <Carregando />
  const d = dados.dados
  const podeLancar = d.podeEditar || profissional
  return (
    <div>
      <div className="flex items-center gap-2">
        <Abas className="flex-1" valor={aba} aoMudar={setAba} opcoes={[{ id: 'medidas', rotulo: 'Medidas' }, { id: 'fotos', rotulo: `Fotos${d.fotos.usadas ? ` (${d.fotos.usadas})` : ''}` }]} />
        {podeLancar && (
          <button type="button" className="btn btn-anilha btn-m shrink-0" onClick={() => setNova(true)}>
            <PiPlus /> {profissional ? 'Avaliação' : 'Medir'}
          </button>
        )}
      </div>
      <div className="mt-5">{aba === 'medidas' ? <Evolucao d={d} aoMudar={dados.definir} /> : <Fotos d={d} />}</div>
      <NovaMedida aberta={nova} aoFechar={() => setNova(false)} d={d} alunoId={alunoId} profissional={profissional} aoSalvar={dados.definir} />
    </div>
  )
}

function Evolucao({ d, aoMudar }: { d: MedidasDoAluno; aoMudar: (d: MedidasDoAluno) => void }) {
  const avisar = useAviso()
  const disponiveis = useMemo(() => SERIES.filter((s) => d.medidas.some((m) => s.valor(m) !== undefined)), [d.medidas])
  const [escolhida, setEscolhida] = useState<string>('')
  const serie = disponiveis.find((s) => s.id === escolhida) ?? disponiveis[0]
  const pontos = serie ? d.medidas.filter((m) => serie.valor(m) !== undefined).map((m) => ({ data: m.data, valor: serie.valor(m)! })) : []
  const ultimaComPeso = d.medidas.find((m) => m.peso)
  const ultimaComAltura = d.medidas.find((m) => m.altura)
  const imc = ultimaComPeso?.peso && ultimaComAltura?.altura ? ultimaComPeso.peso / (ultimaComAltura.altura / 100) ** 2 : null

  const apagar = async (m: Medida) => {
    if (!confirm(`Apagar as medidas de ${textoData(m.data)}${m.fotos.length ? ' (e as fotos)' : ''}?`)) return
    try {
      aoMudar(await api.apagar(m.id))
      avisar('Apagado.')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    }
  }

  if (!d.medidas.length)
    return (
      <div className="cartao">
        <Vazio icone={<PiRuler />} titulo="Nenhuma medida ainda" texto={d.podeEditar ? 'Anote o peso e as medidas de tempos em tempos (de manhã, em jejum, é o mais certo). Só você vê, e quem você deixar.' : 'O aluno ainda não tem medidas.'} />
      </div>
    )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <div className="cartao p-4">
          <p className="text-xs text-suave">Peso</p>
          <p className="text-2xl font-bold">{ultimaComPeso?.peso ? `${numero(ultimaComPeso.peso, 1)} kg` : '–'}</p>
        </div>
        <div className="cartao p-4">
          <p className="text-xs text-suave">Gordura</p>
          <p className="text-2xl font-bold">{d.medidas.find((m) => m.gordura)?.gordura ? `${numero(d.medidas.find((m) => m.gordura)!.gordura!, 1)}%` : '–'}</p>
        </div>
        <div className="cartao p-4">
          <p className="text-xs text-suave">IMC</p>
          <p className="text-2xl font-bold">{imc ? numero(imc, 1) : '–'}</p>
        </div>
      </div>

      {serie && (
        <section className="cartao p-4 sm:p-5" aria-label="Gráfico">
          <div className="sem-barra -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Medida">
            {disponiveis.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={serie.id === s.id} className="chip shrink-0 px-3 py-1.5 text-xs" onClick={() => setEscolhida(s.id)}>
                {s.nome}
              </button>
            ))}
          </div>
          <div className="mt-4">
            {pontos.length >= 2 ? (
              <GraficoLinha pontos={pontos} formatar={(n) => `${numero(n, 1)} ${serie.unidade}`} rotulo={serie.nome} />
            ) : (
              <p className="text-sm text-suave">Com mais uma medida de {serie.nome.toLowerCase()}, o gráfico aparece.</p>
            )}
          </div>
        </section>
      )}

      <section aria-labelledby="lancadas">
        <h2 id="lancadas" className="mb-2 font-bold">
          Todas as medidas
        </h2>
        <ul className="space-y-2">
          {d.medidas.map((m) => (
            <li key={m.id} className="cartao p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{dataPorExtenso(m.data)}</p>
                  {m.por && <Selo>Avaliação de {m.por.nome}</Selo>}
                </div>
                {d.podeEditar && !m.por && (
                  <button type="button" className="grid size-9 place-items-center rounded-full text-fraco hover:bg-sup-2 hover:text-perigo" aria-label="Apagar" onClick={() => apagar(m)}>
                    <PiTrash />
                  </button>
                )}
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                {m.peso !== undefined && <Item nome="Peso" valor={`${numero(m.peso, 1)} kg`} />}
                {m.altura !== undefined && <Item nome="Altura" valor={`${numero(m.altura, 1)} cm`} />}
                {m.gordura !== undefined && <Item nome="Gordura" valor={`${numero(m.gordura, 1)}%`} />}
                {(Object.keys(m.circ) as Circunferencia[]).map((c) => (
                  <Item key={c} nome={NOMES_CIRC[c]} valor={`${numero(m.circ[c]!, 1)} cm`} />
                ))}
              </dl>
              {m.obs && <p className="mt-2 text-sm text-suave">{m.obs}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

const Item = ({ nome, valor }: { nome: string; valor: string }) => (
  <div className="flex justify-between gap-2 border-b border-linha py-1">
    <dt className="text-suave">{nome}</dt>
    <dd className="dado font-semibold">{valor}</dd>
  </div>
)

function Fotos({ d }: { d: MedidasDoAluno }) {
  const comFoto = d.medidas.filter((m) => m.fotos.length)
  const [lado, setLado] = useState<string[]>([])
  if (!comFoto.length)
    return (
      <div className="cartao">
        <Vazio icone={<PiCamera />} titulo="Nenhuma foto ainda" texto={`As fotos de evolução são privadas: só você vê (e quem você deixar, em "Quem pode ver"). ${d.fotos.limite !== null ? `No plano grátis cabem ${d.fotos.limite}.` : ''}`} />
      </div>
    )
  const todas = comFoto.flatMap((m) => m.fotos.map((f) => ({ id: f, data: m.data })))
  const escolhidas = todas.filter((f) => lado.includes(f.id))
  return (
    <div>
      {d.fotos.limite !== null && (
        <p className="mb-3 text-xs text-suave">
          {d.fotos.usadas} de {d.fotos.limite} fotos do plano grátis.{' '}
          <Link para="/conta#mais" className="underline">
            Sem limite no Turma+
          </Link>
        </p>
      )}
      {escolhidas.length === 2 && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          {escolhidas
            .sort((a, b) => a.data.localeCompare(b.data))
            .map((f) => (
              <figure key={f.id} className="m-0">
                <img src={urlMidia(f.id)} alt={`Foto de ${textoData(f.data)}`} className="aspect-[3/4] w-full rounded-2xl object-cover" />
                <figcaption className="mt-1 text-center text-xs text-suave">{dataPorExtenso(f.data)}</figcaption>
              </figure>
            ))}
        </div>
      )}
      <p className="mb-2 text-xs text-fraco">Toque em duas fotos para ver lado a lado.</p>
      <ul className="grid grid-cols-3 gap-2">
        {todas.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              aria-pressed={lado.includes(f.id)}
              onClick={() => setLado((l) => (l.includes(f.id) ? l.filter((x) => x !== f.id) : [...l, f.id].slice(-2)))}
              className="relative block w-full overflow-hidden rounded-xl ring-anilha ring-offset-2 ring-offset-fundo aria-pressed:ring-2"
            >
              <img src={urlMidia(f.id)} alt={`Foto de ${textoData(f.data)}`} className="aspect-[3/4] w-full object-cover" loading="lazy" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-6 pb-1.5 text-left text-[0.7rem] font-semibold text-white">{textoData(f.data)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function NovaMedida({ aberta, aoFechar, d, alunoId, profissional, aoSalvar }: { aberta: boolean; aoFechar: () => void; d: MedidasDoAluno; alunoId?: string; profissional: boolean; aoSalvar: (d: MedidasDoAluno) => void }) {
  const avisar = useAviso()
  const ultima = d.medidas[0]
  const [m, setM] = useState<MedidaParaSalvar>({ data: hoje() })
  const [circ, setCirc] = useState(false)
  const [foto, setFoto] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const num = (v: string) => (v.trim() ? Number(v.replace(',', '.')) : undefined)
  const salvar = async () => {
    setSalvando(true)
    try {
      const dados = { ...m, ...(foto ? { foto } : {}) }
      aoSalvar(profissional && alunoId ? await api.avaliacao(alunoId, dados) : await api.salvar(dados))
      avisar(profissional ? 'Avaliação lançada. O aluno foi avisado.' : 'Medidas anotadas.')
      setM({ data: hoje() })
      setFoto(null)
      aoFechar()
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setSalvando(false)
    }
  }
  const campo = (nome: string, chave: 'peso' | 'altura' | 'gordura', unidade: string, dica?: string) => (
    <Campo rotulo={`${nome} (${unidade})`} dica={dica}>
      <input className="campo" inputMode="decimal" placeholder={ultima?.[chave] ? numero(ultima[chave]!, 1) : ''} value={m[chave] ?? ''} onChange={(e) => setM((x) => ({ ...x, [chave]: num(e.target.value) }))} />
    </Campo>
  )
  const fotosCheias = d.fotos.limite !== null && d.fotos.usadas >= d.fotos.limite
  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo={profissional ? 'Avaliação física' : 'Novas medidas'}>
      <div className="p-6">
        <h2 className="titulo text-3xl">{profissional ? 'Avaliação física' : 'Novas medidas'}</h2>
        <p className="mt-1 text-sm text-suave">Preencha só o que mediu. Em cinza, a última vez.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Campo rotulo="Dia">
            <input className="campo" type="date" max={hoje()} value={m.data} onChange={(e) => setM((x) => ({ ...x, data: e.target.value }))} />
          </Campo>
          {campo('Peso', 'peso', 'kg')}
          {campo('Altura', 'altura', 'cm')}
          {campo('Gordura', 'gordura', '%', 'Da bioimpedância ou das dobras')}
        </div>
        <button type="button" className="btn btn-fantasma btn-p mt-3" aria-expanded={circ} onClick={() => setCirc((c) => !c)}>
          <PiRuler /> {circ ? 'Esconder as circunferências' : 'Circunferências (fita métrica)'}
        </button>
        {circ && (
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(Object.keys(NOMES_CIRC) as Circunferencia[]).map((c) => (
              <Campo key={c} rotulo={`${NOMES_CIRC[c]} (cm)`}>
                <input className="campo" inputMode="decimal" placeholder={ultima?.circ[c] ? numero(ultima.circ[c]!, 1) : ''} value={m.circ?.[c] ?? ''} onChange={(e) => setM((x) => ({ ...x, circ: { ...x.circ, [c]: num(e.target.value) } }))} />
              </Campo>
            ))}
          </div>
        )}
        {!profissional && (
          <div className="mt-4">
            {foto ? (
              <div className="flex items-center gap-3">
                <img src={foto} alt="Foto escolhida" className="h-24 w-18 rounded-xl object-cover" />
                <button type="button" className="btn btn-fantasma btn-p" onClick={() => setFoto(null)}>
                  Tirar a foto
                </button>
              </div>
            ) : fotosCheias ? (
              <p className="text-xs text-suave">
                As {d.fotos.limite} fotos do plano grátis já foram usadas.{' '}
                <Link para="/conta#mais" className="underline">
                  Turma+
                </Link>
              </p>
            ) : (
              <label className="btn btn-sup btn-p cursor-pointer">
                <PiCamera /> Foto de evolução (privada)
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (f) setFoto(await reduzirImagem(f, 1200))
                  }}
                />
              </label>
            )}
          </div>
        )}
        <Campo rotulo="Observação" className="mt-4">
          <input className="campo" maxLength={300} value={m.obs ?? ''} onChange={(e) => setM((x) => ({ ...x, obs: e.target.value }))} placeholder={profissional ? 'Protocolo, dobras, objetivo...' : 'Em jejum, depois do treino...'} />
        </Campo>
        <button type="button" className="btn btn-anilha btn-m mt-6 w-full" disabled={salvando} onClick={salvar}>
          {salvando ? <Girando /> : 'Salvar'}
        </button>
      </div>
    </Folha>
  )
}
