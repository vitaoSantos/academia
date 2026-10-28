import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AGENDA_PADRAO, horariosLivres, podeDesmarcar } from '../src/shared/agenda.ts'
import { cancelar, reservar, SITUACAO_VAZIA } from '../src/shared/aulas.ts'
import { contraste } from '../src/shared/cores.ts'
import { novoParticipante, ranking, somarTreino } from '../src/shared/desafio.ts'
import { EXERCICIOS } from '../src/shared/exercicios.ts'
import { lerReps, proximaDivisao, situacao } from '../src/shared/ficha.ts'
import { distanciaKm, SAO_LOURENCO, textoDistancia } from '../src/shared/geo.ts'
import { proximaGraduacao, SISTEMAS } from '../src/shared/graduacao.ts'
import { MODALIDADES } from '../src/shared/modalidades.ts'
import { limiteAlunosPersonal, mensalidadeEmpresa, PLATAFORMA_PADRAO } from '../src/shared/planos.ts'
import { ORDEM_TEMAS, temaDe } from '../src/shared/temas.ts'
import { instante, somarDias } from '../src/shared/tempo.ts'
import { identificador, normalizarCref, temTelefone } from '../src/shared/texto.ts'
import { forcaEstimada, recordes, sequencia, volume } from '../src/shared/treino.ts'

// As regras puras, iguais no navegador e no servidor

test('a região: de São Lourenço, Caxambu fica dentro dos 50 km e Poços de Caldas fica de fora', () => {
  const pocos = { lat: -21.78, lng: -46.5692 }
  const caxambu = { lat: -21.9753, lng: -44.9319 }
  assert.ok(Math.abs(distanciaKm(SAO_LOURENCO, pocos) - 161) < 2)
  assert.ok(distanciaKm(SAO_LOURENCO, caxambu) < 25)
  assert.equal(textoDistancia(0.42), '400 m')
  assert.equal(textoDistancia(8.3), '8,3 km')
  assert.equal(textoDistancia(161.04), '161 km')
})

test('o catálogo: 43 exercícios e 42 modalidades, todos com o que a tela precisa', () => {
  assert.equal(EXERCICIOS.length, 43)
  assert.equal(new Set(EXERCICIOS.map((e) => e.id)).size, EXERCICIOS.length)
  for (const e of EXERCICIOS) {
    assert.ok(e.principais.length && e.passos.length >= 2 && e.erros.length && e.atencao.length, e.id)
    assert.ok(e.atencao.every((a) => a.em >= 0 && a.em <= 1), e.id)
  }
  assert.equal(MODALIDADES.length, 42)
  assert.ok(MODALIDADES.filter((m) => m.graduacao).every((m) => SISTEMAS[m.graduacao!]))
})

test('a ficha: as repetições, a data de previsão e a rotação das divisões', () => {
  assert.deepEqual(lerReps('8-12'), { min: 8, max: 12 })
  assert.deepEqual(lerReps('40s'), { min: 0, max: 0, segundos: 40 })
  assert.deepEqual(lerReps('20min'), { min: 0, max: 0, segundos: 1200 })
  const hoje = '2026-10-28'
  assert.equal(situacao({ status: 'ativa', previsao: '2026-12-01' }, hoje), 'em-dia')
  assert.equal(situacao({ status: 'ativa', previsao: '2026-11-02' }, hoje), 'vencendo')
  assert.equal(situacao({ status: 'ativa', previsao: '2026-10-20' }, hoje), 'vencida')
  const f = { divisoes: [{ id: 'a', nome: 'A', itens: [] }, { id: 'b', nome: 'B', itens: [] }, { id: 'c', nome: 'C', itens: [] }] }
  assert.equal(proximaDivisao(f)?.id, 'a')
  assert.equal(proximaDivisao(f, 'a')?.id, 'b')
  assert.equal(proximaDivisao(f, 'c')?.id, 'a')
})

