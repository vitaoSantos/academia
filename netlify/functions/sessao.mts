import type { Context } from '@netlify/functions'
import { AGENDA_PADRAO, AGENDA_PROFESSOR } from '../../src/shared/agenda.ts'
import { cidadeValida, pontoValido, raioValido } from '../../src/shared/geo.ts'
import { MODALIDADE, modalidadeInicial, SUGERIDAS } from '../../src/shared/modalidades.ts'
import type { RespostaSessao } from '../../src/shared/respostas.ts'
import { ESTILO_DO_TIPO, ORDEM_TEMAS } from '../../src/shared/temas.ts'
import { identificador, limpar, limparTexto, normalizarCref, normalizarInstagram, normalizarTelefone } from '../../src/shared/texto.ts'
import { corValida } from '../../src/shared/cores.ts'
import type { Cidade, Empresa, PresetVisual, Profissional, TipoEmpresa, Unidade, Visual } from '../../src/shared/tipos.ts'
import { contaDaRequisicao, cookieDeSaida, cookieDeSessao, exigirConta, protegerSenha, publico, senhaConfere, type ContaGuardada } from '../lib/auth.ts'
import { lerAvisos } from '../lib/avisos.ts'
import { apagarConta, contaPorLogin, criarConta, dadosDeCadastro, lerConta, mudarConta, SENHA_MINIMA, trocarUsuario } from '../lib/contas.ts'
import { listaDe, naoLida } from '../lib/conversas.ts'
import { indexarEmpresa, lerEmpresa } from '../lib/empresas.ts'
import { falhar, json, lerCorpo, limitar, quem, rotas, type Corpo } from '../lib/http.ts'
import { somarNoDia } from '../lib/estatisticas.ts'
import { guardarImagem } from '../lib/midia.ts'
import { reservarPagina, sugerirPagina } from '../lib/paginas.ts'
import { lerPlataforma } from '../lib/plataforma.ts'
import { indexarProfissional, lerProfissional, mudarProfissional } from '../lib/profissionais.ts'
import { mudarPrivacidadeDosPosts } from '../lib/rede.ts'
import { CONTAS_DEMO, criarAlunoDeVisita, garantirDemonstracao } from '../lib/semente.ts'
import { atualizar, blobs, CHAVES, criarSeNovo, novoId } from '../lib/store.ts'
import { anotarVisita } from '../lib/visitas.ts'

// Login, cadastro e a conta.
// GET: quem está logado (com o perfil profissional, as empresas e os avisos não lidos).
// POST { acao }: entrar, cadastro, sair, demo, perfil, privacidade, local, senha, consentimento,
//      principal, bloquear, desbloquear, mais, apagar, profissional (criar ou editar o perfil
//      profissional) e empresa (criar a academia ou a rede).

async function resposta(conta: ContaGuardada | null): Promise<RespostaSessao> {
  if (!conta) return { usuario: null }
  const [profissional, avisos, conversas] = await Promise.all([lerProfissional(conta.id), lerAvisos(conta.id), listaDe({ tipo: 'conta', id: conta.id })])
  const empresas = await Promise.all(
    (conta.empresas ?? []).map(async (m) => {
      const e = await lerEmpresa(m.slug)
      return e ? { tipo: 'empresa' as const, id: e.slug, slug: e.slug, nome: e.nome, visual: e.visual, papel: m.papel } : null
    }),
  )
  return {
    usuario: publico(conta),
    profissional,
    empresas: empresas.filter((e) => !!e),
    naoLidas: { avisos: avisos.filter((a) => !a.lido).length, mensagens: conversas.filter(naoLida).length },
  }
}

const comCookie = async (conta: ContaGuardada, req: Request, status = 200) => json(await resposta(conta), status, { 'set-cookie': cookieDeSessao(conta, req) })

