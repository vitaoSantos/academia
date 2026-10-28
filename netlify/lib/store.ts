import { getStore, type Store } from '@netlify/blobs'
// Traz a declaração do objeto global Netlify (Netlify.env)
import type {} from '@netlify/functions'

// Armazenamento chave-valor do próprio Netlify (Netlify Blobs): sem banco de dados para manter.
// Os testes trocam por uma versão em memória com `usarArmazem`.
export type Armazem = Pick<Store, 'get' | 'getWithMetadata' | 'set' | 'setJSON' | 'delete' | 'list'>

let substituto: Armazem | null = null
export const usarArmazem = (outro: Armazem | null) => {
  substituto = outro
}
export const blobs = (): Armazem => substituto ?? getStore({ name: 'turma', consistency: 'strong' })

// "conta:<id>" ou "empresa:<slug>": quem está de cada lado de uma conversa
export type ChaveLado = `conta:${string}` | `empresa:${string}`

export const CHAVES = {
  // contas
  conta: (id: string) => `contas/u/${id}`,
  email: (email: string) => `contas/email/${email}`,
  celular: (celular: string) => `contas/celular/${celular}`,
  usuario: (usuario: string) => `contas/usuario/${usuario}`, // o @ do perfil aponta para a conta
  vinculos: (id: string) => `contas/vinculos/${id}`,
  fichasDo: (id: string) => `contas/fichas/${id}`,
  treinosDo: (id: string, ano: string) => `contas/treinos/${id}/${ano}`,
  medidas: (id: string) => `contas/medidas/${id}`,
  avisos: (id: string) => `contas/avisos/${id}`,
  seguindo: (id: string) => `contas/seguindo/${id}`,
  seguidores: (id: string) => `contas/seguidores/${id}`,
  bloqueios: (id: string) => `contas/bloqueios/${id}`,
  desafiosDo: (id: string) => `contas/desafios/${id}`,
  lugares: (id: string) => `contas/lugares/${id}`, // onde treinou (as "pegadas")
  postsDo: (id: string) => `contas/posts/${id}`,
  sessoesDo: (id: string) => `contas/sessoes/${id}`,
  reservasDo: (id: string) => `contas/reservas/${id}`,
  conversasDo: (lado: ChaveLado) => `conversas/de/${lado}`,
  // páginas na raiz do site (turma.app/forca-total): o endereço aponta para a empresa ou o personal
  pagina: (slug: string) => `paginas/${slug}`,
  // profissionais
  profissional: (id: string) => `profissionais/p/${id}`,
  alunosDoProfissional: (id: string) => `profissionais/alunos/${id}`,
  fichasDoProfissional: (id: string) => `profissionais/fichas/${id}`,
  modelos: (id: string) => `profissionais/modelos/${id}`,
  exerciciosProprios: (id: string) => `profissionais/exercicios/${id}`,
  agenda: (id: string, data: string) => `agenda/${id}/${data}`,
  fixas: (id: string) => `agenda/fixas/${id}`,
  // empresas
  empresa: (slug: string) => `empresas/e/${slug}`,
  alunosDaEmpresa: (slug: string) => `empresas/alunos/${slug}`,
  fichasDaEmpresa: (slug: string) => `empresas/fichas/${slug}`,
  experimentais: (slug: string) => `empresas/experimentais/${slug}`,
  postsDaEmpresa: (slug: string) => `empresas/posts/${slug}`,
  folha: (slug: string, unidade: string, data: string) => `aulas/${slug}/${unidade}/${data}`,
  // avaliações (uma lista por alvo)
  avaliacoes: (tipo: 'profissional' | 'empresa', id: string) => `avaliacoes/${tipo}/${id}`,
  // os índices do explorar (o mapa da região)
  indiceUnidades: 'explorar/unidades',
  indiceProfissionais: 'explorar/profissionais',
  // convites
  convite: (codigo: string) => `convites/${codigo}`,
  convitesDe: (de: string) => `convites/de/${de}`,
  // fichas
  ficha: (id: string) => `fichas/${id}`,
  // rede
  post: (id: string) => `rede/p/${id}`,
  feed: 'rede/indice',
  comentarios: (id: string) => `rede/c/${id}`,
  desafio: (id: string) => `desafios/d/${id}`,
  desafios: 'desafios/indice',
  codigoDesafio: (codigo: string) => `desafios/codigo/${codigo}`,
  // conversas
  conversa: (id: string) => `conversas/c/${id}`,
  // fotos e fontes
  midia: (id: string) => `midia/${id}`,
  // plataforma e admin
  plataforma: 'plataforma/config',
  semente: 'plataforma/semente',
  dia: (data: string) => `plataforma/dias/${data}`,
  registro: (mes: string) => `admin/registro/${mes}`,
  denuncias: 'admin/denuncias',
  visitas: 'demo/visitas',
  limpezaVisitas: 'demo/limpeza',
  trava: (quem: string) => `travas/${quem}`,
  limite: (tipo: string, quem: string, janela: number) => `limites/${tipo}/${quem}/${janela}`,
}

