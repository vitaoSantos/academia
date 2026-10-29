import { useEffect, useState } from 'react'

// A hora de agora, atualizada a cada `intervalo` ms enquanto `ativo` (o cronômetro do treino, o
// descanso)
export function useAgora(intervalo = 1000, ativo = true) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    if (!ativo) return
    setAgora(Date.now())
    const t = setInterval(() => setAgora(Date.now()), intervalo)
    return () => clearInterval(t)
  }, [intervalo, ativo])
  return agora
}
