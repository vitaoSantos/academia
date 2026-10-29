import { datasDaFixa, fimDaSessao, horariosLivres, podeDesmarcar } from '../../src/shared/agenda.ts'
import { agoraNoFuso, DATA, diaDaSemana, HORA, somarDias, textoData } from '../../src/shared/tempo.ts'
import { limpar } from '../../src/shared/texto.ts'
import type { SessaoDoAluno } from '../../src/shared/respostas.ts'
import type { Profissional, Sessao, SessaoFixa } from '../../src/shared/tipos.ts'
import type { ContaGuardada } from './auth.ts'
import { avisarSemFalhar } from './avisos.ts'
import { lerConta } from './contas.ts'
import { lerEmpresa } from './empresas.ts'
import { falhar } from './http.ts'
import { atualizar, CHAVES, lerJSON, novoId } from './store.ts'
import { lerVinculos, vinculoAtivo } from './vinculos.ts'

// A agenda do profissional (seção 13 do estudo): uma folha por dia com as sessões, gravada com
// escrita condicional (dois alunos no mesmo horário: um marca, o outro ouve que acabou de ser
// pego). As sessões fixas (seg/qua/sex 7h) entram em cada dia sem ocupar espaço até acontecer.

export const lerDia = (pro: string, data: string) => lerJSON<Sessao[]>(CHAVES.agenda(pro, data), [])

// Quem pode marcar com quem: o aluno do personal (vínculo ativo) e, quando a academia libera a agenda
// dos professores, o aluno dela com os professores de lá
export async function atendeOAluno(pro: Profissional, alunoId: string) {
  const vinculos = await lerVinculos(alunoId)
  if (vinculoAtivo(vinculos, { tipo: 'profissional', id: pro.id })) return true
  const conta = await lerConta(pro.id)
  for (const m of conta?.empresas ?? []) {
    if (m.papel === 'recepcao' || !vinculoAtivo(vinculos, { tipo: 'empresa', id: m.slug })) continue
    if ((await lerEmpresa(m.slug))?.agendaProfessores) return true
  }
  return false
}

// Os professores das academias do aluno que abriram a agenda (com a academia liberando)
export async function professoresComAgenda(alunoId: string) {
  const lista: { id: string; nome: string; foto?: string; empresa: string; empresaNome: string }[] = []
  for (const v of (await lerVinculos(alunoId)).filter((x) => x.tipo === 'empresa' && x.status === 'ativo')) {
    const e = await lerEmpresa(v.id)
    if (!e?.agendaProfessores) continue
    for (const m of e.equipe.filter((x) => x.papel === 'professor' && x.id !== alunoId)) {
      const p = await lerJSON<Profissional | null>(CHAVES.profissional(m.id), null)
      if (p?.agenda.ativa && !lista.some((x) => x.id === p.id)) lista.push({ id: p.id, nome: p.nome, ...(p.foto ? { foto: p.foto } : {}), empresa: e.slug, empresaNome: e.nome })
    }
  }
  return lista
}
export const lerFixas = (pro: string) => lerJSON<SessaoFixa[]>(CHAVES.fixas(pro), [])

// As sessões do dia: as gravadas e as fixas daquele dia da semana (as fixas já canceladas ou
// remarcadas naquele dia ficam gravadas com o id da fixa)
export async function sessoesDoDia(pro: string, data: string): Promise<Sessao[]> {
  const [gravadas, fixas] = await Promise.all([lerDia(pro, data), lerFixas(pro)])
  const dia = diaDaSemana(data)
  const virtuais = fixas
    .filter((f) => f.dias.includes(dia) && f.desde <= data && !gravadas.some((g) => g.fixa === f.id))
    .map<Sessao>((f) => ({ id: `fixa-${f.id}-${data}`, profissional: pro, aluno: f.aluno, alunoNome: f.alunoNome, data, inicio: f.inicio, fim: fimDaSessao(f.inicio, f.duracao), ...(f.local ? { local: f.local } : {}), status: 'marcada', criadaPor: 'profissional', fixa: f.id }))
  return [...gravadas, ...virtuais].sort((a, b) => a.inicio.localeCompare(b.inicio))
}

export async function livresNoDia(p: Profissional, data: string) {
  return horariosLivres(p.agenda, data, await sessoesDoDia(p.id, data), agoraNoFuso())
}

