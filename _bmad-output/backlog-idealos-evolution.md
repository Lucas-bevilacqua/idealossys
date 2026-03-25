# Backlog — Evolução IdealOS v2.0
**Versão:** 1.0
**Data:** 2026-03-25
**Baseado em:** PRD v1.0 + Brainstorming 2026-03-25

---

## Como Ler Este Backlog

- **Épico** = conjunto de features relacionadas (nível alto)
- **Story** = funcionalidade entregável (nível usuário)
- **Task** = trabalho técnico (nível dev)
- **Pontos** = estimativa de esforço (1=1h, 2=2-4h, 3=dia, 5=2-3dias, 8=semana)
- **Prioridade**: 🔴 Crítico | 🟠 Alta | 🟡 Média | 🟢 Baixa

---

## ÉPICO 0 — Fundação Cross-BU (Pré-requisito de tudo)
**Objetivo:** Criar infraestrutura para BUs se comunicarem e compartilharem ativos
**RICE Score:** 400 | **Esforço:** 2 semanas

### Story 0.1 — Schema estruturado do company_context
**Como** empresário, **quero** que todos os agentes conheçam minha marca automaticamente **para** não precisar repetir nome, cores e tom em cada pedido.

**Critérios de Aceitação:**
- [ ] `company_context` tem campos: company, brand, products, faq, social, sales
- [ ] Ao gerar qualquer conteúdo, agentes usam logo, cor e tom corretos
- [ ] Formulário de onboarding coleta todos os campos

**Tasks:**
- [ ] T0.1.1: Migrar schema JSON do company_context (2pts) 🔴
- [ ] T0.1.2: Atualizar formulário de contexto no frontend (3pts) 🔴
- [ ] T0.1.3: Injetar contexto de marca em todos os system prompts da BU Tech (2pts) 🔴

---

### Story 0.2 — Tabelas inter_bu_tasks e bu_memory
**Como** sistema, **quero** persistir tasks entre BUs e aprendizados compartilhados **para** que BUs colaborem como uma empresa real.

**Tasks:**
- [ ] T0.2.1: Criar migration: tabela `inter_bu_tasks` (1pt) 🔴
- [ ] T0.2.2: Criar migration: tabela `bu_memory` (1pt) 🔴
- [ ] T0.2.3: CRUD para inter_bu_tasks em database/crud.py (2pts) 🔴
- [ ] T0.2.4: CRUD para bu_memory em database/crud.py (2pts) 🟠

---

### Story 0.3 — Tools de inter-BU no toolkit dos agentes
**Como** agente de qualquer BU, **quero** criar e consultar tasks para outras BUs **para** delegar trabalho especializado.

**Tasks:**
- [ ] T0.3.1: Tool `create_inter_bu_task()` em tools.py (3pts) 🔴
- [ ] T0.3.2: Tool `get_inter_bu_task_result()` em tools.py (2pts) 🔴
- [ ] T0.3.3: Tool `save_to_bu_memory()` em tools.py (2pts) 🟠
- [ ] T0.3.4: Tool `get_bu_memories()` em tools.py (1pt) 🟠

---

## ÉPICO 1 — BU Marketing (Ativar BU Existente)
**Objetivo:** Ativar os 4 agentes de marketing com orquestrador próprio
**RICE Score:** 283 | **Esforço:** 2 semanas
**Depende de:** Épico 0

### Story 1.1 — Agente de Copy (Mariana)
**Como** empresário, **quero** pedir copy para qualquer canal em linguagem natural **para** nunca mais precisar de copywriter para textos padrão.

**Critérios de Aceitação:**
- [ ] Mariana gera 3 variações de copy para canal informado
- [ ] Copy usa tom de voz e linguagem definidos no company_context
- [ ] Usuário pode pedir refinamento ("mais curto", "mais agressivo")
- [ ] Copy aprovado vai para a biblioteca de ativos

**Tasks:**
- [ ] T1.1.1: Criar agente Mariana com system prompt de copywriter (3pts) 🔴
- [ ] T1.1.2: Tool `generate_copy()` com parâmetros: canal, objetivo, produto (2pts) 🔴
- [ ] T1.1.3: Tool `save_copy_to_library()` (1pt) 🟠

