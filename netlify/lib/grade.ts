import { aulasDoDia, cancelar, checkinAberto, podeCancelar, reservaAberta, reservar, SITUACAO_VAZIA, HORAS_PARA_CANCELAR } from '../../src/shared/aulas.ts'
import { nomeModalidade } from '../../src/shared/modalidades.ts'
import { agoraNoFuso, DATA, instante, somarDias, textoData } from '../../src/shared/tempo.ts'
import type { AulaDoDia, ReservaDoAluno } from '../../src/shared/respostas.ts'
import type { Aula, Empresa, FolhaDoDia, PedidoExperimental, SituacaoAula } from '../../src/shared/tipos.ts'
import type { ContaGuardada } from './auth.ts'
import { avisarSemFalhar } from './avisos.ts'
import { abrirConversa, enviar } from './conversas.ts'
import { lerConta } from './contas.ts'
import { lerEmpresa, mudarEmpresa, nomeDaUnidade, PODE } from './empresas.ts'
import { falhar } from './http.ts'
import { atualizar, CHAVES, lerJSON, novoId } from './store.ts'
import { somarNoDia } from './estatisticas.ts'
import { registrarTreino } from './treinos.ts'
import { lerVinculos, vinculoAtivo } from './vinculos.ts'

// A grade das modalidades (seção 8 do estudo): a folha de cada unidade em cada dia guarda as
// reservas, a fila e a presença de cada aula, gravada com escrita condicional. A última vaga
// disputada por duas pessoas: uma entra, a outra vai para a fila.

export const lerFolha = (slug: string, unidade: string, data: string) => lerJSON<FolhaDoDia>(CHAVES.folha(slug, unidade, data), {})

export function acharAula(e: Empresa, aulaId: string) {
  const a = e.grade.find((x) => x.id === aulaId && x.ativa)
  return a ?? falhar(404, 'Aula não encontrada.')
}

const situacaoDe = (folha: FolhaDoDia, aula: string): SituacaoAula => folha[aula] ?? SITUACAO_VAZIA

// O dia de uma unidade: as aulas com as vagas e a situação de quem está vendo
export async function diaDaUnidade(e: Empresa, unidade: string, data: string, quem?: string): Promise<AulaDoDia[]> {
  const folha = await lerFolha(e.slug, unidade, data)
  return aulasDoDia(e.grade, unidade, data).map((a) => {
    const s = situacaoDe(folha, a.id)
    const minha = quem ? s.reservas.find((r) => r.conta === quem) : undefined
    const naFila = quem ? s.espera.findIndex((r) => r.conta === quem) + 1 : 0
    return {
      aula: a,
      reservas: s.reservas.length,
      espera: s.espera.length,
      livres: a.vagas > 0 ? Math.max(0, a.vagas - s.reservas.length) : null,
      lugaresOcupados: a.lugares ? s.reservas.map((r) => r.lugar).filter((l): l is number => !!l) : [],
      minha: minha ? { lugar: minha.lugar } : null,
      naFila,
      presente: !!quem && s.presentes.includes(quem),
      ...(a.professor ? { professorNome: e.equipe.find((m) => m.id === a.professor)?.nome } : {}),
    }
  })
}

async function anotarNoAluno(conta: string, r: ReservaDoAluno | null, chave: Pick<ReservaDoAluno, 'empresa' | 'aula' | 'data'>) {
  const corte = somarDias(agoraNoFuso().data, -7)
  await atualizar<ReservaDoAluno[]>(CHAVES.reservasDo(conta), [], (l) => {
    const sem = l.filter((x) => !(x.empresa === chave.empresa && x.aula === chave.aula && x.data === chave.data) && x.data >= corte)
    return (r ? [...sem, r] : sem).sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio)).slice(-60)
  })
}

const linhaDoAluno = (e: Empresa, a: Aula, data: string, situacao: ReservaDoAluno['situacao'], lugar?: number): ReservaDoAluno => ({
  empresa: e.slug,
  unidade: a.unidade,
  aula: a.id,
  data,
  inicio: a.inicio,
  modalidade: a.modalidade,
  nome: `${nomeModalidade(a.modalidade)} · ${nomeDaUnidade(e, a.unidade)}`,
  situacao,
  ...(lugar ? { lugar } : {}),
})

