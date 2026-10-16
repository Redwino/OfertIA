import React, { useState } from 'react';
import { 
  Sparkles, 
  Bot, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Compass, 
  Calculator, 
  Search, 
  Calendar,
  FileCheck
} from 'lucide-react';
import { MultiAgentAnalysis, Promotion, UserLocation, UserPaymentMethod } from '../types/index.ts';
import { runLocalMultiAgentPipeline } from '../utils/multi-agent-system.ts';

interface MultiAgentViewProps {
  promotions: Promotion[];
  userLocation: UserLocation;
  userPaymentMethods: UserPaymentMethod[];
  onOpenPromoDetail: (promo: Promotion) => void;
}

export const MultiAgentView: React.FC<MultiAgentViewProps> = ({
  promotions,
  userLocation,
  userPaymentMethods,
  onOpenPromoDetail,
}) => {
  const [query, setQuery] = useState('');
  const [targetAmount, setTargetAmount] = useState<number>(60000);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<MultiAgentAnalysis | null>(() => {
    // Análisis inicial por defecto con compra típica
    return runLocalMultiAgentPipeline({
      query: 'Supermercado y alimentos',
      targetAmount: 60000,
      promotions,
      userLocation,
      userPaymentMethods,
    });
  });
  const [aiVerdict, setAiVerdict] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<number | null>(null);

  const quickQueries = [
    { label: 'Supermercado semanal ($70.000)', query: 'Supermercado compra semanal', amount: 70000 },
    { label: 'Llenar tanque de nafta ($45.000)', query: 'Combustible y nafta', amount: 45000 },
    { label: 'Farmacia y cuidado personal ($30.000)', query: 'Farmacia y perfumería', amount: 30000 },
    { label: 'Cena o salida gastronómica ($35.000)', query: 'Restaurante y cena', amount: 35000 },
    { label: 'Ropa o calzado en Shopping ($90.000)', query: 'Indumentaria y zapatillas', amount: 90000 },
  ];

  const handleRunQuery = async (customQuery?: string, customAmount?: number) => {
    const q = customQuery ?? query;
    const amt = customAmount ?? targetAmount;
    if (!q.trim()) return;

    setLoading(true);
    setAiVerdict(null);

    // 1. Ejecutar análisis determinista en el cliente
    const deterministic = runLocalMultiAgentPipeline({
      query: q,
      targetAmount: amt,
      promotions,
      userLocation,
      userPaymentMethods,
    });
    setAnalysis(deterministic);

    // 2. Intentar consultar el endpoint del backend para síntesis de Gemini
    try {
      const res = await fetch('/api/agent-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          userContext: {
            locationLabel: userLocation.label,
            activePaymentCount: userPaymentMethods.filter((m) => m.isEnabled).length,
            amount: amt,
          },
          deterministicData: deterministic,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.aiVerdict) {
          setAiVerdict(data.aiVerdict);
        }
      }
    } catch (err) {
      console.warn('Backend Gemini no disponible, usando análisis determinista:', err);
    } finally {
      setLoading(false);
    }
  };

  const agentIcons = [
    Search,      // Agente 1: Investigador
    FileCheck,   // Agente 2: Verificador
    Calculator,  // Agente 3: Analista financiero
    Compass,     // Agente 4: Especialista geográfico
    Calendar,    // Agente 5: Planificador
    ShieldCheck, // Agente 6: Auditor
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Sistema Multiagente de IA Coordinada</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          6 Agentes Especializados Trabajando en tu Ahorro
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Consulta cualquier necesidad de compra cotidiana. Cada agente se encarga de una tarea precisa (investigar, verificar condiciones, calcular números exactos, medir distancias y auditar inconsistencias).
        </p>

        {/* Barra de Consulta Interactiva */}
        <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-3 relative">
              <input
                type="text"
                placeholder="¿Qué necesitas comprar? (Ej: Supermercado Coto con Santander, Llenar el tanque, etc.)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunQuery()}
                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-xs font-mono text-slate-400">$</span>
                <input
                  type="number"
                  step="5000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(Math.max(1, Number(e.target.value) || 0))}
                  placeholder="Monto"
                  className="w-full pl-7 pr-3 py-3 text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Consultas Rápidas */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] text-slate-400 font-medium shrink-0">Ejemplos:</span>
              {quickQueries.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setQuery(item.query);
                    setTargetAmount(item.amount);
                    handleRunQuery(item.query, item.amount);
                  }}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleRunQuery()}
              disabled={loading}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              <Bot className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Coordinando Agentes...' : 'Consultar Agentes'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Veredicto del Agente Coordinador */}
      {analysis && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  Agente Coordinador: Veredicto Consolidado
                </h2>
                <div className="text-[11px] text-slate-400">
                  Síntesis ejecutiva respaldada por los 6 agentes especializados
                </div>
              </div>
            </div>

            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-0.5 rounded-full">
              Auditoría Aprobada
            </span>
          </div>

          {/* Veredicto IA o Determinista */}
          <div className="text-sm text-slate-200 leading-relaxed space-y-3">
            {aiVerdict ? (
              <div className="whitespace-pre-line font-normal bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
                {aiVerdict}
              </div>
            ) : (
              <p className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 text-slate-200">
                {analysis.executiveSummary}
              </p>
            )}

            {analysis.primaryRecommendation && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700">
                  <div className="text-slate-400">Comercio Recomendado</div>
                  <div className="font-bold text-white mt-0.5">{analysis.primaryRecommendation.storeName}</div>
                </div>

                <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700">
                  <div className="text-slate-400">Día Óptimo</div>
                  <div className="font-bold text-emerald-400 mt-0.5">{analysis.primaryRecommendation.dayToBuy}</div>
                </div>

                <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700">
                  <div className="text-slate-400">Medio a Usar</div>
                  <div className="font-bold text-white mt-0.5 truncate">{analysis.primaryRecommendation.paymentMethod}</div>
                </div>

                <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700">
                  <div className="text-slate-400">Ahorro Neto Real</div>
                  <div className="font-bold font-mono text-emerald-400 text-sm mt-0.5">
                    ${analysis.primaryRecommendation.netSavingsAfterTravel.toLocaleString('es-AR')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Traza de Trabajo de los 6 Agentes Especializados */}
      {analysis && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Desglose de Trabajo por Especialidad ({analysis.steps.length} Agentes)
            </h2>
            <span className="text-xs text-slate-500">
              Clic en cualquier agente para ver su razonamiento interno
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {analysis.steps.map((step, idx) => {
              const Icon = agentIcons[idx] || Bot;
              const isExpanded = expandedAgent === idx;

              return (
                <div
                  key={step.agentName}
                  className="bg-white border border-slate-200 rounded-2xl p-4.5 transition-all hover:border-slate-300 shadow-xs"
                >
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpandedAgent(isExpanded ? null : idx)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-emerald-700" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {step.agentName}
                        </div>
                        <div className="text-[11px] text-slate-500">{step.role}</div>
                      </div>
                    </div>

                    <button className="text-slate-400 hover:text-slate-600 p-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="mt-3 text-xs text-slate-700 font-medium">
                    {step.summary}
                  </div>

                  {/* Detalles expandidos del agente */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                      {step.details.map((d, dIdx) => (
                        <div key={dIdx} className="leading-relaxed">
                          {d}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
