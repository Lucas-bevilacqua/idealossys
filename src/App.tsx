import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal, Megaphone, Briefcase, DollarSign, Users, Compass, Lock, LogOut,
  ChevronRight, Send, ArrowLeft, LayoutDashboard, Trello, MessageSquare,
  Plus, CheckCircle2, Clock, AlertCircle, Activity, Brain, Layers, Search,
  Menu, X, Sun, Moon, ChevronDown, CreditCard, Settings, FileCode, Eye,
  MoreVertical, History, Network, Mic, MicOff, Volume2, Globe, LayoutGrid, Paperclip, ChevronUp, Trash2, Zap, FolderGit2, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { AREAS, KANBAN_COLUMNS, LOG_EVENT_COLORS, PLAN_LIMITS } from './constants';
import { Area, CompanyContext, Message, Task, TaskStatus, Artifact, User, AgentLog, Project } from './types';
import { geminiService, getActiveJobId, saveActiveJobId, clearActiveJobId } from './services/geminiService';
import { LandingPage } from './LandingPage';
import { Logo } from './components/Logo';
import { AgentHierarchy } from './components/AgentHierarchy';
import { ProjectExplorer } from './components/ProjectExplorer';

const IconMap: Record<string, any> = { Terminal, Megaphone, Briefcase, DollarSign, Users, Compass };

// --- SUB-COMPONENTS ---

// Fotos reais de pessoas — randomuser.me tem URLs estáveis por número
// Mulheres: /women/N.jpg | Homens: /men/N.jpg (0–99)
const P = (gender: 'women' | 'men', n: number) =>
  `https://randomuser.me/api/portraits/${gender}/${n}.jpg`;

// Hélio: robô/IA — destaca que é o orquestrador, não uma pessoa
const HELIO_AVATAR = 'https://api.dicebear.com/9.x/bottts/svg?seed=HelioCEO2026&radius=50&backgroundColor=3b82f6';

const AGENT_AVATAR_MAP: Record<string, { name: string; role: string; avatar: string; color: string }> = {
  'pm':          { name: 'Sarah',    role: 'Product Manager',    avatar: P('women', 44), color: '#6366f1' },
  'ux':          { name: 'Alex',     role: 'UX Designer',        avatar: P('men',   32), color: '#8b5cf6' },
  'dev-fe':      { name: 'Bruno',    role: 'Dev Frontend',       avatar: P('men',   55), color: '#06b6d4' },
  'dev-be':      { name: 'Carla',    role: 'Dev Backend',        avatar: P('women', 35), color: '#10b981' },
  'qa':          { name: 'Diego',    role: 'QA Engineer',        avatar: P('men',   19), color: '#f59e0b' },
  'devops':      { name: 'Elena',    role: 'DevOps & Cloud',     avatar: P('women', 28), color: '#ef4444' },
  'os-core':     { name: 'OS Core',  role: 'Orquestrador',       avatar: HELIO_AVATAR,   color: '#3b82f6' },
  'strat':       { name: 'Mariana',  role: 'Estrategista',       avatar: P('women', 62), color: '#a855f7' },
  'copy':        { name: 'João',     role: 'Copywriter',         avatar: P('men',   41), color: '#f97316' },
  'seo':         { name: 'Fernanda', role: 'SEO Specialist',     avatar: P('women', 17), color: '#14b8a6' },
  'social':      { name: 'Ricardo',  role: 'Social Media',       avatar: P('men',   73), color: '#e879f9' },
  'sales':       { name: 'Mateus',   role: 'Sales',              avatar: P('men',   88), color: '#0ea5e9' },
  'biz':         { name: 'Julia',    role: 'Business Analyst',   avatar: P('women', 51), color: '#84cc16' },
  'cfo':         { name: 'Roberto',  role: 'CFO / Financeiro',   avatar: P('men',   64), color: '#64748b' },
  'hr':          { name: 'Patrícia', role: 'People & Culture',   avatar: P('women', 79), color: '#ec4899' },
  'ceo-ia':      { name: 'Hélio',    role: 'CEO / Orquestrador', avatar: HELIO_AVATAR,   color: '#3b82f6' },
  // Aliases by agent first name (used by backend create_task assignee_name)
  'luna':        { name: 'Luna',     role: 'Business Analyst',   avatar: P('women', 90), color: '#84cc16' },
  'sarah':       { name: 'Sarah',    role: 'Product Manager',    avatar: P('women', 44), color: '#6366f1' },
  'alex':        { name: 'Alex',     role: 'UX Designer',        avatar: P('men',   32), color: '#8b5cf6' },
  'bruno':       { name: 'Bruno',    role: 'Dev Frontend',       avatar: P('men',   55), color: '#06b6d4' },
  'carla':       { name: 'Carla',    role: 'Dev Backend',        avatar: P('women', 35), color: '#10b981' },
  'diego':       { name: 'Diego',    role: 'QA Engineer',        avatar: P('men',   19), color: '#f59e0b' },
  'elena':       { name: 'Elena',    role: 'DevOps & Cloud',     avatar: P('women', 28), color: '#ef4444' },
  'bob':         { name: 'Bob',      role: 'Scrum Master',       avatar: P('men',   41), color: '#0ea5e9' },
  'helio':       { name: 'Hélio',    role: 'CEO / Orquestrador', avatar: HELIO_AVATAR,   color: '#3b82f6' },
  'scrum':       { name: 'Bob',      role: 'Scrum Master',       avatar: P('men',   41), color: '#0ea5e9' },
  'analyst':     { name: 'Luna',     role: 'Business Analyst',   avatar: P('women', 90), color: '#84cc16' },
  'recruiter':   { name: 'Gustavo',  role: 'Recrutamento',       avatar: P('men',   22), color: '#475569' },
  'fin-analyst': { name: 'Letícia',  role: 'Analista Financeiro',avatar: P('women', 58), color: '#64748b' },
  'market':      { name: 'Sofia',    role: 'Marketing',          avatar: P('women', 33), color: '#3b82f6' },
};

const SPECIALISTS_NAMES: Record<string, string> = {
  'pm': 'Sarah', 'ux': 'Alex', 'dev-fe': 'Bruno',
  'dev-be': 'Carla', 'qa': 'Diego', 'devops': 'Elena', 'os-core': 'OS Core'
};

const getAgentInfo = (agentId: string) =>
  AGENT_AVATAR_MAP[agentId.toLowerCase()] ||
  AGENT_AVATAR_MAP['os-core'];

// Detectar menções de agentes no texto (formato "→ Bruno (Dev Frontend): ...")
const parseAgentMessage = (text: string): { from?: string; to?: string; action: string } => {
  const match = text.match(/^→\s*([^:]+):\s*(.+)$/);
  if (match) return { to: match[1].trim(), action: match[2].trim() };
  return { action: text };
};

// Markdown components with proper prose styling
const mdComponents: any = {
  h1: ({ children }: any) => <h1 className="text-sm font-bold mb-2 mt-3 text-main">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-xs font-bold mb-1.5 mt-2.5 text-main">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-[11px] font-bold mb-1 mt-2 text-main">{children}</h3>,
  p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }: any) => <strong className="font-semibold text-main">{children}</strong>,
  em: ({ children }: any) => <em className="italic opacity-80">{children}</em>,
  ul: ({ children }: any) => <ul className="list-disc list-inside mb-2 space-y-0.5 pl-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal list-inside mb-2 space-y-0.5 pl-1">{children}</ol>,
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  code: ({ children }: any) => <code className="bg-white/10 px-1 py-0.5 rounded text-[10px] font-mono">{children}</code>,
  pre: ({ children }: any) => <pre className="bg-white/5 border border-white/10 rounded-lg p-3 overflow-x-auto text-[10px] font-mono mb-2">{children}</pre>,
  blockquote: ({ children }: any) => <blockquote className="border-l-2 border-accent/50 pl-3 italic opacity-70 mb-2">{children}</blockquote>,
  hr: () => <hr className="border-white/10 my-3" />,
  a: ({ children, href }: any) => <a href={href} className="text-accent underline underline-offset-2 hover:opacity-80">{children}</a>,
};

// Clean relay message text — strip verbose action logs agents include in their summaries
const cleanRelayText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .split('\n')
    .filter(line => {
      const l = line.trim();
      if (/^Actions?(\s+taken)?:/i.test(l)) return false;
      if (/^(create_project|generate_artifact|update_artifact|create_task|update_task_status|read_artifact|list_project_files)\(/.test(l)) return false;
      if (/→ (Artifact|Project|Task) (created|updated) with ID/i.test(l)) return false;
      if (/^\[.+-.+\]$/.test(l)) return false;
      return true;
    })
    .join('\n')
    .trim();
};

// ─── Agent Execution Panel (Lovable-style) ────────────────────────────────────

interface ExecutionState {
  plan: { agentId: string }[];
  agentStatus: Record<string, 'pending' | 'active' | 'done'>;
  agentActions: Record<string, { type: string; label: string; id: string }[]>;
  activeAgent: string | null;
  done: boolean;
  areaId?: string;
  interrupted?: boolean; // session was refreshed mid-execution — state is stale
}

const getFileIcon = (title: string) => {
  const ext = (title || '').split('.').pop()?.toLowerCase();
  if (['html','htm'].includes(ext||'')) return '🌐';
  if (['css','scss'].includes(ext||'')) return '🎨';
  if (['js','jsx','ts','tsx'].includes(ext||'')) return '⚡';
  if (ext === 'sql') return '🗄️';
  if (['json','env','yml'].includes(ext||'')) return '⚙️';
  if (ext === 'md') return '📝';
  if (['sh','dockerfile'].includes(ext||'') || title?.toLowerCase()==='dockerfile') return '🐳';
  return '📄';
};

