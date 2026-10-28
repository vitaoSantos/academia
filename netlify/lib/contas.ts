import { RAIO_PADRAO, cidadeValida } from '../../src/shared/geo.ts'
import { alunoMais } from '../../src/shared/planos.ts'
import { USUARIO, usuarioDe } from '../../src/shared/slug.ts'
import { identificador, limpar, normalizarEmail, normalizarTelefone, SENHA_MINIMA } from '../../src/shared/texto.ts'
import type { Cidade, PessoaResumo } from '../../src/shared/tipos.ts'
import { protegerSenha, type ContaGuardada } from './auth.ts'
import { falhar, type Corpo } from './http.ts'
import { atualizar, blobs, CHAVES, criarSeNovo, lerJSON, novoId } from './store.ts'

// Contas: o login é o e-mail ou o celular (os dois únicos: uma chave por e-mail e por celular aponta
// para a conta). A mesma conta é aluno, profissional (personal e/ou professor) e da equipe de
// empresas. O @ do perfil também é único.

export { SENHA_MINIMA }

export function dadosDeCadastro(corpo: Corpo) {
  const nome = limpar(corpo.nome, 60)
  if (nome.length < 2) falhar(400, 'Informe seu nome.')
  const login = identificador(corpo.login)
  const email = login?.tipo === 'email' ? login.valor : corpo.email ? normalizarEmail(corpo.email) : ''
  const celular = login?.tipo === 'celular' ? login.valor : corpo.celular ? normalizarTelefone(corpo.celular) : ''
  if (!email && !celular) falhar(400, 'Informe um e-mail ou um celular com DDD.')
  if (corpo.email && !email) falhar(400, 'Esse e-mail não parece certo.')
  const senha = typeof corpo.senha === 'string' ? corpo.senha : ''
  if (senha.length < SENHA_MINIMA) falhar(400, `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`)
  if (senha.length > 200) falhar(400, 'Senha longa demais.')
  const cidade = cidadeValida(corpo.cidade) ? (corpo.cidade as Cidade) : undefined
  return { nome, email: email || undefined, celular: celular || undefined, senha, cidade }
}

type NovaConta = {
  nome: string
  senha: string
  email?: string
  celular?: string
  cidade?: Cidade
  publico?: boolean
  id?: string
  extra?: Partial<ContaGuardada>
}

// Um @ livre a partir do nome (ana.souza, ana.souza2...)
async function reservarUsuario(nome: string, id: string, desejado?: string) {
  const base = (desejado && USUARIO.test(desejado) ? desejado : usuarioDe(nome)) || 'atleta'
  for (let i = 0; i < 30; i++) {
    const tentativa = i === 0 ? base : `${base.slice(0, 26)}${i + 1}`
    if (USUARIO.test(tentativa) && (await criarSeNovo(CHAVES.usuario(tentativa), { id }))) return tentativa
  }
  const sorte = `${base.slice(0, 20)}${Math.floor(Math.random() * 1e6)}`
  await criarSeNovo(CHAVES.usuario(sorte), { id })
  return sorte
}

export async function criarConta(n: NovaConta): Promise<ContaGuardada> {
  const id = n.id ?? novoId()
  if (n.email && !(await criarSeNovo(CHAVES.email(n.email), { id }))) falhar(409, 'Já existe uma conta com esse e-mail. Entre com a sua senha.')
  if (n.celular && !(await criarSeNovo(CHAVES.celular(n.celular), { id }))) {
    if (n.email) await blobs().delete(CHAVES.email(n.email))
    falhar(409, 'Já existe uma conta com esse celular. Entre com a sua senha.')
  }
  const usuario = await reservarUsuario(n.nome, id, n.extra?.usuario)
  const conta: ContaGuardada = {
    id,
    nome: n.nome,
    usuario,
    ...(n.email ? { email: n.email } : {}),
    ...(n.celular ? { celular: n.celular } : {}),
    publico: n.publico ?? false,
    ...(n.cidade ? { cidade: n.cidade, raio: RAIO_PADRAO } : {}),
    plano: 'gratis',
    metaSemanal: 3,
    consentimentos: { medidas: [] },
    criadaEm: new Date().toISOString(),
    ...n.extra,
    senha: await protegerSenha(n.senha),
    versao: 1,
  }
  await blobs().setJSON(CHAVES.conta(id), conta)
  return conta
}

