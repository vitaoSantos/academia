import { distanciaKm, pontoValido } from '../../src/shared/geo.ts'
import { limparTexto, temLink, temTelefone } from '../../src/shared/texto.ts'
import type { PostVisto } from '../../src/shared/respostas.ts'
import type { Comentario, Marcado, Ponto, Post, TipoPost } from '../../src/shared/tipos.ts'
import type { ContaGuardada } from './auth.ts'
import { avisarSemFalhar } from './avisos.ts'
import { bloqueiosDe, lerConta, resumos } from './contas.ts'
import { lerEmpresa, nomeDaUnidade } from './empresas.ts'
import { falhar, type Corpo } from './http.ts'
import { somarNoDia } from './estatisticas.ts'
import { guardarImagem } from './midia.ts'
import { lerProfissional } from './profissionais.ts'
import { atualizar, blobs, CHAVES, lerJSON, lerVarios, novoId } from './store.ts'
import { treinosDe, marcarPost } from './treinos.ts'

// A rede (seção 16 do estudo): o "treino pago" e os outros posts, o 💪, os comentários, seguir (com o
// pedido para quem tem perfil privado), a denúncia e o feed da região.

export type LinhaFeed = { id: string; autor: string; criadoEm: string; tipo: TipoPost; ponto?: Ponto; empresas: string[]; privado?: boolean; visita?: boolean; oculto?: boolean }

export type Seguidores = { aprovados: string[]; pedidos: string[] }
export type Seguindo = { seguindo: string[]; pedidos: string[] }

const MAX_FEED = 4000
export const POR_PAGINA = 12
const DENUNCIAS_PARA_OCULTAR = 3

export const lerPost = (id: string) => lerJSON<Post | null>(CHAVES.post(id), null)
export const lerSeguidores = (id: string) => lerJSON<Seguidores>(CHAVES.seguidores(id), { aprovados: [], pedidos: [] })
export const lerSeguindo = (id: string) => lerJSON<Seguindo>(CHAVES.seguindo(id), { seguindo: [], pedidos: [] })

// O texto da rede não aceita link nem telefone (a porta do golpe e do spam)
export function conferirTexto(texto: string) {
  if (temLink(texto)) falhar(400, 'Links não são aceitos na rede.')
  if (temTelefone(texto)) falhar(400, 'Telefone não é aceito na rede. Use o chat.')
}

async function marcadosValidos(dado: unknown): Promise<Marcado[]> {
  if (!Array.isArray(dado)) return []
  const saida: Marcado[] = []
  for (const m of dado.slice(0, 6)) {
    const x = (m ?? {}) as Record<string, unknown>
    if (typeof x.id !== 'string') continue
    if (x.tipo === 'empresa') {
      const e = await lerEmpresa(x.id)
      if (e) saida.push({ tipo: 'empresa', id: e.slug, nome: e.nome })
    } else if (x.tipo === 'profissional') {
      const p = await lerProfissional(x.id)
      if (p) saida.push({ tipo: 'profissional', id: p.id, nome: p.nome })
    } else if (x.tipo === 'pessoa') {
      const c = await lerConta(x.id)
      if (c && !c.visita) saida.push({ tipo: 'pessoa', id: c.id, nome: c.nome })
    }
  }
  return saida.filter((m, i) => saida.findIndex((o) => o.tipo === m.tipo && o.id === m.id) === i)
}