test('o treino: volume, força estimada (Epley) e recordes só contra o que já foi feito', () => {
  assert.equal(forcaEstimada(100, 1), 100)
  assert.equal(forcaEstimada(100, 10), 133.3)
  const feito = [{ exercicio: 'supino-reto', nome: 'Supino', series: [{ reps: 10, carga: 40, feita: true }, { reps: 8, carga: 45, feita: true }, { reps: 8, carga: 50, feita: false }] }]
  assert.equal(volume(feito), 400 + 360)
  assert.deepEqual(recordes(feito, {}), [], 'a primeira vez não é recorde')
  const r = recordes(feito, { 'supino-reto': { carga: 42.5, forca: 55 } })
  assert.equal(r[0].tipo, 'carga')
  assert.equal(r[0].valor, 45)
})

test('a sequência: semanas batendo a meta, com uma semana perdoada por mês', () => {
  const hoje = '2026-10-28' // quarta
  const semana = (seg: string, n: number) => Array.from({ length: n }, (_, i) => somarDias(seg, i))
  const datas = [...semana('2026-10-26', 3), ...semana('2026-10-19', 3), ...semana('2026-10-12', 1), ...semana('2026-10-05', 3), ...semana('2026-09-28', 3)]
  assert.equal(sequencia(datas, 3, hoje), 4, 'a semana de 12/10 é perdoada')
  assert.equal(sequencia(datas.filter((d) => d < '2026-10-26'), 3, hoje), 3, 'a semana atual ainda não bateu: conta desde a passada')
})

test('o desafio: treino curto não conta, um check-in por hora, e o ranking', () => {
  let p = novoParticipante('Ana')
  p = somarTreino(p, 'dias', { dia: '2026-10-20', minutos: 45, em: '2026-10-20T10:00:00Z' })
  assert.equal(p.pontos, 1)
  assert.equal(somarTreino(p, 'dias', { dia: '2026-10-21', minutos: 5, em: '2026-10-21T10:00:00Z' }), p, 'menos de 10 minutos')
  assert.equal(somarTreino(p, 'checkins', { dia: '2026-10-20', minutos: 40, em: '2026-10-20T10:30:00Z' }), p, 'menos de uma hora depois')
  const q = somarTreino(p, 'dias', { dia: '2026-10-20', minutos: 40, em: '2026-10-20T19:00:00Z' })
  assert.equal(q.pontos, 1, 'o mesmo dia não soma dois dias')
  assert.equal(q.checkins, 2)
  const r = ranking({ pontuacao: 'dias', participantes: { a: q, b: { ...novoParticipante('Bia'), dias: ['x', 'y'] } } })
  assert.equal(r[0].id, 'b')
})

test('a aula: a última vaga, a fila que anda sozinha e o lugar marcado', () => {
  const aula = { vagas: 2, lugares: 2 }
  let s = reservar(aula, SITUACAO_VAZIA, { conta: 'a', nome: 'A', em: '1', lugar: 2 }).situacao
  assert.equal(s.reservas[0].lugar, 2)
  s = reservar(aula, s, { conta: 'b', nome: 'B', em: '2', lugar: 2 }).situacao
  assert.equal(s.reservas[1].lugar, 1, 'o lugar 2 já era da A: fica com o livre')
  const fila = reservar(aula, s, { conta: 'c', nome: 'C', em: '3' })
  assert.equal(fila.resultado, 'espera')
  const c = cancelar(aula, fila.situacao, 'a')
  assert.equal(c.promovido?.conta, 'c')
  assert.equal(c.situacao.reservas.find((r) => r.conta === 'c')?.lugar, 2, 'herda o lugar de quem saiu')
  assert.equal(c.situacao.espera.length, 0)
})

