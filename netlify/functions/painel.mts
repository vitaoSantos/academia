import { HORA, agoraNoFuso, DATA, dataDe, diasEntre, hoje } from '../../src/shared/tempo.ts'
import { aulasDoDia } from '../../src/shared/aulas.ts'
import { situacao } from '../../src/shared/ficha.ts'
import { faixaDe, proximaGraduacao, textoFaixa } from '../../src/shared/graduacao.ts'
import { MODALIDADE, modalidadeInicial, nomeModalidade } from '../../src/shared/modalidades.ts'
import { limiteAlunosEmpresa, nivelEmpresa } from '../../src/shared/planos.ts'
import type { AlunosDoPainel, FichaDoPainel, VisaoDaEmpresa } from '../../src/shared/respostas.ts'
import { cidadeValida, pontoValido } from '../../src/shared/geo.ts'
import { limpar, limparTexto, normalizarInstagram, normalizarTelefone } from '../../src/shared/texto.ts'
import type { Aula, Cidade, Empresa, Evento, PapelEmpresa, SistemaGraduacao, Unidade } from '../../src/shared/tipos.ts'
import { visualNovo } from '../lib/aparencia.ts'
import { avisarSemFalhar } from '../lib/avisos.ts'
import { lerAvaliacoes } from '../lib/avaliacoes.ts'
import { lerConta, mudarConta, resumos } from '../lib/contas.ts'
import { exigirEquipe, mudarEmpresa, PODE } from '../lib/empresas.ts'
import { lerExperimentais, lerFolha } from '../lib/grade.ts'
import { falhar, json, lerCorpo, limitar, rotas, type Corpo } from '../lib/http.ts'
import { alunoParaProfissional } from '../lib/painelAluno.ts'
import { lerPlataforma } from '../lib/plataforma.ts'
import { garantirDemonstracao } from '../lib/semente.ts'
import { CHAVES, lerJSON, novoId } from '../lib/store.ts'
import { contarAlunosDaEmpresa, criarConvite, desvincular, exigirVaga, lerAlunos, mudarAlunoDoPainel, vincular } from '../lib/vinculos.ts'

// O painel da academia (ou da rede). Quem é da equipe vê; o dono e o gerente configuram; a recepção
// cuida dos alunos e da caixa de mensagens; o professor monta fichas, gradua e marca presença.
// GET ?slug&aba=empresa|visao|alunos|aluno&id|fichas|contatos|avaliacoes|aula&id&data
// POST { slug, acao }: perfil, aparencia, unidade, unidade-remover, modalidade, aula, aula-remover,
//      evento, evento-remover, convite, aluno, graduar, equipe, equipe-remover, plano,
//      agenda-professores

const SUMIDO = 10 // dias sem treinar

async function visao(e: Empresa): Promise<VisaoDaEmpresa> {
  const [alunos, fichas, experimentais, avaliacoes] = await Promise.all([lerAlunos({ tipo: 'empresa', id: e.slug }), lerJSON<FichaDoPainel[]>(CHAVES.fichasDaEmpresa(e.slug), []), lerExperimentais(e.slug), lerAvaliacoes({ tipo: 'empresa', id: e.slug })])
  const config = await lerPlataforma()
  const dia = hoje()
  const ativos = alunos.filter((a) => a.status === 'ativo')
  const limite = limiteAlunosEmpresa(e, config)
  // a ocupação das aulas de hoje com reserva, em todas as unidades
  const ocupacao: VisaoDaEmpresa['ocupacao'] = []
  for (const u of e.unidades.filter((x) => x.ativa)) {
    const folha = await lerFolha(e.slug, u.id, dia)
    for (const a of aulasDoDia(e.grade, u.id, dia).filter((x) => x.reserva && x.vagas)) ocupacao.push({ aula: a.id, modalidade: a.modalidade, unidade: u.nome, inicio: a.inicio, reservas: folha[a.id]?.reservas.length ?? 0, vagas: a.vagas })
  }
  return {
    alunos: { ativos: ativos.length, pendentes: alunos.filter((a) => a.status === 'pendente').length, sumidos: ativos.filter((a) => !a.ultimoTreino || diasEntre(dataDe(a.ultimoTreino), dia) > SUMIDO).length, limite: Number.isFinite(limite) ? limite : null },
    treinosSemana: ativos.reduce((n, a) => n + a.treinosSemana, 0),
    ocupacao: ocupacao.sort((a, b) => a.inicio.localeCompare(b.inicio)),
    fichasVencendo: fichas.filter((f) => f.status === 'ativa' && ['vencendo', 'vencida'].includes(situacao(f, dia))).sort((a, b) => a.previsao.localeCompare(b.previsao)).slice(0, 12),
    experimentais: experimentais.filter((p) => p.status === 'novo'),
    nota: e.numeros.nota,
    avaliacoes: avaliacoes.length,
  }
}