// Trava depois de 8 senhas erradas seguidas para o mesmo login e endereço (15 minutos)
async function conferirTrava(chave: string) {
  const trava = await atualizar<{ erros: number; ate: number }>(CHAVES.trava(chave), { erros: 0, ate: 0 }, (t) => t)
  if (trava.ate > Date.now()) falhar(429, 'Muitas tentativas erradas. Espere alguns minutos e tente de novo.')
}

async function registrarErro(chave: string) {
  await atualizar<{ erros: number; ate: number }>(CHAVES.trava(chave), { erros: 0, ate: 0 }, (t) => {
    const erros = t.ate && t.ate < Date.now() ? 1 : t.erros + 1
    return erros >= 8 ? { erros: 0, ate: Date.now() + 15 * 60_000 } : { erros, ate: 0 }
  })
}

async function entrar(corpo: Corpo, req: Request, context: Context) {
  const login = identificador(corpo.login)
  const senha = typeof corpo.senha === 'string' ? corpo.senha : ''
  if (!login || !senha) falhar(400, 'Informe o e-mail (ou o celular) e a senha.')
  const chave = `login-${await quem(context, login!.valor)}`
  await conferirTrava(chave)
  const conta = await contaPorLogin(login!)
  if (!conta || conta.demo || conta.visita || !(await senhaConfere(senha, conta.senha))) {
    await registrarErro(chave)
    falhar(401, 'E-mail, celular ou senha incorretos.')
  }
  if (conta!.bloqueado) falhar(403, 'Esta conta foi bloqueada. Fale com o suporte.')
  return comCookie(conta!, req)
}

async function cadastro(corpo: Corpo, req: Request, context: Context) {
  const plataforma = await lerPlataforma()
  if (!plataforma.cadastroAberto) falhar(403, 'O cadastro está fechado no momento.')
  await limitar('cadastro', await quem(context), 6, 3600_000, 'Muitos cadastros deste endereço. Tente mais tarde.')
  const dados = dadosDeCadastro(corpo)
  const conta = await criarConta({ ...dados, publico: corpo.publico === true })
  await somarNoDia('cadastros')
  return comCookie(conta, req, 201)
}

// A demonstração: quem experimenta como aluno ganha a conta dele (some em um dia); o personal, o
// professor e a academia são as contas da demonstração
async function demo(corpo: Corpo, req: Request, context: Context) {
  await limitar('demo', await quem(context), 40, 3600_000, 'Muitas demonstrações deste endereço. Tente mais tarde.')
  await garantirDemonstracao()
  const papel = corpo.papel
  if (papel === 'personal' || papel === 'professor' || papel === 'academia') {
    const c = await lerConta(CONTAS_DEMO[papel])
    return c ? comCookie(c, req) : falhar(503, 'A demonstração ainda está sendo preparada. Tente de novo em instantes.')
  }
  const conta = await criarAlunoDeVisita()
  await anotarVisita(conta.id)
  return comCookie(conta, req)
}

async function perfil(corpo: Corpo, req: Request) {
  let conta = await exigirConta(req)
  const nome = limpar(corpo.nome, 60)
  if (nome.length < 2) falhar(400, 'Informe seu nome.')
  const bio = limparTexto(corpo.bio, 240)
  const meta = Math.min(7, Math.max(1, Math.round(Number(corpo.metaSemanal) || conta.metaSemanal)))
  if (typeof corpo.usuario === 'string' && corpo.usuario && corpo.usuario !== conta.usuario) conta = await trocarUsuario(conta, corpo.usuario)
  const foto = corpo.foto ? (await guardarImagem(conta.id, 'perfil', corpo.foto, { max: 700_000 })).id : corpo.semFoto ? undefined : conta.foto
  const nova = await mudarConta(conta.id, (c) => ({ ...c, nome, bio: bio || undefined, metaSemanal: meta, foto }))
  if (nova.profissional) await mudarProfissional(nova.id, (p) => ({ ...p, nome, ...(foto ? { foto } : {}) })).catch(() => null)
  return json(await resposta(nova))
}