// O aluno ativo da academia reserva (ou entra na fila)
export async function reservarAula(conta: ContaGuardada, slug: string, aulaId: string, dataBruta: unknown, lugarBruto?: unknown) {
  const e = await lerEmpresa(slug)
  if (!e) return falhar(404, 'Academia não encontrada.')
  const a = acharAula(e, aulaId)
  const data = typeof dataBruta === 'string' && DATA.test(dataBruta) ? dataBruta : ''
  if (!data || !aulasDoDia(e.grade, a.unidade, data).some((x) => x.id === a.id)) falhar(400, 'Essa aula não acontece nesse dia.')
  if (!a.reserva) falhar(400, 'Esta aula é livre: é só chegar.')
  if (!reservaAberta(a, data, agoraNoFuso())) falhar(409, 'A reserva abre 7 dias antes e fecha quando a aula começa.')
  if (!vinculoAtivo(await lerVinculos(conta.id), { tipo: 'empresa', id: slug })) falhar(403, 'A reserva é para alunos da academia. Peça uma aula experimental.')
  const lugar = Number(lugarBruto) || undefined
  // (o valor muda dentro da gravação condicional)
  let resultado = 'reservada' as 'reservada' | 'espera' | 'ja-tinha'
  let lugarFinal: number | undefined
  await atualizar<FolhaDoDia>(CHAVES.folha(slug, a.unidade, data), {}, (folha) => {
    const r = reservar(a, situacaoDe(folha, a.id), { conta: conta.id, nome: conta.nome, em: new Date().toISOString(), ...(lugar ? { lugar } : {}) })
    resultado = r.resultado
    lugarFinal = r.situacao.reservas.find((x) => x.conta === conta.id)?.lugar
    return r.resultado === 'ja-tinha' ? folha : { ...folha, [a.id]: r.situacao }
  })
  if (resultado !== 'ja-tinha') {
    await anotarNoAluno(conta.id, linhaDoAluno(e, a, data, resultado === 'espera' ? 'espera' : 'reservada', lugarFinal), { empresa: slug, aula: a.id, data })
    await somarNoDia('reservas', !!(conta.demo || conta.visita))
  }
  return { resultado, lugar: lugarFinal }
}

export async function cancelarReserva(conta: ContaGuardada, slug: string, aulaId: string, data: string) {
  const e = await lerEmpresa(slug)
  if (!e) return falhar(404, 'Academia não encontrada.')
  const a = acharAula(e, aulaId)
  const folhaAntes = await lerFolha(slug, a.unidade, data)
  const tinhaVaga = situacaoDe(folhaAntes, a.id).reservas.some((r) => r.conta === conta.id)
  if (tinhaVaga && !podeCancelar(a, data)) falhar(409, `O cancelamento fecha ${HORAS_PARA_CANCELAR} horas antes da aula.`)
  let promovido: { conta: string; nome: string } | undefined
  await atualizar<FolhaDoDia>(CHAVES.folha(slug, a.unidade, data), {}, (folha) => {
    const r = cancelar(a, situacaoDe(folha, a.id), conta.id)
    promovido = r.promovido
    return { ...folha, [a.id]: r.situacao }
  })
  await anotarNoAluno(conta.id, null, { empresa: slug, aula: a.id, data })
  if (promovido) {
    const lugar = (await lerFolha(slug, a.unidade, data))[a.id]?.reservas.find((r) => r.conta === promovido!.conta)?.lugar
    await anotarNoAluno(promovido.conta, linhaDoAluno(e, a, data, 'reservada', lugar), { empresa: slug, aula: a.id, data })
    avisarSemFalhar(promovido.conta, 'espera', `Abriu vaga! Você entrou na aula de ${nomeModalidade(a.modalidade).toLowerCase()} de ${textoData(data)} às ${a.inicio}.`, '/aulas')
  }
}

// A presença: o professor marca, ou o aluno toca em "Cheguei" na hora da aula. Conta como treino
// (nos desafios e na sequência).
export async function marcarPresenca(slug: string, aulaId: string, data: string, contas: string[], quem: ContaGuardada, pelaEquipe: boolean) {
  const e = await lerEmpresa(slug)
  if (!e) return falhar(404, 'Academia não encontrada.')
  const a = acharAula(e, aulaId)
  if (!pelaEquipe && !checkinAberto(a, data)) falhar(409, 'O "Cheguei" vale de 15 minutos antes até meia hora depois do começo da aula.')
  if (pelaEquipe && !e.equipe.some((m) => m.id === quem.id && PODE.treinar.includes(m.papel))) falhar(403, 'Só a equipe marca a presença.')
  const novos: string[] = []
  await atualizar<FolhaDoDia>(CHAVES.folha(slug, a.unidade, data), {}, (folha) => {
    const s = situacaoDe(folha, a.id)
    const entrar = contas.filter((c) => !s.presentes.includes(c))
    if (!entrar.length) return folha
    novos.push(...entrar)
    return { ...folha, [a.id]: { ...s, presentes: [...s.presentes, ...entrar] } }
  })
  const inicio = instante(data, a.inicio)
  for (const id of novos) {
    const c = id === quem.id ? quem : await lerConta(id)
    if (!c) continue
    const fim = new Date(Math.min(Date.now(), Date.parse(inicio) + a.duracao * 60_000)).toISOString()
    await registrarTreino(c, { id: `aula${a.id}${data.replace(/-/g, '')}`.slice(0, 40), inicio, fim, modalidade: a.modalidade, nome: `Aula de ${nomeModalidade(a.modalidade).toLowerCase()}`, local: { empresa: slug, unidade: a.unidade } }).catch((err) =>
      console.error('Presença sem treino', id, err instanceof Error ? err.message : err),
    )
  }
  return novos.length
}

// ---------- A aula experimental ----------

export const lerExperimentais = (slug: string) => lerJSON<PedidoExperimental[]>(CHAVES.experimentais(slug), [])

