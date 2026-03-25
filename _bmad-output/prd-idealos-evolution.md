# PRD — Evolução do IdealOS: OS Empresarial Completo
**Versão:** 1.0
**Data:** 2026-03-25
**Status:** Em Aprovação
**Autor:** PM Agent (baseado em sessão de brainstorming + análise de codebase)

---

## 1. Contexto e Visão do Produto

### 1.1 O que é o IdealOS hoje
IdealOS é uma plataforma multi-agente onde a **BU Tecnologia** (ativa) executa tarefas técnicas — principalmente geração de landing pages e sistemas web — via time de 8 agentes IA (Hélio, Luna, Sarah, Alex, Bruno, Carla, Diego, Elena, Bob) coordenados por um orquestrador.

### 1.2 O que o IdealOS deve ser
> **IdealOS não é um gerador de landing pages. É um sistema operacional para empresários** — onde cada BU é um time completo de agentes IA operando em nome do empresário 24/7.

O empresário não contrata funcionários, não gerencia equipes, não paga agências. Ele "roda" a empresa conversando com o sistema.

### 1.3 Visão 2027
> *"Enquanto você dormia:*
> *— Marketing gerou 3 novos conteúdos e agendou para Instagram e LinkedIn*
> *— Vendas prospectou 47 leads e enviou cold emails personalizados para 12 deles*
> *— 2 leads responderam. Um agendou call para hoje às 14h — já está no calendário*
> *— WhatsApp recebeu 8 mensagens. 6 foram respondidas automaticamente. 2 precisam de você*
> *— Tech atualizou o site com os depoimentos novos que você aprovou ontem*
> *— Financeiro fechou o relatório do mês e identificou custo recorrente de R$890 para cortar"*

---

## 2. Problema Central

### 2.1 Dor do Usuário
Pequenas e médias empresas não têm acesso a times especializados:
- **Sem agência de marketing** → conteúdo fraco, sem tráfego
- **Sem SDR/BDR** → prospects frios, pipeline vazio
- **Sem dev team** → site desatualizado, sem ferramentas
- **Sem CFO** → decisões financeiras no escuro
- **Sem COO** → processos desorganizados, gargalos invisíveis

### 2.2 Solução
Cada BU do IdealOS é esse time — 24/7, sem salário fixo, sem gestão.

### 2.3 Métricas de Sucesso
| Métrica | Baseline | Meta (6 meses) |
|---|---|---|
| BUs ativas | 1 (Tech) | 3 (Tech + Marketing + Vendas) |
| Tasks executadas/semana por tenant | ~5 | ~50 |
| % tasks resolvidas sem intervenção humana | ~40% | ~80% |
| Tempo médio de entrega de LP | 8 min | 4 min |
| NPS dos tenants ativos | — | >50 |

---

## 3. Escopo desta Versão (v2.0)

### 3.1 IN SCOPE

#### Epic 1 — BU Vendas (nova BU)
A BU mais crítica que falta. O coração da empresa não pode parar.

**Agentes:**
- **Victor** — Agente de Cold Email (prospecção por email)
- **Isabela** — Agente de Levantamento de Leads (scraping + qualificação)
- **Leo** — Agente WhatsApp IA (via Evolution API / Z-API)
- **Rafael** — Orquestrador da BU Vendas

**Funcionalidades:**
- Configurar sequência de cold email (assunto, corpo, follow-up)
- Levantar leads por segmento/localização/cargo
- Responder WhatsApp com contexto da empresa
- Dashboard de pipeline: leads prospectados → responderam → agendaram → fecharam
- Relatório semanal de desempenho de vendas

#### Epic 2 — BU Marketing (ativar BU existente)
BU existe no sistema mas está bloqueada (agentes: Mariana, João, Fernanda, Ricardo).

