import dotenv from 'dotenv';
import { langChainService } from './server/langchainService';
import Database from 'better-sqlite3';

dotenv.config();

const db = new Database('idealos.db');

async function test() {
  console.log("--- INICIANDO TESTE DE ORQUESTRAÇÃO LANGCHAIN ---");

  const mockContext = {
    name: "Teste Corp",
    goals: "Escalar vendas de software",
    targetAudience: "Empresas de tecnologia"
  };

  const tenantId = "default-tenant-id";
  const userInput = "Crie uma tarefa no Kanban para 'Configurar Servidor de Produção' e gere um artefato chamado 'nginx.conf' com uma configuração básica.";

  console.log("Enviando comando para o agente...");
  
  try {
    const result = await langChainService.runAgent(
      userInput,
      mockContext,
      tenantId,
      [], // history
      [], // artifacts
      [], // tasks
      "Tecnologia"
    );

    console.log("\nResposta do Agente:", result.text);
    console.log("\nTool Calls detectadas:", JSON.stringify(result.functionCalls, null, 2));

    // Verificar no Banco de Dados
    const task = db.prepare('SELECT * FROM tasks WHERE title = ?').get('Configurar Servidor de Produção');
    const artifact = db.prepare('SELECT * FROM artifacts WHERE title = ?').get('nginx.conf');

    console.log("\n--- RESULTADOS NO BANCO ---");
    console.log("Task criada?", !!task);
    if (task) console.log("Detalhes Task:", task);
    
    console.log("Artefato criado?", !!artifact);
    if (artifact) console.log("Detalhes Artefato:", (artifact as any).title);

    if (task && artifact) {
      console.log("\nSUCESSO: Orquestração LangChain funcionando 100%.");
    } else {
      console.log("\nFALHA: Alguns itens não foram criados no banco.");
    }

  } catch (error) {
    console.error("Erro no teste:", error);
  }
}

test();
