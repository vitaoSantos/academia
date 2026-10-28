import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { Usuario } from '../../src/shared/tipos.ts'
import { falhar } from './http.ts'
import { CHAVES, env, lerJSON } from './store.ts'

// Login: senha com scrypt (sal próprio por conta) e sessão num cookie assinado.
// Nada de sessão guardada no servidor; "sair de todos os aparelhos" troca a `versao` da conta.

const scrypt = promisify(scryptCallback) as (senha: string, sal: Buffer, tamanho: number) => Promise<Buffer>

// bloqueadoPor: quem bloqueou esta pessoa (ela não sabe; serve para o bloqueio valer nos dois lados)
export type ContaGuardada = Usuario & { senha: { sal: string; hash: string }; versao: number; bloqueadoPor?: string[] }

export async function protegerSenha(senha: string) {
  const sal = randomBytes(16)
  const hash = await scrypt(senha.normalize('NFKC'), sal, 32)
  return { sal: sal.toString('base64'), hash: hash.toString('base64') }
}

export async function senhaConfere(senha: string, guardada: ContaGuardada['senha']) {
  const esperado = Buffer.from(guardada.hash, 'base64')
  const calculado = await scrypt(senha.normalize('NFKC'), Buffer.from(guardada.sal, 'base64'), esperado.length)
  return timingSafeEqual(esperado, calculado)
}

// Sem SESSION_SECRET, usa a senha do admin; sem nenhuma das duas (só no computador), um segredo fixo
export function segredo() {
  const proprio = env('SESSION_SECRET')
  if (proprio) return proprio
  const admin = env('ADMIN_PASSWORD')
  return admin ? `admin:${admin}` : 'turma-somente-desenvolvimento'
}

const COOKIE = 'turma_sessao'
const DURACAO = 60 * 60 * 24 * 60 // 60 dias

export const assinar = (dados: string) => createHmac('sha256', segredo()).update(dados).digest('base64url')

export function assinaturaConfere(dados: string, assinatura: string) {
  const certa = Buffer.from(assinar(dados))
  const recebida = Buffer.from(assinatura)
  return certa.length === recebida.length && timingSafeEqual(certa, recebida)
}

export function cookieDeSessao(conta: Pick<ContaGuardada, 'id' | 'versao'>, req: Request) {
  const expira = Math.floor(Date.now() / 1000) + DURACAO
  const dados = Buffer.from(`${conta.id}.${conta.versao}.${expira}`).toString('base64url')
  return `${COOKIE}=${dados}.${assinar(dados)}; Path=/; Max-Age=${DURACAO}; HttpOnly; SameSite=Lax${seguro(req)}`
}

export const cookieDeSaida = (req: Request) => `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${seguro(req)}`

export const seguro = (req: Request) => (new URL(req.url).protocol === 'https:' ? '; Secure' : '')

export function lerCookie(req: Request, nome = COOKIE) {
  const cabecalho = req.headers.get('cookie') ?? ''
  for (const parte of cabecalho.split(';')) {
    const [n, ...resto] = parte.trim().split('=')
    if (n === nome) return resto.join('=')
  }
  return ''
}

// Conta da pessoa logada (ou null): confere assinatura, validade, versão e bloqueio
export async function contaDaRequisicao(req: Request): Promise<ContaGuardada | null> {
  const [dados, assinatura] = lerCookie(req).split('.')
  if (!dados || !assinatura || !assinaturaConfere(dados, assinatura)) return null
  const [id, versao, expira] = Buffer.from(dados, 'base64url').toString().split('.')
  if (!id || Number(expira) * 1000 < Date.now()) return null
  const conta = await lerJSON<ContaGuardada | null>(CHAVES.conta(id), null)
  if (!conta || conta.bloqueado || String(conta.versao) !== versao) return null
  return conta
}

export async function exigirConta(req: Request): Promise<ContaGuardada> {
  const conta = await contaDaRequisicao(req)
  return conta ?? falhar(401, 'Entre na sua conta para continuar.')
}

export function publico(conta: ContaGuardada): Usuario {
  const { senha: _senha, versao: _versao, bloqueadoPor: _bloqueadoPor, ...usuario } = conta
  return usuario
}
