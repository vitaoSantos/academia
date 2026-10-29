import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import admin from '../netlify/functions/admin.mts'
import explorar from '../netlify/functions/explorar.mts'
import plataforma from '../netlify/functions/plataforma.mts'
import rede from '../netlify/functions/rede.mts'
import sessao from '../netlify/functions/sessao.mts'
import { usarArmazem, type Armazem } from '../netlify/lib/store.ts'
import { Navegador, novaConta, pendentes, SL } from './ajuda.ts'
import { LojaMemoria } from './memoria.ts'

// O admin da plataforma: a senha, o motivo obrigatório em cada ação (e o registro), a suspensão que
// tira a academia do mapa, as regras (o cadastro fechado vale na hora) e a moderação de comentários

before(() => {
  usarArmazem(new LojaMemoria() as unknown as Armazem)
  process.env.ADMIN_PASSWORD = 'senha-do-admin-de-teste'
  delete process.env.ADMIN_TOTP
  process.env.TURMA_SEM_DEMONSTRACAO = '1'
})

after(async () => {
  await Promise.allSettled(pendentes)
})

const adm = new Navegador('10.7.0.1')
let slug = ''

test('sem a senha não entra; com a senha, as abas abrem', async () => {
  assert.equal((await adm.chamar(admin, 'GET', '/a?aba=geral')).status, 401)
  const sessaoFora = await adm.chamar(admin, 'GET', '/a?aba=sessao')
  assert.deepEqual(sessaoFora.dados, { ligado: true, entrou: false, codigo: false })
  assert.equal((await adm.chamar(admin, 'POST', '/a', { acao: 'entrar', senha: 'chute' })).status, 401)
  const ok = await adm.chamar(admin, 'POST', '/a', { acao: 'entrar', senha: 'senha-do-admin-de-teste' })
  assert.equal(ok.status, 200, JSON.stringify(ok.dados))
  assert.equal(ok.dados.entrou, true)
  const geral = await adm.chamar(admin, 'GET', '/a?aba=geral')
  assert.equal(geral.status, 200, JSON.stringify(geral.dados))
  assert.equal(geral.dados.dias.length, 14)
  assert.equal(geral.dados.receita.total, 0)
})

test('suspender pede o motivo, tira a academia do mapa e fica no registro; reativar devolve', async () => {
  const dona = new Navegador('10.7.0.2')
  const r = await dona.chamar(sessao, 'POST', '/s', { acao: 'empresa', empresa: 'Academia do Teste', tipo: 'academia', cidade: SL, unidade: { nome: 'Centro', endereco: 'Rua A, 100', ponto: { lat: SL.lat, lng: SL.lng } }, nome: 'Dona Teste', login: 'dona@teste.com', senha: 'senha-forte-123' })
  assert.equal(r.status, 201, JSON.stringify(r.dados))
  slug = r.dados.empresa
  const noMapa = async () => (await new Navegador().chamar(explorar, 'GET', `/e?lat=${SL.lat}&lng=${SL.lng}&raio=10`)).dados.unidades.length
  assert.equal(await noMapa(), 1)

  const semMotivo = await adm.chamar(admin, 'POST', '/a', { acao: 'empresa', slug, op: 'suspender' })
  assert.equal(semMotivo.status, 400)
  const suspensa = await adm.chamar(admin, 'POST', '/a', { acao: 'empresa', slug, op: 'suspender', motivo: 'Pagamento em atraso' })
  assert.equal(suspensa.status, 200, JSON.stringify(suspensa.dados))
  assert.equal(await noMapa(), 0, 'suspensa sai do mapa')
  const lista = await adm.chamar(admin, 'GET', '/a?aba=empresas')
  assert.equal(lista.dados.empresas.find((e: { slug: string }) => e.slug === slug).status, 'suspensa')

  await adm.chamar(admin, 'POST', '/a', { acao: 'empresa', slug, op: 'reativar', motivo: 'Pagou' })
  assert.equal(await noMapa(), 1, 'reativada volta ao mapa')

  const registro = await adm.chamar(admin, 'GET', '/a?aba=registro')
  const textos = registro.dados.acoes.map((a: { texto: string; motivo?: string }) => `${a.texto}${a.motivo ? ` (${a.motivo})` : ''}`)
  assert.ok(textos.includes('Empresa Academia do Teste: suspensa (Pagamento em atraso)'), textos.join(' | '))
  assert.ok(textos.includes('Empresa Academia do Teste: reativada (Pagou)'))
})

