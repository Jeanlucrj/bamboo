/**
 * Copy da landing page, centralizada.
 *
 * Fica separada dos componentes de propósito: quem escreve copy não deveria
 * precisar abrir JSX, e testes A/B de headline não deveriam mexer em layout.
 */

export const hero = {
  eyebrow: '+2.400 viajantes em 78 países',
  headline: 'Se algo acontecer com você lá fora, alguém vai saber. Automaticamente.',
  // Variações para teste A/B
  headlineVariants: [
    'Viaje sozinho. Nunca desacompanhado.',
    'O app que percebe que você sumiu antes da sua mãe perceber.',
  ],
  subheadline:
    'O Sentinela usa a localização do seu celular para saber que você está em movimento — e isso já conta como sinal de vida. Se você sumir, seus contatos recebem sua última localização, seus dados médicos e os telefones de emergência do país onde você está. E, enquanto nada acontece, ele transforma tudo isso no diário de viagem que você nunca teve disciplina de escrever.',
  ctaPrimary: { label: 'Começar grátis — 30 dias', href: '/cadastro' },
  ctaSecondary: { label: 'Ver como funciona (90s)', href: '#como-funciona' },
  socialProof: '★★★★★ 4,9 · +2.400 viajantes em 78 países · Sem cartão de crédito',
} as const;

export const problem = {
  title: 'Você avisa que chegou. Até o dia em que não avisa.',
  body: 'Todo viajante solo tem o mesmo ritual: mandar "cheguei" no grupo da família. Funciona — até você estar sem sinal, sem bateria, ou sem condições. Aí o silêncio vira só mais um dia sem notícias, e ninguém sabe se deve se preocupar ou não. Quando percebem, já se passaram 72 horas e ninguém faz ideia de onde procurar.',
  icons: [
    { icon: '📵', label: 'Sem sinal' },
    { icon: '🔋', label: 'Bateria acabou' },
    { icon: '🤐', label: 'Você não pode avisar' },
  ],
} as const;

export const howItWorks = {
  title: 'Três passos. Depois disso, você esquece que ele existe.',
  steps: [
    {
      n: '1',
      title: 'Você define o combinado',
      body: '"Se eu ficar 24h sem dar sinal de vida, algo está errado." Você escolhe o intervalo, os contatos e o que eles podem ver.',
    },
    {
      n: '2',
      title: 'A gente observa em silêncio',
      body: 'Sem notificação chata, sem pedir nada. Saiu do hostel? O celular se deslocou, o cronômetro zera sozinho. Abriu o app? Também conta.',
    },
    {
      n: '3',
      title: 'Se o silêncio passar do limite, agimos',
      body: 'Primeiro avisamos você. Depois insistimos. Só então seus contatos recebem o Dossiê de Emergência.',
    },
  ],
} as const;

export const features = [
  {
    icon: '🔕',
    title: 'Check-in Passivo',
    tagline: 'Andar por aí já é o seu check-in.',
    body: 'Saiu do hostel, pegou um ônibus, mudou de cidade? O celular percebe o deslocamento e o cronômetro zera sozinho. Você não precisa lembrar de nada. É o único app de segurança que funciona melhor quanto menos você pensa nele.',
  },
  {
    icon: '📍',
    title: 'GPS Invisível',
    tagline: 'Rastreamento que não come sua bateria.',
    body: 'Um ping discreto a cada poucas horas ou quando você muda de lugar de verdade. Menos de 2% de bateria por dia. Sua localização é criptografada e ninguém — nem nós, nem sua família — vê onde você está enquanto estiver tudo bem.',
  },
  {
    icon: '🗺️',
    title: 'Travel Analytics Automático',
    tagline: 'Seu diário de bordo se escreve sozinho.',
    body: 'Mapa-múndi com cada país que você pisou, quilômetros percorridos, cidades, dias na estrada, timeline de cada viagem. Sem você digitar uma linha. No fim do ano, um card pronto para postar.',
  },
] as const;