export async function pedirExperimental(conta: ContaGuardada, slug: string, aulaId: string, dataBruta: unknown) {
  const e = await lerEmpresa(slug)
  if (!e) return falhar(404, 'Academia não encontrada.')
  const a = acharAula(e, aulaId)
  const data = typeof dataBruta === 'string' && DATA.test(dataBruta) ? dataBruta : ''
  if (!data || !aulasDoDia(e.grade, a.unidade, data).some((x) => x.id === a.id)) falhar(400, 'Essa aula não acontece nesse dia.')
  if (data < agoraNoFuso().data || data > somarDias(agoraNoFuso().data, 14)) falhar(400, 'Escolha um dia nas próximas duas semanas.')
  if (vinculoAtivo(await lerVinculos(conta.id), { tipo: 'empresa', id: slug })) falhar(409, 'Você já é aluno daqui: é só reservar.')
  const lista = await lerExperimentais(slug)
  if (lista.some((p) => p.conta === conta.id && p.status === 'novo')) falhar(409, 'Você já pediu uma aula experimental aqui. A academia vai responder pelo chat.')
  const pedido: PedidoExperimental = { id: novoId(), conta: conta.id, nome: conta.nome, aula: a.id, modalidade: a.modalidade, unidade: a.unidade, data, status: 'novo', em: new Date().toISOString() }
  const conversa = await abrirConversa({ tipo: 'conta', id: conta.id }, { tipo: 'empresa', id: slug }, conta)
  pedido.conversa = conversa
  await atualizar<PedidoExperimental[]>(CHAVES.experimentais(slug), [], (l) => [pedido, ...l].slice(0, 500))
  await enviar(conta, conversa, { tipo: 'conta', id: conta.id }, `Oi! Quero fazer uma aula experimental de ${nomeModalidade(a.modalidade).toLowerCase()} na ${nomeDaUnidade(e, a.unidade)}, ${textoData(data)} às ${a.inicio}.`, 'experimental')
  for (const m of e.equipe.filter((x) => PODE.alunos.includes(x.papel))) avisarSemFalhar(m.id, 'experimental', `${conta.nome} pediu uma aula experimental de ${nomeModalidade(a.modalidade).toLowerCase()}.`, `/painel/${slug}/contatos`)
  await anotarNoAluno(conta.id, linhaDoAluno(e, a, data, 'experimental'), { empresa: slug, aula: a.id, data })
  return pedido
}

// A academia confirma (a pessoa entra na lista da aula, mesmo sem ser aluna), recusa ou marca que veio
export async function responderExperimental(slug: string, id: string, status: PedidoExperimental['status'], quem: ContaGuardada) {
  const e = await lerEmpresa(slug)
  if (!e) return falhar(404, 'Academia não encontrada.')
  let pedido: PedidoExperimental | undefined
  await atualizar<PedidoExperimental[]>(CHAVES.experimentais(slug), [], (l) =>
    l.map((p) => {
      if (p.id !== id) return p
      pedido = { ...p, status }
      return pedido
    }),
  )
  if (!pedido) return falhar(404, 'Pedido não encontrado.')
  const a = e.grade.find((x) => x.id === pedido!.aula)
  if (status === 'confirmado' && a) {
    await atualizar<FolhaDoDia>(CHAVES.folha(slug, a.unidade, pedido.data), {}, (folha) => {
      const r = reservar({ ...a, vagas: a.vagas ? a.vagas + 1 : 0 }, situacaoDe(folha, a.id), { conta: pedido!.conta, nome: `${pedido!.nome} (experimental)`, em: new Date().toISOString() })
      return r.resultado === 'ja-tinha' ? folha : { ...folha, [a.id]: r.situacao }
    })
    avisarSemFalhar(pedido.conta, 'experimental', `A ${e.nome} confirmou a sua aula experimental: ${textoData(pedido.data)} às ${a.inicio}.`, `/mensagens/${pedido.conversa ?? ''}`)
    if (pedido.conversa) await enviar(quem, pedido.conversa, { tipo: 'empresa', id: slug }, `Confirmado! Te esperamos ${textoData(pedido.data)} às ${a.inicio}. Traga uma garrafa de água 😉`).catch(() => null)
  }
  if (status === 'recusado' && pedido.conversa) await enviar(quem, pedido.conversa, { tipo: 'empresa', id: slug }, 'Esse horário não vai dar. Podemos combinar outro dia?').catch(() => null)
  return pedido
}

// ---------- Eventos ----------

export async function vouNoEvento(conta: ContaGuardada, slug: string, evento: string) {
  let vai = false
  await mudarEmpresa(slug, (e) => ({
    ...e,
    eventos: e.eventos.map((ev) => {
      if (ev.id !== evento) return ev
      vai = !ev.vou.includes(conta.id)
      return { ...ev, vou: vai ? [...ev.vou, conta.id] : ev.vou.filter((x) => x !== conta.id) }
    }),
  }))
  return vai
}

export const lerReservasDoAluno = (conta: string) => lerJSON<ReservaDoAluno[]>(CHAVES.reservasDo(conta), [])
