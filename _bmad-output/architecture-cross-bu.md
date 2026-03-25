# Arquitetura — Cross-BU Handoffs e Asset Sharing
**Versão:** 1.0
**Data:** 2026-03-25
**Status:** Proposta — Aprovação Técnica Pendente

---

## 1. Visão Geral

O IdealOS hoje tem BUs isoladas — cada uma com seu próprio orquestrador, agentes e contexto. Para evoluir para um OS empresarial real, as BUs precisam:

1. **Se acionar mutuamente** (Marketing cria LP via Tech, Vendas pede proposta via Tech)
2. **Compartilhar ativos** (logo, cores, tom de voz, produtos, FAQ)
3. **Ter memória compartilhada** (o que uma BU aprende, as outras sabem)

---

## 2. Estado Atual da Arquitetura

```
Frontend (React)
    ↓ POST /api/agent/stream
Backend (FastAPI)
    ↓
routes/agent.py
    ↓ run_orchestrator(areaName, context, userInput)
agents/
  └── tech_orchestrator.py  (Hélio + agentes Tech)
  └── [outros orquestadores — não existem ainda]

Database (SQLite/PostgreSQL)
  └── tasks         (por tenant + project)
  └── artifacts     (por tenant + project)
  └── projects      (por tenant)
  └── company_context (por tenant)
  └── agent_logs    (por tenant)
```

**Problemas do estado atual:**
- Só a BU Tech existe como orquestrador real
- Não há mecanismo para uma BU criar task para outra BU
- Ativos ficam no `company_context` mas não são usados consistentemente por todos os agentes
- Sem histórico compartilhado entre BUs

---

## 3. Arquitetura Proposta

### 3.1 Protocolo de Inter-BU Task (IBT)

Criar uma tabela `inter_bu_tasks` no banco:

```sql
CREATE TABLE inter_bu_tasks (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    from_bu     TEXT NOT NULL,  -- 'marketing', 'vendas', etc.
    to_bu       TEXT NOT NULL,  -- 'tech', 'marketing', etc.
    task_type   TEXT NOT NULL,  -- 'create_lp', 'create_proposal', 'create_copy'
    briefing    TEXT NOT NULL,  -- JSON com detalhes da task
    status      TEXT DEFAULT 'pending',  -- pending | running | done | failed
    result      TEXT,           -- JSON com output (artifact_id, url, etc.)
    created_at  TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
```

**Fluxo de criação:**
```
BU Marketing (agente João) detecta necessidade de LP
    ↓
João chama tool: create_inter_bu_task(
    to_bu="tech",
    task_type="create_lp",
    briefing={"campaign": "Dia das Mães", "objetivo": "venda", "produto": "curso X"}
)
    ↓
Backend persiste na tabela inter_bu_tasks (status=pending)
    ↓
Scheduler ou webhook acorda o orquestrador da BU Tech
    ↓
BU Tech executa como se fosse pedido do usuário
    ↓
Ao concluir: atualiza inter_bu_tasks.status=done, result={"artifact_id": "xxx", "url": "/p/xxx"}
    ↓
BU Marketing recebe notificação com URL da LP
```

### 3.2 Tool `create_inter_bu_task`

Adicionar em `backend/agents/tools.py`:

```python
def create_inter_bu_task(
    tenant_id: str,
    from_bu: str,
    to_bu: str,
    task_type: str,
    briefing: dict
) -> dict:
    """
    Cria uma task inter-BU. Retorna task_id para rastreamento.

    task_type válidos:
    - create_lp: BU Tech cria landing page
    - create_proposal: BU Tech cria página de proposta
    - create_copy: BU Marketing cria copy
    - create_email_sequence: BU Vendas cria sequência de emails
    """
    task_id = str(uuid4())
    # INSERT INTO inter_bu_tasks...
    return {"task_id": task_id, "status": "pending", "estimated_completion": "5-10 min"}
```

### 3.3 Tool `get_inter_bu_task_result`

```python
def get_inter_bu_task_result(task_id: str, tenant_id: str) -> dict:
    """Verifica status e resultado de uma task inter-BU."""
    # SELECT FROM inter_bu_tasks WHERE id=task_id AND tenant_id=tenant_id
    return {"status": "done", "result": {"url": "/p/xxx", "artifact_id": "yyy"}}
```