export const audiences = {
  title: 'Feito para quem vai. E para quem manda alguém ir.',
  b2c: {
    label: 'Para você',
    tag: 'B2C',
    items: [
      'Mochileiros e viajantes solo',
      'Nômades digitais em rota longa',
      'Criadores de conteúdo em locação',
      'Trilheiros, ciclistas, overlanders',
    ],
    outcome: 'Paz de espírito para quem ficou',
    cta: { label: 'Começar grátis', href: '/cadastro' },
  },
  b2b: {
    label: 'Para sua equipe',
    tag: 'B2B',
    items: [
      'Agências de intercâmbio e turismo de aventura',
      'ONGs e jornalistas em campo',
      'Empresas com colaboradores em viagem',
      'Produtoras e equipes de filmagem',
    ],
    outcome: 'Dever de cuidado documentado e auditável',
    cta: { label: 'Agendar demonstração', href: '/para-empresas' },
  },
  b2bPitch: {
    title: 'Duty of care deixou de ser gentileza — virou exigência de seguradora e de contrato.',
    body: 'O painel Sentinela mostra todos os seus viajantes em um semáforo em tempo real: verde, amarelo, vermelho. Alertas automáticos, protocolo de escalonamento configurável e relatório de conformidade exportável. Se algo der errado, você tem o histórico completo para provar que fez o que devia.',
  },
} as const;

export const testimonial = {
  quote:
    'Fiquei presa numa estrada no Nepal sem sinal por dois dias. Quando cheguei numa vila com Wi-Fi, tinha 11 mensagens. Todo mundo já sabia exatamente onde eu estava.',
  author: 'Marina S.',
  detail: '43 países',
} as const;

export const trustBadges = [
  { icon: '🔒', label: 'Criptografia em trânsito e em repouso' },
  { icon: '🇧🇷', label: 'LGPD e GDPR' },
  { icon: '🗑️', label: 'Delete tudo com 1 clique' },
  { icon: '🌐', label: 'Funciona offline' },
] as const;

export const faq = [
  {
    q: 'Isso não é rastrear minha vida?',
    a: 'Sua localização fica criptografada e invisível — até para nós. Ela só é revelada se o alarme disparar. E você desliga quando quiser.',
  },
  {
    q: 'E se eu esquecer de fazer check-in?',
    a: 'É exatamente para isso que existe o check-in passivo: se o celular se deslocou, já contamos como sinal de vida. E antes de avisar qualquer pessoa, insistimos com você por horas.',
  },
  {
    q: 'E se eu deixar o celular no quarto e sair?',
    a: 'O alarme dispara — e é o comportamento correto. Só contamos deslocamento real como sinal de vida; um aparelho parado não prova nada. Se você vai passar o dia longe do telefone, faça o check-in manual antes ou aumente o intervalo.',
  },
  {
    q: 'E se eu ficar dois dias no mesmo lugar sem sair?',
    a: 'Abrir o app já conta como sinal de vida — um toque resolve. Para descanso longo em base fixa, o plano recomendado é aumentar o intervalo para 48h ou 72h.',
  },
  {
    q: 'E se eu ficar sem internet?',
    a: 'O app guarda tudo offline e envia quando reconectar. Falta de sinal por si só não dispara falso alarme.',
  },
  {
    q: 'Vai acabar minha bateria?',
    a: 'Menos de 2% ao dia em uso normal. Abaixo de 15%, o app entra em modo econômico sozinho.',
  },
  {
    q: 'Meus contatos precisam instalar algo?',
    a: 'Não. Recebem um link seguro por e-mail, SMS ou WhatsApp.',
  },
  {
    q: 'E se disparar por engano?',
    a: 'Você cancela em um toque, e avisamos todo mundo que foi alarme falso.',
  },
] as const;

/**
 * Planos.
 *
 * Saiu a escada de três níveis (grátis capado / R$19 / R$24 por assento) e
 * entrou um degrau só: 2 viagens completas de graça, depois R$ 49,90/mês.
 *
 * A diferença de fundo é o que o grátis significa. Antes era uma versão
 * mutilada — 1 contato, sem check-in passivo, 24 h de histórico —, o que pede
 * para a pessoa julgar o produto pela versão que não protege. Agora é o
 * produto inteiro, por duas viagens: ela testa a coisa real e decide sabendo o
 * que está comprando.
 *
 * Os `id` continuam os antigos de propósito. São chave de layout (highlight,
 * colunas da comparação) e trocá-los espalharia edição por três componentes
 * sem mudar nada do que o usuário lê.
 */
