import { createHmac } from 'node:crypto'

// O código de 6 números do aplicativo autenticador (TOTP, RFC 6238): o segredo em base32 fica na
// variável ADMIN_TOTP. Vale o código de agora e os de 30 segundos antes e depois (o relógio do
// celular nunca está perfeito).

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32(texto: string) {
  const limpo = texto.toUpperCase().replace(/[^A-Z2-7]/g, '')
  const saida: number[] = []
  let bits = 0
  let valor = 0
  for (const c of limpo) {
    valor = ((valor << 5) | ALFABETO.indexOf(c)) & 0xffff
    bits += 5
    if (bits >= 8) {
      saida.push((valor >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(saida)
}

export function codigoTotp(segredo: string, quando = Date.now(), digitos = 6, passo = 30) {
  const mensagem = Buffer.alloc(8)
  mensagem.writeBigUInt64BE(BigInt(Math.floor(quando / 1000 / passo)))
  const h = createHmac('sha1', base32(segredo)).update(mensagem).digest()
  const o = h[h.length - 1] & 0x0f
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]
  return String(n % 10 ** digitos).padStart(digitos, '0')
}

export function totpConfere(segredo: string, codigo: string, quando = Date.now()) {
  const c = codigo.replace(/\D/g, '')
  return c.length === 6 && [-1, 0, 1].some((k) => codigoTotp(segredo, quando + k * 30_000) === c)
}