const AgentInteractionBlock = ({ execution, isLive = false, onCancel }: {
  execution: ExecutionState;
  isLive?: boolean;
  onCancel?: () => void;
}) => {
  if (!execution.plan.length) return null;

  const doneCount = Object.values(execution.agentStatus).filter(s => s === 'done').length;
  const total = execution.plan.length;
  const isInterrupted = execution.interrupted;

  const headerLabel = isInterrupted
    ? 'Sessão anterior · verificando...'
    : isLive && !execution.done
      ? `Executando · ${doneCount}/${total} agentes`
      : `Concluído · ${doneCount}/${total} agentes`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`my-3 rounded-2xl overflow-hidden backdrop-blur-sm ${isInterrupted ? 'border border-amber-500/20 bg-amber-500/[0.03]' : 'border border-white/8 bg-black/40'}`}
    >
      {/* Header */}
      <div className={`flex items-center gap-2.5 px-4 py-2.5 border-b ${isInterrupted ? 'border-amber-500/15 bg-amber-500/[0.04]' : 'border-white/5 bg-white/[0.02]'}`}>
        {isInterrupted
          ? <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          : isLive && !execution.done
            ? <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
            : <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />}
        <p className={`text-[9px] label-mono uppercase tracking-[0.2em] font-black flex-1 ${isInterrupted ? 'text-amber-400/80' : 'text-main/60'}`}>
          {headerLabel}
        </p>
        {/* Cancel button — only when actively running */}
        {isLive && !execution.done && onCancel && (
          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-all border border-red-400/20 hover:border-red-400/40 label-mono"
            title="Limpar estado de execução"
          >
            <X size={10} />
            Cancelar
          </button>
        )}
        {/* Progress bar */}
        {!isInterrupted && (
          <div className="w-20 h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full bg-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(doneCount / total) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        )}
      </div>

      {/* Agent pipeline */}
      <div className="divide-y divide-white/[0.04]">
        {execution.plan.map(({ agentId }, idx) => {
          const rawStatus = execution.agentStatus[agentId] || 'pending';
          // While interrupted, treat 'active' as uncertain (show as pending-like)
          const status = isInterrupted && rawStatus === 'active' ? 'pending' : rawStatus;
          const actions = execution.agentActions[agentId] || [];
          const info = getAgentInfo(agentId);
          const isActive = status === 'active';
          const isDone = status === 'done';

          const files = actions.filter(a => a.type === 'file');
          const tasks = actions.filter(a => a.type === 'task');
          const other = actions.filter(a => a.type === 'other');

          return (
            <motion.div
              key={agentId}
              initial={{ opacity: 0 }}
              animate={{ opacity: status === 'pending' ? 0.4 : 1 }}
              className={`px-4 py-3 transition-all ${isActive ? 'bg-accent/[0.04]' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                {/* Status icon */}
                <div className="shrink-0 w-4 flex justify-center">
                  {isDone
                    ? <CheckCircle2 size={14} className="text-emerald-400" />
                    : isActive
                    ? <Zap size={14} className="text-accent animate-pulse" />
                    : <div className="w-3 h-3 rounded-full border border-white/15" />}
                </div>

                {/* Avatar */}
                <div className="relative shrink-0">
                  <img src={info.avatar} alt={info.name} className={`w-7 h-7 rounded-full ring-1 transition-all ${isActive ? 'ring-accent/60 shadow-lg shadow-accent/20' : 'ring-white/10'}`} />
                  {isActive && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent border-2 border-[#050505] animate-pulse" />}
                </div>

                {/* Name + role */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-black leading-none ${isActive ? 'text-white' : isDone ? 'text-main/80' : 'text-dim/60'}`}>
                      {info.name}
                    </span>
                    <span
                      className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md leading-none"
                      style={{
                        color: info.color,
                        background: `${info.color}18`,
                        border: `1px solid ${info.color}30`,
                      }}
                    >
                      {info.role}
                    </span>
                  </div>
                  {isActive && (
                    <p className="text-[9px] text-accent/60 label-mono mt-0.5 animate-pulse">processando...</p>
                  )}
                  {isDone && tasks.length > 0 && (
                    <p className="text-[9px] text-dim/40 label-mono mt-0.5">{tasks.length} tarefa{tasks.length > 1 ? 's' : ''} criada{tasks.length > 1 ? 's' : ''}</p>
                  )}
                </div>

                {/* File count badge */}
                {isDone && files.length > 0 && (
                  <span className="text-[9px] label-mono text-accent/70 bg-accent/10 px-2 py-0.5 rounded-full">{files.length} arquivo{files.length > 1 ? 's' : ''}</span>
                )}
              </div>

              {/* Files created */}
              {files.length > 0 && (
                <div className="mt-2 ml-[2.375rem] flex flex-wrap gap-1.5">
                  {files.map((f, i) => (
                    <motion.span
                      key={f.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded-lg bg-white/[0.04] border border-white/8 text-main/60"
                    >
                      <span>{getFileIcon(f.label)}</span>
                      <span className="truncate max-w-[140px]">{f.label}</span>
                    </motion.span>
                  ))}
                </div>
              )}

              {/* Current action (active only) */}
              {isActive && other.length > 0 && (
                <p className="mt-1.5 ml-[2.375rem] text-[10px] text-dim/60 truncate">
                  {other[other.length - 1].label.replace(/\*\*/g, '')}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

const ChatInput = ({ onSendMessage, isListening, toggleVoice, voiceTranscript = '', placeholder = "Diretriz estratégica...", showGlobe = false }: any) => {
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string, type: string, data: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFile({
          name: file.name,
          type: file.type,
          data: (reader.result as string).split(',')[1] // Get base64 data only
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const final = isListening ? voiceTranscript : input;
    if (final.trim() || selectedFile) {
      onSendMessage(final, undefined, selectedFile);
      setInput('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-2 ${showGlobe ? '' : 'p-4 border-t'}`} style={{ borderColor: 'var(--border)' }}>
      {selectedFile && (
        <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-xl self-start mb-2 animate-fade-in">
          <Paperclip size={12} className="text-accent" />
          <span className="text-[10px] font-black text-accent uppercase truncate max-w-[200px]">{selectedFile.name}</span>
          <button type="button" onClick={() => setSelectedFile(null)} className="ml-2 text-accent hover:text-white transition-all"><X size={12} /></button>
        </div>
      )}
      <div className="flex gap-2 w-full min-w-0">
        <div className="relative flex-1 min-w-0 flex items-center">
          <button type="button" onClick={() => fileInputRef.current?.click()} className={`absolute ${showGlobe ? 'left-10' : 'left-3'} p-1.5 text-dim hover:text-accent z-10`}><Paperclip size={18} /></button>
          {showGlobe && <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-accent opacity-50 z-10" />}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.pdf,.txt,.js,.ts,.tsx,.css" />
          <input value={isListening ? (voiceTranscript || 'Escutando...') : input} onChange={e => setInput(e.target.value)} placeholder={isListening ? 'Fale agora...' : (selectedFile ? 'Descreva o anexo...' : placeholder)} className={`w-full min-w-0 ${showGlobe ? 'pl-16 md:pl-20' : 'pl-10 md:pl-12'} pr-12 py-3 rounded-xl text-sm border focus:outline-none transition-all`} style={{ background: isListening ? '#3B82F610' : 'var(--bg)', borderColor: isListening ? '#3B82F6' : 'var(--border)', color: 'var(--text-main)' }} />
          <button type="button" onClick={toggleVoice} className={`absolute right-3 p-1.5 transition-all ${isListening ? 'text-red-500 scale-125 bg-red-500/10 rounded-full ring-4 ring-red-500/20' : 'text-dim hover:text-accent'}`}>{isListening ? <MicOff size={18} /> : <Mic size={18} />}</button>
        </div>
        <button type="submit" className="shrink-0 px-4 py-3 rounded-lg text-white font-bold bg-accent"><Send size={16} /></button>
      </div>
    </form>
  );
};

// --- MAIN APP ---

export default function App() {
  // --- 1. STATES ---
  const [authState, setAuthState] = useState<'loading' | 'landing' | 'auth' | 'onboarding' | 'app'>('loading');
  const [isRegistering, setIsRegistering] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [context, setContext] = useState<CompanyContext>({ id: '', name: '', userName: '', description: '', industry: '', goals: '', targetAudience: '', challenges: '', websiteUrl: '', credits: 0, plan: 'starter' });
  const [currentView, setCurrentView] = useState<'dashboard' | 'chat' | 'kanban' | 'artifacts' | 'logs' | 'credits' | 'hierarchy' | 'projects' | 'profile'>(() => (localStorage.getItem('currentView') as any) || 'dashboard');
  const [tenants, setTenants] = useState<any[]>([]);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<Area | null>(() => {
    const saved = localStorage.getItem('selectedAreaId');
    return saved ? AREAS.find(a => a.id === saved) || null : null;
  });

  useEffect(() => { localStorage.setItem('currentView', currentView); }, [currentView]);
  useEffect(() => { if (selectedArea) localStorage.setItem('selectedAreaId', selectedArea.id); else localStorage.removeItem('selectedAreaId'); }, [selectedArea]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  // Check for active jobs on mount — always true so any tab can reconnect
  const sessionRestoredRef = useRef(true);
  const [isTyping, setIsTyping] = useState(() => sessionStorage.getItem('idealos_isTyping') === 'true');
  const [isPollingResults, setIsPollingResults] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(null);
  const [artifactViewMode, setArtifactViewMode] = useState<'code' | 'preview'>('code');
  const [isListening, setIsListening] = useState(false);
  const [agentInteractions, setAgentInteraction] = useState<{ id: string, agent: string, text: string, timestamp: number }[]>([]);
  const [execution, setExecution] = useState<ExecutionState>(() => {
    try {
      const saved = sessionStorage.getItem('idealos_execution');
      return saved ? JSON.parse(saved) : { plan: [], agentStatus: {}, agentActions: {}, activeAgent: null, done: false };
    } catch { return { plan: [], agentStatus: {}, agentActions: {}, activeAgent: null, done: false }; }
  });
  const [isFullscreenArtifact, setIsFullscreenArtifact] = useState(false);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [publishState, setPublishState] = useState<{ loading: boolean; publicUrl: string | null; customDomain: string | null; domainInput: string }>({ loading: false, publicUrl: null, customDomain: null, domainInput: '' });
  const [voiceInput, setVoiceInput] = useState('');
  const [logoFile, setLogoFile] = useState<string | null>(null); // base64 data URL
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const globalScrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Persist execution state to sessionStorage so navigation doesn't lose context
  useEffect(() => {
    if (isTyping) {
      sessionStorage.setItem('idealos_isTyping', 'true');
      sessionStorage.setItem('idealos_execution', JSON.stringify(execution));
    } else {
      sessionStorage.removeItem('idealos_isTyping');
      sessionStorage.removeItem('idealos_execution');
    }
  }, [isTyping, execution]);

  // Reconnect to any running job once the user is authenticated.
  // Same-tab reload → sessionStorage job_id (immediate).
  // New tab / window → query backend for active job (runs after authState === 'app').
  const jobCheckDoneRef = useRef(false);

  const doJobReconnect = (jobId: string, savedAreaId: string) => {
    // Auto-navigate to the area where the job is running so the execution block is visible
    if (savedAreaId && savedAreaId !== 'global') {
      const area = AREAS.find(a => a.id === savedAreaId);
      if (area) {
        setSelectedArea(area);
        setCurrentView('chat');
        // Load messages for that area
        fetch(`/api/messages/${area.id}`).then(r => r.ok ? r.json() : []).then(d => {
          const msgs = Array.isArray(d) ? d.map((m: any) => m.role === 'agent' ? { ...m, isRelay: true } : m) : [];
          setMessages(p => ({ ...p, [area.id]: msgs }));
        }).catch(() => {});
      }
    }
    setIsTyping(true);
    setExecution(prev => ({ ...prev, interrupted: false, done: false, activeAgent: null }));
    let eventsReceived = 0;

    geminiService.reconnectJob(jobId, (event) => {
      eventsReceived++;
      // Only show "Sincronizando" banner once we confirmed there are real events
      if (eventsReceived === 1) setIsPollingResults(true);
      if (event.type === 'orchestrator_plan') {
        const plan = (event as any).plan?.map((s: any) => ({ agentId: s.agentId })) || [];
        const status: Record<string, 'pending'|'active'|'done'> = {};
        plan.forEach((s: any) => { status[s.agentId] = 'pending'; });
        setExecution({ plan, agentStatus: status, agentActions: {}, activeAgent: null, done: false, areaId: savedAreaId });
      } else if (event.type === 'agent_start') {
        setExecution(p => ({
          ...p,
          plan: p.plan.some(s => s.agentId === event.agentId) ? p.plan : [...p.plan, { agentId: event.agentId }],
          activeAgent: event.agentId,
          agentStatus: { ...p.agentStatus, [event.agentId]: 'active' },
        }));
      } else if (event.type === 'agent_message') {
        const agentMsg: Message = {
          id: `relay-reconnect-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
          senderId: event.agentId, senderName: event.agentName,
          text: event.message, timestamp: Date.now(), role: 'agent',
          isRelay: event.agentId !== 'ceo-ia',
          areaId: savedAreaId,
        };
        setMessages(p => ({ ...p, [savedAreaId]: [...(p[savedAreaId] || []), agentMsg] }));
      } else if (event.type === 'tool_call') {
        const isFile = event.toolName === 'generate_artifact' || event.toolName === 'generate_landing_page';
        const isTask = event.toolName === 'create_task' || event.toolName === 'update_task_status';
        const label = isFile ? (event.args?.filepath || event.args?.title || event.args?.company_name || 'arquivo') : event.toolName;
        setExecution(p => ({
          ...p,
          agentActions: {
            ...p.agentActions,
            [event.agentId]: [...(p.agentActions[event.agentId] || []), {
              id: Math.random().toString(),
              type: isFile ? 'file' : isTask ? 'task' : 'other',
              label: String(label).replace(/\*\*/g, ''),
            }],
          },
        }));
      } else if (event.type === 'agent_done') {
        setExecution(p => ({ ...p, agentStatus: { ...p.agentStatus, [event.agentId]: 'done' }, activeAgent: null }));
      } else if (event.type === 'task_created') {
        setTasks(p => p.some(t => t.id === event.task.id) ? p : [...p, event.task as any]);
      } else if (event.type === 'task_updated') {
        setTasks(p => p.map(t => t.id === event.taskId ? { ...t, status: event.status as any } : t));
      } else if (event.type === 'artifact_created' && event.artifact?.id) {
        setArtifacts(p => p.some((a: any) => a.id === event.artifact.id) ? p : [...p, { ...event.artifact, timestamp: Date.now() }] as any);
      } else if (event.type === 'project_created' && event.project?.id) {
        setProjects(p => p.some((x: any) => x.id === event.project.id) ? p : [...p, event.project] as any);
      }
    }).then(async ({ text }) => {
      if (eventsReceived === 0) {
        setIsTyping(false);
        setIsPollingResults(false);
        setExecution({ plan: [], agentStatus: {}, agentActions: {}, activeAgent: null, done: false });
        clearActiveJobId();
        // Server may have restarted — sync DB to restore any completed work
        const [tks, arts, projs] = await Promise.all([
          fetch('/api/tasks').then(r => r.ok ? r.json() : null),
          fetch('/api/artifacts').then(r => r.ok ? r.json() : null),
          fetch('/api/projects').then(r => r.ok ? r.json() : null),
        ]);
        if (Array.isArray(tks)) setTasks(tks);
        if (Array.isArray(arts)) setArtifacts(arts);
        if (Array.isArray(projs)) setProjects(projs);
        return;
      }
      setExecution(p => ({ ...p, done: true, activeAgent: null }));
      setIsTyping(false);
      setIsPollingResults(false);
      if (text) {
        setMessages(p => ({ ...p, [savedAreaId]: [...(p[savedAreaId] || []), {
          id: (Date.now() + 1).toString(), senderId: 'os-core', senderName: 'OS Core',
          text, timestamp: Date.now(), role: 'agent',
        }] }));
      }
      // Sync final state from DB
      const [tks, arts, projs] = await Promise.all([
        fetch('/api/tasks').then(r => r.ok ? r.json() : null),
        fetch('/api/artifacts').then(r => r.ok ? r.json() : null),
        fetch('/api/projects').then(r => r.ok ? r.json() : null),
      ]);
      if (Array.isArray(tks)) setTasks(tks);
      if (Array.isArray(arts)) setArtifacts(arts);
      if (Array.isArray(projs)) setProjects(projs);
    });
  };

  // Triggered once when user lands on the app (authenticated)
  useEffect(() => {
    if (authState !== 'app' || jobCheckDoneRef.current) return;
    jobCheckDoneRef.current = true;

    // Same-tab reload: sessionStorage has the job_id
    const sessionJobId = getActiveJobId();
    if (sessionJobId) {
      const savedAreaId = localStorage.getItem('selectedAreaId') || 'global';
      doJobReconnect(sessionJobId, savedAreaId);
      return;
    }

    // New tab / window: ask the backend
    fetch('/api/agent/jobs/active', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.found && data.jobId) {
          // Use the area from the backend (authoritative), not sessionStorage
          const savedAreaId = data.areaName || sessionStorage.getItem('selectedAreaId') || 'global';
          saveActiveJobId(data.jobId);
          doJobReconnect(data.jobId, savedAreaId);
        }
      })
      .catch(() => {});
  }, [authState]);

  // --- 2. LOGIC ---
  useEffect(() => {
    // Safety timeout: if checkAuth hangs for >8s, force to landing
    const timeout = setTimeout(() => {
      setAuthState(prev => prev === 'loading' ? 'landing' : prev);
    }, 8000);
    checkAuth().then(() => {
      clearTimeout(timeout);
      const savedView = localStorage.getItem('currentView');
      const savedAreaId = localStorage.getItem('selectedAreaId');
      if (savedView === 'chat' && savedAreaId) {
        const area = AREAS.find(a => a.id === savedAreaId);
        if (area) selectArea(area);
      }
    });
  }, []);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, selectedArea, isTyping, agentInteractions]);
  useEffect(() => { if (globalScrollRef.current) globalScrollRef.current.scrollTop = globalScrollRef.current.scrollHeight; }, [messages['global'], isTyping]);
  useEffect(() => {
    if (currentView === 'dashboard' && authState === 'app') {
      fetch('/api/messages/global').then(r => r.ok ? r.json() : []).then(d => {
        if (Array.isArray(d)) setMessages(p => ({ ...p, global: d }));
      }).catch(() => {});
    }
  }, [currentView, authState]);

  const checkAuth = async (forceAuth = false) => {
    console.log('[checkAuth] START, authState=', authState, 'forceAuth=', forceAuth);
    try {
      const r = await fetch('/api/auth/me', { credentials: 'include' });
      console.log('[checkAuth] /api/auth/me status:', r.status);
      if (r.status === 401) {
        setAuthState(forceAuth ? 'auth' : 'landing');
        return;
      }
      const d = await r.json();
      console.log('[checkAuth] /api/auth/me response:', d);
      if (d.authenticated || d.user) {
        setUser(d.user); setTenants(d.tenants || []); setCurrentTenantId(d.currentTenantId || d.tenant_id);
        let ctx: any = {};
        try {
          const ctxRes = await fetch('/api/context', { credentials: 'include' });
          console.log('[checkAuth] /api/context status:', ctxRes.status);
          if (ctxRes.ok) ctx = await ctxRes.json();
        } catch (ctxErr) {
          console.warn('[checkAuth] /api/context error:', ctxErr);
        }
        const hasFullProfile = !!(ctx.name && ctx.industry && ctx.goals && ctx.description);
        console.log('[checkAuth] ctx fields:', { name: ctx.name, industry: ctx.industry, goals: !!ctx.goals, description: !!ctx.description, hasFullProfile });
        if (hasFullProfile) {
          setContext({ ...ctx, userName: d.user.name });
          console.log('[checkAuth] → setAuthState(app)');
          setAuthState('app');
          loadData();
        } else {
          setContext({ ...ctx, userName: d.user?.name || '' });
          console.log('[checkAuth] → setAuthState(onboarding)');
          setAuthState('onboarding');
        }
      } else {
        console.log('[checkAuth] → not authenticated → setAuthState', forceAuth ? 'auth' : 'landing');
        setAuthState(forceAuth ? 'auth' : 'landing');
      }
    } catch (err) {
      console.error('[checkAuth] ERROR:', err);
      setAuthState(forceAuth ? 'auth' : 'landing');
    }
  };

  const safeJson = async (res: Response, fallback: any = []) => {
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return fallback;
    return res.json().catch(() => fallback);
  };

  const loadData = async () => {
    try {
      const [tks, arts, lgs, projs, globalMsgs] = await Promise.all([
        fetch('/api/tasks').then(r => safeJson(r)),
        fetch('/api/artifacts').then(r => safeJson(r)),
        fetch('/api/logs').then(r => safeJson(r)),
        fetch('/api/projects').then(r => safeJson(r)),
        fetch('/api/messages/global').then(r => safeJson(r)),
      ]);
      if (Array.isArray(tks)) setTasks(tks);
      if (Array.isArray(arts)) setArtifacts(arts);
      if (Array.isArray(lgs)) setAgentLogs(lgs);
      if (Array.isArray(projs)) setProjects(projs);
      if (Array.isArray(globalMsgs)) setMessages(p => ({ ...p, global: globalMsgs.map((m: any) => m.role === 'agent' ? { ...m, isRelay: true } : m) }));
    } catch (e) { console.error(e); }
  };

  const handleLogin = async (e: any) => {
    e.preventDefault(); const f = e.target;
    try {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: f.elements.username.value, password: f.elements.password.value }) });
      const d = await r.json();
      if (r.ok && d.user) await checkAuth(); else alert(d.message || 'Erro ao fazer login');
    } catch (err) { alert('Erro: ' + (err as any).message); }
  };

  const handleRegister = async (e: any) => {
    e.preventDefault(); const f = e.target;
    try {
      const r = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: f.elements.username.value, password: f.elements.password.value, name: f.elements.name.value, email: f.elements.email.value }) });
      const d = await r.json();
      if (r.ok && d.user) { alert('Sucesso!'); setIsRegistering(false); await checkAuth(); } else alert(d.message || 'Erro ao registrar');
    } catch (err) { alert('Erro: ' + (err as any).message); }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setAuthState('landing');
    // Clear all session state so next user starts clean
    sessionStorage.clear();
    clearActiveJobId();
    localStorage.removeItem('currentView');
    localStorage.removeItem('selectedAreaId');
    setExecution({ plan: [], agentStatus: {}, agentActions: {}, activeAgent: null, done: false });
    setIsTyping(false);
    jobCheckDoneRef.current = false;
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setLogoFile(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleOnboarding = async (e: any) => {
    e.preventDefault();
    const f = e.target;
    const updatedContext = {
      ...context,
      name: f.elements.companyName.value,
      industry: f.elements.industry.value,
      goals: f.elements.goals.value,
      description: f.elements.description.value,
      targetAudience: f.elements.targetAudience.value,
      challenges: f.elements.challenges.value,
      websiteUrl: f.elements.websiteUrl.value,
      logoUrl: logoFile || f.elements.logoUrl?.value || context.logoUrl || '',
      brandColors: f.elements.brandColors.value,
      brandTone: f.elements.brandTone.value,
    };
    await fetch('/api/context', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedContext) });
    await checkAuth();
    // If editing from profile view, go back to dashboard
    if (authState === 'app') setCurrentView('dashboard');
  };

  const speakText = (text: string) => { const s = window.speechSynthesis; s.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'pt-BR'; s.speak(u); };

  const toggleVoiceCommand = () => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return alert('Não suportado');
    const rec = new SR(); rec.lang = 'pt-BR'; rec.interimResults = true;
    rec.onstart = () => setIsListening(true); rec.onend = () => setIsListening(false);
    rec.onresult = (e: any) => { const t = e.results[0][0].transcript; if (e.results[0].isFinal) { sendMessage(t); setVoiceInput(''); } else setVoiceInput(t); };
    recognitionRef.current = rec; rec.start();
  };

  const persistMessage = async (msg: Message, areaId: string) => {
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...msg, areaId })
      });
    } catch (e) { console.error('Error persisting message:', e); }
  };

  const deleteTask = async (id: string) => { setTasks(p => p.filter(x => x.id !== id)); await fetch(`/api/tasks/${id}`, { method: 'DELETE' }); };
  const clearAllTasks = async () => { if (confirm('Limpar todas as tarefas do Kanban?')) { setTasks([]); await fetch('/api/tasks/clear/all', { method: 'DELETE' }); } };
  const resolveStuckTasks = async () => {
    const stuck = tasks.filter(t => t.status !== 'DONE');
    if (!stuck.length) return;
    await Promise.all(stuck.map(t => fetch(`/api/tasks/${t.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DONE' }) })));
    setTasks(p => p.map(t => t.status !== 'DONE' ? { ...t, status: 'DONE' as any } : t));
  };

  const deleteProject = async (id: string) => {
    setProjects(p => p.filter(x => x.id !== id));
    setSelectedProject(null);
    setCurrentView('projects');
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    await loadData();
  };

  const selectArea = async (area: Area) => {
    setSelectedArea(area);
    setCurrentView('chat');
    try {
      const r = await fetch(`/api/messages/${area.id}`);
      if (r.status === 401) { setAuthState('auth'); return; }
      const d = await r.json();
      const dbMsgs = Array.isArray(d) ? d.map((m: any) => m.role === 'agent' ? { ...m, isRelay: true } : m) : [];
      setMessages(prev => {
        const existing = prev[area.id] || [];
        // Keep in-memory relay messages (not yet persisted) if agent is still running in this area
        const inMemoryRelays = existing.filter((m: any) => m.isRelay && !dbMsgs.some((db: any) => db.id === m.id));
        return { ...prev, [area.id]: [...dbMsgs, ...inMemoryRelays] };
      });
    } catch (e) {
      console.error("Erro ao carregar mensagens:", e);
      setMessages(p => ({ ...p, [area.id]: [] }));
    }
  };
  const createNewTask = async (title: string, desc = '', status: any = 'PLANNING', assigneeId = 'pm') => { const t = { id: Math.random().toString(36).substr(2, 9), title, description: desc, status, assigneeId, logs: [] }; setTasks(p => [t, ...p]); await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) }); };
  const updateTaskStatus = async (id: string, status: any) => { setTasks(p => p.map(x => x.id === id ? { ...x, status } : x)); await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); };
  const createArtifact = async (title: string, language: string, code: string, type: any) => { const a = { id: Math.random().toString(36).substr(2, 9), title, language, code, type, timestamp: Date.now() }; setArtifacts(p => [a, ...p]); await fetch('/api/artifacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) }); return a.id; };
  const updateArtifact = async (id: string, title: string, language: string, code: string, type: any) => { setArtifacts(p => p.map(a => a.id === id ? { ...a, title, language, code, type } : a)); await fetch(`/api/artifacts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, language, code, type }) }); return id; };

  const handleArtifactAction = async (c: any, areaId: string, targetId?: string) => {
    const aid = c.name === 'generate_artifact' 
      ? await createArtifact(c.args.title, c.args.language, c.args.code, c.args.type) 
      : await updateArtifact(c.args.artifactId, c.args.title, c.args.language, c.args.code, c.args.type);
    
    // Fuzzy matching for auto-completing tasks
    const rel = tasks.find(t => 
      t.status !== 'DONE' && (
        t.title.toLowerCase().includes(c.args.title.toLowerCase()) || 
        c.args.title.toLowerCase().includes(t.title.toLowerCase())
      )
    );
    if (rel) await updateTaskStatus(rel.id, 'DONE');
    
    return { aid, rel };
  };

  const sendMessage = async (text: string, overrideId?: string, attachment?: any) => {
    const areaId = overrideId || selectedArea?.id || 'global';
    const isGlobal = areaId === 'global';
    setIsPollingResults(false); // stop any post-refresh polling when user sends new message
    setAgentInteraction([]);
    setExecution({ plan: [], agentStatus: {}, agentActions: {}, activeAgent: null, done: false, areaId });
    const msg: Message = { id: Date.now().toString(), senderId: 'user', senderName: context.userName, text, timestamp: Date.now(), role: 'user', attachment };
    
    const currentMessages = Array.isArray(messages[areaId]) ? messages[areaId] : [];
    const updatedMessages = [...currentMessages, msg];
    setMessages(p => ({ ...p, [areaId]: updatedMessages }));
    await persistMessage(msg, areaId);
    
    setIsTyping(true);
    try {
      const agentName = isGlobal ? 'os-core' : (selectedArea?.id || 'pm');

      const toolLabel = (toolName: string, args: any): string => {
        if (toolName === 'create_project') return `Criando projeto: **${args.name}**`;
        if (toolName === 'create_task') return `Criando tarefa: **${args.title}**`;
        if (toolName === 'update_task_status') return `Atualizando status → ${args.status}`;
        if (toolName === 'generate_artifact') return `Gerando artefato: **${args.title}**`;
        if (toolName === 'update_artifact') return `Atualizando artefato: **${args.title}**`;
        return toolName;
      };

      const res = await geminiService.generateAgentResponse(
        isGlobal ? "global" : (selectedArea?.id || 'global'),
        context, updatedMessages, text, tasks, artifacts, isGlobal,
        (event) => {
          if (event.type === 'orchestrator_plan') {
            const plan = event.plan.map((s: any) => ({ agentId: s.agentId }));
            const status: Record<string, 'pending'|'active'|'done'> = {};
            plan.forEach((s: any) => { status[s.agentId] = 'pending'; });
            setExecution({ plan, agentStatus: status, agentActions: {}, activeAgent: null, done: false, areaId });

          } else if (event.type === 'agent_start') {
            setExecution(p => {
              const alreadyInPlan = p.plan.some(s => s.agentId === event.agentId);
              return {
                ...p,
                plan: alreadyInPlan ? p.plan : [...p.plan, { agentId: event.agentId }],
                activeAgent: event.agentId,
                agentStatus: { ...p.agentStatus, [event.agentId]: 'active' },
              };
            });

          } else if (event.type === 'agent_message') {
            // Hélio (ceo-ia) messages are final synthesis — full rendering, not relay preview
            const isHelioMessage = event.agentId === 'ceo-ia';
            const agentMsg: Message = {
              id: `relay-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              senderId: event.agentId,
              senderName: event.agentName,
              text: event.message,
              timestamp: Date.now(),
              role: 'agent',
              isRelay: !isHelioMessage,
              areaId,
            };
            setMessages(p => ({ ...p, [areaId]: [...(p[areaId] || []), agentMsg] }));

          } else if (event.type === 'tool_call') {
            const isFile = event.toolName === 'generate_artifact' || event.toolName === 'update_artifact';
            const isTask = event.toolName === 'create_task' || event.toolName === 'update_task_status';
            const label = isFile ? (event.args?.filepath || event.args?.title || 'arquivo') : toolLabel(event.toolName, event.args);
            setExecution(p => ({
              ...p,
              agentActions: {
                ...p.agentActions,
                [event.agentId]: [...(p.agentActions[event.agentId] || []), {
                  id: Math.random().toString(),
                  type: isFile ? 'file' : isTask ? 'task' : 'other',
                  label: label.replace(/\*\*/g, ''),
                }],
              },
            }));

          } else if (event.type === 'task_created') {
            // Real-time Kanban: add task immediately
            setTasks(p => {
              if (p.some(t => t.id === event.task.id)) return p;
              return [...p, event.task as any];
            });

          } else if (event.type === 'task_updated') {
            // Real-time Kanban: update task status immediately
            setTasks(p => p.map(t => t.id === event.taskId ? { ...t, status: event.status as any } : t));

          } else if (event.type === 'artifact_created') {
            // Real-time: add artifact to library immediately
            if (event.artifact?.id) {
              setArtifacts(p => {
                if (p.some((a: any) => a.id === event.artifact.id)) return p;
                return [...p, { ...event.artifact, timestamp: Date.now() }] as any;
              });
            }

          } else if (event.type === 'artifact_updated') {
            if (event.artifact?.id) {
              setArtifacts(p => p.map((a: any) => a.id === event.artifact.id ? { ...a, ...event.artifact } : a));
            }

          } else if (event.type === 'project_created') {
            if (event.project?.id) {
              setProjects((p: any) => {
                if (p.some((x: any) => x.id === event.project.id)) return p;
                return [...p, event.project];
              });
            }

          } else if (event.type === 'infrastructure_provisioned') {
            // Trigger infra tab refresh in ProjectExplorer via a custom event
            window.dispatchEvent(new CustomEvent('infra_provisioned', { detail: event }));

          } else if (event.type === 'agent_done') {
            setExecution(p => ({
              ...p,
              agentStatus: { ...p.agentStatus, [event.agentId]: 'done' },
              activeAgent: null,
            }));

          } else if (event.type === 'agent_handoff') {
            const handoffMsg = {
              id: `handoff-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              senderId: event.fromAgentId,
              senderName: event.fromAgentName,
              text: event.fromMessage,
              timestamp: Date.now(),
              role: 'agent',
              isRelay: true,
              isHandoff: true,
              handoffTo: { agentId: event.toAgentId, agentName: event.toAgentName, message: event.toMessage },
              areaId,
            } as any;
            setMessages(p => ({ ...p, [areaId]: [...(p[areaId] || []), handoffMsg] }));
          }
        }
      );

      setExecution(p => ({ ...p, done: true, activeAgent: null }));

      // Sync only tasks/artifacts/projects — NOT messages (would erase relay messages)
      try {
        const [tks, arts, projs] = await Promise.all([
          fetch('/api/tasks').then(r => r.ok ? r.json() : []),
          fetch('/api/artifacts').then(r => r.ok ? r.json() : []),
          fetch('/api/projects').then(r => r.ok ? r.json() : []),
        ]);
        if (Array.isArray(tks)) setTasks(tks);
        if (Array.isArray(arts)) setArtifacts(arts);
        if (Array.isArray(projs)) setProjects(projs);
      } catch {}

      // Only add final summary if there's actual text not already sent via agent_message events
      if (res.text) {
        const am: Message = {
          id: (Date.now() + 1).toString(),
          senderId: 'ceo-ia',
          senderName: 'Hélio',
          text: res.text,
          timestamp: Date.now(),
          role: 'agent',
        };
        setMessages(p => ({ ...p, [areaId]: [...(p[areaId] || []), am] }));
        await persistMessage(am, areaId);
        speakText(am.text);
      }
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as TaskStatus;
    updateTaskStatus(draggableId, newStatus);
  };

  const navItems = [
    { id: 'dashboard' as const, icon: LayoutDashboard, label: 'Áreas' },
    { id: 'hierarchy' as const, icon: Network, label: 'Organograma' },
    { id: 'kanban' as const, icon: Trello, label: 'Kanban' },
    { id: 'projects' as const, icon: FolderGit2, label: 'Projetos' },
    { id: 'logs' as const, icon: Activity, label: 'Logs' },
    { id: 'credits' as const, icon: CreditCard, label: 'Créditos' },
    { id: 'landing' as const, icon: Globe, label: 'Site Público' },
  ];

  // --- 3. RENDER ENGINE ---
  if (authState === 'loading') return <div className="h-screen flex items-center justify-center bg-[#050505] text-accent label-mono animate-pulse">Sincronizando Núcleo...</div>;

  if (authState === 'landing') return <LandingPage onEnterApp={() => { setAuthState('loading'); checkAuth(true); }} />;

  if (authState === 'auth') return (
    <div className="min-h-screen flex items-center justify-center p-6 tech-grid bg-[#050505]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md glass-panel p-10 rounded-3xl relative z-10">
        <div className="mb-10 text-center"><Logo size="lg" variant="footer" /><p className="label-mono opacity-50 text-[10px] uppercase tracking-widest text-main mt-2">Centro de Autenticação</p></div>
        {isRegistering ? (
          <form onSubmit={handleRegister} className="space-y-5 text-main">
            <div><label className="label-mono block mb-1 text-[10px] uppercase font-black opacity-60">Seu Nome Completo</label><input name="name" required className="w-full px-4 py-3 rounded-xl text-sm border bg-black/40 focus:border-accent outline-none" style={{ borderColor: 'var(--border)' }} /></div>
            <div><label className="label-mono block mb-1 text-[10px] uppercase font-black opacity-60">Seu E-mail</label><input name="email" type="email" required className="w-full px-4 py-3 rounded-xl text-sm border bg-black/40 focus:border-accent outline-none" style={{ borderColor: 'var(--border)' }} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label-mono block mb-1 text-[10px] uppercase font-black opacity-60">Usuário</label><input name="username" required className="w-full px-4 py-3 rounded-xl text-sm border bg-black/40 focus:border-accent outline-none" style={{ borderColor: 'var(--border)' }} /></div>
              <div><label className="label-mono block mb-1 text-[10px] uppercase font-black opacity-60">Senha</label><input name="password" type="password" required className="w-full px-4 py-3 rounded-xl text-sm border bg-black/40 focus:border-accent outline-none" style={{ borderColor: 'var(--border)' }} /></div>
            </div>
            <button type="submit" className="w-full py-4 rounded-xl font-black text-white text-xs uppercase tracking-[0.3em] bg-accent shadow-xl shadow-accent/20 hover:scale-[1.02] transition-all">Criar Conta</button>
            <button type="button" onClick={() => setIsRegistering(false)} className="w-full text-[10px] label-mono mt-4 opacity-50 uppercase font-bold text-center">Já sou membro? Entrar</button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5 text-main">
            <div><label className="label-mono block mb-1 text-[10px] uppercase font-black opacity-60">Usuário</label><input name="username" required className="w-full px-4 py-3 rounded-xl text-sm border bg-black/40 focus:border-accent outline-none" style={{ borderColor: 'var(--border)' }} /></div>
            <div><label className="label-mono block mb-1 text-[10px] uppercase font-black opacity-60">Senha</label><input name="password" type="password" required className="w-full px-4 py-3 rounded-xl text-sm border bg-black/40 focus:border-accent outline-none" style={{ borderColor: 'var(--border)' }} /></div>
            <button type="submit" className="w-full py-4 rounded-xl font-black text-white text-xs uppercase tracking-[0.3em] bg-accent shadow-xl shadow-accent/20 hover:scale-[1.02] transition-all">Acessar Sistema</button>
            <button type="button" onClick={() => setIsRegistering(true)} className="w-full text-[10px] label-mono mt-4 opacity-50 uppercase font-bold text-center">Novo Comandante? Registrar</button>
          </form>
        )}
      </motion.div>
    </div>
  );

  if (authState === 'onboarding') return (
    <div className="min-h-screen flex items-center justify-center p-6 tech-grid bg-[#050505]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl glass-panel p-10 rounded-3xl relative overflow-hidden text-main">
        <div className="absolute top-0 right-0 p-8 opacity-5"><Layers size={160} className="text-accent" /></div>
        <div className="mb-8 relative z-10"><Logo size="md" variant="footer" /><p className="label-mono opacity-50 text-[10px] uppercase mt-2 tracking-widest font-bold">Configuração Neural da Empresa</p></div>
        <form onSubmit={handleOnboarding} className="space-y-5 relative z-10 overflow-y-auto max-h-[72vh] pr-2 scrollbar-hide">

          {/* Seção: Identidade */}
          <p className="text-[9px] label-mono text-accent/60 uppercase tracking-[0.25em] font-black pt-1">01 · Identidade da Empresa</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">Nome da Empresa *</label><input name="companyName" required className="w-full px-4 py-3 rounded-lg border bg-black/20 text-main focus:border-accent outline-none text-sm" defaultValue={context.name} /></div>
            <div><label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">Setor / Indústria *</label><input name="industry" required className="w-full px-4 py-3 rounded-lg border bg-black/20 text-main focus:border-accent outline-none text-sm" defaultValue={context.industry || ''} /></div>
          </div>
          <div><label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">O que sua empresa faz? *</label><textarea name="description" required className="w-full px-4 py-3 rounded-lg border bg-black/20 text-main focus:border-accent outline-none h-16 resize-none text-sm" defaultValue={context.description || ''} placeholder="Ex: Somos uma plataforma SaaS de automação para PMEs..." /><p className="text-[9px] text-dim mt-1 opacity-60">💡 Seja específico: produto/serviço, mercado, diferenciais. Os agentes usam isso para criar todo o conteúdo.</p></div>

          {/* Seção: Marca */}
          <p className="text-[9px] label-mono text-accent/60 uppercase tracking-[0.25em] font-black pt-2">02 · Identidade Visual da Marca</p>
          <div>
            <label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">Logo da Empresa</label>
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <div
              onClick={() => logoInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border bg-black/20 cursor-pointer hover:border-accent/50 transition-all text-sm"
              style={{ borderColor: 'var(--border)' }}
            >
              {(logoFile || context.logoUrl) ? (
                <>
                  <img src={logoFile || context.logoUrl || ''} alt="Logo" className="h-8 w-auto object-contain rounded" />
                  <span className="text-dim text-xs">Clique para trocar</span>
                </>
              ) : (
                <>
                  <Upload size={16} className="text-dim shrink-0" />
                  <span className="text-dim text-xs">Clique para enviar sua logo (PNG, JPG, SVG)</span>
                </>
              )}
            </div>
            <p className="text-[9px] text-dim mt-1 opacity-60">Usada pelos agentes ao criar landing pages e materiais da sua marca.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">Cores da Marca</label><input name="brandColors" placeholder="Ex: #1A1A2E, #E94560, branco" className="w-full px-4 py-3 rounded-lg border bg-black/20 text-main focus:border-accent outline-none text-sm" defaultValue={context.brandColors || ''} /><p className="text-[9px] text-dim mt-1 opacity-60">Hex ou nomes: #1A1A2E, azul royal, dourado. O designer usará para criar a identidade visual.</p></div>
            <div><label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">Tom de Voz / Estilo</label>
              <select name="brandTone" className="w-full px-4 py-3 rounded-lg border bg-black/20 text-main focus:border-accent outline-none text-sm" defaultValue={context.brandTone || ''}>
                <option value="">Selecione</option>
                <option value="profissional e formal">Profissional e Formal</option>
                <option value="moderno e direto">Moderno e Direto</option>
                <option value="descontraído e próximo">Descontraído e Próximo</option>
                <option value="técnico e especialista">Técnico e Especialista</option>
                <option value="inspirador e motivacional">Inspirador e Motivacional</option>
                <option value="bold e disruptivo">Bold e Disruptivo</option>
              </select>
            </div>
          </div>

          {/* Seção: Estratégia */}
          <p className="text-[9px] label-mono text-accent/60 uppercase tracking-[0.25em] font-black pt-2">03 · Estratégia e Contexto</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">Site (URL)</label><input name="websiteUrl" placeholder="https://..." className="w-full px-4 py-3 rounded-lg border bg-black/20 text-main focus:border-accent outline-none text-sm" defaultValue={context.websiteUrl || ''} /></div>
            <div><label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">Objetivo Principal *</label>
              <select name="goals" required className="w-full px-4 py-3 rounded-lg border bg-black/20 text-main focus:border-accent outline-none text-sm" defaultValue={context.goals || ''}>
                <option value="">Selecione</option>
                <option value="Vender mais e aumentar receita">Vender Mais</option>
                <option value="Escalar operação e processos">Escalar Operação</option>
                <option value="Automatizar processos internos">Automatizar Processos</option>
                <option value="Aumentar reconhecimento de marca">Reconhecimento de Marca</option>
                <option value="Lançar novo produto ou serviço">Lançar Produto/Serviço</option>
              </select>
              <p className="text-[9px] text-dim mt-1 opacity-60">Define o foco de tudo que os agentes criarão para você.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">Público-Alvo</label><input name="targetAudience" placeholder="Ex: PMEs, CEOs de tecnologia..." className="w-full px-4 py-3 rounded-lg border bg-black/20 text-main focus:border-accent outline-none text-sm" defaultValue={context.targetAudience || ''} /><p className="text-[9px] text-dim mt-1 opacity-60">Ex: "PMEs do setor de saúde, donos de clínica, 30-50 anos"</p></div>
            <div><label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">Maiores Desafios</label><input name="challenges" placeholder="Ex: Geração de leads, retenção..." className="w-full px-4 py-3 rounded-lg border bg-black/20 text-main focus:border-accent outline-none text-sm" defaultValue={context.challenges || ''} /><p className="text-[9px] text-dim mt-1 opacity-60">Ex: "Pouca visibilidade online, ticket médio baixo, alta concorrência"</p></div>
          </div>

          <button type="submit" className="w-full py-4 rounded-xl font-black text-white text-xs uppercase bg-accent shadow-xl shadow-accent/20 mt-2 hover:scale-[1.01] transition-all">Ativar Núcleo Neural →</button>
        </form>
      </motion.div>
    </div>
  );

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${theme}`} style={{ background: 'var(--bg)', color: 'var(--text-main)' }}>
      {/* Grid Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(59, 130, 246, 0.1) 25%, rgba(59, 130, 246, 0.1) 26%, transparent 27%, transparent 74%, rgba(59, 130, 246, 0.1) 75%, rgba(59, 130, 246, 0.1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(59, 130, 246, 0.1) 25%, rgba(59, 130, 246, 0.1) 26%, transparent 27%, transparent 74%, rgba(59, 130, 246, 0.1) 75%, rgba(59, 130, 246, 0.1) 76%, transparent 77%, transparent)', backgroundSize: '60px 60px', zIndex: 0, backgroundPosition: '39.375px 39.375px' }}></div>
      
      {/* HEADER */}
      <header className="h-16 flex items-center justify-between px-6 border-b glass-panel z-[110]" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 rounded-lg text-dim hover:text-white hover:bg-white/5" aria-label="Menu"><Menu size={20} /></button>
          <Logo size="md" variant="footer" interactive onClick={() => setCurrentView('dashboard')} />
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02] text-xs">
            <CreditCard size={12} className="text-accent" />
            <span className="font-mono text-[10px] font-bold text-main">{context.credits.toLocaleString()}</span>
          </div>
          <button onClick={() => setCurrentView('profile')} className={`p-2 rounded-lg transition-all ${currentView === 'profile' ? 'text-accent bg-accent/10' : 'text-dim hover:text-white hover:bg-white/5'}`} title="Perfil da Empresa"><Settings size={16} /></button>
          <button onClick={handleLogout} className="p-2 rounded-lg text-dim hover:text-red-400 transition-all"><LogOut size={16} /></button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[200] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <nav className="absolute left-0 top-0 bottom-0 w-64 glass-panel border-r flex flex-col py-6 px-4 gap-1" style={{ background: 'var(--sidebar)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-6 px-2">
              <Logo size="md" variant="footer" />
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg text-dim hover:text-white hover:bg-white/5"><X size={16} /></button>
            </div>
            {navItems.map(item => (
              <button key={item.id} onClick={() => { if (item.id === 'landing') setAuthState('landing'); else setCurrentView(item.id as any); setMobileMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-medium ${currentView === item.id && authState === 'app' ? 'bg-accent text-white shadow-lg' : 'text-dim hover:bg-white/5 hover:text-main'}`}>
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            ))}
            <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-1">
              <button onClick={() => { setCurrentView('profile'); setMobileMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-medium ${currentView === 'profile' ? 'bg-accent text-white' : 'text-dim hover:bg-white/5 hover:text-main'}`}><Settings size={18} /><span>Perfil</span></button>
              <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-dim hover:text-red-400 hover:bg-red-400/10 transition-all"><LogOut size={18} /><span>Sair</span></button>
            </div>
          </nav>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        <nav className="hidden md:flex flex-col w-20 items-center py-8 gap-6 border-r glass-panel" style={{ background: 'var(--sidebar)', borderColor: 'var(--border)' }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => { if (item.id === 'landing') setAuthState('landing'); else setCurrentView(item.id); }} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${currentView === item.id && authState === 'app' ? 'bg-accent text-white shadow-lg' : 'text-dim hover:bg-white/5'}`}><item.icon size={20} /></button>
          ))}
        </nav>

        <main className="flex-1 overflow-auto relative pb-16 md:pb-0">
          {currentView === 'dashboard' && (
            <div className="p-4 md:p-10 max-w-6xl mx-auto animate-fade-in flex flex-col gap-6 md:gap-8">
              <div className="flex justify-between items-center">
                <div><h2 className="text-xl md:text-3xl font-heading font-black text-main uppercase leading-tight">{context.name}</h2><p className="text-[10px] label-mono text-dim tracking-widest uppercase">Centro de Operações Ativo</p></div>
              </div>
              <div className="premium-card p-4 md:p-8 bg-gradient-to-br from-accent/10 to-transparent border-accent/20 overflow-hidden w-full">
                <div className="flex items-center gap-3 mb-6"><Activity size={14} className="text-accent animate-pulse" /><span className="label-mono text-[10px] font-black uppercase text-accent tracking-[0.3em]">Comando Global OS Core</span></div>

                {/* Global Message History */}
                <div ref={globalScrollRef} className="mb-6 max-h-[420px] overflow-y-auto overflow-x-hidden space-y-3 pr-2 scrollbar-hide">
                  {(Array.isArray(messages['global']) ? messages['global'] : []).map(m => {
                    const agentInfo = m.role === 'agent' ? getAgentInfo(m.senderId) : null;

                    // Relay message = agent working in real-time
                    if ((m as any).isRelay) {
                      // Handoff: conversation bubbles between agents
                      if ((m as any).isHandoff) {
                        const fromInfo = getAgentInfo(m.senderId);
                        const toInfo = getAgentInfo((m as any).handoffTo?.agentId || 'os-core');
                        const toMsg = (m as any).handoffTo?.message || '';
                        return (
                          <div key={m.id} className="space-y-1 animate-fade-in">
                            {m.text && (
                              <div className="flex gap-2 items-start">
                                <img src={fromInfo.avatar} alt={fromInfo.name} className="w-5 h-5 rounded-full shrink-0 mt-0.5 ring-1 ring-white/10" />
                                <div className="max-w-[88%] px-2.5 py-1.5 rounded-xl rounded-tl-none border-l-2 bg-white/[0.015] border border-white/[0.04]" style={{ borderLeftColor: fromInfo.color }}>
                                  <p className="text-[8px] font-black uppercase tracking-widest mb-0.5" style={{ color: fromInfo.color }}>{fromInfo.name}</p>
                                  <p className="text-[10px] text-dim/75 leading-relaxed line-clamp-2">{m.text}</p>
                                </div>
                              </div>
                            )}
                            {toMsg && (
                              <div className="flex gap-2 items-start ml-3">
                                <img src={toInfo.avatar} alt={toInfo.name} className="w-5 h-5 rounded-full shrink-0 mt-0.5 ring-1 ring-white/10" />
                                <div className="max-w-[88%] px-2.5 py-1.5 rounded-xl rounded-tl-none border-l-2 bg-white/[0.015] border border-white/[0.04]" style={{ borderLeftColor: toInfo.color }}>
                                  <p className="text-[8px] font-black uppercase tracking-widest mb-0.5" style={{ color: toInfo.color }}>{toInfo.name}</p>
                                  <p className="text-[10px] text-dim/75 leading-relaxed">{toMsg}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                      const cleaned = cleanRelayText(m.text);
                      if (!cleaned) return null;
                      return (
                        <div key={m.id} className="flex gap-2 items-start animate-fade-in min-w-0">
                          <img src={agentInfo?.avatar || ''} alt={agentInfo?.name || m.senderName} className="w-5 h-5 rounded-full shrink-0 mt-0.5 ring-1 ring-white/10 opacity-70" />
                          <div className="max-w-[90%] min-w-0 px-3 py-1.5 rounded-xl rounded-tl-none border-l-2 bg-white/[0.02] border border-white/[0.06] overflow-hidden break-words" style={{ borderLeftColor: agentInfo?.color || '#6366f1' }}>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-70" style={{ color: agentInfo?.color || '#6366f1' }}>{m.senderName}</p>
                            <div className="text-[11px] text-dim/80 leading-relaxed line-clamp-3 overflow-hidden">
                              {cleaned}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Final summary or user message
                    return (
                      <div key={m.id} className={`flex gap-2 min-w-0 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {agentInfo && <img src={agentInfo.avatar} alt={agentInfo.name} className="w-6 h-6 rounded-full shrink-0 mt-0.5 ring-1 ring-white/10" />}
                        <div className={`max-w-[88%] min-w-0 text-[11px] px-4 py-3 rounded-xl overflow-hidden break-words ${m.role === 'user' ? 'bg-accent/20 border border-accent/30 text-main rounded-tr-none' : 'bg-white/[0.05] border border-white/10 text-main rounded-tl-none'}`}>
                          {agentInfo && <p className="text-[9px] font-black uppercase tracking-widest mb-2 pb-1.5 border-b border-white/[0.06]" style={{ color: agentInfo.color }}>{agentInfo.name}</p>}
                          <Markdown components={mdComponents}>{m.text}</Markdown>
                        </div>
                      </div>
                    );
                  })}
                  {isTyping && (
                    <div className="flex items-center gap-2 ml-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>

                {execution.plan.length > 0 && (!execution.areaId || execution.areaId === 'global') && <AgentInteractionBlock execution={execution} isLive={isTyping} onCancel={() => { setIsTyping(false); setExecution({ plan: [], agentStatus: {}, agentActions: {}, activeAgent: null, done: false }); clearActiveJobId(); }} />}
                <ChatInput onSendMessage={(text: string, _: any, att: any) => sendMessage(text, 'global', att)} isListening={isListening} toggleVoice={toggleVoiceCommand} voiceTranscript={voiceInput} placeholder="Dê uma ordem para sua empresa..." showGlobe />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {AREAS.map(area => (
                  <motion.div
                    key={area.id}
                    onClick={() => area.unlocked && selectArea(area)}
                    whileHover={area.unlocked ? { y: -5 } : {}}
                    className={`premium-card p-4 md:p-6 relative overflow-hidden ${area.unlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-50 grayscale'}`}
                  >
                    {!area.unlocked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] z-10 gap-2">
                        <Lock size={22} className="text-white/60" />
                        <span className="text-[9px] label-mono text-white/40 uppercase tracking-widest">Em breve</span>
                      </div>
                    )}
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6" style={{ background: `${area.color}15`, border: `1px solid ${area.color}30` }}>{React.createElement(IconMap[area.icon] || Terminal, { size: 22, style: { color: area.color } })}</div>
                    <h3 className="font-heading font-black text-lg text-main uppercase mb-2">{area.name}</h3>
                    <p className="text-xs text-dim line-clamp-2">{area.description}</p>
                    <p className="text-[9px] label-mono opacity-40 mt-3">{area.agents.length} especialistas</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {currentView === 'projects' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              {selectedProject ? (
                <div style={{ position: 'absolute', inset: 0, zIndex: 10, overflow: 'hidden' }}>
                <ProjectExplorer
                  project={selectedProject}
                  onBack={() => setSelectedProject(null)}
                  onDelete={deleteProject}
                  externalFiles={artifacts.filter((a: any) => a.projectId === selectedProject.id)}
                  onSendToAgents={(msg) => {
                    const techArea = AREAS.find(a => a.id === 'tech');
                    if (techArea) selectArea(techArea);
                    setTimeout(() => sendMessage(msg, 'tech'), 300);
                  }}
                />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="max-w-5xl mx-auto">
                    <div className="mb-6">
                      <h2 className="text-xl font-black text-main">Projetos Gerados</h2>
                      <p className="text-[11px] text-dim mt-1">Sistemas completos criados pelos agentes com múltiplos arquivos</p>
                    </div>
                    {projects.length === 0 ? (
                      <div className="text-center py-20">
                        <FolderGit2 size={48} className="text-dim/20 mx-auto mb-4" />
                        <p className="text-sm text-dim mb-2">Nenhum projeto ainda</p>
                        <p className="text-[11px] text-dim/60">Peça aos agentes para criarem um sistema completo na aba Tecnologia</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map(project => {
                          const projectFiles = artifacts.filter(a => (a as any).projectId === project.id);
                          const typeColor: Record<string, string> = { web: '#f97316', react: '#06b6d4', fullstack: '#a855f7', api: '#22c55e' };
                          return (
                            <motion.div
                              key={project.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              onClick={() => setSelectedProject(project)}
                              className="glass-panel rounded-2xl p-5 cursor-pointer hover:border-accent/30 transition-all hover:-translate-y-0.5"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="p-2 rounded-lg" style={{ background: `${typeColor[project.type] || '#3b82f6'}15` }}>
                                  <FolderGit2 size={18} style={{ color: typeColor[project.type] || '#3b82f6' }} />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] label-mono font-black uppercase px-2 py-0.5 rounded-full border" style={{ color: typeColor[project.type] || '#3b82f6', borderColor: `${typeColor[project.type] || '#3b82f6'}30` }}>
                                    {project.type}
                                  </span>
                                  <button
                                    onClick={e => { e.stopPropagation(); deleteProject(project.id); }}
                                    className="p-1 rounded text-dim hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                    title="Excluir projeto"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                              <h3 className="font-black text-sm text-main mb-1 truncate">{project.name}</h3>
                              <p className="text-[10px] text-dim line-clamp-2 mb-3">{project.description}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] label-mono text-dim">{project.stack}</span>
                                <span className="text-[9px] label-mono text-accent">{projectFiles.length} arquivos</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentView === 'hierarchy' && (
            <div className="p-10 h-full">
              <div className="mb-10 text-center">
                <h2 className="text-3xl font-heading font-black text-main uppercase tracking-tighter">Organograma Neural</h2>
                <p className="text-[10px] label-mono opacity-40 uppercase tracking-[0.3em] mt-2">Visão Estrutural da Operação</p>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 overflow-auto h-[calc(100%-100px)]">
                <AgentHierarchy />
              </div>
            </div>
          )}

          {currentView === 'credits' && (
            <div className="p-10 max-w-4xl mx-auto animate-fade-in">
              <div className="mb-12">
                <h2 className="text-4xl font-heading font-black text-main uppercase tracking-tighter mb-2">Billing & Créditos</h2>
                <p className="text-[10px] label-mono opacity-40 uppercase tracking-[0.3em]">Recursos de Processamento Neural</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="premium-card p-8 bg-gradient-to-br from-accent/5 to-transparent">
                  <div className="flex items-center gap-3 mb-6"><CreditCard size={16} className="text-accent" /><span className="label-mono text-[10px] font-black uppercase text-accent tracking-widest">Saldo Atual</span></div>
                  <div className="text-5xl font-heading font-black text-main mb-2">{context.credits.toLocaleString()}</div>
                  <p className="text-[10px] label-mono opacity-40 uppercase">Unidades de Crédito</p>
                </div>

                <div className="premium-card p-8 border-accent/20">
                  <div className="flex items-center gap-3 mb-6"><Zap size={16} className="text-accent" /><span className="label-mono text-[10px] font-black uppercase text-accent tracking-widest">Plano Atual</span></div>
                  <div className="text-3xl font-heading font-black text-main mb-2 uppercase tracking-tighter">{context.plan}</div>
                  <p className="text-[10px] label-mono opacity-40 uppercase">{PLAN_LIMITS[context.plan]?.label || 'Starter'}</p>
                </div>
              </div>

              <div className="premium-card p-8">
                <h3 className="font-heading font-black text-xl text-main uppercase mb-8 tracking-tighter">Upgrade Operacional</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(PLAN_LIMITS).map(([id, plan]: any) => (
                    <div key={id} className={`p-6 rounded-2xl border transition-all ${context.plan === id ? 'bg-accent/10 border-accent' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] label-mono font-black uppercase" style={{ color: plan.color }}>{plan.label}</span>
                        {context.plan === id && <CheckCircle2 size={14} className="text-accent" />}
                      </div>
                      <div className="text-2xl font-black text-main mb-1">{plan.credits.toLocaleString()} <span className="text-[10px] opacity-40">CR</span></div>
                      <button className="w-full mt-6 py-3 rounded-xl bg-white text-black font-black text-[9px] uppercase tracking-widest hover:bg-accent hover:text-white transition-all">Selecionar</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentView === 'profile' && (
            <div className="p-10 max-w-2xl mx-auto animate-fade-in">
              <div className="mb-8">
                <h2 className="text-4xl font-heading font-black text-main uppercase tracking-tighter mb-2">Perfil da Empresa</h2>
                <p className="text-[10px] label-mono opacity-40 uppercase tracking-[0.3em]">Configuração Neural da Empresa</p>
              </div>
              <form onSubmit={handleOnboarding} className="space-y-5">
                <p className="text-[9px] label-mono text-accent/60 uppercase tracking-[0.25em] font-black pt-1">01 · Identidade da Empresa</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">Nome da Empresa *</label><input name="companyName" required className="w-full px-4 py-3 rounded-lg border bg-black/20 text-main focus:border-accent outline-none text-sm" defaultValue={context.name} /></div>
                  <div><label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">Setor / Indústria *</label><input name="industry" required className="w-full px-4 py-3 rounded-lg border bg-black/20 text-main focus:border-accent outline-none text-sm" defaultValue={context.industry || ''} /></div>
                </div>
                <div><label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">O que sua empresa faz? *</label><textarea name="description" required className="w-full px-4 py-3 rounded-lg border bg-black/20 text-main focus:border-accent outline-none h-20 resize-none text-sm" defaultValue={context.description || ''} /></div>

                <p className="text-[9px] label-mono text-accent/60 uppercase tracking-[0.25em] font-black pt-2">02 · Identidade Visual</p>
                <div>
                  <label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">Logo da Empresa</label>
                  <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border bg-black/20 cursor-pointer hover:border-accent/50 transition-all text-sm"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {(logoFile || context.logoUrl) ? (
                      <>
                        <img src={logoFile || context.logoUrl || ''} alt="Logo" className="h-8 w-auto object-contain rounded" />
                        <span className="text-dim text-xs">Clique para trocar</span>
                      </>
                    ) : (
                      <>
                        <Upload size={16} className="text-dim shrink-0" />
                        <span className="text-dim text-xs">Clique para enviar sua logo (PNG, JPG, SVG)</span>
                      </>
                    )}
                  </div>
                  <p className="text-[9px] text-dim mt-1 opacity-60">Usada pelos agentes ao criar landing pages e materiais da sua marca.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">Cores da Marca</label><input name="brandColors" placeholder="Ex: #1A1A2E, #E94560" className="w-full px-4 py-3 rounded-lg border bg-black/20 text-main focus:border-accent outline-none text-sm" defaultValue={context.brandColors || ''} /></div>
                  <div><label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">Tom de Voz</label>
                    <select name="brandTone" className="w-full px-4 py-3 rounded-lg border bg-black/20 text-main focus:border-accent outline-none text-sm" defaultValue={context.brandTone || ''}>
                      <option value="">Selecione</option>
                      <option value="profissional e formal">Profissional e Formal</option>
                      <option value="moderno e direto">Moderno e Direto</option>
                      <option value="descontraído e próximo">Descontraído e Próximo</option>
                      <option value="técnico e especialista">Técnico e Especialista</option>
                      <option value="inspirador e motivacional">Inspirador e Motivacional</option>
                      <option value="bold e disruptivo">Bold e Disruptivo</option>
                    </select>
                  </div>
                </div>

                <p className="text-[9px] label-mono text-accent/60 uppercase tracking-[0.25em] font-black pt-2">03 · Estratégia e Contexto</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">Site (URL)</label><input name="websiteUrl" placeholder="https://..." className="w-full px-4 py-3 rounded-lg border bg-black/20 text-main focus:border-accent outline-none text-sm" defaultValue={context.websiteUrl || ''} /><p className="text-[9px] opacity-50 mt-1">Os agentes vão analisar este site para extrair logo e cores.</p></div>
                  <div><label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">Objetivo Principal *</label>
                    <select name="goals" required className="w-full px-4 py-3 rounded-lg border bg-black/20 text-main focus:border-accent outline-none text-sm" defaultValue={context.goals || ''}>
                      <option value="">Selecione</option>
                      <option value="Vender mais e aumentar receita">Vender Mais</option>
                      <option value="Escalar operação e processos">Escalar Operação</option>
                      <option value="Automatizar processos internos">Automatizar Processos</option>
                      <option value="Aumentar reconhecimento de marca">Reconhecimento de Marca</option>
                      <option value="Lançar novo produto ou serviço">Lançar Produto/Serviço</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">Público-Alvo</label><input name="targetAudience" placeholder="Ex: PMEs, CEOs..." className="w-full px-4 py-3 rounded-lg border bg-black/20 text-main focus:border-accent outline-none text-sm" defaultValue={context.targetAudience || ''} /></div>
                  <div><label className="label-mono block mb-1.5 text-[10px] uppercase opacity-60 font-bold">Maiores Desafios</label><input name="challenges" placeholder="Ex: Geração de leads..." className="w-full px-4 py-3 rounded-lg border bg-black/20 text-main focus:border-accent outline-none text-sm" defaultValue={context.challenges || ''} /></div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 py-4 rounded-xl font-black text-white text-xs uppercase bg-accent shadow-xl shadow-accent/20 hover:scale-[1.01] transition-all">Salvar Alterações</button>
                  <button type="button" onClick={() => setCurrentView('dashboard')} className="px-6 py-4 rounded-xl font-black text-xs uppercase border border-white/10 text-dim hover:text-white hover:border-white/30 transition-all">Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {currentView === 'chat' && selectedArea && (
            <div className="flex flex-col h-full bg-[#050505]">
              <div className="flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 border-b border-white/5 bg-white/[0.01]">
                <button onClick={() => setCurrentView('dashboard')} className="p-1 text-dim hover:text-white transition-all shrink-0"><ArrowLeft size={18} /></button>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${selectedArea.color}20` }}>{React.createElement(IconMap[selectedArea.icon] || Terminal, { size: 16, style: { color: selectedArea.color } })}</div>
                <div className="min-w-0"><h3 className="font-bold text-sm text-main uppercase truncate">{selectedArea.name}</h3><p className="text-[10px] label-mono text-dim">Unidade Operacional</p></div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-auto p-3 md:p-6 space-y-4">
                {(Array.isArray(messages[selectedArea.id]) ? messages[selectedArea.id] : []).map(m => {
                  const agentInfo = m.role === 'agent' ? getAgentInfo(m.senderId) : null;

                  // Relay messages = agent working in real-time (compact, internal style)
                  if ((m as any).isRelay) {
                    // Handoff: two real conversation bubbles between agents
                    if ((m as any).isHandoff) {
                      const fromInfo = getAgentInfo(m.senderId);
                      const toInfo = getAgentInfo((m as any).handoffTo?.agentId || 'os-core');
                      const toMsg = (m as any).handoffTo?.message || '';
                      return (
                        <div key={m.id} className="space-y-1.5 animate-fade-in">
                          {m.text && (
                            <div className="flex gap-2 items-start">
                              <img src={fromInfo.avatar} alt={fromInfo.name} className="w-6 h-6 rounded-full shrink-0 mt-0.5 ring-1 ring-white/10" />
                              <div className="max-w-[80%] px-3 py-2 rounded-xl rounded-tl-none border-l-2 bg-white/[0.02] border border-white/5" style={{ borderLeftColor: fromInfo.color }}>
                                <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: fromInfo.color }}>{fromInfo.name}</p>
                                <p className="text-[11px] text-dim/80 leading-relaxed">{m.text}</p>
                              </div>
                            </div>
                          )}
                          {toMsg && (
                            <div className="flex gap-2 items-start ml-4">
                              <img src={toInfo.avatar} alt={toInfo.name} className="w-6 h-6 rounded-full shrink-0 mt-0.5 ring-1 ring-white/10" />
                              <div className="max-w-[80%] px-3 py-2 rounded-xl rounded-tl-none border-l-2 bg-white/[0.02] border border-white/5" style={{ borderLeftColor: toInfo.color }}>
                                <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: toInfo.color }}>{toInfo.name}</p>
                                <p className="text-[11px] text-dim/80 leading-relaxed">{toMsg}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                    const cleaned = cleanRelayText(m.text);
                    if (!cleaned) return null;
                    return (
                      <div key={m.id} className="flex gap-2 items-start animate-fade-in">
                        <img src={agentInfo?.avatar || '/placeholder.png'} alt={agentInfo?.name || m.senderName} className="w-6 h-6 rounded-full shrink-0 mt-0.5 ring-1 ring-white/10 opacity-80" />
                        <div className="max-w-[85%] px-3 py-2 rounded-xl rounded-tl-none border-l-2 bg-white/[0.03] border border-white/[0.07]" style={{ borderLeftColor: agentInfo?.color || '#6366f1' }}>
                          <p className="text-[9px] font-black uppercase tracking-widest mb-1.5 opacity-80" style={{ color: agentInfo?.color || '#6366f1' }}>{m.senderName}</p>
                          <div className="text-[11px] text-dim/90 leading-relaxed">
                            <Markdown components={mdComponents}>{cleaned}</Markdown>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {/* Avatar do agente (lado esquerdo) */}
                      {agentInfo && (
                        <img src={agentInfo.avatar} alt={agentInfo.name} className="w-8 h-8 rounded-full shrink-0 mt-1 ring-1 ring-white/10" />
                      )}
                      <div className="flex flex-col max-w-[82%]">
                        {(m as any).executionSnapshot && <AgentInteractionBlock execution={(m as any).executionSnapshot} isLive={false} />}
                        <div className={`text-[12px] leading-relaxed ${m.role === 'user' ? 'bg-accent text-white px-5 py-3 rounded-2xl rounded-tr-none shadow-xl' : 'bg-white/[0.04] border border-white/[0.08] text-main px-5 py-4 rounded-2xl rounded-tl-none'}`}>
                          {agentInfo && (
                            <p className="text-[9px] font-black mb-2 pb-2 border-b border-white/[0.08] uppercase tracking-widest" style={{ color: agentInfo.color }}>{agentInfo.name}</p>
                          )}
                          {m.attachment && m.attachment.type.startsWith('image/') && (
                            <div className="mb-3 rounded-lg overflow-hidden border border-white/10">
                              <img src={`data:${m.attachment.type};base64,${m.attachment.data}`} alt={m.attachment.name} className="max-w-full h-auto" />
                            </div>
                          )}
                          {m.attachment && !m.attachment.type.startsWith('image/') && (
                            <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                              <Paperclip size={14} className="text-accent" />
                              <span className="text-[10px] font-bold truncate">{m.attachment.name}</span>
                            </div>
                          )}
                          <Markdown components={mdComponents}>{m.text}</Markdown>
                          {m.artifactId && <button onClick={() => { const a = artifacts.find(x => x.id === m.artifactId); if (a) { setCurrentArtifact(a); setCurrentView('artifacts'); } }} className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-[10px] font-black hover:bg-accent/20 transition-all"><FileCode size={12} /> Ver Entrega</button>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {execution.plan.length > 0 && (!execution.areaId || execution.areaId === selectedArea.id) && <AgentInteractionBlock execution={execution} isLive={isTyping} onCancel={() => { setIsTyping(false); setExecution({ plan: [], agentStatus: {}, agentActions: {}, activeAgent: null, done: false }); clearActiveJobId(); }} />}
                {isTyping && (!execution.areaId || execution.areaId === selectedArea.id) && !execution.plan.length && (
                  <div className="flex gap-3 items-center">
                    <img src={getAgentInfo(selectedArea.agents[0]?.id || 'os-core').avatar} className="w-8 h-8 rounded-full ring-1 ring-white/10" alt="agent" />
                    <div className="flex items-center gap-1.5 px-4 py-3 bg-white/[0.03] border border-white/5 rounded-2xl rounded-tl-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                {isPollingResults && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20 text-amber-400/80"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <p className="text-[10px] label-mono">Sincronizando resultados da sessão anterior...</p>
                  </motion.div>
                )}
              </div>
              <ChatInput onSendMessage={sendMessage} isListening={isListening} toggleVoice={toggleVoiceCommand} voiceTranscript={voiceInput} />
            </div>
          )}

          {currentView === 'kanban' && (
            <div className="p-3 md:p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4 md:mb-6 gap-2 flex-wrap">
                <div>
                  <h2 className="text-lg md:text-xl font-heading font-black text-main uppercase tracking-tighter">Fluxo de Missão</h2>
                  <p className="text-[10px] label-mono opacity-40 uppercase">Gerenciamento Neural de Tarefas</p>
                </div>
                <div className="flex gap-2 md:gap-3">
                  {tasks.some(t => t.status !== 'DONE') && (
                    <button onClick={resolveStuckTasks} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-400/10 transition-all border border-emerald-400/20">
                      <CheckCircle2 size={14} /> Resolver Travadas
                    </button>
                  )}
                  <button onClick={clearAllTasks} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-dim hover:text-red-400 hover:bg-red-400/10 transition-all border border-white/5">
                    <Trash2 size={14} /> Limpeza Neural
                  </button>
                  <button onClick={() => setShowTaskModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-accent shadow-lg shadow-accent/20">
                    <Plus size={16} /> Nova Ação
                  </button>
                </div>
              </div>
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-4 overflow-x-auto pb-6 flex-1 scrollbar-hide">
                  {KANBAN_COLUMNS.map(col => (
                    <Droppable key={col.id} droppableId={col.id}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="min-w-[300px] w-[300px] flex flex-col rounded-3xl p-4 bg-white/[0.02] border border-white/5">
                          <div className="flex items-center gap-2 mb-4 px-2">
                            <div className="w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]" style={{ background: col.color, color: col.color }} />
                            <span className="text-[10px] font-black uppercase label-mono opacity-60 text-main">{col.label}</span>
                            <span className="ml-auto text-[9px] label-mono opacity-40">{tasks.filter(t => t.status === col.id).length}</span>
                          </div>
                          <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide min-h-[100px]">
                            {tasks.filter(t => t.status === col.id).map((task, i) => {
                              const agent = getAgentInfo(task.assigneeId);
                              const isRunning = ['UX_DESIGN', 'DEV', 'REVIEW', 'QA'].includes(task.status);
                              const isDone = task.status === 'DONE';
                              return (
                                <Draggable key={task.id} draggableId={task.id} index={i}>
                                  {(prov) => (
                                    <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                                      className={`premium-card p-4 transition-all group relative overflow-hidden ${isRunning ? 'border-accent/30' : 'hover:border-accent/20'}`}>

                                      {/* Barra de execução animada no topo */}
                                      {isRunning && (
                                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent/0 via-accent to-accent/0 animate-pulse" />
                                      )}

                                      {/* Header: status badge + delete */}
                                      <div className="flex items-center justify-between mb-2.5">
                                        {isRunning ? (
                                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20">
                                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                            <span className="text-[8px] font-black text-accent uppercase tracking-wider">Em execução</span>
                                          </div>
                                        ) : isDone ? (
                                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                            <CheckCircle2 size={9} className="text-emerald-400" />
                                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-wider">Concluído</span>
                                          </div>
                                        ) : (
                                          <div className="w-1 h-1 rounded-full bg-white/20" />
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                          className="p-1 rounded-lg text-dim hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all">
                                          <Trash2 size={12} />
                                        </button>
                                      </div>

                                      {/* Título e descrição */}
                                      <p className={`text-xs font-bold mb-1.5 transition-colors leading-snug ${isRunning ? 'text-accent' : 'text-main group-hover:text-accent'}`}>
                                        {task.title}
                                      </p>
                                      {task.description && (
                                        <p className="text-[10px] text-dim line-clamp-2 mb-3">{task.description}</p>
                                      )}

                                      {/* Footer: avatar + nome do agente */}
                                      <div className="flex items-center gap-2 pt-2.5 border-t border-white/5">
                                        <img src={agent.avatar} alt={agent.name} className="w-5 h-5 rounded-full ring-1 ring-white/10" />
                                        <span className="text-[9px] font-semibold text-dim">{agent.name}</span>
                                        <span className="text-[8px] text-dim/50 truncate flex-1">{task.assigneeId}</span>
                                        {task.status !== 'DONE' && (task as any).createdAt && (Date.now() - (task as any).createdAt) > 3600000 && (
                                          <span className="text-[8px] text-amber-400/70 label-mono shrink-0">stale</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        </div>
                      )}
                    </Droppable>
                  ))}
                </div>
              </DragDropContext>
            </div>
          )}

          {currentView === 'logs' && (
            <div className="p-10 max-w-5xl mx-auto animate-fade-in">
              <div className="mb-8">
                <h2 className="text-4xl font-heading font-black text-main uppercase tracking-tighter mb-2">Logs de Execução</h2>
                <p className="text-[10px] label-mono opacity-40 uppercase tracking-[0.3em]">Histórico de Ações dos Agentes</p>
              </div>
              {agentLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                  <Activity size={48} className="mb-4 text-dim" />
                  <p className="text-sm font-black uppercase text-dim">Nenhum log ainda</p>
                  <p className="text-[11px] text-dim/60 mt-1">Os logs aparecem após os agentes executarem tarefas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {agentLogs.map(log => {
                    const fromAgent = getAgentInfo(log.fromAgent);
                    const statusColor = log.status === 'completed' ? '#22c55e' : log.status === 'error' ? '#ef4444' : log.status === 'started' ? '#f59e0b' : '#6366f1';
                    return (
                      <div key={log.id} className="premium-card p-4 flex items-start gap-4">
                        <img src={fromAgent.avatar} alt={fromAgent.name} className="w-8 h-8 rounded-full shrink-0 ring-1 ring-white/10 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: fromAgent.color }}>{fromAgent.name}</span>
                            <span className="text-[9px] label-mono opacity-40">→</span>
                            <span className="text-[10px] label-mono text-dim opacity-60">{log.toAgent}</span>
                            <span className="ml-auto text-[8px] label-mono px-2 py-0.5 rounded-full border" style={{ color: statusColor, borderColor: `${statusColor}40` }}>{log.status}</span>
                          </div>
                          <p className="text-[10px] label-mono text-accent/70 uppercase tracking-widest mb-1">{log.eventType}</p>
                          {log.payload && <p className="text-[11px] text-dim line-clamp-2">{log.payload}</p>}
                        </div>
                        <span className="text-[9px] label-mono text-dim/40 shrink-0">{new Date(log.createdAt).toLocaleTimeString('pt-BR')}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {currentView === 'artifacts' && (
            <div className="flex h-full bg-[#050505]">
              <div className="w-72 border-r border-white/5 overflow-auto p-4 space-y-2">
                <div className="mb-6">
                  <h3 className="text-[10px] font-black uppercase opacity-40 label-mono tracking-[0.3em]">Biblioteca de Artefatos</h3>
                  <p className="text-[9px] text-dim/40 mt-1">LPs, snippets e docs avulsos. Sistemas completos ficam em <button onClick={() => setCurrentView('projects')} className="text-accent/60 underline">Projetos</button>.</p>
                </div>
                {artifacts.filter(a => !(a as any).projectId).map(a => (
                  <button key={a.id} onClick={() => { setCurrentArtifact(a); setArtifactViewMode(a.type === 'web' ? 'preview' : 'code'); }} className={`block w-full text-left px-4 py-3 rounded-xl text-xs transition-all border ${currentArtifact?.id === a.id ? 'bg-accent/10 border-accent/30 text-accent shadow-lg shadow-accent/5' : 'bg-white/[0.02] border-white/5 text-dim hover:bg-white/[0.05]'}`}>
                    <span className="font-bold block truncate uppercase tracking-tighter">{a.title}</span>
                    <span className="label-mono text-[8px] opacity-40 uppercase">{a.type}</span>
                  </button>
                ))}
              </div>
              <div className="flex-1 flex flex-col relative">
                {currentArtifact ? (
                  <>
                    <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-white/[0.01]">
                      <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><FileCode size={20} className="text-accent" /></div><div><span className="text-sm font-black text-main uppercase tracking-widest">{currentArtifact.title}</span><p className="text-[10px] label-mono opacity-40 uppercase">Código Fonte</p></div></div>
                      <div className="flex gap-2">
                        {currentArtifact.type === 'web' && <button onClick={() => setIsFullscreenArtifact(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all text-main"><Eye size={14} /> Foco Total</button>}
                        <div className="p-1 bg-white/[0.03] rounded-full border border-white/5 flex gap-1">{(['code', 'preview'] as const).map(m => <button key={m} onClick={() => setArtifactViewMode(m)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase transition-all ${artifactViewMode === m ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-dim'}`}>{m === 'code' ? 'Code' : 'Live'}</button>)}</div>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto bg-[#020202]">{artifactViewMode === 'preview' && currentArtifact.type === 'web' ? <iframe srcDoc={currentArtifact.code} className="w-full h-full border-0 bg-white" sandbox="allow-scripts" /> : <pre className="p-8 text-xs font-mono text-accent leading-relaxed bg-[#050505] h-full overflow-auto"><code>{currentArtifact.code}</code></pre>}</div>
                  </>
                ) : <div className="flex-1 flex flex-col items-center justify-center opacity-10 uppercase tracking-[0.5em] font-black"><Search size={64} className="mb-6" />Selecione uma entrega</div>}
              </div>
            </div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {isFullscreenArtifact && currentArtifact && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-black">
            <div className="absolute top-6 right-6 z-10 flex gap-3">
              <button onClick={async () => {
                setPublishState({ loading: false, publicUrl: null, customDomain: null, domainInput: '' });
                try {
                  const d = await fetch('/api/publish').then(r => r.json());
                  if (d.publicUrl) setPublishState({ loading: false, publicUrl: d.publicUrl, customDomain: d.customDomain, domainInput: d.customDomain || '' });
                } catch {}
                setShowDomainModal(true);
              }} className="px-6 py-2.5 bg-accent text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl">Publicar Site</button>
              <button onClick={() => setIsFullscreenArtifact(false)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-xl border border-white/10 transition-all"><X size={20} /></button>
            </div>
            <iframe srcDoc={currentArtifact.code} className="w-full h-full border-0 bg-white" sandbox="allow-scripts" />
          </motion.div>
        )}
      </AnimatePresence>

      {showDomainModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 backdrop-blur-2xl px-6" onClick={() => { setShowDomainModal(false); }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel p-10 rounded-[2.5rem] max-w-xl w-full text-center border-accent/20" onClick={e => e.stopPropagation()}>
            {publishState.publicUrl ? (
              <>
                <CheckCircle2 size={52} className="mx-auto text-emerald-400 mb-6" />
                <h3 className="text-2xl font-heading font-black mb-3 uppercase tracking-tighter text-main">Site Publicado!</h3>
                <p className="text-dim text-sm mb-8 leading-relaxed">Seu site está no ar e acessível publicamente.</p>

                <div className="bg-white/[0.03] p-5 rounded-2xl text-left border border-white/10 mb-6">
                  <p className="text-[9px] label-mono text-accent/50 uppercase tracking-widest mb-2 font-black">URL Pública</p>
                  <div className="flex items-center gap-3">
                    <a href={publishState.publicUrl} target="_blank" rel="noreferrer" className="flex-1 text-accent font-mono text-sm truncate hover:underline">{publishState.publicUrl}</a>
                    <button onClick={() => navigator.clipboard.writeText(publishState.publicUrl!)} className="px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-[10px] font-black uppercase hover:bg-accent/20 transition-colors">Copiar</button>
                  </div>
                </div>

                {publishState.customDomain && (
                  <div className="bg-white/[0.03] p-5 rounded-2xl text-left border border-white/10 mb-6">
                    <p className="text-[9px] label-mono text-accent/50 uppercase tracking-widest mb-3 font-black">Configure seu DNS</p>
                    <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
                      <div className="bg-black/40 p-3 rounded-xl border border-white/5"><p className="text-dim mb-1">Tipo</p><p className="text-white font-black">CNAME</p></div>
                      <div className="bg-black/40 p-3 rounded-xl border border-white/5"><p className="text-dim mb-1">Nome</p><p className="text-white font-black">{publishState.customDomain.startsWith('www') ? 'www' : '@'}</p></div>
                      <div className="bg-black/40 p-3 rounded-xl border border-white/5 overflow-hidden"><p className="text-dim mb-1">Destino</p><p className="text-accent font-black truncate">{window.location.hostname}</p></div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => { setPublishState(p => ({ ...p, publicUrl: null })); }} className="flex-1 py-3 rounded-2xl border border-white/10 text-dim text-[11px] font-black uppercase hover:border-white/20 transition-all">Alterar</button>
                  <button onClick={() => setShowDomainModal(false)} className="flex-1 py-3 bg-accent text-white font-black uppercase text-[11px] tracking-widest rounded-2xl hover:bg-accent/90 transition-all">Concluir</button>
                </div>
              </>
            ) : (
              <>
                <Globe size={48} className="mx-auto text-accent mb-6 animate-pulse" />
                <h3 className="text-2xl font-heading font-black mb-3 uppercase tracking-tighter text-main">Publicar Site</h3>
                <p className="text-dim text-sm mb-8 leading-relaxed">Gere uma URL pública para este artefato. Opcionalmente conecte seu domínio próprio.</p>

                <div className="flex flex-col gap-3 mb-6">
                  <input
                    value={publishState.domainInput}
                    onChange={e => setPublishState(p => ({ ...p, domainInput: e.target.value }))}
                    placeholder="www.seu-dominio.com (opcional)"
                    className="w-full px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/10 text-sm focus:border-accent outline-none text-main text-center font-mono tracking-wider"
                  />
                  <button
                    disabled={publishState.loading}
                    onClick={async () => {
                      if (!currentArtifact) return;
                      setPublishState(p => ({ ...p, loading: true }));
                      try {
                        const r = await fetch('/api/publish', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ artifactId: currentArtifact.id, customDomain: publishState.domainInput }),
                        });
                        const d = await r.json();
                        if (d.success) setPublishState(p => ({ ...p, loading: false, publicUrl: d.publicUrl, customDomain: d.customDomain }));
                      } catch { setPublishState(p => ({ ...p, loading: false })); }
                    }}
                    className="w-full py-4 bg-accent text-white font-black uppercase text-[11px] tracking-[0.3em] rounded-2xl hover:bg-accent/90 disabled:opacity-50 transition-all shadow-2xl"
                  >
                    {publishState.loading ? 'Publicando...' : 'Publicar Agora'}
                  </button>
                </div>
                <button onClick={() => setShowDomainModal(false)} className="text-[10px] text-dim/50 label-mono uppercase hover:text-dim transition-colors">Cancelar</button>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[150] flex items-center justify-around h-16 border-t glass-panel" style={{ background: 'var(--sidebar)', borderColor: 'var(--border)' }}>
        {[navItems[0], navItems[2], navItems[3]].map(item => (
          <button key={item.id} onClick={() => setCurrentView(item.id as any)} className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${currentView === item.id && authState === 'app' ? 'text-accent' : 'text-dim'}`}>
            <item.icon size={22} />
            <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
        <button onClick={() => setMobileMenuOpen(true)} className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${mobileMenuOpen ? 'text-accent' : 'text-dim'}`}>
          <Menu size={22} />
          <span className="text-[9px] font-black uppercase tracking-wider">Menu</span>
        </button>
      </nav>

      {showTaskModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm px-6" onClick={() => setShowTaskModal(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel rounded-3xl p-8 w-full max-w-md border-white/5" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black mb-6 uppercase label-mono text-main tracking-[0.2em]">Nova Diretriz Operacional</h3>
            <form onSubmit={e => { e.preventDefault(); const f = e.target as any; createNewTask(f.title.value, f.desc.value); setShowTaskModal(false); }} className="space-y-4 text-main">
              <div><label className="text-[9px] label-mono uppercase opacity-40 mb-1.5 block font-bold">Título da Ação</label><input name="title" required placeholder="Ex: Campanha Q4" className="w-full px-4 py-3 rounded-xl text-sm border bg-black/40 focus:border-accent outline-none" style={{ borderColor: 'var(--border)' }} /></div>
              <div><label className="text-[9px] label-mono uppercase opacity-40 mb-1.5 block font-bold">Instruções</label><textarea name="desc" placeholder="Descreva os parâmetros..." className="w-full px-4 py-3 rounded-xl text-sm border h-28 resize-none bg-black/40 focus:border-accent outline-none" style={{ borderColor: 'var(--border)' }} /></div>
              <button type="submit" className="w-full py-4 rounded-xl text-white text-xs font-black uppercase tracking-[0.3em] bg-accent shadow-xl shadow-accent/20 transition-all hover:scale-[1.02]">Lançar no Kanban</button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