export const pricing = {
  title: 'Planos',
  anchor:
    'Duas viagens completas de graça, sem cartão. Depois R$ 49,90/mês — menos que uma diária de hostel, e muito menos que o custo de ninguém saber onde te procurar.',
  plans: [
    {
      id: 'explorador',
      name: 'Teste',
      price: 'Grátis',
      period: '2 viagens',
      highlight: false,
      cta: 'Criar conta',
      features: [
        'O produto completo, sem cortes',
        'Contatos de emergência ilimitados',
        'Check-in passivo por deslocamento',
        'Dossiê de Emergência e botão de pânico',
        'Diário de bordo com países e quilômetros',
        'Sem cartão de crédito',
      ],
    },
    {
      id: 'nomade',
      name: 'Sentinela',
      price: 'R$ 49,90',
      period: '/mês',
      highlight: true,
      badge: 'Depois do teste',
      cta: 'Assinar',
      features: [
        'Viagens ilimitadas',
        'Tudo que já vem no teste',
        'Histórico de GPS sem limite de tempo',
        'Escalonamento automático completo',
        'Cancele quando quiser',
        'Seu histórico permanece se cancelar',
      ],
    },
    {
      id: 'organizacao',
      name: 'Organização',
      price: 'Sob consulta',
      period: '',
      highlight: false,
      cta: 'Falar com vendas',
      features: [
        'Tudo do Sentinela para cada viajante',
        'Painel de equipe com semáforo',
        'Relatórios de compliance',
        'Protocolos de escalonamento personalizados',
        'SSO e gestão de permissões',
        'SLA e suporte dedicado',
      ],
    },
  ],
} as const;

/**
 * Comparação detalhada — a tabela da página /precos.
 *
 * `true` vira ✓, `false` vira —, string vira o texto. Modelar assim (e não com
 * três listas paralelas) é o que impede a linha de um plano dessincronizar da
 * do outro quando alguém edita só uma coluna.
 *
 * Tipada à mão em vez de `as const`: com `as const` cada grupo vira um tipo de
 * tupla diferente, e `groups.map(g => g.rows.map(...))` deixa de compilar —
 * `.map` sobre união de tuplas de tamanhos distintos não tem assinatura comum.
 */
export type ComparisonValue = boolean | string;
export type ComparisonRow = {
  label: string;
  values: [ComparisonValue, ComparisonValue, ComparisonValue];
};

