import type { Context } from '@netlify/functions'
import { pontoValido, raioValido } from '../../src/shared/geo.ts'
import type { PostComComentarios } from '../../src/shared/respostas.ts'
import { contaDaRequisicao, exigirConta } from '../lib/auth.ts'
import { bloqueiosDe, contaPorUsuario, lerConta, resumos } from '../lib/contas.ts'
import { falhar, json, lerCorpo, limitar, rotas } from '../lib/http.ts'
import { apagarComentario, apagarPost, comentar, darForte, deixarDeSeguir, denunciar, feed, lerPost, lerSeguidores, lerSeguindo, MOTIVOS_DENUNCIA, podeVer, publicar, responderPedido, seguir, verComentarios, verPosts, type ModoFeed } from '../lib/rede.ts'
import { garantirDemonstracao } from '../lib/semente.ts'
import { lerVinculos } from '../lib/vinculos.ts'
import { limparVisitas } from '../lib/visitas.ts'

// A rede (seção 16 do estudo). Ver não pede conta; postar, dar 💪, comentar e seguir pedem.
// GET ?feed&modo=perto|seguindo|academia|empresa|perfil&lat&lng&raio&slug&usuario&antes · ?post=<id> ·
//     ?pedidos (quem pediu para seguir) · ?seguidores=<usuario> · ?seguindo=<usuario>
// POST { acao }: publicar, forte, comentar, apagar, apagar-comentario, denunciar, seguir, deixar,
//      pedido (aceitar ou recusar)

