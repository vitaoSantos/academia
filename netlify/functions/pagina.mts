import { agoraNoFuso, DATA, dataDe, hoje, somarDias } from '../../src/shared/tempo.ts'
import type { AvaliacaoVista, DiaDaUnidade, LocalDoProfissional, PaginaEmpresa, PaginaProfissional, PerfilPessoa, ProfissionalCartao } from '../../src/shared/respostas.ts'
import { temaDe } from '../../src/shared/temas.ts'
import { sequencia } from '../../src/shared/treino.ts'
import type { AlunoDoPainel, Avaliacao } from '../../src/shared/tipos.ts'
import { contaDaRequisicao, type ContaGuardada } from '../lib/auth.ts'
import { lerAvaliacoes, podeAvaliar } from '../lib/avaliacoes.ts'
import { bloqueiosDe, contaPorUsuario, resumo, resumos } from '../lib/contas.ts'
import { empresaPublica, lerEmpresa, nomeDaUnidade, papelNa } from '../lib/empresas.ts'
import { diaDaUnidade } from '../lib/grade.ts'
import { falhar, json, rotas } from '../lib/http.ts'
import { lerPagina } from '../lib/paginas.ts'
import { lerProfissional, profissionalPublico } from '../lib/profissionais.ts'
import { lerSeguidores, lerSeguindo } from '../lib/rede.ts'
import { garantirDemonstracao } from '../lib/semente.ts'
import { CHAVES, lerJSON } from '../lib/store.ts'
import { lerLugares, treinosDe } from '../lib/treinos.ts'
import { lerVinculos } from '../lib/vinculos.ts'

// As páginas públicas.
// GET ?slug=forca-total (a academia ou o personal, na raiz do site) · ?u=ana.souza (o perfil da
//     pessoa) · ?slug&unidade&data (as aulas do dia de uma unidade, com as vagas)

async function avaliacoesVistas(lista: Avaliacao[], quem: ContaGuardada | null) {
  const bloqueios = bloqueiosDe(quem)
  const visiveis = lista.filter((a) => !bloqueios.has(a.de)).slice(0, 30)
  const autores = await resumos(visiveis.map((a) => a.de))
  return visiveis.map<AvaliacaoVista>((a) => ({ ...a, autor: autores.get(a.de) }))
}

async function cartao(id: string): Promise<ProfissionalCartao | null> {
  const p = await lerProfissional(id)
  if (!p || !p.publico) return null
  return { id: p.id, slug: p.slug, nome: p.nome, ...(p.foto ? { foto: p.foto } : {}), especialidades: p.especialidades, nota: p.numeros.nota, publico: p.publico, personal: p.personal, cor: temaDe(p.visual).destaque, alunos: p.numeros.alunosInstruidos }
}

async function paginaEmpresa(slug: string, quem: ContaGuardada | null): Promise<PaginaEmpresa> {
  const e = await lerEmpresa(slug)
  if (!e || e.status === 'suspensa') return falhar(404, 'Página não encontrada.')
  const professores = (await Promise.all(e.equipe.filter((m) => m.papel === 'professor').map((m) => cartao(m.id)))).filter((c): c is ProfissionalCartao => !!c)
  const lista = await lerAvaliacoes({ tipo: 'empresa', id: slug })
  const vinculo = quem ? ((await lerVinculos(quem.id)).find((v) => v.tipo === 'empresa' && v.id === slug) ?? null) : null
  return {
    tipo: 'empresa',
    empresa: empresaPublica(e),
    professores,
    avaliacoes: await avaliacoesVistas(lista, quem),
    vinculo,
    podeAvaliar: !!quem && !papelNa(e, quem.id) && (await podeAvaliar(quem, { tipo: 'empresa', id: slug })),
    minhaAvaliacao: quem ? (lista.find((a) => a.de === quem.id) ?? null) : null,
    souEquipe: !!quem && !!papelNa(e, quem.id),
    alunos: e.numeros.alunos,
  }
}

async function paginaProfissional(id: string, quem: ContaGuardada | null): Promise<PaginaProfissional> {
  const p = await lerProfissional(id)
  if (!p || p.status === 'suspenso') return falhar(404, 'Página não encontrada.')
  const vinculo = quem ? ((await lerVinculos(quem.id)).find((v) => v.tipo === 'profissional' && v.id === id) ?? null) : null
  const souEu = quem?.id === id
  const publicoPro = profissionalPublico(p)
  // o perfil fora do ar: os alunos (e o próprio) continuam vendo
  if (!p.publico && !souEu && vinculo?.status !== 'ativo') {
    return { tipo: 'profissional', profissional: { ...publicoPro, bio: undefined, especialidades: [], locais: [], numeros: { ...p.numeros, nota: { media: 0, total: 0 } } }, locais: [], avaliacoes: [], vinculo, podeAvaliar: false, souEu, privado: true }
  }
  const locais: LocalDoProfissional[] = []
  for (const l of p.locais) {
    if (l.tipo !== 'unidade') continue
    const e = await lerEmpresa(l.empresa)
    const u = e?.unidades.find((x) => x.id === l.unidade && x.ativa)
    if (e && u) locais.push({ empresa: e.slug, unidade: u.id, nome: nomeDaUnidade(e, u.id), ponto: u.ponto, cidade: u.cidade, slug: e.slug })
  }
  const lista = await lerAvaliacoes({ tipo: 'profissional', id })
  return {
    tipo: 'profissional',
    profissional: publicoPro,
    locais,
    avaliacoes: await avaliacoesVistas(lista, quem),
    vinculo,
    podeAvaliar: !!quem && !souEu && (await podeAvaliar(quem, { tipo: 'profissional', id })),
    minhaAvaliacao: quem ? (lista.find((a) => a.de === quem.id) ?? null) : null,
    souEu,
  }
}

