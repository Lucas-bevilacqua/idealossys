import { CompanyContext, Message } from "../types";

export type AgentEvent =
  | { type: 'job_id'; jobId: string }
  | { type: 'orchestrator_plan'; plan: { agentId: string; task: string }[] }
  | { type: 'agent_start'; agentId: string; agentName: string }
  | { type: 'agent_message'; agentId: string; agentName: string; message: string }
  | { type: 'agent_done'; agentId: string; agentName: string; output: string }
  | { type: 'agent_handoff'; fromAgentId: string; fromAgentName: string; toAgentId: string; toAgentName: string; fromMessage: string; toMessage: string }
  | { type: 'tool_call'; agentId: string; agentName: string; toolName: string; args: any; response: string }
  | { type: 'task_created'; task: any }
  | { type: 'task_updated'; taskId: string; status: string }
  | { type: 'artifact_created'; artifact: any }
  | { type: 'artifact_updated'; artifact: any }
  | { type: 'project_created'; project: any }
  | { type: 'infrastructure_provisioned'; project_id: string; tables: string[]; api_base: string; message: string };

export type OnEventCallback = (event: AgentEvent) => void;

const JOB_ID_KEY = 'idealos_active_job_id';

/** Save job_id for same-tab page reload only */
export function saveActiveJobId(jobId: string) {
  sessionStorage.setItem(JOB_ID_KEY, jobId);
}

export function getActiveJobId(): string | null {
  return sessionStorage.getItem(JOB_ID_KEY);
}

export function clearActiveJobId() {
  sessionStorage.removeItem(JOB_ID_KEY);
}

/** Parse an SSE stream (ReadableStream) and call onEvent for each event.
 *  Resolves when a 'done' event arrives or the stream closes. */
async function consumeSSEStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: OnEventCallback,
  onDone: (text: string) => void,
  onError: (msg: string) => void,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';
  let lastText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line === '') {
        currentEvent = '';
      } else if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (currentEvent === 'done') {
            lastText = data.text || '';
            onDone(lastText);
            return;
          } else if (currentEvent === 'error') {
            onError(data.message || data.text || 'Erro desconhecido');
            return;
          } else if (currentEvent === 'job_id') {
            // Save for reconnect — also forward as event
            saveActiveJobId(data.jobId);
            onEvent({ type: 'job_id', jobId: data.jobId });
          } else {
            const knownEvents = [
              'orchestrator_plan', 'agent_start', 'agent_message',
              'agent_done', 'agent_handoff', 'tool_call',
              'task_created', 'task_updated',
              'artifact_created', 'artifact_updated',
              'project_created', 'infrastructure_provisioned',
            ];
            if (knownEvents.includes(currentEvent)) {
              onEvent({ type: currentEvent as any, ...data });
            }
          }
        } catch { /* ignore parse errors */ }
      }
    }
  }
  // Stream closed without 'done' — treat as completion
  onDone(lastText);
}

export class GeminiService {
  async generateAgentResponse(
    areaName: string,
    context: CompanyContext,
    history: Message[],
    userInput: string,
    tasks: any[] = [],
    artifacts: any[] = [],
    isGlobal: boolean = false,
    onEvent?: OnEventCallback
  ): Promise<{ text: string; agentId?: string; functionCalls?: any[] }> {
    const body = JSON.stringify({
      userInput,
      history: history.slice(0, -1),
      areaName: isGlobal ? "Global Operations" : areaName,
    });

    const agentId = isGlobal ? "os-core" : "pm";

    if (!onEvent) {
      // Non-streaming fallback
      try {
        const response = await fetch('/api/agent/run', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
        });
        if (!response.ok) throw new Error('Falha na comunicação com o servidor');
        const data = await response.json();
        return { text: data.text || '', agentId, functionCalls: data.functionCalls };
      } catch (error: any) {
        return { text: `Erro ao processar solicitação: ${error.message}` };
      }
    }

    return new Promise((resolve) => {
      const functionCalls: any[] = [];
      let resolved = false;

      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
        if (!resolved) {
          resolved = true;
          clearActiveJobId();
          resolve({ text: 'Tempo limite atingido. Verifique os artefatos gerados.', agentId, functionCalls });
        }
      }, 10 * 60 * 1000);

      const wrappedOnEvent: OnEventCallback = (evt) => {
        if (evt.type === 'tool_call') functionCalls.push(evt);
        onEvent(evt);
      };

      fetch('/api/agent/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      }).then(async (response) => {
        if (!response.ok || !response.body) throw new Error('Stream não disponível');

        await consumeSSEStream(
          response.body,
          wrappedOnEvent,
          (text) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              clearActiveJobId();
              resolve({ text, agentId, functionCalls });
            }
          },
          (msg) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              clearActiveJobId();
              resolve({ text: `Erro: ${msg}`, agentId, functionCalls });
            }
          },
        );

        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          clearActiveJobId();
          resolve({ text: 'Execução concluída.', agentId, functionCalls });
        }
      }).catch(err => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          // Don't clear job_id on abort — client may want to reconnect
          if (err.name !== 'AbortError') clearActiveJobId();
          resolve({ text: err.name === 'AbortError' ? 'Tempo limite atingido.' : `Erro de conexão: ${err.message}`, agentId, functionCalls });
        }
      });
    });
  }

  /** Reconnect to an existing job by job_id and replay all events from the beginning.
   *  Used on page reload when a job was interrupted. */
  async reconnectJob(
    jobId: string,
    onEvent: OnEventCallback,
  ): Promise<{ text: string }> {
    return new Promise((resolve) => {
      let lastText = '';
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) { resolved = true; clearActiveJobId(); resolve({ text: lastText }); }
      }, 10 * 60 * 1000);

      fetch(`/api/agent/jobs/${encodeURIComponent(jobId)}?from_cursor=0`, {
        credentials: 'include',
      }).then(async (response) => {
        if (!response.ok || !response.body) throw new Error('Job not found');

        await consumeSSEStream(
          response.body,
          onEvent,
          (text) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              clearActiveJobId();
              resolve({ text });
            }
          },
          () => {
            if (!resolved) { resolved = true; clearTimeout(timeout); clearActiveJobId(); resolve({ text: lastText }); }
          },
        );

        if (!resolved) { resolved = true; clearTimeout(timeout); clearActiveJobId(); resolve({ text: lastText }); }
      }).catch(() => {
        clearTimeout(timeout);
        if (!resolved) { resolved = true; clearActiveJobId(); resolve({ text: lastText }); }
      });
    });
  }
}

export const geminiService = new GeminiService();