export async function publicar(conta: ContaGuardada, corpo: Corpo) {
  const tipo: TipoPost = ['treino', 'aula', 'conquista', 'foto'].includes(corpo.tipo as string) ? (corpo.tipo as TipoPost) : 'foto'
  const texto = limparTexto(corpo.texto, 600)
  if (texto) conferirTexto(texto)
  const foto = corpo.foto ? (await guardarImagem(conta.id, 'post', corpo.foto)).id : undefined
  const agora = new Date().toISOString()
  const post: Post = { id: novoId(), autor: conta.id, tipo, criadoEm: agora, marcados: await marcadosValidos(corpo.marcados), fortes: [], comentarios: 0, denuncias: [] }
  if (texto) post.texto = texto
  if (foto) post.foto = foto

  // o "treino pago": o resumo vem do treino guardado, não do que o navegador mandou
  if (tipo === 'treino' || tipo === 'aula') {
    const id = typeof corpo.treino === 'string' ? corpo.treino : ''
    const t = id ? (await treinosDe(conta.id, 1)).find((x) => x.id === id) : undefined
    if (!t) falhar(400, 'Escolha o treino que você fez.')
    if (t!.post) falhar(409, 'Esse treino já foi postado.')
    if (tipo === 'treino') post.treino = { nome: t!.nome, duracaoMin: t!.duracaoMin, volume: t!.volume, series: t!.series, exercicios: t!.exercicios.length, recordes: t!.recordes.length }
    else post.aula = { modalidade: t!.modalidade ?? '', nome: t!.nome }
    if (t!.local && !corpo.local) corpo.local = t!.local
    await marcarPost(conta.id, t!.id, post.id)
  }
  if (tipo === 'conquista') {
    const c = (corpo.conquista ?? {}) as Record<string, unknown>
    const tipos = ['recorde', 'faixa', 'desafio', 'sequencia']
    const textoConquista = limparTexto(c.texto, 120)
    if (!tipos.includes(c.tipo as string) || !textoConquista) falhar(400, 'Conquista inválida.')
    post.conquista = { tipo: c.tipo as 'recorde', texto: textoConquista }
  }
  if (tipo === 'foto' && !foto && !texto) falhar(400, 'Escreva alguma coisa ou mande uma foto.')

  // onde: a unidade marcada (vira o ponto do feed da região) ou a cidade de quem postou
  const local = (corpo.local ?? null) as { empresa?: unknown; unidade?: unknown } | null
  if (local && typeof local.empresa === 'string' && typeof local.unidade === 'string') {
    const e = await lerEmpresa(local.empresa)
    const u = e?.unidades.find((x) => x.id === local.unidade)
    if (e && u) {
      post.local = { empresa: e.slug, unidade: u.id, nome: nomeDaUnidade(e, u.id) }
      post.ponto = u.ponto
      if (!post.marcados.some((m) => m.tipo === 'empresa' && m.id === e.slug)) post.marcados.unshift({ tipo: 'empresa', id: e.slug, nome: e.nome })
    }
  }
  if (!post.ponto && conta.cidade) post.ponto = { lat: conta.cidade.lat, lng: conta.cidade.lng }
  if (!conta.publico) post.privado = true
  if (conta.visita) post.visita = true

  await blobs().setJSON(CHAVES.post(post.id), post)
  const empresas = post.marcados.filter((m) => m.tipo === 'empresa').map((m) => m.id)
  const linha: LinhaFeed = { id: post.id, autor: conta.id, criadoEm: agora, tipo, ...(post.ponto ? { ponto: post.ponto } : {}), empresas, ...(post.privado ? { privado: true } : {}), ...(post.visita ? { visita: true } : {}) }
  await atualizar<LinhaFeed[]>(CHAVES.feed, [], (l) => [linha, ...l].slice(0, MAX_FEED))
  await atualizar<string[]>(CHAVES.postsDo(conta.id), [], (l) => [post.id, ...l].slice(0, 500))
  await somarNoDia('posts', !!(conta.demo || conta.visita))
  if (!post.visita) {
    for (const slug of empresas) await atualizar<string[]>(CHAVES.postsDaEmpresa(slug), [], (l) => [post.id, ...l].slice(0, 500))
    for (const m of post.marcados) {
      if (m.tipo === 'empresa') {
        const e = await lerEmpresa(m.id)
        if (e) avisarSemFalhar(e.dono, 'marcado', `${conta.nome} marcou a ${e.nome} num post.`, `/rede/p/${post.id}`)
      } else if (m.id !== conta.id) avisarSemFalhar(m.id, 'marcado', `${conta.nome} marcou você num post.`, `/rede/p/${post.id}`)
    }
  }
  return post
}

// ---------- Quem vê o quê ----------

// Perfil privado: os posts só aparecem para quem segue (aprovado) e para a própria pessoa
export function podeVer(linha: Pick<LinhaFeed, 'autor' | 'privado' | 'visita' | 'oculto'>, quem: string | null, aprovado: (autor: string) => boolean, bloqueios: Set<string>) {
  if (linha.autor === quem) return true
  if (linha.oculto || linha.visita) return false
  if (bloqueios.has(linha.autor)) return false
  if (linha.privado) return !!quem && aprovado(linha.autor)
  return true
}

