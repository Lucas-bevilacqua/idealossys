# _bmad-output — Índice de Documentação IdealOS
**Última atualização:** 2026-03-25

---

## Documentos Disponíveis

| Documento | Tipo | Status | Descrição |
|---|---|---|---|
| [Brainstorming 2026-03-25](brainstorming/brainstorming-session-2026-03-25.md) | Exploração | ✅ Completo | Sessão de ideação com First Principles + Dream Fusion Lab — 17 ideias geradas |
| [PRD — Evolução v2.0](prd-idealos-evolution.md) | Produto | ✅ Rascunho | Requisitos completos: BU Vendas, BU Marketing, Cross-BU, OS Core |
| [Backlog Estruturado](backlog-idealos-evolution.md) | Dev | ✅ Rascunho | Épicos, stories e tasks estimadas (~195 pts / ~10 sprints) |
| [Arquitetura Cross-BU](architecture-cross-bu.md) | Técnico | ✅ Rascunho | Inter-BU tasks, asset sharing, memória compartilhada, roteamento global |
| [Plano de Ativação das BUs](bu-activation-plan.md) | Produto | ✅ Rascunho | Sequência e detalhes de ativação das 6 BUs + nova BU Vendas |

---

## Roadmap Resumido

```
Sprint 1-2 (Semanas 1-2):  Fundação Cross-BU (infra para tudo)
Sprint 2   (Semanas 3-4):  BU Marketing ativa
Sprint 3   (Semanas 5-6):  BU Vendas Parte 1 (Isabela + Victor + Pipeline)
Sprint 4   (Semanas 7-8):  BU Vendas Parte 2 (Leo WhatsApp) + OS Core routing
Sprint 5   (Semanas 9-10): Melhorias BU Tech + Briefing semanal
```

---

## Próxima Ação Recomendada

Com base no RICE scoring e sequência de dependências:

**Começar pelo Epic 0 — Fundação Cross-BU:**
1. Migrar schema do `company_context` para estrutura organizada
2. Criar tabelas `inter_bu_tasks` e `bu_memory`
3. Implementar tools de inter-BU em `tools.py`

Depois disso, BU Marketing (Épico 1) pode ser ativada em ~2 semanas.
