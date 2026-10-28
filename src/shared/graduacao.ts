import type { Faixa, SistemaGraduacao } from './tipos.ts'

// As faixas das lutas (seção 8 do estudo). O jiu-jitsu segue o sistema geral de graduação da
// IBJJF (adulto e kids); nas outras, a sequência mais comum no Brasil. Cada federação, estilo ou
// grupo tem a sua: a academia ajusta a lista no painel.

const f = (id: string, nome: string, cor: string, ponta?: string, graus?: number): Faixa => ({ id, nome, cor, ...(ponta ? { ponta } : {}), ...(graus ? { graus } : {}) })

const C = {
  branca: '#f2f1ec',
  cinza: '#8d939c',
  amarela: '#f2c200',
  laranja: '#f07a12',
  verde: '#1f8f3a',
  azul: '#1f4fd8',
  azulClaro: '#5aa9ff',
  roxa: '#6b2fa8',
  marrom: '#6b3e1f',
  preta: '#141414',
  vermelha: '#d4252f',
  crua: '#e6dcc3',
}

export const SISTEMAS: Record<string, SistemaGraduacao> = {
  'jiu-jitsu': {
    id: 'jiu-jitsu',
    nome: 'Jiu-jitsu (IBJJF)',
    faixas: [f('branca', 'Branca', C.branca, undefined, 4), f('azul', 'Azul', C.azul, undefined, 4), f('roxa', 'Roxa', C.roxa, undefined, 4), f('marrom', 'Marrom', C.marrom, undefined, 4), f('preta', 'Preta', C.preta, undefined, 6)],
    kids: [
      f('branca', 'Branca', C.branca, undefined, 4),
      f('cinza-branca', 'Cinza e branca', C.cinza, C.branca, 4),
      f('cinza', 'Cinza', C.cinza, undefined, 4),
      f('cinza-preta', 'Cinza e preta', C.cinza, C.preta, 4),
      f('amarela-branca', 'Amarela e branca', C.amarela, C.branca, 4),
      f('amarela', 'Amarela', C.amarela, undefined, 4),
      f('amarela-preta', 'Amarela e preta', C.amarela, C.preta, 4),
      f('laranja-branca', 'Laranja e branca', C.laranja, C.branca, 4),
      f('laranja', 'Laranja', C.laranja, undefined, 4),
      f('laranja-preta', 'Laranja e preta', C.laranja, C.preta, 4),
      f('verde-branca', 'Verde e branca', C.verde, C.branca, 4),
      f('verde', 'Verde', C.verde, undefined, 4),
      f('verde-preta', 'Verde e preta', C.verde, C.preta, 4),
    ],
  },
  judo: {
    id: 'judo',
    nome: 'Judô',
    faixas: [f('branca', 'Branca', C.branca), f('cinza', 'Cinza', C.cinza), f('azul', 'Azul', C.azul), f('amarela', 'Amarela', C.amarela), f('laranja', 'Laranja', C.laranja), f('verde', 'Verde', C.verde), f('roxa', 'Roxa', C.roxa), f('marrom', 'Marrom', C.marrom), f('preta', 'Preta', C.preta)],
  },
  karate: {
    id: 'karate',
    nome: 'Karatê (varia por estilo)',
    faixas: [f('branca', 'Branca', C.branca), f('amarela', 'Amarela', C.amarela), f('vermelha', 'Vermelha', C.vermelha), f('laranja', 'Laranja', C.laranja), f('verde', 'Verde', C.verde), f('roxa', 'Roxa', C.roxa), f('marrom', 'Marrom', C.marrom), f('preta', 'Preta', C.preta)],
  },
  taekwondo: {
    id: 'taekwondo',
    nome: 'Taekwondo (gub e dan)',
    faixas: [
      f('branca', 'Branca', C.branca),
      f('branca-amarela', 'Branca, ponta amarela', C.branca, C.amarela),
      f('amarela', 'Amarela', C.amarela),
      f('amarela-verde', 'Amarela, ponta verde', C.amarela, C.verde),
      f('verde', 'Verde', C.verde),
      f('verde-azul', 'Verde, ponta azul', C.verde, C.azul),
      f('azul', 'Azul', C.azul),
      f('azul-vermelha', 'Azul, ponta vermelha', C.azul, C.vermelha),
      f('vermelha', 'Vermelha', C.vermelha),
      f('vermelha-preta', 'Vermelha, ponta preta', C.vermelha, C.preta),
      f('preta', 'Preta', C.preta, undefined, 9),
    ],
  },
  'muay-thai': {
    id: 'muay-thai',
    nome: 'Muay thai (prajied, varia por associação)',
    faixas: [f('branco', 'Branco', C.branca), f('vermelho', 'Vermelho', C.vermelha), f('azul-claro', 'Azul-claro', C.azulClaro), f('azul-escuro', 'Azul-escuro', C.azul), f('preto', 'Preto', C.preta)],
  },
  kickboxing: {
    id: 'kickboxing',
    nome: 'Kickboxing',
    faixas: [f('branca', 'Branca', C.branca), f('amarela', 'Amarela', C.amarela), f('laranja', 'Laranja', C.laranja), f('verde', 'Verde', C.verde), f('azul', 'Azul', C.azul), f('marrom', 'Marrom', C.marrom), f('preta', 'Preta', C.preta)],
  },
  capoeira: {
    id: 'capoeira',
    nome: 'Capoeira (cordas, cada grupo tem a sua)',
    faixas: [f('crua', 'Crua', C.crua), f('amarela', 'Amarela', C.amarela), f('laranja', 'Laranja', C.laranja), f('azul', 'Azul', C.azul), f('verde', 'Verde', C.verde), f('roxa', 'Roxa', C.roxa), f('marrom', 'Marrom', C.marrom), f('vermelha', 'Vermelha', C.vermelha)],
  },
}

export const faixaDe = (sistema: SistemaGraduacao | undefined, id: string, kids = false) => (kids ? sistema?.kids : sistema?.faixas)?.find((x) => x.id === id) ?? sistema?.faixas.find((x) => x.id === id) ?? sistema?.kids?.find((x) => x.id === id)

// A próxima faixa (para o botão "graduar") e se ainda cabe um grau na atual
export function proximaGraduacao(sistema: SistemaGraduacao, atual: { faixa: string; graus: number } | undefined, kids = false): { faixa: string; graus: number } {
  const lista = (kids && sistema.kids) || sistema.faixas
  if (!atual) return { faixa: lista[0].id, graus: 0 }
  const i = lista.findIndex((x) => x.id === atual.faixa)
  const faixa = lista[i]
  if (faixa?.graus && atual.graus < faixa.graus) return { faixa: faixa.id, graus: atual.graus + 1 }
  const proxima = lista[Math.min(lista.length - 1, i + 1)] ?? lista[0]
  return { faixa: proxima.id, graus: 0 }
}

export const textoFaixa = (faixa: Faixa | undefined, graus: number) => (faixa ? `Faixa ${faixa.nome.toLowerCase()}${graus ? ` · ${graus} ${graus === 1 ? 'grau' : 'graus'}` : ''}` : '')
