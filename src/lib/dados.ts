import { useCallback, useEffect, useRef, useState } from 'react'

// Busca de dados com cache em memória: ao voltar para uma tela, mostra na hora o que já tinha e
// atualiza por trás.

const cache = new Map<string, unknown>()

export function useDados<T>(chave: string | null, carregar: () => Promise<T>) {
  const [dados, setDados] = useState<T | undefined>(() => (chave ? (cache.get(chave) as T | undefined) : undefined))
  const [erro, setErro] = useState<Error | null>(null)
  const [carregando, setCarregando] = useState(!!chave && !cache.has(chave))
  const funcao = useRef(carregar)
  funcao.current = carregar

  const recarregar = useCallback(async () => {
    if (!chave) return
    setCarregando(!cache.has(chave))
    try {
      const novo = await funcao.current()
      cache.set(chave, novo)
      setDados(novo)
      setErro(null)
    } catch (e) {
      setErro(e as Error)
    } finally {
      setCarregando(false)
    }
  }, [chave])

  useEffect(() => {
    if (!chave) return
    setDados(cache.get(chave) as T | undefined)
    void recarregar()
  }, [chave, recarregar])

  const definir = useCallback(
    (novo: T | ((atual: T | undefined) => T)) => {
      setDados((atual) => {
        const valor = typeof novo === 'function' ? (novo as (a: T | undefined) => T)(atual) : novo
        if (chave) cache.set(chave, valor)
        return valor
      })
    },
    [chave],
  )

  return { dados, erro, carregando, recarregar, definir }
}

export const esquecer = (prefixo: string) => {
  for (const k of cache.keys()) if (k.startsWith(prefixo)) cache.delete(k)
}
