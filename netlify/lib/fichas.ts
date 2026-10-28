import { copiarDivisoes, limparCabecalho, limparDivisoes, MAX_DIVISOES, previsaoPadrao, situacao } from '../../src/shared/ficha.ts'
import { alunoMais } from '../../src/shared/planos.ts'
import { hoje } from '../../src/shared/tempo.ts'
import { limpar, limparTexto } from '../../src/shared/texto.ts'
import type { ResumoFicha } from '../../src/shared/respostas.ts'
import type { ContextoFicha, ExercicioProprio, Ficha, ModeloFicha } from '../../src/shared/tipos.ts'
import type { ContaGuardada } from './auth.ts'
import { avisarSemFalhar } from './avisos.ts'
import { lerConta } from './contas.ts'
import { lerEmpresa, nomeDaUnidade, papelNa, PODE } from './empresas.ts'
import { falhar, type Corpo } from './http.ts'
import { lerPlataforma } from './plataforma.ts'
import { lerProfissional, recontar, type FichaResumo } from './profissionais.ts'
import { atualizar, blobs, CHAVES, lerJSON, lerVarios, novoId } from './store.ts'
import { lerVinculos, mudarAlunoDoPainel, vinculoAtivo } from './vinculos.ts'

// As fichas de treino (seção 9 do estudo). Cada ficha é um documento; o aluno, o profissional e a
// academia guardam a lista com o resumo (para o painel e o "vencendo" sem abrir cada uma).

export type ResumoDoAluno = ResumoFicha

export const lerFicha = (id: string) => lerJSON<Ficha | null>(CHAVES.ficha(id), null)

const resumoDoAluno = (f: Ficha): ResumoDoAluno => ({
  id: f.id,
  titulo: f.titulo,
  autor: f.autor,
  autorNome: f.autorNome,
  contexto: f.contexto,
  status: f.status,
  inicio: f.inicio,
  previsao: f.previsao,
  atualizadaEm: f.atualizadaEm,
  ...(f.publicadaEm ? { publicadaEm: f.publicadaEm } : {}),
  ...(f.vistaEm ? { vistaEm: f.vistaEm } : {}),
  divisoes: f.divisoes.length,
})

const resumoDoPainel = (f: Ficha, alunoNome: string): FichaResumo => ({
  id: f.id,
  aluno: f.aluno,
  alunoNome,
  titulo: f.titulo,
  status: f.status,
  previsao: f.previsao,
  inicio: f.inicio,
  contexto: f.contexto,
  atualizadaEm: f.atualizadaEm,
  ...(f.modelo ? { modelo: f.modelo } : {}),
})

// O nome de quem montou, como o aluno vê ("Rafael Moreira" ou "Diego · Força Total")
async function nomeDoContexto(c: ContextoFicha) {
  if (c.tipo === 'empresa') {
    const e = await lerEmpresa(c.id)
    return e ? nomeDaUnidade(e, c.unidade) : ''
  }
  if (c.tipo === 'profissional') return (await lerProfissional(c.id))?.nome ?? ''
  return ''
}

// Quem pode montar ficha para quem: o aluno para ele mesmo (com o limite do plano grátis), o personal
// para os alunos dele e o professor (ou o dono e o gerente) para os alunos ativos da academia
export async function conferirAutoria(autor: ContaGuardada, aluno: string, contexto: ContextoFicha) {
  if (contexto.tipo === 'propria') {
    if (aluno !== autor.id) falhar(403, 'A ficha própria é só para você.')
    return
  }
  const vinculos = await lerVinculos(aluno)
  if (contexto.tipo === 'profissional') {
    if (contexto.id !== autor.id) falhar(403, 'Só o próprio personal monta fichas no nome dele.')
    if (!vinculoAtivo(vinculos, contexto)) falhar(403, 'Esta pessoa não é sua aluna.')
    return
  }
  const e = await lerEmpresa(contexto.id)
  const papel = e ? papelNa(e, autor.id) : null
  if (!papel || !PODE.treinar.includes(papel)) falhar(403, 'Você não é professor desta academia.')
  if (!vinculoAtivo(vinculos, contexto)) falhar(403, 'Esta pessoa não é aluna ativa desta academia.')
}

async function exerciciosProprios(autor: string) {
  return lerJSON<ExercicioProprio[]>(CHAVES.exerciciosProprios(autor), [])
}

// Os exercícios próprios usados numa ficha (para o aluno ver o nome, o vídeo e o 3D emprestado)
export async function propriosDaFicha(f: Ficha) {
  const ids = new Set(f.divisoes.flatMap((d) => d.itens.map((i) => i.exercicio)).filter((x) => x.startsWith('p-')))
  if (!ids.size) return []
  return (await exerciciosProprios(f.autor)).filter((x) => ids.has(x.id))
}

