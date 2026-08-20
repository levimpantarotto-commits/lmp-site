// build-respostas.mjs, gera as páginas-resposta do site da LMP.
//
// POR QUE ISTO EXISTE (20/08/2026)
// O site tinha DUAS páginas: home e portfólio. Quando um buscador ou um modelo de
// IA procura "quanto custa automatizar um processo com IA" para responder alguém,
// ele precisa de uma página que responda aquilo. A home não responde pergunta
// nenhuma: ela apresenta a empresa. Sem páginas-resposta, a LMP não tem como ser
// citada, por melhor que o posicionamento seja.
//
// O mesmo mecanismo já roda no imob8.com desde 31/07 e é o que faz aquele site
// aparecer em busca. Aqui a identidade visual é a da LMP: mesma paleta e mesmas
// fontes do index.html, para a página não parecer de outra empresa.
//
// Cada página carrega schema.org Article + FAQPage. O bloco FAQ é o que a IA cita
// direto, porque é pergunta e resposta em formato legível por máquina.
//
// Uso:  node build-respostas.mjs
import fs from 'fs';
import path from 'path';

const BASE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const SITE = 'https://levimp.com.br';
const HOJE = new Date().toISOString().slice(0, 10);

// markdown mínimo: ## título, - lista, **negrito**, parágrafo
function md(txt) {
  const out = [];
  let lista = null;
  const inline = (s) => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
  for (const linha of txt.trim().split('\n')) {
    const l = linha.trim();
    if (!l) { if (lista) { out.push(`<ul>${lista.join('')}</ul>`); lista = null; } continue; }
    if (l.startsWith('## ')) {
      if (lista) { out.push(`<ul>${lista.join('')}</ul>`); lista = null; }
      out.push(`<h2>${inline(l.slice(3))}</h2>`);
    } else if (l.startsWith('- ')) {
      (lista = lista || []).push(`<li>${inline(l.slice(2))}</li>`);
    } else {
      if (lista) { out.push(`<ul>${lista.join('')}</ul>`); lista = null; }
      out.push(`<p>${inline(l)}</p>`);
    }
  }
  if (lista) out.push(`<ul>${lista.join('')}</ul>`);
  return out.join('\n');
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function pagina(p) {
  const faqLd = p.faq?.length ? {
    '@type': 'FAQPage', '@id': `${SITE}/${p.slug}.html#faq`, inLanguage: 'pt-BR',
    mainEntity: p.faq.map((f) => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  } : null;

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${SITE}/${p.slug}.html#artigo`,
        headline: p.h1,
        description: p.desc,
        inLanguage: 'pt-BR',
        datePublished: HOJE,
        dateModified: HOJE,
        about: p.sobre,
        author: { '@type': 'Person', name: 'Levi Magno Pantarotto' },
        publisher: { '@id': `${SITE}/#organizacao` },
        mainEntityOfPage: `${SITE}/${p.slug}.html`,
      },
      ...(faqLd ? [faqLd] : []),
    ],
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(p.titulo)}</title>
<meta name="description" content="${esc(p.desc)}"/>
<link rel="canonical" href="${SITE}/${p.slug}.html"/>
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large"/>
<meta property="og:type" content="article"/>
<meta property="og:locale" content="pt_BR"/>
<meta property="og:title" content="${esc(p.titulo)}"/>
<meta property="og:description" content="${esc(p.desc)}"/>
<meta property="og:url" content="${SITE}/${p.slug}.html"/>
<meta property="og:site_name" content="LMP"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&family=Inter:wght@400;450;500;600&display=swap" rel="stylesheet"/>
<script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
</script>
<style>
:root{
  --escuro:#0B1B2E; --escuro-2:#071322; --navy:#102C4A;
  --paper:#F7F5F1; --branco:#FFFFFF; --ink:#141C26; --ink-soft:#59636F;
  --laranja:#E4641C; --ciano:#2FD4C4; --linha:rgba(20,28,38,.11);
  --display:'Bricolage Grotesque',system-ui,sans-serif;
  --body:'Inter',system-ui,sans-serif;
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--body);
  font-size:18px;line-height:1.65;-webkit-font-smoothing:antialiased}
