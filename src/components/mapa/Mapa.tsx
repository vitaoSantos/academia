import { Map as MapaLibre, Marker, setWorkerUrl, type LngLatBoundsLike, type PaddingOptions, type StyleSpecification } from 'maplibre-gl'
import urlDoWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Tema } from '../../lib/tema'
import 'maplibre-gl/dist/maplibre-gl.css'

// O mapa (MapLibre + os mapas abertos do OpenFreeMap, com os prédios em 3D). No tema escuro o desenho
// do mapa escurece (os pinos ficam com as cores das marcas). Marcadores são componentes React (as
// unidades, os personais, você); linhas são caminhos [lng, lat]. Se os mapas não carregarem (rede
// bloqueada, fora do ar), entra um mapa desenhado com os mesmos marcadores.

setWorkerUrl(urlDoWorker)

export type Marcador = { id: string; lat: number; lng: number; conteudo: ReactNode; ancora?: 'center' | 'bottom'; z?: number; rumo?: number }
export type Linha = { id: string; caminho: [number, number][]; cor: string; largura?: number; tracejada?: boolean; opacidade?: number; brilho?: boolean }

type Camera = { lat: number; lng: number; zoom?: number; pitch?: number; bearing?: number }

type Props = {
  centro: { lat: number; lng: number }
  zoom?: number
  pitch?: number
  bearing?: number
  marcadores?: Marcador[]
  linhas?: Linha[]
  interativo?: boolean
  predios?: boolean
  regiao?: boolean // o mapa da região (várias cidades): o desenho de reserva fica na escala da estrada
  tema?: Tema
  ajustar?: { lat: number; lng: number }[] // enquadra estes pontos
  folga?: number | PaddingOptions
  seguir?: Camera | null // a câmera acompanha um ponto
  aoMoverCentro?: (c: { lat: number; lng: number }) => void
  aoArrastar?: () => void
  aoCarregar?: (m: MapaLibre) => void
  className?: string
}

const ESTILO = 'https://tiles.openfreemap.org/styles/positron'

// O mapa de reserva: quadras de ~250 m em volta do centro (ou, no mapa da região, uma malha de uns
// 20 km entre as cidades), nas cores do tema
function estiloDesenhado(centro: { lat: number; lng: number }, tema: Tema, regiao = false): StyleSpecification {
  const linhas: [number, number][][] = []
  const k = regiao ? 75 : 1
  const passo = 0.0024 * k
  // a região cobre um estado inteiro (o mapa pequeno da carona afasta muito); a cidade, alguns bairros
  const n = regiao ? 40 : 16
  const meio = regiao ? passo * n : 0.04
  for (let i = -n; i <= n; i++) {
    linhas.push([
      [centro.lng - meio, centro.lat + i * passo + (i % 3) * 0.0003 * k],
      [centro.lng + meio, centro.lat + i * passo - (i % 2) * 0.0005 * k],
    ])
    linhas.push([
      [centro.lng + i * passo + (i % 4) * 0.0004 * k, centro.lat - meio],
      [centro.lng + i * passo - (i % 3) * 0.0006 * k, centro.lat + meio],
    ])
  }
  const noite = tema === 'escuro'
  return {
    version: 8,
    sources: {
      ruas: { type: 'geojson', data: { type: 'FeatureCollection', features: linhas.map((coordinates) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } })) } },
    },
    layers: [
      { id: 'fundo', type: 'background', paint: { 'background-color': noite ? '#0d1017' : '#e9ecf0' } },
      { id: 'ruas', type: 'line', source: 'ruas', paint: { 'line-color': noite ? '#1b2030' : '#ffffff', 'line-width': regiao ? ['interpolate', ['linear'], ['zoom'], 5, 0.6, 9, 2.5] : ['interpolate', ['linear'], ['zoom'], 12, 1, 16, 8], 'line-opacity': regiao ? 0.7 : 0.95 } },
    ],
  }
}