export async function contaPorLogin(login: { tipo: 'email' | 'celular'; valor: string }) {
  const ponteiro = await lerJSON<{ id: string } | null>(login.tipo === 'email' ? CHAVES.email(login.valor) : CHAVES.celular(login.valor), null)
  return ponteiro ? lerConta(ponteiro.id) : null
}

export async function contaPorUsuario(usuario: string) {
  const ponteiro = await lerJSON<{ id: string } | null>(CHAVES.usuario(usuario.toLowerCase()), null)
  return ponteiro ? lerConta(ponteiro.id) : null
}

export const lerConta = (id: string) => lerJSON<ContaGuardada | null>(CHAVES.conta(id), null)

export async function mudarConta(id: string, mudar: (c: ContaGuardada) => ContaGuardada) {
  const conta = await atualizar<ContaGuardada | null>(CHAVES.conta(id), null, (c) => (c ? mudar(c) : falhar(404, 'Conta não encontrada.')))
  return conta as ContaGuardada
}

// Troca o @ (o antigo fica livre)
export async function trocarUsuario(conta: ContaGuardada, novo: string) {
  const u = novo.toLowerCase()
  if (u === conta.usuario) return conta
  if (!USUARIO.test(u)) falhar(400, 'Use letras, números, ponto e sublinhado (3 a 30).')
  if (!(await criarSeNovo(CHAVES.usuario(u), { id: conta.id }))) falhar(409, 'Esse @ já é de outra pessoa.')
  await blobs().delete(CHAVES.usuario(conta.usuario))
  return mudarConta(conta.id, (c) => ({ ...c, usuario: u }))
}

// O bloqueio vale para os dois lados: quem a pessoa bloqueou e quem a bloqueou somem para ela
export const bloqueiosDe = (c: Pick<ContaGuardada, 'bloqueados' | 'bloqueadoPor'> | null | undefined) => new Set([...(c?.bloqueados ?? []), ...(c?.bloqueadoPor ?? [])])

// O que qualquer um vê de uma pessoa (nunca o e-mail nem o celular)
export const resumo = (c: Pick<ContaGuardada, 'id' | 'nome' | 'usuario' | 'foto' | 'plano' | 'maisAte' | 'profissional'>): PessoaResumo => ({
  id: c.id,
  nome: c.nome,
  usuario: c.usuario,
  ...(c.foto ? { foto: c.foto } : {}),
  ...(alunoMais(c) ? { mais: true } : {}),
  ...(c.profissional ? { profissional: true } : {}),
})

export async function resumos(ids: readonly string[]) {
  const unicos = [...new Set(ids)]
  const contas = await Promise.all(unicos.map((id) => lerConta(id)))
  const mapa = new Map<string, PessoaResumo>()
  for (const c of contas) if (c) mapa.set(c.id, resumo(c))
  return mapa
}

// Apaga a conta e o que é só dela (as medidas, os treinos, os avisos). O resto (posts, conversas)
// some pelas listas de quem apagou.
export async function apagarConta(c: Pick<ContaGuardada, 'id' | 'email' | 'celular' | 'usuario'>) {
  const ano = new Date().getFullYear()
  await Promise.all([
    blobs().delete(CHAVES.conta(c.id)),
    c.email ? blobs().delete(CHAVES.email(c.email)) : null,
    c.celular ? blobs().delete(CHAVES.celular(c.celular)) : null,
    blobs().delete(CHAVES.usuario(c.usuario)),
    blobs().delete(CHAVES.medidas(c.id)),
    blobs().delete(CHAVES.avisos(c.id)),
    blobs().delete(CHAVES.vinculos(c.id)),
    blobs().delete(CHAVES.fichasDo(c.id)),
    blobs().delete(CHAVES.seguindo(c.id)),
    blobs().delete(CHAVES.seguidores(c.id)),
    blobs().delete(CHAVES.lugares(c.id)),
    blobs().delete(CHAVES.postsDo(c.id)),
    blobs().delete(CHAVES.sessoesDo(c.id)),
    blobs().delete(CHAVES.reservasDo(c.id)),
    blobs().delete(CHAVES.desafiosDo(c.id)),
    ...[ano, ano - 1].map((a) => blobs().delete(CHAVES.treinosDo(c.id, String(a)))),
  ])
}

// Lista de contas para o admin (lê as chaves por prefixo)
export async function todasAsContas(limite = 3000) {
  const { blobs: lista } = await blobs().list({ prefix: 'contas/u/' })
  const contas = await Promise.all(lista.slice(0, limite).map((b) => lerJSON<ContaGuardada | null>(b.key, null)))
  return contas.filter((c): c is ContaGuardada => !!c)
}