export async function verPosts(posts: Post[], quem: string | null): Promise<PostVisto[]> {
  const autores = await resumos(posts.map((p) => p.autor))
  return posts
    .filter((p) => autores.has(p.autor))
    .map((p) => {
      const { denuncias: _d, ...resto } = p
      return { ...resto, denuncias: [], fortes: p.fortes.slice(0, 3), autorResumo: autores.get(p.autor)!, dei: !!quem && p.fortes.includes(quem), meu: p.autor === quem, totalFortes: p.fortes.length }
    })
}

export type ModoFeed = { modo: 'perto'; ponto?: Ponto; raio: number } | { modo: 'seguindo' } | { modo: 'academia'; empresas: string[] } | { modo: 'empresa'; slug: string } | { modo: 'perfil'; autor: string }

export async function feed(conta: ContaGuardada | null, modo: ModoFeed, antes?: string) {
  const quem = conta?.id ?? null
  const [indice, seguindo] = await Promise.all([lerJSON<LinhaFeed[]>(CHAVES.feed, []), quem ? lerSeguindo(quem) : Promise.resolve({ seguindo: [], pedidos: [] } as Seguindo)])
  const segue = new Set(seguindo.seguindo)
  const bloqueios = bloqueiosDe(conta)
  const candidatos = indice.filter((l) => {
    if (antes && l.criadoEm >= antes) return false
    if (!podeVer(l, quem, (a) => segue.has(a), bloqueios)) return false
    switch (modo.modo) {
      case 'perto':
        return !modo.ponto || l.autor === quem || (!!l.ponto && pontoValido(l.ponto) && distanciaKm(modo.ponto, l.ponto) <= modo.raio)
      case 'seguindo':
        return l.autor === quem || segue.has(l.autor)
      case 'academia':
        return l.empresas.some((e) => modo.empresas.includes(e))
      case 'empresa':
        return l.empresas.includes(modo.slug) && !l.privado
      case 'perfil':
        return l.autor === modo.autor
    }
  })
  const pagina = candidatos.slice(0, POR_PAGINA)
  const posts = await lerVarios<Post>(pagina.map((l) => CHAVES.post(l.id)))
  const ordem = new Map(pagina.map((l, i) => [l.id, i]))
  posts.sort((a, b) => (ordem.get(a.id) ?? 0) - (ordem.get(b.id) ?? 0))
  return { posts: await verPosts(posts, quem), mais: candidatos.length > POR_PAGINA ? pagina[pagina.length - 1].criadoEm : null }
}

// ---------- 💪, comentários, denúncia ----------

export async function darForte(conta: ContaGuardada, id: string) {
  const post = await atualizar<Post | null>(CHAVES.post(id), null, (p) => {
    if (!p || p.oculto) return falhar(404, 'Post não encontrado.')
    return p.fortes.includes(conta.id) ? { ...p, fortes: p.fortes.filter((x) => x !== conta.id) } : { ...p, fortes: [...p.fortes, conta.id] }
  })
  const p = post as Post
  if (p.fortes.includes(conta.id) && p.autor !== conta.id && !conta.visita) {
    const n = p.fortes.length
    avisarSemFalhar(p.autor, 'forte', n > 1 ? `${conta.nome} e mais ${n - 1} deram 💪 no seu post.` : `${conta.nome} deu 💪 no seu post.`, `/rede/p/${id}`, { juntar: true })
  }
  return p
}

export const lerComentarios = (id: string) => lerJSON<Comentario[]>(CHAVES.comentarios(id), [])

export async function comentar(conta: ContaGuardada, id: string, textoBruto: unknown) {
  const texto = limparTexto(textoBruto, 400)
  if (!texto) falhar(400, 'Escreva o comentário.')
  conferirTexto(texto)
  const post = await lerPost(id)
  if (!post || post.oculto) return falhar(404, 'Post não encontrado.')
  const c: Comentario = { id: novoId(), autor: conta.id, texto, criadoEm: new Date().toISOString(), ...(conta.visita ? { visita: true } : {}) }
  await atualizar<Comentario[]>(CHAVES.comentarios(id), [], (l) => [...l, c].slice(-300))
  await atualizar<Post | null>(CHAVES.post(id), null, (p) => (p ? { ...p, comentarios: p.comentarios + 1 } : p))
  if (post.autor !== conta.id && !conta.visita) avisarSemFalhar(post.autor, 'comentario', `${conta.nome} comentou: "${texto.slice(0, 60)}"`, `/rede/p/${id}`)
  return c
}

