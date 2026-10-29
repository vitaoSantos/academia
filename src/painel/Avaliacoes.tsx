import { Avaliacoes } from '../components/perfil/Avaliacoes'
import { Carregando, Erro } from '../components/ui/basicos'
import { mensagemDeErro, painel } from '../lib/api'
import { useDados } from '../lib/dados'
import { usePainel } from './AppPainel'

// As avaliações da academia (seção 14 do estudo): só quem treinou de verdade avalia; a resposta da
// academia aparece embaixo, na página

export function AvaliacoesDaAcademia() {
  const c = usePainel()
  const d = useDados(`painel-avaliacoes:${c.slug}`, () => painel.avaliacoes(c.slug))
  return (
    <div className="space-y-5">
      <header>
        <h1 className="titulo text-4xl">Avaliações</h1>
        <p className="mt-1 max-w-2xl text-sm text-suave">Só avalia quem treina (ou treinou) na academia, uma vez por pessoa. Responder com educação conta tanto quanto a nota: a resposta aparece na página.</p>
      </header>
      <div className="cartao p-5 sm:p-6">
        {!d.dados ? (
          d.erro ? (
            <Erro mensagem={mensagemDeErro(d.erro)} aoTentar={d.recarregar} />
          ) : (
            <Carregando />
          )
        ) : (
          <Avaliacoes alvo={{ tipo: 'empresa', id: c.slug }} nota={c.empresa.numeros.nota} lista={d.dados.avaliacoes} podeAvaliar={false} podeResponder aoMudar={() => void d.recarregar()} />
        )}
      </div>
    </div>
  )
}
