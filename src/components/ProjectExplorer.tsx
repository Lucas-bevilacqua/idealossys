import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderOpen, Folder, FileCode, FileText, Globe, Download,
  Eye, Code2, ChevronRight, ChevronDown, Trash2, ArrowLeft,
  Play, Package, Database, Server, Layout, AlertTriangle,
  Terminal, Wrench, X, ChevronUp, Info, Square, ExternalLink, Loader2
} from 'lucide-react';
import { Project, Artifact } from '../types';

interface PreviewLog {
  level: 'error' | 'warn' | 'log';
  message: string;
  time: string;
}

interface ProjectExplorerProps {
  project: Project;
  onBack: () => void;
  onDelete: (id: string) => void;
  onSendToAgents?: (message: string) => void;
  externalFiles?: Artifact[];
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  artifact?: Artifact;
}

function buildFileTree(files: Artifact[]): TreeNode[] {
  const root: TreeNode[] = [];
  const folderMap: Record<string, TreeNode> = {};

  const sortedFiles = [...files].sort((a, b) =>
    (a.filepath || a.title).localeCompare(b.filepath || b.title)
  );

  for (const file of sortedFiles) {
    const fp = file.filepath || file.title;
    const parts = fp.split('/');

    if (parts.length === 1) {
      root.push({ name: parts[0], path: fp, type: 'file', artifact: file });
      continue;
    }

    let currentLevel = root;
    let currentPath = '';

    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];

      if (!folderMap[currentPath]) {
        const folder: TreeNode = { name: parts[i], path: currentPath, type: 'folder', children: [] };
        folderMap[currentPath] = folder;
        currentLevel.push(folder);
      }
      currentLevel = folderMap[currentPath].children!;
    }

    currentLevel.push({
      name: parts[parts.length - 1],
      path: fp,
      type: 'file',
      artifact: file
    });
  }

  return root;
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['html', 'htm'].includes(ext || '')) return <Globe size={13} className="text-orange-400" />;
  if (['css', 'scss', 'sass'].includes(ext || '')) return <Layout size={13} className="text-blue-400" />;
  if (['js', 'jsx', 'ts', 'tsx'].includes(ext || '')) return <Code2 size={13} className="text-yellow-400" />;
  if (ext === 'sql') return <Database size={13} className="text-green-400" />;
  if (['json', 'env', 'yml', 'yaml'].includes(ext || '')) return <Package size={13} className="text-purple-400" />;
  if (ext === 'md') return <FileText size={13} className="text-gray-400" />;
  if (['sh', 'dockerfile'].includes(ext?.toLowerCase() || '') || filename.toLowerCase() === 'dockerfile') return <Server size={13} className="text-cyan-400" />;
  return <FileCode size={13} className="text-gray-400" />;
}

function TreeNodeItem({ node, depth, selectedPath, onSelect, expandedFolders, toggleFolder }: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (node: TreeNode) => void;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
}) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedPath === node.path;

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => toggleFolder(node.path)}
          className="flex items-center gap-1.5 w-full px-2 py-1 hover:bg-white/5 rounded text-left transition-colors"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          {isExpanded ? <ChevronDown size={11} className="text-dim shrink-0" /> : <ChevronRight size={11} className="text-dim shrink-0" />}
          {isExpanded ? <FolderOpen size={13} className="text-accent/70 shrink-0" /> : <Folder size={13} className="text-accent/50 shrink-0" />}
          <span className="text-[11px] text-main/80 truncate">{node.name}</span>
        </button>
        {isExpanded && node.children?.map(child => (
          <TreeNodeItem key={child.path} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} expandedFolders={expandedFolders} toggleFolder={toggleFolder} />
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node)}
      className={`flex items-center gap-1.5 w-full px-2 py-1 rounded text-left transition-colors ${isSelected ? 'bg-accent/15 text-accent' : 'hover:bg-white/5 text-main/70'}`}
      style={{ paddingLeft: `${8 + depth * 14}px` }}
    >
      <span className="shrink-0">{getFileIcon(node.name)}</span>
      <span className={`text-[11px] truncate ${isSelected ? 'text-accent font-semibold' : ''}`}>{node.name}</span>
    </button>
  );
}