---

### Story 1.2 — Agente de Calendário Editorial (João)
**Como** empresário, **quero** receber sugestão de pauta semanal **para** nunca ficar sem o que postar.

**Critérios de Aceitação:**
- [ ] João gera calendário de 7 dias com: data, canal, tema, tipo de conteúdo
- [ ] Calendário leva em conta: datas comemorativas, produtos em destaque
- [ ] Cada item tem brief para Mariana executar

**Tasks:**
- [ ] T1.2.1: Criar agente João com system prompt de editor de conteúdo (3pts) 🟠
- [ ] T1.2.2: Tool `generate_content_calendar(week, month)` (2pts) 🟠
- [ ] T1.2.3: UI: visualização de calendário no tab Marketing (5pts) 🟠

---

### Story 1.3 — Handoff Marketing → Tech (LP de campanha)
**Como** agente João, **quero** criar uma LP via BU Tech quando precisar **para** que campanhas tenham página de destino sem sair do fluxo.

**Critérios de Aceitação:**
- [ ] João detecta necessidade de LP → cria inter_bu_task automaticamente
- [ ] BU Tech executa e retorna URL
- [ ] João inclui URL da LP no calendário editorial

**Tasks:**
- [ ] T1.3.1: Lógica de detecção de necessidade de LP no orquestrador Marketing (3pts) 🔴
- [ ] T1.3.2: Integração do resultado da task no calendário editorial (2pts) 🟠
- [ ] T1.3.3: Notificação para usuário quando LP estiver pronta (1pt) 🟡

---

### Story 1.4 — Orquestrador BU Marketing
**Como** BU Marketing, **quero** ter um orquestrador próprio (como Hélio na Tech) **para** coordenar Mariana, João e Fernanda.

**Tasks:**
- [ ] T1.4.1: Criar `backend/agents/marketing_orchestrator.py` (5pts) 🔴
- [ ] T1.4.2: Registrar BU Marketing no routes/agent.py (2pts) 🔴
- [ ] T1.4.3: Desbloquear BU Marketing em src/constants.ts (0.5pt) 🔴
- [ ] T1.4.4: SSE events para Marketing (agent_start, agent_done) (2pts) 🟠

---

## ÉPICO 2 — BU Vendas (Nova BU)
**Objetivo:** Criar time de agentes de vendas do zero
**RICE Score:** 262 | **Esforço:** 3 semanas
**Depende de:** Épico 0

### Story 2.1 — Agente de Levantamento de Leads (Isabela)
**Como** empresário, **quero** descrever meu cliente ideal e receber uma lista de leads qualificados **para** ter base para prospectar.

**Critérios de Aceitação:**
- [ ] Isabela recebe ICP (segmento, cargo, tamanho, localização)
- [ ] Retorna lista com: nome, empresa, cargo, email estimado, LinkedIn
- [ ] Leads têm score de fit (1-5) baseado no ICP
- [ ] Lista exportável como CSV

**Tasks:**
- [ ] T2.1.1: Criar agente Isabela (3pts) 🔴
- [ ] T2.1.2: Integração com Hunter.io API para busca de leads (5pts) 🔴
- [ ] T2.1.3: Fallback: scraping via SerpAPI se Hunter falhar (5pts) 🟡
- [ ] T2.1.4: Tool `score_lead_fit()` (2pts) 🟠
- [ ] T2.1.5: UI: lista de leads com filtros e export CSV (5pts) 🟠

---

### Story 2.2 — Agente de Cold Email (Victor)
**Como** empresário, **quero** criar sequência de cold emails personalizada por segmento **para** prospectar sem esforço manual.

**Critérios de Aceitação:**
- [ ] Victor gera sequência de 3 emails (abertura, follow-up 1, follow-up 2)
- [ ] Emails personalizados com variáveis: {{nome}}, {{empresa}}, {{dor_especifica}}
- [ ] Usuário revisa e aprova antes de ativar
- [ ] Taxa de resposta rastreada por sequência

**Tasks:**
- [ ] T2.2.1: Criar agente Victor com system prompt de SDR (3pts) 🔴
- [ ] T2.2.2: Tool `generate_email_sequence()` (3pts) 🔴
- [ ] T2.2.3: Integração SMTP para envio (5pts) 🔴
- [ ] T2.2.4: Tracking de abertura via pixel (3pts) 🟠
- [ ] T2.2.5: UI: editor de sequência de emails (5pts) 🟠

