import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import admin from '../netlify/functions/admin.mts'
import aluno from '../netlify/functions/aluno.mts'
import conversa from '../netlify/functions/conversa.mts'
import explorar from '../netlify/functions/explorar.mts'
import pagina from '../netlify/functions/pagina.mts'
import painel from '../netlify/functions/painel.mts'
import plataforma from '../netlify/functions/plataforma.mts'
import pro from '../netlify/functions/pro.mts'
import rede from '../netlify/functions/rede.mts'
import sessao from '../netlify/functions/sessao.mts'
import treino from '../netlify/functions/treino.mts'
import { CONTAS_DEMO } from '../netlify/lib/semente.ts'
import { usarArmazem, type Armazem } from '../netlify/lib/store.ts'
import { apagarVisita } from '../netlify/lib/visitas.ts'
import { Navegador, pendentes, POCOS, SL } from './ajuda.ts'
import { LojaMemoria } from './memoria.ts'

// A demonstração: nasce sozinha no primeiro acesso, o mapa de São Lourenço tem as academias da região
// (e não as de Poços de Caldas), cada visita como aluno ganha a conta dela e não esbarra nas outras,
// e a visita some sem deixar rastro

let loja: LojaMemoria

before(() => {
  loja = new LojaMemoria()
  usarArmazem(loja as unknown as Armazem)
  delete process.env.TURMA_SEM_DEMONSTRACAO
})

after(async () => {
  await Promise.allSettled(pendentes)
})

test('o mapa de São Lourenço: as academias e os personais da região, com destaques', async () => {
  const r = await new Navegador().chamar(explorar, 'GET', `/e?lat=${SL.lat}&lng=${SL.lng}&raio=50`)
  assert.equal(r.status, 200, JSON.stringify(r.dados))
  const nomes = new Set(r.dados.unidades.map((u: { nome: string }) => u.nome))
  for (const n of ['Força Total', 'CT Tatame Sul', 'Studio Equilíbrio', 'Escola de Dança Compasso', 'Academia Águas Claras', 'Box Serra Cross']) assert.ok(nomes.has(n), n)
  assert.ok(!r.dados.unidades.some((u: { unidadeNome: string }) => u.unidadeNome === 'Poços de Caldas'), 'Poços fica a 161 km')
  assert.ok(!nomes.has('Academia Vértice'), 'Pouso Alegre fica a 92 km')
  const pros = r.dados.profissionais.map((p: { nome: string }) => p.nome)
  assert.ok(pros.includes('Rafael Moreira') && pros.includes('Diego Alves'))
  assert.ok(!pros.includes('Patrícia Lima'))
  assert.ok(r.dados.online.some((p: { nome: string }) => p.nome === 'Patrícia Lima'), 'a de Poços atende online')
  assert.ok(r.dados.unidades.filter((u: { destaqueAgora?: boolean }) => u.destaqueAgora).length <= 3)
  const longe = await new Navegador().chamar(explorar, 'GET', `/e?lat=${SL.lat}&lng=${SL.lng}&raio=100`)
  assert.ok(longe.dados.unidades.some((u: { nome: string }) => u.nome === 'Academia Vértice'), 'com 100 km entra Pouso Alegre')
  const pocos = await new Navegador().chamar(rede, 'GET', `/r?feed&modo=perto&lat=${POCOS.lat}&lng=${POCOS.lng}&raio=25`)
  assert.ok(pocos.dados.posts.length >= 1 && pocos.dados.posts.every((p: { autorResumo: { nome: string } }) => ['Gabriel Nunes', 'Patrícia Lima'].includes(p.autorResumo.nome)))
})

