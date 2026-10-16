import React, { useState, useMemo } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  InfoWindow, 
  Pin 
} from '@vis.gl/react-google-maps';
import { 
  Navigation, 
  MapPin, 
  Car, 
  Calendar, 
  Clock, 
  DollarSign, 
  ShoppingBag, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Layers, 
  SlidersHorizontal, 
  Search, 
  TrendingUp, 
  Check, 
  FileSpreadsheet, 
  Compass, 
  ArrowUpDown, 
  Footprints, 
  Bike, 
  Bus, 
  ShieldCheck, 
  Percent, 
  Flame, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw 
} from 'lucide-react';
import { 
  Category, 
  DayPlanningMode, 
  GeoPoint, 
  Promotion, 
  RouteShoppingItem, 
  RouteStrategy, 
  SavingsRoutePlan, 
  StoreCart, 
  TransportMode, 
  TransportSettings, 
  UserAccount, 
  UserLocation, 
  UserPaymentMethod 
} from '../types/index.ts';
import { 
  DEFAULT_TRANSPORT_SETTINGS, 
  KNOWN_STORE_BRANCHES, 
  optimizeSavingsRoute 
} from '../utils/savings-route-engine.ts';
import { CATALOG_PRODUCTS } from '../data/products.ts';
import { createSavingsCalendarEvent } from '../services/google-calendar.ts';
import { exportPurchasesToSheets } from '../services/google-sheets.ts';

interface SavingsRouteViewProps {
  userLocation: UserLocation;
  promotions: Promotion[];
  userPaymentMethods: UserPaymentMethod[];
  currentUser: UserAccount;
  onOpenAuthModal: () => void;
  onOpenLocationModal: () => void;
  initialCartItems?: { name: string; quantity: number; category: Category; referencePrice?: number }[];
}