---

## 4. Asset Sharing — Repositório Central de Ativos

### 4.1 Problema Atual
O `company_context` já existe mas armazena tudo num JSON flat. Precisamos de:
- Acesso consistente por **todos** os agentes de **todas** as BUs
- Campos estruturados para que cada BU saiba exatamente onde buscar
- Atualização centralizada quando o empresário muda algo

### 4.2 Schema Proposto para `company_context`

```json
{
  "company": {
    "name": "Empresa XYZ",
    "segment": "E-commerce de moda",
    "description": "Loja online de roupas femininas premium",
    "founded": 2020,
    "location": "São Paulo, SP",
    "website_url": "https://empresa.com",
    "logo_url": "https://cdn.empresa.com/logo.png"
  },
  "brand": {
    "primary_color": "#E91E63",
    "secondary_color": "#F8BBD9",
    "font": "Playfair Display",
    "tone_of_voice": "descontraído, próximo, feminino",
    "tagline": "Vista-se com intenção",
    "avoid": ["linguagem muito formal", "preços sem contexto"]
  },
  "products": [
    {
      "id": "prod-1",
      "name": "Vestido Verão",
      "price": 299.90,
      "description": "...",
      "category": "vestidos"
    }
  ],
  "faq": [
    {"question": "Qual o prazo de entrega?", "answer": "3-5 dias úteis"},
    {"question": "Aceita troca?", "answer": "Sim, em até 30 dias"}
  ],
  "social": {
    "instagram": "@empresa",
    "whatsapp": "+5511999999999",
    "email": "contato@empresa.com"
  },
  "sales": {
    "avg_ticket": 350.00,
    "top_objections": ["preço alto", "não conheço a marca"],
    "usp": "Roupas exclusivas com entrega em 24h em SP"
  }
}
```

### 4.3 Context Injection em Todos os Agentes

Cada agente (em todas as BUs) recebe no system prompt:

```python
COMPANY_CONTEXT_INJECTION = """
## Contexto da Empresa
Nome: {company.name}
Segmento: {company.segment}
Tom de Voz: {brand.tone_of_voice}
Cores: Primária {brand.primary_color} / Secundária {brand.secondary_color}
Logo: {company.logo_url}
Tagline: {brand.tagline}

## Produtos Principais
{products_summary}

## FAQ
{faq_summary}

Ao gerar qualquer conteúdo, use estas informações para manter consistência de marca.
"""
```

---

## 5. Memória Compartilhada Entre BUs

### 5.1 Tabela `bu_memory`

```sql
CREATE TABLE bu_memory (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    bu_origin   TEXT,           -- qual BU gerou o aprendizado (NULL = global)
    category    TEXT,           -- 'brand', 'decision', 'customer', 'product'
    key         TEXT NOT NULL,  -- identificador do aprendizado
    value       TEXT NOT NULL,  -- conteúdo do aprendizado
    confidence  FLOAT DEFAULT 1.0,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);
```

**Exemplos de entradas:**
```
category=brand, key=preferred_tone, value="o empresário aprovou tom descontraído em 3 LPs"
category=decision, key=lp_structure, value="hero com video converte mais que hero com imagem"
category=customer, key=top_objection, value="cliente sempre pergunta sobre prazo de entrega"
```

### 5.2 Uso por Agentes

Agentes consultam a memória antes de executar tarefas relevantes:

```python
memories = get_bu_memories(
    tenant_id=tenant_id,
    category="brand",
    limit=10
)
# Injeta no contexto do agente
```

---

## 6. Arquitetura de Orquestradores por BU

### 6.1 Padrão Atual (BU Tech)
```
Hélio (Orchestrator)
  → analisa pedido
  → cria plano com agentes necessários
  → executa agentes em sequência/paralelo
  → retorna resultado consolidado
```

### 6.2 Padrão para Novas BUs
Cada BU tem a mesma estrutura:

