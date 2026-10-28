import type { Evolucao, Historico, UltimaVez } from '../../src/shared/respostas.ts'
import { dataDe, hoje } from '../../src/shared/tempo.ts'
import { melhoresDe, sequencia, ultimaVez } from '../../src/shared/treino.ts'
import { exigirConta } from '../lib/auth.ts'
import { lerConta } from '../lib/contas.ts'
import { falhar, json, lerCorpo, limitar, rotas } from '../lib/http.ts'
import { janelaDoPlano, maisFeitos, progressao, registrarTreino, treinosDe } from '../lib/treinos.ts'
import { acessoAoAluno } from '../lib/vinculos.ts'

// Os treinos feitos.
// GET ?historico[&aluno=<id>] · ?evolucao=<exercicio>[&aluno=<id>] · ?ultima (a última vez de cada
//     exercício e os melhores, para preencher o treino ao vivo)
// POST { acao: 'registrar', ... } (o treino ao vivo, quando termina)

export default rotas({
  GET: async (req) => {
    const u = new URL(req.url).searchParams
    const conta = await exigirConta(req)
    // o profissional vê os treinos do aluno dele (personal ou professor da academia do aluno)
    const alunoId = u.get('aluno')
    let dono = conta
    if (alunoId && alunoId !== conta.id) {
      if (!(await acessoAoAluno(conta.id, alunoId)).treinos) falhar(403, 'Esta pessoa não é sua aluna.')
      const a = await lerConta(alunoId)
      if (!a) return falhar(404, 'Aluno não encontrado.')
      dono = a
    }
    const todos = await treinosDe(dono.id)
    // o plano grátis do aluno vê os últimos 90 dias (o profissional vê tudo)
    const janela = dono.id === conta.id ? await janelaDoPlano(conta) : null
    const visiveis = janela ? todos.filter((t) => dataDe(t.inicio) >= janela) : todos
    if (u.has('historico')) {
      const r: Historico = { treinos: visiveis.slice(0, 200), janela, sequencia: sequencia(todos.map((t) => dataDe(t.inicio)), dono.metaSemanal, hoje()), meta: dono.metaSemanal, melhores: melhoresDe(visiveis) }
      return json(r)
    }
    const exercicio = u.get('evolucao')
    if (exercicio !== null) {
      const feitos = maisFeitos(visiveis)
      const alvo = exercicio || feitos[0]?.id || ''
      const r: Evolucao = { exercicio: alvo, pontos: alvo ? progressao(visiveis, alvo) : [], maisFeitos: feitos, janela }
      return json(r)
    }
    if (u.has('ultima')) {
      const r: UltimaVez = { ultima: ultimaVez(todos.slice(0, 60)), melhores: melhoresDe(todos) }
      return json(r)
    }
    return falhar(400, 'O que você quer ver?')
  },
  POST: async (req) => {
    const corpo = await lerCorpo(req)
    const conta = await exigirConta(req)
    if (corpo.acao !== 'registrar') falhar(400, 'Ação desconhecida.')
    await limitar('treino', conta.id, 30, 3600_000, 'Muitos treinos registrados em pouco tempo.')
    const r = await registrarTreino(conta, corpo)
    return json(r, r.repetido ? 200 : 201)
  },
})
