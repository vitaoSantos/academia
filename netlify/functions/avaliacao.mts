import { exigirConta } from '../lib/auth.ts'
import { avaliar, lerAvaliacoes, responder } from '../lib/avaliacoes.ts'
import { exigirEquipe, PODE } from '../lib/empresas.ts'
import { falhar, json, lerCorpo, limitar, rotas } from '../lib/http.ts'

// As avaliações: avaliar o profissional ou a academia (só quem treinou de verdade) e a resposta
// pública de quem foi avaliado.
// POST { acao }: avaliar (alvo: { tipo, id }), responder (alvo, de, texto)

const alvoDe = (v: unknown) => {
  const a = (v ?? {}) as Record<string, unknown>
  const tipo = a.tipo === 'empresa' ? 'empresa' : a.tipo === 'profissional' ? 'profissional' : null
  if (!tipo || typeof a.id !== 'string') return falhar(400, 'Quem você quer avaliar?')
  return { tipo, id: a.id } as const
}

export default rotas({
  POST: async (req) => {
    const corpo = await lerCorpo(req)
    const conta = await exigirConta(req)
    const alvo = alvoDe(corpo.alvo)
    if (corpo.acao === 'avaliar') {
      await limitar('avaliacao', conta.id, 20, 86_400_000, 'Muitas avaliações hoje.')
      await avaliar(conta, alvo, corpo)
      return json({ avaliacoes: await lerAvaliacoes(alvo) })
    }
    if (corpo.acao === 'responder') {
      if (alvo.tipo === 'profissional' && alvo.id !== conta.id) falhar(403, 'Só o profissional responde as avaliações dele.')
      if (alvo.tipo === 'empresa') await exigirEquipe(req, alvo.id, PODE.configurar)
      return json({ avaliacoes: await responder(alvo, String(corpo.de ?? ''), corpo.texto) })
    }
    return falhar(400, 'Ação desconhecida.')
  },
})
