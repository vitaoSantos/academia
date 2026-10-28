import { situacao } from '../../src/shared/ficha.ts'
import { limiteAlunosPersonal, nivelProfissional } from '../../src/shared/planos.ts'
import type { FichaDoPainel, HojeDoProfissional } from '../../src/shared/respostas.ts'
import { agoraNoFuso, dataDe, diasEntre, hoje } from '../../src/shared/tempo.ts'
import { limpar } from '../../src/shared/texto.ts'
import type { LocalAtendimento } from '../../src/shared/tipos.ts'
import { visualNovo } from '../lib/aparencia.ts'
import { avisarSemFalhar } from '../lib/avisos.ts'
import { lerAvaliacoes } from '../lib/avaliacoes.ts'
import { lerConta, resumos } from '../lib/contas.ts'
import { lerEmpresa } from '../lib/empresas.ts'
import { falhar, json, lerCorpo, limitar, rotas } from '../lib/http.ts'
import { alunoParaProfissional } from '../lib/painelAluno.ts'
import { lerPlataforma } from '../lib/plataforma.ts'
import { exigirProfissional, mudarProfissional } from '../lib/profissionais.ts'
import { garantirDemonstracao } from '../lib/semente.ts'
import { sessoesDoDia } from '../lib/sessoes.ts'
import { CHAVES, lerJSON } from '../lib/store.ts'
import { criarConvite, desvincular, exigirVaga, lerAlunos, vincular } from '../lib/vinculos.ts'

// O painel do profissional (personal e professor): o dia, os alunos de personal e os das academias
// onde dá aula, as fichas, o perfil público, a aparência (o app do personal) e o plano.
// GET ?aba=hoje|alunos|aluno&id|fichas|perfil
// POST { acao }: aparencia, locais, publico, plano, convite, aluno (aceitar, recusar, remover)

const SUMIDO = 7