// Os comentários vistos por alguém: sem os escondidos pela denúncia e sem os de quem experimenta
// a demonstração (cada visita só vê os dela)
export async function verComentarios(id: string, quem: string | null, bloqueios: Set<string>) {
  const lista = (await lerComentarios(id)).filter((c) => (c.autor === quem || (!c.oculto && !c.visita)) && !bloqueios.has(c.autor))
  const autores = await resumos(lista.map((c) => c.autor))
  return lista.map((c) => {
    const { denuncias: _d, ...resto } = c
    return { ...resto, autorResumo: autores.get(c.autor), meu: c.autor === quem }
  })
}

export async function apagarComentario(conta: ContaGuardada, id: string, comentario: string) {
  const post = await lerPost(id)
  await atualizar<Comentario[]>(CHAVES.comentarios(id), [], (l) => {
    const c = l.find((x) => x.id === comentario)
    if (!c) return l
    if (c.autor !== conta.id && post?.autor !== conta.id) falhar(403, 'Só quem comentou (ou o dono do post) apaga.')
    return l.filter((x) => x.id !== comentario)
  })
  await atualizar<Post | null>(CHAVES.post(id), null, (p) => (p ? { ...p, comentarios: Math.max(0, p.comentarios - 1) } : p))
}

export async function apagarPost(conta: ContaGuardada, id: string) {
  const post = await lerPost(id)
  if (!post) return
  if (post.autor !== conta.id) falhar(403, 'Só quem postou apaga.')
  await Promise.all([blobs().delete(CHAVES.post(id)), blobs().delete(CHAVES.comentarios(id))])
  await atualizar<LinhaFeed[]>(CHAVES.feed, [], (l) => l.filter((x) => x.id !== id))
  await atualizar<string[]>(CHAVES.postsDo(conta.id), [], (l) => l.filter((x) => x !== id))
  for (const m of post.marcados.filter((x) => x.tipo === 'empresa')) await atualizar<string[]>(CHAVES.postsDaEmpresa(m.id), [], (l) => l.filter((x) => x !== id))
}

export type Denuncia = { id: string; alvo: { tipo: 'post' | 'comentario' | 'perfil'; id: string; post?: string; autor: string }; de: string; motivo: string; em: string; resolvida?: boolean }

export const MOTIVOS_DENUNCIA = ['Conteúdo impróprio', 'Assédio ou ofensa', 'Golpe ou spam', 'Foto de outra pessoa sem autorização', 'Outro']

export async function denunciar(conta: ContaGuardada, alvo: Denuncia['alvo'], motivo: string) {
  if (!MOTIVOS_DENUNCIA.includes(motivo)) falhar(400, 'Escolha o motivo.')
  const d: Denuncia = { id: novoId(), alvo, de: conta.id, motivo, em: new Date().toISOString() }
  await atualizar<Denuncia[]>(CHAVES.denuncias, [], (l) => (l.some((x) => x.de === conta.id && x.alvo.id === alvo.id) ? l : [d, ...l].slice(0, 3000)))
  if (alvo.tipo === 'post') {
    const p = await atualizar<Post | null>(CHAVES.post(alvo.id), null, (x) => {
      if (!x || x.denuncias.includes(conta.id)) return x
      const denuncias = [...x.denuncias, conta.id]
      return { ...x, denuncias, ...(denuncias.length >= DENUNCIAS_PARA_OCULTAR ? { oculto: true } : {}) }
    })
    if (p?.oculto) await atualizar<LinhaFeed[]>(CHAVES.feed, [], (l) => l.map((x) => (x.id === alvo.id ? { ...x, oculto: true } : x)))
  }
  if (alvo.tipo === 'comentario' && alvo.post) {
    await atualizar<Comentario[]>(CHAVES.comentarios(alvo.post), [], (l) =>
      l.map((c) => {
        if (c.id !== alvo.id || c.denuncias?.includes(conta.id)) return c
        const denuncias = [...(c.denuncias ?? []), conta.id]
        return { ...c, denuncias, ...(denuncias.length >= DENUNCIAS_PARA_OCULTAR ? { oculto: true } : {}) }
      }),
    )
  }
  return d
}

