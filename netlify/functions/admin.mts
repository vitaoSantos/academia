import { PLATAFORMA_PADRAO } from '../../src/shared/planos.ts'
import type { ConfigPlataforma, Post } from '../../src/shared/tipos.ts'
import { adminLigado, cookieDoAdmin, eAdmin, entrarNoAdmin, exigirAdmin, motivoDe, pedeCodigo, registrar, saidaDoAdmin } from '../lib/admin.ts'
import { empresas, geral, moderacao, profissionais, registro, usuarios } from '../lib/admin-dados.ts'
import { lerConta, mudarConta } from '../lib/contas.ts'
import { mudarEmpresa, tirarDoIndice } from '../lib/empresas.ts'
import { falhar, json, lerCorpo, rotas } from '../lib/http.ts'
import { lerPlataforma } from '../lib/plataforma.ts'
import { mudarProfissional } from '../lib/profissionais.ts'
import type { Denuncia, LinhaFeed } from '../lib/rede.ts'
import { esquecerDemonstracao, garantirDemonstracao } from '../lib/semente.ts'
import { atualizar, blobs, CHAVES, gravarJSON } from '../lib/store.ts'

// O admin da plataforma (/admin): só com a senha (e o código do autenticador, se estiver ligado).
// GET ?aba=sessao|geral|empresas|profissionais|usuarios&q|moderacao|plataforma|registro&mes
//     (&demo=0 deixa a demonstração de fora)
// POST { acao }: entrar, sair, empresa, profissional, usuario, moderacao, plataforma, demo-recriar

const MES = /^\d{4}-(0[1-9]|1[0-2])$/

const sessao = (req: Request) => ({ ligado: adminLigado(), entrou: eAdmin(req), codigo: adminLigado() && pedeCodigo() })

function configDe(corpo: Record<string, unknown>, atual: ConfigPlataforma): ConfigPlataforma {
  const c = (corpo.config ?? {}) as Partial<ConfigPlataforma>
  const centavos = (v: unknown, padrao: number) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : padrao)
  const inteiro = (v: unknown, padrao: number, min: number, max: number) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Math.round(Number(v)))) : padrao)
  const p = { ...atual.precos, ...c.precos }
  const l = { ...atual.limites, ...c.limites }
  return {
    precos: {
      alunoMais: centavos(p.alunoMais, atual.precos.alunoMais),
      alunoMaisAno: centavos(p.alunoMaisAno, atual.precos.alunoMaisAno),
      personalBasico: centavos(p.personalBasico, atual.precos.personalBasico),
      personalPremium: centavos(p.personalPremium, atual.precos.personalPremium),
      academiaBasico: centavos(p.academiaBasico, atual.precos.academiaBasico),
      academiaPremium: centavos(p.academiaPremium, atual.precos.academiaPremium),
    },
    limites: {
      fichasProprias: inteiro(l.fichasProprias, atual.limites.fichasProprias, 0, 20),
      divisoesProprias: inteiro(l.divisoesProprias, atual.limites.divisoesProprias, 1, 7),
      diasGrafico: inteiro(l.diasGrafico, atual.limites.diasGrafico, 7, 730),
      fotosGratis: inteiro(l.fotosGratis, atual.limites.fotosGratis, 0, 100),
      desafiosGratis: inteiro(l.desafiosGratis, atual.limites.desafiosGratis, 0, 20),
      alunosPersonalBasico: inteiro(l.alunosPersonalBasico, atual.limites.alunosPersonalBasico, 1, 1000),
      alunosAcademiaBasico: inteiro(l.alunosAcademiaBasico, atual.limites.alunosAcademiaBasico, 10, 100_000),
    },
    descontoRede: Math.min(0.5, Math.max(0, Number(c.descontoRede ?? atual.descontoRede) || 0)),
    diasTeste: inteiro(c.diasTeste, atual.diasTeste, 0, 120),
    raioPadrao: [10, 25, 50, 100].includes(Number(c.raioPadrao)) ? Number(c.raioPadrao) : atual.raioPadrao,
    cadastroAberto: c.cadastroAberto === undefined ? atual.cadastroAberto : c.cadastroAberto === true,
    aviso: typeof c.aviso === 'string' ? c.aviso.replace(/\s+/g, ' ').trim().slice(0, 160) : atual.aviso,
  }
}

