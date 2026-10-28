import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import aluno from '../netlify/functions/aluno.mts'
import avisos from '../netlify/functions/avisos.mts'
import desafio from '../netlify/functions/desafio.mts'
import ficha from '../netlify/functions/ficha.mts'
import pro from '../netlify/functions/pro.mts'
import sessao from '../netlify/functions/sessao.mts'
import treino from '../netlify/functions/treino.mts'
import { usarArmazem, type Armazem } from '../netlify/lib/store.ts'
import { novaConta, pendentes, SL, type Navegador } from './ajuda.ts'
import { LojaMemoria } from './memoria.ts'

// A ficha do personal para o aluno (com o aviso), o limite das fichas próprias, "usar em outro
// aluno" (os treinos iguais), o treino ao vivo registrado (volume, recordes, desafio, painel)

before(() => {
  usarArmazem(new LojaMemoria() as unknown as Armazem)
  process.env.TURMA_SEM_DEMONSTRACAO = '1'
})

after(async () => {
  await Promise.allSettled(pendentes)
})

let rafa: Navegador
let ana: Navegador
let bia: Navegador
let idAna = ''
let idBia = ''
let fichaAna = ''

const DIVISOES = [
  { nome: 'Treino A', foco: 'Peito e tríceps', itens: [{ exercicio: 'supino-reto', series: 3, reps: '8-10', carga: 30, descanso: 90 }, { exercicio: 'triceps-corda', series: 3, reps: '12', carga: 20, descanso: 45 }] },
  { nome: 'Treino B', foco: 'Costas', itens: [{ exercicio: 'puxada-frontal', series: 3, reps: '10', carga: 35, descanso: 75 }, { exercicio: 'inventado', series: 3, reps: '10', descanso: 60 }] },
]

test('o personal convida a Ana e a Bia pelo link', async () => {
  ;({ nav: rafa } = await novaConta(sessao, 'Rafael Moreira'))
  const p = await rafa.chamar(sessao, 'POST', '/s', { acao: 'profissional', personal: true, cidade: SL, especialidades: ['Hipertrofia'] })
  assert.equal(p.status, 201, JSON.stringify(p.dados))
  for (const nome of ['Ana Souza', 'Bia Lima']) {
    const c = await rafa.chamar(pro, 'POST', '/p', { acao: 'convite', nome })
    assert.equal(c.status, 201, JSON.stringify(c.dados))
    const { nav, usuario } = await novaConta(sessao, nome)
    const r = await nav.chamar(aluno, 'POST', '/a', { acao: 'convite', codigo: c.dados.convite.codigo })
    assert.equal(r.status, 200, JSON.stringify(r.dados))
    if (nome === 'Ana Souza') [ana, idAna] = [nav, usuario.id]
    else [bia, idBia] = [nav, usuario.id]
  }
  const hoje = await rafa.chamar(pro, 'GET', '/p?aba=hoje')
  assert.equal(hoje.dados.ativos, 2)
  assert.equal(hoje.dados.numeros.alunosInstruidos, 2)
})

test('a ficha nova: só para o aluno do personal, com o aviso no sino e a data de previsão', async () => {
  const estranha = (await novaConta(sessao, 'Zé Ninguém')).usuario.id
  const recusada = await rafa.chamar(ficha, 'POST', '/f', { acao: 'salvar', aluno: estranha, contexto: { tipo: 'profissional' }, titulo: 'X', divisoes: DIVISOES })
  assert.equal(recusada.status, 403)
  const r = await rafa.chamar(ficha, 'POST', '/f', { acao: 'salvar', aluno: idAna, contexto: { tipo: 'profissional' }, titulo: 'Hipertrofia, fase 1', objetivo: 'Hipertrofia', divisoes: DIVISOES })
  assert.equal(r.status, 201, JSON.stringify(r.dados))
  fichaAna = r.dados.ficha.id
  assert.equal(r.dados.ficha.divisoes[1].itens.length, 1, 'o exercício que não existe fica de fora')
  assert.equal(r.dados.ficha.status, 'ativa')
  const dias = (Date.parse(r.dados.ficha.previsao) - Date.parse(r.dados.ficha.inicio)) / 86_400_000
  assert.equal(dias, 42, 'a previsão padrão é de 6 semanas')
  const sino = await ana.chamar(avisos, 'GET', '/a')
  assert.ok(sino.dados.avisos.some((a: { tipo: string; texto: string }) => a.tipo === 'ficha' && a.texto.includes('Hipertrofia, fase 1')))
  const vista = await ana.chamar(ficha, 'GET', `/f?id=${fichaAna}`)
  assert.equal(vista.status, 200)
  assert.ok(vista.dados.ficha.vistaEm, 'abrir marca como vista')
  assert.equal(vista.dados.contextoNome, 'Rafael Moreira')
  const outra = await bia.chamar(ficha, 'GET', `/f?id=${fichaAna}`)
  assert.equal(outra.status, 404, 'a ficha da Ana não abre para a Bia')
})

test('"usar em outro aluno": a ficha copiada entra nos treinos iguais', async () => {
  const c = await rafa.chamar(ficha, 'POST', '/f', { acao: 'copiar', id: fichaAna, aluno: idBia })
  assert.equal(c.status, 201, JSON.stringify(c.dados))
  assert.equal(c.dados.ficha.modelo, fichaAna)
  const vista = await rafa.chamar(ficha, 'GET', `/f?id=${fichaAna}`)
  assert.deepEqual(vista.dados.iguais.map((x: { alunoNome: string }) => x.alunoNome), ['Bia Lima'])
})

