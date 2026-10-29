import { janelasValidas } from '../../src/shared/agenda.ts'
import type { SemanaDaAgenda } from '../../src/shared/respostas.ts'
import { agoraNoFuso, DATA, inicioDaSemana } from '../../src/shared/tempo.ts'
import { limpar } from '../../src/shared/texto.ts'
import { exigirConta } from '../lib/auth.ts'
import { lerConta } from '../lib/contas.ts'
import { falhar, json, lerCorpo, limitar, rotas } from '../lib/http.ts'
import { exigirProfissional, lerProfissional, mudarProfissional } from '../lib/profissionais.ts'
import { apagarFixa, criarFixa, lerFixas, livresNoDia, marcar, mudarSessao, professoresComAgenda, proximasDoAluno, semana } from '../lib/sessoes.ts'

// A agenda entre o personal e o aluno.
// GET ?livres&pro=<id>&data · ?semana[&de] (o profissional) · ?minhas (o aluno: as sessões e os
//     professores da academia dele que abriram a agenda)
// POST { acao }: marcar, mudar (cancelar, feita, faltou), fixa, fixa-apagar, config (o personal)

export default rotas({
  GET: async (req) => {
    const u = new URL(req.url).searchParams
    const conta = await exigirConta(req)
    if (u.has('livres')) {
      const p = await lerProfissional(u.get('pro') ?? '')
      if (!p) return falhar(404, 'Profissional não encontrado.')
      const data = u.get('data') ?? ''
      return json({ data, livres: DATA.test(data) ? await livresNoDia(p, data) : [], agenda: { duracao: p.agenda.duracao, alunoMarca: p.agenda.alunoMarca, locais: p.agenda.locais, cancelarAte: p.agenda.cancelarAte, ativa: p.agenda.ativa } })
    }
    if (u.has('semana')) {
      const { profissional } = await exigirProfissional(req)
      const de = u.get('de')
      const inicio = de && DATA.test(de) ? inicioDaSemana(de) : inicioDaSemana(agoraNoFuso().data)
      const r: SemanaDaAgenda = { dias: await semana(profissional.id, inicio), fixas: await lerFixas(profissional.id), agenda: profissional.agenda }
      return json(r)
    }
    if (u.has('minhas')) return json({ sessoes: await proximasDoAluno(conta.id), professores: await professoresComAgenda(conta.id) })
    return falhar(400, 'O que você quer ver?')
  },
  POST: async (req) => {
    const corpo = await lerCorpo(req)
    const conta = await exigirConta(req)
    await limitar('agenda', conta.id, 80, 3600_000, 'Muitas mudanças na agenda em pouco tempo.')
    switch (corpo.acao) {
      case 'marcar': {
        const p = await lerProfissional(String(corpo.pro ?? ''))
        if (!p) return falhar(404, 'Profissional não encontrado.')
        const s = await marcar(conta, p, { aluno: String(corpo.aluno ?? conta.id), data: corpo.data, inicio: corpo.inicio, local: corpo.local, obs: corpo.obs })
        return json({ sessao: s }, 201)
      }
      case 'mudar': {
        const p = await lerProfissional(String(corpo.pro ?? ''))
        if (!p) return falhar(404, 'Profissional não encontrado.')
        const status = corpo.status === 'feita' || corpo.status === 'faltou' ? corpo.status : 'cancelada'
        const data = typeof corpo.data === 'string' && DATA.test(corpo.data) ? corpo.data : ''
        if (!data) falhar(400, 'Qual dia?')
        return json({ sessao: await mudarSessao(conta, p, String(corpo.id ?? ''), data, status) })
      }
      case 'fixa': {
        const { profissional } = await exigirProfissional(req)
        const aluno = await lerConta(String(corpo.aluno ?? ''))
        if (!aluno) return falhar(404, 'Aluno não encontrado.')
        return json({ fixa: await criarFixa(profissional, aluno, { dias: corpo.dias, inicio: corpo.inicio, local: corpo.local }) }, 201)
      }
      case 'fixa-apagar': {
        const { profissional } = await exigirProfissional(req)
        await apagarFixa(profissional.id, String(corpo.id ?? ''))
        return json({ fixas: await lerFixas(profissional.id) })
      }
      case 'config': {
        const { profissional } = await exigirProfissional(req)
        const a = (corpo.agenda ?? {}) as Record<string, unknown>
        const p = await mudarProfissional(profissional.id, (x) => ({
          ...x,
          agenda: {
            ativa: a.ativa === true,
            janelas: janelasValidas(a.janelas),
            duracao: [30, 45, 50, 60, 75, 90].includes(Number(a.duracao)) ? Number(a.duracao) : x.agenda.duracao,
            antecedencia: Math.min(72, Math.max(0, Math.round(Number(a.antecedencia) || 0))),
            cancelarAte: Math.min(72, Math.max(0, Math.round(Number(a.cancelarAte) || 0))),
            alunoMarca: a.alunoMarca === true,
            locais: Array.isArray(a.locais) ? a.locais.map((l) => limpar(l, 40)).filter(Boolean).slice(0, 8) : x.agenda.locais,
          },
        }))
        return json({ agenda: p.agenda })
      }
      default:
        return falhar(400, 'Ação desconhecida.')
    }
  },
})
