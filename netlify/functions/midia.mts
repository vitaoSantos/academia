import { contaDaRequisicao } from '../lib/auth.ts'
import { lerConta } from '../lib/contas.ts'
import { lerMidia } from '../lib/midia.ts'
import { acessoAoAluno } from '../lib/vinculos.ts'

// As fotos e as fontes enviadas, servidas com cache longo (o id muda quando a foto muda). As fotos
// de evolução são privadas: só o dono e o profissional que ele deixou ver.
// GET ?id=

function binario(dados: string) {
  const virgula = dados.indexOf(',')
  const tipo = dados.slice(5, dados.indexOf(';'))
  return { tipo, bytes: Buffer.from(dados.slice(virgula + 1), 'base64') }
}

export default async (req: Request) => {
  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (!/^[a-z0-9]{8,40}$/.test(id)) return new Response('Não encontrada', { status: 404 })
  const m = await lerMidia(id)
  if (!m) return new Response('Não encontrada', { status: 404 })
  if (m.privada) {
    const conta = await contaDaRequisicao(req)
    const dono = await lerConta(m.dono)
    const pode = !!conta && (conta.id === m.dono || (!!dono && (await acessoAoAluno(conta.id, m.dono)).medidas))
    if (!pode) return new Response('Foto privada', { status: 403 })
  }
  const { tipo, bytes } = binario(m.dados)
  return new Response(bytes, {
    headers: {
      'content-type': m.tipo === 'fonte' ? (tipo.startsWith('font/') ? tipo : 'font/woff2') : tipo,
      'cache-control': m.privada ? 'private, max-age=3600' : 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    },
  })
}
