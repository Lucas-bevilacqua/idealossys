import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, MessageSquare, Trello, Activity, FileCode, Lock, Globe, TrendingUp, Database } from 'lucide-react';

export const FeaturesComparison: React.FC = () => {
  const todayFeatures = [
    { icon: MessageSquare, label: 'Orquestração de Especialistas', desc: 'Comando centralizado de múltiplos agentes digitais' },
    { icon: Trello, label: 'Gestão de Projetos em Tempo Real', desc: 'Visibilidade completa do ciclo de vida das tarefas' },
    { icon: CheckCircle2, label: 'Governança & Aprovações', desc: 'Controle humano total sobre decisões e entregas' },
    { icon: FileCode, label: 'Entrega de Ativos de Negócio', desc: 'Geração automatizada de código, documentos e sistemas' },
    { icon: Activity, label: 'Auditabilidade Enterprise', desc: 'Registro histórico de todas as ações e justificativas' },
    { icon: Globe, label: 'Gestão Multi-Empresa', desc: 'Controle de holdings e portfólios em uma única interface' }
  ];

  const roadmapFeatures = [
    { icon: Lock, label: 'Criptografia de Soberania', desc: 'Segurança de dados com chaves proprietárias' },
    { icon: Globe, label: 'Expansão Multi-Região', desc: 'Sincronização global para operações transnacionais' },
    { icon: TrendingUp, label: 'Market Intelligence', desc: 'Insights estratégicos baseados em dados externos' },
    { icon: Database, label: 'Advanced Analytics', desc: 'Dashboards preditivos para suporte à decisão' }
  ];

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
      {/* TODAY Column */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] label-mono font-bold tracking-[0.3em] uppercase mb-6">
          <CheckCircle2 size={12} />
          Disponível Hoje
        </div>

        <div className="space-y-4">
          {todayFeatures.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              viewport={{ once: true }}
              className="glass-panel p-4 rounded-xl hover:border-green-500/40 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/20 transition-colors">
                  <feature.icon size={20} className="text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold mb-1">{feature.label}</h4>
                  <p className="text-xs text-dim">{feature.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ROADMAP Column */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] label-mono font-bold tracking-[0.3em] uppercase mb-6">
          <Clock size={12} />
          Em Desenvolvimento
        </div>

        <div className="space-y-4">
          {roadmapFeatures.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              viewport={{ once: true }}
              className="glass-panel p-4 rounded-xl hover:border-accent/40 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                  <feature.icon size={20} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold mb-1">{feature.label}</h4>
                  <p className="text-xs text-dim">{feature.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