export const pricingComparison: {
  columns: readonly ['explorador', 'nomade', 'organizacao'];
  groups: { title: string; rows: ComparisonRow[] }[];
} = {
  columns: ['explorador', 'nomade', 'organizacao'],
  groups: [
    // A ÚNICA linha em que os planos diferem para quem viaja sozinho.
    //
    // O modelo antigo cortava recursos no grátis — sem check-in passivo, 1
    // contato, 24 h de histórico. O novo não corta nada: dá o produto inteiro
    // por 2 viagens. Nesta tabela isso vira quase tudo ✓ nas duas colunas, e é
    // exatamente a mensagem certa. Manter os cortes antigos aqui seria vender
    // um produto e entregar outro.
    {
      title: 'Uso',
      rows: [
        { label: 'Viagens monitoradas', values: ['2 no total', 'ilimitadas', 'ilimitadas'] },
        { label: 'Precisa de cartão para testar', values: ['não', '—', '—'] },
      ],
    },
    {
      title: 'Dead Man’s Switch',
      rows: [
        { label: 'Check-in manual', values: [true, true, true] },
        { label: 'Check-in passivo por deslocamento', values: [true, true, true] },
        { label: 'Abertura do app como sinal de vida', values: [true, true, true] },
        { label: 'Intervalo de check-in configurável', values: ['1h a 30 dias', '1h a 30 dias', '1h a 30 dias'] },
        { label: 'Botão de pânico (SOS)', values: [true, true, true] },
        { label: 'SOS por SMS nativo sem internet', values: [true, true, true] },
      ],
    },
    {
      title: 'Contatos e alertas',
      rows: [
        { label: 'Contatos de emergência', values: ['ilimitados', 'ilimitados', 'ilimitados'] },
        { label: 'Alerta por e-mail', values: [true, true, true] },
        { label: 'Alerta por SMS e WhatsApp', values: [true, true, true] },
        { label: 'Dossiê de Emergência com dados médicos', values: [true, true, true] },
        { label: 'Protocolo de escalonamento personalizado', values: [false, false, true] },
      ],
    },
    {
      title: 'Localização e diário',
      rows: [
        { label: 'Histórico de GPS', values: ['ilimitado', 'ilimitado', 'ilimitado'] },
        { label: 'Travel Analytics', values: ['completo', 'completo', 'completo'] },
        { label: 'Exportar dados', values: [true, true, true] },
        { label: 'Mapa de países e timeline', values: [true, true, true] },
      ],
    },
    {
      title: 'Equipe',
      rows: [
        { label: 'Painel com semáforo de viajantes', values: [false, false, true] },
        { label: 'Relatórios de conformidade', values: [false, false, true] },
        { label: 'SSO e gestão de permissões', values: [false, false, true] },
        { label: 'SLA e suporte dedicado', values: [false, false, true] },
      ],
    },
  ],
};

/** FAQ da página de preços — dúvidas de compra, não de produto. */
export const pricingFaq = [
  {
    q: 'Preciso de cartão de crédito para testar?',
    a: 'Não. As duas primeiras viagens são de graça e não pedem cartão — e não são uma versão capada: você usa o produto inteiro, com check-in passivo, contatos ilimitados e Dossiê de Emergência. A cobrança só aparece quando você for criar a terceira viagem.',
  },
  {
    q: 'O plano grátis realmente protege?',
    a: 'Protege, com uma limitação honesta: você precisa lembrar de fazer o check-in manual. É o plano certo para quem viaja pouco. Para rota longa, o check-in passivo é o que faz o produto funcionar sem você pensar nele.',
  },
  {
    q: 'Como funciona a cobrança por viajante no plano Organização?',
    a: 'Você paga por assento ocupado no mês. Um colaborador que entra no dia 20 é cobrado proporcionalmente, e assento liberado deixa de ser cobrado no ciclo seguinte.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim, em um clique, sem falar com ninguém. O acesso continua até o fim do período já pago e depois a conta volta ao modo gratuito. Nada é apagado: viagens anteriores, contatos, dossiê e diário de bordo permanecem — você só não inicia viagens novas. Se preferir, também pode apagar tudo, histórico de GPS incluído.',
  },
  {
    q: 'O que acontece com meu histórico se eu cancelar?',
    a: 'Ele fica. O Travel Analytics continua visível; o que passa a valer é o limite de 24h de histórico novo do plano gratuito. Exportar seus dados é possível a qualquer momento, inclusive depois do cancelamento.',
  },
  {
    q: 'Vocês cobram a mais por país ou por roaming?',
    a: 'Não. O preço é o mesmo em qualquer lugar do mundo. O app usa dados do seu próprio plano e consome poucos KB por dia.',
  },
] as const;

/**
 * Conteúdo da página /para-empresas.
 *
 * Separado de `audiences.b2b` (que é o bloco resumido da landing) porque o
 * argumento aqui é outro: na landing o objetivo é qualificar o visitante; aqui
 * é convencer alguém que já sabe que precisa e está comparando fornecedor.
 */
