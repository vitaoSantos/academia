import type { Context } from '@netlify/functions'

// O "navegador" dos testes: chama as funções do Netlify de verdade, guarda o cookie de login e
// reúne o trabalho deixado para depois (waitUntil)

export type Funcao = (req: Request, context: Context) => Promise<Response>

export const pendentes: Promise<unknown>[] = []
const contexto = (ip: string) => ({ ip, waitUntil: (p: Promise<unknown>) => void pendentes.push(p) }) as unknown as Context

export class Navegador {
  cookie = ''
  ip: string
  constructor(ip = '10.0.0.1') {
    this.ip = ip
  }
  async bruto(fn: Funcao, metodo: 'GET' | 'POST', caminho: string, corpo?: string, extras: Record<string, string> = {}) {
    const headers: Record<string, string> = { ...extras }
    if (this.cookie) headers.cookie = this.cookie
    const res = await fn(new Request(`https://turma.test${caminho}`, { method: metodo, headers, body: corpo }), contexto(this.ip))
    const novo = res.headers.get('set-cookie')
    if (novo) this.cookie = novo.split(';')[0].endsWith('=') ? '' : novo.split(';')[0]
    return res
  }
  async chamar(fn: Funcao, metodo: 'GET' | 'POST', caminho: string, corpo?: unknown, extras: Record<string, string> = {}) {
    const res = await this.bruto(fn, metodo, caminho, corpo === undefined ? undefined : JSON.stringify(corpo), { ...(corpo !== undefined ? { 'content-type': 'application/json' } : {}), ...extras })
    return { status: res.status, dados: (await res.json()) as Record<string, any> }
  }
}

// As cidades dos testes (IBGE)
export const SL = { codigo: 3163706, nome: 'São Lourenço', uf: 'MG', lat: -22.1166, lng: -45.0506 }
export const CAXAMBU = { codigo: 3115508, nome: 'Caxambu', uf: 'MG', lat: -21.9753, lng: -44.9319 }
export const POCOS = { codigo: 3151800, nome: 'Poços de Caldas', uf: 'MG', lat: -21.78, lng: -46.5692 }

let n = 0
// Uma conta nova (cada uma com o seu endereço de internet, para não esbarrar nos limites)
export async function novaConta(sessao: Funcao, nome: string, extra: Record<string, unknown> = {}) {
  n++
  const nav = new Navegador(`10.9.${Math.floor(n / 200)}.${n % 200}`)
  const r = await nav.chamar(sessao, 'POST', '/s', { acao: 'cadastro', nome, login: `${nome.toLowerCase().replace(/[^a-z]/g, '')}${n}@teste.com`, senha: 'senha-forte-123', cidade: SL, ...extra })
  if (r.status !== 201) throw new Error(`cadastro falhou: ${JSON.stringify(r.dados)}`)
  return { nav, usuario: r.dados.usuario as { id: string; nome: string; usuario: string } }
}