export default rotas({
  GET: async (req, context: Context) => {
    await garantirDemonstracao()
    context.waitUntil?.(limparVisitas().catch(() => 0))
    const u = new URL(req.url).searchParams
    const conta = await contaDaRequisicao(req)
    const postId = u.get('post')
    if (postId) {
      const p = await lerPost(postId)
      const segue = conta ? (await lerSeguindo(conta.id)).seguindo : []
      if (!p || !podeVer({ ...p, oculto: p.oculto }, conta?.id ?? null, (a) => segue.includes(a), bloqueiosDe(conta))) return falhar(404, 'Post não encontrado.')
      const [visto] = await verPosts([p], conta?.id ?? null)
      const r: PostComComentarios = { post: visto, comentarios: await verComentarios(postId, conta?.id ?? null, bloqueiosDe(conta)) }
      return json(r)
    }
    if (u.has('pedidos')) {
      const c = await exigirConta(req)
      const s = await lerSeguidores(c.id)
      const pessoas = await resumos(s.pedidos)
      return json({ pedidos: s.pedidos.map((id) => pessoas.get(id)).filter(Boolean) })
    }
    const lista = u.get('seguidores') ?? u.get('seguindo')
    if (lista) {
      const alvo = await contaPorUsuario(lista)
      if (!alvo || (alvo.visita && alvo.id !== conta?.id)) return falhar(404, 'Perfil não encontrado.')
      const segueAlvo = conta ? (await lerSeguindo(conta.id)).seguindo.includes(alvo.id) : false
      if (!alvo.publico && alvo.id !== conta?.id && !segueAlvo) falhar(403, 'Este perfil é privado.')
      const ids = u.has('seguidores') ? (await lerSeguidores(alvo.id)).aprovados : (await lerSeguindo(alvo.id)).seguindo
      const pessoas = await resumos(ids.slice(0, 300))
      return json({ pessoas: ids.map((id) => pessoas.get(id)).filter(Boolean) })
    }
    // o feed
    const modo = u.get('modo') ?? 'perto'
    const antes = u.get('antes') ?? undefined
    let m: ModoFeed
    if (modo === 'seguindo') {
      if (!conta) falhar(401, 'Entre na sua conta para ver quem você segue.')
      m = { modo: 'seguindo' }
    } else if (modo === 'academia') {
      if (!conta) falhar(401, 'Entre na sua conta para ver a sua academia.')
      const empresas = (await lerVinculos(conta!.id)).filter((v) => v.tipo === 'empresa' && v.status === 'ativo').map((v) => v.id)
      m = { modo: 'academia', empresas: [...empresas, ...(conta!.empresas ?? []).map((e) => e.slug)] }
    } else if (modo === 'empresa') m = { modo: 'empresa', slug: u.get('slug') ?? '' }
    else if (modo === 'perfil') {
      const autor = await contaPorUsuario(u.get('usuario') ?? '')
      if (!autor) return falhar(404, 'Perfil não encontrado.')
      m = { modo: 'perfil', autor: autor.id }
    } else {
      const ponto = { lat: Number(u.get('lat')), lng: Number(u.get('lng')) }
      m = { modo: 'perto', ...(pontoValido(ponto) ? { ponto } : conta?.cidade ? { ponto: { lat: conta.cidade.lat, lng: conta.cidade.lng } } : {}), raio: raioValido(u.get('raio') ?? conta?.raio) }
    }
    return json(await feed(conta, m, antes))
  },
  POST: async (req) => {
    const corpo = await lerCorpo(req)
    const conta = await exigirConta(req)
    const id = String(corpo.id ?? '')
    switch (corpo.acao) {
      case 'publicar': {
        await limitar('post', conta.id, 20, 3600_000, 'Muitos posts em pouco tempo. Tente mais tarde.')
        const p = await publicar(conta, corpo)
        const [visto] = await verPosts([p], conta.id)
        return json({ post: visto }, 201)
      }
      case 'forte': {
        await limitar('forte', conta.id, 300, 3600_000, 'Calma! Muitos 💪 em pouco tempo.')
        const [visto] = await verPosts([await darForte(conta, id)], conta.id)
        return json({ post: visto })
      }
      case 'comentar': {
        await limitar('comentario', conta.id, 60, 3600_000, 'Muitos comentários em pouco tempo.')
        await comentar(conta, id, corpo.texto)
        return json({ comentarios: await verComentarios(id, conta.id, bloqueiosDe(conta)) })
      }
      case 'apagar-comentario':
        await apagarComentario(conta, id, String(corpo.comentario ?? ''))
        return json({ comentarios: await verComentarios(id, conta.id, bloqueiosDe(conta)) })
      case 'apagar':
        await apagarPost(conta, id)
        return json({ ok: true })
      case 'denunciar': {
        await limitar('denuncia', conta.id, 15, 3600_000, 'Muitas denúncias em pouco tempo.')
        const alvo = (corpo.alvo ?? {}) as Record<string, unknown>
        const tipo = alvo.tipo === 'comentario' || alvo.tipo === 'perfil' ? alvo.tipo : 'post'
        const alvoId = String(alvo.id ?? '')
        let autor = ''
        if (tipo === 'post') autor = (await lerPost(alvoId))?.autor ?? ''
        else if (tipo === 'perfil') autor = (await lerConta(alvoId))?.id ?? ''
        else autor = String(alvo.autor ?? '')
        if (!autor) falhar(404, 'Não encontrado.')
        await denunciar(conta, { tipo, id: alvoId, autor, ...(typeof alvo.post === 'string' ? { post: alvo.post } : {}) }, String(corpo.motivo ?? ''))
        return json({ ok: true, motivos: MOTIVOS_DENUNCIA })
      }
      case 'seguir': {
        await limitar('seguir', conta.id, 120, 3600_000, 'Muitos pedidos para seguir em pouco tempo.')
        const alvo = await lerConta(id)
        if (!alvo || (alvo.visita && alvo.id !== conta.id)) return falhar(404, 'Perfil não encontrado.')
        return json({ segue: await seguir(conta, alvo) })
      }
      case 'deixar':
        await deixarDeSeguir(conta, id)
        return json({ segue: 'nao' })
      case 'pedido':
        await responderPedido(conta, id, corpo.aceitar === true)
        return json({ ok: true })
      default:
        return falhar(400, 'Ação desconhecida.')
    }
  },
})