export const b2bPage = {
  hero: {
    eyebrow: 'Para organizações',
    headline: 'Dever de cuidado documentado e auditável.',
    subheadline:
      'Se um colaborador seu some em campo, a pergunta que vem depois não é "o que aconteceu" — é "o que vocês fizeram". O Sentinela transforma isso em registro: quem estava onde, quando o alarme disparou, quem foi acionado e em quanto tempo.',
    ctaPrimary: { label: 'Falar com vendas', href: 'mailto:vendas@sentinela.app?subject=Sentinela%20para%20empresas' },
    ctaSecondary: { label: 'Ver planos', href: '#precos' },
  },

  dutyOfCare: {
    title: 'Duty of care deixou de ser gentileza.',
    body: 'Seguradora pede protocolo. Contrato de cliente pede evidência. Norma interna pede registro. O que quase ninguém tem é a camada do meio: o dado de que a pessoa estava bem às 14h e não estava mais às 22h — e a prova de que alguém foi avisado.',
    points: [
      {
        title: 'Antes do incidente',
        body: 'Cada viajante tem uma regra explícita de check-in. O sistema registra todo sinal de vida com origem e horário.',
      },
      {
        title: 'Durante',
        body: 'O escalonamento é automático e cronometrado. Ninguém precisa decidir, às 3h da manhã, se já é hora de ligar para a família.',
      },
      {
        title: 'Depois',
        body: 'A linha do tempo completa fica exportável: sinais, estados, notificações enviadas e quem acessou o dossiê.',
      },
    ],
  },

  features: [
    {
      title: 'Painel com semáforo em tempo real',
      body: 'Todos os viajantes numa tela, ordenados por severidade — quem está em vermelho aparece primeiro, sempre. Um gestor com 80 pessoas em campo não pode precisar procurar pelo que está errado.',
    },
    {
      title: 'Protocolo de escalonamento configurável',
      body: 'Intervalo de check-in, período de tolerância e atraso até o alerta definidos por organização ou por viagem. Rota de risco alto usa 6h; base fixa usa 72h.',
    },
    {
      title: 'Relatório de conformidade exportável',
      body: 'Histórico de sessões, incidentes, tempo de resposta e notificações entregues. É o documento que a seguradora pede depois — e que ninguém consegue reconstruir na mão.',
    },
    {
      title: 'Dossiê de Emergência por token',
      body: 'Quem socorre recebe um link com validade e sem senha: última posição, dados médicos e os telefones de emergência do país. Cada acesso fica registrado.',
    },
    {
      title: 'SSO e gestão de permissões',
      body: 'Papéis de proprietário, administrador, gestor e membro. Entrada e saída de colaborador refletem no painel sem planilha paralela.',
    },
    {
      title: 'SLA e suporte dedicado',
      body: 'Canal direto com a operação e compromisso de resposta contratado, não "abra um chamado".',
    },
  ],

  managerFlow: {
    title: 'O que o gestor vê — e o que ele não vê',
    sees: [
      'Estado de check-in de cada viajante: verde, amarelo, vermelho, cinza',
      'Há quanto tempo foi o último sinal de vida e de que tipo',
      'Se o aparelho da pessoa está vivo ou silencioso',
      'Todo o histórico do incidente depois que ele abre',
    ],
    doesNotSee: [
      'Localização precisa fora de incidente aberto',
      'Trajeto do fim de semana, folga ou período fora de viagem',
      'Dossiê médico — nem durante o incidente, nem depois',
      'Conteúdo do diário de bordo pessoal do colaborador',
    ],
    note: 'Não é limitação de produto, é decisão de arquitetura: a política do banco só libera a posição para a organização quando a sessão está em warning, alert ou sos. Rastreamento contínuo de colaborador fora de emergência é passivo jurídico, não funcionalidade — e é a primeira coisa que derruba a adesão da equipe.',
  },

  cta: {
    title: 'Quantas pessoas suas estão em campo agora?',
    body: 'Mande o número e o tipo de operação. Respondemos com uma proposta e um piloto de 30 dias para até 10 viajantes.',
    email: 'vendas@sentinela.app',
    label: 'Falar com vendas',
  },
} as const;

export const finalCta = {
  title: 'A viagem é sua. O risco não precisa ser só seu.',
  body: 'Configure em 3 minutos. Cancele quando quiser.',
  cta: { label: 'Começar grátis', href: '/cadastro' },
  footnote: 'Sem cartão. 30 dias completos.',
} as const;
