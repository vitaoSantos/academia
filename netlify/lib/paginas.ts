import { slugificar, slugValido } from '../../src/shared/slug.ts'
import { falhar } from './http.ts'
import { blobs, CHAVES, criarSeNovo, lerJSON } from './store.ts'

// Os endereços na raiz do site (turma.app/forca-total, turma.app/rafael-moreira): a academia e o
// personal dividem o mesmo espaço de nomes, então cada endereço aponta para um dono.

export type Pagina = { tipo: 'empresa' | 'profissional'; id: string }

export const lerPagina = (slug: string) => lerJSON<Pagina | null>(CHAVES.pagina(slug), null)

export async function reservarPagina(slug: string, dono: Pagina) {
  if (!slugValido(slug)) falhar(400, 'Esse endereço não pode ser usado. Use letras, números e hífen.')
  if (await criarSeNovo(CHAVES.pagina(slug), dono)) return slug
  const atual = await lerPagina(slug)
  if (atual && atual.tipo === dono.tipo && atual.id === dono.id) return slug
  return falhar(409, 'Esse endereço já é de outra página. Escolha outro.')
}

// Sugere um endereço livre a partir do nome (forca-total, forca-total-2...)
export async function sugerirPagina(nome: string) {
  const base = slugificar(nome) || 'pagina'
  for (let i = 0; i < 12; i++) {
    const s = i === 0 ? base : `${base.slice(0, 36)}-${i + 1}`
    if (slugValido(s) && !(await lerPagina(s))) return s
  }
  return `${base.slice(0, 30)}-${Date.now().toString(36).slice(-4)}`
}

export const liberarPagina = (slug: string) => blobs().delete(CHAVES.pagina(slug))