// ---------- Seguir ----------

// Quem tem perfil público é seguido na hora; o privado recebe o pedido e aprova
export async function seguir(conta: ContaGuardada, alvo: ContaGuardada) {
  if (alvo.id === conta.id) falhar(400, 'Você não pode seguir a si mesmo.')
  if (bloqueiosDe(conta).has(alvo.id)) falhar(403, 'Não dá para seguir esta pessoa.')
  const direto = alvo.publico
  await atualizar<Seguidores>(CHAVES.seguidores(alvo.id), { aprovados: [], pedidos: [] }, (s) => {
    if (s.aprovados.includes(conta.id) || (!direto && s.pedidos.includes(conta.id))) return s
    return direto ? { ...s, aprovados: [...s.aprovados, conta.id], pedidos: s.pedidos.filter((x) => x !== conta.id) } : { ...s, pedidos: [...s.pedidos, conta.id] }
  })
  await atualizar<Seguindo>(CHAVES.seguindo(conta.id), { seguindo: [], pedidos: [] }, (s) => {
    if (s.seguindo.includes(alvo.id) || (!direto && s.pedidos.includes(alvo.id))) return s
    return direto ? { ...s, seguindo: [...s.seguindo, alvo.id] } : { ...s, pedidos: [...s.pedidos, alvo.id] }
  })
  if (!conta.visita) avisarSemFalhar(alvo.id, direto ? 'seguidor' : 'pedido-seguir', direto ? `${conta.nome} começou a seguir você.` : `${conta.nome} quer seguir você.`, direto ? `/u/${conta.usuario}` : '/rede/pedidos', { juntar: true })
  return direto ? 'seguindo' : 'pedido'
}

export async function deixarDeSeguir(conta: ContaGuardada, alvo: string) {
  await atualizar<Seguidores>(CHAVES.seguidores(alvo), { aprovados: [], pedidos: [] }, (s) => ({ aprovados: s.aprovados.filter((x) => x !== conta.id), pedidos: s.pedidos.filter((x) => x !== conta.id) }))
  await atualizar<Seguindo>(CHAVES.seguindo(conta.id), { seguindo: [], pedidos: [] }, (s) => ({ seguindo: s.seguindo.filter((x) => x !== alvo), pedidos: s.pedidos.filter((x) => x !== alvo) }))
}

export async function responderPedido(conta: ContaGuardada, quem: string, aceitar: boolean) {
  await atualizar<Seguidores>(CHAVES.seguidores(conta.id), { aprovados: [], pedidos: [] }, (s) => ({
    aprovados: aceitar && !s.aprovados.includes(quem) ? [...s.aprovados, quem] : s.aprovados,
    pedidos: s.pedidos.filter((x) => x !== quem),
  }))
  await atualizar<Seguindo>(CHAVES.seguindo(quem), { seguindo: [], pedidos: [] }, (s) => ({
    seguindo: aceitar && !s.seguindo.includes(conta.id) ? [...s.seguindo, conta.id] : s.seguindo,
    pedidos: s.pedidos.filter((x) => x !== conta.id),
  }))
  if (aceitar) avisarSemFalhar(quem, 'seguidor', `${conta.nome} aceitou o seu pedido para seguir.`, `/u/${conta.usuario}`)
}

// Trocar o perfil entre público e privado vale também para os posts antigos
export async function mudarPrivacidadeDosPosts(autor: string, publico: boolean) {
  const ids = new Set(await lerJSON<string[]>(CHAVES.postsDo(autor), []))
  if (!ids.size) return
  await atualizar<LinhaFeed[]>(CHAVES.feed, [], (l) => l.map((x) => (ids.has(x.id) ? { ...x, privado: !publico || undefined } : x)))
  for (const id of [...ids].slice(0, 200)) await atualizar<Post | null>(CHAVES.post(id), null, (p) => (p ? { ...p, privado: !publico || undefined } : p)).catch(() => null)
}

// Se um segue o outro dos dois lados (o chat entre alunos só abre assim)
export async function seguemUmAoOutro(a: string, b: string) {
  const [sa, sb] = await Promise.all([lerSeguindo(a), lerSeguindo(b)])
  return sa.seguindo.includes(b) && sb.seguindo.includes(a)
}
