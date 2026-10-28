import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { diaDaSemana, hoje, somarDias } from '../src/shared/tempo.ts'
import aluno from '../netlify/functions/aluno.mts'
import aulas from '../netlify/functions/aulas.mts'
import avisos from '../netlify/functions/avisos.mts'
import conversa from '../netlify/functions/conversa.mts'
import pagina from '../netlify/functions/pagina.mts'
import painel from '../netlify/functions/painel.mts'
import sessao from '../netlify/functions/sessao.mts'
import treino from '../netlify/functions/treino.mts'
import { usarArmazem, type Armazem } from '../netlify/lib/store.ts'
import { Navegador, novaConta, pendentes, SL } from './ajuda.ts'
import { LojaMemoria } from './memoria.ts'

// As aulas das modalidades: a última vaga disputada, a fila que anda sozinha, o lugar marcado, a
// aula experimental (vira contato no painel e conversa) e a presença (que conta como treino)

before(() => {
  usarArmazem(new LojaMemoria() as unknown as Armazem)
  process.env.TURMA_SEM_DEMONSTRACAO = '1'
})

after(async () => {
  await Promise.allSettled(pendentes)
})

const dona = new Navegador('10.2.0.1')
const slug = 'studio-zen'
let unidade = ''
let aulaId = ''
const amanha = somarDias(hoje(), 1)
const alunos: { nav: Navegador; id: string; nome: string }[] = []

test('o estúdio cria a aula de pilates com 2 vagas e o aparelho marcado, e convida 4 alunas', async () => {
  const r = await dona.chamar(sessao, 'POST', '/s', { acao: 'empresa', empresa: 'Studio Zen', slug, tipo: 'estudio', cidade: SL, unidade: { nome: 'Studio', endereco: 'R. das Flores, 10' }, nome: 'Helena Prado', login: 'helena@zen.com', senha: 'senha-da-helena' })
  assert.equal(r.status, 201, JSON.stringify(r.dados))
  const e = await dona.chamar(painel, 'GET', `/p?slug=${slug}&aba=empresa`)
  unidade = e.dados.empresa.unidades[0].id
  const a = await dona.chamar(painel, 'POST', '/p', { slug, acao: 'aula', aula: { modalidade: 'pilates-aparelhos', unidade, dias: [diaDaSemana(amanha)], inicio: '07:00', duracao: 55, vagas: 2, reserva: true, lugarMarcado: true, lugares: 2 } })
  assert.equal(a.status, 200, JSON.stringify(a.dados))
  aulaId = a.dados.empresa.grade[0].id
  for (const nome of ['Bruna', 'Carla', 'Duda', 'Elis']) {
    const c = await dona.chamar(painel, 'POST', '/p', { slug, acao: 'convite', tipo: 'aluno', unidade })
    const { nav, usuario } = await novaConta(sessao, nome)
    await nav.chamar(aluno, 'POST', '/a', { acao: 'convite', codigo: c.dados.convite.codigo })
    alunos.push({ nav, id: usuario.id, nome })
  }
})

test('a última vaga disputada por duas ao mesmo tempo: uma entra, a outra vai para a fila', async () => {
  const [bruna, carla, duda] = alunos
  const r1 = await bruna.nav.chamar(aulas, 'POST', '/a', { acao: 'reservar', slug, aula: aulaId, data: amanha, lugar: 1 })
  assert.equal(r1.status, 200, JSON.stringify(r1.dados))
  assert.deepEqual(r1.dados, { resultado: 'reservada', lugar: 1 })
  const [r2, r3] = await Promise.all([
    carla.nav.chamar(aulas, 'POST', '/a', { acao: 'reservar', slug, aula: aulaId, data: amanha, lugar: 1 }),
    duda.nav.chamar(aulas, 'POST', '/a', { acao: 'reservar', slug, aula: aulaId, data: amanha, lugar: 2 }),
  ])
  const resultados = [r2.dados.resultado, r3.dados.resultado].sort()
  assert.deepEqual(resultados, ['espera', 'reservada'])
  const reservada = r2.dados.resultado === 'reservada' ? r2.dados : r3.dados
  assert.equal(reservada.lugar, 2, 'o aparelho 1 já era da Bruna')
  const dia = await new Navegador().chamar(pagina, 'GET', `/p?slug=${slug}&unidade=${unidade}&data=${amanha}`)
  assert.equal(dia.dados.aulas[0].livres, 0)
  assert.equal(dia.dados.aulas[0].espera, 1)
})