// O limite do plano grátis: uma ficha própria ativa, com até 4 divisões
async function conferirLimiteProprio(conta: ContaGuardada, fichaId: string | undefined, divisoes: number) {
  if (alunoMais(conta)) return
  const config = await lerPlataforma()
  if (divisoes > config.limites.divisoesProprias) falhar(402, `No plano grátis a sua ficha tem até ${config.limites.divisoesProprias} divisões. Com o Turma+ não tem limite.`)
  const lista = await lerJSON<ResumoDoAluno[]>(CHAVES.fichasDo(conta.id), [])
  const ativas = lista.filter((f) => f.contexto.tipo === 'propria' && f.status !== 'arquivada' && f.id !== fichaId)
  if (ativas.length >= config.limites.fichasProprias) falhar(402, 'No plano grátis cabe uma ficha sua ativa. Arquive a outra ou assine o Turma+ para ter quantas quiser.')
}

export async function salvarFicha(autor: ContaGuardada, corpo: Corpo): Promise<Ficha> {
  const aluno = typeof corpo.aluno === 'string' && corpo.aluno ? corpo.aluno : autor.id
  const c = (corpo.contexto ?? { tipo: 'propria' }) as Record<string, unknown>
  const contexto: ContextoFicha =
    c.tipo === 'empresa' && typeof c.id === 'string'
      ? { tipo: 'empresa', id: c.id, ...(typeof c.unidade === 'string' ? { unidade: c.unidade } : {}) }
      : c.tipo === 'profissional'
        ? { tipo: 'profissional', id: autor.id }
        : { tipo: 'propria' }
  await conferirAutoria(autor, aluno, contexto)
  const proprios = new Set((await exerciciosProprios(autor.id)).map((x) => x.id))
  const divisoes = limparDivisoes(corpo.divisoes, proprios)
  if (!divisoes.length || divisoes.every((d) => !d.itens.length)) falhar(400, 'Coloque pelo menos um exercício na ficha.')
  const cab = limparCabecalho(corpo)
  if (!cab.titulo) falhar(400, 'Dê um nome para a ficha.')
  const id = typeof corpo.id === 'string' && corpo.id ? corpo.id : undefined
  const publicar = corpo.publicar !== false
  if (contexto.tipo === 'propria') await conferirLimiteProprio(autor, id, divisoes.length)

  const agora = new Date().toISOString()
  const anterior = id ? await lerFicha(id) : null
  if (id && !anterior) falhar(404, 'Ficha não encontrada.')
  if (anterior && anterior.autor !== autor.id) falhar(403, 'Só quem montou a ficha pode mudar.')
  if (anterior && anterior.aluno !== aluno) falhar(400, 'A ficha é de outro aluno. Use "usar em outro aluno".')
  const modelo = typeof corpo.modelo === 'string' ? corpo.modelo : anterior?.modelo
  const ficha: Ficha = {
    id: anterior?.id ?? novoId(),
    aluno,
    autor: autor.id,
    autorNome: autor.nome,
    contexto,
    titulo: cab.titulo,
    ...(cab.objetivo ? { objetivo: cab.objetivo } : {}),
    inicio: cab.inicio,
    previsao: cab.previsao,
    ...(cab.online ? { online: true } : {}),
    divisoes,
    ...(cab.obs ? { obs: cab.obs } : {}),
    status: publicar ? 'ativa' : anterior?.status === 'ativa' ? 'ativa' : 'rascunho',
    ...(modelo ? { modelo } : {}),
    criadaEm: anterior?.criadaEm ?? agora,
    atualizadaEm: agora,
    ...(anterior?.publicadaEm || publicar ? { publicadaEm: anterior?.publicadaEm ?? agora } : {}),
    ...(anterior?.vistaEm && !publicar ? { vistaEm: anterior.vistaEm } : {}),
  }
  await blobs().setJSON(CHAVES.ficha(ficha.id), ficha)
  const novaPublicacao = ficha.status === 'ativa' && anterior?.status !== 'ativa'
  await indexar(ficha, { substituir: novaPublicacao })

  if (ficha.status === 'ativa' && contexto.tipo !== 'propria') {
    const nome = await nomeDoContexto(contexto)
    if (novaPublicacao) avisarSemFalhar(aluno, 'ficha', `Ficha nova: ${ficha.titulo}, de ${autor.nome}${contexto.tipo === 'empresa' ? ` (${nome})` : ''}.`, `/fichas/${ficha.id}`)
    else if (anterior) avisarSemFalhar(aluno, 'ficha', `${autor.nome} atualizou a sua ficha ${ficha.titulo}.`, `/fichas/${ficha.id}`, { juntar: true })
  }
  if (contexto.tipo !== 'propria') await recontar(autor.id)
  return ficha
}

