import { PLATAFORMA_PADRAO } from '../../src/shared/planos.ts'
import type { ConfigPlataforma } from '../../src/shared/tipos.ts'
import { CHAVES, lerJSON } from './store.ts'

// As regras da plataforma (o admin muda; a landing, o app e os painéis mostram): os preços e os
// limites dos planos, os dias de teste, o raio padrão, o cadastro aberto e o aviso no topo.

export async function lerPlataforma(): Promise<ConfigPlataforma> {
  const salvo = await lerJSON<Partial<ConfigPlataforma>>(CHAVES.plataforma, {})
  const p = PLATAFORMA_PADRAO
  return { ...p, ...salvo, precos: { ...p.precos, ...salvo.precos }, limites: { ...p.limites, ...salvo.limites } }
}
