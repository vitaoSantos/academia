import { alunoMais, mensalidadeEmpresa, nivelEmpresa, nivelProfissional } from '../../src/shared/planos.ts'
import { agoraNoFuso, somarDias } from '../../src/shared/tempo.ts'
import { semAcento } from '../../src/shared/texto.ts'
import type { Comentario, Empresa, Post, Profissional } from '../../src/shared/tipos.ts'
import { lerRegistro, ultimosMeses } from './admin.ts'
import { resumo, todasAsContas } from './contas.ts'
import { lerDia } from './estatisticas.ts'
import { lerPlataforma } from './plataforma.ts'
import type { Denuncia } from './rede.ts'
import { blobs, CHAVES, lerJSON, lerVarios } from './store.ts'

// O que o admin lê: a visão geral (com a receita estimada), as empresas, os profissionais, as
// contas, a moderação, a plataforma e o registro. `demo` decide se a demonstração entra.

async function todas<T>(prefixo: string) {
  const { blobs: lista } = await blobs().list({ prefix: prefixo })
  return lerVarios<T>(lista.map((b) => b.key))
}

export const todasAsEmpresas = () => todas<Empresa>('empresas/e/')
export const todosOsProfissionais = () => todas<Profissional>('profissionais/p/')

export async function geral(demo: boolean) {
  const [contas, empresas, profissionais, config] = await Promise.all([todasAsContas(), todasAsEmpresas(), todosOsProfissionais(), lerPlataforma()])
  const conta = contas.filter((c) => !c.visita && (demo || !c.demo))
  const emp = empresas.filter((e) => demo || !e.demo)
  const pros = profissionais.filter((p) => demo || !p.demo)
  const hoje = agoraNoFuso().data
  const dias = await Promise.all(Array.from({ length: 14 }, (_, i) => somarDias(hoje, -13 + i)).map(async (data) => ({ data, ...(await lerDia(data)) })))
  const receita = {
    academias: emp.filter((e) => e.status === 'ativa' && e.plano !== 'teste').reduce((s, e) => s + mensalidadeEmpresa(e.plano === 'premium' ? 'premium' : 'basico', e.unidades.filter((u) => u.ativa).length, config), 0),
    personais: pros.filter((p) => p.personal && p.status === 'ativo' && (p.plano === 'basico' || p.plano === 'premium')).reduce((s, p) => s + (p.plano === 'premium' ? config.precos.personalPremium : config.precos.personalBasico), 0),
    alunos: conta.filter((c) => alunoMais(c)).length * config.precos.alunoMais,
  }
  return {
    contas: conta.length,
    turmaMais: conta.filter((c) => alunoMais(c)).length,
    empresas: { total: emp.length, teste: emp.filter((e) => e.status === 'teste').length, ativas: emp.filter((e) => e.status === 'ativa').length, suspensas: emp.filter((e) => e.status === 'suspensa').length, unidades: emp.reduce((n, e) => n + e.unidades.filter((u) => u.ativa).length, 0), alunos: emp.reduce((n, e) => n + e.numeros.alunos, 0) },
    profissionais: { total: pros.length, personais: pros.filter((p) => p.personal).length, professores: pros.filter((p) => !p.personal).length, premium: pros.filter((p) => nivelProfissional(p) === 'premium').length },
    receita: { ...receita, total: receita.academias + receita.personais + receita.alunos },
    dias: dias.map((d) => (demo ? { data: d.data, cadastros: d.cadastros + d.demo.cadastros, treinos: d.treinos + d.demo.treinos, posts: d.posts + d.demo.posts, reservas: d.reservas + d.demo.reservas } : { data: d.data, cadastros: d.cadastros, treinos: d.treinos, posts: d.posts, reservas: d.reservas })),
    denuncias: (await lerJSON<Denuncia[]>(CHAVES.denuncias, [])).filter((d) => !d.resolvida).length,
  }
}

export async function empresas(demo: boolean) {
  const config = await lerPlataforma()
  return (await todasAsEmpresas())
    .filter((e) => demo || !e.demo)
    .sort((a, b) => b.criadaEm.localeCompare(a.criadaEm))
    .map((e) => ({
      slug: e.slug,
      nome: e.nome,
      tipo: e.tipo,
      plano: e.plano,
      planoDepois: e.planoDepois,
      status: e.status,
      nivel: nivelEmpresa(e),
      testeAte: e.testeAte,
      unidades: e.unidades.filter((u) => u.ativa).map((u) => `${u.nome} (${u.cidade.nome})`),
      alunos: e.numeros.alunos,
      nota: e.numeros.nota,
      mensalidade: e.plano === 'teste' ? 0 : mensalidadeEmpresa(e.plano === 'premium' ? 'premium' : 'basico', e.unidades.filter((u) => u.ativa).length, config),
      criadaEm: e.criadaEm,
      demo: !!e.demo,
    }))
}

export async function profissionais(demo: boolean) {
  return (await todosOsProfissionais())
    .filter((p) => demo || !p.demo)
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    .map((p) => ({ id: p.id, slug: p.slug, nome: p.nome, personal: p.personal, plano: p.plano, status: p.status, nivel: nivelProfissional(p), testeAte: p.testeAte, cidade: `${p.cidade.nome} (${p.cidade.uf})`, cref: p.cref, publico: p.publico, numeros: p.numeros, demo: !!p.demo }))
}

export async function usuarios(q: string, demo: boolean) {
  const t = semAcento(q)
  return (await todasAsContas())
    .filter((c) => !c.visita && (demo || !c.demo))
    .filter((c) => !t || semAcento(`${c.nome} ${c.usuario} ${c.email ?? ''} ${c.celular ?? ''}`).includes(t))
    .sort((a, b) => b.criadaEm.localeCompare(a.criadaEm))
    .slice(0, 200)
    .map((c) => ({ ...resumo(c), email: c.email, celular: c.celular, cidade: c.cidade ? `${c.cidade.nome} (${c.cidade.uf})` : '', plano: c.plano, maisAte: c.maisAte, publico: c.publico, bloqueado: !!c.bloqueado, criadaEm: c.criadaEm, empresas: c.empresas ?? [], demo: !!c.demo }))
}

export async function moderacao() {
  const denuncias = (await lerJSON<Denuncia[]>(CHAVES.denuncias, [])).filter((d) => !d.resolvida).slice(0, 100)
  const itens = await Promise.all(
    denuncias.map(async (d) => {
      let conteudo = ''
      if (d.alvo.tipo === 'post') conteudo = (await lerJSON<Post | null>(CHAVES.post(d.alvo.id), null))?.texto ?? '(post apagado)'
      else if (d.alvo.tipo === 'comentario' && d.alvo.post) conteudo = (await lerJSON<Comentario[]>(CHAVES.comentarios(d.alvo.post), [])).find((c) => c.id === d.alvo.id)?.texto ?? '(comentário apagado)'
      else conteudo = '(perfil)'
      return { ...d, conteudo }
    }),
  )
  return { denuncias: itens }
}

export async function registro(mes?: string) {
  const meses = ultimosMeses()
  return { mes: mes ?? meses[0], meses, acoes: await lerRegistro(mes ?? meses[0]) }
}
