import { distanciaKm, pontoValido } from '../../src/shared/geo.ts'
import type { DesafioCompleto } from '../../src/shared/respostas.ts'
import { contaDaRequisicao, exigirConta } from '../lib/auth.ts'
import { criarDesafio, desafioComRanking, desafiosDe, desafiosPublicos, entrarNoDesafio, lerDesafio, sairDoDesafio } from '../lib/desafios.ts'
import { lerEmpresa } from '../lib/empresas.ts'
import { falhar, json, lerCorpo, limitar, rotas } from '../lib/http.ts'
import { lerProfissional } from '../lib/profissionais.ts'
import { garantirDemonstracao } from '../lib/semente.ts'

// Os desafios da rede.
// GET ?id · ?meus · ?publicos&lat&lng (os oficiais das academias e dos personais da região)
// POST { acao }: criar, entrar (id ou código), sair

export default rotas({
  GET: async (req) => {
    await garantirDemonstracao()
    const u = new URL(req.url).searchParams
    const conta = await contaDaRequisicao(req)
    const id = u.get('id')
    if (id) {
      const d = await lerDesafio(id)
      if (!d || (!d.publico && !d.participantes[conta?.id ?? ''])) return falhar(404, 'Desafio não encontrado.')
      return json((await desafioComRanking(d, conta?.id ?? null)) as DesafioCompleto)
    }
    if (u.has('meus')) {
      const c = await exigirConta(req)
      return json({ desafios: await desafiosDe(c.id) })
    }
    // os públicos perto de quem procura (pela academia ou pela cidade do personal)
    const ponto = { lat: Number(u.get('lat')), lng: Number(u.get('lng')) }
    const lista = await desafiosPublicos()
    const perto = []
    for (const d of lista) {
      if (!pontoValido(ponto) || !d.oficial) {
        perto.push(d)
        continue
      }
      if (d.oficial.tipo === 'empresa') {
        const e = await lerEmpresa(d.oficial.id)
        if (e?.unidades.some((x) => distanciaKm(ponto, x.ponto) <= 60)) perto.push(d)
      } else {
        const p = await lerProfissional(d.oficial.id)
        if (p && distanciaKm(ponto, p.cidade) <= Math.max(60, p.raioKm)) perto.push(d)
      }
    }
    return json({ desafios: perto.slice(0, 20) })
  },
  POST: async (req) => {
    const corpo = await lerCorpo(req)
    const conta = await exigirConta(req)
    switch (corpo.acao) {
      case 'criar': {
        await limitar('desafio', conta.id, 10, 86_400_000, 'Muitos desafios criados hoje.')
        const d = await criarDesafio(conta, corpo)
        return json(await desafioComRanking(d, conta.id), 201)
      }
      case 'entrar': {
        const d = await entrarNoDesafio(conta, { id: typeof corpo.id === 'string' ? corpo.id : undefined, codigo: typeof corpo.codigo === 'string' ? corpo.codigo : undefined })
        return json(await desafioComRanking(d, conta.id))
      }
      case 'sair':
        await sairDoDesafio(conta, String(corpo.id ?? ''))
        return json({ ok: true })
      default:
        return falhar(400, 'Ação desconhecida.')
    }
  },
})