test('as regras: o preço novo chega à landing e o cadastro fechado vale na hora', async () => {
  const atual = (await adm.chamar(admin, 'GET', '/a?aba=plataforma')).dados.config
  const mudou = await adm.chamar(admin, 'POST', '/a', { acao: 'plataforma', config: { ...atual, precos: { ...atual.precos, alunoMais: 1490 }, cadastroAberto: false, aviso: '  Manutenção   às 23h  ' } })
  assert.equal(mudou.status, 200, JSON.stringify(mudou.dados))
  const publica = await new Navegador().chamar(plataforma, 'GET', '/p')
  assert.equal(publica.dados.precos.alunoMais, 1490)
  assert.equal(publica.dados.aviso, 'Manutenção às 23h')
  const fechado = await new Navegador('10.7.0.9').chamar(sessao, 'POST', '/s', { acao: 'cadastro', nome: 'Nova Pessoa', login: 'nova@teste.com', senha: 'senha-forte-123', cidade: SL })
  assert.equal(fechado.status, 403)
  await adm.chamar(admin, 'POST', '/a', { acao: 'plataforma', config: { ...atual, cadastroAberto: true, aviso: '' } })
  const aberto = await new Navegador('10.7.0.9').chamar(sessao, 'POST', '/s', { acao: 'cadastro', nome: 'Nova Pessoa', login: 'nova@teste.com', senha: 'senha-forte-123', cidade: SL })
  assert.equal(aberto.status, 201, JSON.stringify(aberto.dados))
})

test('a moderação do comentário: ocultar esconde, apagar tira e desconta do post', async () => {
  const ana = await novaConta(sessao, 'Ana Rede')
  const bia = await novaConta(sessao, 'Bia Rede')
  await ana.nav.chamar(sessao, 'POST', '/s', { acao: 'privacidade', publico: true })
  const post = await ana.nav.chamar(rede, 'POST', '/r', { acao: 'publicar', texto: 'Treino de perna pago!' })
  assert.equal(post.status, 201, JSON.stringify(post.dados))
  const id = post.dados.post.id
  const c = await bia.nav.chamar(rede, 'POST', '/r', { acao: 'comentar', id, texto: 'Comentário que vai ser denunciado' })
  const comentario = c.dados.comentarios[0].id
  const d = await ana.nav.chamar(rede, 'POST', '/r', { acao: 'denunciar', alvo: { tipo: 'comentario', id: comentario, post: id, autor: bia.usuario.id }, motivo: 'Assédio ou ofensa' })
  assert.equal(d.status, 200, JSON.stringify(d.dados))

  const abertas = await adm.chamar(admin, 'GET', '/a?aba=moderacao')
  const denuncia = abertas.dados.denuncias.find((x: { alvo: { id: string } }) => x.alvo.id === comentario)
  assert.equal(denuncia.conteudo, 'Comentário que vai ser denunciado')
  const oculto = await adm.chamar(admin, 'POST', '/a', { acao: 'moderacao', id: denuncia.id, decisao: 'ocultar' })
  assert.equal(oculto.status, 200, JSON.stringify(oculto.dados))
  const visto = await new Navegador().chamar(rede, 'GET', `/r?post=${id}`)
  assert.equal(visto.dados.comentarios.length, 0, 'oculto: os outros não veem')

  // a Bia comenta de novo, a Ana denuncia, e o admin apaga
  const c2 = await bia.nav.chamar(rede, 'POST', '/r', { acao: 'comentar', id, texto: 'Outro para apagar' })
  const segundo = c2.dados.comentarios.find((x: { texto: string }) => x.texto === 'Outro para apagar').id
  await ana.nav.chamar(rede, 'POST', '/r', { acao: 'denunciar', alvo: { tipo: 'comentario', id: segundo, post: id, autor: bia.usuario.id }, motivo: 'Golpe ou spam' })
  const outra = (await adm.chamar(admin, 'GET', '/a?aba=moderacao')).dados.denuncias.find((x: { alvo: { id: string } }) => x.alvo.id === segundo)
  const apagou = await adm.chamar(admin, 'POST', '/a', { acao: 'moderacao', id: outra.id, decisao: 'apagar' })
  assert.equal(apagou.status, 200)
  assert.equal(apagou.dados.denuncias.length, 0, 'sem denúncia aberta')
  const depois = await new Navegador().chamar(rede, 'GET', `/r?post=${id}`)
  assert.equal(depois.dados.post.comentarios, 1, 'o apagado desconta; o oculto continua contando para a autora')
})

test('sair derruba a sessão do admin', async () => {
  await adm.chamar(admin, 'POST', '/a', { acao: 'sair' })
  assert.equal((await adm.chamar(admin, 'GET', '/a?aba=geral')).status, 401)
})
