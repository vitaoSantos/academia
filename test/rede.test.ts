import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import conversa from '../netlify/functions/conversa.mts'
import pagina from '../netlify/functions/pagina.mts'
import rede from '../netlify/functions/rede.mts'
import sessao from '../netlify/functions/sessao.mts'
import treino from '../netlify/functions/treino.mts'
import { usarArmazem, type Armazem } from '../netlify/lib/store.ts'
import { CAXAMBU, Navegador, novaConta, pendentes, POCOS, SL } from './ajuda.ts'
import { LojaMemoria } from './memoria.ts'

// A rede: o "treino pago" com o resumo do treino, o perfil privado (pedido para seguir), o feed da
// região, o 💪, os comentários, a denúncia que esconde, e o chat entre alunos (só quando se seguem)

before(() => {
  usarArmazem(new LojaMemoria() as unknown as Armazem)
  process.env.TURMA_SEM_DEMONSTRACAO = '1'
})

after(async () => {
  await Promise.allSettled(pendentes)
})

let ana: Awaited<ReturnType<typeof novaConta>>
let lucas: Awaited<ReturnType<typeof novaConta>>
let gabi: Awaited<ReturnType<typeof novaConta>>
let postAna = ''

test('o treino pago: o resumo vem do treino guardado, e o mesmo treino não posta duas vezes', async () => {
  ana = await novaConta(sessao, 'Ana Souza')
  lucas = await novaConta(sessao, 'Lucas Pereira')
  gabi = await novaConta(sessao, 'Gabi Lima', { cidade: POCOS })
  await ana.nav.chamar(sessao, 'POST', '/s', { acao: 'privacidade', publico: true })
  await lucas.nav.chamar(sessao, 'POST', '/s', { acao: 'privacidade', publico: true })
  const t = await ana.nav.chamar(treino, 'POST', '/t', { acao: 'registrar', id: 'treinoanarede1', inicio: new Date(Date.now() - 3600_000).toISOString(), fim: new Date(Date.now() - 600_000).toISOString(), exercicios: [{ exercicio: 'agachamento-livre', series: [{ reps: 10, carga: 40, feita: true }] }] })
  assert.equal(t.status, 201, JSON.stringify(t.dados))
  const p = await ana.nav.chamar(rede, 'POST', '/r', { acao: 'publicar', tipo: 'treino', treino: 'treinoanarede1', texto: 'Treino C pago! 🔥', volume: 999999 })
  assert.equal(p.status, 201, JSON.stringify(p.dados))
  postAna = p.dados.post.id
  assert.equal(p.dados.post.treino.volume, 400, 'o volume é o do treino, não o que o navegador mandou')
  assert.deepEqual(p.dados.post.ponto, { lat: SL.lat, lng: SL.lng })
  const deNovo = await ana.nav.chamar(rede, 'POST', '/r', { acao: 'publicar', tipo: 'treino', treino: 'treinoanarede1' })
  assert.equal(deNovo.status, 409)
  const comTelefone = await ana.nav.chamar(rede, 'POST', '/r', { acao: 'publicar', texto: 'me chama no 35 99876-1234' })
  assert.equal(comTelefone.status, 400)
})

test('o feed da região: quem está em Poços não vê São Lourenço, e quem está em Caxambu vê', async () => {
  const deCaxambu = await new Navegador().chamar(rede, 'GET', `/r?feed&modo=perto&lat=${CAXAMBU.lat}&lng=${CAXAMBU.lng}&raio=50`)
  assert.deepEqual(deCaxambu.dados.posts.map((p: { id: string }) => p.id), [postAna])
  const dePocos = await new Navegador().chamar(rede, 'GET', `/r?feed&modo=perto&lat=${POCOS.lat}&lng=${POCOS.lng}&raio=50`)
  assert.deepEqual(dePocos.dados.posts, [])
  const semConta = await new Navegador().chamar(rede, 'POST', '/r', { acao: 'forte', id: postAna })
  assert.equal(semConta.status, 401, 'ver não pede conta; dar 💪 pede')
})

test('💪 e comentários, com o aviso para quem postou', async () => {
  const f = await lucas.nav.chamar(rede, 'POST', '/r', { acao: 'forte', id: postAna })
  assert.equal(f.dados.post.totalFortes, 1)
  assert.equal(f.dados.post.dei, true)
  const c = await lucas.nav.chamar(rede, 'POST', '/r', { acao: 'comentar', id: postAna, texto: 'Monstra! 👏' })
  assert.equal(c.status, 200, JSON.stringify(c.dados))
  const post = await new Navegador().chamar(rede, 'GET', `/r?post=${postAna}`)
  assert.equal(post.dados.post.comentarios, 1)
  assert.equal(post.dados.comentarios[0].autorResumo.nome, 'Lucas Pereira')
  const tira = await lucas.nav.chamar(rede, 'POST', '/r', { acao: 'forte', id: postAna })
  assert.equal(tira.dados.post.totalFortes, 0, 'tocar de novo tira o 💪')
})