test('a agenda do personal: os horários livres respeitam as sessões e a antecedência', () => {
  const quarta = '2026-10-28'
  const livres = horariosLivres(AGENDA_PADRAO, quarta, [{ inicio: '07:00', fim: '08:00', status: 'marcada' }], { data: '2026-10-27', minutos: 600, dia: 2 })
  assert.deepEqual(livres, ['06:00', '08:00', '09:00', '17:00', '18:00', '19:00', '20:00'])
  const hojeCedo = horariosLivres(AGENDA_PADRAO, quarta, [], { data: quarta, minutos: 7 * 60, dia: 3 })
  assert.equal(hojeCedo[0], '09:00', 'duas horas de antecedência')
  const s = { data: quarta, inicio: '18:00', status: 'marcada' as const }
  assert.equal(podeDesmarcar(s, AGENDA_PADRAO, 'aluno', Date.parse(instante(quarta, '08:00'))), false)
  assert.equal(podeDesmarcar(s, AGENDA_PADRAO, 'aluno', Date.parse(instante(quarta, '05:00'))), true)
  assert.equal(podeDesmarcar(s, AGENDA_PADRAO, 'profissional', Date.parse(instante(quarta, '17:59'))), true)
})

test('as faixas: o grau sobe até o limite e depois vem a próxima faixa', () => {
  const bjj = SISTEMAS['jiu-jitsu']
  assert.deepEqual(proximaGraduacao(bjj, undefined), { faixa: 'branca', graus: 0 })
  assert.deepEqual(proximaGraduacao(bjj, { faixa: 'branca', graus: 3 }), { faixa: 'branca', graus: 4 })
  assert.deepEqual(proximaGraduacao(bjj, { faixa: 'branca', graus: 4 }), { faixa: 'azul', graus: 0 })
  assert.deepEqual(proximaGraduacao(bjj, { faixa: 'cinza', graus: 4 }, true), { faixa: 'cinza-preta', graus: 0 })
})

test('os planos: limites e a mensalidade da rede com desconto', () => {
  const c = PLATAFORMA_PADRAO
  assert.equal(limiteAlunosPersonal({ plano: 'basico', status: 'ativo' }, c), 15)
  assert.equal(limiteAlunosPersonal({ plano: 'premium', status: 'ativo' }, c), Infinity)
  assert.equal(limiteAlunosPersonal({ plano: 'teste', testeAte: new Date(Date.now() - 1000).toISOString(), status: 'teste' }, c), 0, 'o teste venceu')
  assert.equal(mensalidadeEmpresa('basico', 1, c), 14900)
  assert.equal(mensalidadeEmpresa('premium', 4, c), Math.round(27900 * 4 * 0.85))
})

test('os estilos: o destaque sempre aparece sobre o fundo e o texto do botão lê bem', () => {
  for (const id of ORDEM_TEMAS) {
    const t = temaDe({ preset: id })
    assert.ok(contraste(t.destaque, t.fundo) >= 1.6, id)
    assert.ok(contraste(t.destaqueTexto, t.destaque) >= 3, id)
    assert.ok(contraste(t.texto, t.fundo) >= 7, id)
  }
  const cor = temaDe({ preset: 'clean', destaque: '#ffffff' })
  assert.ok(contraste(cor.destaque, cor.fundo) >= 1.6, 'branco no fundo branco escurece')
})

test('os textos: login por e-mail ou celular, CREF e telefone no meio do texto', () => {
  assert.deepEqual(identificador('Ana@Exemplo.com'), { tipo: 'email', valor: 'ana@exemplo.com' })
  assert.deepEqual(identificador('(35) 99876-1234'), { tipo: 'celular', valor: '35998761234' })
  assert.equal(identificador('123'), null)
  assert.equal(normalizarCref('cref 12345-G/mg'), '012345-G/MG')
  assert.equal(normalizarCref('123'), '')
  assert.ok(temTelefone('me chama 35 99876-1234'))
  assert.ok(!temTelefone('3x12 com 40kg e 20min de esteira'))
})
