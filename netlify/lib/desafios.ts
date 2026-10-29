import { aberto, novoParticipante, PONTUACOES, ranking, somarTreino } from '../../src/shared/desafio.ts'
import { alunoMais, nivelEmpresa, nivelProfissional } from '../../src/shared/planos.ts'
import { DATA, dataDe, diasEntre, hoje } from '../../src/shared/tempo.ts'
import { limpar, limparTexto } from '../../src/shared/texto.ts'
import type { Desafio, Pontuacao, Treino } from '../../src/shared/tipos.ts'
import type { ContaGuardada } from './auth.ts'
import { avisarSemFalhar } from './avisos.ts'
import { lerConta } from './contas.ts'
import { lerEmpresa, papelNa, PODE } from './empresas.ts'
import { falhar, type Corpo } from './http.ts'
import { lerPlataforma } from './plataforma.ts'
import { lerProfissional } from './profissionais.ts'
import { atualizar, blobs, CHAVES, criarSeNovo, lerJSON, lerVarios, novoCodigo, novoId } from './store.ts'

// Os desafios (seção 16 do estudo): qualquer um cria (o grátis, um por vez); a academia e o personal
// premium criam os oficiais. Entra-se pelo código (ou pela página, quando é público). Os treinos
// somam sozinhos em todos os desafios abertos da pessoa.

export type LinhaDesafio = Pick<Desafio, 'id' | 'nome' | 'inicio' | 'fim' | 'pontuacao' | 'publico' | 'oficial' | 'codigo'> & { participantes: number; demo?: boolean }

export const lerDesafio = (id: string) => lerJSON<Desafio | null>(CHAVES.desafio(id), null)

const linha = (d: Desafio): LinhaDesafio => ({
  id: d.id,
  nome: d.nome,
  inicio: d.inicio,
  fim: d.fim,
  pontuacao: d.pontuacao,
  publico: d.publico,
  ...(d.oficial ? { oficial: d.oficial } : {}),
  codigo: d.codigo,
  participantes: Object.keys(d.participantes).length,
  ...(d.demo ? { demo: true } : {}),
})

async function indexar(d: Desafio) {
  await atualizar<LinhaDesafio[]>(CHAVES.desafios, [], (l) => [linha(d), ...l.filter((x) => x.id !== d.id)].slice(0, 3000))
}