test('quem cancela abre a vaga, e a primeira da fila entra sozinha com o aviso', async () => {
  const [bruna, carla, duda] = alunos
  const naFila = (await carla.nav.chamar(aulas, 'GET', '/a?minhas')).dados.reservas[0].situacao === 'espera' ? carla : duda
  const c = await bruna.nav.chamar(aulas, 'POST', '/a', { acao: 'cancelar', slug, aula: aulaId, data: amanha })
  assert.equal(c.status, 200, JSON.stringify(c.dados))
  const minhas = await naFila.nav.chamar(aulas, 'GET', '/a?minhas')
  assert.equal(minhas.dados.reservas[0].situacao, 'reservada')
  assert.equal(minhas.dados.reservas[0].lugar, 1, 'herdou o aparelho da Bruna')
  const sino = await naFila.nav.chamar(avisos, 'GET', '/a')
  assert.ok(sino.dados.avisos.some((a: { tipo: string }) => a.tipo === 'espera'))
})

test('a aula experimental: vira contato no painel, com a conversa aberta, e a academia confirma', async () => {
  const { nav: visitante } = await novaConta(sessao, 'Fabi Nunes')
  const p = await visitante.chamar(aulas, 'POST', '/a', { acao: 'experimental', slug, aula: aulaId, data: amanha })
  assert.equal(p.status, 201, JSON.stringify(p.dados))
  const deNovo = await visitante.chamar(aulas, 'POST', '/a', { acao: 'experimental', slug, aula: aulaId, data: amanha })
  assert.equal(deNovo.status, 409)
  const contatos = await dona.chamar(painel, 'GET', `/p?slug=${slug}&aba=contatos`)
  assert.equal(contatos.dados.pedidos[0].nome, 'Fabi Nunes')
  const caixa = await dona.chamar(conversa, 'GET', `/c?lista&como=${slug}`)
  assert.equal(caixa.dados.naoLidas, 1, 'a mensagem chegou na caixa da empresa')
  const ok = await dona.chamar(aulas, 'POST', '/a', { acao: 'experimental-responder', slug, id: p.dados.pedido.id, status: 'confirmado' })
  assert.equal(ok.status, 200, JSON.stringify(ok.dados))
  const conversaDela = await visitante.chamar(conversa, 'GET', `/c?id=${p.dados.pedido.conversa}`)
  assert.ok(conversaDela.dados.mensagens.some((m: { texto: string; meu: boolean }) => !m.meu && m.texto.startsWith('Confirmado')))
  const naoAluna = await visitante.chamar(aulas, 'POST', '/a', { acao: 'reservar', slug, aula: aulaId, data: amanha })
  assert.equal(naoAluna.status, 403, 'quem não é aluno pede a experimental')
})

test('a presença marcada pela equipe conta como treino da aula', async () => {
  const elis = alunos[3]
  const ontem = somarDias(hoje(), -1)
  const r = await dona.chamar(aulas, 'POST', '/a', { acao: 'presenca', slug, aula: aulaId, data: ontem, contas: [elis.id] })
  assert.equal(r.status, 200, JSON.stringify(r.dados))
  const h = await elis.nav.chamar(treino, 'GET', '/t?historico')
  assert.equal(h.dados.treinos[0].modalidade, 'pilates-aparelhos')
  assert.equal(h.dados.treinos[0].origem, 'aula')
  const fora = await elis.nav.chamar(aulas, 'POST', '/a', { acao: 'presenca', slug, aula: aulaId, data: ontem, contas: [elis.id] })
  assert.equal(fora.status, 403, 'a aluna não marca a presença dos outros')
})
