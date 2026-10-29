import { useState, type ReactNode } from 'react'
import { PiCopy } from 'react-icons/pi'
import { EditorAparencia } from '../components/marca/EditorAparencia'
import { CartaoCompartilhar } from '../components/perfil/CartaoCompartilhar'
import { useAviso } from '../components/ui/Aviso'
import { Campo, Girando } from '../components/ui/basicos'
import { enderecoPublico } from '../data/marca'
import { mensagemDeErro, painel } from '../lib/api'
import { esquecer } from '../lib/dados'
import { Link } from '../lib/rotas'
import { textoNota } from '../shared/avaliacao'
import { nomeModalidade } from '../shared/modalidades'
import { numero } from '../shared/texto'
import { usePainel } from './AppPainel'

// A página e o app da academia (seções 3 e 6 do estudo): o link para a bio, o cartão com os números,
// o que a página diz e a cara do app que os alunos usam (cores, fonte, logo, capa e o nome no ícone)

function Secao({ id, titulo, descricao, children }: { id: string; titulo: string; descricao?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="cartao scroll-mt-24 p-5 sm:p-6" aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`} className="titulo text-2xl">
        {titulo}
      </h2>
      {descricao && <p className="mt-1 text-sm text-suave">{descricao}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

export function PaginaEApp() {
  const c = usePainel()
  const avisar = useAviso()
  const e = c.empresa
  const link = `https://${enderecoPublico(c.slug)}`
  const ativas = e.unidades.filter((u) => u.ativa)
  const cidades = [...new Set(ativas.map((u) => u.cidade.nome))]
  return (
    <div className="space-y-5">
      <h1 className="titulo text-4xl">Página e app</h1>
      <Secao id="pagina" titulo="A página" descricao="O link para a bio do Instagram, o WhatsApp e o Google. A página é sempre pública: é como a região acha a academia.">
        <div className="flex flex-wrap items-center gap-2">
          <Link para={`/${c.slug}`} className="dado min-w-0 flex-1 truncate rounded-xl bg-sup-2 px-4 py-3 text-sm font-semibold hover:bg-sup-3">
            {enderecoPublico(c.slug)}
          </Link>
          <button
            type="button"
            className="btn btn-sup btn-m"
            onClick={async () => {
              await navigator.clipboard?.writeText(link).catch(() => {})
              avisar('Link copiado.')
            }}
          >
            <PiCopy /> Copiar
          </button>
          <CartaoCompartilhar
            slug={c.slug}
            nome={e.nome}
            subtitulo={`${e.modalidades
              .slice(0, 3)
              .map((m) => nomeModalidade(m.id))
              .join(' · ')} · ${cidades.join(', ')}`}
            numeros={[
              { valor: numero(e.numeros.alunos), legenda: 'alunos' },
              { valor: numero(ativas.length), legenda: ativas.length === 1 ? 'unidade' : 'unidades' },
              { valor: numero(e.modalidades.length), legenda: 'modalidades' },
              { valor: textoNota(e.numeros.nota), legenda: e.numeros.nota.total ? `nota em ${e.numeros.nota.total} avaliações` : 'nota' },
            ]}
            visual={e.visual}
          />
        </div>
      </Secao>
      <Dados />
      <Secao id="aparencia" titulo="O app com a sua marca" descricao="Os alunos treinam no app com a cara da academia: as cores, a fonte, a logo, a capa da página e o nome no ícone do celular. A página muda junto.">
        <EditorAparencia
          visual={e.visual}
          nome={e.nome}
          premium={c.nivel === 'premium'}
          aoSalvar={async (m) => {
            c.mudar((await painel.aparencia(c.slug, m)).empresa)
            esquecer(`pagina:${c.slug}`)
          }}
        />
      </Secao>
    </div>
  )
}

function Dados() {
  const c = usePainel()
  const avisar = useAviso()
  const e = c.empresa
  const [nome, setNome] = useState(e.nome)
  const [descricao, setDescricao] = useState(e.descricao ?? '')
  const [instagram, setInstagram] = useState(e.instagram ?? '')
  const [site, setSite] = useState(e.site ?? '')
  const [salvando, setSalvando] = useState(false)
  const salvar = async () => {
    setSalvando(true)
    try {
      c.mudar((await painel.perfil(c.slug, { nome, descricao, instagram, site: site && !/^https:\/\//.test(site) ? `https://${site.replace(/^http:\/\//, '')}` : site })).empresa)
      esquecer(`pagina:${c.slug}`)
      avisar('Página atualizada.')
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setSalvando(false)
    }
  }
  return (
    <Secao id="dados" titulo="Sobre a academia" descricao="O que aparece no alto da página e no cartão do mapa. O endereço e o horário ficam em cada unidade.">
      <div className="space-y-4">
        <Campo rotulo="Nome">
          <input className="campo" maxLength={50} value={nome} onChange={(ev) => setNome(ev.target.value)} />
        </Campo>
        <Campo rotulo="Sobre" dica={`${descricao.length}/600`}>
          <textarea className="campo min-h-28" maxLength={600} value={descricao} onChange={(ev) => setDescricao(ev.target.value)} placeholder="A história, o jeito de treinar, o que tem de diferente..." />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Instagram">
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fraco">@</span>
              <input className="campo pl-8" maxLength={30} value={instagram} onChange={(ev) => setInstagram(ev.target.value.replace(/^@/, ''))} />
            </div>
          </Campo>
          <Campo rotulo="Site (opcional)">
            <input className="campo" inputMode="url" maxLength={120} value={site} onChange={(ev) => setSite(ev.target.value.trim())} placeholder="https://" />
          </Campo>
        </div>
        <button type="button" className="btn btn-anilha btn-m" disabled={salvando || nome.trim().length < 2} onClick={salvar}>
          {salvando ? <Girando /> : 'Salvar'}
        </button>
      </div>
    </Secao>
  )
}
