import { fichaVazia, Montador } from '../../components/ficha/Montador'
import { AppAluno } from '../../components/layout/AppAluno'
import { useAviso } from '../../components/ui/Aviso'
import { Carregando, Erro } from '../../components/ui/basicos'
import { fichas, mensagemDeErro, plataforma } from '../../lib/api'
import { esquecer, useDados } from '../../lib/dados'
import { Link, navegar } from '../../lib/rotas'
import { useSessao } from '../../lib/sessao'
import { useTitulo } from '../../lib/titulo'
import { MAX_DIVISOES } from '../../shared/ficha'
import { alunoMais } from '../../shared/planos'

// A ficha do próprio aluno (para treinar sozinho): no grátis, uma ficha com até 4 divisões; no
// Turma+, sem limite. Os exercícios são os do catálogo, com o 3D.

export default function MinhaFicha({ id }: { id?: string }) {
  useTitulo(id ? 'Editar a ficha' : 'Montar a minha ficha')
  const s = useSessao()
  const avisar = useAviso()
  const config = useDados('plataforma', () => plataforma.ler())
  const ficha = useDados(id ? `ficha:${id}` : null, () => fichas.ler(id!))
  const mais = s.usuario ? alunoMais(s.usuario) : false
  const limite = mais ? MAX_DIVISOES : (config.dados?.limites.divisoesProprias ?? 4)

  const carregando = (id && !ficha.dados) || !config.dados
  const f = ficha.dados?.ficha
  return (
    <AppAluno titulo={id ? 'Editar a ficha' : 'Montar a minha ficha'} voltar={id ? `/fichas/${id}` : '/fichas'}>
      {ficha.erro ? (
        <Erro mensagem={mensagemDeErro(ficha.erro)} />
      ) : carregando ? (
        <Carregando />
      ) : f && f.contexto.tipo !== 'propria' ? (
        <p className="text-suave">Esta ficha foi montada pelo seu professor: só ele muda. Combine pelo chat.</p>
      ) : (
        <>
          {!mais && (
            <p className="mb-4 text-sm text-suave">
              No plano grátis: uma ficha sua, até {limite} divisões.{' '}
              <Link para="/conta#mais" className="font-semibold text-texto underline">
                Turma+
              </Link>{' '}
              libera mais.
            </p>
          )}
          <Montador
            inicial={f ? { titulo: f.titulo, objetivo: f.objetivo, inicio: f.inicio, previsao: f.previsao, obs: f.obs, divisoes: f.divisoes } : fichaVazia()}
            limiteDivisoes={limite}
            datas={false}
            textoSalvar={id ? 'Salvar as mudanças' : 'Criar a ficha'}
            aoSalvar={async (x) => {
              try {
                const r = await fichas.salvar({ ...(id ? { id } : {}), titulo: x.titulo, objetivo: x.objetivo, obs: x.obs, divisoes: x.divisoes, contexto: { tipo: 'propria' }, publicar: true })
                esquecer('fichas:')
                esquecer('inicio:')
                esquecer(`ficha:${r.ficha.id}`)
                avisar(id ? 'Ficha salva.' : 'Ficha criada! Bora treinar.')
                navegar(`/fichas/${r.ficha.id}`, { substituir: true })
              } catch (e) {
                avisar(mensagemDeErro(e), 'erro')
              }
            }}
          />
        </>
      )}
    </AppAluno>
  )
}