// ---------- Ações ----------

function unidadeDe(dado: unknown, atual?: Unidade): Unidade {
  const u = (dado ?? {}) as Record<string, unknown>
  const nome = limpar(u.nome, 30)
  const endereco = limpar(u.endereco, 120)
  if (!nome) falhar(400, 'Dê um nome para a unidade (Centro, Matriz...).')
  if (endereco.length < 5) falhar(400, 'Informe o endereço.')
  const cidade = cidadeValida(u.cidade) ? (u.cidade as Cidade) : atual?.cidade
  if (!cidade) falhar(400, 'Escolha a cidade.')
  const ponto = pontoValido(u.ponto) ? (u.ponto as { lat: number; lng: number }) : (atual?.ponto ?? { lat: cidade!.lat, lng: cidade!.lng })
  const horario = Array.isArray(u.horario)
    ? u.horario
        .map((h) => (h ?? {}) as Record<string, unknown>)
        .filter((h) => Number.isInteger(h.dia) && HORA.test(String(h.abre)) && HORA.test(String(h.fecha)))
        .map((h) => ({ dia: h.dia as number, abre: String(h.abre), fecha: String(h.fecha) }))
    : (atual?.horario ?? [])
  const preco = Math.round(Number(u.precoDesde) || 0)
  return {
    id: atual?.id ?? novoId().slice(-8),
    nome,
    endereco,
    ...(limpar(u.bairro, 40) ? { bairro: limpar(u.bairro, 40) } : {}),
    cidade: cidade!,
    ponto,
    ...(normalizarTelefone(u.whatsapp) ? { whatsapp: normalizarTelefone(u.whatsapp) } : {}),
    horario,
    comodidades: Array.isArray(u.comodidades) ? u.comodidades.map((c) => limpar(c, 30)).filter(Boolean).slice(0, 12) : (atual?.comodidades ?? []),
    agregadores: Array.isArray(u.agregadores) ? u.agregadores.filter((a): a is 'wellhub' | 'totalpass' => a === 'wellhub' || a === 'totalpass') : (atual?.agregadores ?? []),
    ...(preco > 0 ? { precoDesde: Math.min(preco, 1_000_000) } : {}),
    ativa: u.ativa !== false,
  }
}

