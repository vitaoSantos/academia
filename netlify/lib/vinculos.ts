import { limiteAlunosEmpresa, limiteAlunosPersonal } from '../../src/shared/planos.ts'
import type { AlunoDoPainel, Convite, Empresa, Profissional, Vinculo } from '../../src/shared/tipos.ts'
import type { ContaGuardada } from './auth.ts'
import { avisarSemFalhar } from './avisos.ts'
import { lerConta, mudarConta } from './contas.ts'
import { indexarEmpresa, lerEmpresa, mudarEmpresa, nomeDaUnidade } from './empresas.ts'
import { falhar } from './http.ts'
import { lerPlataforma } from './plataforma.ts'
import { lerProfissional, recontar } from './profissionais.ts'
import { atualizar, CHAVES, criarSeNovo, lerJSON, novoCodigo } from './store.ts'

// Os vínculos: o aluno com a academia (numa unidade) e com o personal. Cada lado guarda a sua lista
// (o aluno, os vínculos dele; a academia e o personal, os alunos com o resumo do painel). Encerrar
// não apaga: o histórico conta nos "alunos instruídos".

export type Alvo = { tipo: 'empresa'; id: string; unidade?: string } | { tipo: 'profissional'; id: string }

export const lerVinculos = (aluno: string) => lerJSON<Vinculo[]>(CHAVES.vinculos(aluno), [])

const chaveAlunos = (alvo: Alvo) => (alvo.tipo === 'empresa' ? CHAVES.alunosDaEmpresa(alvo.id) : CHAVES.alunosDoProfissional(alvo.id))

export const lerAlunos = (alvo: Alvo) => lerJSON<AlunoDoPainel[]>(chaveAlunos(alvo), [])

export const vinculoAtivo = (vinculos: Vinculo[], alvo: Pick<Alvo, 'tipo' | 'id'>) => vinculos.find((v) => v.tipo === alvo.tipo && v.id === alvo.id && v.status === 'ativo')

// O limite do plano: a academia no básico tem até 300 alunos ativos por unidade; o personal no
// básico, até 15. Quem passou do limite continua com os alunos, só não entra aluno novo.
async function conferirLimite(alvo: Alvo, alunos: AlunoDoPainel[]) {
  const config = await lerPlataforma()
  const ativos = alunos.filter((a) => a.status === 'ativo').length
  if (alvo.tipo === 'empresa') {
    const e = await lerEmpresa(alvo.id)
    if (!e) falhar(404, 'Empresa não encontrada.')
    if (ativos >= limiteAlunosEmpresa(e!, config)) falhar(402, 'O plano da academia chegou ao limite de alunos. Fale com a recepção.')
  } else {
    const p = await lerProfissional(alvo.id)
    if (!p) falhar(404, 'Profissional não encontrado.')
    if (ativos >= limiteAlunosPersonal(p!, config)) falhar(402, p!.plano === 'nenhum' || p!.status === 'suspenso' ? 'Este profissional não está atendendo alunos pela plataforma agora.' : 'O plano do personal chegou ao limite de alunos.')
  }
}

// Para quem aceita o pedido (o personal) ou aprova (a academia)
export async function exigirVaga(alvo: Alvo) {
  await conferirLimite(alvo, await lerAlunos(alvo))
}

const novoAlunoDoPainel = (c: ContaGuardada, status: AlunoDoPainel['status'], unidade?: string): AlunoDoPainel => ({
  id: c.id,
  nome: c.nome,
  usuario: c.usuario,
  ...(c.foto ? { foto: c.foto } : {}),
  status,
  desde: new Date().toISOString(),
  ...(unidade ? { unidade } : {}),
  modalidades: [],
  faixas: {},
  treinosSemana: 0,
  medidas: c.consentimentos.medidas.length > 0,
})

// Liga o aluno (ou deixa pendente, quando é o aluno que pede para a academia aprovar)
export async function vincular(aluno: ContaGuardada, alvo: Alvo, origem: Vinculo['origem'], status: 'ativo' | 'pendente' = 'ativo') {
  const unidade = alvo.tipo === 'empresa' ? alvo.unidade : undefined
  const agora = new Date().toISOString()
  // quem já é aluno ativo nunca volta a pendente; só muda de unidade
  await atualizar<AlunoDoPainel[]>(chaveAlunos(alvo), [], (lista) => {
    const atual = lista.find((a) => a.id === aluno.id)
    if (atual?.status === 'ativo') {
      if (status !== 'ativo' || !unidade || atual.unidade === unidade) return lista
      return lista.map((a) => (a.id === aluno.id ? { ...a, unidade } : a))
    }
    const novo: AlunoDoPainel = { ...(atual ?? novoAlunoDoPainel(aluno, status, unidade)), status, ...(unidade ? { unidade } : {}), desde: agora }
    return [...lista.filter((a) => a.id !== aluno.id), novo]
  })
  await atualizar<Vinculo[]>(CHAVES.vinculos(aluno.id), [], (lista) => {
    const atual = lista.find((v) => v.tipo === alvo.tipo && v.id === alvo.id)
    if (atual?.status === 'ativo') {
      if (status !== 'ativo' || !unidade || atual.unidade === unidade) return lista
      return lista.map((v) => (v === atual ? { ...v, unidade } : v))
    }
    const v: Vinculo = { tipo: alvo.tipo, id: alvo.id, ...(unidade ? { unidade } : {}), status, desde: agora, origem }
    return [...lista.filter((x) => !(x.tipo === alvo.tipo && x.id === alvo.id)), v]
  })
  // a primeira marca que o aluno ganha é a que o app veste
  if (status === 'ativo' && !aluno.principal) await mudarConta(aluno.id, (c) => (c.principal ? c : { ...c, principal: { tipo: alvo.tipo, id: alvo.id } }))
  if (alvo.tipo === 'profissional') await recontar(alvo.id)
  else await contarAlunosDaEmpresa(alvo.id)
}