// Atualiza as listas (do aluno, do profissional, da academia) e o resumo do aluno no painel. Uma
// ficha nova publicada arquiva a anterior do mesmo lugar (o aluno fica com uma ficha por contexto).
async function indexar(f: Ficha, { substituir = false } = {}) {
  const aluno = await lerConta(f.aluno)
  const alunoNome = aluno?.nome ?? 'Aluno'
  const arquivadas: string[] = []
  await atualizar<ResumoDoAluno[]>(CHAVES.fichasDo(f.aluno), [], (lista) => {
    const mesmas = (x: ResumoDoAluno) => x.id !== f.id && x.status === 'ativa' && x.contexto.tipo === f.contexto.tipo && ('id' in x.contexto ? x.contexto.id : '') === ('id' in f.contexto ? f.contexto.id : '')
    const nova = lista.filter((x) => x.id !== f.id).map((x) => {
      if (substituir && f.contexto.tipo !== 'propria' && mesmas(x)) {
        arquivadas.push(x.id)
        return { ...x, status: 'arquivada' as const }
      }
      return x
    })
    return [resumoDoAluno(f), ...nova].slice(0, 200)
  })
  for (const id of arquivadas) await atualizar<Ficha | null>(CHAVES.ficha(id), null, (x) => (x ? { ...x, status: 'arquivada' } : x))

  if (f.contexto.tipo !== 'propria') {
    const linha = resumoDoPainel(f, alunoNome)
    const arquivar = (l: FichaResumo[]) => l.map((x) => (arquivadas.includes(x.id) ? { ...x, status: 'arquivada' as const } : x))
    await atualizar<FichaResumo[]>(CHAVES.fichasDoProfissional(f.autor), [], (l) => [linha, ...arquivar(l.filter((x) => x.id !== f.id))].slice(0, 2000))
    if (f.contexto.tipo === 'empresa') await atualizar<FichaResumo[]>(CHAVES.fichasDaEmpresa(f.contexto.id), [], (l) => [linha, ...arquivar(l.filter((x) => x.id !== f.id))].slice(0, 5000))
    if (f.status === 'ativa') {
      const alvo = f.contexto.tipo === 'empresa' ? { tipo: 'empresa' as const, id: f.contexto.id } : { tipo: 'profissional' as const, id: f.autor }
      await mudarAlunoDoPainel(alvo, f.aluno, (a) => ({ ...a, fichaAtual: { id: f.id, titulo: f.titulo, previsao: f.previsao }, ...(f.contexto.tipo === 'empresa' ? { responsavel: f.autor } : {}) }))
    }
  }
}

// Ler: o aluno, quem montou, o personal ou os professores da academia do aluno
export async function podeLer(conta: ContaGuardada, f: Ficha) {
  if (f.aluno === conta.id || f.autor === conta.id) return true
  if (f.contexto.tipo === 'empresa') {
    const e = await lerEmpresa(f.contexto.id)
    const papel = e ? papelNa(e, conta.id) : null
    return !!papel && PODE.treinar.includes(papel)
  }
  return false
}

export async function marcarVista(f: Ficha) {
  if (f.vistaEm || f.status !== 'ativa') return f
  const agora = new Date().toISOString()
  const nova = await atualizar<Ficha | null>(CHAVES.ficha(f.id), null, (x) => (x && !x.vistaEm ? { ...x, vistaEm: agora } : x))
  await atualizar<ResumoDoAluno[]>(CHAVES.fichasDo(f.aluno), [], (l) => (l.some((x) => x.id === f.id && !x.vistaEm) ? l.map((x) => (x.id === f.id ? { ...x, vistaEm: agora } : x)) : l))
  return nova ?? f
}

export async function arquivar(conta: ContaGuardada, id: string) {
  const f = await lerFicha(id)
  if (!f) return falhar(404, 'Ficha não encontrada.')
  if (f.autor !== conta.id && !(f.contexto.tipo === 'propria' && f.aluno === conta.id)) falhar(403, 'Só quem montou a ficha pode arquivar.')
  const nova = { ...f, status: 'arquivada' as const, atualizadaEm: new Date().toISOString() }
  await blobs().setJSON(CHAVES.ficha(id), nova)
  await indexar(nova)
  return nova
}

// "Usar em outro aluno": a mesma ficha, com as datas a partir de hoje, no grupo dos "treinos iguais"
export async function copiarPara(autor: ContaGuardada, id: string, aluno: string, contexto?: ContextoFicha) {
  const f = await lerFicha(id)
  if (!f) return falhar(404, 'Ficha não encontrada.')
  if (!(await podeLer(autor, f))) falhar(403, 'Você não pode copiar esta ficha.')
  const inicio = hoje()
  return salvarFicha(autor, {
    aluno,
    contexto: contexto ?? f.contexto,
    titulo: f.titulo,
    objetivo: f.objetivo,
    online: f.online,
    inicio,
    previsao: previsaoPadrao(inicio, f.online),
    obs: f.obs,
    divisoes: copiarDivisoes(f.divisoes),
    modelo: f.modelo ?? f.id,
    publicar: true,
  })
}

