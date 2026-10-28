import type { Aviso, TipoAviso } from '../../src/shared/tipos.ts'
import { atualizar, CHAVES, lerJSON, novoId } from './store.ts'

// O sino: os avisos de cada conta (ficha nova, aula, mensagem, 💪...). Os 100 mais recentes. O mesmo
// aviso repetido em pouco tempo (o 💪 de várias pessoas no mesmo post) vira um só.

const MAX = 100

export async function avisar(conta: string, tipo: TipoAviso, texto: string, link: string, { juntar = false } = {}) {
  const agora = new Date().toISOString()
  await atualizar<Aviso[]>(CHAVES.avisos(conta), [], (lista) => {
    if (juntar) {
      const i = lista.findIndex((a) => !a.lido && a.tipo === tipo && a.link === link)
      if (i >= 0) {
        const copia = [...lista]
        copia.splice(i, 1)
        return [{ ...lista[i], texto, em: agora }, ...copia]
      }
    }
    return [{ id: novoId(), tipo, texto, link, em: agora }, ...lista].slice(0, MAX)
  })
}

// Avisa sem deixar uma falha no aviso derrubar a ação principal
export const avisarSemFalhar = (conta: string, tipo: TipoAviso, texto: string, link: string, opcoes?: { juntar?: boolean }) =>
  avisar(conta, tipo, texto, link, opcoes).catch((e) => console.error('Aviso não entregue', tipo, e instanceof Error ? e.message : e))

export const lerAvisos = (conta: string) => lerJSON<Aviso[]>(CHAVES.avisos(conta), [])

export const marcarLidos = (conta: string) => atualizar<Aviso[]>(CHAVES.avisos(conta), [], (l) => (l.some((a) => !a.lido) ? l.map((a) => (a.lido ? a : { ...a, lido: true })) : l))
