import type { ContextoFicha } from '../../src/shared/tipos.ts'
import type { FichaCompleta } from '../../src/shared/respostas.ts'
import { exigirConta } from '../lib/auth.ts'
import { lerConta, resumo } from '../lib/contas.ts'
import { lerEmpresa, nomeDaUnidade } from '../lib/empresas.ts'
import { apagarModelo, arquivar, copiarPara, fichasDoAluno, lerExerciciosProprios, lerFicha, lerModelos, marcarVista, podeLer, propriosDaFicha, salvarExercicioProprio, salvarFicha, salvarModelo, somarUsoDoModelo, treinosIguais } from '../lib/fichas.ts'
import { falhar, json, lerCorpo, limitar, rotas } from '../lib/http.ts'
import { lerProfissional } from '../lib/profissionais.ts'
import { acessoAoAluno } from '../lib/vinculos.ts'

// As fichas de treino.
// GET ?id (a ficha completa) · ?minhas (as do aluno) · ?aluno=<id> (as de um aluno, para o
//     profissional) · ?modelos (os modelos e os exercícios próprios de quem monta)
// POST { acao }: salvar, arquivar, copiar, vista, modelo, modelo-apagar, exercicio

async function contextoNome(c: ContextoFicha) {
  if (c.tipo === 'empresa') {
    const e = await lerEmpresa(c.id)
    return e ? nomeDaUnidade(e, c.unidade) : ''
  }
  if (c.tipo === 'profissional') return (await lerProfissional(c.id))?.nome ?? ''
  return 'Ficha sua'
}

export default rotas({
  GET: async (req) => {
    const u = new URL(req.url).searchParams
    const conta = await exigirConta(req)
    const id = u.get('id')
    if (id) {
      const f = await lerFicha(id)
      if (!f || !(await podeLer(conta, f))) return falhar(404, 'Ficha não encontrada.')
      const ficha = f.aluno === conta.id ? await marcarVista(f) : f
      const aluno = f.aluno === conta.id ? conta : await lerConta(f.aluno)
      const resposta: FichaCompleta = {
        ficha,
        proprios: await propriosDaFicha(f),
        aluno: aluno ? resumo(aluno) : { id: f.aluno, nome: 'Aluno', usuario: '' },
        contextoNome: await contextoNome(f.contexto),
        podeEditar: f.autor === conta.id,
        ...(f.autor === conta.id && f.contexto.tipo !== 'propria' ? { iguais: (await treinosIguais(conta.id, f)).map((x) => ({ id: x.id, aluno: x.aluno, alunoNome: x.alunoNome, status: x.status, previsao: x.previsao })) } : {}),
      }
      return json(resposta)
    }
    if (u.has('minhas')) return json({ fichas: await fichasDoAluno(conta.id) })
    const aluno = u.get('aluno')
    if (aluno) {
      const acesso = await acessoAoAluno(conta.id, aluno)
      if (!acesso.treinos) falhar(403, 'Esta pessoa não é sua aluna.')
      return json({ fichas: await fichasDoAluno(aluno) })
    }
    if (u.has('modelos')) {
      const [modelos, proprios] = await Promise.all([lerModelos(conta.id), lerExerciciosProprios(conta.id)])
      return json({ modelos, proprios })
    }
    return falhar(400, 'Qual ficha?')
  },
  POST: async (req) => {
    const corpo = await lerCorpo(req)
    const conta = await exigirConta(req)
    switch (corpo.acao) {
      case 'salvar': {
        await limitar('ficha', conta.id, 120, 3600_000, 'Muitas fichas salvas em pouco tempo. Tente mais tarde.')
        const nova = !corpo.id
        const f = await salvarFicha(conta, corpo)
        if (nova && typeof corpo.modelo === 'string') await somarUsoDoModelo(conta.id, corpo.modelo)
        return json({ ficha: f }, nova ? 201 : 200)
      }
      case 'arquivar':
        return json({ ficha: await arquivar(conta, String(corpo.id ?? '')) })
      case 'copiar': {
        const f = await copiarPara(conta, String(corpo.id ?? ''), String(corpo.aluno ?? ''), corpo.contexto as ContextoFicha | undefined)
        return json({ ficha: f }, 201)
      }
      case 'vista': {
        const f = await lerFicha(String(corpo.id ?? ''))
        if (!f || f.aluno !== conta.id) return falhar(404, 'Ficha não encontrada.')
        return json({ ficha: await marcarVista(f) })
      }
      case 'modelo':
        return json({ modelo: await salvarModelo(conta, corpo) })
      case 'modelo-apagar':
        await apagarModelo(conta.id, String(corpo.id ?? ''))
        return json({ modelos: await lerModelos(conta.id) })
      case 'exercicio':
        if (!(await lerProfissional(conta.id))) falhar(403, 'Os exercícios próprios são do perfil profissional.')
        return json({ exercicio: await salvarExercicioProprio(conta, corpo) })
      default:
        return falhar(400, 'Ação desconhecida.')
    }
  },
})
