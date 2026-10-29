import { proximaDivisao } from '../../src/shared/ficha.ts'
import type { HistoricoDoAluno, InicioDoAluno, VinculoComMarca } from '../../src/shared/respostas.ts'
import { agoraNoFuso, dataDe, hoje, inicioDaSemana } from '../../src/shared/tempo.ts'
import { sequencia } from '../../src/shared/treino.ts'
import type { Vinculo } from '../../src/shared/tipos.ts'
import { exigirConta, type ContaGuardada } from '../lib/auth.ts'
import { avisarSemFalhar } from '../lib/avisos.ts'
import { desafiosDe } from '../lib/desafios.ts'
import { lerEmpresa, nomeDaUnidade, PODE } from '../lib/empresas.ts'
import { fichasDoAluno, lerFicha } from '../lib/fichas.ts'
import { lerReservasDoAluno } from '../lib/grade.ts'
import { falhar, json, lerCorpo, limitar, rotas } from '../lib/http.ts'
import { lerProfissional } from '../lib/profissionais.ts'
import { CONTAS_DEMO, garantirDemonstracao } from '../lib/semente.ts'
import { proximasDoAluno } from '../lib/sessoes.ts'
import { lerLugares, treinosDe } from '../lib/treinos.ts'
import { lerAvaliacoes, podeAvaliar } from '../lib/avaliacoes.ts'
import { aceitarConvite, convitePublico, desvincular, lerConvite, lerVinculos, vincular, vinculoAtivo } from '../lib/vinculos.ts'

// O início do aluno e os vínculos.
// GET ?inicio · ?convite=CODIGO (o convite visto por quem recebeu) · ?vinculos · ?historico (a trajetória)
// POST { acao }: convite (aceitar), pedir (ser aluno da academia ou do personal), sair

async function comMarca(vinculos: Vinculo[]): Promise<VinculoComMarca[]> {
  const saida: VinculoComMarca[] = []
  for (const v of vinculos.filter((x) => x.status !== 'encerrado')) {
    if (v.tipo === 'empresa') {
      const e = await lerEmpresa(v.id)
      if (e) saida.push({ ...v, nome: e.nome, slug: e.slug, visual: e.visual, ...(v.unidade ? { unidadeNome: nomeDaUnidade(e, v.unidade) } : {}) })
    } else {
      const p = await lerProfissional(v.id)
      if (p) saida.push({ ...v, nome: p.nome, slug: p.slug, visual: p.visual })
    }
  }
  return saida
}

async function inicio(conta: ContaGuardada): Promise<InicioDoAluno> {
  const [vinculos, fichas, sessoes, reservas, desafios, treinos] = await Promise.all([lerVinculos(conta.id), fichasDoAluno(conta.id), proximasDoAluno(conta.id), lerReservasDoAluno(conta.id), desafiosDe(conta.id), treinosDe(conta.id, 1)])
  const dia = hoje()
  const semana = inicioDaSemana(dia)
  const daSemana = treinos.filter((t) => dataDe(t.inicio) >= semana)
  const ativas = fichas.filter((f) => f.status === 'ativa')
  // a ficha do treino de hoje: a da marca principal, senão a publicada mais recente
  const p = conta.principal
  const escolhida = ativas.find((f) => p && f.contexto.tipo === p.tipo && 'id' in f.contexto && f.contexto.id === p.id) ?? ativas.find((f) => f.contexto.tipo !== 'propria') ?? ativas[0]
  let proxima: InicioDoAluno['proximaDivisao']
  if (escolhida) {
    const f = await lerFicha(escolhida.id)
    const ultima = treinos.find((t) => t.ficha === escolhida.id)
    const d = f ? proximaDivisao(f, ultima?.divisao) : undefined
    if (f && d) proxima = { ficha: f.id, divisao: d.id, nome: d.nome, ...(d.foco ? { foco: d.foco } : {}) }
  }
  const u = treinos[0]
  return {
    vinculos: await comMarca(vinculos),
    fichas: [...ativas, ...fichas.filter((f) => f.status !== 'ativa')].slice(0, 30),
    sessoes: sessoes.filter((s) => s.status === 'marcada').slice(0, 6),
    reservas: reservas.filter((r) => r.data >= agoraNoFuso().data).slice(0, 8),
    desafios: desafios.filter((d) => d.fim >= dia).slice(0, 6),
    sequencia: sequencia(treinos.map((t) => dataDe(t.inicio)), conta.metaSemanal, dia),
    semana: { feitos: daSemana.length, meta: conta.metaSemanal, dias: [...new Set(daSemana.map((t) => dataDe(t.inicio)))] },
    ...(u ? { ultimo: { id: u.id, nome: u.nome, inicio: u.inicio, duracaoMin: u.duracaoMin, volume: u.volume, ficha: u.ficha, divisao: u.divisao } } : {}),
    ...(proxima ? { proximaDivisao: proxima } : {}),
  }
}