export const ProjectExplorer: React.FC<ProjectExplorerProps> = ({ project, onBack, onDelete, onSendToAgents, externalFiles }) => {
  const [files, setFiles] = useState<Artifact[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [infra, setInfra] = useState<{ provisioned: boolean; tables: string[]; schemas: Record<string, { columns: { name: string; type: string }[]; row_count: number }> } | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'leads' | 'database'>('files');
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [previewLogs, setPreviewLogs] = useState<PreviewLog[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [deployStatus, setDeployStatus] = useState<{ running: boolean; deployedUrl: string | null; port: number | null }>({ running: false, deployedUrl: null, port: null });
  const [deploying, setDeploying] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [savedDomain, setSavedDomain] = useState('');
  const [domainOpen, setDomainOpen] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);

  // When externalFiles change (e.g. artifact updated by agent), sync them into local state
  useEffect(() => {
    if (!externalFiles) return;
    setFiles(prev => prev.map(f => {
      const updated = externalFiles.find(e => e.id === f.id);
      return updated ? { ...f, ...updated } : f;
    }));
    // Also update selectedNode if it's one of the updated files
    setSelectedNode(prev => {
      if (!prev?.artifact) return prev;
      const updated = externalFiles.find(e => e.id === prev.artifact!.id);
      return updated ? { ...prev, artifact: { ...prev.artifact, ...updated } } : prev;
    });
  }, [externalFiles]);

  useEffect(() => {
    fetch(`/api/projects/${project.id}/files`)
      .then(r => r.json())
      .then(data => {
        setFiles(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // Load deploy status
    fetch(`/api/projects/${project.id}/deploy/status`)
      .then(r => r.json())
      .then(s => setDeployStatus(s))
      .catch(() => {});
    // Load leads from project's own database API
    fetch(`/p/${project.id}/api/leads?limit=200`)
      .then(r => r.json())
      .then(data => setLeads(Array.isArray(data?.data) ? data.data : []))
      .catch(() => {});
    // Load saved custom domain
    fetch(`/api/projects/${project.id}/domain`)
      .then(r => r.json())
      .then(d => { if (d.custom_domain) { setSavedDomain(d.custom_domain); setCustomDomain(d.custom_domain); } })
      .catch(() => {});

    // Load infra info
    const loadInfra = () => {
      fetch(`/api/projects/${project.id}/infra`)
        .then(r => r.json())
        .then(data => setInfra(data))
        .catch(() => {});
    };
    loadInfra();

    // Listen for infrastructure_provisioned events from App.tsx
    const handleInfra = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.project_id === project.id) {
        setTimeout(loadInfra, 1000); // give backend 1s to finalize
      }
    };
    window.addEventListener('infra_provisioned', handleInfra);
    return () => window.removeEventListener('infra_provisioned', handleInfra);
  }, [project.id]);

  const handleDeploy = async () => {
    setDeploying(true);
    setLogsOpen(true);
    setPreviewLogs([{ level: 'log', message: 'Iniciando deploy...', time: new Date().toISOString() }]);
    try {
      const r = await fetch(`/api/projects/${project.id}/deploy`, { method: 'POST' });
      const data = await r.json();
      // Show server-side deploy logs in the console panel
      if (data.logs?.length) {
        setPreviewLogs(data.logs.map((l: string) => ({
          level: l.startsWith('[ERROR]') || l.startsWith('[FATAL]') ? 'error' : l.startsWith('[WARN]') ? 'warn' : 'log',
          message: l,
          time: new Date().toISOString(),
        })));
      }
      if (data.success) {
        setDeployStatus({ running: true, deployedUrl: data.deployedUrl, port: data.port });
        setPreviewLogs(prev => [...prev, { level: 'log', message: `✓ Deploy concluído! Porta: ${data.port}`, time: new Date().toISOString() }]);
      } else {
        setPreviewLogs(prev => [...prev, { level: 'error', message: 'DEPLOY FALHOU: ' + (data.error || 'Erro desconhecido'), time: new Date().toISOString() }]);
      }
    } catch (e: any) {
      setPreviewLogs([{ level: 'error', message: 'Failed to fetch — servidor IdealOS não respondeu: ' + e.message, time: new Date().toISOString() }]);
    } finally {
      setDeploying(false);
    }
  };

  const handleStopDeploy = async () => {
    try {
      await fetch(`/api/projects/${project.id}/deploy`, { method: 'DELETE' });
      setDeployStatus({ running: false, deployedUrl: null, port: null });
    } catch {}
  };

  const handleSaveDomain = async () => {
    setSavingDomain(true);
    try {
      const r = await fetch(`/api/projects/${project.id}/domain`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: customDomain }),
      });
      const d = await r.json();
      setSavedDomain(d.custom_domain || '');
    } catch {}
    setSavingDomain(false);
  };

  const tree = buildFileTree(files);

  // Build self-contained HTML for preview by inlining CSS and JS
  const previewHtml = useMemo(() => {
    const htmlFile = files.find(f => f.language === 'html' || (f.filepath || f.title).endsWith('.html'));
    if (!htmlFile) return null;
    let html = htmlFile.code || '';

    // Inline CSS: replace <link rel="stylesheet" href="X"> with <style>content</style>
    html = html.replace(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*\/?>/gi, (_match, href) => {
      const cssFile = files.find(f => {
        const fp = f.filepath || f.title;
        return fp === href || fp.endsWith('/' + href) || href.endsWith(fp);
      });
      return cssFile ? `<style>\n${cssFile.code}\n</style>` : '';
    });

    // Inline JS: replace <script src="X"></script> with <script>content</script>
    html = html.replace(/<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi, (_match, src) => {
      const jsFile = files.find(f => {
        const fp = f.filepath || f.title;
        return fp === src || fp.endsWith('/' + src) || src.endsWith(fp);
      });
      return jsFile ? `<script>\n${jsFile.code}\n</script>` : '';
    });

    // Inject console interceptor for log capture
    const interceptor = `<script>
(function(){const o=console.log,w=console.warn,e=console.error;
const s=function(l,m){window.parent.postMessage({type:'preview-log',level:l,message:String(m),time:new Date().toISOString()},'*')};
console.log=function(){o.apply(console,arguments);s('log',[...arguments].join(' '))};
console.warn=function(){w.apply(console,arguments);s('warn',[...arguments].join(' '))};
console.error=function(){e.apply(console,arguments);s('error',[...arguments].join(' '))};
window.addEventListener('error',function(ev){s('error',ev.message+' ('+ev.filename+':'+ev.lineno+')')});
})();
</script>`;

    return html.replace('<head>', '<head>' + interceptor);
  }, [files]);

  // Auto-expand all folders on load
  useEffect(() => {
    const folders = new Set<string>();
    const collectFolders = (nodes: TreeNode[]) => {
      nodes.forEach(n => {
        if (n.type === 'folder') {
          folders.add(n.path);
          if (n.children) collectFolders(n.children);
        }
      });
    };
    collectFolders(tree);
    setExpandedFolders(folders);
    // Auto-select first file
    const firstFile = files[0];
    if (firstFile && !selectedNode) {
      setSelectedNode({ name: firstFile.filepath || firstFile.title, path: firstFile.filepath || firstFile.title, type: 'file', artifact: firstFile });
    }
  }, [files]);

  // Listen for console messages from preview iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'preview-log') {
        const log: PreviewLog = { level: e.data.level, message: e.data.message, time: e.data.time };
        setPreviewLogs(prev => [...prev.slice(-49), log]);
        if (e.data.level === 'error') setLogsOpen(true);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Reset logs and collapse console when switching to preview
  useEffect(() => {
    if (viewMode === 'preview') { setPreviewLogs([]); setLogsOpen(false); }
  }, [viewMode]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  const handleSendErrorsToAgents = () => {
    if (!onSendToAgents) return;
    const errors = previewLogs.filter(l => l.level === 'error' || l.level === 'warn');
    const allLogs = previewLogs.slice(-30);
    const errorText = errors.map(l => `[${l.level.toUpperCase()}] ${l.message}`).join('\n');
    const logText = allLogs.map(l => `[${l.level.toUpperCase()}] ${l.message}`).join('\n');
    const isDeployError = errors.some(l => l.message.includes('DEPLOY') || l.message.includes('npm') || l.message.includes('FATAL') || l.message.includes('STDERR'));
    const context = isDeployError
      ? `Erro no DEPLOY do projeto "${project.name}" (id: ${project.id}). O backend não iniciou corretamente.`
      : `Erro no preview do projeto "${project.name}" (id: ${project.id}).`;
    const message = `${context}\n\nLogs completos:\n\`\`\`\n${logText}\n\`\`\`\n\nErros/Avisos:\n\`\`\`\n${errorText}\n\`\`\`\n\nUse list_project_files para ver os arquivos, read_artifact para ler o código, e update_artifact para corrigir.`;
    onSendToAgents(message);
  };

  const handleDownloadFile = (artifact: Artifact) => {
    const blob = new Blob([artifact.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.title;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canPreview = project.type === 'web' || project.type === 'react' || project.type === 'fullstack' || files.some(f => f.language === 'html');

  const typeLabel: Record<string, string> = {
    web: 'Web App',
    react: 'React App',
    fullstack: 'Full Stack',
    api: 'API/Backend',
  };

  const typeColor: Record<string, string> = {
    web: 'text-orange-400',
    react: 'text-cyan-400',
    fullstack: 'text-purple-400',
    api: 'text-green-400',
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <button onClick={onBack} className="p-1.5 rounded hover:bg-white/10 text-dim hover:text-main transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-main truncate">{project.name}</h2>
            <span className={`text-[9px] label-mono font-black uppercase ${typeColor[project.type] || 'text-accent'}`}>{typeLabel[project.type] || project.type}</span>
          </div>
          <p className="text-[10px] text-dim truncate">{project.stack}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Deploy / Stop button */}
          {deployStatus.running ? (
            <div className="flex items-center gap-1">
              <span className="flex items-center gap-1 px-2 py-1 rounded text-[9px] label-mono font-black text-green-400 bg-green-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                LIVE :{deployStatus.port}
              </span>
              {deployStatus.deployedUrl && (
                <a href={deployStatus.deployedUrl} target="_blank" rel="noreferrer"
                  className="p-1.5 rounded hover:bg-white/10 text-dim hover:text-accent transition-colors" title="Abrir app">
                  <ExternalLink size={13} />
                </a>
              )}
              <button onClick={handleStopDeploy} className="p-1.5 rounded hover:bg-red-500/10 text-dim hover:text-red-400 transition-colors" title="Parar servidor">
                <Square size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleDeploy}
              disabled={deploying}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] label-mono font-black uppercase bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors disabled:opacity-50"
              title="Executar backend real"
            >
              {deploying ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
              {deploying ? 'Deployando...' : 'Deploy'}
            </button>
          )}
          {canPreview && (
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setViewMode('code')} className={`px-3 py-1.5 text-[10px] label-mono font-black uppercase transition-colors ${viewMode === 'code' ? 'bg-accent text-white' : 'text-dim hover:text-main'}`}>
                <span className="flex items-center gap-1"><Code2 size={11} />Código</span>
              </button>
              <button onClick={() => setViewMode('preview')} className={`px-3 py-1.5 text-[10px] label-mono font-black uppercase transition-colors ${viewMode === 'preview' ? 'bg-accent text-white' : 'text-dim hover:text-main'}`}>
                <span className="flex items-center gap-1"><Eye size={11} />Preview</span>
              </button>
            </div>
          )}
          <button onClick={() => { if (confirm('Deletar este projeto e todos os seus arquivos?')) onDelete(project.id); }} className="p-1.5 rounded hover:bg-red-500/10 text-dim hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Deploy logs panel — always visible when there are logs (even in code view) */}
      {previewLogs.length > 0 && viewMode === 'code' && (
        <div className="border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setLogsOpen(o => !o)}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-[10px] font-black uppercase label-mono hover:bg-white/5 transition-colors"
            style={{ background: 'var(--bg)' }}
          >
            <Terminal size={11} className={previewLogs.some(l => l.level === 'error') ? 'text-red-400' : 'text-dim'} />
            <span className={previewLogs.some(l => l.level === 'error') ? 'text-red-400' : 'text-dim'}>
              Logs {previewLogs.length > 0 ? `(${previewLogs.length})` : ''}
            </span>
            {previewLogs.some(l => l.level === 'error') && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px]">
                {previewLogs.filter(l => l.level === 'error').length} erro(s)
              </span>
            )}
            <span className="ml-auto">{logsOpen ? <ChevronDown size={11} /> : <ChevronUp size={11} />}</span>
          </button>
          {logsOpen && (
            <div className="flex flex-col" style={{ maxHeight: '200px', background: '#0a0a0a' }}>
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5 font-mono text-[11px]">
                {previewLogs.map((log, i) => (
                  <div key={i} className={`flex gap-2 px-2 py-0.5 rounded ${log.level === 'error' ? 'bg-red-500/10 text-red-400' : log.level === 'warn' ? 'bg-yellow-500/10 text-yellow-400' : 'text-dim/60'}`}>
                    <span className={`shrink-0 font-black uppercase text-[9px] mt-0.5 ${log.level === 'error' ? 'text-red-500' : log.level === 'warn' ? 'text-yellow-500' : 'text-dim'}`}>{log.level}</span>
                    <span className="break-all">{log.message}</span>
                  </div>
                ))}
              </div>
              {previewLogs.some(l => l.level === 'error' || l.level === 'warn') && onSendToAgents && (
                <div className="px-3 py-2 border-t flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={handleSendErrorsToAgents}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-accent text-white hover:bg-accent/80 transition-colors"
                  >
                    <Wrench size={11} /> Enviar erros para agentes corrigirem
                  </button>
                  <button onClick={() => setPreviewLogs([])} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] text-dim hover:text-white transition-colors">
                    <X size={11} /> Limpar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Domain panel */}
      {deployStatus.running && (
        <div className="border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setDomainOpen(o => !o)}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-[10px] font-black uppercase label-mono hover:bg-white/5 transition-colors"
            style={{ background: 'var(--bg)' }}
          >
            <Globe size={11} className={savedDomain ? 'text-green-400' : 'text-dim'} />
            <span className={savedDomain ? 'text-green-400' : 'text-dim'}>
              Domínio {savedDomain ? `— ${savedDomain}` : '— não configurado'}
            </span>
            <span className="ml-auto">{domainOpen ? <ChevronDown size={11} /> : <ChevronUp size={11} />}</span>
          </button>
          {domainOpen && (
            <div className="px-3 py-3 space-y-3" style={{ background: '#0a0a0a' }}>
              {/* Current public URL */}
              <div>
                <p className="text-[9px] text-dim/60 uppercase label-mono mb-1">URL pública atual</p>
                <a
                  href={deployStatus.deployedUrl || '#'}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-[11px] text-accent font-mono hover:underline truncate"
                >
                  <ExternalLink size={10} />
                  {deployStatus.deployedUrl}
                </a>
              </div>

              {/* Custom domain input */}
              <div>
                <p className="text-[9px] text-dim/60 uppercase label-mono mb-1">Domínio personalizado</p>
                <div className="flex gap-1.5">
                  <input
                    value={customDomain}
                    onChange={e => setCustomDomain(e.target.value)}
                    placeholder="meusite.com.br"
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-[11px] font-mono outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    onKeyDown={e => e.key === 'Enter' && handleSaveDomain()}
                  />
                  <button
                    onClick={handleSaveDomain}
                    disabled={savingDomain}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    {savingDomain ? '...' : 'Salvar'}
                  </button>
                </div>
              </div>

              {/* DNS instructions */}
              {savedDomain && (
                <div className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <p className="text-[10px] font-semibold text-accent">Instruções de DNS</p>
                  <p className="text-[10px] text-dim/80">Acesse o painel do seu registrador (Registro.br, GoDaddy, Cloudflare) e adicione:</p>
                  <div className="space-y-1.5 font-mono text-[10px]">
                    <div className="flex gap-2 items-center">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>A</span>
                      <span className="text-main">{savedDomain}</span>
                      <span className="text-dim/50">→</span>
                      <span className="text-green-400">IP DO SEU SERVIDOR</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>CNAME</span>
                      <span className="text-main">www.{savedDomain}</span>
                      <span className="text-dim/50">→</span>
                      <span className="text-green-400">{savedDomain}</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-dim/50">A propagação DNS pode levar até 24h. Após isso, seu site estará acessível em <strong className="text-dim/80">{savedDomain}</strong>.</p>
                  <p className="text-[9px] text-dim/50">Para HTTPS, configure o Nginx/Caddy como proxy reverso na porta 8000 com certificado Let's Encrypt.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* File Tree Sidebar — hidden in preview mode */}
        <div className={`border-r flex flex-col shrink-0 ${viewMode === 'preview' ? 'hidden' : 'w-52'}`} style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary, #0a0a0a)' }}>
          {/* Tab Bar */}
          <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => setActiveTab('files')}
              className={`px-4 py-2 text-[11px] font-semibold transition-colors ${activeTab === 'files' ? 'text-accent border-b-2 border-accent' : 'text-dim hover:text-main'}`}
            >
              Arquivos
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`px-4 py-2 text-[11px] font-semibold transition-colors flex items-center gap-1 ${activeTab === 'leads' ? 'text-accent border-b-2 border-accent' : 'text-dim hover:text-main'}`}
            >
              Leads {leads.length > 0 && <span className="bg-accent text-white text-[9px] px-1.5 py-0.5 rounded-full">{leads.length}</span>}
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`px-4 py-2 text-[11px] font-semibold transition-colors flex items-center gap-1 ${activeTab === 'database' ? 'text-accent border-b-2 border-accent' : 'text-dim hover:text-main'}`}
            >
              <Database size={10} />
              DB {infra?.provisioned && <span className="bg-green-500/20 text-green-400 text-[9px] px-1.5 py-0.5 rounded-full">{infra.tables.length}</span>}
            </button>
          </div>

          {activeTab === 'database' ? (
            <div className="flex-1 overflow-y-auto p-3">
              {!infra?.provisioned ? (
                <div className="text-center py-10">
                  <Database size={24} className="text-dim/30 mx-auto mb-2" />
                  <p className="text-dim text-[11px] font-semibold">Sem banco de dados</p>
                  <p className="text-dim/60 text-[10px] mt-1 leading-relaxed">Peça aos agentes para criar um sistema com banco de dados próprio.</p>
                  {onSendToAgents && (
                    <button
                      onClick={() => onSendToAgents('crie um sistema completo com banco de dados para este projeto')}
                      className="mt-3 px-3 py-1.5 rounded-lg text-[10px] font-semibold"
                      style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                      Provisionar banco
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-2 rounded-lg text-[10px]" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <p className="text-green-400 font-semibold mb-0.5">✓ Banco ativo</p>
                    <p className="text-dim/70 font-mono break-all">/p/{project.id}/api</p>
                  </div>
                  {infra.tables.map(table => (
                    <div key={table} className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                      <div className="px-3 py-2 flex items-center justify-between" style={{ background: 'var(--surface)' }}>
                        <div className="flex items-center gap-1.5">
                          <Database size={11} className="text-accent" />
                          <span className="text-[11px] font-semibold text-main font-mono">{table}</span>
                        </div>
                        <span className="text-[9px] text-dim/60">{infra.schemas?.[table]?.row_count ?? 0} registros</span>
                      </div>
                      <div className="px-3 py-2 space-y-1">
                        {infra.schemas?.[table]?.columns.map(col => (
                          <div key={col.name} className="flex items-center gap-2 text-[10px]">
                            <span className="text-main/80 font-mono">{col.name}</span>
                            <span className="text-dim/50">{col.type}</span>
                          </div>
                        ))}
                      </div>
                      <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
                        <p className="text-[9px] text-dim/50 font-mono">GET /p/{project.id}/api/{table}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'leads' ? (
            <div className="flex-1 overflow-y-auto p-4">
              {leads.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-dim text-[11px]">Nenhum lead ainda.</p>
                  <p className="text-dim/60 text-[10px] mt-1">Os leads aparecem aqui quando alguém preencher o formulário da LP.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leads.map((lead: any) => (
                    <div key={lead.id} className="p-3 rounded-lg border text-[11px]" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-main">{lead.name}</p>
                          <p className="text-dim">{lead.email} {lead.phone ? `· ${lead.phone}` : ''}</p>
                          {lead.company && <p className="text-dim/70">{lead.company}</p>}
                          {lead.message && <p className="text-dim/60 mt-1 text-[10px] italic">"{lead.message}"</p>}
                        </div>
                        <span className="text-dim/50 text-[10px] shrink-0">{new Date(lead.created_at || lead.timestamp).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <span className="text-[9px] label-mono text-dim font-black uppercase tracking-widest">Arquivos</span>
                <span className="text-[9px] label-mono text-accent">{files.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto py-1 scrollbar-hide">
                {loading ? (
                  <div className="p-4 text-center text-[10px] text-dim animate-pulse">Carregando...</div>
                ) : tree.length === 0 ? (
                  <div className="p-4 text-center text-[10px] text-dim">Nenhum arquivo</div>
                ) : (
                  tree.map(node => (
                    <TreeNodeItem key={node.path} node={node} depth={0} selectedPath={selectedNode?.path || null} onSelect={setSelectedNode} expandedFolders={expandedFolders} toggleFolder={toggleFolder} />
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Main Panel */}
        <div className="flex-1 min-w-0 flex flex-col">
          {viewMode === 'preview' && canPreview ? (
            <div className="flex-1 flex flex-col min-h-0">
              {previewHtml ? (
                <iframe
                  ref={iframeRef}
                  srcDoc={previewHtml}
                  className="w-full border-0 bg-white block flex-1"
                  style={{ minHeight: 0 }}
                  title={`Preview: ${project.name}`}
                  sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-dim text-sm">
                  Nenhum arquivo HTML encontrado no projeto
                </div>
              )}
              {/* Console errors — only show if there are actual errors/warnings, collapsed by default */}
              {previewLogs.some(l => l.level === 'error' || l.level === 'warn') && (
              <div className="border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setLogsOpen(o => !o)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-[10px] font-black uppercase label-mono hover:bg-white/5 transition-colors"
                  style={{ background: 'var(--bg)' }}
                >
                  <Terminal size={11} className="text-red-400" />
                  <span className="text-red-400">
                    {previewLogs.filter(l => l.level === 'error').length} erro(s) no preview
                  </span>
                  <span className="ml-auto">{logsOpen ? <ChevronDown size={11} /> : <ChevronUp size={11} />}</span>
                </button>
                {logsOpen && (
                  <div className="flex flex-col" style={{ maxHeight: '120px', background: '#0a0a0a' }}>
                    <div className="flex-1 overflow-y-auto p-2 space-y-0.5 font-mono text-[11px]">
                      {previewLogs.filter(l => l.level === 'error' || l.level === 'warn').map((log, i) => (
                        <div key={i} className={`flex gap-2 px-2 py-0.5 rounded ${log.level === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                          <span className={`shrink-0 font-black uppercase text-[9px] mt-0.5 ${log.level === 'error' ? 'text-red-500' : 'text-yellow-500'}`}>{log.level}</span>
                          <span className="break-all">{log.message}</span>
                        </div>
                      ))}
                    </div>
                    {onSendToAgents && (
                      <div className="px-3 py-2 border-t flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                        <button onClick={handleSendErrorsToAgents} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-accent text-white hover:bg-accent/80 transition-colors">
                          <Wrench size={11} /> Corrigir com agentes
                        </button>
                        <button onClick={() => setPreviewLogs([])} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] text-dim hover:text-white transition-colors">
                          <X size={11} /> Limpar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            </div>
          ) : selectedNode?.artifact ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* File tab bar */}
              <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                <span className="shrink-0">{getFileIcon(selectedNode.name)}</span>
                <span className="text-[11px] text-main/80 font-mono truncate flex-1">{selectedNode.artifact.filepath || selectedNode.artifact.title}</span>
                <button
                  onClick={() => handleDownloadFile(selectedNode.artifact!)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[9px] label-mono font-black uppercase text-dim hover:text-accent hover:bg-accent/10 transition-colors"
                >
                  <Download size={11} /> Download
                </button>
              </div>
              {/* Code viewer */}
              <div className="flex-1 overflow-auto">
                <pre className="p-4 text-[11px] leading-relaxed font-mono text-main/80 whitespace-pre-wrap break-words min-h-full" style={{ background: 'var(--bg)' }}>
                  <code>{selectedNode.artifact.code}</code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileCode size={40} className="text-dim/30 mx-auto mb-3" />
                <p className="text-[11px] text-dim">Selecione um arquivo para visualizar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
