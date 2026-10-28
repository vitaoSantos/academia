import { EXERCICIO } from '../../src/shared/exercicios.ts'
import { nomeModalidade } from '../../src/shared/modalidades.ts'
import { alunoMais } from '../../src/shared/planos.ts'
import { dataDe, hoje, inicioDaSemana, somarDias } from '../../src/shared/tempo.ts'
import { limpar } from '../../src/shared/texto.ts'
import { limparExercicioFeito, melhoresDe, recordes, seriesFeitas, sequencia, volume } from '../../src/shared/treino.ts'
import type { ExercicioProprio, Treino } from '../../src/shared/tipos.ts'
import type { ContaGuardada } from './auth.ts'
import { somarTreinoNosDesafios } from './desafios.ts'
import { somarNoDia } from './estatisticas.ts'
import { lerEmpresa, nomeDaUnidade } from './empresas.ts'
import { lerFicha } from './fichas.ts'
import { falhar, type Corpo } from './http.ts'
import { lerPlataforma } from './plataforma.ts'
import { somarTreinoAcompanhado } from './profissionais.ts'
import { atualizar, CHAVES, lerJSON, novoId } from './store.ts'
import { lerVinculos, mudarAlunoDoPainel } from './vinculos.ts'

// Os treinos feitos (seção 10 do estudo): uma lista por pessoa por ano. O treino ao vivo fica no
// aparelho e chega aqui no fim (mesmo horas depois, quando a internet volta).

const anoDe = (iso: string) => iso.slice(0, 4)

export async function treinosDe(conta: string, anos = 2) {
  const ano = Number(anoDe(new Date().toISOString()))
  const listas = await Promise.all(Array.from({ length: anos }, (_, i) => lerJSON<Treino[]>(CHAVES.treinosDo(conta, String(ano - i)), [])))
  return listas.flat().sort((a, b) => b.inicio.localeCompare(a.inicio))
}

// O plano grátis vê os últimos 90 dias no histórico e nos gráficos (nada se apaga)
export async function janelaDoPlano(conta: Pick<ContaGuardada, 'plano' | 'maisAte'>) {
  if (alunoMais(conta)) return null
  return somarDias(hoje(), -(await lerPlataforma()).limites.diasGrafico)
}

export type ResultadoTreino = { treino: Treino; sequencia: number; repetido?: boolean }

export async function registrarTreino(conta: ContaGuardada, corpo: Corpo): Promise<ResultadoTreino> {
  const id = typeof corpo.id === 'string' && /^[a-z0-9]{8,40}$/.test(corpo.id) ? corpo.id : novoId()
  const inicio = typeof corpo.inicio === 'string' && !Number.isNaN(Date.parse(corpo.inicio)) ? new Date(corpo.inicio).toISOString() : ''
  const fim = typeof corpo.fim === 'string' && !Number.isNaN(Date.parse(corpo.fim)) ? new Date(corpo.fim).toISOString() : new Date().toISOString()
  if (!inicio) falhar(400, 'O treino precisa da hora de início.')
  const duracaoMin = Math.round((Date.parse(fim) - Date.parse(inicio)) / 60_000)
  if (duracaoMin < 1) falhar(400, 'O treino terminou antes de começar.')
  if (duracaoMin > 6 * 60) falhar(400, 'Treino longo demais (mais de 6 horas).')
  if (Date.parse(fim) > Date.now() + 5 * 60_000) falhar(400, 'O fim do treino está no futuro.')
  if (Date.now() - Date.parse(inicio) > 7 * 86_400_000) falhar(400, 'Só dá para registrar treinos da última semana.')

  // a ficha (quando veio de uma) e os exercícios próprios de quem a montou
  const fichaId = typeof corpo.ficha === 'string' ? corpo.ficha : undefined
  const ficha = fichaId ? await lerFicha(fichaId) : null
  if (fichaId && (!ficha || ficha.aluno !== conta.id)) falhar(403, 'Esta ficha não é sua.')
  const proprios = new Map<string, string>()
  if (ficha) for (const x of await lerJSON<ExercicioProprio[]>(CHAVES.exerciciosProprios(ficha.autor), [])) proprios.set(x.id, x.nome)
  const exercicios = (Array.isArray(corpo.exercicios) ? corpo.exercicios.slice(0, 20) : []).map((e) => limparExercicioFeito(e, proprios)).filter((e): e is NonNullable<typeof e> => !!e)
  const modalidade = typeof corpo.modalidade === 'string' ? corpo.modalidade : undefined
  if (!exercicios.length && !modalidade) falhar(400, 'O treino precisa de pelo menos um exercício.')
  const divisao = ficha?.divisoes.find((d) => d.id === corpo.divisao)

  // o local (a unidade onde treinou)
  let local: Treino['local']
  const l = (corpo.local ?? null) as { empresa?: unknown; unidade?: unknown } | null
  if (l && typeof l.empresa === 'string' && typeof l.unidade === 'string') {
    const e = await lerEmpresa(l.empresa)
    if (e?.unidades.some((u) => u.id === l.unidade)) local = { empresa: e.slug, unidade: l.unidade }
  }

  const ano = anoDe(inicio)
  const historico = await treinosDe(conta.id)
  const repetido = historico.find((t) => t.id === id)
  if (repetido) return { treino: repetido, sequencia: sequencia(historico.map((t) => dataDe(t.inicio)), conta.metaSemanal, hoje()), repetido: true }

  const nome = limpar(corpo.nome, 60) || (divisao ? `${divisao.nome}${divisao.foco ? ` · ${divisao.foco}` : ''}` : modalidade ? `Aula de ${nomeModalidade(modalidade).toLowerCase()}` : 'Treino livre')
  const esforco = Math.round(Number(corpo.esforco))
  const nota = limpar(corpo.nota, 200)
  const treino: Treino = {
    id,
    conta: conta.id,
    nome,
    origem: modalidade ? 'aula' : ficha ? 'ficha' : 'livre',
    ...(ficha ? { ficha: ficha.id } : {}),
    ...(divisao ? { divisao: divisao.id } : {}),
    ...(modalidade ? { modalidade } : {}),
    inicio,
    fim,
    duracaoMin,
    exercicios,
    volume: volume(exercicios),
    series: seriesFeitas(exercicios),
    recordes: recordes(exercicios, melhoresDe(historico)),
    ...(esforco >= 1 && esforco <= 10 ? { esforco } : {}),
    ...(nota ? { nota } : {}),
    ...(local ? { local } : {}),
  }
  await atualizar<Treino[]>(CHAVES.treinosDo(conta.id, ano), [], (lista) => (lista.some((t) => t.id === id) ? lista : [treino, ...lista]))

  // o que o treino muda em volta: as pegadas, os desafios, o painel de quem acompanha
  await Promise.all([anotarLugar(conta.id, treino), somarTreinoNosDesafios(conta, treino), avisarPainel(conta.id, treino, ficha?.autor), somarNoDia('treinos', !!(conta.demo || conta.visita))])
  const datas = [dataDe(treino.inicio), ...historico.map((t) => dataDe(t.inicio))]
  return { treino, sequencia: sequencia(datas, conta.metaSemanal, hoje()) }
}

