import { lazy } from 'react'
import { Carregando } from '../../components/ui/basicos'
import { ErroApi, mensagemDeErro, paginas } from '../../lib/api'
import { useDados } from '../../lib/dados'
import NaoEncontrada from '../NaoEncontrada'

// A raiz do site com um nome (turma.app/forca-total, turma.app/rafael-moreira): a academia ou o
// profissional, cada um com a sua marca

const PaginaEmpresa = lazy(() => import('./PaginaEmpresa'))
const PaginaProfissional = lazy(() => import('./PaginaProfissional'))

export default function Pagina({ slug }: { slug: string }) {
  const pagina = useDados(`pagina:${slug}`, () => paginas.ler(slug))
  const d = pagina.dados
  if (!d) {
    if (pagina.erro) return <NaoEncontrada mensagem={pagina.erro instanceof ErroApi && pagina.erro.status === 404 ? undefined : mensagemDeErro(pagina.erro)} />
    return <Carregando className="min-h-[100svh]" />
  }
  return d.tipo === 'empresa' ? <PaginaEmpresa d={d} recarregar={pagina.recarregar} /> : <PaginaProfissional d={d} recarregar={pagina.recarregar} />
}