async function anotarNoAluno(s: Sessao, pro: Profissional) {
  const linha: SessaoDoAluno = { id: s.id, profissional: pro.id, profissionalNome: pro.nome, data: s.data, inicio: s.inicio, fim: s.fim, ...(s.local ? { local: s.local } : {}), status: s.status }
  const corte = somarDias(agoraNoFuso().data, -30)
  await atualizar<SessaoDoAluno[]>(CHAVES.sessoesDo(s.aluno), [], (l) => [...l.filter((x) => x.id !== s.id && x.data >= corte), linha].sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio)).slice(-120))
}

// Marcar: o aluno nos horários livres (quando o personal deixa), o personal em qualquer horário livre
export async function marcar(quem: ContaGuardada, pro: Profissional, dados: { aluno: string; data: unknown; inicio: unknown; local?: unknown; obs?: unknown }) {
  if (!pro.agenda.ativa) falhar(403, 'A agenda deste profissional está fechada.')
  const data = typeof dados.data === 'string' && DATA.test(dados.data) ? dados.data : ''
  const inicio = typeof dados.inicio === 'string' && HORA.test(dados.inicio) ? dados.inicio : ''
  if (!data || !inicio) falhar(400, 'Escolha o dia e o horário.')
  const ehPro = quem.id === pro.id
  if (!ehPro && !pro.agenda.alunoMarca) falhar(403, 'Combine o horário com o seu personal pelo chat.')
  const aluno = ehPro ? await lerConta(dados.aluno) : quem
  if (!aluno) return falhar(404, 'Aluno não encontrado.')
  if (!(await atendeOAluno(pro, aluno.id))) falhar(403, ehPro ? 'Esta pessoa não é sua aluna.' : 'Você não é aluno deste profissional.')
  const agora = agoraNoFuso()
  const local = limpar(dados.local, 60) || pro.agenda.locais[0]
  const obs = limpar(dados.obs, 160)
  const sessao: Sessao = { id: novoId(), profissional: pro.id, aluno: aluno.id, alunoNome: aluno.nome, data, inicio, fim: fimDaSessao(inicio, pro.agenda.duracao), ...(local ? { local } : {}), status: 'marcada', criadaPor: ehPro ? 'profissional' : 'aluno', ...(obs ? { obs } : {}) }
  const fixas = await lerFixas(pro.id)
  await atualizar<Sessao[]>(CHAVES.agenda(pro.id, data), [], (gravadas) => {
    const dia = diaDaSemana(data)
    const virtuais = fixas.filter((f) => f.dias.includes(dia) && f.desde <= data && !gravadas.some((g) => g.fixa === f.id)).map((f) => ({ inicio: f.inicio, fim: fimDaSessao(f.inicio, f.duracao), status: 'marcada' as const }))
    const ocupadas = [...gravadas, ...virtuais]
    // o personal pode encaixar fora das janelas; o aluno, só nos horários livres
    const livre = ehPro ? !ocupadas.some((s) => (s.status === 'marcada' || s.status === 'feita') && s.inicio < sessao.fim && sessao.inicio < s.fim) : horariosLivres(pro.agenda, data, ocupadas, agora).includes(inicio)
    if (!livre) falhar(409, 'Esse horário acabou de ser ocupado. Escolha outro.')
    return [...gravadas, sessao]
  })
  await anotarNoAluno(sessao, pro)
  const quando = `${textoData(data)} às ${inicio}`
  if (ehPro) avisarSemFalhar(aluno.id, 'sessao', `${pro.nome} marcou uma sessão: ${quando}.`, '/agenda')
  else avisarSemFalhar(pro.id, 'sessao', `${aluno.nome} marcou ${quando}.`, '/pro/agenda')
  return sessao
}