**Funcionalidades:**
- Agente de copy: escreve posts, anúncios, scripts
- Agente de mídia paga: sugere estrutura de campanha Meta/Google
- Agente de calendário editorial: sugere pauta semanal
- Integração com BU Tech: quando Marketing precisa de LP, aciona Tech automaticamente

#### Epic 3 — Cross-BU Handoffs (infraestrutura)
BUs precisam se comunicar como numa empresa real.

**Funcionalidades:**
- Marketing aciona Tech para criar LP de campanha
- Vendas aciona Tech para criar página de proposta
- Qualquer BU pode criar task para outra BU
- Ativos compartilhados: logo, cores, copy base, dados da empresa

#### Epic 4 — Melhorias na BU Tech
Baseadas no uso atual e feedbacks.

**Funcionalidades:**
- Geração multi-arquivo estável (HTML + CSS + JS) — já implementado, consolidar
- Agente de manutenção: "atualiza o texto da seção hero"
- Suporte a sistemas internos (painéis, dashboards, formulários)
- Modo de desenvolvimento autônomo: agente testa e corrige sem intervenção

#### Epic 5 — OS Core: Orquestrador Global
O "sistema nervoso central" que conecta todas as BUs.

**Funcionalidades:**
- Briefing semanal automático: o que cada BU fez, o que está em risco
- Routing inteligente: o empresário fala com o OS, o OS decide qual BU aciona
- Memória de empresa: persona, tom de voz, produtos, histórico de decisões

### 3.2 OUT OF SCOPE (v2.0)
- BU Jurídico
- BU Operações
- BU Dados & BI
- Agente de M&A
- BU Licitações
- Agente de Ligação IA (dificuldade ⭐⭐⭐⭐⭐ — v3.0)
- App mobile

---

## 4. Requisitos Funcionais

### 4.1 BU Vendas

#### RF-VD-01: Configuração de Campanha de Cold Email
- Usuário descreve produto/serviço e público-alvo em linguagem natural
- Victor gera sequência de 3 emails (abertura, follow-up 1, follow-up 2)
- Usuário revisa e aprova antes do envio
- Sistema registra: enviados, abertos, respondidos, agendados

#### RF-VD-02: Levantamento de Leads
- Isabela recebe briefing: "empresas de e-commerce em São Paulo com 10-50 funcionários"
- Retorna lista de leads com: nome, empresa, cargo, email, LinkedIn, score de fit
- Integração com Apollo.io ou Hunter.io como fonte de dados

#### RF-VD-03: WhatsApp IA
- Leo monitora número WhatsApp da empresa via Evolution API
- Responde mensagens com base no contexto da empresa (produtos, preços, FAQ)
- Escala para humano quando detecta complexidade ou sinaliza compra
- Histórico de conversa salvo por contato

#### RF-VD-04: Pipeline de Vendas
- Kanban visual: Prospectado → Contactado → Respondeu → Call Agendado → Proposta → Fechado
- Cada lead tem histórico de interações
- Alertas para leads sem resposta há X dias

### 4.2 BU Marketing

#### RF-MK-01: Geração de Copy
- Usuário informa: objetivo (venda/engajamento/brand), canal (Instagram/email/Google Ads), produto
- Mariana gera 3 variações de copy
- Versão aprovada vai para calendário editorial

#### RF-MK-02: Calendário Editorial
- João gera pauta semanal/mensal baseada em datas relevantes + estratégia da empresa
- Visualização em calendário
- Status: Planejado → Em Criação → Aprovado → Publicado

#### RF-MK-03: Handoff Marketing → Tech
- Quando Marketing precisa de LP: João cria task para BU Tech com briefing
- BU Tech executa e retorna link
- Marketing vincula LP à campanha

### 4.3 Cross-BU Handoffs

#### RF-XBU-01: Inter-BU Task Creation
- Qualquer BU pode criar uma task para outra BU via API interna
- Task tem: origem, destino, briefing, prazo, prioridade
- BU destino notifica quando concluída