// A trajetória: os lugares (das pegadas dos treinos), as academias (dos vínculos), os professores
// (das fichas e do personal) e as avaliações que a pessoa deu, com quem ainda dá para avaliar
async function historico(conta: ContaGuardada): Promise<HistoricoDoAluno> {
  const [vinculos, fichas, lugares] = await Promise.all([lerVinculos(conta.id), fichasDoAluno(conta.id), lerLugares(conta.id)])
  const academias: HistoricoDoAluno['academias'] = []
  for (const v of vinculos.filter((x) => x.tipo === 'empresa')) {
    const e = await lerEmpresa(v.id)
    if (e) academias.push({ slug: e.slug, nome: e.nome, visual: e.visual, status: v.status, desde: v.desde, ...(v.ate ? { ate: v.ate } : {}), ...(v.unidade ? { unidadeNome: nomeDaUnidade(e, v.unidade) } : {}) })
  }
  // os professores: quem montou ficha (fora a própria) e o personal com vínculo
  const pros = new Map<string, { fichas: number; desde: string; ultima: string; onde: Set<string> }>()
  for (const f of fichas.filter((x) => x.contexto.tipo !== 'propria' && x.status !== 'rascunho')) {
    const p = pros.get(f.autor) ?? { fichas: 0, desde: f.inicio, ultima: f.inicio, onde: new Set<string>() }
    p.fichas++
    if (f.inicio < p.desde) p.desde = f.inicio
    if (f.inicio > p.ultima) p.ultima = f.inicio
    if (f.contexto.tipo === 'empresa') p.onde.add(academias.find((a) => a.slug === (f.contexto as { id: string }).id)?.nome ?? f.contexto.id)
    else p.onde.add('Personal')
    pros.set(f.autor, p)
  }
  for (const v of vinculos.filter((x) => x.tipo === 'profissional')) {
    const dia = v.desde.slice(0, 10)
    const p = pros.get(v.id) ?? { fichas: 0, desde: dia, ultima: dia, onde: new Set<string>() }
    p.onde.add('Personal')
    if (dia < p.desde) p.desde = dia
    pros.set(v.id, p)
  }
  const profissionais: HistoricoDoAluno['profissionais'] = []
  for (const [id, p] of pros) {
    const pro = await lerProfissional(id)
    if (!pro) continue
    profissionais.push({ id, nome: pro.nome, ...(pro.publico ? { slug: pro.slug } : {}), ...(pro.foto ? { foto: pro.foto } : {}), personal: pro.personal, fichas: p.fichas, desde: p.desde, ultima: p.ultima, onde: [...p.onde] })
  }
  profissionais.sort((a, b) => b.ultima.localeCompare(a.ultima))
  // as avaliações dadas (e quem ainda dá para avaliar)
  const alvos = [
    ...profissionais.map((p) => ({ tipo: 'profissional' as const, id: p.id, nome: p.nome, link: p.slug ? `/${p.slug}` : undefined })),
    ...[...new Set([...academias.map((a) => a.slug), ...lugares.map((l) => l.empresa)])].map((slug) => ({ tipo: 'empresa' as const, id: slug, nome: academias.find((a) => a.slug === slug)?.nome ?? lugares.find((l) => l.empresa === slug)?.nome.split(' · ')[0] ?? slug, link: `/${slug}` })),
  ]
  const avaliacoes: HistoricoDoAluno['avaliacoes'] = []
  const paraAvaliar: HistoricoDoAluno['paraAvaliar'] = []
  // quem experimenta vê as avaliações da Ana (a conta de visita é uma cópia dela)
  const autor = conta.visita ? CONTAS_DEMO.aluna : conta.id
  for (const a of alvos) {
    const minha = (await lerAvaliacoes({ tipo: a.tipo, id: a.id })).find((x) => x.de === autor)
    const base = { tipo: a.tipo, id: a.id, nome: a.nome, ...(a.link ? { link: a.link } : {}) }
    if (minha) avaliacoes.push({ ...base, estrelas: minha.estrelas, motivos: minha.motivos, ...(minha.texto ? { texto: minha.texto } : {}), em: minha.em, ...(minha.resposta ? { resposta: minha.resposta } : {}) })
    else if (await podeAvaliar(conta, { tipo: a.tipo, id: a.id })) paraAvaliar.push(base)
  }
  avaliacoes.sort((a, b) => b.em.localeCompare(a.em))
  return { lugares: lugares.map((l) => ({ empresa: l.empresa, unidade: l.unidade, nome: l.nome, vezes: l.vezes, primeira: l.primeira, ultima: l.ultima })), academias, profissionais, avaliacoes, paraAvaliar }
}

