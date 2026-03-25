# Documentação Técnica: IdealOS v2.0.0

## 1. Visão Geral
O **IdealOS** é um Sistema Operacional de Gestão Empresarial baseado em Inteligência Artificial Multi-Agente. Ele simula uma estrutura corporativa completa onde um "Orquestrador" (Gerente de Produto) coordena especialistas autônomos para transformar diretrizes estratégicas em entregas concretas (código, design e documentação).

---

## 2. Arquitetura Técnica

### 2.1. Frontend
- **Framework**: React 18+ com TypeScript.
- **Estilização**: Tailwind CSS (Design System Minimalista/Tech).
- **Animações**: Motion (Framer Motion) para transições de estado e feedback visual.
- **Ícones**: Lucide React.
- **Responsividade**: Mobile-first com breakpoints adaptáveis (`sm`, `md`, `lg`, `xl`).

### 2.2. Backend
- **Runtime**: Node.js com Express.
- **Banco de Dados**: SQLite (`better-sqlite3`) para persistência local de:
  - Contexto da Empresa.
  - Mensagens de Chat por Vertical.
  - Tarefas do Kanban.
  - Artefatos (Código/Docs).
- **Sessão**: `express-session` com armazenamento em memória para autenticação.

### 2.3. Inteligência Artificial
- **Modelo**: Gemini 3.1 Pro.
- **Orquestração**: Lógica de "Chain of Thought" para decompor pedidos do usuário em chamadas de ferramentas (`Function Calling`).

---

## 3. Módulos do Sistema

### 3.1. Centro de Operações (Dashboard)
Visualização de alto nível das verticais da empresa (Tecnologia, Marketing, Negócios, etc.). Cada vertical possui seu próprio conjunto de agentes e histórico de comunicação.

### 3.2. Chat Multi-Agente
Interface de comando central onde o usuário interage com a equipe.
- **Agentes**: Cada mensagem identifica o agente responsável (Avatar + Nome).
- **Mensagens de Sistema**: Notificações em tempo real sobre ações automáticas da IA (ex: criação de tarefas).
- **Typing Indicator**: Feedback visual quando os agentes estão "colaborando".

### 3.3. Fluxo de Trabalho (Kanban)
Quadro de gestão de tarefas com colunas baseadas no ciclo de vida de desenvolvimento de software (SDLC):
- `PENDENTE`, `PLANEJAMENTO`, `DESIGN`, `DESENVOLVIMENTO`, `REVISÃO`, `TESTES`, `CONCLUÍDO`.

### 3.4. Repositório de Artefatos
Central de entregas técnicas.
- **Tipos de Artefatos**:
  - `web`: HTML/CSS/JS renderizável via Iframe (Live Preview).
  - `code`: Scripts, APIs e lógica de backend.
  - `doc`: Documentação técnica e planos de teste.

---

## 4. Ecossistema de Agentes (Vertical Tecnologia)

| Agente | Papel | Responsabilidade Principal |
| :--- | :--- | :--- |
| **PM** | Gerente de Produto | Orquestração, visão de negócio e delegação. |
| **UX** | Designer | Criação de interfaces e fluxos de usuário. |
| **Dev FE** | Frontend | Implementação de interfaces funcionais. |
| **Dev BE** | Backend | Lógica de servidor, APIs e banco de dados. |
| **QA** | Qualidade | Validação, testes e garantia de entrega. |
| **DevOps** | Operações | Infraestrutura e deploy. |

---

## 5. Regras de Negócio e Orquestração

### 5.1. Delegação Automática
Sempre que um usuário faz um pedido complexo (ex: "Crie um sistema de login"), a IA segue estas regras:
1. **Análise**: Identifica quais especialistas são necessários.
2. **Criação de Tarefas**: Utiliza a ferramenta `create_task` para popular o Kanban.
3. **Produção de Artefatos**: Utiliza `generate_artifact` para entregar o código inicial ou design.
4. **Feedback**: O agente PM resume a estratégia e apresenta os especialistas envolvidos.

### 5.2. Persistência de Dados
- O sistema salva automaticamente cada mensagem enviada e recebida.
- Artefatos são imutáveis após a criação, mas podem ser referenciados em novas iterações.
- O contexto da empresa (Onboarding) molda o tom de voz e as decisões da IA.

---

## 6. Segurança e Acesso
- **Autenticação**: Requer login para acessar o núcleo do sistema.
- **Credenciais de Demonstração**: `admin` / `idealos123`.
- **Isolamento**: Mensagens de uma vertical não são visíveis em outra, garantindo organização por contexto.

---

## 7. Guia de Responsividade
- **Desktop**: Layout full-screen com sidebar de agentes fixa.
- **Tablet/Mobile**: 
  - Sidebar de agentes torna-se um menu retrátil (Drawer).
  - Navegação principal via Menu Hamburger.
  - Kanban com scroll horizontal.
  - Artefatos com visualização em carrossel.