export default rotas({
  GET: async (req) => {
    const u = new URL(req.url).searchParams
    const aba = u.get('aba') || 'sessao'
    if (aba === 'sessao') return json(sessao(req))
    exigirAdmin(req)
    await garantirDemonstracao()
    const demo = u.get('demo') !== '0'
    switch (aba) {
      case 'geral':
        return json(await geral(demo))
      case 'empresas':
        return json({ empresas: await empresas(demo) })
      case 'profissionais':
        return json({ profissionais: await profissionais(demo) })
      case 'usuarios':
        return json({ usuarios: await usuarios((u.get('q') ?? '').slice(0, 60), demo) })
      case 'moderacao':
        return json(await moderacao())
      case 'plataforma':
        return json({ config: await lerPlataforma(), padrao: PLATAFORMA_PADRAO })
      case 'registro':
        return json(await registro(MES.test(u.get('mes') ?? '') ? (u.get('mes') as string) : undefined))
      default:
        return falhar(400, 'Aba desconhecida.')
    }
  },
  POST: async (req, context) => {
    const corpo = await lerCorpo(req)
    if (corpo.acao === 'entrar') {
      await entrarNoAdmin(corpo, context)
      return json({ ...sessao(req), entrou: true }, 200, { 'set-cookie': cookieDoAdmin(req) })
    }
    if (corpo.acao === 'sair') return json({ ...sessao(req), entrou: false }, 200, { 'set-cookie': saidaDoAdmin(req) })
    exigirAdmin(req)
    switch (corpo.acao) {
      case 'empresa': {
        const slug = String(corpo.slug ?? '')
        const motivo = motivoDe(corpo)
        const e = await mudarEmpresa(slug, (x) => {
          if (corpo.op === 'suspender') return { ...x, status: 'suspensa' }
          if (corpo.op === 'reativar') return { ...x, status: x.plano === 'teste' ? 'teste' : 'ativa' }
          if (corpo.op === 'plano') return { ...x, plano: corpo.plano === 'basico' ? 'basico' : 'premium', status: 'ativa' }
          if (corpo.op === 'teste') return { ...x, plano: 'teste', status: 'teste', testeAte: new Date(Math.max(Date.now(), Date.parse(x.testeAte ?? '') || 0) + Math.min(90, Math.max(1, Number(corpo.dias) || 15)) * 86_400_000).toISOString() }
          return falhar(400, 'O que fazer com a empresa?')
        })
        if (e.status === 'suspensa') await tirarDoIndice(slug)
        await registrar(`Empresa ${e.nome}: ${corpo.op}${corpo.op === 'plano' ? ` (${e.plano})` : ''}`, motivo)
        return json({ ok: true })
      }
      case 'profissional': {
        const motivo = motivoDe(corpo)
        const p = await mudarProfissional(String(corpo.id ?? ''), (x) => {
          if (corpo.op === 'suspender') return { ...x, status: 'suspenso' }
          if (corpo.op === 'reativar') return { ...x, status: 'ativo' }
          if (corpo.op === 'plano') return { ...x, plano: corpo.plano === 'basico' ? 'basico' : 'premium', status: 'ativo' }
          if (corpo.op === 'teste') return { ...x, plano: 'teste', status: 'teste', testeAte: new Date(Date.now() + Math.min(90, Math.max(1, Number(corpo.dias) || 15)) * 86_400_000).toISOString() }
          return falhar(400, 'O que fazer com o profissional?')
        })
        await registrar(`Profissional ${p.nome}: ${corpo.op}`, motivo)
        return json({ ok: true })
      }
      case 'usuario': {
        const motivo = motivoDe(corpo)
        const c = await lerConta(String(corpo.id ?? ''))
        if (!c) return falhar(404, 'Conta não encontrada.')
        await mudarConta(c.id, (x) => {
          if (corpo.op === 'bloquear') return { ...x, bloqueado: true, versao: x.versao + 1 }
          if (corpo.op === 'desbloquear') return { ...x, bloqueado: false }
          if (corpo.op === 'mais') return { ...x, plano: 'mais', maisAte: new Date(Date.now() + 365 * 86_400_000).toISOString() }
          if (corpo.op === 'gratis') return { ...x, plano: 'gratis', maisAte: undefined }
          return falhar(400, 'O que fazer com a conta?')
        })
        await registrar(`Conta ${c.nome} (@${c.usuario}): ${corpo.op}`, motivo)
        return json({ ok: true })
      }
      case 'moderacao': {
        const d = (await atualizar<Denuncia[]>(CHAVES.denuncias, [], (l) => l.map((x) => (x.id === corpo.id ? { ...x, resolvida: true } : x)))).find((x) => x.id === corpo.id)
        if (!d) return falhar(404, 'Denúncia não encontrada.')
        const decisao = corpo.decisao === 'liberar' ? 'liberar' : corpo.decisao === 'apagar' ? 'apagar' : 'ocultar'
        if (d.alvo.tipo === 'post') {
          if (decisao === 'apagar') {
            await blobs().delete(CHAVES.post(d.alvo.id))
            await atualizar<LinhaFeed[]>(CHAVES.feed, [], (l) => l.filter((x) => x.id !== d.alvo.id))
          } else {
            const oculto = decisao === 'ocultar'
            await atualizar<Post | null>(CHAVES.post(d.alvo.id), null, (p) => (p ? { ...p, oculto, denuncias: oculto ? p.denuncias : [] } : p))
            await atualizar<LinhaFeed[]>(CHAVES.feed, [], (l) => l.map((x) => (x.id === d.alvo.id ? { ...x, oculto: oculto || undefined } : x)))
          }
        }
        await registrar(`Moderação: ${decisao} (${d.alvo.tipo} denunciado por "${d.motivo}")`)
        return json(await moderacao())
      }
      case 'plataforma': {
        const config = configDe(corpo, await lerPlataforma())
        await gravarJSON(CHAVES.plataforma, config)
        await registrar('Mudou as regras da plataforma')
        return json({ config })
      }
      case 'demo-recriar': {
        await gravarJSON(CHAVES.semente, { versao: 0, em: 0 })
        esquecerDemonstracao()
        await garantirDemonstracao()
        await registrar('Recriou a demonstração')
        return json({ ok: true })
      }
      default:
        return falhar(400, 'Ação desconhecida.')
    }
  },
})