export const SavingsRouteView: React.FC<SavingsRouteViewProps> = ({
  userLocation,
  promotions,
  userPaymentMethods,
  currentUser,
  onOpenAuthModal,
  onOpenLocationModal,
  initialCartItems = [],
}) => {
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Canasta inicial inteligente con productos habituales de la compra del mes/semana
  const [shoppingList, setShoppingList] = useState<RouteShoppingItem[]>(() => {
    if (initialCartItems && initialCartItems.length > 0) {
      return initialCartItems.map((item, idx) => ({
        id: `init-${idx}`,
        name: item.name,
        category: item.category || 'supermercados',
        quantity: item.quantity || 1,
        unit: 'un',
        referencePrice: item.referencePrice,
      }));
    }
    return [
      {
        id: 'prod-leche',
        name: 'Leche Entera Clásica La Serenísima 1L',
        category: 'supermercados',
        quantity: 4,
        unit: 'l',
        referencePrice: 1580,
      },
      {
        id: 'prod-yerba',
        name: 'Yerba Mate Tradicional Playadito 1kg',
        category: 'supermercados',
        quantity: 2,
        unit: 'kg',
        referencePrice: 4600,
      },
      {
        id: 'prod-aceite',
        name: 'Aceite Puro de Girasol Cocinero 1.5L',
        category: 'supermercados',
        quantity: 2,
        unit: 'l',
        referencePrice: 2850,
      },
      {
        id: 'prod-fideos',
        name: 'Fideos Spaghetti Matarazzo 500g',
        category: 'supermercados',
        quantity: 3,
        unit: 'un',
        referencePrice: 1720,
      },
      {
        id: 'prod-cafe',
        name: 'Café Tostado Molido La Virginia 500g',
        category: 'supermercados',
        quantity: 1,
        unit: 'un',
        referencePrice: 5900,
      },
    ];
  });

  // Configuración de planificación y transporte
  const [planningMode, setPlanningMode] = useState<DayPlanningMode>('best_day_week');
  const [specificDate, setSpecificDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [maxStoresCount, setMaxStoresCount] = useState<number>(2);
  const [strategy, setStrategy] = useState<RouteStrategy>('smart_balance');
  const [transportSettings, setTransportSettings] = useState<TransportSettings>(DEFAULT_TRANSPORT_SETTINGS);
  const [showTransportConfig, setShowTransportConfig] = useState<boolean>(false);
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');

  // Parada seleccionada en el mapa para InfoWindow
  const [selectedMarkerCart, setSelectedMarkerCart] = useState<StoreCart | null>(null);

  // Estados de integración Google Workspace (Calendar & Sheets)
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState<boolean>(false);
  const [calendarSchedulingStatus, setCalendarSchedulingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [calendarStatusMessage, setCalendarStatusMessage] = useState<string>('');
  const [eventTime, setEventTime] = useState<string>('18:00');

  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);
  const [sheetsExportStatus, setSheetsExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [sheetsStatusMessage, setSheetsStatusMessage] = useState<string>('');
  const [createdSheetUrl, setCreatedSheetUrl] = useState<string>('');

  // Origen de coordenadas
  const originGeo: GeoPoint = useMemo(() => ({
    lat: userLocation.lat,
    lng: userLocation.lng,
    address: userLocation.address,
    neighborhood: userLocation.neighborhood,
    city: userLocation.city,
  }), [userLocation]);

  // Ejecución del motor determinista de optimización de ruta
  const routePlan: SavingsRoutePlan = useMemo(() => {
    return optimizeSavingsRoute({
      origin: originGeo,
      shoppingList,
      promotions,
      userPaymentMethods,
      transportSettings,
      planningMode,
      targetDate: specificDate,
      maxStoresCount,
      strategy,
    });
  }, [
    originGeo,
    shoppingList,
    promotions,
    userPaymentMethods,
    transportSettings,
    planningMode,
    specificDate,
    maxStoresCount,
    strategy,
  ]);

  // Manejadores para la canasta de compras
  const handleUpdateItemQuantity = (id: string, delta: number) => {
    setShoppingList((prev) => 
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as RouteShoppingItem[]
    );
  };

  const handleRemoveItem = (id: string) => {
    setShoppingList((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddCatalogProduct = (catalogProd: typeof CATALOG_PRODUCTS[0]) => {
    setShoppingList((prev) => {
      const existing = prev.find((p) => p.name.toLowerCase() === catalogProd.name.toLowerCase());
      if (existing) {
        return prev.map((p) => p.id === existing.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [
        ...prev,
        {
          id: `prod-${Date.now()}-${Math.random()}`,
          name: `${catalogProd.name} ${catalogProd.brand} ${catalogProd.presentation}`,
          category: catalogProd.category,
          quantity: 1,
          unit: catalogProd.unit,
          referencePrice: catalogProd.averageObservedPrice,
        },
      ];
    });
    setProductSearchQuery('');
  };

  const handleAddCustomProduct = () => {
    if (!productSearchQuery.trim()) return;
    setShoppingList((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: productSearchQuery.trim(),
        category: 'supermercados',
        quantity: 1,
        unit: 'un',
        referencePrice: 2500,
      },
    ]);
    setProductSearchQuery('');
  };

  // Sugerencias de productos rápidos
  const quickPicks = [
    { name: 'Leche La Serenísima 1L', ref: 1580, cat: 'supermercados' },
    { name: 'Yerba Playadito 1kg', ref: 4600, cat: 'supermercados' },
    { name: 'Café La Virginia 500g', ref: 5900, cat: 'supermercados' },
    { name: 'Aceite Cocinero 1.5L', ref: 2850, cat: 'supermercados' },
    { name: 'Arroz Gallo Oro 1kg', ref: 2200, cat: 'supermercados' },
    { name: 'Detergente Magistral 500ml', ref: 2600, cat: 'supermercados' },
    { name: 'Pañales Pampers Premium', ref: 18500, cat: 'supermercados' },
  ];

  // Resultados de búsqueda en catálogo
  const filteredCatalog = useMemo(() => {
    if (!productSearchQuery.trim()) return [];
    const q = productSearchQuery.toLowerCase();
    return CATALOG_PRODUCTS.filter((cp) => 
      cp.name.toLowerCase().includes(q) || cp.brand.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [productSearchQuery]);

  // Manejo de agendamiento en Google Calendar
  const handleConfirmCalendarSchedule = async () => {
    if (!currentUser.isAuthenticated) {
      onOpenAuthModal();
      return;
    }

    setCalendarSchedulingStatus('loading');
    setCalendarStatusMessage('');

    try {
      const summary = `Compras OfertIA (${routePlan.storeCarts.length} comercios) - Ahorro estimado $${routePlan.totalNetSavings.toLocaleString('es-AR')}`;
      const descriptionLines = [
        `Ruta Inteligente de Ahorro OfertIA:`,
        `- Ahorro Neto Proyectado: $${routePlan.totalNetSavings.toLocaleString('es-AR')}`,
        `- Ahorro Bruto: $${routePlan.totalGrossSavings.toLocaleString('es-AR')}`,
        `- Costo de Traslado estimado: $${routePlan.totalTransportCost.toLocaleString('es-AR')} (${routePlan.transportModeDetails})`,
        `- Distancia total: ${routePlan.totalDistanceKm} km (${routePlan.totalTripMinutes} min estimados)`,
        ``,
        `Paradas y Carritos:`,
        ...routePlan.storeCarts.map((c, idx) => 
          `${idx + 1}. ${c.storeName} (${c.branchName}) - Pagar con: ${c.recommendedPaymentMethod?.name || 'Cualquiera'} (Total: $${c.netPayable.toLocaleString('es-AR')}) - ${c.items.length} productos`
        ),
      ];

      const startTimeIso = `${routePlan.date}T${eventTime}:00`;
      const [hours, mins] = eventTime.split(':').map(Number);
      const endHours = Math.min(23, hours + Math.ceil(routePlan.totalTripMinutes / 60));
      const endTimeIso = `${routePlan.date}T${String(endHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;

      const result = await createSavingsCalendarEvent({
        summary,
        description: descriptionLines.join('\n'),
        location: routePlan.storeCarts[0]?.address || userLocation.address,
        startTime: startTimeIso,
        endTime: endTimeIso,
      });

      setCalendarSchedulingStatus('success');
      setCalendarStatusMessage(`¡Ruta agendada exitosamente en Google Calendar! Evento ID: ${result.id.slice(0, 8)}...`);
      setTimeout(() => {
        setIsCalendarModalOpen(false);
        setCalendarSchedulingStatus('idle');
      }, 2500);
    } catch (err: any) {
      setCalendarSchedulingStatus('error');
      setCalendarStatusMessage(err.message || 'Error al conectar con Google Calendar.');
    }
  };

  // Manejo de exportación a Google Sheets
  const handleConfirmSheetsExport = async () => {
    if (!currentUser.isAuthenticated) {
      onOpenAuthModal();
      return;
    }

    setSheetsExportStatus('loading');
    setSheetsStatusMessage('');

    try {
      // Convertir los carritos en registros de compra proyectados
      const recordsToExport = routePlan.storeCarts.map((cart, idx) => ({
        id: `plan-${cart.storeId}-${idx}`,
        date: routePlan.date,
        storeName: `${cart.storeName} - ${cart.branchName}`,
        category: 'supermercados' as Category,
        paymentMethodUsed: cart.recommendedPaymentMethod?.name || 'Efectivo / Débito',
        amountSpent: cart.itemsSubtotal,
        estimatedSavings: cart.actualSavings,
        actualSavings: cart.actualSavings,
        verifiedStatus: 'CONFIRMED' as const,
        notes: `Ruta de ahorro ${routePlan.date} (${cart.items.length} productos). Transporte asignado: $${cart.proratedTransportCost.toLocaleString('es-AR')}. Ahorro neto comercio: $${cart.netSavings.toLocaleString('es-AR')}.`,
        itemsCount: cart.items.length,
      }));

      const result = await exportPurchasesToSheets(
        recordsToExport,
        `OfertIA - Plan de Compras y Ruta de Ahorro (${routePlan.date})`
      );

      setSheetsExportStatus('success');
      setCreatedSheetUrl(result.spreadsheetUrl);
      setSheetsStatusMessage(`¡Planilla creada exitosamente en Google Drive!`);
    } catch (err: any) {
      setSheetsExportStatus('error');
      setSheetsStatusMessage(err.message || 'Error al crear la planilla en Google Sheets.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header y Titular de la Ruta */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1">
              <Navigation className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Asistente Inteligente de Recorridos de Compra</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Mi Ruta de Ahorro
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Optimiza simultáneamente precios, descuentos bancarios, topes de reintegro, distancias y gastos de traslado para lograr el máximo ahorro neto real.
            </p>
          </div>

          {/* Quick Origin Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenLocationModal}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 rounded-2xl transition-colors flex items-center gap-2"
              title="Cambiar punto de partida"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Salida: <strong className="text-slate-900 dark:text-white">{userLocation.label}</strong></span>
            </button>

            <button
              onClick={() => setShowTransportConfig(!showTransportConfig)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-2xl transition-colors flex items-center gap-2 border ${
                showTransportConfig 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200/80'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Transporte: <strong className="capitalize">{transportSettings.mode}</strong></span>
            </button>
          </div>
        </div>

        {/* Panel Desplegable de Configuración de Transporte */}
        {showTransportConfig && (
          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Car className="w-4 h-4 text-emerald-600" />
                Configuración del Medio de Desplazamiento
              </h3>
              <span className="text-[11px] text-slate-500">Ahorro Neto = Ahorro Bruto - Costo de Traslado</span>
            </div>

            {/* Selector de Modos de Transporte */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'car', label: 'Auto Propio', icon: Car },
                { id: 'uber', label: 'Uber / Contratado', icon: DollarSign },
                { id: 'transit', label: 'Colectivo / Subte', icon: Bus },
                { id: 'bike', label: 'Bicicleta ($0)', icon: Bike },
                { id: 'walk', label: 'A Pie ($0)', icon: Footprints },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = transportSettings.mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setTransportSettings({ ...transportSettings, mode: m.id as TransportMode })}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-2" />
                    <span className="text-xs font-semibold">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Parámetros Específicos según modo */}
            {transportSettings.mode === 'car' && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Consumo (L/100km)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="4"
                    max="20"
                    value={transportSettings.carConsumptionL100km}
                    onChange={(e) => setTransportSettings({ ...transportSettings, carConsumptionL100km: Number(e.target.value) || 8.5 })}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Precio Nafta ($/L)
                  </label>
                  <input
                    type="number"
                    step="50"
                    value={transportSettings.fuelPricePerLiter}
                    onChange={(e) => setTransportSettings({ ...transportSettings, fuelPricePerLiter: Number(e.target.value) || 1150 })}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Estacionamiento ($)
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={transportSettings.parkingFee}
                    onChange={(e) => setTransportSettings({ ...transportSettings, parkingFee: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Presupuesto Máx Transporte ($)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={transportSettings.maxTransportBudget}
                    onChange={(e) => setTransportSettings({ ...transportSettings, maxTransportBudget: Number(e.target.value) || 8000 })}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>
            )}

            {transportSettings.mode === 'transit' && (
              <div className="pt-2">
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Costo de Boleto Colectivo / Subte ($ por viaje)
                </label>
                <input
                  type="number"
                  step="50"
                  value={transportSettings.transitFarePerTrip}
                  onChange={(e) => setTransportSettings({ ...transportSettings, transitFarePerTrip: Number(e.target.value) || 450 })}
                  className="w-48 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            )}
          </div>
        )}

        {/* Selector de Día y Parámetros Principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          {/* Col 1: Fecha de Compra */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              ¿Cuándo quieres comprar?
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setPlanningMode('best_day_week')}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all ${
                  planningMode === 'best_day_week'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-800 dark:text-emerald-300 font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                ⭐ Mejor Día de la Semana
              </button>
              <button
                onClick={() => setPlanningMode('today')}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all ${
                  planningMode === 'today'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-800 dark:text-emerald-300 font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                Hoy
              </button>
              <button
                onClick={() => setPlanningMode('tomorrow')}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all ${
                  planningMode === 'tomorrow'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-800 dark:text-emerald-300 font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                Mañana
              </button>
              <button
                onClick={() => setPlanningMode('specific_date')}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all ${
                  planningMode === 'specific_date'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-800 dark:text-emerald-300 font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                Fecha fija
              </button>
            </div>
            {planningMode === 'specific_date' && (
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            )}
          </div>

          {/* Col 2: Cantidad Máxima de Comercios */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
              Límite de Comercios a Visitar
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { count: 1, label: '1 súper (Rápido)' },
                { count: 2, label: '2 comercios (Equilibrio)' },
                { count: 3, label: '3 comercios (Máx ahorro)' },
              ].map((opt) => (
                <button
                  key={opt.count}
                  onClick={() => setMaxStoresCount(opt.count)}
                  className={`px-2.5 py-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                    maxStoresCount === opt.count
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              {maxStoresCount === 1 
                ? 'Compara dónde comprar todo en un único lugar.' 
                : 'Distribuye los artículos en carritos separados por comercio.'}
            </p>
          </div>

          {/* Col 3: Enfoque Estratégico */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              Estrategia de Optimización
            </label>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setStrategy('smart_balance')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border text-left transition-all ${
                  strategy === 'smart_balance'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-800 dark:text-emerald-300 font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                ⚖️ Equilibrio Inteligente (Ahorro vs Distancia)
              </button>
              <button
                onClick={() => setStrategy('max_savings')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border text-left transition-all ${
                  strategy === 'max_savings'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-800 dark:text-emerald-300 font-bold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                💰 Máximo Ahorro Financiero (Sin importar paradas)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Resumen Ejecutivo de Métricas y Veredicto */}
      <div className="bg-gradient-to-br from-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
                <Sparkles className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-emerald-200">
                  Plan Óptimo para {routePlan.dayName} ({routePlan.date})
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Ahorro Neto: ${routePlan.totalNetSavings.toLocaleString('es-AR')}
                </h2>
              </div>
            </div>

            {/* Badges de Estado */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700/80 border border-emerald-400/40 text-emerald-100 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {routePlan.totalTripMinutes} min ({routePlan.totalTravelMinutes}m viaje + {routePlan.totalInStoreMinutes}m súper)
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700/80 border border-emerald-400/40 text-emerald-100 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {routePlan.totalDistanceKm} km total
              </span>
            </div>
          </div>

          {/* Veredicto de Inteligencia */}
          <div className="p-3.5 bg-black/20 rounded-2xl border border-white/10 backdrop-blur-xs text-xs sm:text-sm text-emerald-50 leading-relaxed">
            {routePlan.recommendationVerdict}
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/10">
              <div className="text-[11px] text-emerald-200">Total en Carritos</div>
              <div className="text-lg font-bold font-mono mt-0.5">
                ${routePlan.totalCartGrossAmount.toLocaleString('es-AR')}
              </div>
              <div className="text-[10px] text-emerald-300/80">
                {routePlan.totalProductsCount} artículos
              </div>
            </div>

            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/10">
              <div className="text-[11px] text-emerald-200">Ahorro Bruto</div>
              <div className="text-lg font-bold font-mono text-emerald-300 mt-0.5">
                +${routePlan.totalGrossSavings.toLocaleString('es-AR')}
              </div>
              <div className="text-[10px] text-emerald-300/80">Descuentos y promos</div>
            </div>

            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/10">
              <div className="text-[11px] text-emerald-200">Gasto de Traslado</div>
              <div className="text-lg font-bold font-mono text-amber-200 mt-0.5">
                -${routePlan.totalTransportCost.toLocaleString('es-AR')}
              </div>
              <div className="text-[10px] text-amber-300/80 truncate">
                {transportSettings.mode.toUpperCase()} ({routePlan.transportBudgetPercent}% presup.)
              </div>
            </div>

            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/10">
              <div className="text-[11px] text-emerald-200">Comercios a Visitar</div>
              <div className="text-lg font-bold font-mono mt-0.5">
                {routePlan.storeCarts.length} sucursal{routePlan.storeCarts.length === 1 ? '' : 'es'}
              </div>
              <div className="text-[10px] text-emerald-300/80">Orden optimizado</div>
            </div>
          </div>

          {/* Botones de Acción de Integración Real */}
          <div className="flex items-center gap-2.5 flex-wrap pt-3 border-t border-white/10">
            {/* Google Maps Real Button */}
            <a
              href={routePlan.googleMapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-2xl bg-white text-emerald-900 font-bold text-xs hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-sm"
            >
              <Navigation className="w-4 h-4 text-emerald-700" />
              <span>Abrir Recorrido en Google Maps</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            {/* Uber Deep Link Button */}
            <a
              href={routePlan.uberDeepLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-2xl bg-black text-white font-bold text-xs hover:bg-slate-900 transition-all flex items-center gap-2 shadow-sm border border-white/20"
            >
              <Car className="w-4 h-4 text-white" />
              <span>Pedir Uber a la 1ª Parada</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            {/* Google Calendar Schedule Modal Trigger */}
            <button
              onClick={() => setIsCalendarModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-xs transition-all flex items-center gap-2 border border-white/20"
            >
              <Calendar className="w-4 h-4 text-white" />
              <span>Agendar en Google Calendar</span>
            </button>

            {/* Google Sheets Export Modal Trigger */}
            <button
              onClick={() => setIsSheetsModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs transition-all flex items-center gap-2 border border-white/20"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              <span>Exportar a Google Sheets</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Proyección Semanal: ¿Qué día me conviene comprar? */}
      {routePlan.weekDaysComparison && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Comparativa de Ahorro por Día de la Semana
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Proyección de Descuentos con tus Medios de Pago
              </h3>
            </div>
            <span className="text-xs text-slate-500">Haz clic en un día para seleccionarlo</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {routePlan.weekDaysComparison.map((day) => {
              const isCurrentDayPlan = routePlan.dayIndex === day.dayIndex;
              return (
                <button
                  key={day.dayIndex}
                  onClick={() => {
                    setPlanningMode('specific_date');
                    setSpecificDate(day.dateStr);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                    isCurrentDayPlan
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                  }`}
                >
                  {day.isBestDay && (
                    <span className="absolute -top-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                      Óptimo
                    </span>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {day.dayName}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {day.dateStr.slice(5)}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-[10px] text-slate-500">Ahorro Neto:</div>
                    <div className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">
                      ${day.netSavings.toLocaleString('es-AR')}
                    </div>
                    <div className="text-[9px] text-slate-400 truncate mt-1" title={day.highlights}>
                      {day.highlights}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Mapa Interactivo Google Maps + Lista de Paradas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Mapa Interactivo Google Maps (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Mapa del Recorrido con Google Maps
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              {routePlan.storeCarts.length} parada{routePlan.storeCarts.length === 1 ? '' : 's'} programada{routePlan.storeCarts.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Contenedor del Mapa */}
          <div className="relative w-full h-[380px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
            {mapsApiKey ? (
              <APIProvider apiKey={mapsApiKey}>
                <Map
                  defaultCenter={{ lat: originGeo.lat, lng: originGeo.lng }}
                  defaultZoom={13}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  className="w-full h-full"
                  internalUsageAttributionIds={['gmp-ais-react-sc']}
                >
                  {/* Marcador de Origen del Usuario */}
                  <AdvancedMarker
                    position={{ lat: originGeo.lat, lng: originGeo.lng }}
                    title={`Origen: ${originGeo.address}`}
                  >
                    <div className="px-2.5 py-1 bg-blue-600 text-white text-[11px] font-bold rounded-full shadow-md flex items-center gap-1 border-2 border-white">
                      <span>🏠</span>
                      <span>Salida</span>
                    </div>
                  </AdvancedMarker>

                  {/* Marcadores de Paradas en Comercios */}
                  {routePlan.storeCarts.map((cart, idx) => (
                    <AdvancedMarker
                      key={cart.storeId}
                      position={{ lat: cart.coordinates.lat, lng: cart.coordinates.lng }}
                      onClick={() => setSelectedMarkerCart(cart)}
                      title={`${idx + 1}. ${cart.storeName}`}
                    >
                      <div className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-full shadow-md flex items-center gap-1.5 border-2 border-white hover:scale-105 transition-transform cursor-pointer">
                        <span className="w-4 h-4 rounded-full bg-white text-emerald-700 flex items-center justify-center text-[10px] font-black">
                          {idx + 1}
                        </span>
                        <span className="truncate max-w-[100px]">{cart.storeName}</span>
                      </div>
                    </AdvancedMarker>
                  ))}

                  {/* InfoWindow al hacer clic en un comercio */}
                  {selectedMarkerCart && (
                    <InfoWindow
                      position={{ lat: selectedMarkerCart.coordinates.lat, lng: selectedMarkerCart.coordinates.lng }}
                      onCloseClick={() => setSelectedMarkerCart(null)}
                    >
                      <div className="p-2 text-slate-900 max-w-xs">
                        <div className="font-bold text-xs">{selectedMarkerCart.storeName}</div>
                        <div className="text-[11px] text-slate-600">{selectedMarkerCart.branchName}</div>
                        <div className="text-[10px] text-slate-500 mt-1">{selectedMarkerCart.address}</div>
                        <div className="text-[10px] text-emerald-700 font-semibold mt-1">
                          {selectedMarkerCart.items.length} productos asignados · ${selectedMarkerCart.netPayable.toLocaleString('es-AR')}
                        </div>
                        {selectedMarkerCart.recommendedPaymentMethod && (
                          <div className="text-[10px] text-slate-700 mt-0.5">
                            Pagar con: <strong>{selectedMarkerCart.recommendedPaymentMethod.name}</strong>
                          </div>
                        )}
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${originGeo.lat},${originGeo.lng}&destination=${selectedMarkerCart.coordinates.lat},${selectedMarkerCart.coordinates.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <span>Cómo llegar</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <Navigation className="w-10 h-10 text-emerald-600 mb-2" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Visualización Geográfica de Paradas
                </h4>
                <p className="text-xs text-slate-500 max-w-md mt-1">
                  Google Maps Platform está configurado con tus credenciales. Puedes abrir el recorrido oficial directamente con un clic.
                </p>
                <a
                  href={routePlan.googleMapsDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Ver Recorrido Completo en Google Maps</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Itinerario de Paradas Ordenadas (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ArrowUpDown className="w-4 h-4 text-emerald-600" />
                Orden de Visitas Optimizado
              </h3>
              <span className="text-[11px] text-slate-500">Ruta más corta</span>
            </div>

            <div className="space-y-3">
              {/* Punto de Inicio */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  🏠
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    Origen: {originGeo.address || 'Mi Ubicación'}
                  </div>
                  <div className="text-[11px] text-slate-500">Punto de partida y retorno</div>
                </div>
              </div>

              {/* Paradas en Comercios */}
              {routePlan.storeCarts.map((cart, idx) => (
                <div
                  key={cart.storeId}
                  className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 relative group"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {cart.storeName}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ${cart.netPayable.toLocaleString('es-AR')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{cart.branchName}</div>
                    
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span>{cart.distanceFromPrevKm} km ({cart.travelTimeFromPrevMinutes} min)</span>
                      <span>·</span>
                      <span>{cart.items.length} productos</span>
                    </div>

                    {cart.recommendedPaymentMethod && (
                      <div className="mt-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md inline-block font-medium">
                        💳 {cart.recommendedPaymentMethod.name} ({cart.appliedPromotion?.discountPercentage || 0}%)
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botón de recálculo rápido */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <a
              href={routePlan.googleMapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <Navigation className="w-4 h-4" />
              <span>Navegar Ruta en Google Maps</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          </div>
        </div>
      </div>

      {/* 5. Carritos Separados por Comercio */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4" />
              Carritos Independientes por Comercio
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              ¿Qué comprar exactamente en cada lugar?
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Cada producto asignado a su sucursal más conveniente
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {routePlan.storeCarts.map((cart, idx) => (
            <div
              key={cart.storeId}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                {/* Cabecera del Comercio */}
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {cart.storeName}
                      </h4>
                      <p className="text-xs text-slate-500">{cart.branchName} · {cart.address}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{cart.openingHours || 'Horario habitual'}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-400">Total a Pagar</div>
                    <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                      ${cart.netPayable.toLocaleString('es-AR')}
                    </div>
                    {cart.actualSavings > 0 && (
                      <div className="text-[11px] text-emerald-600 font-semibold font-mono">
                        Ahorro: -${cart.actualSavings.toLocaleString('es-AR')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Medio de Pago Recomendado y Alerta de Tope */}
                <div className="my-4 p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      💳 Medio de Pago Recomendado:
                    </span>
                    {cart.appliedPromotion && (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                        -{cart.appliedPromotion.discountPercentage}% OFF
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white mt-1">
                    {cart.recommendedPaymentMethod?.name || 'Cualquier medio de pago'}
                  </div>

                  {cart.appliedPromotion?.maxCashback ? (
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <span>Tope de reintegro: ${cart.appliedPromotion.maxCashback.toLocaleString('es-AR')}</span>
                      {cart.isCapReached && (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">· ¡Tope alcanzado!</span>
                      )}
                    </div>
                  ) : null}

                  {/* Alerta de División de Pagos en la misma caja */}
                  {cart.splitRecommendation && cart.splitRecommendation.recommended && (
                    <div className="mt-2.5 p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300">
                      <strong>💡 OfertIA Split:</strong> {cart.splitRecommendation.reasoning}
                    </div>
                  )}
                </div>

                {/* Lista de Productos del Carrito */}
                <div className="space-y-2 mt-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Productos en este carrito ({cart.items.length})
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cart.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-3">
                          <div className="font-semibold text-slate-900 dark:text-white truncate">
                            {item.product.name}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Cant: <strong>{item.quantity}</strong></span>
                            <span>·</span>
                            <span>Unit: ${item.unitPrice.toLocaleString('es-AR')}</span>
                            <span>·</span>
                            <span className="text-emerald-700 dark:text-emerald-400">{item.priceSource}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            ${item.subtotal.toLocaleString('es-AR')}
                          </div>
                          {item.savings > 0 && (
                            <div className="text-[10px] font-mono text-emerald-600 font-semibold">
                              Ahorras ${item.savings.toLocaleString('es-AR')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pie del Carrito con Subtotales */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal bruto:</span>
                  <span className="font-mono">${cart.itemsSubtotal.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Descuento aplicado:</span>
                  <span className="font-mono">-${cart.discountAmount.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Transporte imputado:</span>
                  <span className="font-mono">-${cart.proratedTransportCost.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 text-sm">
                  <span>Ahorro neto en este comercio:</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    ${cart.netSavings.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Matriz Comparativa: Multi-Comercio vs Comprar TODO en 1 Solo Lugar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              Comparativa de Ahorro Neto
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              ¿Vale la pena visitar varios comercios o comprar todo en uno?
            </h3>
          </div>
          <span className="text-xs text-slate-500">Considera gasto de traslado y tiempo</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Opción 1: Ruta Multi-Comercio Ganadora */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border-2 border-emerald-500 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                  Recomendado
                </span>
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  {routePlan.storeCarts.length} Comercios
                </span>
              </div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white mt-2">
                Ruta Optimizada OfertIA
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Distribuye los productos donde rinde más cada promoción y tope.
              </p>

              <div className="space-y-1.5 mt-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ahorro Bruto:</span>
                  <span className="font-mono font-bold text-emerald-600">+${routePlan.totalGrossSavings.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Costo Transporte:</span>
                  <span className="font-mono text-amber-600">-${routePlan.totalTransportCost.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-sm font-black pt-1 border-t border-emerald-200 dark:border-emerald-800">
                  <span className="text-emerald-900 dark:text-emerald-200">Ahorro Neto Final:</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-300">${routePlan.totalNetSavings.toLocaleString('es-AR')}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold bg-emerald-100/60 dark:bg-emerald-900/60 p-2 rounded-xl">
              ✓ Mayor beneficio neto en tu bolsillo
            </div>
          </div>

          {/* Opciones Monocomercio */}
          {routePlan.singleStoreComparisons.slice(0, 2).map((comp, compIdx) => (
            <div
              key={compIdx}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                    1 Solo Comercio
                  </span>
                  <span className="text-xs text-slate-500">1 Parada</span>
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white mt-2">
                  Todo en {comp.storeName}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Comprar la canasta completa en esta cadena.
                </p>

                <div className="space-y-1.5 mt-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ahorro Bruto:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">+${comp.discountAmount.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Costo Transporte:</span>
                    <span className="font-mono text-amber-600">-${comp.transportCost.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-800 dark:text-slate-200">Ahorro Neto:</span>
                    <span className="font-mono text-slate-900 dark:text-white">${comp.netSavings.toLocaleString('es-AR')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-700/50 p-2 rounded-xl">
                {comp.verdict}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Canasta de Compras Editable (Agregar / Quitar Productos) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4" />
              Tu Canasta de Compras ({shoppingList.length} ítems)
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              Productos y Cantidades a Optimizar
            </h3>
          </div>

          {/* Buscador de Productos */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Buscar producto o agregar custom..."
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomProduct()}
              className="w-full pl-8 pr-16 py-2 text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            {productSearchQuery && (
              <button
                onClick={handleAddCustomProduct}
                className="absolute right-1.5 top-1.5 px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg"
              >
                + Sumar
              </button>
            )}
          </div>
        </div>

        {/* Dropdown de Resultados de Búsqueda */}
        {filteredCatalog.length > 0 && (
          <div className="mb-4 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 px-2">Sugerencias del Catálogo:</span>
            {filteredCatalog.map((cp) => (
              <button
                key={cp.id}
                onClick={() => handleAddCatalogProduct(cp)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-white dark:hover:bg-slate-700 rounded-xl flex items-center justify-between transition-colors"
              >
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {cp.name} ({cp.brand})
                </span>
                <span className="font-mono text-emerald-600 font-bold">
                  ${cp.averageObservedPrice.toLocaleString('es-AR')}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Quick Picks */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3 text-xs">
          <span className="text-slate-400 text-[11px] shrink-0 font-medium">Básicos rápidos:</span>
          {quickPicks.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => {
                setShoppingList((prev) => [
                  ...prev,
                  {
                    id: `quick-${Date.now()}-${idx}`,
                    name: qp.name,
                    category: qp.cat as Category,
                    quantity: 1,
                    unit: 'un',
                    referencePrice: qp.ref,
                  },
                ]);
              }}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 rounded-xl shrink-0 transition-colors text-[11px] font-medium border border-transparent hover:border-emerald-300"
            >
              + {qp.name}
            </button>
          ))}
        </div>

        {/* Lista de Productos con Steppers */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {shoppingList.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {item.name}
                </div>
                {item.referencePrice && (
                  <div className="text-xs text-slate-500 font-mono">
                    Ref: ${item.referencePrice.toLocaleString('es-AR')} por {item.unit}
                  </div>
                )}
              </div>

              {/* Controles de Cantidad */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => handleUpdateItemQuantity(item.id, -1)}
                    className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-200 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-bold text-xs font-mono text-slate-900 dark:text-white">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleUpdateItemQuantity(item.id, 1)}
                    className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 transition-colors rounded-xl"
                  title="Eliminar producto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL GOOGLE CALENDAR */}
      {isCalendarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Agendar en Google Calendar
                </h3>
                <p className="text-xs text-slate-500">
                  Crea un evento con paradas, carritos y medios de pago
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs space-y-1.5 border border-slate-200/60 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha elegida:</span>
                <strong className="text-slate-900 dark:text-white">{routePlan.dayName} {routePlan.date}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Comercios:</span>
                <strong className="text-slate-900 dark:text-white">{routePlan.storeCarts.length} paradas</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ahorro Neto Proyectado:</span>
                <strong className="text-emerald-600 font-mono font-bold">${routePlan.totalNetSavings.toLocaleString('es-AR')}</strong>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Hora de inicio del recorrido:
              </label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-xl"
              />
            </div>

            {calendarStatusMessage && (
              <div className={`p-3 rounded-xl text-xs ${
                calendarSchedulingStatus === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}>
                {calendarStatusMessage}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsCalendarModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCalendarSchedule}
                disabled={calendarSchedulingStatus === 'loading'}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                {calendarSchedulingStatus === 'loading' ? 'Agendando...' : 'Confirmar y Agendar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GOOGLE SHEETS */}
      {isSheetsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-600">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Exportar a Google Sheets
                </h3>
                <p className="text-xs text-slate-500">
                  Crea una hoja de cálculo en tu Google Drive
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs space-y-1.5 border border-slate-200/60 dark:border-slate-700">
              <p className="text-slate-600 dark:text-slate-300">
                Se creará una nueva planilla con el desglose de los {routePlan.storeCarts.length} carritos, productos asignados, ahorros brutos, imputación de transporte y ahorro neto final.
              </p>
            </div>

            {sheetsStatusMessage && (
              <div className={`p-3 rounded-xl text-xs ${
                sheetsExportStatus === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}>
                <p>{sheetsStatusMessage}</p>
                {createdSheetUrl && (
                  <a
                    href={createdSheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 font-bold text-emerald-700 dark:text-emerald-300 underline flex items-center gap-1"
                  >
                    <span>Abrir hoja en Google Sheets</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsSheetsModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                Cerrar
              </button>
              <button
                onClick={handleConfirmSheetsExport}
                disabled={sheetsExportStatus === 'loading'}
                className="w-1/2 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                {sheetsExportStatus === 'loading' ? 'Exportando...' : 'Exportar a Drive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