async function privacidade(corpo: Corpo, req: Request) {
  const conta = await exigirConta(req)
  const publicoNovo = corpo.publico === true
  const nova = await mudarConta(conta.id, (c) => ({ ...c, publico: publicoNovo }))
  if (publicoNovo !== conta.publico) await mudarPrivacidadeDosPosts(conta.id, publicoNovo)
  return json(await resposta(nova))
}

async function local(corpo: Corpo, req: Request) {
  const conta = await exigirConta(req)
  if (!cidadeValida(corpo.cidade)) falhar(400, 'Escolha a cidade.')
  const cidade = corpo.cidade as Cidade
  const nova = await mudarConta(conta.id, (c) => ({ ...c, cidade: { codigo: cidade.codigo, nome: cidade.nome, uf: cidade.uf, lat: cidade.lat, lng: cidade.lng }, raio: raioValido(corpo.raio) }))
  return json(await resposta(nova))
}

async function trocarSenha(corpo: Corpo, req: Request) {
  const conta = await exigirConta(req)
  if (conta.demo || conta.visita) falhar(403, 'A senha da conta de demonstração não pode ser trocada.')
  const atual = typeof corpo.atual === 'string' ? corpo.atual : ''
  const nova = typeof corpo.nova === 'string' ? corpo.nova : ''
  if (!(await senhaConfere(atual, conta.senha))) falhar(401, 'A senha atual não confere.')
  if (nova.length < SENHA_MINIMA) falhar(400, `A nova senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`)
  const senha = await protegerSenha(nova)
  // trocar a versão derruba as sessões abertas em outros aparelhos
  const atualizada = await mudarConta(conta.id, (c) => ({ ...c, senha, versao: c.versao + 1 }))
  return comCookie(atualizada, req)
}

// Quem pode ver as medidas: um interruptor por profissional (ou pela academia)
async function consentimento(corpo: Corpo, req: Request) {
  const conta = await exigirConta(req)
  const alvo = typeof corpo.alvo === 'string' ? corpo.alvo : ''
  if (!/^(empresa:[a-z0-9-]{3,40}|[a-z0-9]{8,40})$/.test(alvo)) falhar(400, 'Escolha quem pode ver.')
  const permitir = corpo.permitir === true
  const nova = await mudarConta(conta.id, (c) => {
    const lista = new Set(c.consentimentos.medidas)
    if (permitir) lista.add(alvo)
    else lista.delete(alvo)
    return { ...c, consentimentos: { ...c.consentimentos, medidas: [...lista] } }
  })
  return json(await resposta(nova))
}

async function principal(corpo: Corpo, req: Request) {
  const conta = await exigirConta(req)
  const tipo = corpo.tipo === 'empresa' || corpo.tipo === 'profissional' ? corpo.tipo : null
  const id = typeof corpo.id === 'string' ? corpo.id : ''
  const nova = await mudarConta(conta.id, (c) => ({ ...c, principal: tipo && id ? { tipo, id } : undefined }))
  return json(await resposta(nova))
}

async function bloquear(corpo: Corpo, req: Request, bloqueia: boolean) {
  const conta = await exigirConta(req)
  const id = typeof corpo.id === 'string' ? corpo.id : ''
  const outra = await lerConta(id)
  if (!outra || outra.id === conta.id) return falhar(404, 'Pessoa não encontrada.')
  const nova = await mudarConta(conta.id, (c) => ({ ...c, bloqueados: bloqueia ? [...new Set([...(c.bloqueados ?? []), id])] : (c.bloqueados ?? []).filter((x) => x !== id) }))
  await mudarConta(id, (c) => ({ ...c, bloqueadoPor: bloqueia ? [...new Set([...(c.bloqueadoPor ?? []), conta.id])] : (c.bloqueadoPor ?? []).filter((x) => x !== conta.id) }))
  return json(await resposta(nova))
}