function adicionarPredios(m: MapaLibre) {
  if (!m.getSource('openmaptiles') || m.getLayer('predios-3d')) return
  m.addLayer({
    id: 'predios-3d',
    type: 'fill-extrusion',
    source: 'openmaptiles',
    'source-layer': 'building',
    minzoom: 13.5,
    paint: {
      'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 6], 0, '#e4e2db', 30, '#d6d3ca'],
      'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 15, ['coalesce', ['get', 'render_height'], 6]],
      'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
      'fill-extrusion-opacity': 0.9,
    },
  })
}

function desenharLinhas(m: MapaLibre, linhas: Linha[]) {
  for (const l of linhas) {
    const dados = { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: l.caminho.length > 1 ? l.caminho : [...l.caminho, ...l.caminho] } }
    const fonte = m.getSource(`linha-${l.id}`) as { setData?: (d: unknown) => void } | undefined
    if (fonte?.setData) fonte.setData(dados)
    else {
      m.addSource(`linha-${l.id}`, { type: 'geojson', data: dados })
      if (l.brilho) {
        m.addLayer({
          id: `brilho-${l.id}`,
          type: 'line',
          source: `linha-${l.id}`,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': l.cor, 'line-width': (l.largura ?? 5) * 3.2, 'line-opacity': 0.22, 'line-blur': 6 },
        })
      }
      m.addLayer({
        id: `linha-${l.id}`,
        type: 'line',
        source: `linha-${l.id}`,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': l.cor, 'line-width': l.largura ?? 5, 'line-opacity': l.opacidade ?? 0.95, ...(l.tracejada ? { 'line-dasharray': [1.2, 1.8] } : {}) },
      })
    }
  }
  // tira as que saíram
  for (const camada of m.getStyle()?.layers ?? []) {
    const id = camada.id.replace(/^(linha|brilho)-/, '')
    if ((camada.id.startsWith('linha-') || camada.id.startsWith('brilho-')) && !linhas.some((l) => l.id === id)) m.removeLayer(camada.id)
  }
  for (const nome of Object.keys(m.getStyle()?.sources ?? {})) {
    if (nome.startsWith('linha-') && !linhas.some((l) => `linha-${l.id}` === nome)) m.removeSource(nome)
  }
}