```
{Orquestrador BU}
  → recebe task (do usuário OU de inter_bu_tasks)
  → carrega company_context + bu_memory
  → cria plano de execução
  → executa agentes da BU
  → pode criar inter_bu_tasks para outras BUs
  → persiste resultado + atualiza bu_memory
  → emite SSE events para frontend
```

### 6.3 Route de Roteamento Global

Novo endpoint: `POST /api/agent/route`

```python
@router.post("/api/agent/route")
async def route_to_bu(request: RouteRequest, current_user=Depends(get_current_user)):
    """
    Recebe pedido em linguagem natural e roteia para a BU correta.
    Usado pelo OS Core para routing automático.
    """
    bu = await classify_request_to_bu(request.userInput)
    # bu = 'tech' | 'marketing' | 'vendas' | 'financeiro' | ...
    return await forward_to_bu_orchestrator(bu, request)
```

**Classificação por palavra-chave (v1 simples):**
```python
BU_KEYWORDS = {
    "tech":      ["site", "landing page", "sistema", "app", "código", "desenvolver"],
    "marketing": ["campanha", "conteúdo", "post", "anúncio", "copy", "instagram"],
    "vendas":    ["lead", "prospectar", "vender", "cliente", "email", "whatsapp"],
    "financeiro":["relatório", "financeiro", "caixa", "custo", "receita", "dre"],
}
```

---

## 7. Diagrama de Fluxo — Marketing cria LP via Tech

```
Usuário: "preciso de uma LP para minha campanha do dia das mães"
    ↓
OS Core Router: detecta "campanha" + "LP" → BU Marketing
    ↓
Orquestrador Marketing (João) analisa pedido
    ↓
João detecta necessidade de LP → chama create_inter_bu_task(to_bu="tech", task_type="create_lp")
    ↓
Task criada: inter_bu_tasks[id=xyz, status=pending]
    ↓
Webhook/scheduler → BU Tech Orquestrador (Hélio) acorda
    ↓
Hélio lê briefing da inter_bu_task, executa time de dev
    ↓
LP gerada → artifact salvo → inter_bu_tasks[id=xyz, status=done, result={url}]
    ↓
João recebe notificação → retorna URL para o usuário
    ↓
Usuário: recebe "Sua LP está pronta: https://idealos.com/p/xxx"
```

---

## 8. Fases de Implementação

### Fase 1 — Fundação (Semana 1-2)
- [ ] Migrar company_context para schema estruturado
- [ ] Criar tabela `inter_bu_tasks`
- [ ] Criar tabela `bu_memory`
- [ ] Tool `create_inter_bu_task` e `get_inter_bu_task_result`
- [ ] Context injection nos agentes existentes da BU Tech

### Fase 2 — BU Marketing (Semana 3-4)
- [ ] Orquestrador da BU Marketing (baseado no padrão da BU Tech)
- [ ] Agentes: Mariana (copy), João (calendário editorial), Fernanda (mídia paga)
- [ ] Handoff Marketing → Tech funcionando end-to-end
- [ ] UI: tab Marketing no dashboard

### Fase 3 — BU Vendas (Semana 5-7)
- [ ] Agente Victor (cold email) + integração SMTP
- [ ] Agente Isabela (leads) + integração Apollo.io/Hunter.io
- [ ] Agente Leo (WhatsApp) + integração Evolution API
- [ ] Orquestrador Rafael + pipeline Kanban
- [ ] UI: tab Vendas + Kanban de leads

### Fase 4 — OS Core (Semana 8)
- [ ] Endpoint `/api/agent/route`
- [ ] Classificador de BU (keyword v1)
- [ ] Briefing semanal automático
- [ ] Chat global que roteia para qualquer BU

---

## 9. Impacto em Arquivos Existentes

| Arquivo | Mudança |
|---|---|
| `backend/agents/tools.py` | + tools cross-BU |
| `backend/database/schema.py` | + tabelas inter_bu_tasks, bu_memory |
| `backend/database/crud.py` | + CRUD para novas tabelas |
| `backend/routes/agent.py` | + suporte a múltiplos orquestradores |
| `backend/main.py` | + route `/api/agent/route` |
| `src/constants.ts` | Desbloquear BUs Marketing + Vendas |
| `src/services/geminiService.ts` | Nenhuma mudança necessária |