// Desmarcar (ou marcar feita/faltou, só o personal). Na sessão fixa vale só para aquele dia.
export async function mudarSessao(quem: ContaGuardada, pro: Profissional, id: string, data: string, status: 'cancelada' | 'feita' | 'faltou') {
  const ehPro = quem.id === pro.id
  if (!ehPro && status !== 'cancelada') falhar(403, 'Só o personal marca presença.')
  const todas = await sessoesDoDia(pro.id, data)
  const s = todas.find((x) => x.id === id)
  if (!s) return falhar(404, 'Sessão não encontrada.')
  if (!ehPro && s.aluno !== quem.id) falhar(403, 'Esta sessão não é sua.')
  if (status === 'cancelada' && !podeDesmarcar(s, pro.agenda, ehPro ? 'profissional' : 'aluno')) falhar(409, `Desmarque com pelo menos ${pro.agenda.cancelarAte} horas de antecedência. Fale com o seu personal.`)
  const nova: Sessao = { ...s, status, ...(s.id.startsWith('fixa-') ? { id: novoId() } : {}) }
  await atualizar<Sessao[]>(CHAVES.agenda(pro.id, data), [], (l) => [...l.filter((x) => x.id !== s.id), nova])
  await anotarNoAluno(nova, pro)
  if (status === 'cancelada') {
    const quando = `${textoData(data)} às ${s.inicio}`
    if (ehPro) avisarSemFalhar(s.aluno, 'sessao', `${pro.nome} desmarcou a sessão de ${quando}.`, '/agenda')
    else avisarSemFalhar(pro.id, 'sessao', `${s.alunoNome} desmarcou ${quando}.`, '/pro/agenda')
  }
  return nova
}

export async function criarFixa(pro: Profissional, aluno: ContaGuardada, dados: { dias: unknown; inicio: unknown; local?: unknown }) {
  const dias = Array.isArray(dados.dias) ? [...new Set(dados.dias.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))] : []
  const inicio = typeof dados.inicio === 'string' && HORA.test(dados.inicio) ? dados.inicio : ''
  if (!dias.length || !inicio) falhar(400, 'Escolha os dias e o horário.')
  if (!vinculoAtivo(await lerVinculos(aluno.id), { tipo: 'profissional', id: pro.id })) falhar(403, 'Esta pessoa não é sua aluna.')
  const local = limpar(dados.local, 60)
  const fixa: SessaoFixa = { id: novoId(), aluno: aluno.id, alunoNome: aluno.nome, dias, inicio, duracao: pro.agenda.duracao, ...(local ? { local } : {}), desde: agoraNoFuso().data }
  await atualizar<SessaoFixa[]>(CHAVES.fixas(pro.id), [], (l) => {
    const conflito = l.find((f) => f.dias.some((d) => dias.includes(d)) && f.inicio === inicio)
    if (conflito) falhar(409, `Já tem a sessão fixa de ${conflito.alunoNome} nesse horário.`)
    return [...l, fixa]
  })
  avisarSemFalhar(aluno.id, 'sessao', `${pro.nome} reservou o seu horário fixo.`, '/agenda')
  return fixa
}

export async function apagarFixa(pro: string, id: string) {
  await atualizar<SessaoFixa[]>(CHAVES.fixas(pro), [], (l) => l.filter((f) => f.id !== id))
}

// A semana do profissional (as sessões gravadas e as fixas)
export async function semana(pro: string, de: string) {
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(de, i))
  const porDia = await Promise.all(dias.map((d) => sessoesDoDia(pro, d)))
  return dias.map((data, i) => ({ data, sessoes: porDia[i] }))
}

// As próximas sessões do aluno, com as fixas dos próximos 14 dias de cada personal
export async function proximasDoAluno(aluno: string) {
  const hojeData = agoraNoFuso().data
  const gravadas = (await lerJSON<SessaoDoAluno[]>(CHAVES.sessoesDo(aluno), [])).filter((s) => s.data >= hojeData)
  const pros = (await lerVinculos(aluno)).filter((v) => v.tipo === 'profissional' && v.status === 'ativo')
  const virtuais: SessaoDoAluno[] = []
  for (const v of pros) {
    const p = await lerJSON<Profissional | null>(CHAVES.profissional(v.id), null)
    if (!p) continue
    for (const f of (await lerFixas(v.id)).filter((x) => x.aluno === aluno)) {
      for (const d of datasDaFixa(f, hojeData, somarDias(hojeData, 14))) {
        const ja = gravadas.find((g) => g.profissional === v.id && g.data === d && g.inicio === f.inicio)
        if (!ja) virtuais.push({ id: `fixa-${f.id}-${d}`, profissional: v.id, profissionalNome: p.nome, data: d, inicio: f.inicio, fim: fimDaSessao(f.inicio, f.duracao), ...(f.local ? { local: f.local } : {}), status: 'marcada' })
      }
    }
  }
  return [...gravadas, ...virtuais].sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio))
}