// "Sou aluno daqui" (a academia aprova) ou "Quero treinar com você" (o personal aprova)
async function pedir(conta: ContaGuardada, corpo: Record<string, unknown>) {
  if (typeof corpo.empresa === 'string') {
    const e = await lerEmpresa(corpo.empresa)
    if (!e) return falhar(404, 'Academia não encontrada.')
    const unidade = typeof corpo.unidade === 'string' && e.unidades.some((u) => u.id === corpo.unidade) ? corpo.unidade : e.unidades[0]?.id
    if (vinculoAtivo(await lerVinculos(conta.id), { tipo: 'empresa', id: e.slug })) falhar(409, 'Você já é aluno daqui.')
    await vincular(conta, { tipo: 'empresa', id: e.slug, unidade }, 'pedido', 'pendente')
    if (!conta.visita) for (const m of e.equipe.filter((x) => PODE.alunos.includes(x.papel))) avisarSemFalhar(m.id, 'vinculo', `${conta.nome} disse que é aluno da ${nomeDaUnidade(e, unidade)}. Aprove no painel.`, `/painel/${e.slug}/alunos`)
    return
  }
  if (typeof corpo.profissional === 'string') {
    const p = await lerProfissional(corpo.profissional)
    if (!p || !p.personal) return falhar(404, 'Personal não encontrado.')
    if (p.id === conta.id) falhar(400, 'Você não pode ser seu próprio aluno.')
    if (vinculoAtivo(await lerVinculos(conta.id), { tipo: 'profissional', id: p.id })) falhar(409, 'Você já é aluno deste personal.')
    await vincular(conta, { tipo: 'profissional', id: p.id }, 'pedido', 'pendente')
    if (!conta.visita) avisarSemFalhar(p.id, 'vinculo', `${conta.nome} quer treinar com você. Aceite em Alunos.`, '/pro/alunos')
    return
  }
  falhar(400, 'Com quem?')
}

export default rotas({
  GET: async (req) => {
    const u = new URL(req.url).searchParams
    const codigo = u.get('convite')
    if (codigo) {
      const c = await lerConvite(codigo)
      const pub = c ? await convitePublico(c) : null
      return pub ? json(pub) : falhar(404, 'Convite não encontrado. Confira o link.')
    }
    await garantirDemonstracao()
    const conta = await exigirConta(req)
    if (u.has('vinculos')) return json({ vinculos: await comMarca(await lerVinculos(conta.id)) })
    if (u.has('historico')) return json(await historico(conta))
    return json(await inicio(conta))
  },
  POST: async (req) => {
    const corpo = await lerCorpo(req)
    const conta = await exigirConta(req)
    switch (corpo.acao) {
      case 'convite': {
        await limitar('convite', conta.id, 30, 3600_000, 'Muitos convites em pouco tempo. Tente mais tarde.')
        const c = await aceitarConvite(typeof corpo.codigo === 'string' ? corpo.codigo : '', conta)
        return json({ ok: true, de: c.de, tipo: c.tipo })
      }
      case 'pedir':
        await limitar('pedido', conta.id, 20, 3600_000, 'Muitos pedidos em pouco tempo. Tente mais tarde.')
        await pedir(conta, corpo)
        return json({ vinculos: await comMarca(await lerVinculos(conta.id)) })
      case 'sair': {
        const tipo = corpo.tipo === 'empresa' || corpo.tipo === 'profissional' ? corpo.tipo : null
        if (!tipo || typeof corpo.id !== 'string') falhar(400, 'De onde?')
        await desvincular(conta.id, { tipo: tipo!, id: corpo.id as string })
        return json({ vinculos: await comMarca(await lerVinculos(conta.id)) })
      }
      default:
        return falhar(400, 'Ação desconhecida.')
    }
  },
})
