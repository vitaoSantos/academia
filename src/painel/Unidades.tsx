import { useMemo, useState } from 'react'
import { PiClock, PiMapPin, PiPencilSimple, PiPlus, PiWhatsappLogo } from 'react-icons/pi'
import { EscolherCidade } from '../components/local/EscolherCidade'
import { useTemaEmVolta } from '../components/marca/Marca'
import { Mapa, type Marcador } from '../components/mapa/Mapa'
import { useAviso } from '../components/ui/Aviso'
import { Campo, Folha, Girando, Selo } from '../components/ui/basicos'
import { Etiquetas } from '../components/ui/Etiquetas'
import { mensagemDeErro, painel, plataforma } from '../lib/api'
import { esquecer, useDados } from '../lib/dados'
import { Link } from '../lib/rotas'
import { nomeCidade } from '../shared/geo'
import { mensalidadeEmpresa } from '../shared/planos'
import { agoraNoFuso, NOMES_DIAS_CURTOS } from '../shared/tempo'
import { centavosDe, formatarPreco, formatarTelefone, mascaraCelular } from '../shared/texto'
import type { Cidade, HorarioDia, Ponto, Unidade } from '../shared/tipos'
import { usePainel } from './AppPainel'

// As unidades (seção 4 do estudo): cada uma é um pino no mapa da região, com o endereço, o horário,
// as comodidades e a grade dela. A rede cadastra todas aqui; o aluno vê a mais perto.

const DIAS = [1, 2, 3, 4, 5, 6, 0]
const COMODIDADES = ['Estacionamento', 'Vestiário', 'Ar-condicionado', 'Acessibilidade', 'Wi-Fi', 'Armários', 'Piscina', 'Sauna', 'Espaço kids', 'Avaliação física', 'Lanchonete']

function textoHorario(h: HorarioDia[]) {
  const hoje = agoraNoFuso().dia
  const d = h.find((x) => x.dia === hoje)
  return d ? `Hoje das ${d.abre} às ${d.fecha}` : 'Fechada hoje'
}