test('as páginas públicas: a rede, o personal com os números e o professor que dá aula em três lugares', async () => {
  const forca = await new Navegador().chamar(pagina, 'GET', '/p?slug=forca-total')
  assert.equal(forca.dados.empresa.unidades.length, 4)
  assert.ok(forca.dados.professores.some((p: { nome: string }) => p.nome === 'Diego Alves'))
  const rafa = await new Navegador().chamar(pagina, 'GET', '/p?slug=rafael-moreira')
  assert.ok(rafa.dados.profissional.numeros.alunosInstruidos > 100)
  assert.ok(rafa.dados.profissional.numeros.nota.total >= 3)
  const diego = await new Navegador().chamar(pagina, 'GET', '/p?slug=diego-alves')
  assert.deepEqual(diego.dados.locais.map((l: { nome: string }) => l.nome), ['Força Total · Centro', 'Força Total · Federal', 'CT Tatame Sul'])
})

test('experimentar como aluno: a conta da visita tem a ficha do Rafa e não aparece para os outros', async () => {
  const visita = new Navegador('10.7.0.1')
  const r = await visita.chamar(sessao, 'POST', '/s', { acao: 'demo', papel: 'aluno' })
  assert.equal(r.status, 200, JSON.stringify(r.dados))
  const id = r.dados.usuario.id as string
  assert.ok(id.startsWith('demovisita'))
  const inicio = await visita.chamar(aluno, 'GET', '/a?inicio')
  assert.ok(inicio.dados.fichas.some((f: { titulo: string; status: string }) => f.titulo === 'Hipertrofia, fase 2' && f.status === 'ativa'))
  assert.ok(inicio.dados.proximaDivisao)
  assert.ok(inicio.dados.vinculos.some((v: { nome: string }) => v.nome === 'Força Total'))
  // o treino e o post da visita
  const t = await visita.chamar(treino, 'POST', '/t', { acao: 'registrar', id: 'treinovisita01', ficha: inicio.dados.proximaDivisao.ficha, divisao: inicio.dados.proximaDivisao.divisao, inicio: new Date(Date.now() - 3600_000).toISOString(), fim: new Date(Date.now() - 300_000).toISOString(), exercicios: [{ exercicio: 'supino-reto', series: [{ reps: 10, carga: 40, feita: true }] }] })
  assert.equal(t.status, 201, JSON.stringify(t.dados))
  const p = await visita.chamar(rede, 'POST', '/r', { acao: 'publicar', tipo: 'treino', treino: 'treinovisita01', texto: 'Treino da visita' })
  assert.equal(p.status, 201)
  const outra = await new Navegador('10.7.0.2').chamar(rede, 'GET', `/r?feed&modo=perto&lat=${SL.lat}&lng=${SL.lng}&raio=50`)
  assert.ok(!outra.dados.posts.some((x: { id: string }) => x.id === p.dados.post.id), 'o post da visita só ela vê')
  const minha = await visita.chamar(rede, 'GET', `/r?feed&modo=perto&lat=${SL.lat}&lng=${SL.lng}&raio=50`)
  assert.equal(minha.dados.posts[0].id, p.dados.post.id)
  // a conversa com o Rafa responde sozinha e não aparece na caixa dele
  const c = await visita.chamar(conversa, 'POST', '/c', { acao: 'abrir', com: { tipo: 'conta', id: CONTAS_DEMO.personal } })
  await visita.chamar(conversa, 'POST', '/c', { acao: 'enviar', id: c.dados.id, texto: 'Oi, Rafa!' })
  const vista = await visita.chamar(conversa, 'GET', `/c?id=${c.dados.id}`)
  assert.ok(vista.dados.mensagens.some((m: { texto: string }) => m.texto.startsWith('(demonstração)')))
  const rafa = new Navegador('10.7.0.3')
  await rafa.chamar(sessao, 'POST', '/s', { acao: 'demo', papel: 'personal' })
  const caixa = await rafa.chamar(conversa, 'GET', '/c?lista')
  assert.ok(!caixa.dados.conversas.some((x: { id: string }) => x.id === c.dados.id))
  // e a visita some sem deixar rastro
  await apagarVisita(id)
  // (os contadores dos limites de uso são por janela de tempo e não guardam nada da pessoa)
  const sobrou = [...loja.dados.keys()].filter((k) => k.includes(id) && !k.startsWith('limites/'))
  assert.deepEqual(sobrou, [])
  const depois = await new Navegador('10.7.0.4').chamar(rede, 'GET', `/r?post=${p.dados.post.id}`)
  assert.equal(depois.status, 404)
})

