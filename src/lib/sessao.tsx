import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { MarcaResumo, RespostaSessao } from '../shared/respostas'
import type { Profissional, Usuario } from '../shared/tipos'
import { sessao as api } from './api'

// Quem está logado: a conta, o perfil profissional (se tiver), as academias de que faz parte e os
// avisos e mensagens não lidos

type Estado = {
  usuario: Usuario | null
  profissional: Profissional | null
  empresas: (MarcaResumo & { papel: string })[]
  naoLidas: { avisos: number; mensagens: number }
}

type Sessao = Estado & {
  carregando: boolean
  aplicar: (r: RespostaSessao) => void
  atualizar: () => Promise<void>
  sair: () => Promise<void>
}

const VAZIO: Estado = { usuario: null, profissional: null, empresas: [], naoLidas: { avisos: 0, mensagens: 0 } }

const Contexto = createContext<Sessao | null>(null)

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(VAZIO)
  const [carregando, setCarregando] = useState(true)

  const aplicar = useCallback((r: RespostaSessao) => {
    setEstado(r.usuario ? { usuario: r.usuario, profissional: r.profissional ?? null, empresas: r.empresas ?? [], naoLidas: r.naoLidas ?? { avisos: 0, mensagens: 0 } } : VAZIO)
  }, [])

  const atualizar = useCallback(async () => {
    try {
      aplicar(await api.ler())
    } catch {
      // sem conexão: segue como visitante (o treino ao vivo continua funcionando)
    } finally {
      setCarregando(false)
    }
  }, [aplicar])

  useEffect(() => {
    void atualizar()
    // os contadores do sino e das mensagens: quando a pessoa volta para o app
    const voltar = () => document.visibilityState === 'visible' && void atualizar()
    document.addEventListener('visibilitychange', voltar)
    return () => document.removeEventListener('visibilitychange', voltar)
  }, [atualizar])

  const sair = useCallback(async () => {
    aplicar(await api.sair())
  }, [aplicar])

  const valor = useMemo(() => ({ ...estado, carregando, aplicar, atualizar, sair }), [estado, carregando, aplicar, atualizar, sair])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSessao() {
  const s = useContext(Contexto)
  if (!s) throw new Error('useSessao fora do SessaoProvider')
  return s
}