// Ids gerados aqui: letras minúsculas e números, começando pelo tempo (ficam em ordem)
export const ID = /^[a-z0-9]{8,40}$/
export const novoId = () => Date.now().toString(36) + hex(crypto.getRandomValues(new Uint8Array(5)))
export const idValido = (valor: unknown): valor is string => typeof valor === 'string' && ID.test(valor)
export const novoToken = () => hex(crypto.getRandomValues(new Uint8Array(18)))

// Código curto para convites e desafios (sem letras que se confundem: 0/O, 1/I/L)
const LETRAS_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const novoCodigo = (tamanho = 6) => Array.from(crypto.getRandomValues(new Uint8Array(tamanho)), (b) => LETRAS_CODIGO[b % LETRAS_CODIGO.length]).join('')

export async function lerJSON<T>(chave: string, padrao: T): Promise<T> {
  return ((await blobs().get(chave, { type: 'json' })) as T | null) ?? padrao
}

export const gravarJSON = (chave: string, valor: unknown) => blobs().setJSON(chave, valor)

export class Conflito extends Error {}

// Lê, altera e grava um JSON com controle de concorrência (etag): se outra requisição gravou no
// meio do caminho, tenta de novo com o valor atualizado. `mudar` devolve o mesmo objeto quando
// não há nada para gravar, e pode lançar ErroHttp para recusar a mudança.
export async function atualizar<T>(chave: string, padrao: T, mudar: (atual: T) => T, tentativas = 10): Promise<T> {
  const b = blobs()
  for (let i = 0; i < tentativas; i++) {
    const entrada = await b.getWithMetadata(chave, { type: 'json' })
    const atual = (entrada?.data as T | undefined) ?? structuredClone(padrao)
    const proximo = mudar(atual)
    if (proximo === atual && entrada) return atual
    const resultado = !entrada
      ? await b.setJSON(chave, proximo, { onlyIfNew: true })
      : entrada.etag
        ? await b.setJSON(chave, proximo, { onlyIfMatch: entrada.etag })
        : await b.setJSON(chave, proximo)
    if (resultado.modified) return proximo
    await new Promise((r) => setTimeout(r, 15 + Math.random() * 40 * (i + 1)))
  }
  throw new Conflito('Muita gente mexendo ao mesmo tempo. Tente de novo.')
}

// Cria só se ainda não existe (o e-mail da conta, o endereço da página)
export async function criarSeNovo(chave: string, valor: unknown) {
  return (await blobs().setJSON(chave, valor, { onlyIfNew: true })).modified
}

// Faz `fazer` em todos os itens, no máximo `limite` ao mesmo tempo
export async function emParalelo<T>(itens: readonly T[], fazer: (item: T) => Promise<unknown>, limite = 48) {
  let proximo = 0
  await Promise.all(
    Array.from({ length: Math.min(limite, itens.length) }, async () => {
      while (proximo < itens.length) await fazer(itens[proximo++])
    }),
  )
}

// Lê várias chaves de uma vez (as que não existem ficam de fora)
export async function lerVarios<T>(chaves: readonly string[]): Promise<T[]> {
  const saida: (T | null)[] = new Array(chaves.length).fill(null)
  await emParalelo(
    chaves.map((c, i) => [c, i] as const),
    async ([c, i]) => {
      saida[i] = await lerJSON<T | null>(c, null)
    },
  )
  return saida.filter((x): x is T => x !== null)
}

export async function apagarPorPrefixo(prefixo: string) {
  const { blobs: lista } = await blobs().list({ prefix: prefixo })
  await emParalelo(lista, (b) => blobs().delete(b.key))
}

export async function sha256(texto: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)))
}

export const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

export const hashDe = async (texto: string) => hex(await sha256(texto))

// Comparação em tempo constante para não vazar segredos pelo tempo de resposta
export async function iguaisSeguro(a: string, b: string) {
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)])
  let diff = 0
  for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i]
  return diff === 0
}

export function env(nome: string) {
  if (typeof Netlify !== 'undefined') return Netlify.env.get(nome)
  return typeof process !== 'undefined' ? process.env[nome] : undefined
}