.topo{background:var(--escuro);color:var(--paper);padding:18px 24px}
.topo a{color:var(--paper);text-decoration:none;font-family:var(--display);
  font-weight:700;letter-spacing:-.02em;font-size:20px}
.topo .cat{color:var(--ciano);font-weight:450;font-size:14px;margin-left:10px;
  font-family:var(--body);letter-spacing:0}
main{max-width:720px;margin:0 auto;padding:56px 24px 40px}
h1{font-family:var(--display);font-weight:700;font-size:clamp(30px,5vw,44px);
  line-height:1.08;letter-spacing:-.03em;margin:0 0 14px;text-wrap:balance}
.fina{font-size:20px;color:var(--ink-soft);margin:0 0 40px;line-height:1.5}
h2{font-family:var(--display);font-weight:600;font-size:clamp(22px,3vw,27px);
  letter-spacing:-.02em;margin:44px 0 14px;text-wrap:balance}
p{margin:0 0 18px}
ul{margin:0 0 18px;padding-left:22px}
li{margin-bottom:9px}
strong{font-weight:600}
.faq{margin-top:56px;padding-top:32px;border-top:1px solid var(--linha)}
.faq h2{margin-top:0}
.faq dt{font-weight:600;margin-top:24px;font-family:var(--display);font-size:19px}
.faq dd{margin:8px 0 0;color:var(--ink-soft)}
.cta{margin:56px 0 0;background:var(--escuro);color:var(--paper);
  padding:36px 32px;border-radius:14px}
.cta h2{margin:0 0 10px;color:var(--branco)}
.cta p{color:rgba(247,245,241,.78);margin-bottom:22px}
.cta a{display:inline-block;background:var(--laranja);color:var(--branco);
  text-decoration:none;font-weight:600;padding:14px 26px;border-radius:9px}
.cta a:hover{filter:brightness(1.08)}
.rodape{max-width:720px;margin:0 auto;padding:34px 24px 64px;color:var(--ink-soft);font-size:15px}
.rodape a{color:var(--ink)}
</style>
</head>
<body>
<header class="topo">
  <a href="${SITE}/">LMP<span class="cat">Automação e IA para empresas</span></a>
</header>
<main>
  <h1>${esc(p.h1)}</h1>
  <p class="fina">${esc(p.linhaFina)}</p>
  ${md(p.corpo)}
  ${p.faq?.length ? `<section class="faq">
    <h2>Perguntas frequentes</h2>
    <dl>
      ${p.faq.map((f) => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join('\n      ')}
    </dl>
  </section>` : ''}
  <section class="cta">
    <h2>Quer saber onde a sua operação perde dinheiro?</h2>
    <p>O diagnóstico mede o trabalho repetido da sua empresa em horas e em reais, antes de automatizar qualquer coisa. Se não houver nada que valha automatizar, a gente diz isso.</p>
    <a href="${SITE}/#contato">Falar sobre um diagnóstico</a>
  </section>
</main>
<footer class="rodape">
  <p><strong>LMP</strong>: automação e implementação de inteligência artificial para empresas. <a href="${SITE}/">Voltar ao site</a></p>
</footer>
</body>
</html>
`;
}

// ---------------------------------------------------------------- conteúdo
const PAGINAS = [
  {
    slug: 'quanto-custa-automatizar-um-processo-com-ia',
    titulo: 'Quanto custa automatizar um processo com IA numa empresa',
    h1: 'Quanto custa automatizar um processo com IA',
    desc: 'As faixas reais de investimento para automatizar um processo com inteligência artificial numa empresa brasileira, o que faz o preço variar, e como saber se compensa antes de contratar.',
    linhaFina: 'A pergunta certa não é quanto custa automatizar. É quanto está custando não automatizar.',
    sobre: 'custo de automação de processos com inteligência artificial em empresas',
    corpo: `
