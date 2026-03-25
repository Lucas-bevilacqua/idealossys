import React from 'react';
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
import {
    ArrowRight, ChevronRight, Building2, Users, BarChart3, Globe, Brain, Shield, Zap, Server, CreditCard, Activity, Briefcase, TrendingUp, Search
} from 'lucide-react';
import { Logo } from './components/Logo';
import { AnimatedBackground } from './components/AnimatedBackground';
import { FeaturesComparison } from './components/FeaturesComparison';

const HighTechCard = ({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ 
                y: -10, 
                scale: 1.02,
                boxShadow: "0 20px 40px rgba(59, 130, 246, 0.15)",
                borderColor: "rgba(59, 130, 246, 0.5)"
            }}
            transition={{ 
                duration: 0.5, 
                delay,
                type: "spring",
                stiffness: 100
            }}
            viewport={{ once: true, amount: 0.2 }}
            className={`relative overflow-hidden p-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl transition-colors ${className}`}
        >
            {/* Animated Glow Border Effect */}
            <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/10 to-transparent -translate-x-full"
                animate={{ x: ["100%", "-100%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
};

export const LandingPage: React.FC<{ onEnterApp: () => void }> = ({ onEnterApp }) => {
    const { scrollYProgress } = useScroll();
    const scale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);
    const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

    return (
        <div className="min-h-screen bg-[#020202] text-white selection:bg-accent selection:text-white font-sans overflow-x-hidden relative perspective-1000">
            {/* Hightech Animated Background */}
            <AnimatedBackground />

            {/* Navigation */}
            <motion.nav
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "circOut" }}
                className="fixed top-0 left-0 right-0 h-20 flex items-center justify-between px-6 md:px-20 z-[100] backdrop-blur-md bg-black/40 border-b border-white/5"
            >
                <Logo size="lg" variant="footer" />

                <div className="hidden md:flex items-center gap-10 text-[11px] font-bold label-mono uppercase tracking-[0.2em] opacity-60">
                    {['Soluções', 'Abordagem', 'Resultados'].map((item, idx) => (
                        <motion.a
                            key={idx}
                            href={`#${item.toLowerCase()}`}
                            className="hover:text-accent transition-colors relative group"
                            whileHover={{ color: '#3B82F6' }}
                        >
                            {item}
                            <motion.div
                                className="absolute -bottom-1 left-0 h-[1px] bg-accent"
                                initial={{ width: 0 }}
                                whileHover={{ width: '100%' }}
                                transition={{ duration: 0.3 }}
                            />
                        </motion.a>
                    ))}
                </div>

                <motion.button
                    onClick={onEnterApp}
                    className="px-8 py-3 rounded-full bg-accent text-white font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-accent/20 relative overflow-hidden group"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                    />
                    <span className="relative">Portal de Comando</span>
                </motion.button>
            </motion.nav>

            {/* ========== HERO SECTION ========== */}
            <section className="relative min-h-screen px-8 flex flex-col items-center justify-center text-center z-10 pt-20">
                <motion.div
                    style={{ scale }}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-6xl"
                >
                    {/* Simple Badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md text-accent text-[10px] label-mono font-bold tracking-[0.4em] uppercase mb-12"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                        </span>
                        Sua Empresa no Automático
                    </motion.div>

                    {/* Simple Headline */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-8 md:mb-10"
                    >
                        <h1 className="text-4xl sm:text-6xl md:text-9xl font-heading font-black tracking-tight mb-6 md:mb-8 leading-[1.1] md:leading-[0.9] perspective-1000">
                            <motion.span 
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5, duration: 0.8 }}
                                className="block text-white/90"
                            >
                                Você Comanda.
                            </motion.span>
                            <motion.span 
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.7, duration: 0.8 }}
                                className="block text-shiny py-2 md:py-4"
                            >
                                A IA Executa.
                            </motion.span>
                        </h1>
                    </motion.div>

                    {/* Simple Value Prop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9, duration: 1 }}
                        className="mb-10 md:mb-14 px-4"
                    >
                        <p className="text-lg md:text-2xl text-dim font-medium tracking-tight max-w-4xl mx-auto leading-relaxed">
                            Pare de apenas conversar com robôs. O IdealOS cria <span className="text-white">equipes digitais completas</span> que 
                            trabalham 24h por dia para resolver seus problemas e entregar resultados prontos.
                        </p>
                    </motion.div>

                    {/* CTA Group */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.1, duration: 0.8 }}
                        className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center items-center px-6"
                    >
                        <motion.button
                            onClick={onEnterApp}
                            className="w-full sm:w-auto px-10 md:px-14 py-5 md:py-6 rounded-xl bg-white text-black font-black text-xs uppercase tracking-[0.25em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] relative overflow-hidden group"
                        >
                            <span className="relative flex items-center justify-center gap-3">
                                Começar Agora
                                <ArrowRight size={16} strokeWidth={3} />
                            </span>
                        </motion.button>

                        <motion.button
                            className="w-full sm:w-auto px-10 md:px-14 py-5 md:py-6 rounded-xl bg-transparent border border-white/10 text-white font-bold text-xs uppercase tracking-[0.25em] hover:bg-white/5 transition-all"
                        >
                            Como Funciona
                        </motion.button>
                    </motion.div>
                </motion.div>
            </section>

            {/* ========== VANTAGENS DIRETAS ========== */}
            <section className="relative py-20 md:py-32 px-6 md:px-8 max-w-7xl mx-auto z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {[
                        {
                            icon: BarChart3,
                            title: 'Corte Custos',
                            desc: 'Escaneie processos e substitua tarefas manuais caras por automação inteligente.',
                            color: 'from-blue-500/10 to-transparent'
                        },
                        {
                            icon: Zap,
                            title: 'Ganhe Tempo',
                            desc: 'Seus departamentos rodam sozinhos, sobrando tempo para você focar no que importa.',
                            color: 'from-yellow-500/10 to-transparent'
                        },
                        {
                            icon: Search,
                            title: 'Transparência',
                            desc: 'Veja tudo o que está acontecendo na sua empresa em uma única tela, em tempo real.',
                            color: 'from-green-500/10 to-transparent'
                        },
                        {
                            icon: Globe,
                            title: 'Escala Rápida',
                            desc: 'Lance novos projetos em minutos. A IA cuida de toda a parte operacional por você.',
                            color: 'from-purple-500/10 to-transparent'
                        }
                    ].map((item, idx) => (
                        <HighTechCard key={idx} delay={idx * 0.1} className={`bg-gradient-to-br ${item.color} border-white/5`}>
                            <item.icon size={28} className="text-accent mb-6" />
                            <h3 className="font-bold mb-3 text-lg text-white tracking-tight">{item.title}</h3>
                            <p className="text-dim text-xs leading-relaxed font-medium">{item.desc}</p>
                        </HighTechCard>
                    ))}
                </div>
            </section>

            {/* ========== DEPARTAMENTOS PRONTOS ========== */}
            <section id="solucoes" className="relative py-20 md:py-40 px-6 md:px-8 z-10">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                        viewport={{ once: true, amount: 0.3 }}
                        className="text-center mb-16 md:mb-24"
                    >
                        <h2 className="text-3xl md:text-7xl font-heading font-black tracking-tighter mb-6 md:mb-8 leading-tight md:leading-none">
                            Contrate <span className="text-accent">Departamentos Digitais</span>
                            <br /><span className="text-white/60">Que nunca dormem</span>
                        </h2>
                        <div className="h-[1px] w-24 md:w-40 bg-gradient-to-r from-transparent via-accent/50 to-transparent mx-auto mb-6 md:mb-8" />
                        <p className="text-dim text-lg md:text-xl max-w-3xl mx-auto leading-relaxed px-4">
                            Ative equipes de marketing, vendas e produto que trabalham de forma coordenada para entregar o resultado que você pediu.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {[
                            {
                                vertical: 'Engenharia & Produto',
                                status: 'Ativo',
                                agents: ['Gestão de Produto', 'Design de Experiência', 'Desenvolvimento de Sistemas'],
                                deliverables: ['Desenvolvimento de Software Escalável', 'Arquitetura de Sistemas em Nuvem', 'Manutenção de Sistemas Críticos'],
                                color: 'from-blue-500/20 to-blue-600/20'
                            },
                            {
                                vertical: 'Crescimento & Marketing',
                                status: 'Operativo',
                                agents: ['Estratégia de Marca', 'Comunicação Digital', 'Performance'],
                                deliverables: ['Gestão de Campanhas de Tráfego Pago', 'Landing Pages de Alta Conversão', 'Automação de Funis de Vendas'],
                                color: 'from-purple-500/20 to-purple-600/20'
                            },
                            {
                                vertical: 'Inteligência de Negócios',
                                status: 'Em breve',
                                agents: ['Análise Estratégica', 'Dados de Mercado', 'Projeções'],
                                deliverables: ['Dashboards de Performance em Tempo Real', 'Análise de Tendências de Mercado', 'Modelos de Previsão de Demanda'],
                                color: 'from-green-500/20 to-green-600/20'
                            },
                            {
                                vertical: 'Controladoria & Finanças',
                                status: 'Em breve',
                                agents: ['Gestão de Ativos', 'Planejamento Financeiro', 'Análise de Risco'],
                                deliverables: ['Modelagem e Gestão de Fluxo de Caixa', 'Análise de ROI por Unidade de Negócio', 'Otimização e Planejamento Tributário'],
                                color: 'from-yellow-500/20 to-yellow-600/20'
                            },
                            {
                                vertical: 'Capital Humano',
                                status: 'Em breve',
                                agents: ['Cultura Organizacional', 'Aquisição de Talentos', 'Retenção Estratégica'],
                                deliverables: ['Planos de Cargos, Salários e Benefícios', 'Automação de Recrutamento e Seleção', 'Manuais de Cultura e Onboarding'],
                                color: 'from-pink-500/20 to-pink-600/20'
                            },
                            {
                                vertical: 'Estratégia & Expansão',
                                status: 'Em breve',
                                agents: ['Análise Competitiva', 'Novos Mercados', 'Fusões & Aquisições'],
                                deliverables: ['Estudos de Expansão para Novos Mercados', 'Auditoria e Análise para M&A', 'Planejamento de Roadmaps Estratégicos'],
                                color: 'from-red-500/20 to-red-600/20'
                            }
                        ].map((item, idx) => (
                            <HighTechCard key={idx} delay={idx * 0.05} className={`bg-gradient-to-br ${item.color}`}>
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="font-bold text-2xl text-white tracking-tight">{item.vertical}</h3>
                                    <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] border shadow-lg ${
                                        item.status === 'Ativo' || item.status === 'Operativo'
                                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                            : 'bg-white/5 text-dim border-white/10'
                                    }`}>
                                        {item.status}
                                    </span>
                                </div>
                                
                                <div className="mb-6">
                                    <p className="text-[10px] font-black label-mono text-accent uppercase tracking-widest mb-3">Especialistas:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {item.agents.map((agent, agentIdx) => (
                                            <span key={agentIdx} className="text-[10px] font-bold bg-white/5 px-2 py-1 rounded text-dim/80 border border-white/5">
                                                {agent}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[10px] font-black label-mono text-white uppercase tracking-widest mb-3">Entregas Estratégicas:</p>
                                    <div className="space-y-2">
                                        {item.deliverables.map((delivery, dIdx) => (
                                            <motion.div 
                                                key={dIdx} 
                                                initial={{ opacity: 0, x: -10 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.4 + (dIdx * 0.1) }}
                                                className="text-xs font-medium text-dim/90 flex items-center gap-3 group/item"
                                            >
                                                <ChevronRight size={12} className="text-accent group-hover/item:translate-x-1 transition-transform" />
                                                {delivery}
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </HighTechCard>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== SEGURANÇA E ESCALA ========== */}
            <section id="abordagem" className="relative py-40 px-8 backdrop-blur-3xl bg-white/[0.01] border-y border-white/5 z-10 overflow-hidden">
                <div className="max-w-6xl mx-auto relative">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                        viewport={{ once: true }}
                        className="text-center mb-24"
                    >
                        <h2 className="text-5xl md:text-6xl font-heading font-black tracking-tighter leading-none max-w-4xl mx-auto">
                            Feito para quem <span className="text-accent">Não Tem Tempo a Perder</span>
                        </h2>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-10">
                        {[
                            {
                                icon: Shield,
                                title: 'Seus Dados Seguros',
                                desc: 'Tudo o que a IA faz fica dentro da sua empresa. Seus segredos e processos estão 100% protegidos.',
                                features: ['Privacidade Total', 'Sem Vazamentos', 'Controle Seu']
                            },
                            {
                                icon: Briefcase,
                                title: 'Trabalho Sem Erros',
                                desc: 'A IA segue suas regras à risca. Sem esquecimentos, sem desculpas e sem erros humanos.',
                                features: ['Foco Total', 'Memória Infinita', 'Entrega Pronta']
                            },
                            {
                                icon: TrendingUp,
                                title: 'Cresça num Clique',
                                desc: 'Precisa de mais braço? Ative novos agentes em segundos e aumente sua produção na hora.',
                                features: ['Mais Rapidez', 'Menos Gastos', 'Escala Fácil']
                            }
                        ].map((item, idx) => (
                            <HighTechCard key={idx} delay={idx * 0.1} className="p-10 border-white/5">
                                <item.icon size={32} className="text-accent mb-8" />
                                <h3 className="font-bold mb-4 text-2xl text-white tracking-tight">{item.title}</h3>
                                <p className="text-dim text-sm mb-8 leading-relaxed font-medium">{item.desc}</p>
                                <ul className="space-y-3">
                                    {item.features.map((feature, featureIdx) => (
                                        <li key={featureIdx} className="text-[10px] font-black label-mono text-dim/80 flex items-center gap-3 uppercase tracking-[0.2em]">
                                            <span className="w-1 h-1 rounded-full bg-accent" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </HighTechCard>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== RESULTADOS MENSURÁVEIS ========== */}
            <section id="resultados" className="relative py-40 px-8 z-10">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                        viewport={{ once: true }}
                        className="text-center mb-24"
                    >
                        <h2 className="text-5xl md:text-7xl font-heading font-black tracking-tighter mb-8 leading-none">
                            O que muda no <span className="text-accent">Seu Bolso</span>
                        </h2>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {[
                            {
                                metric: '75%',
                                title: 'Menos Gastos',
                                desc: 'Reduza drasticamente o custo de manter equipes para tarefas que a IA faz melhor.',
                                icon: BarChart3
                            },
                            {
                                metric: '10x',
                                title: 'Mais Rapidez',
                                desc: 'O que levava semanas para ser feito, agora fica pronto em algumas horas.',
                                icon: Zap
                            },
                            {
                                metric: '100%',
                                title: 'Visão Total',
                                desc: 'Saiba exatamente o que cada centavo do seu investimento está gerando agora.',
                                icon: Search
                            },
                            {
                                metric: '∞',
                                title: 'Sem Limites',
                                desc: 'Crie quantos departamentos sua empresa precisar, sem burocracia.',
                                icon: Globe
                            }
                        ].map((item, idx) => (
                            <HighTechCard key={idx} delay={idx * 0.1} className="text-center p-12 border-white/5">
                                <div className="text-6xl md:text-8xl font-black text-white mb-6 tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{item.metric}</div>
                                <h3 className="font-bold mb-4 text-xl text-accent tracking-[0.1em] uppercase">{item.title}</h3>
                                <p className="text-dim text-sm leading-relaxed font-medium">{item.desc}</p>
                            </HighTechCard>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== FOOTER ========== */}
            <motion.footer
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 1 }}
                viewport={{ once: true }}
                className="relative py-32 px-8 flex flex-col items-center border-t border-white/5 z-10"
            >
                <Logo size="lg" variant="footer" />

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 1 }}
                    className="max-w-2xl mx-auto text-center mb-16 mt-12"
                >
                    <p className="text-base text-dim leading-relaxed font-medium mb-8">
                        <span className="text-white font-bold">IdealOS:</span>
                        A ferramenta para quem cansou de planejar e quer começar a executar. Simples, rápido e automático.
                    </p>
                </motion.div>

                <motion.button
                    onClick={onEnterApp}
                    className="mb-16 px-16 py-5 rounded-full bg-accent text-white font-black text-[10px] uppercase tracking-[0.4em] hover:scale-105 transition-all shadow-2xl shadow-accent/40"
                >
                    Entrar no Sistema
                </motion.button>

                <div className="flex flex-wrap justify-center gap-12 text-[10px] label-mono uppercase tracking-[0.4em] opacity-40 mb-16 font-bold">
                    {['Início', 'Segurança', 'Teste Grátis', 'Ajuda'].map((link, idx) => (
                        <motion.a
                            key={idx}
                            href="#"
                            whileHover={{ opacity: 1, color: '#3B82F6' }}
                            className="transition-all"
                        >
                            {link}
                        </motion.a>
                    ))}
                </div>

                <p className="text-[9px] label-mono opacity-20 tracking-[0.6em] text-center font-bold">
                    © 2026 IDEALOS. TRABALHO INTELIGENTE.
                </p>
            </motion.footer>

            {/* Global Perspective Styles */}
            <style>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                .label-mono {
                    font-family: 'JetBrains Mono', 'Fira Code', monospace;
                }
            `}</style>
        </div>
    );
};
