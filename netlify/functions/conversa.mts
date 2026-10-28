import type { ConversaVista } from '../../src/shared/respostas.ts'
import type { Lado } from '../../src/shared/tipos.ts'
import { exigirConta } from '../lib/auth.ts'
import { lerConta } from '../lib/contas.ts'
import { abrirConversa, enviar, ladoDe, listaDe, lerConversa, marcarLida, naoLida, nomeDoLado } from '../lib/conversas.ts'
import { lerEmpresa } from '../lib/empresas.ts'
import { falhar, json, lerCorpo, limitar, rotas } from '../lib/http.ts'
import { lerProfissional } from '../lib/profissionais.ts'

// As conversas (seção 17 do estudo). `como=<slug>` fala pela caixa da empresa (quem é da equipe).
// GET ?lista[&como] · ?id[&como] · ?contador[&como]
// POST { acao }: abrir (com: { tipo, id }), enviar (id, texto)

async function linkDe(l: Lado) {
  if (l.tipo === 'empresa') return { link: `/${l.id}`, foto: (await lerEmpresa(l.id))?.visual.logo }
  const c = await lerConta(l.id)
  const p = c?.profissional ? await lerProfissional(l.id) : null
  return { link: p?.publico ? `/${p.slug}` : c ? `/u/${c.usuario}` : '/', foto: c?.foto }
}

export default rotas({
  GET: async (req) => {
    const u = new URL(req.url).searchParams
    const conta = await exigirConta(req)
    const eu = await ladoDe(conta, u.get('como') ?? undefined)
    if (u.has('lista')) {
      const lista = await listaDe(eu)
      return json({ conversas: lista, naoLidas: lista.filter(naoLida).length })
    }
    if (u.has('contador')) return json({ naoLidas: (await listaDe(eu)).filter(naoLida).length })
    const id = u.get('id') ?? ''
    const c = await lerConversa(id)
    if (!c || !c.lados.some((l) => l.tipo === eu.tipo && l.id === eu.id)) return falhar(404, 'Conversa não encontrada.')
    await marcarLida(id, eu)
    const outro = c.lados.find((l) => !(l.tipo === eu.tipo && l.id === eu.id))!
    const nomes = new Map<string, string>()
    for (const m of c.mensagens) {
      const k = `${m.lado.tipo}:${m.lado.id}:${m.de}`
      if (!nomes.has(k)) {
        const ladoNome = await nomeDoLado(m.lado)
        const pessoa = m.lado.tipo === 'empresa' ? (await lerConta(m.de))?.nome?.split(' ')[0] : undefined
        nomes.set(k, pessoa ? `${ladoNome} · ${pessoa}` : ladoNome)
      }
    }
    const r: ConversaVista = {
      id,
      eu,
      outro: { ...outro, nome: await nomeDoLado(outro), ...(await linkDe(outro)) },
      mensagens: c.mensagens.map((m) => ({ ...m, meu: m.lado.tipo === eu.tipo && m.lado.id === eu.id, nome: nomes.get(`${m.lado.tipo}:${m.lado.id}:${m.de}`) ?? '' })),
    }
    return json(r)
  },
  POST: async (req) => {
    const corpo = await lerCorpo(req)
    const conta = await exigirConta(req)
    const eu = await ladoDe(conta, typeof corpo.como === 'string' && corpo.como ? corpo.como : undefined)
    switch (corpo.acao) {
      case 'abrir': {
        const com = (corpo.com ?? {}) as Record<string, unknown>
        const lado: Lado = { tipo: com.tipo === 'empresa' ? 'empresa' : 'conta', id: String(com.id ?? '') }
        if (!lado.id) falhar(400, 'Com quem?')
        return json({ id: await abrirConversa(eu, lado, conta) })
      }
      case 'enviar': {
        await limitar('mensagem', conta.id, 90, 3600_000, 'Muitas mensagens em pouco tempo. Respire um pouco 🙂')
        await enviar(conta, String(corpo.id ?? ''), eu, corpo.texto)
        return json({ ok: true })
      }
      default:
        return falhar(400, 'Ação desconhecida.')
    }
  },
})
