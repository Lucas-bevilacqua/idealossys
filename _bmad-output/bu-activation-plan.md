# Plano de Ativação das BUs — IdealOS v2.0
**Versão:** 1.0
**Data:** 2026-03-25

---

## Estado Atual das BUs

| BU | Status | Orquestrador | Agentes definidos | Agentes implementados |
|---|---|---|---|---|
| Tecnologia | ✅ Ativa | Hélio | 8 | 8 |
| Marketing | 🔒 Bloqueada | — | Mariana, João, Fernanda, Ricardo | 0 |
| Negócios | 🔒 Bloqueada | — | Mateus, Julia | 0 |
| Financeiro | 🔒 Bloqueada | — | Roberto, Letícia | 0 |
| Pessoas | 🔒 Bloqueada | — | Patrícia, Gustavo | 0 |
| Estratégia | 🔒 Bloqueada | — | Hélio, Sofia | 0 |
| **Vendas** | 🆕 Nova BU | — | Victor, Isabela, Leo, Rafael | 0 |

---

## Prioridade de Ativação

### Critérios
1. **Impacto imediato** no crescimento da empresa do cliente
2. **Interdependências** com BUs já ativas
3. **Complexidade técnica** de implementação
4. **Clareza do workflow** dos agentes

### Ranking

| Prioridade | BU | Motivo |
|---|---|---|
| 1 | **Marketing** | Alta demanda, workflow claro, integração com BU Tech |
| 2 | **Vendas (nova)** | Coração da empresa, sem ela outras BUs ficam sem contexto |
| 3 | **Financeiro** | Empresários precisam de controle financeiro real |
| 4 | **Estratégia** | Torna o OS mais inteligente ao longo do tempo |
| 5 | **Negócios** | Foco em parcerias — menos urgente para early adopters |
| 6 | **Pessoas** | Relevante quando empresa já tem time próprio |

---

## BU Marketing — Plano Detalhado

### Papel de cada agente

| Agente | Papel | Especialidade |
|---|---|---|
| Mariana | Copywriter IA | Escreve textos para qualquer canal/objetivo |
| João | Editor de Conteúdo | Cria calendário editorial, pautas, roteiros |
| Fernanda | Especialista em Mídia Paga | Estratégia de campanhas Meta/Google |
| Ricardo | Analista de Performance | Métricas, relatórios, otimizações |

### System Prompt — Mariana (Copywriter)
```
Você é Mariana, copywriter sênior especialista em marketing digital.

Você escreve copies que:
- Focam na dor do cliente, não no produto
- Usam prova social e escassez quando apropriado
- São adaptados ao canal (Instagram ≠ email ≠ Google Ads)
- Seguem o tom de voz da empresa: {brand.tone_of_voice}

Quando receber um pedido:
1. Confirme: produto, canal, objetivo (venda/engajamento/brand/tráfego)
2. Gere 3 variações: conservadora, moderada e arrojada
3. Explique brevemente a estratégia de cada uma
4. Pergunte qual o cliente prefere ou se quer refinamento
```

### System Prompt — João (Editorial)
```
Você é João, editor de conteúdo estratégico.

Você cria:
- Calendários editoriais semanais/mensais
- Pautas contextualizadas (datas comemorativas, tendências do segmento)
- Roteiros para vídeos curtos e stories
- Briefings claros para Mariana executar

Quando criar um calendário:
1. Considere o segmento da empresa: {company.segment}
2. Mapeie datas relevantes do período
3. Varie formatos: carrossel, reels, stories, feed estático
4. Para cada item que precisar de LP: crie inter_bu_task para BU Tech
```

### Orquestrador Marketing — Lógica
```python
# Palavras-chave que acionam Marketing
MARKETING_TRIGGERS = [
    "campanha", "post", "conteúdo", "copy", "texto",
    "instagram", "facebook", "anúncio", "tráfego",
    "calendário", "editorial", "criar post", "escrever"
]

# Fluxo do orquestrador:
# 1. Recebe pedido → classifica: copy | calendario | midia_paga | performance
# 2. copy → aciona Mariana
# 3. calendario → aciona João (pode acionar Mariana para executar items)
# 4. Se calendario tem LP → cria inter_bu_task para BU Tech
# 5. midia_paga → aciona Fernanda
# 6. performance → aciona Ricardo
```

---

## BU Vendas — Plano Detalhado (Nova BU)

### Papel de cada agente

| Agente | Papel | Stack técnico |
|---|---|---|
| Rafael | Orquestrador de Vendas | Coordena Victor, Isabela, Leo |
| Victor | Agente de Cold Email | SMTP + templates personalizados |
| Isabela | Agente de Levantamento de Leads | Apollo.io / Hunter.io API |
| Leo | Agente WhatsApp IA | Evolution API / Z-API |

### Dificuldade por agente

| Agente | Dificuldade | Motivo |
|---|---|---|
| Victor (cold email) | ⭐⭐ Fácil | API SMTP bem documentada, sem latência real-time |
| Isabela (leads) | ⭐⭐⭐ Média | Depende de API externa (Apollo.io/Hunter) com rate limits |
| Leo (WhatsApp) | ⭐⭐⭐ Média | Evolution API funciona, mas instabilidades existem |
| Ligação IA (v3.0) | ⭐⭐⭐⭐⭐ Difícil | Latência real-time + TTS + STT + handling de resposta |

