import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import aluno from '../netlify/functions/aluno.mts'
import explorar from '../netlify/functions/explorar.mts'
import pagina from '../netlify/functions/pagina.mts'
import painel from '../netlify/functions/painel.mts'
import sessao from '../netlify/functions/sessao.mts'
import { gravarJSON, usarArmazem, CHAVES, type Armazem } from '../netlify/lib/store.ts'
import { CAXAMBU, Navegador, novaConta, pendentes, POCOS, SL } from './ajuda.ts'
import { LojaMemoria } from './memoria.ts'

// A academia e a rede: o cadastro, as unidades no mapa, as modalidades e a grade, os convites
// (aluno e professor), o pedido "sou aluno daqui" e o limite do plano

before(() => {
  usarArmazem(new LojaMemoria() as unknown as Armazem)
  // sem a demonstração: o mapa só tem o que os testes criam
  process.env.TURMA_SEM_DEMONSTRACAO = '1'
})

after(async () => {
  await Promise.allSettled(pendentes)
})

const dona = new Navegador('10.1.0.1')
let slug = ''
let centro = ''

test('a dona cria a academia (e a conta) de uma vez: 30 dias de teste, a página e o pino no mapa', async () => {
  const r = await dona.chamar(sessao, 'POST', '/s', {
    acao: 'empresa',
    empresa: 'Força Total',
    tipo: 'academia',
    cidade: SL,
    unidade: { nome: 'Centro', endereco: 'Av. Dom Pedro II, 1200', ponto: { lat: -22.118, lng: -45.054 } },
    visual: { preset: 'ferro', destaque: '#f5c518' },
    plano: 'basico',
    nome: 'Marta Ribeiro',
    login: 'marta@forca.com',
    senha: 'senha-da-marta',
  })
  assert.equal(r.status, 201, JSON.stringify(r.dados))
  assert.equal(r.dados.usuario.nome, 'Marta Ribeiro')
  slug = r.dados.empresa
  assert.equal(slug, 'forca-total')
  assert.equal(r.dados.empresas[0].papel, 'dono')
  const e = await dona.chamar(painel, 'GET', `/p?slug=${slug}&aba=empresa`)
  assert.equal(e.dados.empresa.status, 'teste')
  assert.equal(e.dados.empresa.planoDepois, 'basico')
  assert.equal(e.dados.nivel, 'premium', 'no teste tudo liberado')
  assert.deepEqual(e.dados.empresa.modalidades.map((m: { id: string }) => m.id), ['musculacao', 'funcional', 'spinning', 'jump', 'zumba', 'alongamento'])
  centro = e.dados.empresa.unidades[0].id
  const repetida = await new Navegador('10.1.0.2').chamar(sessao, 'POST', '/s', { acao: 'empresa', empresa: 'Outra', slug: 'forca-total', nome: 'Outra Pessoa', cidade: SL, unidade: { endereco: 'Rua A, 10' }, login: 'outra@x.com', senha: 'senha-forte-1' })
  assert.equal(repetida.status, 409)
})

test('a rede ganha unidades (uma em Poços de Caldas) e só as perto aparecem no mapa de quem está em São Lourenço', async () => {
  const cax = await dona.chamar(painel, 'POST', '/p', { slug, acao: 'unidade', unidade: { nome: 'Caxambu', endereco: 'R. Major Penha, 310', cidade: CAXAMBU, ponto: { lat: -21.9768, lng: -44.9334 } } })
  assert.equal(cax.status, 200, JSON.stringify(cax.dados))
  assert.equal(cax.dados.empresa.tipo, 'rede', 'duas unidades: vira rede')
  await dona.chamar(painel, 'POST', '/p', { slug, acao: 'unidade', unidade: { nome: 'Poços', endereco: 'R. Assis Figueiredo, 1500', cidade: POCOS, ponto: { lat: -21.7866, lng: -46.5651 } } })
  const perto = await new Navegador().chamar(explorar, 'GET', `/e?lat=${SL.lat}&lng=${SL.lng}&raio=50`)
  assert.equal(perto.status, 200, JSON.stringify(perto.dados))
  assert.deepEqual(perto.dados.unidades.map((u: { unidadeNome: string }) => u.unidadeNome).sort(), ['Caxambu', 'Centro'])
  assert.equal(perto.dados.numeros.academias, 1)
  const longe = await new Navegador().chamar(explorar, 'GET', `/e?lat=${POCOS.lat}&lng=${POCOS.lng}&raio=10`)
  assert.deepEqual(longe.dados.unidades.map((u: { unidadeNome: string }) => u.unidadeNome), ['Poços'])
})

