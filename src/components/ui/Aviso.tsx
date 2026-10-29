import { AnimatePresence, motion } from 'motion/react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { PiCheckCircleFill, PiWarningCircleFill } from 'react-icons/pi'

// Os avisos rápidos no rodapé da tela ("Ficha salva", "Não deu certo…")

type Tipo = 'ok' | 'erro'
type Item = { id: number; texto: string; tipo: Tipo }

const Contexto = createContext<(texto: string, tipo?: Tipo) => void>(() => {})

export function AvisoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<Item[]>([])
  const avisar = useCallback((texto: string, tipo: Tipo = 'ok') => {
    const id = Date.now() + Math.random()
    setItens((atual) => [...atual.slice(-2), { id, texto, tipo }])
    setTimeout(() => setItens((atual) => atual.filter((i) => i.id !== id)), 4200)
  }, [])
  return (
    <Contexto.Provider value={avisar}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4" aria-live="polite">
        <AnimatePresence>
          {itens.map((i) => (
            <motion.div
              key={i.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl border border-linha bg-sup-2 px-4 py-3 text-sm text-texto shadow-xl"
            >
              {i.tipo === 'ok' ? <PiCheckCircleFill className="shrink-0 text-lg text-ok" /> : <PiWarningCircleFill className="shrink-0 text-lg text-perigo" />}
              {i.texto}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Contexto.Provider>
  )
}

export const useAviso = () => useContext(Contexto)
