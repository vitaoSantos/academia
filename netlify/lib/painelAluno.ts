import type { AlunoParaOProfissional } from '../../src/shared/respostas.ts'
import type { AlunoDoPainel } from '../../src/shared/tipos.ts'
import type { ContaGuardada } from './auth.ts'
import { lerConta, resumo } from './contas.ts'
import { lerEmpresa, nomeDaUnidade } from './empresas.ts'
import { fichasDoAluno } from './fichas.ts'
import { falhar } from './http.ts'
import { lerMedidas } from './medidas.ts'
import { lerProfissional } from './profissionais.ts'
import { treinosDe } from './treinos.ts'
import { acessoAoAluno, lerAlunos } from './vinculos.ts'

// O aluno visto por quem acompanha (o personal, o professor e a equipe da academia): as fichas, os
// treinos, as faixas e, com o consentimento dele, as medidas.

export async function alunoParaProfissional(quem: ContaGuardada, alunoId: string): Promise<AlunoParaOProfissional> {
  const acesso = await acessoAoAluno(quem.id, alunoId)
  if (!acesso.treinos) return falhar(403, 'Esta pessoa não é sua aluna.')
  const aluno = await lerConta(alunoId)
  if (!aluno) return falhar(404, 'Aluno não encontrado.')
  const contextos: AlunoParaOProfissional['contextos'] = []
  let faixas: AlunoDoPainel['faixas'] = {}
  for (const c of acesso.contextos) {
    if (c.tipo === 'empresa') {
      const e = await lerEmpresa(c.id)
      if (!e) continue
      contextos.push({ tipo: 'empresa', id: c.id, nome: nomeDaUnidade(e, c.unidade) })
      const linha = (await lerAlunos({ tipo: 'empresa', id: c.id })).find((a) => a.id === alunoId)
      faixas = { ...faixas, ...(linha?.faixas ?? {}) }
    } else {
      const p = await lerProfissional(c.id)
      contextos.push({ tipo: 'profissional', id: c.id, nome: p?.nome ?? 'Personal' })
    }
  }
  const [fichas, treinos, medidas] = await Promise.all([fichasDoAluno(alunoId), treinosDe(alunoId), acesso.medidas ? lerMedidas(alunoId) : Promise.resolve(null)])
  // as medidas só com o consentimento; as fotos de evolução nunca entram aqui
  return { aluno: resumo(aluno), contextos, fichas: fichas.filter((f) => f.contexto.tipo !== 'propria' || f.status === 'ativa'), treinos: treinos.slice(0, 60), medidas: medidas ? medidas.map((m) => ({ ...m, fotos: [] })) : null, faixas }
}
