function lerNumeroNaoNegativo(valor) {
  if (valor === null || valor === undefined || (typeof valor === 'string' && valor.trim() === '')) return { estado: 'ausente', valor: null };
  if (typeof valor !== 'number' && typeof valor !== 'string') return { estado: 'invalido', valor: null };
  const numero = typeof valor === 'number' ? valor : Number(valor.replace(',', '.'));
  return Number.isFinite(numero) && numero >= 0 ? { estado: 'valido', valor: numero } : { estado: 'invalido', valor: null };
}

export function calcularRetornoAutomacao(entrada = {}) {
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) return { valido: false, erros: ['entrada'], camposPendentes: [], capacidadeHoras: null, custoEquivalente: null, ganhoLiquido: null, paybackMeses: null, temRetornoFinanceiro: false };
  const campos = Object.fromEntries(['execucoesMes', 'minutosPorExecucao', 'custoHora', 'custosEvitaveisMes', 'manutencaoMes', 'implantacao'].map((nome) => [nome, lerNumeroNaoNegativo(entrada[nome])]));
  const obrigatorios = ['execucoesMes', 'minutosPorExecucao'];
  const erros = Object.entries(campos).filter(([nome, campo]) => campo.estado === 'invalido' || (campo.estado === 'ausente' && obrigatorios.includes(nome))).map(([nome]) => nome);
  const camposPendentes = Object.entries(campos).filter(([, campo]) => campo.estado === 'ausente').map(([nome]) => nome);
  if (erros.length) return { valido: false, erros, camposPendentes, capacidadeHoras: null, custoEquivalente: null, ganhoLiquido: null, paybackMeses: null, temRetornoFinanceiro: false };

  const capacidadeHoras = (campos.execucoesMes.valor * campos.minutosPorExecucao.valor) / 60;
  const custoEquivalente = campos.custoHora.estado === 'valido' ? capacidadeHoras * campos.custoHora.valor : null;
  const ganhoLiquido = campos.custosEvitaveisMes.estado === 'valido' && campos.manutencaoMes.estado === 'valido' ? campos.custosEvitaveisMes.valor - campos.manutencaoMes.valor : null;
  const temRetornoFinanceiro = ganhoLiquido !== null && ganhoLiquido > 0;
  const paybackMeses = temRetornoFinanceiro && campos.implantacao.estado === 'valido' ? campos.implantacao.valor / ganhoLiquido : null;
  if (![capacidadeHoras, custoEquivalente, ganhoLiquido, paybackMeses].every((valor) => valor === null || Number.isFinite(valor))) return { valido: false, erros: ['resultado'], camposPendentes, capacidadeHoras: null, custoEquivalente: null, ganhoLiquido: null, paybackMeses: null, temRetornoFinanceiro: false };
  return { valido: true, erros: [], camposPendentes, capacidadeHoras, custoEquivalente, ganhoLiquido, paybackMeses, temRetornoFinanceiro };
}