// Os "treinos iguais": as fichas do mesmo grupo (do mesmo modelo, ou copiadas da mesma)
export async function treinosIguais(autor: string, f: Ficha) {
  const grupo = f.modelo ?? f.id
  const lista = await lerJSON<FichaResumo[]>(CHAVES.fichasDoProfissional(autor), [])
  return lista.filter((x) => x.id !== f.id && (x.modelo === grupo || x.id === grupo) && x.status !== 'rascunho')
}

// ---------- Modelos ----------

export const lerModelos = (autor: string) => lerJSON<ModeloFicha[]>(CHAVES.modelos(autor), [])

export async function salvarModelo(autor: ContaGuardada, corpo: Corpo) {
  const proprios = new Set((await exerciciosProprios(autor.id)).map((x) => x.id))
  const divisoes = limparDivisoes(corpo.divisoes, proprios)
  const titulo = limpar(corpo.titulo, 60)
  if (!titulo || !divisoes.length) falhar(400, 'O modelo precisa de um nome e de pelo menos uma divisão.')
  const id = typeof corpo.id === 'string' && corpo.id ? corpo.id : novoId()
  const semanas = Math.min(26, Math.max(1, Math.round(Number(corpo.semanas) || 6)))
  const objetivo = limpar(corpo.objetivo, 40)
  const obs = limparTexto(corpo.obs, 600)
  let salvo: ModeloFicha | undefined
  await atualizar<ModeloFicha[]>(CHAVES.modelos(autor.id), [], (l) => {
    const atual = l.find((m) => m.id === id)
    salvo = { id, autor: autor.id, titulo, ...(objetivo ? { objetivo } : {}), semanas, divisoes: divisoes.slice(0, MAX_DIVISOES), ...(obs ? { obs } : {}), usos: atual?.usos ?? 0, criadoEm: atual?.criadoEm ?? new Date().toISOString() }
    return [salvo, ...l.filter((m) => m.id !== id)].slice(0, 200)
  })
  return salvo!
}

export async function apagarModelo(autor: string, id: string) {
  await atualizar<ModeloFicha[]>(CHAVES.modelos(autor), [], (l) => (l.some((m) => m.id === id) ? l.filter((m) => m.id !== id) : l))
}

export async function somarUsoDoModelo(autor: string, id: string) {
  await atualizar<ModeloFicha[]>(CHAVES.modelos(autor), [], (l) => (l.some((m) => m.id === id) ? l.map((m) => (m.id === id ? { ...m, usos: m.usos + 1 } : m)) : l))
}

// ---------- Exercícios próprios ----------

export const lerExerciciosProprios = exerciciosProprios

export async function salvarExercicioProprio(autor: ContaGuardada, corpo: Corpo) {
  const nome = limpar(corpo.nome, 60)
  if (nome.length < 3) falhar(400, 'Dê um nome para o exercício.')
  const grupo = limpar(corpo.grupo, 20) || 'funcional'
  const base = typeof corpo.base === 'string' ? corpo.base : undefined
  const video = typeof corpo.video === 'string' && /^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|instagram\.com)\//.test(corpo.video) ? corpo.video : undefined
  const instrucoes = limparTexto(corpo.instrucoes, 800)
  const equipamento = limpar(corpo.equipamento, 40)
  const id = typeof corpo.id === 'string' && corpo.id.startsWith('p-') ? corpo.id : `p-${novoId()}`
  const ex: ExercicioProprio = { id, autor: autor.id, nome, grupo, ...(base ? { base } : {}), ...(equipamento ? { equipamento } : {}), ...(video ? { video } : {}), ...(instrucoes ? { instrucoes } : {}), criadoEm: new Date().toISOString() }
  await atualizar<ExercicioProprio[]>(CHAVES.exerciciosProprios(autor.id), [], (l) => [ex, ...l.filter((x) => x.id !== id)].slice(0, 300))
  return ex
}

// ---------- As listas do painel ----------

export async function fichasVencendo(autor: string) {
  const lista = await lerJSON<FichaResumo[]>(CHAVES.fichasDoProfissional(autor), [])
  const dia = hoje()
  return lista.filter((f) => f.status === 'ativa' && ['vencendo', 'vencida'].includes(situacao(f, dia))).sort((a, b) => a.previsao.localeCompare(b.previsao))
}

export async function fichasDoAluno(aluno: string) {
  return lerJSON<ResumoDoAluno[]>(CHAVES.fichasDo(aluno), [])
}

export async function fichasCompletas(ids: string[]) {
  return lerVarios<Ficha>(ids.map((id) => CHAVES.ficha(id)))
}
