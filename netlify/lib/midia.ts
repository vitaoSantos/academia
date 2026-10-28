import { falhar } from './http.ts'
import { blobs, CHAVES, lerJSON, novoId } from './store.ts'

// Fotos (perfil, logo, capa, posts, fotos de evolução) e a fonte da marca: já reduzidas no
// navegador e guardadas em base64. As fotos de evolução são privadas: só o dono (e quem ele deixar)
// recebe o endereço delas.

export type Midia = { id: string; dono: string; tipo: string; dados: string; privada?: boolean; em: string }

const IMAGEM = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/
const FONTE = /^data:font\/(woff2|woff|ttf|otf);base64,[A-Za-z0-9+/=]+$/

export async function guardarImagem(dono: string, tipo: string, dados: unknown, { max = 1_600_000, privada = false } = {}) {
  if (typeof dados !== 'string' || !IMAGEM.test(dados)) falhar(400, 'Envie uma foto (JPG, PNG ou WebP).')
  if ((dados as string).length > max) falhar(413, 'Foto grande demais. Tente de novo (o app reduz sozinho).')
  const m: Midia = { id: novoId(), dono, tipo, dados: dados as string, ...(privada ? { privada: true } : {}), em: new Date().toISOString() }
  await blobs().setJSON(CHAVES.midia(m.id), m)
  return m
}

export async function guardarFonte(dono: string, dados: unknown) {
  if (typeof dados !== 'string' || !FONTE.test(dados)) falhar(400, 'Envie a fonte em WOFF2, WOFF, TTF ou OTF.')
  if ((dados as string).length > 1_400_000) falhar(413, 'A fonte é grande demais (até 1 MB).')
  const m: Midia = { id: novoId(), dono, tipo: 'fonte', dados: dados as string, em: new Date().toISOString() }
  await blobs().setJSON(CHAVES.midia(m.id), m)
  return m
}

export const lerMidia = (id: string) => lerJSON<Midia | null>(CHAVES.midia(id), null)
export const apagarMidia = (id: string) => blobs().delete(CHAVES.midia(id))