Toda proposta de automação que começa pelo preço está começando errado, e quem compra assim quase sempre paga por algo que não usa.

O motivo é simples: automação não tem preço de tabela porque não tem escopo de tabela. Duas empresas que pedem "automatizar o atendimento" podem estar pedindo coisas com dez vezes de diferença entre si.

## O que realmente faz o preço mudar

**Quantos sistemas precisam conversar.** Automatizar dentro de uma ferramenta só é barato. Fazer o WhatsApp falar com o ERP, que fala com a planilha do financeiro, que alimenta o relatório do dono, é outro projeto.

**Se a regra existe escrita.** Este é o custo escondido que ninguém antecipa. Quando a empresa não sabe dizer em que condição um pedido é aprovado, metade do projeto vira descobrir isso. Não é trabalho de tecnologia, é de definição, e é onde a maioria dos projetos atrasa.

**Se alguém precisa continuar decidindo.** Automação que executa é uma coisa. Automação que decide, com regra, limite e exceção, é outra.

**Volume.** Uma automação que roda cem vezes por mês e outra que roda cem mil vezes por dia têm o mesmo desenho e infraestruturas diferentes.

## As faixas, com honestidade

**Ferramenta pronta assinada por mês.** Existem produtos de prateleira com IA embutida para atendimento, CRM e disparo. Custam dezenas a poucas centenas de reais por mês. Resolvem bem o problema padrão, e mal qualquer coisa fora do padrão.

**Automação pontual sob medida.** Um processo, dois ou três sistemas conversando, regra definida. É projeto de semanas, e o investimento é de milhares de reais, com manutenção mensal menor.

**Implantação de operação.** Vários processos, integração com o que a empresa já usa, medição de resultado. É projeto de meses e investimento na casa das dezenas de milhares, com mensalidade proporcional.

Desconfie de quem dá o número antes de perguntar o que você faz. Preço fechado sem diagnóstico é preço de escopo genérico, e escopo genérico é exatamente o que não resolve.

## A conta que decide, e você faz sozinho

Pegue **um** processo repetido da sua empresa. Só um. E responda quatro perguntas:

- Quantas vezes ele acontece por mês?
- Quantos minutos leva cada vez?
- Quanto custa a hora da pessoa que faz?
- O que acontece quando ele falha ou atrasa?

Multiplique os três primeiros e você tem o custo direto por mês. A quarta pergunta é a que quase sempre revela o número maior, porque é onde mora a venda perdida, o cliente irritado e a multa.

**Se o custo anual desse processo não passar do investimento da automação, não automatize.** Um fornecedor honesto vai te dizer isso antes de você assinar.

## Onde a conta costuma surpreender

Num diagnóstico real numa empresa de catorze pessoas, a conta apontou **72 horas por mês de trabalho repetido**. E o detalhe que importa: nenhuma delas estava no processo que o dono achava que era o problema.

É esse o padrão. A gente arruma o que vê, e o dinheiro quase nunca está onde a gente vê.

## O erro que custa o projeto inteiro

Automatizar antes de definir. Já entreguei uma automação que rodou catorze dias com log verde, tudo bonito no painel, sem produzir absolutamente nada de resultado. A máquina fazia exatamente o que eu mandei, e o que eu mandei não servia para nada.