export default rotas({
  GET: async (req) => {
    await garantirDemonstracao()
    const u = new URL(req.url).searchParams
    const { conta, profissional } = await exigirProfissional(req)
    const config = await lerPlataforma()
    const academias = await Promise.all(
      (conta.empresas ?? [])
        .filter((m) => m.papel !== 'recepcao')
        .map(async (m) => {
          const e = await lerEmpresa(m.slug)
          return e ? { slug: e.slug, nome: e.nome, papel: m.papel, alunos: (await lerAlunos({ tipo: 'empresa', id: e.slug })).filter((a) => a.status === 'ativo') } : null
        }),
    )
    const lugares = academias.filter((a) => !!a)
    switch (u.get('aba') ?? 'hoje') {
      case 'hoje': {
        const [alunos, fichas, sessoes] = await Promise.all([lerAlunos({ tipo: 'profissional', id: profissional.id }), lerJSON<FichaDoPainel[]>(CHAVES.fichasDoProfissional(profissional.id), []), sessoesDoDia(profissional.id, agoraNoFuso().data)])
        const dia = hoje()
        const ativos = alunos.filter((a) => a.status === 'ativo')
        const limite = limiteAlunosPersonal(profissional, config)
        const r: HojeDoProfissional = {
          sessoes,
          vencendo: fichas.filter((f) => f.status === 'ativa' && ['vencendo', 'vencida'].includes(situacao(f, dia))).sort((a, b) => a.previsao.localeCompare(b.previsao)),
          alunosSumidos: ativos.filter((a) => !a.ultimoTreino || diasEntre(dataDe(a.ultimoTreino), dia) > SUMIDO),
          numeros: profissional.numeros,
          limite: profissional.personal && Number.isFinite(limite) ? limite : null,
          ativos: ativos.length,
          academias: lugares.map((a) => ({ slug: a!.slug, nome: a!.nome, papel: a!.papel, alunos: a!.alunos.length })),
        }
        return json(r)
      }
      case 'alunos': {
        const limite = limiteAlunosPersonal(profissional, config)
        return json({ personal: await lerAlunos({ tipo: 'profissional', id: profissional.id }), academias: lugares, limite: Number.isFinite(limite) ? limite : null, nivel: nivelProfissional(profissional) })
      }
      case 'aluno':
        return json(await alunoParaProfissional(conta, u.get('id') ?? ''))
      case 'fichas':
        return json({ fichas: await lerJSON<FichaDoPainel[]>(CHAVES.fichasDoProfissional(profissional.id), []) })
      case 'perfil': {
        const lista = await lerAvaliacoes({ tipo: 'profissional', id: profissional.id })
        const autores = await resumos(lista.map((a) => a.de))
        return json({ profissional, nivel: nivelProfissional(profissional), avaliacoes: lista.map((a) => ({ ...a, autor: autores.get(a.de) })), academias: lugares.map((a) => ({ slug: a!.slug, nome: a!.nome })) })
      }
      default:
        return falhar(400, 'Aba desconhecida.')
    }
  },
  POST: async (req) => {
    const corpo = await lerCorpo(req)
    const { conta, profissional } = await exigirProfissional(req)
    await limitar('pro', conta.id, 300, 3600_000, 'Muitas mudanças em pouco tempo.')
    switch (corpo.acao) {
      case 'aparencia': {
        const visual = await visualNovo(profissional.visual, corpo, conta.id, nivelProfissional(profissional) === 'premium')
        return json({ profissional: await mudarProfissional(conta.id, (p) => ({ ...p, visual })) })
      }
      case 'locais': {
        const locais: LocalAtendimento[] = []
        for (const l of Array.isArray(corpo.locais) ? corpo.locais.slice(0, 12) : []) {
          const x = (l ?? {}) as Record<string, unknown>
          if (x.tipo === 'domicilio' || x.tipo === 'online') locais.push({ tipo: x.tipo })
          else if (x.tipo === 'outro' && limpar(x.nome, 60)) locais.push({ tipo: 'outro', nome: limpar(x.nome, 60) })
          else if (x.tipo === 'unidade' && typeof x.empresa === 'string' && typeof x.unidade === 'string') {
            const e = await lerEmpresa(x.empresa)
            if (e?.unidades.some((u) => u.id === x.unidade)) locais.push({ tipo: 'unidade', empresa: e.slug, unidade: x.unidade as string })
          }
        }
        return json({ profissional: await mudarProfissional(conta.id, (p) => ({ ...p, locais, online: locais.some((l) => l.tipo === 'online') || p.online })) })
      }
      case 'publico':
        return json({ profissional: await mudarProfissional(conta.id, (p) => ({ ...p, publico: corpo.publico === true })) })
      case 'plano': {
        // no protótipo a assinatura é simulada: o plano muda na hora
        if (!profissional.personal) falhar(400, 'O plano é para quem atende como personal.')
        const plano = corpo.plano === 'basico' ? 'basico' : 'premium'
        return json({ profissional: await mudarProfissional(conta.id, (p) => ({ ...p, plano, status: 'ativo' })) })
      }
      case 'convite': {
        if (!profissional.personal) falhar(403, 'Convidar alunos é para quem atende como personal. Na academia, o convite sai do painel dela.')
        const convite = await criarConvite('aluno', { tipo: 'profissional', id: conta.id }, { nome: limpar(corpo.nome, 60) || undefined, contato: limpar(corpo.contato, 60) || undefined })
        return json({ convite }, 201)
      }
      case 'aluno': {
        const id = String(corpo.id ?? '')
        const aluno = await lerConta(id)
        if (!aluno) return falhar(404, 'Aluno não encontrado.')
        if (corpo.op === 'aceitar') {
          await exigirVaga({ tipo: 'profissional', id: conta.id })
          await vincular(aluno, { tipo: 'profissional', id: conta.id }, 'pedido', 'ativo')
          avisarSemFalhar(id, 'vinculo', `${conta.nome} aceitou você como aluno. Bora treinar!`, `/${profissional.slug}`)
        } else await desvincular(id, { tipo: 'profissional', id: conta.id })
        return json({ personal: await lerAlunos({ tipo: 'profissional', id: conta.id }) })
      }
      default:
        return falhar(400, 'Ação desconhecida.')
    }
  },
})
