import { DATA } from '../../src/shared/tempo.ts'
import { exigirConta } from '../lib/auth.ts'
import { exigirEquipe, PODE } from '../lib/empresas.ts'
import { cancelarReserva, lerExperimentais, lerReservasDoAluno, marcarPresenca, pedirExperimental, reservarAula, responderExperimental, vouNoEvento } from '../lib/grade.ts'
import { falhar, json, lerCorpo, limitar, rotas } from '../lib/http.ts'

// As aulas das modalidades: reservar, cancelar, a fila, a presença e a aula experimental.
// GET ?minhas (as reservas do aluno) · ?experimentais&slug (a academia)
// POST { acao }: reservar, cancelar, cheguei, presenca (a equipe), experimental,
//      experimental-responder (a academia), vou (no evento)

const data = (v: unknown) => (typeof v === 'string' && DATA.test(v) ? v : falhar(400, 'Qual dia?'))

export default rotas({
  GET: async (req) => {
    const u = new URL(req.url).searchParams
    if (u.has('experimentais')) {
      const { empresa } = await exigirEquipe(req, u.get('slug') ?? '', PODE.alunos)
      return json({ pedidos: await lerExperimentais(empresa.slug) })
    }
    const conta = await exigirConta(req)
    return json({ reservas: await lerReservasDoAluno(conta.id) })
  },
  POST: async (req) => {
    const corpo = await lerCorpo(req)
    const conta = await exigirConta(req)
    await limitar('aula', conta.id, 120, 3600_000, 'Muitas reservas em pouco tempo.')
    const slug = String(corpo.slug ?? '')
    const aula = String(corpo.aula ?? '')
    switch (corpo.acao) {
      case 'reservar':
        return json(await reservarAula(conta, slug, aula, corpo.data, corpo.lugar))
      case 'cancelar':
        await cancelarReserva(conta, slug, aula, data(corpo.data))
        return json({ ok: true })
      case 'cheguei':
        return json({ presentes: await marcarPresenca(slug, aula, data(corpo.data), [conta.id], conta, false) })
      case 'presenca': {
        await exigirEquipe(req, slug, PODE.treinar)
        const contas = Array.isArray(corpo.contas) ? corpo.contas.filter((c): c is string => typeof c === 'string').slice(0, 80) : []
        return json({ presentes: await marcarPresenca(slug, aula, data(corpo.data), contas, conta, true) })
      }
      case 'experimental':
        await limitar('experimental', conta.id, 6, 86_400_000, 'Muitos pedidos de aula experimental hoje.')
        return json({ pedido: await pedirExperimental(conta, slug, aula, corpo.data) }, 201)
      case 'experimental-responder': {
        await exigirEquipe(req, slug, PODE.alunos)
        const status = ['confirmado', 'feito', 'recusado'].includes(corpo.status as string) ? (corpo.status as 'confirmado') : 'confirmado'
        return json({ pedido: await responderExperimental(slug, String(corpo.id ?? ''), status, conta) })
      }
      case 'vou':
        return json({ vou: await vouNoEvento(conta, slug, String(corpo.evento ?? '')) })
      default:
        return falhar(400, 'Ação desconhecida.')
    }
  },
})
