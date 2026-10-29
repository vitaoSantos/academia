import { useState } from 'react'
import { PiArrowRight, PiBarbellBold, PiClipboardText, PiDotsThreeOutline, PiFlameFill, PiHouse, PiUsersThree } from 'react-icons/pi'
import { Link } from '../../lib/rotas'
import { CORES_DESTAQUE, FONTES, ORDEM_FONTES, ORDEM_TEMAS, TEMAS } from '../../shared/temas'
import type { FonteTitulo, PresetVisual } from '../../shared/tipos'
import { ComMarca, LogoDaMarca } from '../marca/Marca'
import { Celular } from './Mockups'

// "Monte o seu app" (seção 18 do estudo): o nome, o estilo, a cor e a fonte mudam o celular do lado
// na hora. O que a pessoa escolhe aqui vai junto para o cadastro.

export function MonteSeuApp() {
  const [nome, setNome] = useState('Força Total')
  const [preset, setPreset] = useState<PresetVisual>('ferro')
  const [destaque, setDestaque] = useState<string | undefined>(undefined)
  const [fonte, setFonte] = useState<FonteTitulo | undefined>(undefined)
  const visual = { preset, ...(destaque ? { destaque } : {}), ...(fonte ? { fonte } : {}) }
  const busca = new URLSearchParams({ nome, estilo: preset, ...(destaque ? { cor: destaque.slice(1) } : {}) }).toString()

  return (
    <section className="margem mx-auto max-w-7xl py-16" aria-labelledby="monte">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="sobre">Para a academia e o personal</p>
          <h2 id="monte" className="titulo mt-2 text-5xl sm:text-6xl">
            Monte o seu app
          </h2>
          <p className="mt-4 max-w-xl text-suave">
            O aluno instala o app com o seu nome, a sua cor e a sua logo na tela inicial, sem loja. A página, as fichas, o treino ao vivo e até o boneco 3D vestem a sua marca.
          </p>

          <label className="mt-7 block max-w-md">
            <span className="rotulo">O nome no ícone</span>
            <input className="campo" value={nome} maxLength={24} onChange={(e) => setNome(e.target.value)} />
          </label>

          <p className="rotulo mt-6">O estilo</p>
          <div className="grid max-w-2xl grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Estilo">
            {ORDEM_TEMAS.map((id) => {
              const t = TEMAS[id]
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={preset === id}
                  onClick={() => {
                    setPreset(id)
                    setDestaque(undefined)
                    setFonte(undefined)
                  }}
                  className="rounded-2xl border border-linha p-2 text-left transition-colors aria-checked:border-anilha aria-checked:ring-2 aria-checked:ring-anilha"
                >
                  <span className="flex h-9 items-end gap-1 rounded-lg p-1.5" style={{ background: t.fundo }}>
                    <span className="h-full w-3 rounded" style={{ background: t.destaque }} />
                    <span className="h-3/5 w-3 rounded" style={{ background: t.superficie2 }} />
                    <span className="h-2/5 w-3 rounded" style={{ background: t.detalhe }} />
                  </span>
                  <span className="mt-1.5 block text-xs font-bold">{t.nome}</span>
                </button>
              )
            })}
          </div>

          <p className="rotulo mt-6">A cor</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor de destaque">
            {CORES_DESTAQUE.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={(destaque ?? TEMAS[preset].destaque) === c}
                aria-label={`Cor ${c}`}
                onClick={() => setDestaque(c)}
                className="size-8 rounded-full border border-linha-2 transition-transform aria-checked:scale-110 aria-checked:ring-2 aria-checked:ring-texto aria-checked:ring-offset-2 aria-checked:ring-offset-fundo"
                style={{ background: c }}
              />
            ))}
          </div>

          <label className="mt-6 block max-w-xs">
            <span className="rotulo">A fonte do título</span>
            <select className="campo" value={fonte ?? TEMAS[preset].fonte} onChange={(e) => setFonte(e.target.value as FonteTitulo)}>
              {ORDEM_FONTES.map((f) => (
                <option key={f} value={f}>
                  {FONTES[f].nome}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link para={`/comecar/academia?${busca}`} className="btn btn-anilha btn-g">
              Criar o app da academia <PiArrowRight />
            </Link>
            <Link para={`/comecar/personal?${busca}`} className="btn btn-contorno btn-g">
              Sou personal
            </Link>
          </div>
        </div>

        <Celular>
          <ComMarca visual={visual} className="h-full">
            <div className="flex h-[33rem] flex-col">
              <div className="flex items-center gap-2 px-4 pb-3">
                <LogoDaMarca visual={visual} nome={nome || 'Academia'} tamanho={30} />
                <span className="titulo truncate text-lg">{nome || 'Academia'}</span>
              </div>
              <div className="flex-1 space-y-2.5 overflow-hidden px-4">
                <p className="text-sm text-suave">Bom dia, Ana</p>
                <div className="cartao flex items-center gap-3 p-3">
                  <PiFlameFill className="text-2xl text-anilha-legivel" />
                  <div className="text-xs">
                    <p className="font-bold">6 semanas seguidas</p>
                    <p className="text-suave">3 de 4 treinos nesta semana</p>
                  </div>
                </div>
                <div className="cartao p-4">
                  <p className="text-[0.62rem] font-bold tracking-widest text-fraco uppercase">Treino de hoje</p>
                  <p className="titulo mt-1 text-2xl">B · Costas e bíceps</p>
                  <p className="text-xs text-suave">6 exercícios · uns 50 min</p>
                  <span className="btn btn-anilha btn-m mt-3 w-full">Começar</span>
                </div>
              </div>
              <p className="flex items-center gap-2 px-4 pb-3 text-[0.7rem] text-suave">
                <span className="size-2.5 shrink-0 rounded-full bg-anilha" />
                Até o boneco 3D acende nesta cor.
              </p>
              <div className="grid grid-cols-5 border-t border-linha px-2 pt-4 pb-4 text-[0.6rem] font-semibold text-fraco">
                {[<PiHouse key="a" />, <PiClipboardText key="b" />, <PiBarbellBold key="c" />, <PiUsersThree key="d" />, <PiDotsThreeOutline key="e" />].map((icone, i) => (
                  <span key={i} className={`flex flex-col items-center gap-0.5 text-xl ${i === 2 ? '' : ''}`}>
                    {i === 2 ? <span className="-mt-4 grid size-11 place-items-center rounded-full bg-anilha text-anilha-texto">{icone}</span> : icone}
                  </span>
                ))}
              </div>
            </div>
          </ComMarca>
        </Celular>
      </div>
    </section>
  )
}
