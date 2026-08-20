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
const SITE = 'https://www.levimp.com.br';
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
  {
    slug: 'quanto-tempo-leva-para-implantar-ia-em-uma-empresa',
    titulo: 'Quanto tempo leva para implantar IA em uma empresa',
    h1: 'Quanto tempo leva para implantar IA numa empresa',
    desc: 'Os prazos reais de implantação de inteligência artificial por tipo de projeto, o que de fato atrasa uma automação, e por que a etapa que consome tempo não é a técnica.',
    linhaFina: 'O relógio do projeto não começa quando você assina. Começa quando a regra fica escrita.',
    sobre: 'prazo de implantação de inteligência artificial e automação em empresas',
    corpo: `
Quem pergunta quanto tempo leva quase sempre está perguntando quanto tempo o fornecedor vai levar. Essa é a metade curta da resposta, e é a metade previsível.

A metade que decide o prazo é a sua: quanto tempo a sua empresa leva para dizer, por escrito, como o processo funciona de verdade. Enquanto isso não existe, não há o que construir.

## Os prazos por tipo de projeto

**Ferramenta pronta ligada no que você já usa.** Assinar um produto de prateleira, conectar no WhatsApp ou no CRM e configurar. É questão de dias. Resolve o problema padrão e trava no primeiro caso fora do padrão.

**Automação pontual sob medida.** Um processo, dois ou três sistemas conversando, regra definida. É projeto de semanas. A construção em si costuma ser a menor parte desse tempo.

**Implantação de operação.** Vários processos, integração com os sistemas existentes, medição de resultado, ajuste depois que entra no ar. É projeto de meses, e roda em ondas: um processo entra, estabiliza, o próximo entra.

Um aviso sobre a última: quem promete operação inteira em duas semanas está prometendo entregar software, não resultado. São coisas diferentes, e a diferença aparece no mês dois.

## O que realmente atrasa

**A regra não existe escrita.** É o atraso número um, e não parece atraso, parece reunião. Quando ninguém consegue dizer em que condição um pedido é aprovado, o projeto para na definição, não na tecnologia.

**Acesso.** Senha de sistema, permissão de administrador, quem é o dono da conta, autorização do provedor. Parece burocracia pequena e come semanas.

**A pessoa que sabe o processo não tem agenda.** Quem conhece a regra de verdade é quem executa ela todo dia, e é justamente quem não pode parar.

**Aprovação que depende do dono.** O projeto anda na velocidade da mesa mais ocupada da empresa.

**Escopo que cresce no meio.** Cada "já que estamos mexendo" reinicia a etapa de definição.

## Por que a definição consome o prazo

Automação é regra escrita executada por máquina. Não existe atalho para isso: se a regra está na cabeça de alguém, ela precisa sair de lá antes, e tirar regra da cabeça de alguém é trabalho de entrevista, não de código.

O efeito prático é que a fase que a empresa acha que é "só conversa" é a fase mais cara do projeto em tempo. E é ela que determina se o resto vai funcionar.

Já entreguei uma automação que rodou **catorze dias com log verde**, tudo bonito no painel, sem produzir resultado nenhum. Prazo cumprido, entrega feita, valor zero. A máquina fazia exatamente o que eu tinha mandado, e o que eu tinha mandado não servia. O problema não era falta de sistema, era falta de definição.

Entregar no prazo e entregar resultado são duas medidas diferentes. Só a segunda paga a conta.

## Quando adiar o projeto

- **O processo vai mudar nos próximos meses.** Troca de ERP, mudança de regra fiscal, reestruturação do time. Automatizar em cima de algo que vai mudar é pagar duas vezes.
- **Ninguém pode dedicar algumas horas por semana nas primeiras semanas.** Sem isso o projeto não anda, ele só envelhece.
- **A empresa ainda não sabe qual é o processo.** Aí o que ela precisa é de diagnóstico, não de implantação.

## Como encurtar o prazo de verdade

- Comece por **um** processo, o que mais se repete, não o que mais incomoda.
- Chegue com a regra escrita em uma página: condição, limite, exceção e quem avisa.
- Defina um dono do projeto dentro da empresa, com poder de decidir.
- Libere acessos no primeiro dia, não no dia em que travar.
- Combine desde o começo qual número vai dizer se funcionou, e meça ele antes de ligar qualquer coisa.

Um projeto que começa com essas cinco coisas prontas costuma andar na metade do tempo de um que começa com uma reunião de expectativas.
`,
    faq: [
      { q: 'Quanto tempo leva para implantar inteligência artificial em uma empresa?',
        a: 'Depende do tamanho do escopo. Ligar uma ferramenta pronta no que a empresa já usa é questão de dias. Uma automação pontual sob medida, com um processo e dois ou três sistemas conversando, é projeto de semanas. Uma implantação de operação, com vários processos integrados e medição de resultado, é projeto de meses e costuma rodar em ondas: um processo entra, estabiliza, o próximo entra. A construção técnica quase nunca é a parte mais longa.' },
      { q: 'O que mais atrasa um projeto de automação?',
        a: 'A regra de negócio não existir escrita. Quando ninguém na empresa consegue dizer em que condição um pedido é aprovado ou um desconto é liberado, o projeto para na definição e não na tecnologia. Depois disso vêm liberação de acessos e senhas, a agenda da pessoa que realmente conhece o processo, aprovações que dependem só do dono, e escopo que cresce no meio do caminho.' },
      { q: 'Por que a etapa de definição demora mais que a de tecnologia?',
        a: 'Porque automação é regra escrita executada por máquina, e regra que está na cabeça de alguém precisa sair de lá antes de virar sistema. Tirar regra da cabeça de quem executa é trabalho de entrevista e documentação, não de código. É a fase que a empresa acha que é só conversa, é a mais cara em tempo, e é ela que determina se o resto vai funcionar. Já vi automação rodar catorze dias sem erro nenhum no painel e sem produzir resultado, porque a definição estava errada desde o começo.' },
    ],
  },
  {
    slug: 'como-calcular-o-retorno-de-uma-automacao',
    titulo: 'Como calcular o retorno de uma automação com IA',
    h1: 'Como calcular o retorno de uma automação',
    desc: 'A conta de retorno de uma automação que o dono faz sozinho, o custo que não aparece na planilha, e o teste que mostra se a hora economizada vira dinheiro ou só vira conforto.',
    linhaFina: 'Hora economizada não é dinheiro economizado. Só vira dinheiro se alguém fizer outra coisa com ela.',
    sobre: 'cálculo de retorno sobre investimento em automação com inteligência artificial',
    corpo: `
Quase toda proposta de automação apresenta o retorno da mesma forma: tantas horas por mês vezes o custo da hora, pronto, esse é o ganho. A conta está certa e a conclusão está errada, porque hora liberada não entra no caixa por conta própria.

A empresa continua pagando o mesmo salário. O ganho só existe se aquela hora virar receita, evitar uma contratação, ou eliminar um custo que já estava sendo pago.

## A conta base, que é o piso

Pegue um processo e multiplique três números:

- quantas vezes ele acontece por mês
- quantos minutos leva cada vez
- quanto custa a hora da pessoa que faz, com encargos

O resultado é o custo direto mensal. É o número mais fácil de calcular e o menos interessante dos três que você vai precisar.

Num diagnóstico numa empresa de catorze pessoas, essa conta apontou **72 horas por mês de trabalho repetido**. E nenhuma delas estava no processo que o dono achava que era o problema. Foi a conta que revelou onde olhar, não o valor final do projeto.

## O custo que não aparece na planilha

Esse é o número que costuma ser maior, e ninguém o registra porque ele não tem nota fiscal.

**Oportunidade perdida.** O lead que não foi respondido, o orçamento que saiu dois dias depois, o cliente que já tinha comprado do concorrente. Some quantos por mês e multiplique pelo seu ticket e pela sua taxa de fechamento. Esse costuma ser o maior número da planilha inteira.

**Retrabalho.** Erro de digitação, dado que entrou errado no sistema, pedido que voltou. Cada um custa o tempo original mais o tempo de conserto mais a conversa de desculpa.

**Dinheiro parado no tempo.** Nota emitida com atraso, cobrança que saiu tarde, pedido esperando aprovação. Não some ao custo, atrasa a entrada.

**Troca de contexto.** A interrupção não custa os cinco minutos da tarefa, custa os cinco mais o tempo de voltar ao que se estava fazendo.

**Dependência de uma pessoa só.** Se o processo mora com uma pessoa, as férias dela são um custo, a saída dela é um risco, e nenhum dos dois está na planilha.

## Automação não compete com zero

O erro clássico é comparar o investimento na automação com não gastar nada. A comparação real é com o que já está sendo pago hoje para o processo acontecer.

Uma operação comercial padrão já paga, entre pessoa de pré-venda, CRM e ferramenta de disparo, algo entre **R$ 4.200 e R$ 8.000 por mês**. Esse é o valor de referência, não o zero.

Num caso real medido por 30 dias numa operação imobiliária, foram 157 leads atendidos, 93% com interação real e 45% qualificados sem nenhuma intervenção humana. A estrutura que aquilo substituiu representava de **R$ 50 mil a R$ 96 mil por ano**. O retorno ali não veio de gente trabalhando mais rápido, veio de estrutura que não precisou existir.

## A conta completa, em cinco linhas

- **A.** Custo direto por mês, das horas repetidas.
- **B.** Custo escondido por mês, do que se perde ou volta.
- **C.** Custo atual das ferramentas e pessoas que a automação substitui.
- **D.** Investimento na implantação, uma vez.
- **E.** Custo mensal de manter aquilo rodando, que sempre existe.

Ganho mensal é A mais B mais C, menos E. Tempo de retorno é D dividido por esse ganho.

Se o tempo de retorno passar de doze meses, o projeto precisa de um motivo além do financeiro para existir. Pode ter, risco e capacidade de crescer são motivos legítimos, mas assuma que é isso e não finja que é retorno.

## Onde a conta dá negativo, e é para dar

**Processo de baixa frequência.** Algo que acontece três vezes por mês raramente paga uma automação, por mais irritante que seja.

**Processo que vai mudar.** Se o ERP troca em seis meses ou a regra fiscal muda, o investimento morre junto.

**Processo cuja regra ninguém sabe escrever.** Aí o custo real não é da automação, é da definição, e ele vem antes.

**Empresa onde a hora liberada não vira nada.** Se ninguém tem o que fazer com o tempo devolvido, o ganho é conforto, não caixa. Conforto tem valor, mas não é retorno.

## O teste da hora liberada

Antes de assinar qualquer coisa, faça uma pergunta e exija a resposta por escrito:

**O que essa pessoa vai fazer com as horas que voltarem?**

Se a resposta for concreta, atender mais clientes, fazer follow-up que hoje ninguém faz, assumir a função de quem ia ser contratado, o retorno é real e você já sabe qual número vai medir.

Se a resposta for vaga, o projeto pode até valer a pena, mas não é retorno financeiro que você está comprando. É melhor saber disso antes.
`,
    faq: [
      { q: 'Como calcular o ROI de uma automação com inteligência artificial?',
        a: 'Levante cinco números: o custo direto mensal das horas repetidas (frequência vezes duração vezes custo da hora), o custo escondido do que se perde ou volta errado, o custo atual das ferramentas e pessoas que a automação substitui, o investimento de implantação e o custo mensal de manutenção. O ganho mensal é a soma dos três primeiros menos a manutenção. O tempo de retorno é o investimento dividido por esse ganho. Acima de doze meses, o projeto precisa de outro motivo além do financeiro.' },
      { q: 'Por que hora economizada nem sempre vira dinheiro economizado?',
        a: 'Porque a empresa continua pagando o mesmo salário depois da automação. A hora liberada só vira caixa em três situações: a pessoa passa a gerar receita com aquele tempo, a empresa deixa de fazer uma contratação que faria, ou some um custo que já era pago, como uma ferramenta ou um serviço terceirizado. Antes de assinar, pergunte o que a pessoa vai fazer com o tempo devolvido. Se não houver resposta concreta, o ganho é conforto, e conforto tem valor mas não é retorno.' },
      { q: 'Qual custo as empresas esquecem de colocar na conta da automação?',
        a: 'O custo do que não acontece. O lead sem resposta, o orçamento que saiu dois dias tarde, o cliente que comprou do concorrente enquanto esperava. Esse número costuma ser maior que o das horas gastas, e não aparece em lugar nenhum porque não tem nota fiscal. Junto com ele ficam de fora o retrabalho por erro de digitação, o dinheiro que entra atrasado por causa de aprovação parada, e o risco de o processo inteiro morar na cabeça de uma pessoa só.' },
    ],
  },
  {
    slug: 'ia-vai-substituir-meus-funcionarios',
    titulo: 'A IA vai substituir meus funcionários? A resposta honesta',
    h1: 'A IA vai substituir meus funcionários?',
    desc: 'A resposta honesta para a objeção mais comum sobre automação nas pequenas e médias empresas, a diferença entre substituir tarefa e substituir pessoa, e o que costuma acontecer de verdade.',
    linhaFina: 'A automação substitui tarefa, não pessoa. Mas a resposta honesta tem uma segunda parte, e o dono merece ouvir ela também.',
    sobre: 'impacto da inteligência artificial sobre o trabalho e o time nas pequenas e médias empresas',
    corpo: `
É a primeira pergunta em quase toda conversa, e normalmente vem em tom de acusação ou de esperança, dependendo de quem pergunta.

A resposta curta: automação substitui tarefa, não pessoa. A resposta completa tem uma segunda parte que folheto nenhum coloca: **função que é feita inteiramente de tarefa repetida é uma função em risco**, e fingir que não é seria mentira.

## Tarefa e decisão não são a mesma coisa

Ninguém é contratado para fazer uma tarefa. É contratado para entregar um resultado, e o caminho até ele mistura tarefa com decisão.

Tarefa é o que tem passo definido: conferir, cadastrar, agendar, copiar número de um sistema para outro, mandar a mesma mensagem pela milésima vez.

Decisão é o que exige contexto: abrir exceção, saber que este cliente merece prioridade, perceber que o pedido está estranho, negociar, assumir a responsabilidade quando dá errado.

A máquina executa tarefa muito bem e não toma decisão nova. Se você separar as horas do seu time nessas duas caixas, você já sabe quanto da folha está exposto e quanto não está. Esse exercício está detalhado no framework das três colunas, na página sobre quais processos automatizar.

## O que acontece de verdade nas empresas pequenas

Na prática, na PME brasileira, o efeito quase nunca é demissão. É a vaga que não abre.

A empresa cresce, o volume dobra, e ela não precisa do segundo, do terceiro e do quarto contratado para dar conta. Quem já está lá continua, fazendo a parte que exige gente.

Numa operação imobiliária medida por 30 dias, 157 leads foram atendidos, 93% tiveram interação real e 45% ficaram qualificados sem nenhuma intervenção humana. A estrutura que isso substituiu representava de **R$ 50 mil a R$ 96 mil por ano**. Ninguém foi demitido: aquela estrutura nunca chegou a ser montada.

Essa é a forma mais comum do impacto. Não é gente saindo, é gente não entrando.

## Onde alguém é afetado de verdade

Quando a função é 100% repetição, sem decisão nenhuma, o impacto existe. Digitação pura, conferência mecânica, encaminhamento de mensagem sem critério.

Nesses casos há três coisas honestas a fazer, e nenhuma delas é esconder:

- **Dizer antes.** Time descobrindo por conta própria é a forma mais rápida de sabotar o projeto.
- **Realocar.** Quem conhece o processo por dentro é a pessoa mais preparada para operar e supervisionar a automação dele.
- **Medir.** Se a automação não entregar o resultado prometido, a decisão sobre gente foi tomada com base errada.

## O time é o dono da regra, não o obstáculo

Automação feita escondida do time falha, e falha por um motivo técnico, não político: a regra do processo mora com quem executa. Sem essa pessoa, o que se automatiza é a versão imaginada do processo, não a real.

Já entreguei uma automação que rodou **catorze dias com log verde**, sem produzir nada. A máquina fazia exatamente o que eu tinha mandado, e o que eu tinha mandado não servia. O problema não era falta de sistema, era falta de definição. Definição vem do time.

## O que a IA não assume

- Julgamento em situação que ninguém previu.
- Responsabilidade. Quando dá errado, o nome que responde é de uma pessoa.
- Relação. Cliente grande, fornecedor antigo, conversa difícil.
- Negociação real, aquela em que o limite muda no meio.
- Qualquer coisa que dependa de alguém sentir o caso. Aí a automação erra, e erra com muita eficiência.

## Onde automatizar não compensa

Se o seu problema é que o time está desmotivado, desorganizado ou sem processo, automação piora. Ela acelera o que existe: processo confuso automatizado vira confusão em escala, e mais rápido.

E se a empresa é pequena o bastante para que o dono faça tudo com folga, automatizar cedo demais só cria mais um sistema para manter.

## O risco que ninguém comenta

O medo popular é a IA tirar o emprego de alguém. O risco concreto, na PME, é o oposto: a operação inteira depender de uma pessoa que sabe como o processo funciona e nunca escreveu isso em lugar nenhum.

As férias dessa pessoa param a empresa. A saída dela custa meses. Escrever a regra resolve os dois problemas de uma vez, e é exatamente o que a automação obriga a empresa a fazer.
`,
    faq: [
      { q: 'A inteligência artificial vai substituir os funcionários da minha empresa?',
        a: 'Ela substitui tarefa, não pessoa. Tarefa é o que tem passo definido: conferir, cadastrar, agendar, mandar a mesma mensagem repetida. Decisão exige contexto, responsabilidade e julgamento, e continua com gente. O risco existe quando a função é feita inteiramente de repetição, sem decisão nenhuma, e nesse caso o certo é avisar antes, realocar quem conhece o processo e medir o resultado. Na maior parte das pequenas e médias empresas o efeito não é demissão, é a vaga que deixa de ser aberta quando o volume cresce.' },
      { q: 'O que a IA não consegue fazer no lugar de um funcionário?',
        a: 'Julgamento em situação nova, que ninguém previu nem escreveu. Responsabilidade, porque quando dá errado o nome que responde é de uma pessoa. Relação com cliente grande ou fornecedor antigo. Negociação em que o limite muda durante a conversa. E qualquer processo que dependa de alguém sentir o caso, porque aí a automação vai errar com muita eficiência.' },
      { q: 'Devo contar para a equipe que vou automatizar processos?',
        a: 'Sim, e por razão prática além da ética. A regra do processo mora com quem executa ele todo dia. Automação construída sem essa pessoa reproduz a versão imaginada do processo, não a real, e é assim que se entrega uma automação que roda sem erro e sem resultado. Quem faz o trabalho hoje é quem tem mais condição de operar e supervisionar a automação dele depois.' },
    ],
  },
  {
    slug: 'automacao-para-imobiliarias-e-construtoras',
    titulo: 'Automação com IA para imobiliárias e construtoras',
    h1: 'Automação com IA para imobiliárias e construtoras',
    desc: 'Onde uma operação imobiliária perde dinheiro sem perceber, o que a automação com IA resolve de verdade no atendimento e no administrativo, e quando ela não compensa.',
    linhaFina: 'Em imobiliária o dinheiro raramente vaza na venda. Vaza no intervalo entre o lead chegar e alguém responder.',
    sobre: 'automação e inteligência artificial em imobiliárias, incorporadoras e construtoras',
    corpo: `
O corretor não é lento. Ele está em visita, dirigindo, ou com outro cliente na frente. O lead chega às 21h de domingo, o portal manda mais quarenta iguais na segunda, e a resposta sai quando dá.

Esse intervalo é onde a operação imobiliária perde mais dinheiro, e ele não aparece em relatório nenhum porque ninguém registra a venda que não aconteceu.

## O que essa operação tem de específico

- **O lead chega fora do horário comercial**, e a decisão de comprar imóvel não espera o expediente.
- **O volume dos portais vem sem qualidade.** Muita gente pedindo informação de um imóvel que não serve para ela.
- **O ciclo é longo.** O cliente que disse "depois" às vezes fecha em seis meses, e nesse meio tempo alguém precisa manter a conversa viva.
- **O CRM vira cemitério.** Lead cadastrado, nunca mais tocado. O sistema está lá, e o follow-up não.
- **O corretor é caro e escasso.** Cada hora dele gasta em triagem é hora que não foi para visita.

## Onde a automação entra, e onde não

A automação certa não vende imóvel. Ela mantém a conversa viva e qualificada até o corretor poder assumir, e devolve para ele só o que já vale o tempo dele.

Numa operação imobiliária de alto padrão medida por 30 dias, o resultado foi: **157 leads atendidos, 93% com interação real e 45% qualificados sem nenhuma intervenção humana.** A estrutura que aquilo substituiu representava de **R$ 50 mil a R$ 96 mil por ano**.

Vale explicar o que "qualificado" significa ali, porque a palavra é usada de forma frouxa no mercado. Não é ter conversado. É ter bairro, faixa de valor, finalidade e prazo definidos e registrados no CRM, com a conversa inteira anexada, para o corretor abrir e já saber com quem vai falar.

## O que a operação já paga hoje

A comparação honesta não é com zero. Uma operação comercial que faz esse trabalho com gente e ferramentas já gasta, somando pessoa de pré-venda, CRM e ferramenta de disparo, entre **R$ 4.200 e R$ 8.000 por mês**.

Esse é o número que a automação precisa bater. Não é uma despesa nova aparecendo, é uma despesa existente mudando de forma.

## Além do atendimento, que é só um exemplo

O erro de leitura mais comum é achar que automação em imobiliária é chatbot de atendimento. Atendimento é um caso. A tese é que **tudo que se repete pode sair da mesa de alguém**.

Numa imobiliária:

- Montagem e envio de proposta com os mesmos campos de sempre.
- Conferência de documentação de locação e de venda.
- Atualização de anúncio nos portais quando muda preço ou status.
- Relatório semanal de carteira, que hoje alguém monta abrindo três sistemas.
- Cobrança e lembrete de vencimento na locação.

Numa construtora ou incorporadora, o repetido está em outro lugar:

- Cotação com fornecedor, mesmo pedido, respostas espalhadas em vários e-mails.
- Medição e diário de obra virando relatório apresentável.
- Documentação de repasse, que é a etapa onde a venda já assinada trava.
- Atendimento de pós-obra e assistência técnica, que é volume alto, repetitivo e mal registrado.
- Tabela de unidades e reserva, hoje mantida à mão em planilha por alguém que não pode errar.

Note que quase nada disso é atendimento. É administrativo, e administrativo é onde costuma estar a maior quantidade de horas repetidas.

## Quando não compensa

**Volume baixo.** Uma imobiliária que recebe poucos leads por mês não tem o que automatizar no atendimento. O problema dela é geração de demanda, e automação não resolve isso.

**Anúncio ruim ou imóvel mal precificado.** Automação distribui mais rápido a mesma decepção. Se o lead chega e descobre que o imóvel não é aquilo, responder em trinta segundos só antecipa a frustração.

**Carteira sem processo definido.** Se cada corretor atende do seu jeito e ninguém sabe dizer qual é a regra, o que a empresa precisa primeiro é escrever a regra. Sem isso, automatizar é acelerar o improviso.

**Time que não vai usar o CRM.** Automação que qualifica e registra tudo perfeitamente não serve para nada se ninguém abre o sistema para atender.

## Por onde começar, e dá para medir esta semana

Antes de contratar qualquer coisa, levante dois números da sua operação:

- **Tempo médio entre o lead chegar e a primeira resposta humana**, contando noite e fim de semana. Não a média do horário comercial, a média real.
- **Percentual de leads que receberam um segundo contato** depois do primeiro, quando não responderam de cara.

O primeiro número mostra o quanto você perde na entrada. O segundo mostra o quanto você perde no meio, e costuma ser o pior dos dois em qualquer imobiliária que eu já medi.

Se os dois estiverem bons, a automação de atendimento não é a sua prioridade, e vale olhar o administrativo. Se estiverem ruins, você já sabe onde está o dinheiro.
`,
    faq: [
      { q: 'Como a inteligência artificial ajuda uma imobiliária?',
        a: 'Ela cobre o intervalo entre o lead chegar e o corretor poder atender, que é onde a operação imobiliária mais perde dinheiro, e devolve ao corretor só o contato que já vale o tempo dele. Numa operação de alto padrão medida por 30 dias, foram 157 leads atendidos, 93% com interação real e 45% qualificados sem intervenção humana, substituindo uma estrutura de R$ 50 mil a R$ 96 mil por ano. Fora do atendimento, ela também assume proposta, conferência de documento, atualização de anúncio e relatório de carteira.' },
      { q: 'O que significa um lead qualificado automaticamente?',
        a: 'Não é ter conversado com o lead. É ter bairro, faixa de valor, finalidade e prazo definidos e registrados no CRM, com a conversa inteira anexada, para que o corretor abra o registro e já saiba com quem vai falar e sobre o quê. Qualificação sem registro no CRM é conversa, e conversa não é ativo comercial.' },
      { q: 'Quando não vale a pena automatizar numa imobiliária ou construtora?',
        a: 'Quando o volume de leads é baixo, porque aí o problema é geração de demanda e automação não gera demanda. Quando o anúncio ou o preço do imóvel está errado, porque responder rápido só antecipa a frustração do cliente. Quando cada corretor atende de um jeito e ninguém sabe dizer qual é a regra, porque automatizar improviso acelera improviso. E quando o time não usa o CRM, porque a qualificação registrada não vai ser lida por ninguém.' },
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