test('experimentar como personal, professor e academia abre os painéis prontos', async () => {
  const rafa = new Navegador('10.7.1.1')
  await rafa.chamar(sessao, 'POST', '/s', { acao: 'demo', papel: 'personal' })
  const hoje = await rafa.chamar(pro, 'GET', '/p?aba=hoje')
  assert.equal(hoje.status, 200, JSON.stringify(hoje.dados))
  assert.ok(hoje.dados.ativos >= 4)
  const diego = new Navegador('10.7.1.2')
  await diego.chamar(sessao, 'POST', '/s', { acao: 'demo', papel: 'professor' })
  const dele = await diego.chamar(pro, 'GET', '/p?aba=alunos')
  assert.deepEqual(dele.dados.academias.map((a: { nome: string }) => a.nome).sort(), ['CT Tatame Sul', 'Força Total'])
  const marta = new Navegador('10.7.1.3')
  await marta.chamar(sessao, 'POST', '/s', { acao: 'demo', papel: 'academia' })
  const visao = await marta.chamar(painel, 'GET', '/p?slug=forca-total&aba=visao')
  assert.equal(visao.status, 200, JSON.stringify(visao.dados))
  assert.ok(visao.dados.alunos.ativos >= 6)
  assert.equal(visao.dados.experimentais.length, 1)
  assert.ok(visao.dados.alunos.pendentes >= 1)
})

test('o admin apaga a demonstração para o lançamento (e o que é de verdade fica); recriar traz de volta', async () => {
  process.env.ADMIN_PASSWORD = 'senha-do-admin-da-demo'
  // uma academia de verdade, que não pode sumir junto
  const dona = new Navegador('10.7.2.1')
  const real = await dona.chamar(sessao, 'POST', '/s', { acao: 'empresa', empresa: 'Academia de Verdade', tipo: 'academia', cidade: SL, unidade: { nome: 'Centro', endereco: 'Rua Real, 10', ponto: { lat: SL.lat, lng: SL.lng } }, nome: 'Dona Real', login: 'dona@real.com', senha: 'senha-forte-123' })
  assert.equal(real.status, 201, JSON.stringify(real.dados))
  const adm = new Navegador('10.7.2.2')
  await adm.chamar(admin, 'POST', '/a', { acao: 'entrar', senha: 'senha-do-admin-da-demo' })
  const apagou = await adm.chamar(admin, 'POST', '/a', { acao: 'demo-apagar' })
  assert.equal(apagou.status, 200, JSON.stringify(apagou.dados))

  assert.equal((await new Navegador().chamar(pagina, 'GET', '/p?slug=forca-total')).status, 404)
  const mapa = await new Navegador().chamar(explorar, 'GET', `/e?lat=${SL.lat}&lng=${SL.lng}&raio=50`)
  assert.deepEqual(mapa.dados.unidades.map((u: { nome: string }) => u.nome), ['Academia de Verdade'])
  assert.equal(mapa.dados.profissionais.length, 0)
  assert.equal((await new Navegador().chamar(plataforma, 'GET', '/p')).dados.demonstracao, false)
  assert.equal((await new Navegador('10.7.2.3').chamar(sessao, 'POST', '/s', { acao: 'demo', papel: 'academia' })).status, 410)
  const feed = await new Navegador().chamar(rede, 'GET', `/r?feed&lat=${SL.lat}&lng=${SL.lng}`)
  assert.equal(feed.dados.posts.length, 0, 'os posts da demonstração saíram do feed')
  assert.equal((await new Navegador().chamar(pagina, 'GET', `/p?slug=${real.dados.empresa}`)).status, 200, 'a de verdade continua')

  await adm.chamar(admin, 'POST', '/a', { acao: 'demo-recriar' })
  assert.equal((await new Navegador().chamar(pagina, 'GET', '/p?slug=forca-total')).status, 200)
  assert.equal((await new Navegador().chamar(plataforma, 'GET', '/p')).dados.demonstracao, true)
})