test('o perfil privado: seguir vira pedido, e os posts só aparecem para quem foi aprovado', async () => {
  // a Gabi tem perfil privado (o padrão do aluno)
  const t = await gabi.nav.chamar(treino, 'POST', '/t', { acao: 'registrar', id: 'treinogabirede', inicio: new Date(Date.now() - 3600_000).toISOString(), fim: new Date(Date.now() - 900_000).toISOString(), exercicios: [{ exercicio: 'prancha', series: [{ reps: 1, carga: 0, feita: true }] }] })
  assert.equal(t.status, 201)
  const p = await gabi.nav.chamar(rede, 'POST', '/r', { acao: 'publicar', tipo: 'treino', treino: 'treinogabirede' })
  const perfil = await lucas.nav.chamar(pagina, 'GET', `/p?u=${gabi.usuario.usuario}`)
  assert.equal(perfil.dados.podeVer, false)
  assert.equal(perfil.dados.numeros, undefined, 'o perfil privado não mostra os números')
  const antes = await lucas.nav.chamar(rede, 'GET', `/r?feed&modo=perfil&usuario=${gabi.usuario.usuario}`)
  assert.deepEqual(antes.dados.posts, [])
  const pedido = await lucas.nav.chamar(rede, 'POST', '/r', { acao: 'seguir', id: gabi.usuario.id })
  assert.equal(pedido.dados.segue, 'pedido')
  const pedidos = await gabi.nav.chamar(rede, 'GET', '/r?pedidos')
  assert.equal(pedidos.dados.pedidos[0].nome, 'Lucas Pereira')
  await gabi.nav.chamar(rede, 'POST', '/r', { acao: 'pedido', id: lucas.usuario.id, aceitar: true })
  const depois = await lucas.nav.chamar(rede, 'GET', `/r?feed&modo=perfil&usuario=${gabi.usuario.usuario}`)
  assert.deepEqual(depois.dados.posts.map((x: { id: string }) => x.id), [p.dados.post.id])
  const estranho = await ana.nav.chamar(rede, 'GET', `/r?post=${p.dados.post.id}`)
  assert.equal(estranho.status, 404, 'quem não segue não abre o post privado')
})

test('o chat entre alunos só abre quando os dois se seguem; telefone não passa', async () => {
  const antes = await ana.nav.chamar(conversa, 'POST', '/c', { acao: 'abrir', com: { tipo: 'conta', id: lucas.usuario.id } })
  assert.equal(antes.status, 403)
  await ana.nav.chamar(rede, 'POST', '/r', { acao: 'seguir', id: lucas.usuario.id })
  await lucas.nav.chamar(rede, 'POST', '/r', { acao: 'seguir', id: ana.usuario.id })
  const aberta = await ana.nav.chamar(conversa, 'POST', '/c', { acao: 'abrir', com: { tipo: 'conta', id: lucas.usuario.id } })
  assert.equal(aberta.status, 200, JSON.stringify(aberta.dados))
  const zap = await ana.nav.chamar(conversa, 'POST', '/c', { acao: 'enviar', id: aberta.dados.id, texto: 'me chama: (35) 99876-1234' })
  assert.equal(zap.status, 400)
  const ok = await ana.nav.chamar(conversa, 'POST', '/c', { acao: 'enviar', id: aberta.dados.id, texto: 'Bora treinar amanhã?' })
  assert.equal(ok.status, 200)
  const lista = await lucas.nav.chamar(conversa, 'GET', '/c?lista')
  assert.equal(lista.dados.naoLidas, 1)
  const lida = await lucas.nav.chamar(conversa, 'GET', `/c?id=${aberta.dados.id}`)
  assert.equal(lida.dados.mensagens[0].texto, 'Bora treinar amanhã?')
  assert.equal((await lucas.nav.chamar(conversa, 'GET', '/c?contador')).dados.naoLidas, 0)
  const intrusa = await gabi.nav.chamar(conversa, 'GET', `/c?id=${aberta.dados.id}`)
  assert.equal(intrusa.status, 404)
})

test('três denúncias escondem o post até a revisão', async () => {
  for (const nome of ['Den Um', 'Den Dois', 'Den Tres']) {
    const d = await novaConta(sessao, nome)
    const r = await d.nav.chamar(rede, 'POST', '/r', { acao: 'denunciar', alvo: { tipo: 'post', id: postAna }, motivo: 'Golpe ou spam' })
    assert.equal(r.status, 200, JSON.stringify(r.dados))
  }
  const sumiu = await new Navegador().chamar(rede, 'GET', `/r?post=${postAna}`)
  assert.equal(sumiu.status, 404)
  const dona = await ana.nav.chamar(rede, 'GET', `/r?feed&modo=perfil&usuario=${ana.usuario.usuario}`)
  assert.equal(dona.dados.posts.length, 1, 'quem postou ainda vê')
})

test('bloquear: a pessoa bloqueada some do feed e não conversa', async () => {
  await lucas.nav.chamar(sessao, 'POST', '/s', { acao: 'bloquear', id: ana.usuario.id })
  const feed = await lucas.nav.chamar(rede, 'GET', `/r?feed&modo=perto&lat=${SL.lat}&lng=${SL.lng}&raio=50`)
  assert.ok(!feed.dados.posts.some((p: { autor: string }) => p.autor === ana.usuario.id))
  const c = await ana.nav.chamar(conversa, 'POST', '/c', { acao: 'abrir', com: { tipo: 'conta', id: lucas.usuario.id } })
  assert.equal(c.status, 403, 'o bloqueio vale dos dois lados')
})
