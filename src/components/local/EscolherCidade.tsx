import { useEffect, useId, useRef, useState } from 'react'
import { PiCrosshair, PiMagnifyingGlass, PiMapPin } from 'react-icons/pi'
import { buscarCidades, carregarCidades, cidadeDoPonto } from '../../lib/cidades'
import { definirLocal, minhaPosicao, useLocal } from '../../lib/local'
import { nomeCidade, RAIOS } from '../../shared/geo'
import type { Cidade } from '../../shared/tipos'
import { Girando } from '../ui/basicos'

// A busca de cidade (as 5.571 do IBGE, sem acento e sem maiúscula): "são lou" acha São Lourenço (MG)
export function EscolherCidade({ aoEscolher, placeholder = 'Sua cidade', autoFocus = false, inicial = '' }: { aoEscolher: (c: Cidade) => void; placeholder?: string; autoFocus?: boolean; inicial?: string }) {
  const [termo, setTermo] = useState(inicial)
  const [opcoes, setOpcoes] = useState<Cidade[]>([])
  const [destaque, setDestaque] = useState(0)
  const [aberto, setAberto] = useState(false)
  const id = useId()
  const pedido = useRef(0)

  useEffect(() => {
    const n = ++pedido.current
    if (termo.trim().length < 2) {
      setOpcoes([])
      return
    }
    void buscarCidades(termo).then((r) => {
      if (n !== pedido.current) return
      setOpcoes(r)
      setDestaque(0)
    })
  }, [termo])

  const escolher = (c: Cidade) => {
    setTermo(nomeCidade(c))
    setAberto(false)
    aoEscolher(c)
  }

  return (
    <div className="relative">
      <PiMagnifyingGlass className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg text-fraco" aria-hidden />
      <input
        className="campo pl-11"
        value={termo}
        placeholder={placeholder}
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={aberto && opcoes.length > 0}
        aria-controls={`${id}-lista`}
        aria-autocomplete="list"
        aria-label="Cidade"
        onFocus={() => {
          void carregarCidades()
          setAberto(true)
        }}
        onChange={(e) => {
          setTermo(e.target.value)
          setAberto(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setDestaque((d) => Math.min(opcoes.length - 1, d + 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setDestaque((d) => Math.max(0, d - 1))
          } else if (e.key === 'Enter' && opcoes[destaque]) {
            e.preventDefault()
            escolher(opcoes[destaque])
          } else if (e.key === 'Escape') setAberto(false)
        }}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
      />
      {aberto && opcoes.length > 0 && (
        <ul id={`${id}-lista`} role="listbox" className="absolute inset-x-0 top-full z-40 mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-linha bg-sup p-1.5 shadow-2xl">
          {opcoes.map((c, i) => (
            <li key={c.codigo} role="option" aria-selected={i === destaque}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(c)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm ${i === destaque ? 'bg-sup-2' : ''}`}
              >
                <PiMapPin className="shrink-0 text-fraco" />
                <span className="font-semibold">{c.nome}</span>
                <span className="text-fraco">{c.uf}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// "Onde você treina?": a cidade ou o GPS, e o raio da região (o padrão é 50 km)
export function EscolherLocal({ mostrarRaio = true, aoMudar }: { mostrarRaio?: boolean; aoMudar?: () => void }) {
  const local = useLocal()
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState('')

  const usarGps = async () => {
    setErro('')
    setBuscando(true)
    const p = await minhaPosicao()
    if (!p) {
      setBuscando(false)
      setErro('Não deu para pegar a sua localização. Escolha a cidade.')
      return
    }
    const cidade = await cidadeDoPonto(p)
    setBuscando(false)
    if (!cidade) return setErro('Não achamos a sua cidade. Escolha pelo nome.')
    definirLocal({ cidade, ponto: p, raio: local.raio, gps: true })
    aoMudar?.()
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <EscolherCidade
            key={local.cidade.codigo}
            inicial={local.escolhido ? nomeCidade(local.cidade) : ''}
            placeholder={local.escolhido ? nomeCidade(local.cidade) : 'Digite a sua cidade'}
            aoEscolher={(c) => {
              definirLocal({ cidade: c, ponto: { lat: c.lat, lng: c.lng }, raio: local.raio, gps: false })
              aoMudar?.()
            }}
          />
        </div>
        <button type="button" onClick={usarGps} disabled={buscando} className="btn btn-sup btn-m shrink-0 px-3.5" title="Usar a minha localização" aria-label="Usar a minha localização">
          {buscando ? <Girando /> : <PiCrosshair className="text-lg" />}
          <span className="hidden sm:inline">Perto de mim</span>
        </button>
      </div>
      {erro && <p className="text-xs font-medium text-perigo">{erro}</p>}
      {mostrarRaio && (
        <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Distância">
          <span className="mr-1 text-xs text-fraco">Até</span>
          {RAIOS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={local.raio === r}
              className="chip dado"
              onClick={() => {
                definirLocal({ ...local, raio: r })
                aoMudar?.()
              }}
            >
              {r} km
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