function aulaDe(dado: unknown, e: Empresa, atual?: Aula): Aula {
  const a = (dado ?? {}) as Record<string, unknown>
  const modalidade = typeof a.modalidade === 'string' && e.modalidades.some((m) => m.id === a.modalidade) ? a.modalidade : ''
  if (!modalidade) falhar(400, 'Escolha uma modalidade que a academia oferece.')
  const unidade = typeof a.unidade === 'string' && e.unidades.some((u) => u.id === a.unidade) ? a.unidade : ''
  if (!unidade) falhar(400, 'Escolha a unidade.')
  const dias = Array.isArray(a.dias) ? [...new Set(a.dias.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : []
  if (!dias.length) falhar(400, 'Escolha os dias da semana.')
  const inicio = typeof a.inicio === 'string' && HORA.test(a.inicio) ? a.inicio : ''
  if (!inicio) falhar(400, 'Escolha o horário.')
  const professor = typeof a.professor === 'string' && e.equipe.some((m) => m.id === a.professor) ? a.professor : undefined
  const vagas = Math.min(500, Math.max(0, Math.round(Number(a.vagas) || 0)))
  const lugares = a.lugarMarcado ? Math.min(60, Math.max(1, Math.round(Number(a.lugares) || vagas || 1))) : undefined
  return {
    id: atual?.id ?? `a${novoId().slice(-7)}`,
    modalidade,
    unidade,
    dias,
    inicio,
    duracao: Math.min(240, Math.max(15, Math.round(Number(a.duracao) || 60))),
    ...(limpar(a.sala, 30) ? { sala: limpar(a.sala, 30) } : {}),
    ...(professor ? { professor } : {}),
    vagas,
    reserva: a.reserva === true && vagas > 0,
    ...(lugares && vagas > 0 ? { lugares: Math.min(lugares, vagas) } : {}),
    ...(limpar(a.nivel, 30) ? { nivel: limpar(a.nivel, 30) } : {}),
    ...(limpar(a.publico, 30) ? { publico: limpar(a.publico, 30) } : {}),
    ativa: a.ativa !== false,
  }
}

function graduacaoDe(dado: unknown, padrao?: SistemaGraduacao): SistemaGraduacao | undefined {
  if (!dado || typeof dado !== 'object') return padrao
  const g = dado as Record<string, unknown>
  const faixas = Array.isArray(g.faixas)
    ? g.faixas
        .map((f) => (f ?? {}) as Record<string, unknown>)
        .filter((f) => typeof f.id === 'string' && typeof f.nome === 'string' && /^#[0-9a-f]{6}$/i.test(String(f.cor)))
        .slice(0, 20)
        .map((f) => ({ id: limpar(f.id, 24), nome: limpar(f.nome, 30), cor: String(f.cor), ...(/^#[0-9a-f]{6}$/i.test(String(f.ponta)) ? { ponta: String(f.ponta) } : {}), ...(Number(f.graus) > 0 ? { graus: Math.min(10, Math.round(Number(f.graus))) } : {}) }))
    : []
  if (!faixas.length) return padrao
  return { id: padrao?.id ?? 'propria', nome: limpar(g.nome, 50) || padrao?.nome || 'Faixas da academia', faixas, ...(padrao?.kids ? { kids: padrao.kids } : {}) }
}

async function acao(corpo: Corpo, req: Request) {
  const slug = String(corpo.slug ?? '')
  switch (corpo.acao) {
    case 'perfil': {
      const { empresa } = await exigirEquipe(req, slug, PODE.configurar)
      const nome = limpar(corpo.nome, 50) || empresa.nome
      const descricao = limparTexto(corpo.descricao, 600)
      const instagram = normalizarInstagram(corpo.instagram)
      return mudarEmpresa(slug, (e) => ({ ...e, nome, descricao: descricao || undefined, instagram: instagram || undefined, site: typeof corpo.site === 'string' && /^https:\/\//.test(corpo.site) ? corpo.site.slice(0, 120) : undefined }))
    }
    case 'aparencia': {
      const { empresa } = await exigirEquipe(req, slug, PODE.configurar)
      const visual = await visualNovo(empresa.visual, corpo, empresa.dono, nivelEmpresa(empresa) === 'premium')
      return mudarEmpresa(slug, (e) => ({ ...e, visual }))
    }
    case 'unidade': {
      await exigirEquipe(req, slug, PODE.configurar)
      const id = (corpo.unidade as { id?: string } | undefined)?.id
      return mudarEmpresa(slug, (e) => {
        const atual = id ? e.unidades.find((u) => u.id === id) : undefined
        if (id && !atual) falhar(404, 'Unidade não encontrada.')
        if (!atual && e.unidades.length >= 30) falhar(409, 'A rede tem no máximo 30 unidades por aqui. Fale com a gente.')
        const u = unidadeDe(corpo.unidade, atual)
        return { ...e, tipo: e.unidades.length + (atual ? 0 : 1) > 1 && e.tipo === 'academia' ? 'rede' : e.tipo, unidades: atual ? e.unidades.map((x) => (x.id === u.id ? u : x)) : [...e.unidades, u] }
      })
    }
    case 'unidade-remover': {
      await exigirEquipe(req, slug, PODE.configurar)
      return mudarEmpresa(slug, (e) => {
        if (e.unidades.filter((u) => u.ativa).length <= 1) falhar(409, 'A academia precisa de pelo menos uma unidade ativa.')
        return { ...e, unidades: e.unidades.map((u) => (u.id === corpo.id ? { ...u, ativa: false } : u)) }
      })
    }
    case 'modalidade': {
      await exigirEquipe(req, slug, PODE.configurar)
      const id = String(corpo.id ?? '')
      if (!MODALIDADE[id]) falhar(404, 'Modalidade não encontrada.')
      return mudarEmpresa(slug, (e) => {
        if (corpo.ligada === false) return { ...e, modalidades: e.modalidades.filter((m) => m.id !== id), grade: e.grade.map((a) => (a.modalidade === id ? { ...a, ativa: false } : a)) }
        const atual = e.modalidades.find((m) => m.id === id) ?? modalidadeInicial(id)!
        const preco = Math.round(Number(corpo.precoDesde) || 0)
        const nova = {
          ...atual,
          ...(corpo.descricao !== undefined ? { descricao: limparTexto(corpo.descricao, 300) || undefined } : {}),
          ...(corpo.inclusa !== undefined ? { inclusa: corpo.inclusa === true } : {}),
          ...(corpo.precoDesde !== undefined ? { precoDesde: preco > 0 ? preco : undefined } : {}),
          ...(Array.isArray(corpo.niveis) ? { niveis: corpo.niveis.map((n) => limpar(n, 30)).filter(Boolean).slice(0, 8) } : {}),
          ...(Array.isArray(corpo.publicos) ? { publicos: corpo.publicos.map((n) => limpar(n, 30)).filter(Boolean).slice(0, 6) } : {}),
          ...(corpo.graduacao !== undefined ? { graduacao: corpo.graduacao === null ? undefined : graduacaoDe(corpo.graduacao, atual.graduacao) } : {}),
        }
        return { ...e, modalidades: e.modalidades.some((m) => m.id === id) ? e.modalidades.map((m) => (m.id === id ? nova : m)) : [...e.modalidades, nova] }
      })
    }
    case 'aula': {
      await exigirEquipe(req, slug, PODE.configurar)
      const id = (corpo.aula as { id?: string } | undefined)?.id
      return mudarEmpresa(slug, (e) => {
        const atual = id ? e.grade.find((a) => a.id === id) : undefined
        if (id && !atual) falhar(404, 'Aula não encontrada.')
        if (!atual && e.grade.length >= 400) falhar(409, 'A grade está cheia (400 aulas).')
        const a = aulaDe(corpo.aula, e, atual)
        return { ...e, grade: atual ? e.grade.map((x) => (x.id === a.id ? a : x)) : [...e.grade, a] }
      })
    }
    case 'aula-remover': {
      await exigirEquipe(req, slug, PODE.configurar)
      return mudarEmpresa(slug, (e) => ({ ...e, grade: e.grade.filter((a) => a.id !== corpo.id) }))
    }
    case 'evento': {
      const { empresa } = await exigirEquipe(req, slug, PODE.configurar)
      if (nivelEmpresa(empresa) !== 'premium') falhar(402, 'Os eventos são do plano Premium da academia.')
      const ev = (corpo.evento ?? {}) as Record<string, unknown>
      const titulo = limpar(ev.titulo, 60)
      const data = typeof ev.data === 'string' && DATA.test(ev.data) ? ev.data : ''
      const inicio = typeof ev.inicio === 'string' && HORA.test(ev.inicio) ? ev.inicio : ''
      if (!titulo || !data || !inicio) falhar(400, 'O evento precisa de nome, dia e horário.')
      if (data < hoje()) falhar(400, 'Escolha uma data de hoje em diante.')
      return mudarEmpresa(slug, (e) => {
        const id = typeof ev.id === 'string' && e.eventos.some((x) => x.id === ev.id) ? ev.id : `ev${novoId().slice(-8)}`
        const antes = e.eventos.find((x) => x.id === id)
        const novo: Evento = { id, titulo, ...(limparTexto(ev.descricao, 300) ? { descricao: limparTexto(ev.descricao, 300) } : {}), data, inicio, ...(typeof ev.unidade === 'string' && e.unidades.some((u) => u.id === ev.unidade) ? { unidade: ev.unidade } : {}), ...(typeof ev.modalidade === 'string' && MODALIDADE[ev.modalidade] ? { modalidade: ev.modalidade } : {}), vou: antes?.vou ?? [] }
        return { ...e, eventos: [...e.eventos.filter((x) => x.id !== id && x.data >= hoje()), novo].sort((a, b) => a.data.localeCompare(b.data)).slice(0, 60) }
      })
    }
    case 'evento-remover': {
      await exigirEquipe(req, slug, PODE.configurar)
      return mudarEmpresa(slug, (e) => ({ ...e, eventos: e.eventos.filter((x) => x.id !== corpo.id) }))
    }
    case 'agenda-professores': {
      await exigirEquipe(req, slug, PODE.configurar)
      return mudarEmpresa(slug, (e) => ({ ...e, agendaProfessores: corpo.ligada === true }))
    }
    case 'plano': {
      // no protótipo a assinatura é simulada: o plano muda na hora
      const { empresa } = await exigirEquipe(req, slug, ['dono'])
      const plano = corpo.plano === 'basico' ? 'basico' : 'premium'
      if (plano === 'basico') {
        const config = await lerPlataforma()
        const limite = config.limites.alunosAcademiaBasico * Math.max(1, empresa.unidades.filter((u) => u.ativa).length)
        const ativos = (await lerAlunos({ tipo: 'empresa', id: slug })).filter((a) => a.status === 'ativo').length
        if (ativos > limite) falhar(409, `A academia tem ${ativos} alunos ativos e o Básico vai até ${limite}. Fique no Premium ou abra outra unidade.`)
      }
      return mudarEmpresa(slug, (e) => ({ ...e, plano, planoDepois: plano, status: 'ativa', testeAte: e.status === 'teste' ? e.testeAte : undefined }))
    }
    case 'equipe': {
      const { empresa } = await exigirEquipe(req, slug, PODE.configurar)
      const papel = ['gerente', 'recepcao', 'professor'].includes(corpo.papel as string) ? (corpo.papel as PapelEmpresa) : null
      const membro = empresa.equipe.find((m) => m.id === corpo.id)
      if (!membro || membro.papel === 'dono' || !papel) falhar(400, 'Escolha a pessoa e o papel.')
      const unidades = Array.isArray(corpo.unidades) ? corpo.unidades.filter((u): u is string => typeof u === 'string' && empresa.unidades.some((x) => x.id === u)) : membro!.unidades
      const e = await mudarEmpresa(slug, (x) => ({ ...x, equipe: x.equipe.map((m) => (m.id === membro!.id ? { ...m, papel: papel!, unidades } : m)) }))
      await mudarConta(membro!.id, (c) => ({ ...c, empresas: (c.empresas ?? []).map((m) => (m.slug === slug ? { ...m, papel: papel! } : m)) }))
      return e
    }
    case 'equipe-remover': {
      await exigirEquipe(req, slug, PODE.configurar)
      const id = String(corpo.id ?? '')
      const e = await mudarEmpresa(slug, (x) => {
        if (x.dono === id) falhar(409, 'O dono não sai da equipe.')
        return { ...x, equipe: x.equipe.filter((m) => m.id !== id), grade: x.grade.map((a) => (a.professor === id ? { ...a, professor: undefined } : a)) }
      })
      await mudarConta(id, (c) => ({ ...c, empresas: (c.empresas ?? []).filter((m) => m.slug !== slug) })).catch(() => null)
      return e
    }
    default:
      return null
  }
}

export default rotas({
  GET: async (req) => {
    await garantirDemonstracao()
    const u = new URL(req.url).searchParams
    const slug = u.get('slug') ?? ''
    const { conta, empresa, papel } = await exigirEquipe(req, slug)
    const config = await lerPlataforma()
    switch (u.get('aba') ?? 'empresa') {
      case 'empresa':
        return json({ empresa, papel, nivel: nivelEmpresa(empresa), limite: Number.isFinite(limiteAlunosEmpresa(empresa, config)) ? limiteAlunosEmpresa(empresa, config) : null })
      case 'visao':
        return json(await visao(empresa))
      case 'alunos': {
        const limite = limiteAlunosEmpresa(empresa, config)
        const r: AlunosDoPainel = { alunos: await lerAlunos({ tipo: 'empresa', id: slug }), limite: Number.isFinite(limite) ? limite : null }
        return json(r)
      }
      case 'aluno':
        return json(await alunoParaProfissional(conta, u.get('id') ?? ''))
      case 'fichas':
        return json({ fichas: await lerJSON<FichaDoPainel[]>(CHAVES.fichasDaEmpresa(slug), []) })
      case 'contatos':
        return json({ pedidos: await lerExperimentais(slug) })
      case 'avaliacoes': {
        const lista = await lerAvaliacoes({ tipo: 'empresa', id: slug })
        const autores = await resumos(lista.map((a) => a.de))
        return json({ avaliacoes: lista.map((a) => ({ ...a, autor: autores.get(a.de) })) })
      }
      case 'aula': {
        const data = u.get('data') ?? agoraNoFuso().data
        const a = empresa.grade.find((x) => x.id === u.get('id'))
        if (!a || !DATA.test(data)) return falhar(404, 'Aula não encontrada.')
        const folha = await lerFolha(slug, a.unidade, data)
        const s = folha[a.id] ?? { reservas: [], espera: [], presentes: [] }
        return json({ aula: a, data, ...s, papel })
      }
      default:
        return falhar(400, 'Aba desconhecida.')
    }
  },
  POST: async (req) => {
    const corpo = await lerCorpo(req)
    const slug = String(corpo.slug ?? '')
    const { conta, papel } = await exigirEquipe(req, slug)
    await limitar('painel', conta.id, 300, 3600_000, 'Muitas mudanças em pouco tempo.')

    // as que mexem na empresa devolvem a empresa
    const mudou = await acao(corpo, req)
    if (mudou) return json({ empresa: mudou })

    switch (corpo.acao) {
      case 'convite': {
        const tipo = corpo.tipo === 'professor' ? 'professor' : 'aluno'
        if (tipo === 'professor' && !PODE.configurar.includes(papel)) falhar(403, 'Só o dono e o gerente convidam professores.')
        if (tipo === 'aluno' && !PODE.ver.includes(papel)) falhar(403, 'Sem acesso.')
        const e = await exigirEquipe(req, slug)
        const unidade = typeof corpo.unidade === 'string' && e.empresa.unidades.some((x) => x.id === corpo.unidade) ? corpo.unidade : undefined
        const convite = await criarConvite(tipo, { tipo: 'empresa', id: slug, ...(unidade ? { unidade } : {}) }, { nome: limpar(corpo.nome, 60) || undefined, contato: limpar(corpo.contato, 60) || undefined })
        return json({ convite }, 201)
      }
      case 'aluno': {
        if (!PODE.alunos.includes(papel) && papel !== 'professor') falhar(403, 'Sem acesso aos alunos.')
        const id = String(corpo.id ?? '')
        const aluno = await lerConta(id)
        if (!aluno) return falhar(404, 'Aluno não encontrado.')
        const { empresa } = await exigirEquipe(req, slug)
        switch (corpo.op) {
          case 'aprovar': {
            const alvo = (await lerAlunos({ tipo: 'empresa', id: slug })).find((a) => a.id === id)
            await exigirVaga({ tipo: 'empresa', id: slug })
            await vincular(aluno, { tipo: 'empresa', id: slug, unidade: alvo?.unidade }, 'pedido', 'ativo')
            avisarSemFalhar(id, 'vinculo', `A ${empresa.nome} confirmou: você é aluno de lá. O app agora tem a cara dela.`, `/${slug}`)
            break
          }
          case 'recusar':
          case 'remover':
            await desvincular(id, { tipo: 'empresa', id: slug })
            break
          case 'unidade':
            if (typeof corpo.unidade !== 'string' || !empresa.unidades.some((x) => x.id === corpo.unidade)) falhar(400, 'Escolha a unidade.')
            await mudarAlunoDoPainel({ tipo: 'empresa', id: slug }, id, (a) => ({ ...a, unidade: corpo.unidade as string }))
            break
          case 'responsavel':
            await mudarAlunoDoPainel({ tipo: 'empresa', id: slug }, id, (a) => ({ ...a, responsavel: empresa.equipe.some((m) => m.id === corpo.responsavel) ? (corpo.responsavel as string) : undefined }))
            break
          case 'modalidades':
            await mudarAlunoDoPainel({ tipo: 'empresa', id: slug }, id, (a) => ({ ...a, modalidades: Array.isArray(corpo.modalidades) ? corpo.modalidades.filter((m): m is string => typeof m === 'string' && empresa.modalidades.some((x) => x.id === m)) : a.modalidades }))
            break
          default:
            falhar(400, 'O que fazer com o aluno?')
        }
        await contarAlunosDaEmpresa(slug)
        return json({ alunos: await lerAlunos({ tipo: 'empresa', id: slug }) })
      }
      case 'graduar': {
        if (!PODE.treinar.includes(papel)) falhar(403, 'Só o professor gradua.')
        const { empresa } = await exigirEquipe(req, slug)
        const modalidade = empresa.modalidades.find((m) => m.id === corpo.modalidade)
        if (!modalidade?.graduacao) return falhar(400, 'Essa modalidade não tem faixas.')
        const id = String(corpo.aluno ?? '')
        const kids = corpo.kids === true
        let texto = ''
        await mudarAlunoDoPainel({ tipo: 'empresa', id: slug }, id, (a) => {
          const historico = a.faixas[modalidade.id] ?? []
          const atual = historico[historico.length - 1]
          const pedida = typeof corpo.faixa === 'string' ? { faixa: corpo.faixa, graus: Math.max(0, Math.round(Number(corpo.graus) || 0)) } : proximaGraduacao(modalidade.graduacao!, atual, kids)
          const faixa = faixaDe(modalidade.graduacao, pedida.faixa, kids)
          if (!faixa) falhar(400, 'Faixa desconhecida.')
          texto = textoFaixa(faixa, pedida.graus)
          return { ...a, faixas: { ...a.faixas, [modalidade.id]: [...historico, { faixa: faixa!.id, graus: Math.min(pedida.graus, faixa!.graus ?? 0), desde: new Date().toISOString(), por: conta.nome }] } }
        })
        const graduado = texto ? await lerConta(id) : null
        if (graduado) avisarSemFalhar(id, 'graduacao', `Parabéns! ${texto} de ${nomeModalidade(modalidade.id).toLowerCase()} na ${empresa.nome} 🥋`, `/u/${graduado.usuario}`)
        return json({ alunos: await lerAlunos({ tipo: 'empresa', id: slug }) })
      }
      default:
        return falhar(400, 'Ação desconhecida.')
    }
  },
})
