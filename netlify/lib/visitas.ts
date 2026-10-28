import type { Desafio, Ficha, FolhaDoDia, Medida } from '../../src/shared/tipos.ts'
import type { LinhaConversa, ReservaDoAluno, ResumoFicha } from '../../src/shared/respostas.ts'
import type { ContaGuardada } from './auth.ts'
import type { LinhaFeed, Seguidores, Seguindo } from './rede.ts'
import { apagarPorPrefixo, atualizar, blobs, CHAVES, emParalelo, lerJSON } from './store.ts'

// Quem experimenta como aluno ganha uma conta nova a cada visita (a cópia da Ana). Um dia depois, a
// visita some com tudo o que criou: as fichas, os treinos, as medidas, os posts, as reservas, os
// desafios e as conversas. Assim a demonstração não acumula o que cada visita fez.

export type Visita = { id: string; em: number }

const DURACAO = 24 * 3_600_000
const DE_TEMPOS_EM_TEMPOS = 10 * 60_000
const POR_VEZ = 15

export async function anotarVisita(id: string, agora = Date.now()) {
  await atualizar<Visita[]>(CHAVES.visitas, [], (l) => [...l, { id, em: agora }].slice(-20_000))
}

// No máximo a cada 10 minutos, apaga as visitas de mais de um dia
export async function limparVisitas(agora = Date.now()) {
  const b = blobs()
  const marca = await b.getWithMetadata(CHAVES.limpezaVisitas, { type: 'json' })
  const ultima = (marca?.data as { em: number } | undefined)?.em ?? 0
  if (agora - ultima < DE_TEMPOS_EM_TEMPOS) return 0
  const pegou = marca ? await b.setJSON(CHAVES.limpezaVisitas, { em: agora }, { onlyIfMatch: marca.etag! }) : await b.setJSON(CHAVES.limpezaVisitas, { em: agora }, { onlyIfNew: true })
  if (!pegou.modified) return 0
  const vencidas = (await lerJSON<Visita[]>(CHAVES.visitas, [])).filter((v) => agora - v.em > DURACAO).slice(0, POR_VEZ)
  for (const v of vencidas) await apagarVisita(v.id).catch((e) => console.error('Demonstração: não deu para apagar a visita.', v.id, e instanceof Error ? e.message : e))
  const ids = new Set(vencidas.map((v) => v.id))
  if (ids.size) await atualizar<Visita[]>(CHAVES.visitas, [], (l) => l.filter((v) => !ids.has(v.id)))
  return ids.size
}

export async function apagarVisita(id: string) {
  if (!id.startsWith('demovisita')) throw new Error('Só as contas de visita da demonstração são apagadas sozinhas.')
  const conta = await lerJSON<ContaGuardada | null>(CHAVES.conta(id), null)
  const [fichas, medidas, reservas, desafios, posts, seguindo, conversas] = await Promise.all([
    lerJSON<ResumoFicha[]>(CHAVES.fichasDo(id), []),
    lerJSON<Medida[]>(CHAVES.medidas(id), []),
    lerJSON<ReservaDoAluno[]>(CHAVES.reservasDo(id), []),
    lerJSON<string[]>(CHAVES.desafiosDo(id), []),
    lerJSON<string[]>(CHAVES.postsDo(id), []),
    lerJSON<Seguindo>(CHAVES.seguindo(id), { seguindo: [], pedidos: [] }),
    lerJSON<LinhaConversa[]>(CHAVES.conversasDo(`conta:${id}`), []),
  ])

  // as fichas (só as dela: as cópias), as fotos das medidas, os posts com os comentários e as conversas
  const fichasDela = (await Promise.all(fichas.map((f) => lerJSON<Ficha | null>(CHAVES.ficha(f.id), null)))).filter((f): f is Ficha => !!f && f.aluno === id).map((f) => f.id)
  await emParalelo(
    [...fichasDela.map((f) => CHAVES.ficha(f)), ...medidas.flatMap((m) => m.fotos.map((f) => CHAVES.midia(f))), ...posts.flatMap((p) => [CHAVES.post(p), CHAVES.comentarios(p)]), ...conversas.map((c) => CHAVES.conversa(c.id))],
    (chave) => blobs().delete(chave),
    16,
  )
  if (posts.length) {
    const fora = new Set(posts)
    await atualizar<LinhaFeed[]>(CHAVES.feed, [], (l) => (l.some((x) => fora.has(x.id)) ? l.filter((x) => !fora.has(x.id)) : l))
  }

  // as reservas nas aulas, os desafios e quem ela seguiu
  for (const r of reservas) {
    await atualizar<FolhaDoDia>(CHAVES.folha(r.empresa, r.unidade, r.data), {}, (f) => {
      const s = f[r.aula]
      if (!s || (!s.reservas.some((x) => x.conta === id) && !s.espera.some((x) => x.conta === id))) return f
      return { ...f, [r.aula]: { ...s, reservas: s.reservas.filter((x) => x.conta !== id), espera: s.espera.filter((x) => x.conta !== id) } }
    }).catch(() => null)
  }
  for (const d of desafios) {
    await atualizar<Desafio | null>(CHAVES.desafio(d), null, (x) => {
      if (!x?.participantes[id]) return x
      const { [id]: _sai, ...resto } = x.participantes
      return { ...x, participantes: resto }
    }).catch(() => null)
  }
  for (const outro of [...seguindo.seguindo, ...seguindo.pedidos]) {
    await atualizar<Seguidores>(CHAVES.seguidores(outro), { aprovados: [], pedidos: [] }, (s) => (s.aprovados.includes(id) || s.pedidos.includes(id) ? { aprovados: s.aprovados.filter((x) => x !== id), pedidos: s.pedidos.filter((x) => x !== id) } : s)).catch(() => null)
  }

  // por fim, a conta e as listas dela
  await Promise.all([
    blobs().delete(CHAVES.conta(id)),
    conta ? blobs().delete(CHAVES.usuario(conta.usuario)) : null,
    ...['vinculos', 'fichasDo', 'medidas', 'avisos', 'seguindo', 'seguidores', 'lugares', 'postsDo', 'sessoesDo', 'reservasDo', 'desafiosDo'].map((k) => blobs().delete((CHAVES[k as 'vinculos'] as (x: string) => string)(id))),
    blobs().delete(CHAVES.conversasDo(`conta:${id}`)),
    apagarPorPrefixo(`contas/treinos/${id}/`),
  ])
}
