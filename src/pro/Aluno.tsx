import { AlunoDetalhe } from '../components/aluno/AlunoDetalhe'
import { AppPro } from '../components/layout/AppPro'
import { Carregando, Erro } from '../components/ui/basicos'
import { mensagemDeErro, pro } from '../lib/api'
import { useDados } from '../lib/dados'
import { useTitulo } from '../lib/titulo'

// O aluno no painel do profissional
export default function Aluno({ id }: { id: string }) {
  const d = useDados(`pro-aluno:${id}`, () => pro.aluno(id))
  useTitulo(d.dados?.aluno.nome ?? 'Aluno')
  return (
    <AppPro voltar="/pro/alunos">
      {d.dados ? (
        <AlunoDetalhe
          d={d.dados}
          linkFicha={(f) => `/pro/fichas/${f}`}
          linkNovaFicha={(c) => `/pro/fichas/nova?aluno=${id}&contexto=${c.tipo}:${c.id}`}
        />
      ) : d.erro ? (
        <Erro mensagem={mensagemDeErro(d.erro)} aoTentar={d.recarregar} />
      ) : (
        <Carregando />
      )}
    </AppPro>
  )
}