### System Prompt — Victor (Cold Email)
```
Você é Victor, especialista em prospecção outbound B2B.

Você cria sequências de cold email que:
- São personalizadas por segmento (não genéricas)
- Focam em 1 dor específica por email
- Têm CTA claro (agendar call, responder pergunta)
- São curtos: máximo 150 palavras por email
- NÃO parecem spam: sem maiúsculas excessivas, sem múltiplos links

Estrutura da sequência:
- Email 1 (dia 1): Abertura — conexão + curiosidade + CTA simples
- Email 2 (dia 3): Follow-up — diferente ângulo, adiciona valor
- Email 3 (dia 7): Breakup — "última tentativa", fecha com pergunta direta

Use variáveis: {{nome}}, {{empresa}}, {{segmento}}, {{dor_especifica}}
```

### System Prompt — Leo (WhatsApp IA)
```
Você é Leo, especialista em atendimento e vendas pelo WhatsApp.

Você:
- Responde mensagens em até 30 segundos
- Usa o tom da empresa: {brand.tone_of_voice}
- Conhece todos os produtos: {products_summary}
- Conhece o FAQ completo: {faq_summary}
- NUNCA inventa informações sobre preços ou prazos

Quando detectar intenção de compra alta:
→ Tente fechar com CTA direto: "Quer que eu te envie o link para comprar agora?"

Quando a mensagem for complexa demais:
→ Responda: "Vou verificar isso para você e retorno em alguns minutos!"
→ Marque como "aguarda_humano" no sistema

NUNCA:
- Finja ser humano se perguntado diretamente
- Faça promessas que não estão no FAQ
- Envie mais de 2 mensagens seguidas sem resposta do cliente
```

---

## BU Financeiro — Plano (Fase 3)

### Papel dos agentes

| Agente | Papel |
|---|---|
| Roberto | Analista Financeiro — DRE, fluxo de caixa, relatórios |
| Letícia | Consultora Financeira — alertas, otimizações, projeções |

### Funcionalidades planejadas
- Integração com planilha Google Sheets da empresa
- Geração automática de DRE mensal
- Alerta de custos anômalos ("esse custo recorrente não aparecia no mês passado")
- Projeção de fluxo de caixa para 90 dias
- Sugestão de corte de custos baseada em histórico

### Pré-requisitos técnicos
- OAuth com Google Sheets API
- Parser de extratos bancários (PDF → dados estruturados)
- Modelo de categorização de despesas

---

## BU Estratégia — Plano (Fase 4)

### Papel dos agentes

| Agente | Papel |
|---|---|
| Hélio (Estratégia) | Estrategista — análise macro, decisões de longo prazo |
| Sofia | Analista de Mercado — benchmarking, tendências, concorrentes |

> **Nota:** Hélio existe como agente na BU Tech (orquestrador). Na BU Estratégia, é um agente diferente — mesmo nome, papel distinto. Considerar renomear para evitar confusão. Sugestão: renomear o Hélio da BU Estratégia para **André**.

### Funcionalidades planejadas
- Briefing executivo semanal automático (agrega dados de todas as BUs)
- Análise SWOT assistida por IA
- Monitoramento de concorrentes (mudanças de preço, lançamentos)
- Roadmap estratégico visual com OKRs

---

## BU Negócios — Plano (Fase 5)

### Papel dos agentes

| Agente | Papel |
|---|---|
| Mateus | Especialista em Parcerias — identifica, negocia, acompanha |
| Julia | Analista de Expansão — novos mercados, regiões, países |

### Funcionalidades planejadas
- Mapeamento de parceiros potenciais por segmento
- Proposta de parceria gerada automaticamente
- Pipeline de parcerias (similar ao Kanban de Vendas)
- Monitoramento de mercados para expansão

---

## BU Pessoas — Plano (Fase 6)

### Papel dos agentes

| Agente | Papel |
|---|---|
| Patrícia | Especialista em RH — recrutamento, onboarding, cultura |
| Gustavo | Analista de Desenvolvimento — treinamentos, avaliações, carreira |

### Funcionalidades planejadas
- Job description gerado por IA
- Roteiro de onboarding por cargo
- Avaliação 360° assistida
- PDI (Plano de Desenvolvimento Individual) gerado por IA

---

## Como Desbloquear uma BU (Processo Técnico)

Para ativar uma nova BU no sistema, seguir este checklist:

### Backend
- [ ] Criar `backend/agents/{bu_name}_orchestrator.py`
  - Copiar estrutura do `tech_orchestrator.py` como base
  - Definir agentes da BU com seus system prompts
  - Definir quais tools cada agente tem acesso
- [ ] Registrar a BU em `backend/routes/agent.py`
  - Adicionar case no switch de `areaName`
  - Mapear para o orquestrador correto
- [ ] Adicionar tools específicas em `backend/agents/tools.py` se necessário

### Frontend
- [ ] Em `src/constants.ts`: mudar `isLocked: true` para `isLocked: false` da BU
- [ ] Testar que tab da BU aparece e chat funciona

### Banco de dados
- [ ] Verificar se tabelas necessárias existem (leads para Vendas, etc.)
- [ ] Criar migration se necessário

### Testes
- [ ] Testar fluxo básico: usuário manda pedido → BU executa → resultado aparece
- [ ] Testar inter_bu_task se aplicável
- [ ] Testar reconexão se job demorar mais de 2 min
