import { useEffect, useState } from 'react'
import { PiBarbellBold, PiImage, PiLockSimple, PiTextAa, PiTrash, PiUploadSimple } from 'react-icons/pi'
import { mensagemDeErro, urlMidia, type MudancaDeVisual } from '../../lib/api'
import { carregarFonte } from '../../lib/fontes'
import { lerArquivo, reduzirImagem } from '../../lib/imagem'
import { FONTES, ORDEM_FONTES, temaDe } from '../../shared/temas'
import type { FonteTitulo, Visual } from '../../shared/tipos'
import { useAviso } from '../ui/Aviso'
import { Campo, Girando } from '../ui/basicos'
import { EscolherEstilo } from './EscolherEstilo'
import { ComMarca, LogoDaMarca } from './Marca'

// A aparência do app (seção 18 do estudo), igual para a academia e o personal: o estilo, a cor, a
// fonte do título (ou a da marca, no Premium), a logo, a capa, o nome no ícone e a frase de
// boas-vindas. A prévia ao lado mostra o app do aluno como vai ficar.

export function EditorAparencia({ visual, nome, premium, aoSalvar }: { visual: Visual; nome: string; premium: boolean; aoSalvar: (m: MudancaDeVisual) => Promise<void> }) {
  const avisar = useAviso()
  const [v, setV] = useState<Visual>(visual)
  const [logo, setLogo] = useState<string | null>(null)
  const [capa, setCapa] = useState<string | null>(null)
  const [semLogo, setSemLogo] = useState(false)
  const [semCapa, setSemCapa] = useState(false)
  const [fonte, setFonte] = useState<{ arquivo: string; nome: string } | null>(null)
  const [semFonte, setSemFonte] = useState(false)
  const [salvando, setSalvando] = useState(false)
  useEffect(() => {
    for (const f of ORDEM_FONTES) carregarFonte(f)
  }, [])

  const salvar = async () => {
    setSalvando(true)
    try {
      await aoSalvar({
        visual: { preset: v.preset, destaque: v.destaque, fonte: v.fonte, nomeApp: v.nomeApp, boasVindas: v.boasVindas },
        ...(logo ? { logo } : semLogo ? { semLogo: true } : {}),
        ...(capa ? { capa } : semCapa ? { semCapa: true } : {}),
        ...(fonte ? { fonteArquivo: fonte.arquivo, fonteNome: fonte.nome } : semFonte ? { semFonte: true } : {}),
      })
      setLogo(null)
      setCapa(null)
      setFonte(null)
      avisar('Aparência salva. O app dos seus alunos já mudou.')
    } catch (e) {
      avisar(mensagemDeErro(e), 'erro')
    } finally {
      setSalvando(false)
    }
  }

  // a prévia usa a logo e a capa novas antes de salvar
  const logoPrevia = logo ?? (semLogo ? undefined : urlMidia(v.logo))
  const capaPrevia = capa ?? (semCapa ? undefined : urlMidia(v.capa))

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="space-y-6">
        <section aria-labelledby="estilo">
          <h3 id="estilo" className="mb-3 font-bold">
            Estilo e cor
          </h3>
          <EscolherEstilo preset={v.preset} destaque={v.destaque} aoMudar={(x) => setV((a) => ({ ...a, preset: x.preset, destaque: x.destaque }))} />
        </section>

        <section aria-labelledby="fonte">
          <h3 id="fonte" className="mb-3 flex items-center gap-2 font-bold">
            <PiTextAa /> Fonte dos títulos
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Fonte">
            {ORDEM_FONTES.map((f) => {
              const info = FONTES[f]
              const escolhida = (v.fonte ?? temaDe(v).fonte) === f && !v.fontePropria
              return (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={escolhida}
                  onClick={() => {
                    // escolher uma do catálogo deixa a fonte enviada de lado
                    setV((a) => ({ ...a, fonte: f as FonteTitulo, fontePropria: undefined }))
                    if (v.fontePropria) setSemFonte(true)
                    setFonte(null)
                  }}
                  className="rounded-2xl border border-linha px-3 py-2.5 text-left aria-checked:border-anilha aria-checked:ring-2 aria-checked:ring-anilha"
                >
                  <span className="block truncate text-2xl leading-tight" style={{ fontFamily: info.familia, fontWeight: info.peso, textTransform: info.caixaAlta ? 'uppercase' : 'none', letterSpacing: info.espaco }}>
                    {nome.split(' ')[0]}
                  </span>
                  <span className="block text-[0.7rem] text-fraco">{info.nome}</span>
                </button>
              )
            })}
          </div>
          <div className="mt-3 rounded-2xl border border-dashed border-linha-2 p-4">
            {premium ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold">A fonte da sua marca</span>
                  <span className="block text-xs text-suave">{fonte ? `${fonte.nome} (salve para usar)` : v.fontePropria ? `Usando: ${v.fontePropria.nome}` : 'Envie o arquivo .woff2, .woff ou .ttf'}</span>
                </p>
                <label className="btn btn-sup btn-p cursor-pointer">
                  <PiUploadSimple /> Enviar
                  <input
                    type="file"
                    accept=".woff2,.woff,.ttf,.otf,font/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      if (f.size > 900_000) return avisar('A fonte passa de 900 KB. Use a versão .woff2.', 'erro')
                      setFonte({ arquivo: await lerArquivo(f), nome: f.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 30) })
                      setSemFonte(false)
                    }}
                  />
                </label>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-suave">
                <PiLockSimple /> A fonte própria da marca é do plano Premium.
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="imagens" className="grid gap-4 sm:grid-cols-2">
          <h3 id="imagens" className="font-bold sm:col-span-2">
            Logo e capa
          </h3>
          <div className="rounded-2xl border border-linha p-4">
            <p className="text-sm font-semibold">Logo</p>
            <p className="text-xs text-suave">Quadrada, de preferência com o fundo transparente</p>
            <div className="mt-3 flex items-center gap-3">
              {logoPrevia ? <img src={logoPrevia} alt="" className="size-14 rounded-[22%] object-cover" /> : <LogoDaMarca visual={{ ...v, logo: undefined }} nome={nome} tamanho={56} />}
              <label className="btn btn-sup btn-p cursor-pointer">
                <PiImage /> Trocar
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (f) {
                      setLogo(await reduzirImagem(f, 512, 0.9, 'image/webp'))
                      setSemLogo(false)
                    }
                  }}
                />
              </label>
              {(logoPrevia || v.logo) && (
                <button
                  type="button"
                  className="btn btn-fantasma btn-p"
                  aria-label="Tirar a logo"
                  onClick={() => {
                    setLogo(null)
                    setSemLogo(true)
                  }}
                >
                  <PiTrash />
                </button>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-linha p-4">
            <p className="text-sm font-semibold">Capa da página</p>
            <p className="text-xs text-suave">A foto da academia, da sala, da turma</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="h-14 w-24 shrink-0 overflow-hidden rounded-xl bg-sup-2">{capaPrevia && <img src={capaPrevia} alt="" className="h-full w-full object-cover" />}</span>
              <label className="btn btn-sup btn-p cursor-pointer">
                <PiImage /> Trocar
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (f) {
                      setCapa(await reduzirImagem(f, 1600))
                      setSemCapa(false)
                    }
                  }}
                />
              </label>
              {(capaPrevia || v.capa) && (
                <button
                  type="button"
                  className="btn btn-fantasma btn-p"
                  aria-label="Tirar a capa"
                  onClick={() => {
                    setCapa(null)
                    setSemCapa(true)
                  }}
                >
                  <PiTrash />
                </button>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="textos" className="grid gap-4 sm:grid-cols-2">
          <h3 id="textos" className="font-bold sm:col-span-2">
            O app no celular do aluno
          </h3>
          <Campo rotulo="Nome no ícone" dica="Até 14 letras: aparece embaixo do ícone na tela do celular">
            <input className="campo" maxLength={14} value={v.nomeApp ?? ''} placeholder={nome.slice(0, 14)} onChange={(e) => setV((a) => ({ ...a, nomeApp: e.target.value || undefined }))} />
          </Campo>
          <Campo rotulo="Frase de boas-vindas" dica="O título do início do app">
            <input className="campo" maxLength={90} value={v.boasVindas ?? ''} placeholder="Bora treinar?" onChange={(e) => setV((a) => ({ ...a, boasVindas: e.target.value || undefined }))} />
          </Campo>
        </section>

        <button type="button" className="btn btn-anilha btn-m" disabled={salvando} onClick={salvar}>
          {salvando ? <Girando /> : 'Salvar a aparência'}
        </button>
      </div>

      {/* a prévia */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="sobre mb-2">Como o aluno vê</p>
        <ComMarca visual={{ ...v, logo: undefined }} className="overflow-hidden rounded-[2rem] border-8 border-[#1b1c20] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-linha px-4 py-3">
            {logoPrevia ? <img src={logoPrevia} alt="" className="size-7 rounded-[22%] object-cover" /> : <LogoDaMarca visual={{ ...v, logo: undefined }} nome={nome} tamanho={28} />}
            <span className="titulo truncate text-lg">{v.nomeApp || nome}</span>
          </div>
          {capaPrevia && <img src={capaPrevia} alt="" className="h-20 w-full object-cover" />}
          <div className="space-y-3 p-4">
            <p className="text-xs text-suave">Bom dia, Ana</p>
            <p className="titulo text-3xl leading-none">{v.boasVindas || 'Bora treinar?'}</p>
            <div className="rounded-[var(--m-raio)] bg-anilha p-4 text-anilha-texto">
              <p className="text-[0.6rem] font-bold tracking-widest uppercase opacity-75">Treino de hoje</p>
              <p className="titulo mt-1 text-3xl">Treino A</p>
              <p className="text-xs opacity-80">Peito, ombro e tríceps</p>
              <span className="btn btn-p mt-3 bg-[var(--anilha-texto)] text-[var(--anilha)]">
                <PiBarbellBold /> Começar
              </span>
            </div>
            <div className="cartao p-3 text-xs">
              <p className="font-bold">3 de 3 treinos na semana</p>
              <div className="mt-2 flex gap-1">
                {[1, 1, 1, 0, 0, 0, 0].map((x, i) => (
                  <span key={i} className={`h-6 flex-1 rounded-full ${x ? 'bg-anilha' : 'bg-sup-2'}`} />
                ))}
              </div>
            </div>
          </div>
        </ComMarca>
      </div>
    </div>
  )
}