async function perfil(usuario: string, quem: ContaGuardada | null): Promise<PerfilPessoa> {
  const c = await contaPorUsuario(usuario)
  if (!c || c.bloqueado || (c.visita && c.id !== quem?.id)) return falhar(404, 'Perfil não encontrado.')
  if (quem && bloqueiosDe(quem).has(c.id)) falhar(404, 'Perfil não encontrado.')
  const souEu = quem?.id === c.id
  const [seguidores, seguindoDele, meu] = await Promise.all([lerSeguidores(c.id), lerSeguindo(c.id), quem ? lerSeguindo(quem.id) : Promise.resolve({ seguindo: [], pedidos: [] })])
  const segue = meu.seguindo.includes(c.id) ? 'sim' : meu.pedidos.includes(c.id) ? 'pedido' : 'nao'
  const meSegue = !!quem && seguindoDele.seguindo.includes(quem.id)
  const podeVer = souEu || c.publico || segue === 'sim'
  const pro = c.profissional ? await lerProfissional(c.id) : null
  const base: PerfilPessoa = {
    pessoa: { ...resumo(c), ...(podeVer && c.bio ? { bio: c.bio } : {}), publico: c.publico, ...(podeVer && c.cidade ? { cidade: c.cidade } : {}), desde: c.criadaEm },
    souEu,
    segue,
    meSegue,
    podeVer,
    ...(pro && (pro.publico || souEu) ? { profissional: { slug: pro.slug, publico: pro.publico } } : {}),
    podeConversar: !!quem && !souEu && ((segue === 'sim' && meSegue) || !!pro?.publico),
  }
  if (!podeVer) return base
  const [treinos, lugares, desafios, vinculos] = await Promise.all([treinosDe(c.id), lerLugares(c.id), lerJSON<string[]>(CHAVES.desafiosDo(c.id), []), lerVinculos(c.id)])
  // as faixas ficam na lista de alunos de cada academia
  const faixas: NonNullable<PerfilPessoa['faixas']> = []
  for (const v of vinculos.filter((x) => x.tipo === 'empresa' && x.status === 'ativo')) {
    const alunos = await lerJSON<AlunoDoPainel[]>(CHAVES.alunosDaEmpresa(v.id), [])
    const a = alunos.find((x) => x.id === c.id)
    for (const [modalidade, historico] of Object.entries(a?.faixas ?? {})) {
      const ultima = historico[historico.length - 1]
      if (ultima) faixas.push({ modalidade, faixa: ultima.faixa, graus: ultima.graus, empresa: v.id })
    }
  }
  const ano = String(new Date().getFullYear())
  return {
    ...base,
    numeros: {
      treinos: treinos.filter((t) => t.inicio.startsWith(ano)).length,
      sequencia: sequencia(treinos.map((t) => dataDe(t.inicio)), c.metaSemanal, hoje()),
      seguidores: seguidores.aprovados.length,
      seguindo: seguindoDele.seguindo.length,
      desafios: desafios.length,
    },
    lugares: lugares.slice(0, 12).map((l) => ({ empresa: l.empresa, unidade: l.unidade, nome: l.nome, vezes: l.vezes, ultima: l.ultima })),
    faixas,
  }
}

async function dia(slug: string, unidade: string, data: string, quem: ContaGuardada | null): Promise<DiaDaUnidade> {
  const e = await lerEmpresa(slug)
  if (!e) return falhar(404, 'Academia não encontrada.')
  if (!e.unidades.some((u) => u.id === unidade)) falhar(404, 'Unidade não encontrada.')
  const hojeData = agoraNoFuso().data
  if (data < hojeData || data > somarDias(hojeData, 14)) falhar(400, 'Escolha um dia nas próximas duas semanas.')
  return { data, unidade, aulas: await diaDaUnidade(e, unidade, data, quem?.id), eventos: e.eventos.filter((ev) => ev.data === data && (!ev.unidade || ev.unidade === unidade)) }
}

export default rotas({
  GET: async (req) => {
    await garantirDemonstracao()
    const u = new URL(req.url).searchParams
    const quem = await contaDaRequisicao(req)
    const usuario = u.get('u')
    if (usuario) return json(await perfil(usuario.toLowerCase(), quem))
    const slug = (u.get('slug') ?? '').toLowerCase()
    if (!slug) falhar(400, 'Qual página?')
    const unidade = u.get('unidade')
    if (unidade) {
      const data = u.get('data') ?? ''
      return json(await dia(slug, unidade, DATA.test(data) ? data : agoraNoFuso().data, quem))
    }
    const pagina = await lerPagina(slug)
    if (!pagina) falhar(404, 'Página não encontrada.')
    return json(pagina!.tipo === 'empresa' ? await paginaEmpresa(pagina!.id, quem) : await paginaProfissional(pagina!.id, quem))
  },
})