// As "pegadas": as unidades onde a pessoa treinou, quantas vezes e quando
export type Lugar = { empresa: string; unidade: string; nome: string; vezes: number; primeira: string; ultima: string }

async function anotarLugar(conta: string, t: Treino) {
  if (!t.local) return
  const e = await lerEmpresa(t.local.empresa)
  if (!e) return
  const nome = nomeDaUnidade(e, t.local.unidade)
  await atualizar<Lugar[]>(CHAVES.lugares(conta), [], (l) => {
    const i = l.findIndex((x) => x.empresa === t.local!.empresa && x.unidade === t.local!.unidade)
    if (i < 0) return [{ empresa: t.local!.empresa, unidade: t.local!.unidade, nome, vezes: 1, primeira: t.inicio, ultima: t.inicio }, ...l].slice(0, 100)
    const copia = [...l]
    copia[i] = { ...l[i], nome, vezes: l[i].vezes + 1, ultima: t.inicio > l[i].ultima ? t.inicio : l[i].ultima }
    return copia
  })
}

export const lerLugares = (conta: string) => lerJSON<Lugar[]>(CHAVES.lugares(conta), [])

// O resumo do aluno no painel da academia e do personal: o último treino e os treinos da semana
async function avisarPainel(conta: string, t: Treino, autorDaFicha?: string) {
  const vinculos = (await lerVinculos(conta)).filter((v) => v.status === 'ativo')
  const semana = inicioDaSemana(hoje())
  const naSemana = (await treinosDe(conta, 1)).filter((x) => dataDe(x.inicio) >= semana).length
  await Promise.all(
    vinculos.map((v) =>
      mudarAlunoDoPainel({ tipo: v.tipo, id: v.id }, conta, (a) => ({ ...a, ultimoTreino: t.inicio > (a.ultimoTreino ?? '') ? t.inicio : a.ultimoTreino, treinosSemana: naSemana })).catch(() => null),
    ),
  )
  if (autorDaFicha && autorDaFicha !== conta) await somarTreinoAcompanhado(autorDaFicha)
}

// A evolução de um exercício: a melhor série de cada dia (a carga e a força estimada)
export function progressao(treinos: Treino[], exercicio: string) {
  const dias = new Map<string, { data: string; carga: number; reps: number; forca: number; volume: number }>()
  for (const t of treinos) {
    for (const e of t.exercicios) {
      if (e.exercicio !== exercicio) continue
      const data = dataDe(t.inicio)
      for (const s of e.series) {
        if (!s.feita) continue
        const forca = s.reps === 1 ? s.carga : s.carga * (1 + s.reps / 30)
        const atual = dias.get(data)
        const vol = (atual?.volume ?? 0) + s.carga * s.reps
        if (!atual || forca > atual.forca) dias.set(data, { data, carga: s.carga, reps: s.reps, forca: Math.round(forca * 10) / 10, volume: vol })
        else dias.set(data, { ...atual, volume: vol })
      }
    }
  }
  return [...dias.values()].sort((a, b) => a.data.localeCompare(b.data))
}

// Os exercícios que a pessoa mais faz (para a tela de evolução)
export function maisFeitos(treinos: Treino[], n = 8) {
  const conta = new Map<string, { id: string; nome: string; vezes: number }>()
  for (const t of treinos) for (const e of t.exercicios) conta.set(e.exercicio, { id: e.exercicio, nome: EXERCICIO[e.exercicio]?.nome ?? e.nome, vezes: (conta.get(e.exercicio)?.vezes ?? 0) + 1 })
  return [...conta.values()].sort((a, b) => b.vezes - a.vezes).slice(0, n)
}

export async function marcarPost(conta: string, treinoId: string, post: string) {
  const ano = new Date().getFullYear()
  for (const a of [ano, ano - 1]) {
    const achou = await atualizar<Treino[]>(CHAVES.treinosDo(conta, String(a)), [], (l) => (l.some((t) => t.id === treinoId && !t.post) ? l.map((t) => (t.id === treinoId ? { ...t, post } : t)) : l))
    if (achou.some((t) => t.id === treinoId)) return
  }
}