test('a modalidade com faixas e a grade com vagas, lugar marcado e professor', async () => {
  const luta = await dona.chamar(painel, 'POST', '/p', { slug, acao: 'modalidade', id: 'jiu-jitsu', inclusa: false, precoDesde: 9900 })
  assert.equal(luta.status, 200, JSON.stringify(luta.dados))
  const m = luta.dados.empresa.modalidades.find((x: { id: string }) => x.id === 'jiu-jitsu')
  assert.equal(m.graduacao.id, 'jiu-jitsu')
  assert.equal(m.inclusa, false)
  const bike = await dona.chamar(painel, 'POST', '/p', { slug, acao: 'aula', aula: { modalidade: 'spinning', unidade: centro, dias: [1, 3, 5], inicio: '06:30', duracao: 45, vagas: 20, reserva: true, lugarMarcado: true, lugares: 20 } })
  assert.equal(bike.status, 200, JSON.stringify(bike.dados))
  const aula = bike.dados.empresa.grade[0]
  assert.equal(aula.lugares, 20)
  assert.equal(aula.reserva, true)
  const semModalidade = await dona.chamar(painel, 'POST', '/p', { slug, acao: 'aula', aula: { modalidade: 'ballet', unidade: centro, dias: [1], inicio: '10:00' } })
  assert.equal(semModalidade.status, 400, 'só as modalidades que a academia oferece')
  const busca = await new Navegador().chamar(explorar, 'GET', `/e?lat=${SL.lat}&lng=${SL.lng}&raio=50&modalidade=spinning`)
  assert.deepEqual(busca.dados.unidades.map((u: { unidadeNome: string }) => u.unidadeNome), ['Centro'], 'a bike só tem aula no Centro')
})

test('o convite do professor: ele entra na equipe e ganha a academia na conta', async () => {
  const c = await dona.chamar(painel, 'POST', '/p', { slug, acao: 'convite', tipo: 'professor', nome: 'Diego' })
  assert.equal(c.status, 201, JSON.stringify(c.dados))
  const codigo = c.dados.convite.codigo
  const visto = await new Navegador().chamar(aluno, 'GET', `/a?convite=${codigo}`)
  assert.equal(visto.dados.de.nome, 'Força Total')
  const { nav: diego } = await novaConta(sessao, 'Diego Alves')
  const aceito = await diego.chamar(aluno, 'POST', '/a', { acao: 'convite', codigo })
  assert.equal(aceito.status, 200, JSON.stringify(aceito.dados))
  const s = await diego.chamar(sessao, 'GET', '/s')
  assert.equal(s.dados.empresas[0].papel, 'professor')
  const outro = await (await novaConta(sessao, 'Outro')).nav.chamar(aluno, 'POST', '/a', { acao: 'convite', codigo })
  assert.equal(outro.status, 409, 'o convite é de uma pessoa só')
  // o professor vê o painel, mas não configura
  const config = await diego.chamar(painel, 'POST', '/p', { slug, acao: 'perfil', nome: 'Hackeada' })
  assert.equal(config.status, 403)
})

