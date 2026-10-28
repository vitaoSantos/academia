import type { Context } from '@netlify/functions'
import { agoraNoFuso, mesDe, somarDias } from '../../src/shared/tempo.ts'
import { assinar, assinaturaConfere, lerCookie, seguro } from './auth.ts'
import { falhar, quem, type Corpo } from './http.ts'
import { atualizar, CHAVES, env, iguaisSeguro, lerJSON, novoId } from './store.ts'
import { totpConfere } from './totp.ts'

// O acesso do dono da plataforma: a senha da variável ADMIN_PASSWORD e, se ADMIN_TOTP estiver
// definida, o código de 6 números do aplicativo autenticador. A sessão é um cookie assinado de 12
// horas, oito tentativas erradas travam o endereço por 15 minutos e cada ação fica no registro,
// que não se apaga.

const COOKIE = 'turma_admin'
const DURACAO = 12 * 3600
const TENTATIVAS = 8

export const adminLigado = () => !!env('ADMIN_PASSWORD')
export const pedeCodigo = () => !!env('ADMIN_TOTP')

// trocar a senha do admin derruba as sessões abertas (a senha entra na assinatura)
const assinarAdmin = (dados: string) => assinar(`admin:${env('ADMIN_PASSWORD') ?? ''}:${dados}`)

export function cookieDoAdmin(req: Request) {
  const dados = Buffer.from(`admin.${Math.floor(Date.now() / 1000) + DURACAO}`).toString('base64url')
  return `${COOKIE}=${dados}.${assinarAdmin(dados)}; Path=/; Max-Age=${DURACAO}; HttpOnly; SameSite=Strict${seguro(req)}`
}

export const saidaDoAdmin = (req: Request) => `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${seguro(req)}`

export function eAdmin(req: Request) {
  if (!adminLigado()) return false
  const [dados, assinatura] = lerCookie(req, COOKIE).split('.')
  if (!dados || !assinatura || !assinaturaConfere(`admin:${env('ADMIN_PASSWORD') ?? ''}:${dados}`, assinatura)) return false
  const [papel, expira] = Buffer.from(dados, 'base64url').toString().split('.')
  return papel === 'admin' && Number(expira) * 1000 > Date.now()
}

export function exigirAdmin(req: Request) {
  if (!adminLigado()) falhar(503, 'O admin está desligado: defina ADMIN_PASSWORD nas variáveis do site.')
  if (!eAdmin(req)) falhar(401, 'Entre no admin para continuar.')
}

type Trava = { erros: number; ate: number }

export async function entrarNoAdmin(corpo: Corpo, context: Context) {
  if (!adminLigado()) falhar(503, 'O admin está desligado: defina ADMIN_PASSWORD nas variáveis do site.')
  const chave = `admin-${await quem(context, 'admin')}`
  const trava = await lerJSON<Trava>(CHAVES.trava(chave), { erros: 0, ate: 0 })
  if (trava.ate > Date.now()) falhar(429, 'Muitas tentativas erradas. O acesso volta em alguns minutos.')
  const senha = typeof corpo.senha === 'string' ? corpo.senha : ''
  const codigo = typeof corpo.codigo === 'string' ? corpo.codigo : ''
  const senhaOk = !!senha && (await iguaisSeguro(senha, env('ADMIN_PASSWORD') ?? ''))
  const codigoOk = !pedeCodigo() || totpConfere(env('ADMIN_TOTP') ?? '', codigo)
  if (!senhaOk || !codigoOk) {
    let travou = false
    await atualizar<Trava>(CHAVES.trava(chave), { erros: 0, ate: 0 }, (t) => {
      const erros = t.ate && t.ate < Date.now() ? 1 : t.erros + 1
      travou = erros >= TENTATIVAS
      return travou ? { erros: 0, ate: Date.now() + 15 * 60_000 } : { erros, ate: 0 }
    })
    if (travou) await registrar(`${TENTATIVAS} tentativas erradas: acesso travado por 15 minutos`)
    falhar(401, pedeCodigo() ? 'Senha ou código incorretos.' : 'Senha incorreta.')
  }
  await atualizar<Trava>(CHAVES.trava(chave), { erros: 0, ate: 0 }, () => ({ erros: 0, ate: 0 }))
  await registrar('Entrou no admin')
}

// ---------- O registro ----------

export type AcaoRegistrada = { id: string; em: string; texto: string; motivo?: string }

export async function registrar(texto: string, motivo?: string) {
  const agora = new Date()
  const item: AcaoRegistrada = { id: novoId(), em: agora.toISOString(), texto, ...(motivo ? { motivo } : {}) }
  await atualizar<AcaoRegistrada[]>(CHAVES.registro(mesDe(agoraNoFuso(agora).data)), [], (lista) => [item, ...lista].slice(0, 20_000))
  return item
}

export const lerRegistro = (mes: string) => lerJSON<AcaoRegistrada[]>(CHAVES.registro(mes), [])

export function ultimosMeses(n = 6) {
  const hoje = agoraNoFuso().data
  const meses: string[] = []
  for (let d = hoje; meses.length < n; d = somarDias(`${mesDe(d)}-01`, -1)) meses.push(mesDe(d))
  return meses
}

// O motivo é obrigatório nas ações que mexem com alguém
export function motivoDe(corpo: Corpo, obrigatorio = true) {
  const motivo = typeof corpo.motivo === 'string' ? corpo.motivo.trim().slice(0, 300) : ''
  if (obrigatorio && motivo.length < 3) falhar(400, 'Escreva o motivo (fica no registro).')
  return motivo
}
