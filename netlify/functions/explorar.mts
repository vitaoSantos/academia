import { pontoValido, raioValido } from '../../src/shared/geo.ts'
import type { TipoEmpresa } from '../../src/shared/tipos.ts'
import { explorar } from '../lib/explorar.ts'
import { falhar, json, rotas } from '../lib/http.ts'
import { garantirDemonstracao } from '../lib/semente.ts'

// O mapa da região (seção 15 do estudo): as academias e os profissionais num raio em volta de quem
// procura. Não pede conta.
// GET ?lat&lng&raio&tipo=todos|academias|personais&modalidade&busca&ordem=distancia|nota&wellhub&totalpass&tipos=ct,estudio

const TIPOS: TipoEmpresa[] = ['academia', 'rede', 'estudio', 'box', 'ct', 'danca', 'aquatica']

export default rotas({
  GET: async (req) => {
    await garantirDemonstracao()
    const u = new URL(req.url).searchParams
    const ponto = { lat: Number(u.get('lat')), lng: Number(u.get('lng')) }
    if (!pontoValido(ponto)) falhar(400, 'Escolha a cidade (ou use a sua localização).')
    const tipo = u.get('tipo')
    const tiposEmpresa = (u.get('tipos') ?? '').split(',').filter((t): t is TipoEmpresa => TIPOS.includes(t as TipoEmpresa))
    const resultado = await explorar({
      ponto,
      raio: raioValido(u.get('raio')),
      tipo: tipo === 'academias' || tipo === 'personais' ? tipo : 'todos',
      ...(tiposEmpresa.length ? { tiposEmpresa } : {}),
      modalidade: u.get('modalidade') || undefined,
      busca: (u.get('busca') ?? '').slice(0, 60) || undefined,
      ordem: u.get('ordem') === 'nota' ? 'nota' : 'distancia',
      wellhub: u.get('wellhub') === '1',
      totalpass: u.get('totalpass') === '1',
    })
    return json(resultado, 200, { 'cache-control': 'no-store' })
  },
})
