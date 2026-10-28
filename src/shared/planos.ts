import type { ConfigPlataforma, Empresa, PlanoEmpresa, PlanoProfissional, Profissional, Usuario } from './tipos.ts'

// Os planos (seção 20 do estudo). Os preços e os limites ficam no admin; aqui estão os padrões e as
// regras de quem pode o quê. O que a academia e o personal pagam nunca trava o aluno deles: o limite
// do aluno é só no que ele faz sozinho.

export const PLATAFORMA_PADRAO: ConfigPlataforma = {
  precos: {
    alunoMais: 1290,
    alunoMaisAno: 9900,
    personalBasico: 3990,
    personalPremium: 7990,
    academiaBasico: 14900,
    academiaPremium: 27900,
  },
  limites: {
    fichasProprias: 1,
    divisoesProprias: 4,
    diasGrafico: 90,
    fotosGratis: 3,
    desafiosGratis: 1,
    alunosPersonalBasico: 15,
    alunosAcademiaBasico: 300,
  },
  descontoRede: 0.15,
  diasTeste: 30,
  raioPadrao: 50,
  cadastroAberto: true,
  aviso: '',
}

// ---------- O aluno ----------

export const alunoMais = (u: Pick<Usuario, 'plano' | 'maisAte'>, agora = Date.now()) => u.plano === 'mais' && (!u.maisAte || new Date(u.maisAte).getTime() > agora)

export const RECURSOS_ALUNO = {
  gratis: [
    'Fichas do professor e do personal sem limite',
    'Uma ficha sua (até 4 divisões)',
    'Treino ao vivo com o exercício em 3D',
    'Gráficos dos últimos 90 dias',
    'Medidas sem limite e 3 fotos de evolução',
    'Rede, chat e desafios',
  ],
  mais: [
    'Fichas suas sem limite',
    'Histórico e recordes completos',
    'Fotos de evolução sem limite, lado a lado',
    'Desafios sem limite, com prêmio',
    'O selo + na rede',
    'Nutrição com o prato em 3D (em breve)',
  ],
}

// ---------- O personal ----------

// No teste, tudo do premium; depois, o plano escolhido. Sem plano (o professor convidado), não
// atende por conta própria.
export function nivelProfissional(p: Pick<Profissional, 'plano' | 'testeAte' | 'status'>, agora = Date.now()): 'premium' | 'basico' | 'nenhum' {
  if (p.status === 'suspenso') return 'nenhum'
  if (p.plano === 'teste') return p.testeAte && new Date(p.testeAte).getTime() > agora ? 'premium' : 'nenhum'
  if (p.plano === 'premium') return 'premium'
  if (p.plano === 'basico') return 'basico'
  return 'nenhum'
}

export const limiteAlunosPersonal = (p: Pick<Profissional, 'plano' | 'testeAte' | 'status'>, config: ConfigPlataforma, agora = Date.now()) => {
  const nivel = nivelProfissional(p, agora)
  return nivel === 'premium' ? Infinity : nivel === 'basico' ? config.limites.alunosPersonalBasico : 0
}

export const RECURSOS_PERSONAL: Record<'basico' | 'premium', string[]> = {
  basico: [
    'Até 15 alunos ativos',
    'Fichas e modelos sem limite, com o 3D',
    'Agenda com os seus horários',
    'Página e app com a sua marca',
    'Avaliações e o cartão para o Instagram',
    'Chat com os alunos',
  ],
  premium: [
    'Alunos sem limite',
    'Destaque na sua região',
    'A fonte da sua marca',
    'Desafios para os seus alunos',
    'Relatório de frequência',
    'Exercícios seus com vídeo',
  ],
}

// ---------- A academia ----------

export function nivelEmpresa(e: Pick<Empresa, 'plano' | 'testeAte' | 'status'>, agora = Date.now()): 'premium' | 'basico' | 'nenhum' {
  if (e.status === 'suspensa') return 'nenhum'
  if (e.plano === 'teste') return e.testeAte && new Date(e.testeAte).getTime() > agora ? 'premium' : 'nenhum'
  return e.plano === 'premium' ? 'premium' : 'basico'
}

export const limiteAlunosEmpresa = (e: Pick<Empresa, 'plano' | 'testeAte' | 'status' | 'unidades'>, config: ConfigPlataforma, agora = Date.now()) => {
  const nivel = nivelEmpresa(e, agora)
  if (nivel === 'premium') return Infinity
  if (nivel === 'nenhum') return 0
  return config.limites.alunosAcademiaBasico * Math.max(1, e.unidades.filter((u) => u.ativa).length)
}

// O preço do mês da academia: por unidade, com o desconto da rede a partir de 3
export function mensalidadeEmpresa(plano: Exclude<PlanoEmpresa, 'teste'>, unidades: number, config: ConfigPlataforma) {
  const porUnidade = plano === 'premium' ? config.precos.academiaPremium : config.precos.academiaBasico
  const n = Math.max(1, unidades)
  const desconto = n >= 3 ? config.descontoRede : 0
  return Math.round(porUnidade * n * (1 - desconto))
}

export const RECURSOS_EMPRESA: Record<'basico' | 'premium', string[]> = {
  basico: [
    'Até 300 alunos ativos por unidade',
    'Professores sem limite',
    'Modalidades, grade e reserva de vaga',
    'Aula experimental e graduação de faixas',
    'Página, mapa e app com a sua marca',
    'Avaliações e chat',
  ],
  premium: [
    'Alunos sem limite',
    'Destaque na sua região',
    'Desafios oficiais e eventos',
    'Relatórios de frequência, fichas e aulas',
    'A fonte da sua marca',
    'Wellhub e TotalPass (em breve)',
  ],
}

export const NOMES_PLANO: Record<PlanoEmpresa | PlanoProfissional, string> = {
  teste: 'Teste grátis',
  basico: 'Básico',
  premium: 'Premium',
  nenhum: 'Sem plano',
}

// O destaque (seção 20.2): premium e com nota 4 ou mais (ou ainda "Novo")
export const temDestaque = (nivel: 'premium' | 'basico' | 'nenhum', nota: { media: number; total: number }) => nivel === 'premium' && (nota.total < 3 || nota.media >= 4)
export const MAX_DESTAQUES = 3