test('o aluno: convite pela unidade, e o pedido "sou aluno daqui" que a academia aprova', async () => {
  const c = await dona.chamar(painel, 'POST', '/p', { slug, acao: 'convite', tipo: 'aluno', nome: 'Ana', unidade: centro })
  const { nav: ana, usuario: contaAna } = await novaConta(sessao, 'Ana Souza')
  const ok = await ana.chamar(aluno, 'POST', '/a', { acao: 'convite', codigo: c.dados.convite.codigo })
  assert.equal(ok.status, 200, JSON.stringify(ok.dados))
  const inicio = await ana.chamar(aluno, 'GET', '/a?inicio')
  assert.equal(inicio.dados.vinculos[0].nome, 'Força Total')
  assert.equal(inicio.dados.vinculos[0].unidadeNome, 'Força Total · Centro')
  const s = await ana.chamar(sessao, 'GET', '/s')
  assert.deepEqual(s.dados.usuario.principal, { tipo: 'empresa', id: slug }, 'o app veste a marca da academia')

  const { nav: bia, usuario: contaBia } = await novaConta(sessao, 'Bia Lima')
  const pedido = await bia.chamar(aluno, 'POST', '/a', { acao: 'pedir', empresa: slug })
  assert.equal(pedido.status, 200, JSON.stringify(pedido.dados))
  assert.equal(pedido.dados.vinculos[0].status, 'pendente')
  const lista = await dona.chamar(painel, 'GET', `/p?slug=${slug}&aba=alunos`)
  assert.deepEqual(lista.dados.alunos.map((a: { nome: string; status: string }) => `${a.nome}:${a.status}`).sort(), ['Ana Souza:ativo', 'Bia Lima:pendente'])
  const aprova = await dona.chamar(painel, 'POST', '/p', { slug, acao: 'aluno', id: contaBia.id, op: 'aprovar' })
  assert.equal(aprova.status, 200, JSON.stringify(aprova.dados))
  const pagina1 = await new Navegador().chamar(pagina, 'GET', `/p?slug=${slug}`)
  assert.equal(pagina1.dados.empresa.numeros.alunos, 2)
  assert.equal(pagina1.dados.empresa.cnpj, undefined)
  assert.ok(contaAna.id)
})

test('o limite do plano básico (por unidade): passou do limite, não entra aluno novo', async () => {
  // o básico depois do teste, com o limite baixo: 1 aluno por unidade × 3 unidades = 3 alunos
  await dona.chamar(painel, 'POST', '/p', { slug, acao: 'plano', plano: 'basico' })
  await gravarJSON(CHAVES.plataforma, { limites: { alunosAcademiaBasico: 1 } })
  const entrar = async (nome: string) => {
    const c = await dona.chamar(painel, 'POST', '/p', { slug, acao: 'convite', tipo: 'aluno' })
    const { nav } = await novaConta(sessao, nome)
    return nav.chamar(aluno, 'POST', '/a', { acao: 'convite', codigo: c.dados.convite.codigo })
  }
  assert.equal((await entrar('Caio Reis')).status, 200, 'o terceiro cabe')
  const quarto = await entrar('Davi Reis')
  assert.equal(quarto.status, 402, JSON.stringify(quarto.dados))
  await gravarJSON(CHAVES.plataforma, {})
})

test('a graduação: o professor gradua e a faixa vai para o histórico do aluno', async () => {
  const lista = await dona.chamar(painel, 'GET', `/p?slug=${slug}&aba=alunos`)
  const ana = lista.dados.alunos.find((a: { nome: string }) => a.nome === 'Ana Souza')
  const g1 = await dona.chamar(painel, 'POST', '/p', { slug, acao: 'graduar', aluno: ana.id, modalidade: 'jiu-jitsu' })
  assert.equal(g1.status, 200, JSON.stringify(g1.dados))
  const g2 = await dona.chamar(painel, 'POST', '/p', { slug, acao: 'graduar', aluno: ana.id, modalidade: 'jiu-jitsu' })
  const faixas = g2.dados.alunos.find((a: { id: string }) => a.id === ana.id).faixas['jiu-jitsu']
  assert.deepEqual(faixas.map((f: { faixa: string; graus: number }) => `${f.faixa}:${f.graus}`), ['branca:0', 'branca:1'])
  const semFaixa = await dona.chamar(painel, 'POST', '/p', { slug, acao: 'graduar', aluno: ana.id, modalidade: 'spinning' })
  assert.equal(semFaixa.status, 400)
})
