import type { PlataformaPublica } from '../../src/shared/respostas.ts'
import { json, rotas } from '../lib/http.ts'
import { lerPlataforma } from '../lib/plataforma.ts'

// O que a landing e o app mostram da plataforma: os preços e os limites dos planos, os dias de
// teste, o raio padrão, o cadastro aberto e o aviso no topo.
// GET

export default rotas({
  GET: async () => {
    const c = await lerPlataforma()
    const publica: PlataformaPublica = { precos: c.precos, limites: c.limites, descontoRede: c.descontoRede, diasTeste: c.diasTeste, raioPadrao: c.raioPadrao, cadastroAberto: c.cadastroAberto, aviso: c.aviso }
    return json(publica, 200, { 'cache-control': 'public, max-age=60' })
  },
})
