import type { ReactNode } from 'react'
import { PiLockSimple } from 'react-icons/pi'
import { Link } from '../lib/rotas'
import { useTitulo } from '../lib/titulo'
import type { PapelEmpresa } from '../shared/tipos'
import { AlunoDaAcademia, Alunos } from './Alunos'
import { AppPainel, MaisDoPainel, NOMES_PAPEL, PODE } from './AppPainel'
import { AvaliacoesDaAcademia } from './Avaliacoes'
import { Contatos } from './Contatos'
import { Equipe } from './Equipe'
import { Eventos } from './Eventos'
import { FichasDaAcademia } from './Fichas'
import { AulaDoDia, Grade } from './Grade'
import { Modalidades } from './Modalidades'
import { PaginaEApp } from './PaginaEApp'
import { PlanoDaAcademia } from './Plano'
import { Unidades } from './Unidades'
import { Visao } from './Visao'

// /painel/:slug[/secao[/id]]: cada seção com quem pode ver e a tela dela

type Secao = { nome: string; papeis?: PapelEmpresa[]; tela: (id?: string) => ReactNode }

const SECOES: Record<string, Secao> = {
  '': { nome: 'Visão geral', tela: () => <Visao /> },
  alunos: { nome: 'Alunos', tela: (id) => (id ? <AlunoDaAcademia key={id} id={id} /> : <Alunos />) },
  grade: { nome: 'Grade de aulas', tela: (id) => (id ? <AulaDoDia key={id} id={id} /> : <Grade />) },
  fichas: { nome: 'Fichas', papeis: PODE.treinar, tela: () => <FichasDaAcademia /> },
  contatos: { nome: 'Aula experimental', papeis: PODE.alunos, tela: () => <Contatos /> },
  modalidades: { nome: 'Modalidades', papeis: PODE.configurar, tela: () => <Modalidades /> },
  unidades: { nome: 'Unidades', papeis: PODE.configurar, tela: () => <Unidades /> },
  equipe: { nome: 'Equipe', papeis: PODE.configurar, tela: () => <Equipe /> },
  eventos: { nome: 'Eventos', papeis: PODE.configurar, tela: () => <Eventos /> },
  avaliacoes: { nome: 'Avaliações', papeis: PODE.configurar, tela: () => <AvaliacoesDaAcademia /> },
  aparencia: { nome: 'Página e app', papeis: PODE.configurar, tela: () => <PaginaEApp /> },
  plano: { nome: 'Plano', papeis: ['dono'], tela: () => <PlanoDaAcademia /> },
}

export default function Painel({ slug, secao = '', id }: { slug: string; secao?: string; id?: string }) {
  const s = SECOES[secao]
  useTitulo(secao === 'mais' ? 'Painel' : (s?.nome ?? 'Painel'))
  return (
    <AppPainel slug={slug}>
      {(c) => {
        if (secao === 'mais') return <MaisDoPainel c={c} />
        if (!s)
          return (
            <div className="cartao p-6 text-center">
              <p className="font-bold">Esta parte do painel não existe.</p>
              <Link para={`/painel/${slug}`} className="mt-3 inline-block text-sm underline">
                Voltar para a visão geral
              </Link>
            </div>
          )
        if (s.papeis && !s.papeis.includes(c.papel))
          return (
            <div className="cartao flex flex-col items-center gap-2 p-8 text-center">
              <PiLockSimple className="text-3xl text-fraco" />
              <p className="font-bold">
                {s.nome}: só {s.papeis.map((p) => NOMES_PAPEL[p].toLowerCase()).join(', ').replace(/, ([^,]+)$/, ' e $1')}.
              </p>
              <p className="text-sm text-suave">Peça para quem cuida da academia mudar o seu papel na equipe.</p>
            </div>
          )
        return s.tela(id)
      }}
    </AppPainel>
  )
}