export function Mapa({ centro, zoom = 14.6, pitch = 0, bearing = 0, marcadores = [], linhas = [], interativo = true, predios = true, regiao = false, tema = 'escuro', ajustar, folga = 70, seguir, aoMoverCentro, aoArrastar, aoCarregar, className = '' }: Props) {
  const caixa = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaLibre | null>(null)
  const pronto = useRef(false)
  const [carregou, setCarregou] = useState(false)
  const [reserva, setReserva] = useState(false)
  const elementos = useRef(new Map<string, { el: HTMLDivElement; marker: Marker | null }>())
  const linhasRef = useRef(linhas)
  linhasRef.current = linhas
  const aoMover = useRef(aoMoverCentro)
  aoMover.current = aoMoverCentro
  const aoMexer = useRef(aoArrastar)
  aoMexer.current = aoArrastar

  // cria o mapa uma vez
  useEffect(() => {
    if (!caixa.current) return
    const m = new MapaLibre({
      container: caixa.current,
      style: ESTILO,
      center: [centro.lng, centro.lat],
      zoom,
      pitch,
      bearing,
      interactive: interativo,
      attributionControl: { compact: true },
      maxPitch: 72,
      fadeDuration: 0,
    })
    mapa.current = m
    let desistiu = false
    const usarReserva = () => {
      if (desistiu || pronto.current) return
      desistiu = true
      setReserva(true)
      m.setStyle(estiloDesenhado(centro, tema, regiao))
    }
    const limite = setTimeout(usarReserva, 7000)
    m.on('error', (e) => {
      // o estilo não veio (sem rede para os mapas): mapa desenhado
      if (!pronto.current && /style|fetch|Failed|NetworkError|403/i.test(String(e.error?.message ?? ''))) usarReserva()
    })
    let avisou = false
    const avisarCarregou = () => {
      if (avisou) return
      avisou = true
      aoCarregar?.(m)
    }
    m.on('load', () => {
      pronto.current = true
      clearTimeout(limite)
      if (predios) adicionarPredios(m)
      desenharLinhas(m, linhasRef.current)
      setCarregou(true)
      avisarCarregou()
    })
    // quando o estilo de reserva entra, o 'load' pode já ter passado: redesenha as linhas
    m.on('styledata', () => {
      if (desistiu && m.isStyleLoaded()) {
        pronto.current = true
        desenharLinhas(m, linhasRef.current)
        setCarregou(true)
        avisarCarregou()
      }
    })
    m.on('moveend', () => {
      const c = m.getCenter()
      aoMover.current?.({ lat: c.lat, lng: c.lng })
    })
    m.on('dragstart', () => aoMexer.current?.())
    return () => {
      clearTimeout(limite)
      for (const item of elementos.current.values()) {
        item.marker?.remove()
        item.marker = null
      }
      m.remove()
      mapa.current = null
      pronto.current = false
    }
    // o mapa nasce uma vez; centro e zoom depois mudam pela câmera
  }, [])

  // linhas
  useEffect(() => {
    const m = mapa.current
    if (m && carregou && m.isStyleLoaded()) desenharLinhas(m, linhas)
  }, [linhas, carregou])

  // marcadores: um elemento por id, o conteúdo entra por portal (o React continua no controle)
  for (const mk of marcadores) {
    if (!elementos.current.has(mk.id)) {
      const el = document.createElement('div')
      elementos.current.set(mk.id, { el, marker: null })
    }
  }
  useEffect(() => {
    const m = mapa.current
    if (!m) return
    const ids = new Set(marcadores.map((x) => x.id))
    for (const [id, item] of elementos.current) {
      if (!ids.has(id)) {
        item.marker?.remove()
        elementos.current.delete(id)
      }
    }
    for (const mk of marcadores) {
      const item = elementos.current.get(mk.id)
      if (!item) continue
      if (mk.z !== undefined) item.el.style.zIndex = String(mk.z)
      if (!item.marker) {
        item.marker = new Marker({ element: item.el, anchor: mk.ancora ?? 'center', ...(mk.rumo !== undefined ? { rotation: mk.rumo, rotationAlignment: 'map', pitchAlignment: 'map' } : {}) })
          .setLngLat([mk.lng, mk.lat])
          .addTo(m)
      } else {
        item.marker.setLngLat([mk.lng, mk.lat])
        if (mk.rumo !== undefined) item.marker.setRotation(mk.rumo)
      }
    }
  })

  // enquadra os pontos
  const chaveAjuste = ajustar?.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|')
  const chaveFolga = JSON.stringify(folga)
  useEffect(() => {
    const m = mapa.current
    if (!m || !ajustar || ajustar.length < 2 || seguir) return
    const lngs = ajustar.map((p) => p.lng)
    const lats = ajustar.map((p) => p.lat)
    const limites: LngLatBoundsLike = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ]
    m.fitBounds(limites, { padding: folga, pitch, bearing, duration: carregou ? 900 : 0, maxZoom: regiao ? 10 : 16.4 })
  }, [chaveAjuste, chaveFolga, carregou, !!seguir])

  // a câmera acompanha
  useEffect(() => {
    const m = mapa.current
    if (!m || !seguir) return
    m.easeTo({ center: [seguir.lng, seguir.lat], zoom: seguir.zoom ?? m.getZoom(), pitch: seguir.pitch ?? m.getPitch(), bearing: seguir.bearing ?? m.getBearing(), duration: 900, essential: true })
  }, [seguir?.lat, seguir?.lng, seguir?.zoom, seguir?.pitch, seguir?.bearing])

  return (
    <div className={`overflow-hidden ${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} ${className}`}>
      {/* h-full, não absolute: o CSS do MapLibre (fora das camadas do Tailwind) põe position: relative no .maplibregl-map */}
      <div ref={caixa} className={`h-full w-full ${tema === 'escuro' && !reserva ? 'mapa-escuro' : ''}`} data-reserva={reserva || undefined} />
      {marcadores.map((mk) => {
        const item = elementos.current.get(mk.id)
        return item ? createPortal(mk.conteudo, item.el, mk.id) : null
      })}
      {!carregou && <div className="esqueleto absolute inset-0" />}
    </div>
  )
}

export type { MapaLibre }