export async function criarDesafio(conta: ContaGuardada, corpo: Corpo) {
  const nome = limpar(corpo.nome, 60)
  if (nome.length < 3) falhar(400, 'Dê um nome para o desafio.')
  const inicio = typeof corpo.inicio === 'string' && DATA.test(corpo.inicio) ? corpo.inicio : hoje()
  const fim = typeof corpo.fim === 'string' && DATA.test(corpo.fim) ? corpo.fim : ''
  if (!fim || diasEntre(inicio, fim) < 1) falhar(400, 'O desafio precisa de pelo menos 2 dias.')
  if (diasEntre(inicio, fim) > 120) falhar(400, 'O desafio dura no máximo 120 dias.')
  if (diasEntre(hoje(), inicio) > 60) falhar(400, 'O desafio começa em até 60 dias.')
  const pontuacao: Pontuacao = (corpo.pontuacao as Pontuacao) in PONTUACOES ? (corpo.pontuacao as Pontuacao) : 'dias'

  // o oficial leva o nome da academia (dono, gerente ou professor) ou do personal premium
  let oficial: Desafio['oficial']
  const o = (corpo.oficial ?? null) as { tipo?: string; id?: string } | null
  if (o?.tipo === 'empresa' && typeof o.id === 'string') {
    const e = await lerEmpresa(o.id)
    const papel = e ? papelNa(e, conta.id) : null
    if (!e || !papel || !PODE.treinar.includes(papel)) falhar(403, 'Só a equipe da academia cria o desafio oficial dela.')
    if (nivelEmpresa(e!) !== 'premium') falhar(402, 'Os desafios oficiais são do plano Premium da academia.')
    oficial = { tipo: 'empresa', id: e!.slug, nome: e!.nome }
  } else if (o?.tipo === 'profissional') {
    const p = await lerProfissional(conta.id)
    if (!p?.personal) falhar(403, 'Só o personal cria o desafio oficial dele.')
    if (nivelProfissional(p!) !== 'premium') falhar(402, 'Os desafios para os alunos são do plano Premium do personal.')
    oficial = { tipo: 'profissional', id: p!.id, nome: p!.nome }
  } else if (!alunoMais(conta)) {
    // o grátis cria um desafio por vez (os que ainda não acabaram)
    const config = await lerPlataforma()
    const meus = (await lerJSON<string[]>(CHAVES.desafiosDo(conta.id), [])).slice(0, 60)
    const criados = (await lerVarios<Desafio>(meus.map((id) => CHAVES.desafio(id)))).filter((d) => d.criador === conta.id && !d.oficial && d.fim >= hoje())
    if (criados.length >= config.limites.desafiosGratis) falhar(402, 'No plano grátis dá para criar um desafio por vez. Com o Turma+, quantos quiser.')
  }

  const premio = alunoMais(conta) || oficial ? limpar(corpo.premio, 80) : ''
  const descricao = limparTexto(corpo.descricao, 400)
  const id = novoId()
  let codigo = ''
  for (let i = 0; i < 8 && !codigo; i++) {
    const c = novoCodigo(6)
    if (await criarSeNovo(CHAVES.codigoDesafio(c), { id })) codigo = c
  }
  if (!codigo) falhar(500, 'Não deu para criar o código do desafio. Tente de novo.')
  const d: Desafio = {
    id,
    nome,
    ...(descricao ? { descricao } : {}),
    criador: conta.id,
    ...(oficial ? { oficial } : {}),
    inicio,
    fim,
    pontuacao,
    codigo,
    publico: corpo.publico === true || !!oficial,
    ...(premio ? { premio } : {}),
    participantes: { [conta.id]: novoParticipante(conta.nome) },
    criadoEm: new Date().toISOString(),
    ...(conta.demo || conta.visita ? { demo: true } : {}),
  }
  await blobs().setJSON(CHAVES.desafio(id), d)
  await atualizar<string[]>(CHAVES.desafiosDo(conta.id), [], (l) => [id, ...l.filter((x) => x !== id)].slice(0, 100))
  if (!conta.visita) await indexar(d)
  return d
}

export async function entrarNoDesafio(conta: ContaGuardada, chave: { id?: string; codigo?: string }) {
  let id = chave.id
  if (!id && chave.codigo) id = (await lerJSON<{ id: string } | null>(CHAVES.codigoDesafio(chave.codigo.toUpperCase().trim()), null))?.id
  if (!id) return falhar(404, 'Desafio não encontrado. Confira o código.')
  const d = await atualizar<Desafio | null>(CHAVES.desafio(id), null, (x) => {
    if (!x) return falhar(404, 'Desafio não encontrado.')
    if (x.fim < hoje()) falhar(410, 'Este desafio já acabou.')
    if (x.participantes[conta.id]) return x
    if (Object.keys(x.participantes).length >= 500) falhar(409, 'O desafio está cheio (500 pessoas).')
    return { ...x, participantes: { ...x.participantes, [conta.id]: novoParticipante(conta.nome) } }
  })
  await atualizar<string[]>(CHAVES.desafiosDo(conta.id), [], (l) => (l.includes(id!) ? l : [id!, ...l].slice(0, 100)))
  if (d && !d.demo) await indexar(d)
  if (d && d.criador !== conta.id) avisarSemFalhar(d.criador, 'desafio', `${conta.nome} entrou no desafio ${d.nome}.`, `/desafios/${d.id}`, { juntar: true })
  return d as Desafio
}