export function Unidades() {
  const c = usePainel()
  const tema = useTemaEmVolta()
  const e = c.empresa
  const config = useDados('plataforma', () => plataforma.ler())
  const [editando, setEditando] = useState<Partial<Unidade> | null>(null)
  const ativas = e.unidades.filter((u) => u.ativa)
  const marcadores = useMemo<Marcador[]>(
    () =>
      ativas.map((u) => ({
        id: u.id,
        lat: u.ponto.lat,
        lng: u.ponto.lng,
        ancora: 'bottom' as const,
        conteudo: (
          <span className="flex flex-col items-center" title={u.nome}>
            <span className="grid size-8 place-items-center rounded-full border-[3px] border-white text-xs font-black shadow-lg" style={{ background: tema.destaque, color: tema.destaqueTexto }}>
              {u.nome.charAt(0)}
            </span>
            <span className="-mt-1 size-2 rotate-45 bg-white" />
          </span>
        ),
      })),
    [ativas, tema],
  )
  const precos = config.dados?.precos
  const plano = e.plano === 'teste' ? (e.planoDepois ?? 'premium') : e.plano
  const desconto = config.dados ? Math.round(config.dados.descontoRede * 100) : 15

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo text-4xl">Unidades</h1>
          <p className="mt-1 max-w-2xl text-sm text-suave">Cada unidade é um pino no mapa da região, com o endereço, o horário e a grade dela. Quem procura academia perto de casa acha a unidade certa.</p>
        </div>
        <button
          type="button"
          className="btn btn-anilha btn-m"
          onClick={() =>
            setEditando({
              cidade: ativas[0]?.cidade,
              horario: DIAS.filter((d) => d !== 0).map((dia) => ({ dia, abre: dia === 6 ? '08:00' : '06:00', fecha: dia === 6 ? '14:00' : '22:00' })),
              comodidades: [],
              agregadores: [],
              ativa: true,
            })
          }
        >
          <PiPlus /> Nova unidade
        </button>
      </header>

      {ativas.length > 0 && (
        <div className="h-64 overflow-hidden rounded-2xl border border-linha lg:h-80">
          <Mapa
            centro={ativas[0].ponto}
            zoom={ativas.length > 1 ? 10 : 15}
            marcadores={marcadores}
            ajustar={ativas.length > 1 ? ativas.map((u) => u.ponto) : undefined}
            regiao={new Set(ativas.map((u) => u.cidade.codigo)).size > 1}
            tema={tema.escuro ? 'escuro' : 'claro'}
            className="h-full"
          />
        </div>
      )}

      <ul className="grid gap-3 lg:grid-cols-2">
        {e.unidades.map((u) => (
          <li key={u.id} className={`cartao p-5 ${u.ativa ? '' : 'opacity-60'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="titulo flex items-center gap-2 text-2xl">
                  {u.nome} {!u.ativa && <Selo>Desativada</Selo>}
                </p>
                <p className="mt-1.5 flex gap-2 text-sm text-suave">
                  <PiMapPin className="mt-0.5 shrink-0 text-fraco" />
                  <span>
                    {u.endereco}
                    {u.bairro ? `, ${u.bairro}` : ''} · {nomeCidade(u.cidade)}
                  </span>
                </p>
                <p className="mt-1 flex gap-2 text-sm text-suave">
                  <PiClock className="mt-0.5 shrink-0 text-fraco" /> {textoHorario(u.horario)}
                </p>
                {u.whatsapp && (
                  <p className="mt-1 flex gap-2 text-sm text-suave">
                    <PiWhatsappLogo className="mt-0.5 shrink-0 text-fraco" /> {formatarTelefone(u.whatsapp)}
                  </p>
                )}
              </div>
              <button type="button" className="btn btn-sup btn-p shrink-0" onClick={() => setEditando(u)} aria-label={`Editar ${u.nome}`}>
                <PiPencilSimple /> Editar
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {u.precoDesde ? <Selo tom="marca">A partir de {formatarPreco(u.precoDesde)}</Selo> : null}
              {u.agregadores.map((a) => (
                <Selo key={a}>{a === 'wellhub' ? 'Wellhub' : 'TotalPass'}</Selo>
              ))}
            </div>
            {u.comodidades.length > 0 && <p className="mt-2 text-xs text-suave">{u.comodidades.join(' · ')}</p>}
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
              <span className="text-fraco">{e.grade.filter((a) => a.unidade === u.id && a.ativa).length} turmas na grade</span>
              {u.ativa && (
                <Link para={`/${c.slug}?unidade=${u.id}`} className="text-suave hover:text-texto">
                  Ver na página →
                </Link>
              )}
            </p>
          </li>
        ))}
      </ul>

      {precos && (
        <p className="text-xs text-fraco">
          No plano {plano === 'premium' ? 'Premium' : 'Básico'}, cada unidade soma {formatarPreco(plano === 'premium' ? precos.academiaPremium : precos.academiaBasico)} por mês; a partir de 3 unidades, a rede tem{' '}
          {desconto}% de desconto. Hoje: {formatarPreco(mensalidadeEmpresa(plano, ativas.length, config.dados!))} por mês
          {e.status === 'teste' ? ' depois do teste' : ''}.
        </p>
      )}

      <EditarUnidade atual={editando} aoFechar={() => setEditando(null)} />
    </div>
  )
}

function EditarUnidade({ atual, aoFechar }: { atual: Partial<Unidade> | null; aoFechar: () => void }) {
  const c = usePainel()
  const avisar = useAviso()
  const tema = useTemaEmVolta()
  const [u, setU] = useState<Partial<Unidade>>({})
  const [preco, setPreco] = useState('')
  const [ultimo, setUltimo] = useState<Partial<Unidade> | null>(null)
  const [salvando, setSalvando] = useState(false)
  if (atual !== ultimo) {
    setUltimo(atual)
    setU(atual ? { ...atual, whatsapp: atual.whatsapp ? mascaraCelular(atual.whatsapp) : '' } : {})
    setPreco(atual?.precoDesde ? (atual.precoDesde / 100).toFixed(2).replace('.', ',') : '')
  }
  const horario = u.horario ?? []
  const doDia = (dia: number) => horario.find((h) => h.dia === dia)
  const mudarDia = (dia: number, h: Partial<HorarioDia> | null) =>
    setU((x) => {
      const lista = (x.horario ?? []).filter((y) => y.dia !== dia)
      const antes = (x.horario ?? []).find((y) => y.dia === dia)
      return { ...x, horario: h ? [...lista, { dia, abre: '06:00', fecha: '22:00', ...antes, ...h }].sort((a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia)) : lista }
    })
  const copiarSegunda = () => {
    const seg = doDia(1)
    if (!seg) return
    setU((x) => ({ ...x, horario: [...(x.horario ?? []).filter((h) => h.dia === 0 || h.dia === 6), ...[1, 2, 3, 4, 5].map((dia) => ({ ...seg, dia }))].sort((a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia)) }))
  }

  const salvar = async (extra: Partial<Unidade> = {}) => {
    setSalvando(true)
    try {
      const r = await painel.unidade(c.slug, { ...u, ...extra, precoDesde: centavosDe(preco) })
      c.mudar(r.empresa)
      esquecer(`pagina:${c.slug}`)
      avisar(u.id ? 'Unidade salva.' : 'Unidade criada: já está no mapa.')
      aoFechar()
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setSalvando(false)
    }
  }
  const desativar = async () => {
    if (!u.id || !confirm(`Desativar a unidade ${u.nome}? Ela sai do mapa e da página; os alunos continuam na academia.`)) return
    try {
      c.mudar((await painel.removerUnidade(c.slug, u.id)).empresa)
      esquecer(`pagina:${c.slug}`)
      aoFechar()
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    }
  }

  return (
    <Folha aberta={!!atual} aoFechar={aoFechar} titulo={u.id ? `Unidade ${u.nome}` : 'Nova unidade'} largura="max-w-2xl">
      <div className="space-y-5 p-6">
        <h2 className="titulo text-3xl">{u.id ? u.nome : 'Nova unidade'}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Nome da unidade" dica="Centro, Shopping, Zona Sul…">
            <input className="campo" maxLength={30} value={u.nome ?? ''} onChange={(ev) => setU({ ...u, nome: ev.target.value })} />
          </Campo>
          <Campo rotulo="WhatsApp da recepção">
            <input className="campo" inputMode="tel" maxLength={20} value={u.whatsapp ?? ''} onChange={(ev) => setU({ ...u, whatsapp: mascaraCelular(ev.target.value) })} placeholder="(35) 99999-0000" />
          </Campo>
        </div>
        <div>
          <span className="rotulo">Cidade</span>
          <EscolherCidade key={u.id ?? 'nova'} inicial={u.cidade ? nomeCidade(u.cidade) : ''} aoEscolher={(cidade: Cidade) => setU({ ...u, cidade, ponto: undefined })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <Campo rotulo="Endereço">
            <input className="campo" maxLength={120} placeholder="Rua, número" value={u.endereco ?? ''} onChange={(ev) => setU({ ...u, endereco: ev.target.value })} />
          </Campo>
          <Campo rotulo="Bairro">
            <input className="campo" maxLength={40} value={u.bairro ?? ''} onChange={(ev) => setU({ ...u, bairro: ev.target.value })} />
          </Campo>
        </div>
        {u.cidade && (
          <div>
            <span className="rotulo">O pino no mapa</span>
            <div className="relative h-56 overflow-hidden rounded-2xl border border-linha">
              <Mapa key={`${u.id}:${u.cidade.codigo}`} centro={u.ponto ?? u.cidade} zoom={15} tema={tema.escuro ? 'escuro' : 'claro'} aoMoverCentro={(ponto: Ponto) => setU((x) => ({ ...x, ponto }))} className="h-full" />
              <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full text-4xl drop-shadow" aria-hidden>
                📍
              </span>
            </div>
            <span className="mt-1.5 block text-xs text-fraco">Arraste o mapa até o pino ficar em cima da porta.</span>
          </div>
        )}
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="rotulo">Horário</span>
            {doDia(1) && (
              <button type="button" className="text-xs font-semibold text-suave hover:text-texto" onClick={copiarSegunda}>
                Repetir a segunda até sexta
              </button>
            )}
          </div>
          <ul className="divide-y divide-linha rounded-2xl border border-linha">
            {DIAS.map((dia) => {
              const h = doDia(dia)
              return (
                <li key={dia} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                  <label className="flex w-24 items-center gap-2 text-sm font-semibold capitalize">
                    <input type="checkbox" checked={!!h} onChange={(ev) => mudarDia(dia, ev.target.checked ? {} : null)} />
                    {NOMES_DIAS_CURTOS[dia]}
                  </label>
                  {h ? (
                    <span className="flex items-center gap-2 text-sm">
                      <input className="campo h-9 w-28 px-2" type="time" step={900} value={h.abre} onChange={(ev) => mudarDia(dia, { abre: ev.target.value })} aria-label={`Abre (${NOMES_DIAS_CURTOS[dia]})`} />
                      às
                      <input className="campo h-9 w-28 px-2" type="time" step={900} value={h.fecha} onChange={(ev) => mudarDia(dia, { fecha: ev.target.value })} aria-label={`Fecha (${NOMES_DIAS_CURTOS[dia]})`} />
                    </span>
                  ) : (
                    <span className="text-sm text-fraco">Fechada</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
        <Etiquetas rotulo="Comodidades" valor={u.comodidades ?? []} sugestoes={COMODIDADES} max={12} aoMudar={(comodidades) => setU({ ...u, comodidades })} />
        <div>
          <p className="rotulo">Aceita</p>
          <div className="flex flex-wrap gap-1.5">
            {(['wellhub', 'totalpass'] as const).map((a) => (
              <button
                key={a}
                type="button"
                className="chip"
                aria-pressed={!!u.agregadores?.includes(a)}
                onClick={() => setU({ ...u, agregadores: u.agregadores?.includes(a) ? u.agregadores.filter((x) => x !== a) : [...(u.agregadores ?? []), a] })}
              >
                {a === 'wellhub' ? 'Wellhub' : 'TotalPass'}
              </button>
            ))}
          </div>
        </div>
        <Campo rotulo="Mensalidade a partir de (R$)" dica="Aparece na página e no mapa. Vazio, não mostra." className="max-w-xs">
          <input className="campo" inputMode="decimal" value={preco} onChange={(ev) => setPreco(ev.target.value.replace(/[^\d,.]/g, ''))} placeholder="119,90" />
        </Campo>
        <div className="flex flex-wrap gap-2">
          {u.id && !u.ativa ? (
            <button type="button" className="btn btn-anilha btn-m flex-1" disabled={salvando} onClick={() => salvar({ ativa: true })}>
              {salvando ? <Girando /> : 'Salvar e reativar'}
            </button>
          ) : (
            <button type="button" className="btn btn-anilha btn-m flex-1" disabled={salvando || !u.nome?.trim() || (u.endereco?.trim().length ?? 0) < 5 || !u.cidade} onClick={() => salvar()}>
              {salvando ? <Girando /> : u.id ? 'Salvar a unidade' : 'Criar a unidade'}
            </button>
          )}
          {u.id && u.ativa && (
            <button type="button" className="btn btn-fantasma btn-m text-perigo" onClick={desativar}>
              Desativar
            </button>
          )}
        </div>
      </div>
    </Folha>
  )
}
