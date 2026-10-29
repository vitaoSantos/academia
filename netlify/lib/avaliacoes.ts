import { limparAvaliacao, notaDe } from '../../src/shared/avaliacao.ts'
import { limparTexto } from '../../src/shared/texto.ts'
import type { Avaliacao, Empresa } from '../../src/shared/tipos.ts'
import type { ContaGuardada } from './auth.ts'
import { avisarSemFalhar } from './avisos.ts'
import { indexarEmpresa, lerEmpresa } from './empresas.ts'
import { falhar, type Corpo } from './http.ts'
import { lerProfissional, recontar } from './profissionais.ts'
import { atualizar, CHAVES, lerJSON } from './store.ts'
import { lerLugares } from './treinos.ts'
import { lerVinculos } from './vinculos.ts'
import { fichasDoAluno } from './fichas.ts'

// As avaliações (seção 14 do estudo): só quem treinou de verdade avalia. O profissional: quem tem
// ou teve vínculo, ou recebeu uma ficha dele. A academia: quem é (ou foi) aluno, ou fez check-in lá.

export type Alvo = { tipo: 'profissional' | 'empresa'; id: string }

export const lerAvaliacoes = (a: Alvo) => lerJSON<Avaliacao[]>(CHAVES.avaliacoes(a.tipo, a.id), [])

export async function podeAvaliar(conta: ContaGuardada, a: Alvo) {
  if (conta.visita) return false
  const vinculos = await lerVinculos(conta.id)
  if (vinculos.some((v) => v.tipo === a.tipo && v.id === a.id && v.status !== 'pendente')) return true
  if (a.tipo === 'profissional') return (await fichasDoAluno(conta.id)).some((f) => f.autor === a.id && f.status !== 'rascunho')
  return (await lerLugares(conta.id)).some((l) => l.empresa === a.id)
}

export async function avaliar(conta: ContaGuardada, a: Alvo, corpo: Corpo) {
  if (a.tipo === 'profissional' && a.id === conta.id) falhar(400, 'Você não pode se avaliar.')
  const alvo = a.tipo === 'profissional' ? await lerProfissional(a.id) : await lerEmpresa(a.id)
  if (!alvo) return falhar(404, 'Não encontrado.')
  if (a.tipo === 'empresa' && (alvo as Empresa).equipe.some((m) => m.id === conta.id)) falhar(400, 'A equipe não avalia a própria academia.')
  if (!(await podeAvaliar(conta, a))) falhar(403, a.tipo === 'profissional' ? 'Só quem treina (ou treinou) com este profissional avalia.' : 'Só quem é (ou foi) aluno daqui, ou fez check-in aqui, avalia.')
  const dados = limparAvaliacao(corpo, a.tipo)
  if (!dados) falhar(400, 'Escolha de 1 a 5 estrelas.')
  const agora = new Date().toISOString()
  let primeira = true
  const lista = await atualizar<Avaliacao[]>(CHAVES.avaliacoes(a.tipo, a.id), [], (l) => {
    const antes = l.find((x) => x.de === conta.id)
    primeira = !antes
    const nova: Avaliacao = { de: conta.id, deNome: conta.nome, ...dados!, em: agora, ...(antes?.resposta ? { resposta: antes.resposta } : {}) }
    return [nova, ...l.filter((x) => x.de !== conta.id)].slice(0, 2000)
  })
  await atualizarNota(a, lista)
  const dono = a.tipo === 'profissional' ? a.id : (alvo as Empresa).dono
  if (primeira) avisarSemFalhar(dono, 'avaliacao', `${conta.nome} deu ${dados!.estrelas} ${dados!.estrelas === 1 ? 'estrela' : 'estrelas'}${a.tipo === 'empresa' ? ` para a ${(alvo as Empresa).nome}` : ''}.`, a.tipo === 'profissional' ? '/pro/perfil' : `/painel/${a.id}/avaliacoes`)
  return lista
}

async function atualizarNota(a: Alvo, lista: Avaliacao[]) {
  const nota = notaDe(lista)
  if (a.tipo === 'profissional') {
    await recontar(a.id)
    return
  }
  const e = await atualizar<Empresa | null>(CHAVES.empresa(a.id), null, (x) => (x ? { ...x, numeros: { ...x.numeros, nota } } : x))
  if (e) await indexarEmpresa(e)
}

// A resposta pública do profissional ou da academia (uma por avaliação)
export async function responder(a: Alvo, de: string, textoBruto: unknown) {
  const texto = limparTexto(textoBruto, 400)
  if (!texto) falhar(400, 'Escreva a resposta.')
  const lista = await atualizar<Avaliacao[]>(CHAVES.avaliacoes(a.tipo, a.id), [], (l) => {
    if (!l.some((x) => x.de === de)) falhar(404, 'Avaliação não encontrada.')
    return l.map((x) => (x.de === de ? { ...x, resposta: { texto, em: new Date().toISOString() } } : x))
  })
  const pagina = a.tipo === 'profissional' ? (await lerProfissional(a.id))?.slug : a.id
  avisarSemFalhar(de, 'avaliacao', 'Responderam a sua avaliação.', pagina ? `/${pagina}` : '/avisos')
  return lista
}
