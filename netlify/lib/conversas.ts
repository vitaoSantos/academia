import { limparTexto, temLink, temTelefone } from '../../src/shared/texto.ts'
import type { LinhaConversa } from '../../src/shared/respostas.ts'
import type { Conversa, Lado, Mensagem } from '../../src/shared/tipos.ts'
import type { ContaGuardada } from './auth.ts'
import { avisarSemFalhar } from './avisos.ts'
import { bloqueiosDe, lerConta } from './contas.ts'
import { lerEmpresa, papelNa, PODE } from './empresas.ts'
import { falhar } from './http.ts'
import { lerProfissional } from './profissionais.ts'
import { seguemUmAoOutro } from './rede.ts'
import { atualizar, CHAVES, hashDe, lerJSON, novoId, type ChaveLado } from './store.ts'
import { lerVinculos, vinculoAtivo } from './vinculos.ts'

// O chat (seção 17 do estudo). Os lados são uma conta ou a caixa de uma empresa (que a equipe
// responde). A conversa entre os mesmos dois lados é sempre a mesma.

export const chaveDoLado = (l: Lado): ChaveLado => (l.tipo === 'empresa' ? `empresa:${l.id}` : `conta:${l.id}`)

export async function idDaConversa(a: Lado, b: Lado) {
  const [x, y] = [chaveDoLado(a), chaveDoLado(b)].sort()
  return `c${(await hashDe(`${x}|${y}`)).slice(0, 24)}`
}

export const lerConversa = (id: string) => lerJSON<Conversa | null>(CHAVES.conversa(id), null)
export const listaDe = (l: Lado) => lerJSON<LinhaConversa[]>(CHAVES.conversasDo(chaveDoLado(l)), [])

export const naoLida = (l: LinhaConversa) => !l.deMim && (!l.lidaEm || l.lidaEm < l.ultimaEm)

// O nome de um lado como o outro vê
export async function nomeDoLado(l: Lado) {
  if (l.tipo === 'empresa') return (await lerEmpresa(l.id))?.nome ?? 'Academia'
  return (await lerConta(l.id))?.nome ?? 'Pessoa'
}

// Quem fala em nome de quem: a pessoa fala por ela; pela empresa, quem é da equipe que conversa
export async function ladoDe(conta: ContaGuardada, como?: string): Promise<Lado> {
  if (!como) return { tipo: 'conta', id: conta.id }
  const e = await lerEmpresa(como)
  const papel = e ? papelNa(e, conta.id) : null
  if (!papel || !PODE.conversar.includes(papel)) falhar(403, 'Você não responde pela caixa desta empresa.')
  return { tipo: 'empresa', id: como }
}

// As regras de quem fala com quem
export async function podeConversar(de: Lado, com: Lado, conta: ContaGuardada) {
  if (de.tipo === com.tipo && de.id === com.id) falhar(400, 'Escolha com quem conversar.')
  if (com.tipo === 'empresa') {
    if (!(await lerEmpresa(com.id))) falhar(404, 'Empresa não encontrada.')
    return
  }
  const outra = await lerConta(com.id)
  if (!outra || outra.bloqueado) return falhar(404, 'Pessoa não encontrada.')
  if (bloqueiosDe(conta).has(outra.id)) falhar(403, 'Não dá para conversar com esta pessoa.')
  if (de.tipo === 'empresa') return // a academia fala com aluno e com profissional
  // com um profissional: aluno dele, ou qualquer um quando o perfil é público
  const pro = await lerProfissional(outra.id)
  if (pro && (pro.publico || vinculoAtivo(await lerVinculos(conta.id), { tipo: 'profissional', id: pro.id }))) return
  // o profissional fala com os alunos dele
  const meuPro = await lerProfissional(conta.id)
  if (meuPro && vinculoAtivo(await lerVinculos(outra.id), { tipo: 'profissional', id: conta.id })) return
  // os dois trabalham na mesma academia
  if (conta.empresas?.some((e) => outra.empresas?.some((x) => x.slug === e.slug))) return
  // o professor fala com os alunos das academias onde dá aula
  const deles = await lerVinculos(outra.id)
  if (conta.empresas?.some((e) => e.papel !== 'recepcao' && vinculoAtivo(deles, { tipo: 'empresa', id: e.slug }))) return
  // aluno com aluno: quando se seguem dos dois lados
  if (await seguemUmAoOutro(conta.id, outra.id)) return
  falhar(403, 'A conversa entre alunos abre quando os dois se seguem.')
}

export async function abrirConversa(de: Lado, com: Lado, conta: ContaGuardada) {
  await podeConversar(de, com, conta)
  const id = await idDaConversa(de, com)
  const agora = new Date().toISOString()
  await atualizar<Conversa | null>(CHAVES.conversa(id), null, (c) => c ?? { id, lados: [de, com], mensagens: [], lidas: {}, criadaEm: agora, atualizadaEm: agora })
  return id
}

