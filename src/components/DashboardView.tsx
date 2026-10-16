import React, { useState } from 'react';
import { 
  TrendingUp, 
  MapPin, 
  Calendar, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  ChevronRight, 
  Filter, 
  SlidersHorizontal,
  Clock,
  Car,
  ShieldCheck,
  Percent,
  Compass,
  Camera,
  Search,
  Navigation
} from 'lucide-react';
import { Category, OptimizationGoal, Promotion, UserLocation, UserPaymentMethod } from '../types/index.ts';
import { CATEGORY_LABELS } from '../data/promotions.ts';
import { calculateSavings, checkPaymentCompatibility, isPromoActiveToday } from '../utils/discount-engine.ts';
import { calculateHaversineDistance, estimateTravelTime } from '../utils/geo-distance.ts';

interface DashboardViewProps {
  promotions: Promotion[];
  userLocation: UserLocation;
  userPaymentMethods: UserPaymentMethod[];
  onOpenPromoDetail: (promo: Promotion) => void;
  onNavigateToTab: (tab: string, extraData?: any) => void;
  onOpenLocationModal: () => void;
  onOpenScanner?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  promotions,
  userLocation,
  userPaymentMethods,
  onOpenPromoDetail,
  onNavigateToTab,
  onOpenLocationModal,
  onOpenScanner,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [goal, setGoal] = useState<OptimizationGoal>('max_savings');
  const [samplePurchaseAmount, setSamplePurchaseAmount] = useState<number>(50000);

  // Evaluar promociones con la ubicación y medios de pago del usuario
  const evaluatedPromos = promotions.map((promo) => {
    const distanceKm = promo.isOnlineOnly
      ? 0
      : calculateHaversineDistance(
          userLocation.lat,
          userLocation.lng,
          promo.coordinates.lat,
          promo.coordinates.lng
        );

    const paymentStatus = checkPaymentCompatibility(promo, userPaymentMethods);
    const todayStatus = isPromoActiveToday(promo);
    const savings = calculateSavings(samplePurchaseAmount, promo, distanceKm, true);

    return {
      promo,
      distanceKm,
      paymentStatus,
      todayStatus,
      savings,
    };
  });