O problema não era falta de sistema. Era falta de definição. Documentar vem antes, sempre.
`,
    faq: [
      { q: 'Quanto custa implementar IA em uma empresa?',
        a: 'Depende do escopo, e escopo de automação não tem tabela. Ferramentas prontas de prateleira com IA embutida custam de dezenas a poucas centenas de reais por mês e resolvem o problema padrão. Uma automação pontual sob medida, com dois ou três sistemas conversando, é projeto de semanas e investimento de milhares de reais. Uma implantação de operação inteira, com integração aos sistemas existentes e medição de resultado, é projeto de meses na casa das dezenas de milhares. O que faz o preço variar é quantos sistemas precisam conversar, se a regra de negócio já existe escrita, se a automação precisa decidir ou só executar, e o volume.' },
      { q: 'Como saber se vale a pena automatizar um processo?',
        a: 'Pegue um processo repetido e responda quatro perguntas: quantas vezes acontece por mês, quantos minutos leva cada vez, quanto custa a hora de quem faz, e o que acontece quando ele falha ou atrasa. Os três primeiros dão o custo direto mensal. O quarto costuma revelar o número maior, porque é onde está a venda perdida e o cliente irritado. Se o custo anual do processo não passar do investimento da automação, não automatize.' },
      { q: 'Por que empresas de automação não dão o preço antes de conversar?',
        a: 'Porque preço fechado sem diagnóstico é preço de escopo genérico, e escopo genérico não resolve problema específico. Duas empresas que pedem para automatizar o atendimento podem estar pedindo coisas com dez vezes de diferença de complexidade entre si. Quem dá o número antes de perguntar o que você faz está vendendo produto de prateleira com nome de projeto.' },
    ],
  },
  {
    slug: 'quais-processos-automatizar-com-ia-na-empresa',
    titulo: 'Quais processos da sua empresa dá para automatizar com IA',
    h1: 'Quais processos dá para automatizar com IA',
    desc: 'O critério para escolher qual processo automatizar primeiro numa empresa, as três colunas que separam o que sai da sua mesa do que nunca sai, e o teste que revela a lista de prioridades sem adivinhação.',
    linhaFina: 'A maioria das empresas automatiza o processo errado. Não por burrice, por instinto: a gente arruma o que vê, e o dinheiro quase nunca está onde a gente vê.',
    sobre: 'escolha de processos para automatizar com inteligência artificial',
    corpo: `
Quase toda empresa que procura automação já sabe o que quer automatizar. E quase sempre está olhando para o lugar errado, porque escolheu pelo que incomoda, não pelo que custa.

O que incomoda é visível: a fila, o telefone tocando, a papelada na mesa. O que custa costuma ser silencioso: o pedido que ficou dois dias esperando aprovação, o lead que ninguém respondeu, o relatório que sai errado e ninguém confere.

## As três colunas

Liste tudo que hoje passa pela sua mesa ou pela mesa de alguém, e separe em três colunas.

**Só você pode.** Contrato grande, contratação, direção, conversa com sócio e banco. Fica. Nem deve sair.

**Você não precisa fazer, precisa saber.** Desconto até um limite, compra até um valor, prazo dentro da regra. Isso vira **regra escrita** mais relatório. É a coluna mais valiosa e a mais ignorada.

**Você nem precisa saber.** Conferência, agendamento, cadastro, follow-up padrão, atualização de planilha. Sai da sua mesa de vez.

A maior parte do que está na sua mesa hoje é coluna três disfarçada de coluna um.

## Por que a coluna do meio é onde está o dinheiro

Todo pedido de aprovação que se repete é uma regra que ninguém escreveu.

Quando o time para e espera o seu "pode", ninguém é lento: eles estão esperando. E o gargalo não é braço, é aprovação. Contratar mais gente não muda isso, porque a decisão continua na mesma mesa.

O formato de uma regra tem quatro partes: **condição, limite, exceção e quem avisa.** Exemplo em serviço: desconto até tanto e prazo até tanto seguem sozinhos, fora disso sobe para o dono. Uma linha.

E aqui está o ponto que liga tudo: **regra escrita é a única coisa que uma máquina consegue executar.** Regra na cabeça de alguém não automatiza. É por isso que muita gente me procura querendo automatizar e sai da conversa com um documento de duas páginas em vez de um contrato. O problema não era falta de sistema, era falta de definição.

