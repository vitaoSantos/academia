import type { MedidasDoAluno } from '../../src/shared/respostas.ts'
import { alunoMais } from '../../src/shared/planos.ts'
import { exigirConta, type ContaGuardada } from '../lib/auth.ts'
import { avisarSemFalhar } from '../lib/avisos.ts'
import { lerConta, resumo } from '../lib/contas.ts'
import { falhar, json, lerCorpo, limitar, rotas } from '../lib/http.ts'
import { apagarMedida, lerMedidas, salvarMedida } from '../lib/medidas.ts'
import { lerPlataforma } from '../lib/plataforma.ts'
import { acessoAoAluno } from '../lib/vinculos.ts'

// As medidas (dado sensível): o aluno vê e lança as dele; o profissional só com o consentimento do
// aluno (e lança a avaliação física).
// GET [?aluno=<id>]  ·  POST { acao }: salvar, apagar, avaliacao (do profissional, com aluno)

async function resposta(dono: ContaGuardada, quem: ContaGuardada): Promise<MedidasDoAluno> {
  const medidas = await lerMedidas(dono.id)
  const limite = alunoMais(dono) ? null : (await lerPlataforma()).limites.fotosGratis
  return { medidas, fotos: { usadas: medidas.reduce((n, m) => n + m.fotos.length, 0), limite }, podeEditar: dono.id === quem.id, deQuem: resumo(dono) }
}

async function alunoComAcesso(quem: ContaGuardada, alunoId: string) {
  const acesso = await acessoAoAluno(quem.id, alunoId)
  if (!acesso.treinos) falhar(403, 'Esta pessoa não é sua aluna.')
  if (!acesso.medidas) falhar(403, 'O aluno ainda não deixou você ver as medidas.')
  const aluno = await lerConta(alunoId)
  return aluno ?? falhar(404, 'Aluno não encontrado.')
}

export default rotas({
  GET: async (req) => {
    const conta = await exigirConta(req)
    const alunoId = new URL(req.url).searchParams.get('aluno')
    const dono = alunoId && alunoId !== conta.id ? await alunoComAcesso(conta, alunoId) : conta
    return json(await resposta(dono, conta))
  },
  POST: async (req) => {
    const corpo = await lerCorpo(req)
    const conta = await exigirConta(req)
    await limitar('medida', conta.id, 60, 3600_000, 'Muitas medidas em pouco tempo.')
    switch (corpo.acao) {
      case 'salvar':
        await salvarMedida(conta, corpo)
        return json(await resposta(conta, conta))
      case 'apagar':
        await apagarMedida(conta.id, String(corpo.id ?? ''))
        return json(await resposta(conta, conta))
      case 'avaliacao': {
        const aluno = await alunoComAcesso(conta, String(corpo.aluno ?? ''))
        const { id: _id, ...dados } = corpo
        await salvarMedida(aluno, dados, { id: conta.id, nome: conta.nome })
        avisarSemFalhar(aluno.id, 'ficha', `${conta.nome} lançou a sua avaliação física.`, '/medidas')
        return json(await resposta(aluno, conta))
      }
      default:
        return falhar(400, 'Ação desconhecida.')
    }
  },
})