---

### Story 2.3 — Agente WhatsApp IA (Leo)
**Como** empresário, **quero** que meu WhatsApp responda automaticamente **para** nunca perder cliente por demora no atendimento.

**Critérios de Aceitação:**
- [ ] Leo responde mensagens no WhatsApp com base no FAQ e contexto da empresa
- [ ] Detecta intenção de compra → escala para humano
- [ ] Histórico de conversa salvo por contato
- [ ] Painel de mensagens com status: Respondido automático / Aguarda humano

**Tasks:**
- [ ] T2.3.1: Criar agente Leo (3pts) 🔴
- [ ] T2.3.2: Integração com Evolution API (webhook + envio) (8pts) 🔴
- [ ] T2.3.3: Fallback para Z-API se Evolution falhar (5pts) 🟡
- [ ] T2.3.4: Lógica de escalação para humano (3pts) 🔴
- [ ] T2.3.5: UI: inbox de WhatsApp no dashboard Vendas (8pts) 🟠

---

### Story 2.4 — Pipeline de Vendas (Kanban)
**Como** empresário, **quero** ver meu pipeline de vendas em tempo real **para** entender em que estágio cada lead está.

**Critérios de Aceitação:**
- [ ] Kanban: Prospectado → Contactado → Respondeu → Call Agendado → Proposta → Fechado
- [ ] Lead pode ser movido manualmente entre colunas
- [ ] Agentes movem leads automaticamente quando ação acontece
- [ ] Alerta: leads parados há mais de 3 dias

**Tasks:**
- [ ] T2.4.1: Tabela `leads` no banco de dados (2pts) 🔴
- [ ] T2.4.2: CRUD de leads (2pts) 🔴
- [ ] T2.4.3: UI: Kanban de pipeline (8pts) 🔴
- [ ] T2.4.4: Tool `update_lead_stage()` para agentes (1pt) 🟠
- [ ] T2.4.5: Alertas de leads parados (3pts) 🟡

---

### Story 2.5 — Orquestrador BU Vendas (Rafael)
**Como** BU Vendas, **quero** ter Rafael como orquestrador **para** coordenar Victor, Isabela e Leo.

**Tasks:**
- [ ] T2.5.1: Criar `backend/agents/vendas_orchestrator.py` (5pts) 🔴
- [ ] T2.5.2: Registrar BU Vendas no routes/agent.py (2pts) 🔴
- [ ] T2.5.3: Desbloquear BU Vendas em src/constants.ts (0.5pt) 🔴
- [ ] T2.5.4: SSE events para Vendas (2pts) 🟠

---

## ÉPICO 3 — OS Core: Roteamento Global
**Objetivo:** Empresário fala com o OS, o OS roteia para a BU certa
**RICE Score:** 420 | **Esforço:** 1 semana
**Depende de:** Épicos 0, 1, 2 (ao menos parcialmente)

### Story 3.1 — Chat Global com Roteamento
**Como** empresário, **quero** ter um chat "OS" que entenda qualquer pedido **para** não precisar saber qual BU acionacar.

**Critérios de Aceitação:**
- [ ] "preciso vender mais" → roteia para BU Vendas
- [ ] "quero uma campanha" → roteia para BU Marketing
- [ ] "precisa de um site" → roteia para BU Tech
- [ ] Quando ambíguo: pergunta ao usuário qual BU

**Tasks:**
- [ ] T3.1.1: Endpoint `/api/agent/route` no backend (3pts) 🔴
- [ ] T3.1.2: Classificador keyword-based (v1) (2pts) 🔴
- [ ] T3.1.3: UI: tab "OS" no dashboard que usa roteamento global (3pts) 🔴
- [ ] T3.1.4: Fallback: prompt do usuário para escolher BU quando ambíguo (2pts) 🟠

---

### Story 3.2 — Briefing Semanal Automático
**Como** empresário, **quero** receber todo domingo um resumo do que o OS fez **para** acompanhar sem acessar o sistema.

