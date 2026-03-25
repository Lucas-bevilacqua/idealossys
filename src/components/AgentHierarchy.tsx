import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { Terminal, Megaphone, Briefcase, DollarSign, Users, Compass, Lock, Brain } from 'lucide-react';
import { AREAS } from '../constants';
import { Agent } from '../types';

const IconMap: Record<string, any> = { Terminal, Megaphone, Briefcase, DollarSign, Users, Compass };

// Dimensões
const CANVAS_PAD = 72;
const ROOT_W = 200;
const ROOT_H = 80;
const BU_W = 176;
const BU_H = 68;
const AGENT_W = 172;
const AGENT_BASE_H = 56;
const SKILL_ROW_H = 24;
const H_GAP = 48;
const V_GAP_1 = 96;
const V_GAP_2 = 80;

const agentCardH = (agent: Agent) => {
  const skillRows = agent.skills ? Math.ceil(agent.skills.length / 2) : 0;
  const processRows = agent.processes ? agent.processes.length : 0;
  return AGENT_BASE_H + skillRows * SKILL_ROW_H + processRows * SKILL_ROW_H;
};

const AgentCard = ({ agent, unlocked, delay }: { agent: Agent; unlocked: boolean; delay: number }) => {
  const h = agentCardH(agent);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      style={{ width: AGENT_W, height: h }}
      className={`rounded-xl border overflow-hidden ${
        unlocked ? 'border-white/10 bg-white/[0.02]' : 'border-white/[0.04] bg-transparent opacity-35 grayscale'
      }`}
    >
      <div className="flex items-center gap-2 px-2.5 pt-2.5 pb-2">
        <img src={agent.avatar} alt={agent.name} className="w-7 h-7 rounded-full shrink-0 ring-1 ring-white/10" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-main truncate leading-tight">{agent.name}</p>
          <p className="text-[8px] text-dim truncate leading-tight">{agent.role}</p>
        </div>
        {unlocked && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 shrink-0" />}
      </div>

      {agent.skills && agent.skills.length > 0 && (
        <div className="px-2.5 pb-1.5 border-t border-white/5 pt-1.5">
          <p className="text-[7px] label-mono text-accent/50 uppercase tracking-widest mb-1">Skills</p>
          <div className="flex flex-wrap gap-1">
            {agent.skills.map((s, i) => (
              <span key={i} className="text-[7px] px-1.5 py-0.5 rounded bg-accent/8 text-accent/70 border border-accent/15 leading-none">{s}</span>
            ))}
          </div>
        </div>
      )}

      {agent.processes && agent.processes.length > 0 && (
        <div className="px-2.5 pb-2 border-t border-white/5 pt-1.5">
          <p className="text-[7px] label-mono text-white/30 uppercase tracking-widest mb-1">Processos</p>
          <div className="space-y-0.5">
            {agent.processes.map((p, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-white/15 shrink-0" />
                <p className="text-[7px] text-dim leading-tight truncate">{p}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export const AgentHierarchy: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

  // Layout calculations
  const buLayouts = AREAS.map(area => {
    const count = area.agents.length;
    const totalW = count * AGENT_W + (count - 1) * H_GAP;
    return { area, buWidth: Math.max(BU_W, totalW) };
  });

  const totalWidth = buLayouts.reduce((acc, b) => acc + b.buWidth, 0) + (AREAS.length - 1) * H_GAP;
  const CANVAS_W = totalWidth + CANVAS_PAD * 2;
  const maxAgentH = Math.max(...AREAS.flatMap(a => a.agents.map(agentCardH)));
  const CANVAS_H = ROOT_H + V_GAP_1 + BU_H + V_GAP_2 + maxAgentH + CANVAS_PAD * 2;

  const rootX = CANVAS_W / 2 - ROOT_W / 2;
  const rootY = CANVAS_PAD;
  const rootCX = CANVAS_W / 2;
  const rootBottomY = rootY + ROOT_H;

  let cursor = CANVAS_PAD;
  const buPositions = buLayouts.map(({ area, buWidth }) => {
    const pos = { area, buWidth, x: cursor, y: rootY + ROOT_H + V_GAP_1 };
    cursor += buWidth + H_GAP;
    return pos;
  });

  const agentPositions = buPositions.map(({ area, x, y, buWidth }) => {
    const count = area.agents.length;
    const totalW = count * AGENT_W + (count - 1) * H_GAP;
    const startX = x + (buWidth - totalW) / 2;
    return area.agents.map((agent, i) => ({
      agent,
      x: startX + i * (AGENT_W + H_GAP),
      y: y + BU_H + V_GAP_2,
      h: agentCardH(agent),
    }));
  });

  // Center canvas on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setOffset({
      x: (rect.width - CANVAS_W) / 2,
      y: (rect.height - CANVAS_H) / 2,
    });
  }, [CANVAS_W, CANVAS_H]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
  }, [offset]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
  }, []);

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStart.current = null;
  }, []);

  // Touch support
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    dragStart.current = { mx: t.clientX, my: t.clientY, ox: offset.x, oy: offset.y };
  }, [offset]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragStart.current) return;
    const t = e.touches[0];
    const dx = t.clientX - dragStart.current.mx;
    const dy = t.clientY - dragStart.current.my;
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
  }, []);

  const onTouchEnd = useCallback(() => {
    dragStart.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative select-none"
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Canvas arrastável */}
      <div
        style={{
          position: 'absolute',
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          willChange: 'transform',
        }}
      >
        {/* SVG linhas */}
        <svg width={CANVAS_W} height={CANVAS_H} className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          {buPositions.map((bu, bIdx) => {
            const buCX = bu.x + bu.buWidth / 2;
            const agents = agentPositions[bIdx];
            const dim = !bu.area.unlocked;
            const mid1 = (rootBottomY + bu.y) / 2;
            return (
              <g key={bIdx}>
                <path
                  d={`M ${rootCX} ${rootBottomY} C ${rootCX} ${mid1}, ${buCX} ${mid1}, ${buCX} ${bu.y}`}
                  fill="none" stroke={dim ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)'} strokeWidth={1}
                  strokeDasharray={dim ? '4 4' : undefined}
                />
                {agents.map((a, aIdx) => {
                  const aCX = a.x + AGENT_W / 2;
                  const mid2 = (bu.y + BU_H + a.y) / 2;
                  return (
                    <path key={aIdx}
                      d={`M ${buCX} ${bu.y + BU_H} C ${buCX} ${mid2}, ${aCX} ${mid2}, ${aCX} ${a.y}`}
                      fill="none" stroke={dim ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.09)'} strokeWidth={1}
                      strokeDasharray={dim ? '3 4' : undefined}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        <div style={{ position: 'relative', zIndex: 1, height: CANVAS_H }}>
          {/* OS Core */}
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            style={{ position: 'absolute', left: rootX, top: rootY, width: ROOT_W, height: ROOT_H }}
            className="flex flex-col items-center justify-center rounded-2xl border border-accent/35 bg-accent/8 shadow-xl shadow-accent/10"
          >
            <Brain size={20} className="text-accent mb-1" />
            <p className="text-[12px] font-black text-accent uppercase tracking-tight leading-none">OS Core</p>
            <p className="text-[8px] text-accent/50 label-mono mt-0.5 uppercase tracking-widest">Orquestrador Central</p>
          </motion.div>

          {/* BUs */}
          {buPositions.map((bu, bIdx) => {
            const AreaIcon = IconMap[bu.area.icon] || Terminal;
            const cardLeft = bu.x + bu.buWidth / 2 - BU_W / 2;
            return (
              <motion.div
                key={bu.area.id}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + bIdx * 0.06, duration: 0.4 }}
                style={{ position: 'absolute', left: cardLeft, top: bu.y, width: BU_W, height: BU_H }}
                className={`flex items-center gap-2.5 px-3 rounded-xl border ${
                  bu.area.unlocked ? 'border-white/15 bg-white/[0.04]' : 'border-white/5 bg-white/[0.02] opacity-45 grayscale'
                }`}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${bu.area.color}25`, border: `1px solid ${bu.area.color}40` }}>
                  <AreaIcon size={16} style={{ color: bu.area.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black text-main uppercase tracking-tight truncate">{bu.area.name}</p>
                  <p className="text-[8px] text-dim label-mono">{bu.area.agents.length} agentes</p>
                </div>
                {bu.area.unlocked
                  ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 shrink-0" />
                  : <Lock size={10} className="text-white/20 shrink-0" />}
              </motion.div>
            );
          })}

          {/* Agentes */}
          {agentPositions.map((agents, bIdx) =>
            agents.map((a, aIdx) => (
              <div
                key={`${bIdx}-${aIdx}`}
                style={{ position: 'absolute', left: a.x, top: a.y, width: AGENT_W, height: a.h }}
              >
                <AgentCard
                  agent={a.agent}
                  unlocked={AREAS[bIdx].unlocked}
                  delay={0.2 + bIdx * 0.06 + aIdx * 0.04}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Legenda fixa no canto inferior */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-6 px-5 py-2.5 rounded-full border border-white/8 bg-black/60 backdrop-blur-xl pointer-events-none">
        <div className="flex items-center gap-1.5 text-[9px] label-mono text-dim uppercase tracking-wider">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" /> Ativo
        </div>
        <div className="flex items-center gap-1.5 text-[9px] label-mono text-dim uppercase tracking-wider">
          <Lock size={9} className="text-white/30" /> Em breve
        </div>
        <div className="flex items-center gap-1.5 text-[9px] label-mono text-dim uppercase tracking-wider">
          {AREAS.filter(a => a.unlocked).length} BU ativa · {AREAS.reduce((acc, a) => acc + a.agents.length, 0)} agentes
        </div>
        <div className="flex items-center gap-1.5 text-[9px] label-mono text-dim/50 uppercase tracking-wider">
          arraste para navegar
        </div>
      </div>
    </div>
  );
};