export async function sairDoDesafio(conta: ContaGuardada, id: string) {
  const d = await atualizar<Desafio | null>(CHAVES.desafio(id), null, (x) => {
    if (!x || !x.participantes[conta.id]) return x
    const { [conta.id]: _sai, ...resto } = x.participantes
    return { ...x, participantes: resto }
  })
  await atualizar<string[]>(CHAVES.desafiosDo(conta.id), [], (l) => l.filter((x) => x !== id))
  if (d && !d.demo) await indexar(d)
}

// O treino soma nos desafios abertos (sem falhar o registro do treino)
export async function somarTreinoNosDesafios(conta: ContaGuardada, t: Treino) {
  const ids = await lerJSON<string[]>(CHAVES.desafiosDo(conta.id), [])
  const dia = dataDe(t.inicio)
  for (const id of ids.slice(0, 30)) {
    try {
      await atualizar<Desafio | null>(CHAVES.desafio(id), null, (d) => {
        if (!d || !aberto(d, dia)) return d
        const p = d.participantes[conta.id]
        if (!p) return d
        const novo = somarTreino(p, d.pontuacao, { dia, minutos: t.duracaoMin, em: t.inicio })
        return novo === p ? d : { ...d, participantes: { ...d.participantes, [conta.id]: novo } }
      })
    } catch (e) {
      console.error('Desafio não somado', id, e instanceof Error ? e.message : e)
    }
  }
}

// O desafio com o ranking (os nomes e as fotos de agora). Quem experimenta a demonstração só se vê.
export async function desafioComRanking(d: Desafio, quem: string | null) {
  const todos = await Promise.all(Object.keys(d.participantes).slice(0, 500).map((id) => lerConta(id)))
  const contas = todos.filter((c) => c && (!c.visita || c.id === quem))
  const ids = contas.map((c) => c!.id)
  const visiveis = new Set(ids)
  d = { ...d, participantes: Object.fromEntries(Object.entries(d.participantes).filter(([id]) => visiveis.has(id))) }
  const mais = new Set(contas.filter((c) => c && alunoMais(c)).map((c) => c!.id))
  const fotos = new Map(contas.filter((c) => c?.foto).map((c) => [c!.id, c!.foto!]))
  const usuarios = new Map(contas.filter(Boolean).map((c) => [c!.id, c!.usuario]))
  const r = ranking(d, (id) => mais.has(id)).map((p, i) => ({ posicao: i + 1, id: p.id, nome: p.nome, usuario: usuarios.get(p.id) ?? '', foto: fotos.get(p.id), mais: mais.has(p.id), pontos: p.pontos, dias: p.dias.length, checkins: p.checkins, minutos: p.minutos }))
  const { participantes: _p, ...resto } = d
  return { ...resto, ranking: r, total: ids.length, participo: !!quem && visiveis.has(quem) }
}

// As contas de quem experimenta a demonstração só veem a si mesmas no ranking e na contagem
const semOutrasVisitas = (d: Desafio, quem: string): Desafio => ({ ...d, participantes: Object.fromEntries(Object.entries(d.participantes).filter(([id]) => !id.startsWith('demovisita') || id === quem)) })

export async function desafiosDe(conta: string) {
  const ids = await lerJSON<string[]>(CHAVES.desafiosDo(conta), [])
  const lista = (await lerVarios<Desafio>(ids.slice(0, 40).map((id) => CHAVES.desafio(id)))).map((d) => semOutrasVisitas(d, conta))
  return lista.map((d) => {
    const r = ranking(d)
    const pos = r.findIndex((p) => p.id === conta)
    return { ...linha(d), posicao: pos + 1, pontos: pos >= 0 ? r[pos].pontos : 0, lider: r[0] ? { nome: r[0].nome, pontos: r[0].pontos } : undefined }
  })
}

// Os desafios públicos abertos (a academia e o personal da região, e os de quem a pessoa segue)
export async function desafiosPublicos(filtro: (d: LinhaDesafio) => boolean = () => true) {
  const dia = hoje()
  return (await lerJSON<LinhaDesafio[]>(CHAVES.desafios, [])).filter((d) => d.publico && d.fim >= dia && filtro(d)).slice(0, 30)
}
