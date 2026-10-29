import type { ReactNode } from 'react'
import { useSessao } from '../../lib/sessao'
import { AppAluno } from './AppAluno'
import { Rodape } from './Rodape'
import { Topo } from './Topo'

// As telas abertas a todos (a rede, o catálogo de exercícios): quem está logado vê dentro do app,
// com a marca da academia; quem não está, com o topo da Turma
export function Moldura({ children, largo = true }: { children: ReactNode; largo?: boolean }) {
  const s = useSessao()
  if (s.usuario) return <AppAluno largo={largo}>{children}</AppAluno>
  return (
    <div className="min-h-[100svh]">
      <Topo />
      <main className={`margem mx-auto py-8 pb-20 ${largo ? 'max-w-6xl' : 'max-w-3xl'}`}>{children}</main>
      <Rodape />
    </div>
  )
}