## O que a IA faz bem e o que ela não faz

**Faz bem:** ler e classificar texto, responder pergunta repetida, extrair informação de documento, resumir conversa, preencher sistema, lembrar de coisa no prazo certo, e executar regra escrita sem se cansar.

**Não faz:** decidir o que ninguém definiu, assumir responsabilidade, e substituir julgamento em situação nova. Se o processo depende de alguém "sentir" o caso, a automação vai errar com muita eficiência.

## Os candidatos que aparecem em quase toda empresa

- **Primeiro atendimento.** Alguém pergunta, alguém responde a mesma coisa pela milésima vez, e fora do horário ninguém responde.
- **Follow-up.** O trabalho que humano não faz e máquina não esquece. É onde mais dinheiro escapa em silêncio.
- **Cotação e orçamento repetido.** Mesmo cálculo, dados diferentes.
- **Relatório recorrente.** Alguém abre três sistemas e copia número para uma planilha toda segunda.
- **Cadastro e conferência de documento.** Trabalho de olho humano em coisa que não muda.

## O teste do envelope

Escolha a semana mais tranquila do ano. Tire uma pessoa da operação por três dias, férias ou treinamento, e não avise que é teste.

**O que quebrar nesses três dias é a sua lista de prioridades.** Não precisa adivinhar: a operação te conta.

## E o teste que você faz sozinho, em cinco dias

Anote cada tarefa que você fez e quanto tempo levou. No fim da semana, marque cada linha com uma pergunta: **isso exigiu que fosse eu?**

O que sobrar marcado com "não" é por onde começar.
`,
    faq: [
      { q: 'Quais processos de uma empresa podem ser automatizados com IA?',
        a: 'Os que aparecem em quase toda empresa são: primeiro atendimento, follow-up de clientes e leads, cotação e orçamento repetido, relatório recorrente que alguém monta copiando de três sistemas, e cadastro ou conferência de documento. O critério não é o que mais incomoda, é o que mais custa: some quantas vezes o processo acontece por mês, quanto tempo leva e o que acontece quando ele falha.' },
      { q: 'Como escolher qual processo automatizar primeiro?',
        a: 'Separe tudo que passa pela sua mesa em três colunas: o que só você pode fazer, o que você não precisa fazer mas precisa saber, e o que você nem precisa saber. A terceira coluna sai da sua mesa de vez. A segunda vira regra escrita mais relatório, e é onde está a maior parte do dinheiro, porque todo pedido de aprovação que se repete é uma regra que ninguém escreveu.' },
      { q: 'O que a inteligência artificial não consegue automatizar numa empresa?',
        a: 'Ela não decide o que ninguém definiu, não assume responsabilidade e não substitui julgamento em situação nova. Se o processo depende de alguém sentir o caso, a automação vai errar com muita eficiência. Regra escrita é a única coisa que uma máquina consegue executar; regra na cabeça de alguém não automatiza, e é por isso que a etapa de definição vem antes da de tecnologia.' },
    ],
  },
];

// ---------------------------------------------------------------- escrita
let n = 0;
for (const p of PAGINAS) {
  fs.writeFileSync(path.join(BASE, `${p.slug}.html`), pagina(p));
  console.log('gerado:', `${p.slug}.html`);
  n++;
}

// sitemap COMPLETO: home, portfólio e as páginas-resposta
const urls = [
  { loc: `${SITE}/`, pri: '1.0', freq: 'weekly' },
  { loc: `${SITE}/portfolio.html`, pri: '0.8', freq: 'monthly' },
  ...PAGINAS.map((p) => ({ loc: `${SITE}/${p.slug}.html`, pri: '0.7', freq: 'monthly' })),
];
fs.writeFileSync(path.join(BASE, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${HOJE}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`).join('\n')}
</urlset>
`);
console.log(`gerado: sitemap.xml (${urls.length} urls)`);
console.log(`\n${n} páginas-resposta escritas.`);
