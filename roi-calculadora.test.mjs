import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularRetornoAutomacao } from './roi-calculadora.mjs';

test('rejeita obrigatórios nulos, vazios, negativos, inválidos, booleanos e objetos', () => {
  for (const entrada of [null, '', -1, Number.NaN, Infinity, true, {}]) {
    assert.equal(calcularRetornoAutomacao({ execucoesMes: entrada, minutosPorExecucao: 4 }).valido, false);
    assert.equal(calcularRetornoAutomacao({ execucoesMes: 1, minutosPorExecucao: entrada }).valido, false);
  }
  for (const entrada of [true, {}]) {
    assert.equal(calcularRetornoAutomacao({ execucoesMes: 1, minutosPorExecucao: 1, custoHora: entrada }).valido, false);
  }
});

test('campo financeiro vazio é desconhecido; zero explícito permanece válido', () => {
  const vazio = calcularRetornoAutomacao({ execucoesMes: 10, minutosPorExecucao: 6 });
  assert.equal(vazio.valido, true); assert.equal(vazio.capacidadeHoras, 1);
  assert.equal(vazio.custoEquivalente, null); assert.equal(vazio.ganhoLiquido, null); assert.equal(vazio.paybackMeses, null);
  assert.deepEqual(vazio.camposPendentes, ['custoHora', 'custosEvitaveisMes', 'manutencaoMes', 'implantacao']);
  const zero = calcularRetornoAutomacao({ execucoesMes: 0, minutosPorExecucao: 0, custoHora: 0, custosEvitaveisMes: 0, manutencaoMes: 0, implantacao: 0 });
  assert.equal(zero.valido, true); assert.equal(zero.custoEquivalente, 0); assert.equal(zero.ganhoLiquido, 0); assert.equal(zero.paybackMeses, null);
});

test('separa capacidade potencial de ganho financeiro sem dupla contagem', () => {
  const resultado = calcularRetornoAutomacao({ execucoesMes: 500, minutosPorExecucao: 4, custoHora: 35, custosEvitaveisMes: 600, manutencaoMes: 200, implantacao: 10000 });
  assert.deepEqual(resultado, { valido: true, erros: [], camposPendentes: [], capacidadeHoras: 33.333333333333336, custoEquivalente: 1166.6666666666667, ganhoLiquido: 400, paybackMeses: 25, temRetornoFinanceiro: true });
});

test('não calcula payback quando ganho é zero ou implantação está ausente', () => {
  const semGanho = calcularRetornoAutomacao({ execucoesMes: 10, minutosPorExecucao: 3, custosEvitaveisMes: 200, manutencaoMes: 200, implantacao: 1000 });
  assert.equal(semGanho.temRetornoFinanceiro, false); assert.equal(semGanho.paybackMeses, null);
  const semImplantacao = calcularRetornoAutomacao({ execucoesMes: 1, minutosPorExecucao: 1, custosEvitaveisMes: 1, manutencaoMes: 0 });
  assert.equal(semImplantacao.temRetornoFinanceiro, true); assert.equal(semImplantacao.paybackMeses, null);
});

test('implantação zero tem payback imediato somente com ganho líquido positivo', () => {
  assert.equal(calcularRetornoAutomacao({ execucoesMes: 1, minutosPorExecucao: 1, custosEvitaveisMes: 1, manutencaoMes: 0, implantacao: 0 }).paybackMeses, 0);
});

test('rejeita overflow de entrada e resultado', () => {
  assert.equal(calcularRetornoAutomacao({ execucoesMes: Infinity, minutosPorExecucao: 1 }).valido, false);
  const overflow = calcularRetornoAutomacao({ execucoesMes: Number.MAX_VALUE, minutosPorExecucao: Number.MAX_VALUE });
  assert.equal(overflow.valido, false); assert.deepEqual(overflow.erros, ['resultado']);
});
