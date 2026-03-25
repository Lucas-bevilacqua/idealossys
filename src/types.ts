export enum TaskStatus {
  BACKLOG = 'BACKLOG',
  PLANNING = 'PLANNING',
  UX_DESIGN = 'UX_DESIGN',
  DEV = 'DEV',
  REVIEW = 'REVIEW',
  QA = 'QA',
  DONE = 'DONE'
}

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER'
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: 'active' | 'idle' | 'paused' | 'blocked';
  skills?: string[];
  processes?: string[];
}

export interface Area {
  id: string;
  name: string;
  icon: string;
  agents: Agent[];
  unlocked: boolean;
  description: string;
  color: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  role: 'user' | 'agent' | 'system';
  areaId?: string;
  artifactId?: string;
  isRelay?: boolean;  // true para mensagens report_progress (inter-agente)
  attachment?: {
    name: string;
    type: string;
    data: string; // base64
  };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string;
  needsApproval?: boolean;
  approved?: boolean;
  logs: string[];
}

export interface Project {
  id: string;
  tenantId?: string;
  name: string;
  description: string;
  type: 'web' | 'react' | 'fullstack' | 'api';
  stack: string;
  status: 'generating' | 'ready';
  createdAt: number;
}

export interface Artifact {
  id: string;
  title: string;
  language: string;
  code: string;
  type: 'web' | 'code' | 'doc';
  timestamp: number;
  projectId?: string;
  filepath?: string;
}

export interface CompanyContext {
  id: string;
  name: string;
  userName: string;
  description: string;
  industry?: string;
  goals?: string;
  challenges?: string;
  targetAudience?: string;
  websiteUrl?: string;
  logoUrl?: string;
  brandColors?: string;
  brandTone?: string;
  credits: number;
  plan: 'starter' | 'growth' | 'scale' | 'enterprise';
}

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
}

export interface AgentLog {
  id: string;
  tenantId: string;
  projectId?: string;
  verticalId: string;
  fromAgent: string;
  toAgent: string;
  eventType: 'INSTRUCAO' | 'EXECUCAO' | 'RESPOSTA' | 'HANDOFF' | 'APROVACAO_PENDENTE' | 'APROVADO' | 'REJEITADO' | 'ERRO' | 'CRIACAO_TASK' | 'GERACAO_ARTEFATO';
  payload: string;
  tokensConsumed: number;
  creditsConsumed: number;
  durationMs: number;
  status: string;
  createdAt: number;
}