test('a ficha nova do mesmo personal arquiva a anterior', async () => {
  const r = await rafa.chamar(ficha, 'POST', '/f', { acao: 'salvar', aluno: idAna, contexto: { tipo: 'profissional' }, titulo: 'Hipertrofia, fase 2', divisoes: DIVISOES })
  assert.equal(r.status, 201)
  const minhas = await ana.chamar(ficha, 'GET', '/f?minhas')
  const porTitulo = Object.fromEntries(minhas.dados.fichas.map((f: { titulo: string; status: string }) => [f.titulo, f.status]))
  assert.deepEqual(porTitulo, { 'Hipertrofia, fase 2': 'ativa', 'Hipertrofia, fase 1': 'arquivada' })
  fichaAna = r.dados.ficha.id
})

test('o aluno grátis monta uma ficha dele; a segunda pede o Turma+', async () => {
  const propria = { acao: 'salvar', contexto: { tipo: 'propria' }, titulo: 'Meu treino de viagem', divisoes: [DIVISOES[0]] }
  assert.equal((await ana.chamar(ficha, 'POST', '/f', propria)).status, 201)
  const segunda = await ana.chamar(ficha, 'POST', '/f', { ...propria, titulo: 'Outro' })
  assert.equal(segunda.status, 402, JSON.stringify(segunda.dados))
  const grande = await bia.chamar(ficha, 'POST', '/f', { ...propria, divisoes: [...DIVISOES, ...DIVISOES, DIVISOES[0]] })
  assert.equal(grande.status, 402, 'no grátis, até 4 divisões')
  await ana.chamar(sessao, 'POST', '/s', { acao: 'mais' })
  assert.equal((await ana.chamar(ficha, 'POST', '/f', { ...propria, titulo: 'Outro' })).status, 201, 'com o Turma+ não tem limite')
  const naoE = await ana.chamar(ficha, 'POST', '/f', { ...propria, aluno: idBia })
  assert.equal(naoE.status, 403, 'a ficha própria é só para você')
})

test('o treino ao vivo registrado: volume, recordes, a sequência, o desafio e o painel do personal', async () => {
  const d = await ana.chamar(desafio, 'POST', '/d', { acao: 'criar', nome: 'Desafio da Ana', inicio: new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10), fim: new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10), pontuacao: 'dias' })
  assert.equal(d.status, 201, JSON.stringify(d.dados))
  const base = (id: string, horasAtras: number, carga: number) => ({
    acao: 'registrar',
    id,
    ficha: fichaAna,
    divisao: 'x',
    inicio: new Date(Date.now() - horasAtras * 3600_000).toISOString(),
    fim: new Date(Date.now() - horasAtras * 3600_000 + 50 * 60_000).toISOString(),
    exercicios: [{ exercicio: 'supino-reto', series: [{ reps: 10, carga, feita: true }, { reps: 8, carga, feita: true }] }],
    esforco: 8,
  })
  const t1 = await ana.chamar(treino, 'POST', '/t', base('treinoum00001', 30, 30))
  assert.equal(t1.status, 201, JSON.stringify(t1.dados))
  assert.equal(t1.dados.treino.volume, 540)
  assert.deepEqual(t1.dados.treino.recordes, [], 'a primeira vez não é recorde')
  const t2 = await ana.chamar(treino, 'POST', '/t', base('treinodois0001', 2, 32.5))
  assert.equal(t2.dados.treino.recordes[0].tipo, 'carga')
  assert.equal(t2.dados.treino.recordes[0].valor, 32.5)
  const repetido = await ana.chamar(treino, 'POST', '/t', base('treinodois0001', 2, 32.5))
  assert.equal(repetido.status, 200, 'o mesmo treino enviado de novo (sem internet) não duplica')
  assert.equal(repetido.dados.repetido, true)
  const ranking = await ana.chamar(desafio, 'GET', `/d?id=${d.dados.id}`)
  assert.equal(ranking.dados.ranking[0].pontos, 2, 'dois dias ativos')
  const alunos = await rafa.chamar(pro, 'GET', '/p?aba=alunos')
  const linha = alunos.dados.personal.find((a: { id: string }) => a.id === idAna)
  assert.ok(linha.ultimoTreino, 'o personal vê o último treino')
  const doRafa = await rafa.chamar(treino, 'GET', `/t?historico&aluno=${idAna}`)
  assert.equal(doRafa.dados.treinos.length, 2)
  const estranho = await bia.chamar(treino, 'GET', `/t?historico&aluno=${idAna}`)
  assert.equal(estranho.status, 403)
  const evolucao = await ana.chamar(treino, 'GET', '/t?evolucao=supino-reto')
  assert.equal(evolucao.dados.pontos.length, 2)
  const ultima = await ana.chamar(treino, 'GET', '/t?ultima')
  assert.deepEqual(ultima.dados.ultima['supino-reto'], [{ reps: 10, carga: 32.5 }, { reps: 8, carga: 32.5 }])
})

test('o treino fora do lugar é recusado: futuro, longo demais, de outra pessoa', async () => {
  const futuro = await ana.chamar(treino, 'POST', '/t', { acao: 'registrar', inicio: new Date(Date.now() + 3600_000).toISOString(), fim: new Date(Date.now() + 7200_000).toISOString(), exercicios: [{ exercicio: 'prancha', series: [{ reps: 1, carga: 0, feita: true }] }] })
  assert.equal(futuro.status, 400)
  const daAna = await bia.chamar(treino, 'POST', '/t', { acao: 'registrar', ficha: fichaAna, inicio: new Date(Date.now() - 3600_000).toISOString(), exercicios: [{ exercicio: 'prancha', series: [{ reps: 1, carga: 0, feita: true }] }] })
  assert.equal(daAna.status, 403)
})
