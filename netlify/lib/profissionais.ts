import { notaDe } from '../../src/shared/avaliacao.ts'
import { nivelProfissional, temDestaque } from '../../src/shared/planos.ts'
import { temaDe } from '../../src/shared/temas.ts'
import type { FichaDoPainel, LinhaProfissional, ProfissionalPublico } from '../../src/shared/respostas.ts'
import type { AlunoDoPainel, Avaliacao, Profissional } from '../../src/shared/tipos.ts'
import { exigirConta, type ContaGuardada } from './auth.ts'
import { lerEmpresa } from './empresas.ts'
import { falhar } from './http.ts'
import { atualizar, CHAVES, lerJSON } from './store.ts'

// O perfil profissional (personal e professor): uma conta só para todas as academias onde dá aula e
// para os alunos de personal. A página pública (turma.app/rafael-moreira) mostra os números.

export const lerProfissional = (id: string) => lerJSON<Profissional | null>(CHAVES.profissional(id), null)

export async function mudarProfissional(id: string, mudar: (p: Profissional) => Profissional) {
  const p = await atualizar<Profissional | null>(CHAVES.profissional(id), null, (atual) => (atual ? mudar(atual) : falhar(404, 'Perfil profissional não encontrado.')))
  const final = p as Profissional
  await indexarProfissional(final)
  return final
}

export async function exigirProfissional(req: Request): Promise<{ conta: ContaGuardada; profissional: Profissional }> {
  const conta = await exigirConta(req)
  const profissional = await lerProfissional(conta.id)
  if (!profissional) return falhar(403, 'Crie o seu perfil profissional para continuar.')
  return { conta, profissional }
}

// O que qualquer um vê (sem o plano e a configuração interna da agenda)
export function profissionalPublico(p: Profissional): ProfissionalPublico {
  const nivel = nivelProfissional(p)
  const { agenda, plano: _plano, testeAte: _teste, status: _status, ...resto } = p
  return {
    ...resto,
    agenda: { ativa: agenda.ativa && p.personal, duracao: agenda.duracao, alunoMarca: agenda.alunoMarca, locais: agenda.locais },
    nivel,
    destaque: p.personal && temDestaque(nivel, p.numeros.nota),
  }
}

// ---------- O índice do mapa (só os de perfil público) ----------

export async function indexarProfissional(p: Profissional) {
  const nivel = nivelProfissional(p)
  const visivel = p.publico && p.status !== 'suspenso'
  let linha: LinhaProfissional | null = null
  if (visivel) {
    const locais: LinhaProfissional['locais'] = []
    for (const l of p.locais) {
      if (l.tipo !== 'unidade') continue
      const e = await lerEmpresa(l.empresa)
      const u = e?.unidades.find((x) => x.id === l.unidade && x.ativa)
      if (e && u) locais.push({ empresa: e.slug, unidade: u.id, nome: e.unidades.length > 1 ? `${e.nome} · ${u.nome}` : e.nome, ponto: u.ponto })
    }
    linha = {
      id: p.id,
      slug: p.slug,
      nome: p.nome,
      ...(p.foto ? { foto: p.foto } : {}),
      personal: p.personal && nivel !== 'nenhum',
      cidade: p.cidade,
      ponto: { lat: p.cidade.lat, lng: p.cidade.lng },
      raioKm: p.raioKm,
      online: p.online,
      especialidades: p.especialidades,
      modalidades: p.modalidades,
      locais,
      nota: p.numeros.nota,
      destaque: p.personal && temDestaque(nivel, p.numeros.nota),
      cor: temaDe(p.visual).destaque,
      alunos: p.numeros.alunosInstruidos,
      ...(p.demo ? { demo: true } : {}),
    }
  }
  await atualizar<LinhaProfissional[]>(CHAVES.indiceProfissionais, [], (l) => {
    const sem = l.filter((x) => x.id !== p.id)
    if (!linha) return sem.length === l.length ? l : sem
    return [...sem, linha]
  })
}

// ---------- Os números do perfil ----------

export type FichaResumo = FichaDoPainel

// Recontados a partir das listas (os alunos de personal e as fichas montadas), sem falhar a ação
export async function recontar(id: string) {
  try {
    const [alunos, fichas, avaliacoes] = await Promise.all([
      lerJSON<AlunoDoPainel[]>(CHAVES.alunosDoProfissional(id), []),
      lerJSON<FichaResumo[]>(CHAVES.fichasDoProfissional(id), []),
      lerJSON<Avaliacao[]>(CHAVES.avaliacoes('profissional', id), []),
    ])
    const publicadas = fichas.filter((f) => f.status !== 'rascunho')
    const instruidos = new Set([...alunos.map((a) => a.id), ...publicadas.map((f) => f.aluno)])
    const ativos = new Set([...alunos.filter((a) => a.status === 'ativo').map((a) => a.id), ...publicadas.filter((f) => f.status === 'ativa').map((f) => f.aluno)])
    await atualizar<Profissional | null>(CHAVES.profissional(id), null, (p) =>
      p ? { ...p, numeros: { ...p.numeros, alunosInstruidos: instruidos.size, alunosAtivos: ativos.size, fichas: publicadas.length, nota: notaDe(avaliacoes) } } : p,
    ).then((p) => p && indexarProfissional(p))
  } catch (e) {
    console.error('Números do profissional não atualizados', id, e instanceof Error ? e.message : e)
  }
}

export async function somarTreinoAcompanhado(id: string) {
  await atualizar<Profissional | null>(CHAVES.profissional(id), null, (p) => (p ? { ...p, numeros: { ...p.numeros, treinos: p.numeros.treinos + 1 } } : p)).catch(() => null)
}
