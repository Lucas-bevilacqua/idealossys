import { Area, TaskStatus } from './types';

export const AREAS: Area[] = [
  {
    id: 'tech',
    name: 'Tecnologia',
    icon: 'Terminal',
    unlocked: true,
    description: 'Dev de software, infraestrutura e qualidade.',
    color: '#475569',
    agents: [
      {
        id: 'analyst', name: 'Luna', role: 'Business Analyst',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=LunaAnalyst&backgroundColor=f59e0b&radius=50&facialHairProbability=0',
        status: 'idle',
        skills: ['Pesquisa de Mercado', 'Análise Competitiva', 'Product Briefs'],
        processes: ['Elicitação de Requisitos', 'Análise de Risco', 'Market Research']
      },
      {
        id: 'pm', name: 'Sarah', role: 'Gerente de Produto',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=SarahPM&backgroundColor=6366f1&radius=50&facialHairProbability=0',
        status: 'idle',
        skills: ['Roadmap', 'OKRs', 'Discovery'],
        processes: ['Priorização RICE', 'Sprint Planning', 'Revisão de Backlog']
      },
      {
        id: 'ux', name: 'Alex', role: 'Designer UX/UI',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=AlexUX&backgroundColor=8b5cf6&radius=50&facialHairProbability=60&facialHair=beardMedium',
        status: 'idle',
        skills: ['Figma', 'Prototyping', 'Pesquisa'],
        processes: ['Design Sprint', 'Testes de Usabilidade', 'Design System']
      },
      {
        id: 'dev-fe', name: 'Bruno', role: 'Dev Frontend',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=BrunoFE&backgroundColor=06b6d4&radius=50&facialHairProbability=60&facialHair=beardMedium',
        status: 'idle',
        skills: ['React', 'TypeScript', 'Tailwind'],
        processes: ['Code Review', 'Deploy Frontend', 'Testes E2E']
      },
      {
        id: 'dev-be', name: 'Carla', role: 'Dev Backend',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=CarlaBE&backgroundColor=10b981&radius=50&facialHairProbability=0',
        status: 'idle',
        skills: ['Node.js', 'APIs REST', 'SQL'],
        processes: ['Design de API', 'Migrations', 'Integração de Serviços']
      },
      {
        id: 'qa', name: 'Diego', role: 'Engenheiro de QA',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=DiegoQA&backgroundColor=f59e0b&radius=50&facialHairProbability=60&facialHair=beardMedium',
        status: 'idle',
        skills: ['Testes Automatizados', 'Cypress', 'Jest'],
        processes: ['Plano de Testes', 'Regressão', 'Validação de Releases']
      },
      {
        id: 'devops', name: 'Elena', role: 'DevOps & Cloud',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=ElenaOps&backgroundColor=ef4444&radius=50&facialHairProbability=0',
        status: 'idle',
        skills: ['Docker', 'CI/CD', 'AWS'],
        processes: ['Pipeline de Deploy', 'Monitoramento', 'Infra como Código']
      },
      {
        id: 'scrum', name: 'Bob', role: 'Scrum Master',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=BobScrum&backgroundColor=10b981&radius=50&facialHairProbability=60&facialHair=beardMedium',
        status: 'idle',
        skills: ['Facilitação', 'Retrospectivas', 'Remoção de Impedimentos'],
        processes: ['Sprint Planning', 'Daily Standup', 'Sprint Review']
      },
    ]
  },
  {
    id: 'marketing',
    name: 'Marketing',
    icon: 'Megaphone',
    unlocked: true,
    description: 'Crescimento, conteúdo e performance.',
    color: '#7c3aed',
    agents: [
      {
        id: 'mkt-head', name: 'Camila', role: 'Head de Marketing IA',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=CamilaMkt&backgroundColor=7c3aed&radius=50&facialHairProbability=0',
        status: 'idle',
        skills: ['Estratégia', 'Orquestração', 'Crescimento'],
        processes: ['Planejamento de Campanha', 'Coordenação de Time', 'OKRs de Marketing']
      },
      {
        id: 'strat', name: 'Mariana', role: 'Copywriter & Estrategista',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=MarianaStrat&backgroundColor=a855f7&radius=50&facialHairProbability=0',
        status: 'idle',
        skills: ['Copywriting', 'AIDA/PAS', 'Brand Voice'],
        processes: ['Copy para Ads', 'Email Marketing', 'Landing Page Copy']
      },
      {
        id: 'copy', name: 'João', role: 'Editor de Conteúdo',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=JoaoEdit&backgroundColor=6d28d9&radius=50&facialHairProbability=60&facialHair=beardMedium',
        status: 'idle',
        skills: ['Calendário Editorial', 'SEO Copy', 'Briefing'],
        processes: ['Produção de Conteúdo', 'Pauta Semanal', 'Calendário Editorial']
      },
      {
        id: 'seo', name: 'Fernanda', role: 'Especialista em Mídia Paga',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=FernandaSEO&backgroundColor=8b5cf6&radius=50&facialHairProbability=0',
        status: 'idle',
        skills: ['Meta Ads', 'Google Ads', 'ROAS'],
        processes: ['Estrutura de Campanha', 'Segmentação de Público', 'Otimização de Budget']
      },
      {
        id: 'social', name: 'Ricardo', role: 'Social Media & Performance',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=RicardoSocial&backgroundColor=5b21b6&radius=50&facialHairProbability=60&facialHair=beardMedium',
        status: 'idle',
        skills: ['Instagram', 'LinkedIn', 'Analytics'],
        processes: ['Calendário de Posts', 'Análise de Engajamento', 'Relatório de Performance']
      },
    ]
  },
  {
    id: 'vendas',
    name: 'Vendas',
    icon: 'TrendingUp',
    unlocked: true,
    description: 'Prospecção, cold email e atendimento WhatsApp.',
    color: '#059669',
    agents: [
      {
        id: 'sales-head', name: 'Rafael', role: 'Head de Vendas IA',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=RafaelSales&backgroundColor=059669&radius=50&facialHairProbability=80&facialHair=beardMedium',
        status: 'idle',
        skills: ['Estratégia de Vendas', 'Pipeline', 'Orquestração'],
        processes: ['Gestão de Pipeline', 'Relatório Semanal', 'Priorização de Leads']
      },
      {
        id: 'leads', name: 'Isabela', role: 'Especialista em Leads',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=IsabelaLeads&backgroundColor=10b981&radius=50&facialHairProbability=0',
        status: 'idle',
        skills: ['Levantamento de Leads', 'ICP', 'Qualificação BANT'],
        processes: ['Pesquisa de Leads', 'Fit Score', 'Enriquecimento de Dados']
      },
      {
        id: 'email', name: 'Victor', role: 'Especialista em Cold Email',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=VictorEmail&backgroundColor=047857&radius=50&facialHairProbability=60&facialHair=beardLight',
        status: 'idle',
        skills: ['Cold Email', 'Copywriting B2B', 'A/B Testing'],
        processes: ['Sequência de Emails', 'Follow-up', 'Análise de Taxa de Resposta']
      },
      {
        id: 'whatsapp', name: 'Leo', role: 'Agente WhatsApp IA',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=LeoWhatsapp&backgroundColor=065f46&radius=50&facialHairProbability=40&facialHair=beardLight',
        status: 'idle',
        skills: ['WhatsApp', 'Atendimento Automatizado', 'Scripts de Vendas'],
        processes: ['Resposta Automática', 'Qualificação via Chat', 'Escalação para Humano']
      },
    ]
  },
  {
    id: 'bizdev',
    name: 'Negócios',
    icon: 'Briefcase',
    unlocked: false,
    description: 'Vendas, parcerias e expansão comercial.',
    color: '#1e293b',
    agents: [
      {
        id: 'sales', name: 'Mateus', role: 'Executivo de Contas',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Mateus&backgroundColor=1e293b',
        status: 'idle',
        skills: ['Vendas Consultivas', 'CRM', 'Negociação'],
        processes: ['Pipeline de Vendas', 'Follow-up', 'Fechamento de Contratos']
      },
      {
        id: 'biz', name: 'Julia', role: 'Business Developer',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Julia&backgroundColor=334155',
        status: 'idle',
        skills: ['Parcerias', 'Prospecção', 'Pitch'],
        processes: ['Mapeamento de Oportunidades', 'Proposta Comercial', 'Onboarding de Parceiros']
      },
    ]
  },
  {
    id: 'finance',
    name: 'Financeiro',
    icon: 'DollarSign',
    unlocked: false,
    description: 'Projeções, unit economics e tesouraria.',
    color: '#0f172a',
    agents: [
      {
        id: 'cfo', name: 'Roberto', role: 'CFO Executivo',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Roberto&backgroundColor=0f172a',
        status: 'idle',
        skills: ['DRE', 'Fluxo de Caixa', 'Forecast'],
        processes: ['Fechamento Mensal', 'Budget Anual', 'Análise de Rentabilidade']
      },
      {
        id: 'fin-analyst', name: 'Letícia', role: 'Analista Financeiro',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Leticia&backgroundColor=1e293b',
        status: 'idle',
        skills: ['Excel', 'KPIs', 'Unit Economics'],
        processes: ['Relatório de Custos', 'Conciliação Bancária', 'Dashboard Financeiro']
      },
    ]
  },
  {
    id: 'people',
    name: 'Pessoas',
    icon: 'Users',
    unlocked: false,
    description: 'RH, recrutamento e cultura.',
    color: '#020617',
    agents: [
      {
        id: 'hr', name: 'Patrícia', role: 'Head de RH',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Patricia&backgroundColor=020617',
        status: 'idle',
        skills: ['Cultura', 'Avaliação de Desempenho', 'Retenção'],
        processes: ['Onboarding', 'Avaliação 360', 'Plano de Carreira']
      },
      {
        id: 'recruiter', name: 'Gustavo', role: 'Recrutador Técnico',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Gustavo&backgroundColor=0f172a',
        status: 'idle',
        skills: ['Sourcing', 'Entrevistas', 'Assessment'],
        processes: ['Pipeline de Recrutamento', 'Triagem de CVs', 'Oferta e Contratação']
      },
    ]
  },
  {
    id: 'strategy',
    name: 'Estratégia',
    icon: 'Compass',
    unlocked: false,
    description: 'Análise de mercado e direção executiva.',
    color: '#3b82f6',
    agents: [
      {
        id: 'ceo-ia', name: 'Hélio', role: 'Chief of Staff IA',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Helio&backgroundColor=3b82f6',
        status: 'idle',
        skills: ['Planejamento Estratégico', 'OKRs', 'Tomada de Decisão'],
        processes: ['Revisão Estratégica Trimestral', 'Alinhamento Executivo', 'Gestão de Iniciativas']
      },
      {
        id: 'market', name: 'Sofia', role: 'Analista de Mercado',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Sofia&backgroundColor=1e3a8a',
        status: 'idle',
        skills: ['Pesquisa de Mercado', 'Benchmarking', 'SWOT'],
        processes: ['Análise Competitiva', 'Relatório de Tendências', 'Mapa de Oportunidades']
      },
    ]
  }
];