// O Turma+ no protótipo: a assinatura é simulada (30 dias, sem cobrança)
async function mais(corpo: Corpo, req: Request) {
  const conta = await exigirConta(req)
  const ligar = corpo.ligar !== false
  const nova = await mudarConta(conta.id, (c) => (ligar ? { ...c, plano: 'mais', maisAte: new Date(Date.now() + 30 * 86_400_000).toISOString() } : { ...c, plano: 'gratis', maisAte: undefined }))
  return json(await resposta(nova))
}

async function apagar(corpo: Corpo, req: Request) {
  const conta = await exigirConta(req)
  if (conta.demo) falhar(403, 'A conta da demonstração não pode ser apagada.')
  if (!conta.visita && !(await senhaConfere(typeof corpo.senha === 'string' ? corpo.senha : '', conta.senha))) falhar(401, 'A senha não confere.')
  if (conta.empresas?.some((e) => e.papel === 'dono')) falhar(409, 'Passe a academia para outra pessoa (ou fale com o suporte) antes de apagar a conta.')
  await apagarConta(conta)
  return json({ usuario: null }, 200, { 'set-cookie': cookieDeSaida(req) })
}

// ---------- O perfil profissional (personal e professor) ----------

function visualDe(dado: unknown, padrao: PresetVisual): Visual {
  const v = (dado ?? {}) as Record<string, unknown>
  const preset = ORDEM_TEMAS.includes(v.preset as PresetVisual) ? (v.preset as PresetVisual) : padrao
  return { preset, ...(corValida(v.destaque) ? { destaque: v.destaque } : {}) }
}

async function profissional(corpo: Corpo, req: Request) {
  const conta = await exigirConta(req)
  const config = await lerPlataforma()
  const atual = await lerProfissional(conta.id)
  const personal = corpo.personal === true || (atual?.personal ?? false)
  const cidade = cidadeValida(corpo.cidade) ? (corpo.cidade as Cidade) : (atual?.cidade ?? conta.cidade)
  if (!cidade) falhar(400, 'Escolha a cidade onde você atende.')
  const especialidades = Array.isArray(corpo.especialidades) ? [...new Set(corpo.especialidades.map((x) => limpar(x, 30)).filter(Boolean))].slice(0, 8) : (atual?.especialidades ?? [])
  const modalidades = Array.isArray(corpo.modalidades) ? [...new Set(corpo.modalidades.filter((x): x is string => typeof x === 'string' && !!MODALIDADE[x]))].slice(0, 12) : (atual?.modalidades ?? ['musculacao'])
  const cref = corpo.cref ? normalizarCref(corpo.cref) : (atual?.cref ?? '')
  if (corpo.cref && !cref) falhar(400, 'O CREF fica assim: 012345-G/MG.')
  const whatsapp = corpo.whatsapp ? normalizarTelefone(corpo.whatsapp) : atual?.whatsapp
  const instagram = corpo.instagram ? normalizarInstagram(corpo.instagram) : atual?.instagram
  const bio = corpo.bio !== undefined ? limparTexto(corpo.bio, 600) : atual?.bio
  const raioKm = Math.min(150, Math.max(1, Math.round(Number(corpo.raioKm) || atual?.raioKm || 15)))
  const publicoPro = corpo.publico !== undefined ? corpo.publico === true : (atual?.publico ?? true)
  const agora = Date.now()

  if (!atual) {
    const slug = await reservarPagina(typeof corpo.slug === 'string' && corpo.slug ? corpo.slug : await sugerirPagina(conta.nome), { tipo: 'profissional', id: conta.id })
    const p: Profissional = {
      id: conta.id,
      slug,
      nome: conta.nome,
      personal,
      ...(cref ? { cref } : {}),
      especialidades,
      modalidades,
      ...(bio ? { bio } : {}),
      ...(conta.foto ? { foto: conta.foto } : {}),
      cidade: cidade!,
      raioKm,
      online: corpo.online === true,
      locais: personal ? [{ tipo: 'domicilio' }] : [],
      publico: publicoPro,
      visual: visualDe(corpo.visual, ESTILO_DO_TIPO.personal),
      plano: personal ? 'teste' : 'nenhum',
      ...(personal ? { testeAte: new Date(agora + config.diasTeste * 86_400_000).toISOString() } : {}),
      status: personal ? 'teste' : 'ativo',
      agenda: personal ? { ...AGENDA_PADRAO, locais: ['Domicílio'] } : AGENDA_PROFESSOR,
      numeros: { alunosInstruidos: 0, alunosAtivos: 0, fichas: 0, treinos: 0, nota: { media: 0, total: 0 } },
      ...(whatsapp ? { whatsapp } : {}),
      ...(instagram ? { instagram } : {}),
      criadoEm: new Date(agora).toISOString(),
      ...(conta.demo || conta.visita ? { demo: true } : {}),
    }
    await blobs().setJSON(CHAVES.profissional(conta.id), p)
    await indexarProfissional(p)
    const nova = await mudarConta(conta.id, (c) => ({ ...c, profissional: true }))
    return json(await resposta(nova), 201)
  }

  await mudarProfissional(conta.id, (p) => ({
    ...p,
    personal,
    // virar personal agora: começa o teste de 30 dias com a agenda aberta
    ...(personal && !p.personal ? { plano: 'teste' as const, testeAte: new Date(agora + config.diasTeste * 86_400_000).toISOString(), status: 'teste' as const, agenda: { ...AGENDA_PADRAO, locais: ['Domicílio'] } } : {}),
    cref: cref || undefined,
    especialidades,
    modalidades,
    bio: bio || undefined,
    cidade: cidade!,
    raioKm,
    online: corpo.online !== undefined ? corpo.online === true : p.online,
    publico: publicoPro,
    whatsapp: whatsapp || undefined,
    instagram: instagram || undefined,
  }))
  return json(await resposta(await lerConta(conta.id)))
}