export async function desvincular(alunoId: string, alvo: Pick<Alvo, 'tipo' | 'id'>) {
  const agora = new Date().toISOString()
  await atualizar<AlunoDoPainel[]>(chaveAlunos(alvo as Alvo), [], (l) => (l.some((a) => a.id === alunoId && a.status !== 'encerrado') ? l.map((a) => (a.id === alunoId ? { ...a, status: 'encerrado' } : a)) : l))
  await atualizar<Vinculo[]>(CHAVES.vinculos(alunoId), [], (l) =>
    l.some((v) => v.tipo === alvo.tipo && v.id === alvo.id && v.status !== 'encerrado') ? l.map((v) => (v.tipo === alvo.tipo && v.id === alvo.id ? { ...v, status: 'encerrado', ate: agora } : v)) : l,
  )
  await mudarConta(alunoId, (c) => (c.principal?.tipo === alvo.tipo && c.principal.id === alvo.id ? { ...c, principal: undefined } : c)).catch(() => null)
  if (alvo.tipo === 'profissional') await recontar(alvo.id)
  else await contarAlunosDaEmpresa(alvo.id)
}

export async function contarAlunosDaEmpresa(slug: string) {
  const alunos = await lerJSON<AlunoDoPainel[]>(CHAVES.alunosDaEmpresa(slug), [])
  const n = alunos.filter((a) => a.status === 'ativo').length
  const e = await atualizar<Empresa | null>(CHAVES.empresa(slug), null, (x) => (x && x.numeros.alunos !== n ? { ...x, numeros: { ...x.numeros, alunos: n } } : x))
  if (e) await indexarEmpresa(e)
}

// Muda o resumo de um aluno no painel (a ficha atual, o último treino, a faixa, a unidade)
export async function mudarAlunoDoPainel(alvo: Pick<Alvo, 'tipo' | 'id'>, alunoId: string, mudar: (a: AlunoDoPainel) => AlunoDoPainel) {
  await atualizar<AlunoDoPainel[]>(chaveAlunos(alvo as Alvo), [], (l) => {
    const i = l.findIndex((a) => a.id === alunoId)
    if (i < 0) return l
    const novo = mudar(l[i])
    if (novo === l[i]) return l
    const copia = [...l]
    copia[i] = novo
    return copia
  })
}

// ---------- Convites (o link que a academia ou o personal manda no WhatsApp) ----------

const DIAS_CONVITE = 30

export async function criarConvite(tipo: Convite['tipo'], de: Convite['de'], dados: { nome?: string; contato?: string }) {
  for (let i = 0; i < 8; i++) {
    const codigo = novoCodigo(8)
    const agora = Date.now()
    const convite: Convite = {
      codigo,
      tipo,
      de,
      ...(dados.nome ? { nome: dados.nome } : {}),
      ...(dados.contato ? { contato: dados.contato } : {}),
      criadoEm: new Date(agora).toISOString(),
      expira: new Date(agora + DIAS_CONVITE * 86_400_000).toISOString(),
    }
    if (await criarSeNovo(CHAVES.convite(codigo), convite)) {
      await atualizar<string[]>(CHAVES.convitesDe(`${de.tipo}:${de.id}`), [], (l) => [codigo, ...l].slice(0, 300))
      return convite
    }
  }
  return falhar(500, 'Não deu para criar o convite. Tente de novo.')
}

export const lerConvite = (codigo: string) => lerJSON<Convite | null>(CHAVES.convite(codigo.toUpperCase()), null)

