import { exigirConta } from '../lib/auth.ts'
import { lerAvisos, marcarLidos } from '../lib/avisos.ts'
import { json, rotas } from '../lib/http.ts'

// O sino: os avisos da conta.
// GET  ·  POST { acao: 'lidos' }

export default rotas({
  GET: async (req) => {
    const conta = await exigirConta(req)
    const avisos = await lerAvisos(conta.id)
    return json({ avisos, naoLidos: avisos.filter((a) => !a.lido).length })
  },
  POST: async (req) => {
    const conta = await exigirConta(req)
    await marcarLidos(conta.id)
    return json({ ok: true })
  },
})