// ---------- Criar a academia (ou a rede): 30 dias com tudo liberado ----------

const TIPOS: TipoEmpresa[] = ['academia', 'rede', 'estudio', 'box', 'ct', 'danca', 'aquatica']

const HORARIO_PADRAO = [1, 2, 3, 4, 5].map((dia) => ({ dia, abre: '06:00', fecha: '22:00' })).concat([{ dia: 6, abre: '08:00', fecha: '14:00' }])

async function criarEmpresa(corpo: Corpo, req: Request, context: Context) {
  await garantirDemonstracao()
  const plataforma = await lerPlataforma()
  if (!plataforma.cadastroAberto) falhar(403, 'O cadastro de empresas está fechado no momento.')
  await limitar('cadastro', await quem(context), 6, 3600_000, 'Muitos cadastros deste endereço. Tente mais tarde.')
  // o nome da academia vem em `empresa`; o `nome` é o de quem cadastra (quando cria a conta junto)
  const nome = limpar(corpo.empresa, 50)
  if (nome.length < 2) falhar(400, 'Informe o nome da academia.')
  const tipo = TIPOS.includes(corpo.tipo as TipoEmpresa) ? (corpo.tipo as TipoEmpresa) : 'academia'
  if (!cidadeValida(corpo.cidade)) falhar(400, 'Escolha a cidade da primeira unidade.')
  const cidade = corpo.cidade as Cidade
  const u = (corpo.unidade ?? {}) as Record<string, unknown>
  const endereco = limpar(u.endereco, 120)
  if (endereco.length < 5) falhar(400, 'Informe o endereço da unidade.')
  const ponto = pontoValido(u.ponto) ? (u.ponto as { lat: number; lng: number }) : { lat: cidade.lat, lng: cidade.lng }
  const plano = corpo.plano === 'basico' ? 'basico' : 'premium'

  // quem já tem conta cria pela conta; quem não tem, cria as duas de uma vez
  let conta = await contaDaRequisicao(req)
  const nova = !conta
  if (!conta) conta = await criarConta({ ...dadosDeCadastro(corpo), cidade })
  const desejado = typeof corpo.slug === 'string' && corpo.slug ? corpo.slug : await sugerirPagina(nome)
  const slug = await reservarPagina(desejado, { tipo: 'empresa', id: desejado }).catch(async (e) => {
    if (nova) await apagarConta(conta!)
    throw e
  })
  const agora = Date.now()
  const unidade: Unidade = {
    id: novoId().slice(-8),
    nome: limpar(u.nome, 30) || 'Matriz',
    endereco,
    ...(limpar(u.bairro, 40) ? { bairro: limpar(u.bairro, 40) } : {}),
    cidade,
    ponto,
    ...(normalizarTelefone(u.whatsapp) ? { whatsapp: normalizarTelefone(u.whatsapp) } : {}),
    horario: HORARIO_PADRAO,
    comodidades: [],
    agregadores: [],
    ativa: true,
  }
  const sugeridas = Array.isArray(corpo.modalidades) ? corpo.modalidades.filter((x): x is string => typeof x === 'string' && !!MODALIDADE[x]) : SUGERIDAS[tipo]
  const empresa: Empresa = {
    slug,
    nome,
    tipo,
    dono: conta.id,
    equipe: [{ id: conta.id, nome: conta.nome, papel: 'dono', unidades: [unidade.id], desde: new Date(agora).toISOString() }],
    unidades: [unidade],
    modalidades: sugeridas.map((id) => modalidadeInicial(id)!).filter(Boolean),
    grade: [],
    eventos: [],
    visual: visualDe(corpo.visual, ESTILO_DO_TIPO[tipo]),
    plano: 'teste',
    planoDepois: plano,
    status: 'teste',
    testeAte: new Date(agora + plataforma.diasTeste * 86_400_000).toISOString(),
    agendaProfessores: false,
    numeros: { alunos: 0, nota: { media: 0, total: 0 }, treinosSemana: 0 },
    criadaEm: new Date(agora).toISOString(),
    ...(conta.demo || conta.visita ? { demo: true } : {}),
  }
  if (!(await criarSeNovo(CHAVES.empresa(slug), empresa))) falhar(409, 'Esse endereço já é de outra academia. Escolha outro.')
  await indexarEmpresa(empresa)
  conta = await mudarConta(conta.id, (c) => ({ ...c, empresas: [...(c.empresas ?? []).filter((x) => x.slug !== slug), { slug, papel: 'dono' }] }))
  return json({ ...(await resposta(conta)), empresa: slug }, 201, { 'set-cookie': cookieDeSessao(conta, req) })
}

export default rotas({
  GET: async (req) => json(await resposta(await contaDaRequisicao(req))),
  POST: async (req, context) => {
    const corpo = await lerCorpo(req)
    switch (corpo.acao) {
      case 'entrar':
        return entrar(corpo, req, context)
      case 'cadastro':
        return cadastro(corpo, req, context)
      case 'sair':
        return json({ usuario: null }, 200, { 'set-cookie': cookieDeSaida(req) })
      case 'demo':
        return demo(corpo, req, context)
      case 'perfil':
        return perfil(corpo, req)
      case 'privacidade':
        return privacidade(corpo, req)
      case 'local':
        return local(corpo, req)
      case 'senha':
        return trocarSenha(corpo, req)
      case 'consentimento':
        return consentimento(corpo, req)
      case 'principal':
        return principal(corpo, req)
      case 'bloquear':
        return bloquear(corpo, req, true)
      case 'desbloquear':
        return bloquear(corpo, req, false)
      case 'mais':
        return mais(corpo, req)
      case 'apagar':
        return apagar(corpo, req)
      case 'profissional':
        return profissional(corpo, req)
      case 'empresa':
        return criarEmpresa(corpo, req, context)
      default:
        return falhar(400, 'Ação desconhecida.')
    }
  },
})
