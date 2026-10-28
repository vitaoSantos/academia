import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import sessao from '../netlify/functions/sessao.mts'
import { usarArmazem, type Armazem } from '../netlify/lib/store.ts'
import { Navegador, pendentes, SL } from './ajuda.ts'
import { LojaMemoria } from './memoria.ts'

// A conta: cadastro por e-mail ou celular, login com trava, perfil, privacidade e o perfil profissional

before(() => {
  usarArmazem(new LojaMemoria() as unknown as Armazem)
  process.env.ADMIN_PASSWORD = 'senha-do-admin'
  process.env.TURMA_SEM_DEMONSTRACAO = '1'
})

after(async () => {
  await Promise.allSettled(pendentes)
})

const ana = new Navegador('10.0.1.1')

test('cadastro por e-mail; o mesmo e-mail não cria duas contas; o @ sai do nome', async () => {
  const r = await ana.chamar(sessao, 'POST', '/s', { acao: 'cadastro', nome: 'Ana Souza', login: 'ANA@exemplo.com', senha: 'segredo-forte', cidade: SL })
  assert.equal(r.status, 201, JSON.stringify(r.dados))
  assert.equal(r.dados.usuario.email, 'ana@exemplo.com')
  assert.equal(r.dados.usuario.usuario, 'ana.souza')
  assert.equal(r.dados.usuario.publico, false, 'o perfil do aluno nasce privado')
  assert.equal(r.dados.usuario.senha, undefined)
  assert.ok(ana.cookie.startsWith('turma_sessao='))
  const repetido = await new Navegador('10.0.1.2').chamar(sessao, 'POST', '/s', { acao: 'cadastro', nome: 'Outra Ana', login: 'ana@exemplo.com', senha: 'outra-senha-1' })
  assert.equal(repetido.status, 409)
  const outra = await new Navegador('10.0.1.3').chamar(sessao, 'POST', '/s', { acao: 'cadastro', nome: 'Ana Souza', login: '(35) 99876-1234', senha: 'outra-senha-1' })
  assert.equal(outra.status, 201)
  assert.equal(outra.dados.usuario.celular, '35998761234')
  assert.equal(outra.dados.usuario.usuario, 'ana.souza2', 'o @ é único')
})

test('entrar pelo e-mail ou pelo celular; 8 senhas erradas travam', async () => {
  const pelo = await new Navegador('10.0.1.9').chamar(sessao, 'POST', '/s', { acao: 'entrar', login: '35 99876 1234', senha: 'outra-senha-1' })
  assert.equal(pelo.status, 200)
  const insistente = new Navegador('10.0.1.10')
  for (let i = 0; i < 8; i++) await insistente.chamar(sessao, 'POST', '/s', { acao: 'entrar', login: 'ana@exemplo.com', senha: `chute-${i}-abc` })
  const travado = await insistente.chamar(sessao, 'POST', '/s', { acao: 'entrar', login: 'ana@exemplo.com', senha: 'segredo-forte' })
  assert.equal(travado.status, 429)
})

test('perfil, privacidade, cidade e raio', async () => {
  const p = await ana.chamar(sessao, 'POST', '/s', { acao: 'perfil', nome: 'Ana S.', bio: 'Fase 2 💪', usuario: 'ana.treina', metaSemanal: 4 })
  assert.equal(p.status, 200, JSON.stringify(p.dados))
  assert.equal(p.dados.usuario.usuario, 'ana.treina')
  assert.equal(p.dados.usuario.metaSemanal, 4)
  const pub = await ana.chamar(sessao, 'POST', '/s', { acao: 'privacidade', publico: true })
  assert.equal(pub.dados.usuario.publico, true)
  const loc = await ana.chamar(sessao, 'POST', '/s', { acao: 'local', cidade: { codigo: 3115508, nome: 'Caxambu', uf: 'MG', lat: -21.9753, lng: -44.9319 }, raio: 25 })
  assert.equal(loc.dados.usuario.cidade.nome, 'Caxambu')
  assert.equal(loc.dados.usuario.raio, 25)
  const ruim = await ana.chamar(sessao, 'POST', '/s', { acao: 'local', cidade: { nome: 'X' } })
  assert.equal(ruim.status, 400)
})

test('o perfil profissional: o personal começa o teste de 30 dias e ganha a página', async () => {
  const r = await ana.chamar(sessao, 'POST', '/s', { acao: 'profissional', personal: true, cref: '12345-G/MG', especialidades: ['Hipertrofia'], modalidades: ['musculacao', 'nada'], cidade: SL, raioKm: 20, online: true })
  assert.equal(r.status, 201, JSON.stringify(r.dados))
  assert.equal(r.dados.profissional.plano, 'teste')
  assert.equal(r.dados.profissional.cref, '012345-G/MG')
  assert.deepEqual(r.dados.profissional.modalidades, ['musculacao'])
  assert.equal(r.dados.profissional.slug, 'ana-s')
  assert.equal(r.dados.usuario.profissional, true)
  assert.ok(r.dados.profissional.agenda.ativa)
  const crefRuim = await ana.chamar(sessao, 'POST', '/s', { acao: 'profissional', cref: 'abc' })
  assert.equal(crefRuim.status, 400)
})

test('o Turma+ simulado liga e desliga', async () => {
  const liga = await ana.chamar(sessao, 'POST', '/s', { acao: 'mais' })
  assert.equal(liga.dados.usuario.plano, 'mais')
  const desliga = await ana.chamar(sessao, 'POST', '/s', { acao: 'mais', ligar: false })
  assert.equal(desliga.dados.usuario.plano, 'gratis')
})

test('envio de outro site é recusado', async () => {
  const r = await new Navegador().chamar(sessao, 'POST', '/s', { acao: 'entrar', login: 'ana@exemplo.com', senha: 'segredo-forte' }, { origin: 'https://golpe.example' })
  assert.equal(r.status, 403)
})
