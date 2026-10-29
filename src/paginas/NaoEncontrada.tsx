import { Rodape } from '../components/layout/Rodape'
import { Topo } from '../components/layout/Topo'
import { Link } from '../lib/rotas'
import { useTitulo } from '../lib/titulo'

export default function NaoEncontrada({ mensagem }: { mensagem?: string }) {
  useTitulo('Página não encontrada')
  return (
    <div className="min-h-[100svh]">
      <Topo />
      <main className="margem mx-auto max-w-xl py-24 text-center">
        <p className="titulo text-[7rem] leading-none text-anilha-legivel">404</p>
        <h1 className="titulo mt-4 text-4xl">Essa página não existe</h1>
        <p className="mt-3 text-suave">{mensagem ?? 'Confira o endereço. Se era uma academia ou um personal, pode ser que a página tenha mudado de nome.'}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link para="/explorar" className="btn btn-anilha btn-m">
            Procurar no mapa
          </Link>
          <Link para="/" className="btn btn-contorno btn-m">
            Início
          </Link>
        </div>
      </main>
      <Rodape />
    </div>
  )
}