// O convite visto por quem recebe: quem convida e com que marca o app vai abrir
export async function convitePublico(c: Convite) {
  if (c.de.tipo === 'empresa') {
    const e = await lerEmpresa(c.de.id)
    if (!e) return null
    return { codigo: c.codigo, tipo: c.tipo, nome: c.nome, de: { tipo: 'empresa' as const, id: e.slug, nome: nomeDaUnidade(e, c.de.unidade), visual: e.visual }, expirado: new Date(c.expira).getTime() < Date.now(), usado: !!c.usadoPor }
  }
  const p = await lerProfissional(c.de.id)
  if (!p) return null
  return { codigo: c.codigo, tipo: c.tipo, nome: c.nome, de: { tipo: 'profissional' as const, id: p.slug, nome: p.nome, visual: p.visual }, expirado: new Date(c.expira).getTime() < Date.now(), usado: !!c.usadoPor }
}

// Aceitar: o aluno entra na academia (ou no personal); o professor entra na equipe
export async function aceitarConvite(codigo: string, conta: ContaGuardada) {
  const c = await lerConvite(codigo)
  if (!c) return falhar(404, 'Convite não encontrado. Confira o link.')
  if (c.usadoPor && c.usadoPor !== conta.id) falhar(409, 'Este convite já foi usado por outra pessoa.')
  if (new Date(c.expira).getTime() < Date.now()) falhar(410, 'Este convite venceu. Peça um novo.')
  if (c.tipo === 'professor') {
    if (c.de.tipo !== 'empresa') falhar(400, 'Convite inválido.')
    await entrarNaEquipe(c.de.id, conta, c.de.unidade)
  } else {
    const alvo: Alvo = c.de.tipo === 'empresa' ? { tipo: 'empresa', id: c.de.id, unidade: c.de.unidade } : { tipo: 'profissional', id: c.de.id }
    const vinculos = await lerVinculos(conta.id)
    if (!vinculoAtivo(vinculos, alvo)) await conferirLimite(alvo, await lerAlunos(alvo))
    await vincular(conta, alvo, 'convite')
    const quem = c.de.tipo === 'empresa' ? await lerEmpresa(c.de.id) : null
    const dono = c.de.tipo === 'empresa' ? quem?.dono : c.de.id
    if (dono) avisarSemFalhar(dono, 'vinculo', `${conta.nome} aceitou o convite e agora é seu aluno.`, c.de.tipo === 'empresa' ? `/painel/${c.de.id}/alunos` : '/pro/alunos')
  }
  await atualizar<Convite | null>(CHAVES.convite(c.codigo), null, (x) => (x && !x.usadoPor ? { ...x, usadoPor: conta.id } : x))
  return c
}

// O professor entra na equipe da academia (e ganha o perfil profissional, se ainda não tinha)
export async function entrarNaEquipe(slug: string, conta: ContaGuardada, unidade?: string) {
  const e = await mudarEmpresa(slug, (x) => {
    if (x.equipe.some((m) => m.id === conta.id)) return x
    const unidades = unidade ? [unidade] : x.unidades.map((u) => u.id)
    return { ...x, equipe: [...x.equipe, { id: conta.id, nome: conta.nome, papel: 'professor', unidades, desde: new Date().toISOString() }] }
  })
  await mudarConta(conta.id, (c) => (c.empresas?.some((x) => x.slug === slug) ? c : { ...c, empresas: [...(c.empresas ?? []), { slug, papel: 'professor' }] }))
  avisarSemFalhar(e.dono, 'vinculo', `${conta.nome} entrou na equipe como professor.`, `/painel/${slug}/equipe`)
  return e
}

// ---------- Quem pode ver os treinos e as medidas do aluno ----------

// O profissional vê os treinos do aluno quando é personal dele (vínculo ativo) ou professor de uma
// academia onde o aluno está ativo; as medidas, só com o consentimento do aluno
export async function acessoAoAluno(profissionalId: string, alunoId: string): Promise<{ treinos: boolean; medidas: boolean; contextos: Alvo[] }> {
  const [vinculos, conta, pro] = await Promise.all([lerVinculos(alunoId), lerConta(alunoId), lerConta(profissionalId)])
  const contextos: Alvo[] = []
  if (vinculoAtivo(vinculos, { tipo: 'profissional', id: profissionalId })) contextos.push({ tipo: 'profissional', id: profissionalId })
  for (const v of vinculos.filter((x) => x.tipo === 'empresa' && x.status === 'ativo')) {
    const minha = pro?.empresas?.find((m) => m.slug === v.id)
    if (minha && minha.papel !== 'recepcao') contextos.push({ tipo: 'empresa', id: v.id, unidade: v.unidade })
  }
  const consentiu = new Set(conta?.consentimentos.medidas ?? [])
  const medidas = contextos.some((c) => consentiu.has(c.tipo === 'profissional' ? c.id : `empresa:${c.id}`)) || consentiu.has(profissionalId)
  return { treinos: contextos.length > 0, medidas: contextos.length > 0 && medidas, contextos }
}

export type ResumoMarca = { tipo: 'empresa' | 'profissional'; id: string; slug: string; nome: string; visual: Empresa['visual'] | Profissional['visual'] }