// Entre alunos o texto não aceita telefone nem link (o golpe começa assim); com a academia e com o
// profissional pode (é o "me chama no zap")
async function conferirMensagem(texto: string, lados: Lado[]) {
  const temEmpresa = lados.some((l) => l.tipo === 'empresa')
  if (temEmpresa) return
  const pros = await Promise.all(lados.map((l) => lerProfissional(l.id)))
  if (pros.some(Boolean)) return
  if (temLink(texto)) falhar(400, 'Links não são aceitos nas conversas entre alunos.')
  if (temTelefone(texto)) falhar(400, 'Telefone não é aceito nas conversas entre alunos.')
}

export async function enviar(conta: ContaGuardada, id: string, lado: Lado, textoBruto: unknown, tipo: Mensagem['tipo'] = 'texto') {
  const texto = limparTexto(textoBruto, 1000)
  if (!texto) falhar(400, 'Escreva a mensagem.')
  const c = await lerConversa(id)
  if (!c) return falhar(404, 'Conversa não encontrada.')
  const meu = c.lados.find((l) => l.tipo === lado.tipo && l.id === lado.id)
  if (!meu) falhar(403, 'Esta conversa não é sua.')
  const outro = c.lados.find((l) => !(l.tipo === lado.tipo && l.id === lado.id))!
  if (outro.tipo === 'conta' && bloqueiosDe(conta).has(outro.id)) falhar(403, 'Não dá para conversar com esta pessoa.')
  await conferirMensagem(texto, c.lados)
  const agora = new Date().toISOString()
  const m: Mensagem = { id: novoId(), de: conta.id, lado, texto, em: agora, ...(tipo !== 'texto' ? { tipo } : {}) }
  const nova = await atualizar<Conversa | null>(CHAVES.conversa(id), null, (x) => (x ? { ...x, mensagens: [...x.mensagens, m].slice(-400), atualizadaEm: agora, lidas: { ...x.lidas, [chaveDoLado(lado)]: agora } } : x))
  const [nomeMeu, nomeOutro] = await Promise.all([nomeDoLado(lado), nomeDoLado(outro)])
  const curto = texto.length > 80 ? `${texto.slice(0, 80)}…` : texto
  await atualizar<LinhaConversa[]>(CHAVES.conversasDo(chaveDoLado(lado)), [], (l) => [{ id, com: outro, nome: nomeOutro, ultima: curto, ultimaEm: agora, deMim: true, lidaEm: agora }, ...l.filter((x) => x.id !== id)].slice(0, 300))
  // quem experimenta a demonstração não aparece na caixa dos outros: a resposta vem sozinha
  if (conta.visita) return respostaDaDemonstracao(id, outro, nomeOutro)
  await atualizar<LinhaConversa[]>(CHAVES.conversasDo(chaveDoLado(outro)), [], (l) => {
    const antes = l.find((x) => x.id === id)
    return [{ id, com: lado, nome: nomeMeu, ultima: curto, ultimaEm: agora, deMim: false, ...(antes?.lidaEm ? { lidaEm: antes.lidaEm } : {}) }, ...l.filter((x) => x.id !== id)].slice(0, 300)
  })
  // o aviso: para a pessoa, ou para quem cuida da caixa da empresa
  if (!conta.visita) {
    if (outro.tipo === 'conta') avisarSemFalhar(outro.id, 'mensagem', `${nomeMeu}: ${curto}`, `/mensagens/${id}`, { juntar: true })
    else {
      const e = await lerEmpresa(outro.id)
      for (const membro of e?.equipe.filter((x) => PODE.conversar.includes(x.papel)) ?? []) if (membro.id !== conta.id) avisarSemFalhar(membro.id, 'mensagem', `${nomeMeu} → ${e!.nome}: ${curto}`, `/mensagens/${id}?como=${e!.slug}`, { juntar: true })
    }
  }
  return nova as Conversa
}

// A resposta automática da demonstração (a conversa de quem experimenta fica só com ela)
async function respostaDaDemonstracao(id: string, outro: Lado, nomeOutro: string) {
  const c = await lerConversa(id)
  const jaRespondeu = c?.mensagens.some((m) => m.lado.tipo === outro.tipo && m.lado.id === outro.id && m.texto.startsWith('(demonstração)'))
  if (jaRespondeu) return c as Conversa
  const em = new Date(Date.now() + 1000).toISOString()
  const texto = `(demonstração) Mensagem recebida! Na plataforma de verdade, ${outro.tipo === 'empresa' ? 'a equipe' : nomeOutro.split(' ')[0]} responde por aqui e você recebe o aviso no sino.`
  const m: Mensagem = { id: novoId(), de: outro.id, lado: outro, texto, em }
  return (await atualizar<Conversa | null>(CHAVES.conversa(id), null, (x) => (x ? { ...x, mensagens: [...x.mensagens, m].slice(-400), atualizadaEm: em } : x))) as Conversa
}

export async function marcarLida(id: string, lado: Lado) {
  const agora = new Date().toISOString()
  await atualizar<LinhaConversa[]>(CHAVES.conversasDo(chaveDoLado(lado)), [], (l) => (l.some((x) => x.id === id && naoLida(x)) ? l.map((x) => (x.id === id ? { ...x, lidaEm: agora } : x)) : l))
  await atualizar<Conversa | null>(CHAVES.conversa(id), null, (x) => (x ? { ...x, lidas: { ...x.lidas, [chaveDoLado(lado)]: agora } } : x))
}
