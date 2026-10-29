import { useState } from 'react'
import { PiMegaphone, PiX } from 'react-icons/pi'
import { plataforma } from '../../lib/api'
import { useDados } from '../../lib/dados'

// O aviso que o admin escreve (manutenção, novidade): uma faixa no topo de todas as telas. Quem
// fecha não vê de novo o mesmo aviso nesta aba.

const CHAVE = 'turma:aviso-fechado'

function fechado(aviso: string) {
  try {
    return sessionStorage.getItem(CHAVE) === aviso
  } catch {
    return false
  }
}

export function AvisoDaPlataforma() {
  const aviso = useDados('plataforma', () => plataforma.ler()).dados?.aviso ?? ''
  const [fechou, setFechou] = useState('')
  if (!aviso || fechou === aviso || fechado(aviso)) return null
  return (
    <div className="relative z-[60] border-b border-linha bg-sup-2 text-sm" role="status">
      <div className="margem mx-auto flex max-w-7xl items-center gap-2.5 py-2">
        <PiMegaphone className="shrink-0 text-lg text-anilha-legivel" aria-hidden />
        <p className="min-w-0 flex-1">{aviso}</p>
        <button
          type="button"
          className="grid size-8 shrink-0 place-items-center rounded-full text-suave hover:bg-sup-3 hover:text-texto"
          aria-label="Fechar o aviso"
          onClick={() => {
            setFechou(aviso)
            try {
              sessionStorage.setItem(CHAVE, aviso)
            } catch {
              // sem o armazenamento, fecha só agora
            }
          }}
        >
          <PiX />
        </button>
      </div>
    </div>
  )
}
