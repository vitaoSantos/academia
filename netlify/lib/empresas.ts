import { nivelEmpresa, temDestaque } from '../../src/shared/planos.ts'
import { temaDe } from '../../src/shared/temas.ts'
import type { EmpresaPublica, LinhaUnidade } from '../../src/shared/respostas.ts'
import type { Empresa, PapelEmpresa } from '../../src/shared/tipos.ts'
import { exigirConta, type ContaGuardada } from './auth.ts'
import { falhar } from './http.ts'
import { atualizar, CHAVES, lerJSON } from './store.ts'

// As empresas (academia, rede, estúdio, CT, escola de dança, academia aquática): as unidades, a
// equipe, as modalidades e a grade ficam num documento só; os alunos, as fichas e as reservas de
// cada dia ficam à parte.

export const lerEmpresa = (slug: string) => lerJSON<Empresa | null>(CHAVES.empresa(slug), null)

export async function mudarEmpresa(slug: string, mudar: (e: Empresa) => Empresa) {
  const e = await atualizar<Empresa | null>(CHAVES.empresa(slug), null, (atual) => (atual ? mudar(atual) : falhar(404, 'Empresa não encontrada.')))
  const final = e as Empresa
  await indexarEmpresa(final)
  return final
}

export const papelNa = (e: Pick<Empresa, 'equipe'>, contaId: string): PapelEmpresa | null => e.equipe.find((m) => m.id === contaId)?.papel ?? null

// Quem pode mexer em quê no painel: o dono e o gerente mexem em tudo; a recepção responde e cuida dos
// alunos; o professor monta fichas, gradua e marca presença
export const PODE = {
  configurar: ['dono', 'gerente'] as PapelEmpresa[],
  alunos: ['dono', 'gerente', 'recepcao'] as PapelEmpresa[],
  treinar: ['dono', 'gerente', 'professor'] as PapelEmpresa[],
  conversar: ['dono', 'gerente', 'recepcao'] as PapelEmpresa[],
  ver: ['dono', 'gerente', 'recepcao', 'professor'] as PapelEmpresa[],
}

export async function exigirEquipe(req: Request, slug: string, papeis: PapelEmpresa[] = PODE.ver): Promise<{ conta: ContaGuardada; empresa: Empresa; papel: PapelEmpresa }> {
  const conta = await exigirConta(req)
  const empresa = await lerEmpresa(slug)
  if (!empresa) return falhar(404, 'Empresa não encontrada.')
  const papel = papelNa(empresa, conta.id)
  if (!papel || !papeis.includes(papel)) return falhar(403, 'Você não tem acesso a esta parte do painel.')
  return { conta, empresa, papel }
}

// O que qualquer um vê da empresa: sem o CNPJ e sem os dados internos da equipe
export function empresaPublica(e: Empresa): EmpresaPublica {
  const { cnpj: _cnpj, dono: _dono, equipe, ...resto } = e
  const nivel = nivelEmpresa(e)
  return {
    ...resto,
    equipe: equipe.filter((m) => m.papel === 'professor' || m.papel === 'dono').map((m) => ({ id: m.id, nome: m.nome, papel: m.papel, unidades: m.unidades })),
    nivel,
    destaque: temDestaque(nivel, e.numeros.nota),
  }
}

// ---------- O índice do mapa (uma linha por unidade ativa) ----------

export function linhasDe(e: Empresa): LinhaUnidade[] {
  if (e.status === 'suspensa') return []
  const nivel = nivelEmpresa(e)
  if (nivel === 'nenhum') return []
  const tema = temaDe(e.visual)
  const ativas = e.unidades.filter((u) => u.ativa)
  return ativas.map((u) => ({
    empresa: e.slug,
    unidade: u.id,
    nome: e.nome,
    unidadeNome: u.nome,
    tipo: e.tipo,
    ponto: u.ponto,
    cidade: u.cidade,
    ...(u.bairro ? { bairro: u.bairro } : {}),
    endereco: u.endereco,
    // as modalidades que têm aula nesta unidade (a musculação vale para todas)
    modalidades: [...new Set(e.modalidades.filter((m) => m.id === 'musculacao' || e.grade.some((a) => a.ativa && a.unidade === u.id && a.modalidade === m.id)).map((m) => m.id))],
    nota: e.numeros.nota,
    destaque: temDestaque(nivel, e.numeros.nota),
    cor: tema.destaque,
    ...(e.visual.logo ? { logo: e.visual.logo } : {}),
    ...(u.precoDesde ? { precoDesde: u.precoDesde } : {}),
    agregadores: u.agregadores,
    horario: u.horario,
    unidades: ativas.length,
    ...(e.demo ? { demo: true } : {}),
  }))
}

export async function indexarEmpresa(e: Empresa) {
  const novas = linhasDe(e)
  await atualizar<LinhaUnidade[]>(CHAVES.indiceUnidades, [], (l) => {
    const sem = l.filter((x) => x.empresa !== e.slug)
    if (sem.length === l.length && !novas.length) return l
    return [...sem, ...novas]
  })
}

export async function tirarDoIndice(slug: string) {
  await atualizar<LinhaUnidade[]>(CHAVES.indiceUnidades, [], (l) => (l.some((x) => x.empresa === slug) ? l.filter((x) => x.empresa !== slug) : l))
}

export const nomeDaUnidade = (e: Pick<Empresa, 'nome' | 'unidades'>, unidade?: string) => {
  const u = e.unidades.find((x) => x.id === unidade)
  return u && e.unidades.length > 1 ? `${e.nome} · ${u.nome}` : e.nome
}
