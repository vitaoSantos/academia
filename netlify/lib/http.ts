import type { Context } from '@netlify/functions'
import { atualizar, CHAVES, Conflito, env, hex, sha256 } from './store.ts'

// Respostas, leitura do corpo, erros e limites de uso, iguais em todas as funções

export class ErroHttp extends Error {
  status: number
  extra?: Record<string, unknown>
  constructor(status: number, mensagem: string, extra?: Record<string, unknown>) {
    super(mensagem)
    this.status = status
    this.extra = extra
  }
}

export const falhar = (status: number, mensagem: string, extra?: Record<string, unknown>): never => {
  throw new ErroHttp(status, mensagem, extra)
}

export function json(corpo: unknown, status = 200, extras: Record<string, string> = {}) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extras },
  })
}

export type Corpo = Record<string, unknown>

// O corpo chega em JSON (as fotos vão em base64 dentro dele, até ~6 MB por chamada no Netlify)
export async function lerCorpo(req: Request): Promise<Corpo> {
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) falhar(415, 'Envie os dados em JSON.')
  const texto = await req.text()
  if (texto.length > 6_500_000) falhar(413, 'Envio grande demais.')
  try {
    const dados = JSON.parse(texto)
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new Error()
    return dados as Corpo
  } catch {
    return falhar(400, 'Envio inválido.')
  }
}

// Contra envio de formulário a partir de outro site (o cookie de login vai junto em POST)
function mesmaOrigem(req: Request) {
  const origem = req.headers.get('origin')
  if (!origem) return true
  try {
    return new URL(origem).host === new URL(req.url).host
  } catch {
    return false
  }
}

type Manipulador = (req: Request, context: Context) => Promise<Response>

// Encaminha por método e transforma erros conhecidos em resposta com a mensagem certa
export function rotas(manipuladores: { GET?: Manipulador; POST?: Manipulador }, opcoes: { outraOrigem?: boolean } = {}) {
  return async (req: Request, context: Context) => {
    const fazer = manipuladores[req.method as 'GET' | 'POST']
    if (!fazer) return json({ erro: 'Método não permitido.' }, 405)
    if (req.method === 'POST' && !opcoes.outraOrigem && !mesmaOrigem(req)) return json({ erro: 'Origem não permitida.' }, 403)
    try {
      return await fazer(req, context)
    } catch (e) {
      if (e instanceof ErroHttp) return json({ erro: e.message, ...e.extra }, e.status)
      if (e instanceof Conflito) return json({ erro: e.message }, 409)
      console.error(e)
      return json({ erro: 'Algo deu errado do nosso lado. Tente de novo em instantes.' }, 500)
    }
  }
}

// Endereço de internet embaralhado: limita abusos sem guardar o IP
export async function quem(context: Context, sal = '') {
  return hex((await sha256(`${context.ip ?? 'desconhecido'}:${sal}:${env('SESSION_SECRET') ?? env('ADMIN_PASSWORD') ?? ''}:turma`)).slice(0, 10))
}

// No máximo `maximo` ações do tipo por janela de tempo (contador no próprio Blobs)
export async function limitar(tipo: string, chave: string, maximo: number, janelaMs: number, mensagem: string) {
  const janela = Math.floor(Date.now() / janelaMs)
  await atualizar<{ n: number }>(CHAVES.limite(tipo, chave, janela), { n: 0 }, (atual) => {
    if (atual.n >= maximo) falhar(429, mensagem)
    return { n: atual.n + 1 }
  })
}

export const robo = (userAgent: string | null) =>
  !userAgent || /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|lighthouse|python|curl|wget|httpclient/i.test(userAgent)

export const texto = (valor: unknown) => (typeof valor === 'string' ? valor : '')
export const numero = (valor: unknown, padrao = 0) => {
  const n = Number(valor)
  return Number.isFinite(n) ? n : padrao
}
export const inteiro = (valor: unknown, min: number, max: number, padrao = min) => {
  const n = Math.round(Number(valor))
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao
}
// Dinheiro chega em centavos (inteiro, nunca negativo)
export const centavos = (valor: unknown, max = 10_000_000) => inteiro(valor, 0, max, 0)