  // Filtrado
  const filtered = evaluatedPromos.filter((item) => {
    if (item.promo.verificationStatus === 'EXPIRED') return false;
    if (selectedCategory !== 'todas' && item.promo.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  // Ordenamiento según objetivo de optimización
  filtered.sort((a, b) => {
    switch (goal) {
      case 'max_savings':
        return b.savings.actualSavings - a.savings.actualSavings;
      case 'closest':
        return a.distanceKm - b.distanceKm;
      case 'today_only':
        if (a.todayStatus.isActive && !b.todayStatus.isActive) return -1;
        if (!a.todayStatus.isActive && b.todayStatus.isActive) return 1;
        return b.savings.actualSavings - a.savings.actualSavings;
      case 'savings_vs_travel':
      case 'min_travel':
        return b.savings.netSavingsAfterTravel - a.savings.netSavingsAfterTravel;
      case 'best_payment_combo':
        if (a.paymentStatus.isCompatible && !b.paymentStatus.isCompatible) return -1;
        if (!a.paymentStatus.isCompatible && b.paymentStatus.isCompatible) return 1;
        return b.savings.actualSavings - a.savings.actualSavings;
      default:
        return b.savings.actualSavings - a.savings.actualSavings;
    }
  });

  // Métricas agregadas del usuario
  const activeCompatibleCount = evaluatedPromos.filter((p) => p.paymentStatus.isCompatible).length;
  const availableTodayCount = evaluatedPromos.filter((p) => p.todayStatus.isActive && p.paymentStatus.isCompatible).length;
  
  const potentialWeeklySavings = evaluatedPromos
    .filter((p) => p.paymentStatus.isCompatible)
    .reduce((acc, curr) => acc + (curr.promo.maxCashback || 10000), 0);

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const todayDayIndex = new Date().getDay();

  return (
    <div className="space-y-6">
      {/* Banner de bienvenida y ubicación rápida */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1">
              <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Optimización Activa con OfertIA</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              ¿Dónde te conviene comprar hoy?
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ubicación activa: <strong className="text-slate-800 dark:text-slate-200">{userLocation.label}</strong> · {userLocation.address}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={onOpenLocationModal}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 rounded-2xl transition-colors flex items-center gap-2"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Cambiar Ubicación</span>
            </button>

            {onOpenScanner && (
              <button
                onClick={onOpenScanner}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl transition-all shadow-xs flex items-center gap-2"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Escanear Ticket</span>
              </button>
            )}

            <button
              onClick={() => onNavigateToTab('products')}
              className="px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-2xl transition-all flex items-center gap-2"
            >
              <Search className="w-3.5 h-3.5 text-emerald-600" />
              <span>Buscar Precios</span>
            </button>
            <button
              onClick={() => onNavigateToTab('savings-route')}
              className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-2xl transition-all shadow-xs flex items-center gap-2"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Mi Ruta de Ahorro</span>
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ahorro Potencial Semanal</div>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
              ${potentialWeeklySavings.toLocaleString('es-AR')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              *Topes vigentes con tus medios
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ofertas Compatibles</div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {activeCompatibleCount}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Con tus tarjetas y billeteras
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Disponibles Hoy ({dayNames[todayDayIndex]})</div>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
              {availableTodayCount} promociones
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Vigentes en este momento
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Medios de Pago</div>
            <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {userPaymentMethods.filter((m) => m.isEnabled).length} activos
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              <button
                onClick={() => onNavigateToTab('profile')}
                className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
              >
                Administrar →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Card Destacada: Mi Ruta Inteligente de Ahorro */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 border border-emerald-800/40">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
            <Sparkles className="w-4 h-4" />
            <span>Nuevo Módulo OfertIA</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Planificador Inteligente de Compras y Ruta de Ahorro
          </h2>
          <p className="text-xs text-emerald-100/90 leading-relaxed">
            Responde la pregunta central: <em>¿Qué comprar, en qué comercios, con qué medio de pago, en qué orden y qué día me conviene?</em> Optimiza simultáneamente precios, descuentos bancarios, carritos por sucursal, Google Maps y costos de traslado (Auto, Uber, Colectivo o A pie).
          </p>
        </div>

        <button
          onClick={() => onNavigateToTab('savings-route')}
          className="px-5 py-3 rounded-2xl bg-white text-emerald-950 font-extrabold text-xs hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 shadow-md shrink-0"
        >
          <Navigation className="w-4 h-4 text-emerald-700" />
          <span>Armar Mi Ruta de Ahorro</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Control Bar: Objetivos de Optimización y Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-xs font-semibold text-slate-400 mr-2 uppercase tracking-wider shrink-0">
            Priorizar:
          </span>
          <button
            onClick={() => setGoal('max_savings')}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 ${
              goal === 'max_savings'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Mayor Ahorro ($)
          </button>
          <button
            onClick={() => setGoal('closest')}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 ${
              goal === 'closest'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Más Cercanos (km)
          </button>
          <button
            onClick={() => setGoal('today_only')}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 ${
              goal === 'today_only'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Disponibles Hoy
          </button>
          <button
            onClick={() => setGoal('savings_vs_travel')}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 ${
              goal === 'savings_vs_travel'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Ahorro Neto (tras viaje)
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Ticket de referencia:
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-1 text-xs text-slate-400 font-mono">$</span>
            <input
              type="number"
              step="10000"
              value={samplePurchaseAmount}
              onChange={(e) => setSamplePurchaseAmount(Math.max(1000, Number(e.target.value) || 0))}
              className="w-28 pl-6 pr-2 py-1 text-xs font-mono font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Filtro por Categorías */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('todas')}
          className={`px-3 py-1 text-xs font-medium rounded-xl whitespace-nowrap shrink-0 border transition-all ${
            selectedCategory === 'todas'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          Todas las Categorías
        </button>
        {Object.entries(CATEGORY_LABELS).map(([catKey, info]) => {
          const isSelected = selectedCategory === catKey;
          return (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(catKey)}
              className={`px-3 py-1 text-xs font-medium rounded-xl whitespace-nowrap shrink-0 border transition-all ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {info.label}
            </button>
          );
        })}
      </div>

      {/* Lista de Recomendaciones de OfertIA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((item) => {
          const { promo, distanceKm, paymentStatus, todayStatus, savings } = item;
          const dayString = promo.applicableDays.map((d) => dayNames[d]).join(', ');
          const isCompatible = paymentStatus.isCompatible;

          return (
            <div
              key={promo.id}
              className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 flex flex-col justify-between transition-all hover:shadow-md ${
                isCompatible
                  ? 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                  : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/40 opacity-80'
              }`}
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <span className="capitalize">{CATEGORY_LABELS[promo.category]?.label || promo.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{promo.isOnlineOnly ? 'Online' : `${distanceKm} km`}</span>
                  </div>

                  <span
                    className={`font-semibold ${
                      promo.verificationStatus === 'VERIFIED'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : promo.verificationStatus === 'PARTIAL'
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {promo.verificationStatus === 'VERIFIED'
                      ? '✓ Verificada'
                      : promo.verificationStatus === 'PARTIAL'
                      ? 'Parcial'
                      : 'En revisión'}
                  </span>
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {promo.title}
                  </h2>
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                    {promo.storeName} — {promo.branchName}
                  </div>
                </div>

                {/* Respuesta a las preguntas clave */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-2 text-xs border border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-start justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Ahorro para ${samplePurchaseAmount.toLocaleString('es-AR')}:</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                      ${savings.actualSavings.toLocaleString('es-AR')}
                      {savings.isCapped && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 ml-1 font-sans">(Tope)</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-500 dark:text-slate-400">Medio requerido:</span>
                    <span className="font-semibold text-right max-w-[170px] truncate" title={promo.issuer + ' - ' + promo.paymentInstrument}>
                      {promo.issuer} ({promo.paymentInstrument})
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="text-slate-500 dark:text-slate-400">Días aplicables:</span>
                    <span className={`font-semibold ${todayStatus.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {todayStatus.isActive ? `¡Hoy ${dayNames[todayDayIndex]}!` : dayString}
                    </span>
                  </div>
                </div>

                {/* Compatibilidad */}
                <div className="text-xs">
                  {isCompatible ? (
                    <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">
                        Compatible con tu <strong>{paymentStatus.matchingMethod?.name}</strong>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-xl border border-amber-200/60 dark:border-amber-800/60">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="truncate">
                        {paymentStatus.reasons[0] || 'Incompatible con tus tarjetas actuales'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => onNavigateToTab('comparator', { promoA: promo.id, amount: samplePurchaseAmount })}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
                >
                  Comparar
                </button>

                <button
                  onClick={() => onOpenPromoDetail(promo)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1"
                >
                  <span>Ver Ficha</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