#### RF-XBU-02: Asset Sharing
- Repositório central de ativos da empresa:
  - Logo (URL já salvo no contexto)
  - Paleta de cores
  - Tom de voz
  - Produtos e preços
  - FAQ da empresa
- Toda BU lê do mesmo contexto ao gerar conteúdo

#### RF-XBU-03: Memória de Empresa
- Cada interação aprovada pelo empresário alimenta a memória
- "No mês passado você aprovou que o tom é descontraído" → Tom consistente em todas as BUs

### 4.4 OS Core

#### RF-OS-01: Routing Natural Language
- Empresário digita: "quero vender mais" → OS identifica → aciona BU Vendas
- Empresário digita: "preciso de campanha para o dia das mães" → OS aciona BU Marketing
- Empresário digita: "atualiza meu site" → OS aciona BU Tech

#### RF-OS-02: Briefing Semanal
- Todo domingo às 8h: email/notificação com resumo da semana
- Inclui: tasks completadas, métricas de cada BU, decisões pendentes

---

## 5. Requisitos Não-Funcionais

| Requisito | Especificação |
|---|---|
| Latência de resposta (chat) | < 2s para primeira mensagem de status |
| Tempo de execução (LP completa) | < 8 min |
| Disponibilidade | 99.5% |
| Multi-tenancy | Isolamento completo entre tenants |
| Segurança | Auth JWT + RLS por tenant_id |
| Reconexão | Auto-reconecta em queda de rede (job continua no backend) |

---

## 6. Arquitetura de Alto Nível

Ver documento separado: `architecture-cross-bu.md`

---

## 7. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Evolution API instável para WhatsApp | Alta | Alto | Usar Z-API como fallback; abstrair provider |
| Leads de qualidade baixa com scraping | Média | Alto | Integrar Apollo.io como fonte primária |
| Custo de LLM crescendo com novas BUs | Média | Médio | Cache de respostas frequentes; modelos menores para tasks simples |
| Complexidade do cross-BU handoff | Média | Alto | Protocolo simples baseado em tasks existentes |
| LGPD / spam em cold email | Alta | Alto | Opt-out automático; apenas cold email B2B |

---

## 8. RICE Scoring — Priorização das Epics

| Epic | Reach | Impact | Confidence | Effort | RICE Score |
|---|---|---|---|---|---|
| BU Vendas (nova) | 5 | 3 | 70% | 4 | **262** |
| Cross-BU Handoffs | 5 | 3 | 80% | 3 | **400** |
| BU Marketing (ativar) | 5 | 2 | 85% | 3 | **283** |
| OS Core Routing | 4 | 3 | 70% | 2 | **420** |
| BU Tech Melhorias | 3 | 2 | 90% | 2 | **270** |

**Ordem de implementação recomendada:**
1. OS Core Routing (420) — desbloqueia tudo
2. Cross-BU Handoffs (400) — infraestrutura base
3. BU Marketing ativar (283) — menor esforço, alto impacto
4. BU Tech Melhorias (270) — incremento contínuo
5. BU Vendas (262) — mais complexa, maior valor

---

## 9. Definition of Ready (DoR) — por Epic

Para cada epic entrar em desenvolvimento:
- [x] Problema definido e quantificado
- [x] Agentes nomeados e responsabilidades definidas
- [x] Integrações externas identificadas
- [ ] Wireframes ou protótipo básico aprovado
- [ ] Viabilidade técnica validada com Tech Lead
- [ ] RICE Score calculado e aprovado pelo PM

---

## 10. Definition of Done (DoD) — por Epic

Uma epic está completa quando:
- [ ] Todos os agentes da BU funcionando end-to-end
- [ ] Integração com cross-BU handoff testada
- [ ] Testes automatizados cobrindo fluxo principal
- [ ] UI integrada ao dashboard existente
- [ ] Tenant pode usar sem instrução adicional
- [ ] Métricas de sucesso coletando (tasks criadas, completadas, tempo médio)