**Critérios de Aceitação:**
- [ ] Relatório inclui: tasks completadas por BU, métricas principais, alertas
- [ ] Entregue via email ou notificação in-app
- [ ] Pode ser solicitado on-demand também ("me dá um resumo da semana")

**Tasks:**
- [ ] T3.2.1: Lógica de geração de briefing semanal (5pts) 🟡
- [ ] T3.2.2: Scheduled job: domingo às 8h (2pts) 🟡
- [ ] T3.2.3: Template de email do briefing (2pts) 🟢

---

## ÉPICO 4 — Melhorias BU Tech
**Objetivo:** Consolidar e expandir a BU Tech que já existe
**RICE Score:** 270 | **Esforço:** 2 semanas

### Story 4.1 — Modo Sistema (não só LP)
**Como** empresário, **quero** pedir sistemas internos (formulários, painéis, calculadoras) **para** ter ferramentas digitais além de landing pages.

**Critérios de Aceitação:**
- [ ] Agentes identificam pedido de sistema vs. LP e adaptam output
- [ ] Sistemas gerados funcionam autonomamente (formulário envia, calculadora calcula)
- [ ] Preview em iframe antes de publicar

**Tasks:**
- [ ] T4.1.1: Prompt engineering para detecção de tipo de projeto (2pts) 🟠
- [ ] T4.1.2: Prompt especializado para sistemas vs. LP (3pts) 🟠
- [ ] T4.1.3: Preview em iframe no frontend (3pts) 🟠

---

### Story 4.2 — Agente de Manutenção (Bob melhorado)
**Como** empresário, **quero** pedir pequenas edições no site ("troca o texto do botão") **para** manter o site atualizado sem regerar tudo.

**Critérios de Aceitação:**
- [ ] "Muda o texto do hero para X" → apenas aquela seção é regenerada
- [ ] Edição não quebra outras seções
- [ ] Histórico de edições com possibilidade de reverter

**Tasks:**
- [ ] T4.2.1: Tool `edit_section()` — edita seção específica (5pts) 🟠
- [ ] T4.2.2: Histórico de versões do artifact (3pts) 🟡
- [ ] T4.2.3: UI: botão "reverter para versão anterior" (2pts) 🟢

---

### Story 4.3 — QA Automático com Testes Visuais
**Como** usuário, **quero** que Bruno (QA) também verifique responsividade e links quebrados **para** entregar sites sem bugs.

**Tasks:**
- [ ] T4.3.1: Bruno verifica HTML válido (1pt) 🟠
- [ ] T4.3.2: Bruno verifica links funcionando (2pts) 🟡
- [ ] T4.3.3: Bruno verifica estrutura mobile-first no CSS (2pts) 🟡

---

## Resumo do Backlog por Sprint (Sugestão)

### Sprint 1 (Semanas 1-2) — Fundação
Épico 0 completo + T1.4.1 (orquestrador Marketing base)
**Stories:** 0.1, 0.2, 0.3
**Pontos:** ~30

### Sprint 2 (Semanas 3-4) — BU Marketing
Épico 1 completo + Story 3.1 parcial
**Stories:** 1.1, 1.2, 1.3, 1.4
**Pontos:** ~40

### Sprint 3 (Semanas 5-6) — BU Vendas Parte 1
Stories 2.1 (Isabela), 2.2 (Victor), 2.4 (Pipeline)
**Pontos:** ~40

### Sprint 4 (Semanas 7-8) — BU Vendas Parte 2 + OS Core
Stories 2.3 (WhatsApp), 2.5 (Orquestrador), 3.1 (Roteamento)
**Pontos:** ~45

### Sprint 5 (Semanas 9-10) — Melhorias e Polimento
Épico 4 + Story 3.2 (Briefing)
**Pontos:** ~35

---

## Total Estimado
| Épico | Pontos | Semanas |
|---|---|---|
| Épico 0 — Fundação | ~30 | 2 |
| Épico 1 — BU Marketing | ~40 | 2 |
| Épico 2 — BU Vendas | ~80 | 3 |
| Épico 3 — OS Core | ~20 | 1 |
| Épico 4 — BU Tech | ~25 | 2 |
| **TOTAL** | **~195 pts** | **~10 semanas** |