export const KANBAN_COLUMNS = [
  { id: TaskStatus.BACKLOG, label: 'Pendente', color: '#94a3b8' },
  { id: TaskStatus.PLANNING, label: 'Planejamento', color: '#64748b' },
  { id: TaskStatus.UX_DESIGN, label: 'Design / UX', color: '#475569' },
  { id: TaskStatus.DEV, label: 'Desenvolvimento', color: '#334155' },
  { id: TaskStatus.REVIEW, label: 'Revisão', color: '#1e293b' },
  { id: TaskStatus.QA, label: 'Testes', color: '#0f172a' },
  { id: TaskStatus.DONE, label: 'Concluído', color: '#10b981' },
];

export const LOG_EVENT_COLORS: Record<string, string> = {
  INSTRUCAO: '#64748b',
  EXECUCAO: '#475569',
  RESPOSTA: '#10b981',
  HANDOFF: '#334155',
  APROVACAO_PENDENTE: '#d97706',
  APROVADO: '#059669',
  REJEITADO: '#b91c1c',
  ERRO: '#991b1b',
  CRIACAO_TASK: '#475569',
  GERACAO_ARTEFATO: '#334155',
};

export const PLAN_LIMITS: Record<string, { credits: number; label: string; color: string }> = {
  starter: { credits: 10000, label: 'Starter', color: '#64748b' },
  growth: { credits: 50000, label: 'Growth', color: '#475569' },
  scale: { credits: 200000, label: 'Scale', color: '#334155' },
  enterprise: { credits: 999999, label: 'Enterprise', color: '#1e293b' },
};
