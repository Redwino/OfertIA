import React, { useState } from 'react';
import { 
  MapPin, 
  Navigation, 
  Filter, 
  ExternalLink, 
  CheckCircle2, 
  Car, 
  Footprints,
  Info,
  ZoomIn,
  ZoomOut,
  Navigation2,
  DollarSign
} from 'lucide-react';
import { Category, Promotion, UserLocation, UserPaymentMethod } from '../types/index.ts';
import { CATEGORY_LABELS } from '../data/promotions.ts';
import { calculateSavings, checkPaymentCompatibility } from '../utils/discount-engine.ts';
import { calculateHaversineDistance, estimateTravelCost, estimateTravelTime } from '../utils/geo-distance.ts';
import { estimateUberRide, calculateNetSavingsWithTravel } from '../utils/uber-integration.ts';

interface MapViewProps {
  promotions: Promotion[];
  userLocation: UserLocation;
  userPaymentMethods: UserPaymentMethod[];
  searchRadiusKm: number;
  onSelectRadius: (radius: number) => void;
  onOpenPromoDetail: (promo: Promotion) => void;
  onOpenLocationModal: () => void;
}

export const MapView: React.FC<MapViewProps> = ({
  promotions,
  userLocation,
  userPaymentMethods,
  searchRadiusKm,
  onSelectRadius,
  onOpenPromoDetail,
  onOpenLocationModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [onlyCompatible, setOnlyCompatible] = useState<boolean>(false);
  const [isTripDedicated, setIsTripDedicated] = useState<boolean>(true);

  // Filtrar promociones presenciales con coordenadas válidas
  const physicalPromos = promotions.filter((p) => !p.isOnlineOnly && p.coordinates.lat !== 0);

  const mappedPromos = physicalPromos.map((promo) => {
    const distanceKm = calculateHaversineDistance(
      userLocation.lat,
      userLocation.lng,
      promo.coordinates.lat,
      promo.coordinates.lng
    );

    const paymentStatus = checkPaymentCompatibility(promo, userPaymentMethods);
    const savings = calculateSavings(50000, promo, distanceKm, isTripDedicated);
    const uber = estimateUberRide(
      userLocation.lat,
      userLocation.lng,
      promo.coordinates.lat,
      promo.coordinates.lng,
      distanceKm,
      userLocation.city
    );

    return {
      promo,
      distanceKm,
      paymentStatus,
      savings,
      uber,
    };
  });

  const filteredPromos = mappedPromos.filter((item) => {
    if (item.distanceKm > searchRadiusKm) return false;
    if (selectedCategory !== 'todas' && item.promo.category !== selectedCategory) return false;
    if (onlyCompatible && !item.paymentStatus.isCompatible) return false;
    return true;
  });

  const mapCenterLat = userLocation.lat;
  const mapCenterLng = userLocation.lng;
  const degRange = ((searchRadiusKm * 1.15) / 111) * (1 / zoomLevel);

  const getSvgCoords = (lat: number, lng: number) => {
    const centerX = 400;
    const centerY = 300;
    const deltaLng = lng - mapCenterLng;
    const deltaLat = lat - mapCenterLat;
    const scale = 300 / degRange;
    return {
      x: centerX + deltaLng * scale,
      y: centerY - deltaLat * scale,
    };
  };

  const selectedItem = mappedPromos.find((m) => m.promo.id === selectedPromoId);

  return (
    <div className="space-y-4">
      {/* Barra de control y filtros del mapa */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
            <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              Mapa de Comercios y Sucursales OfertIA
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Centro: <strong className="text-slate-700 dark:text-slate-300">{userLocation.label}</strong> ({filteredPromos.length} sucursales dentro de {searchRadiusKm} km)
            </div>
          </div>
        </div>

        {/* Controles de Radio y Filtros */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2">Radio:</span>
            {[2, 5, 10, 20].map((km) => (
              <button
                key={km}
                onClick={() => onSelectRadius(km)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  searchRadiusKm === km
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {km} km
              </button>
            ))}
          </div>

          <button
            onClick={() => setOnlyCompatible(!onlyCompatible)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 ${
              onlyCompatible
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mis Tarjetas Solamente</span>
          </button>
        </div>
      </div>

      {/* Contenedor del Mapa Interactivo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-slate-950 rounded-3xl overflow-hidden relative border border-slate-800 shadow-md h-[550px] select-none flex flex-col">
          {/* Zoom controls */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700 shadow-lg">
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.3))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Acercar mapa"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.3))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Alejar mapa"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenLocationModal}
              className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded-lg transition-colors"
              title="Centrar en mi ubicación"
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>

          {/* SVG Map Canvas */}
          <div className="flex-1 w-full h-full relative">
            <svg
              className="w-full h-full"
              viewBox="0 0 800 600"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                </pattern>
                <radialGradient id="userRadiusGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="70%" stopColor="#10b981" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>
              </defs>

              <rect width="800" height="600" fill="#0b1120" />
              <rect width="800" height="600" fill="url(#grid)" />

              {/* Anillos de distancia */}
              {[1, 2, 5, 10].map((radiusKm) => {
                const pixelRadius = ((radiusKm / 111) / degRange) * 300;
                return (
                  <g key={radiusKm}>
                    <circle
                      cx="400"
                      cy="300"
                      r={pixelRadius}
                      fill="none"
                      stroke="rgba(16, 185, 129, 0.2)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x="405"
                      y={300 - pixelRadius + 12}
                      fill="rgba(16, 185, 129, 0.6)"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {radiusKm} km
                    </text>
                  </g>
                );
              })}

              <circle cx="400" cy="300" r="70" fill="url(#userRadiusGrad)" />

              {/* Pin de ubicación del usuario */}
              <g transform="translate(400, 300)">
                <circle r="12" fill="#10b981" fillOpacity="0.3" className="animate-ping" />
                <circle r="7" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                <text
                  x="12"
                  y="4"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="bold"
                >
                  Tú ({userLocation.label})
                </text>
              </g>

              {/* Pines de los comercios */}
              {filteredPromos.map((item) => {
                const { x, y } = getSvgCoords(item.promo.coordinates.lat, item.promo.coordinates.lng);
                const isSelected = selectedPromoId === item.promo.id;
                const isCompatible = item.paymentStatus.isCompatible;
                const pinColor = isCompatible ? '#10b981' : '#f59e0b';

                return (
                  <g
                    key={item.promo.id}
                    transform={`translate(${x}, ${y})`}
                    className="cursor-pointer transition-transform hover:scale-125"
                    onClick={() => setSelectedPromoId(item.promo.id)}
                  >
                    {isSelected && (
                      <circle r="22" fill="#38bdf8" fillOpacity="0.4" className="animate-pulse" />
                    )}

                    <circle
                      r={isSelected ? 14 : 10}
                      fill={pinColor}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />

                    <text
                      textAnchor="middle"
                      dy="4"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {item.promo.discountPercentage}%
                    </text>

                    <text
                      textAnchor="middle"
                      dy={isSelected ? -18 : -14}
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      className="drop-shadow-md select-none pointer-events-none"
                    >
                      {item.promo.storeName}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Leyenda */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-700/80 text-[11px] text-slate-300 flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Compatible con tu medio</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span>Requiere otro banco/tarjeta</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel lateral: Detalle de la sucursal seleccionada + Integración con Uber */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between h-[550px] overflow-hidden shadow-xs">
          {selectedItem ? (
            <div className="space-y-4 overflow-y-auto pr-1">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                  Sucursal Seleccionada
                </span>
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                  a {selectedItem.distanceKm} km
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedItem.promo.storeName}
                </h3>
                <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {selectedItem.promo.branchName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                  <span>{selectedItem.promo.coordinates.address}</span>
                </div>
              </div>

              {/* Descuento y Ahorro */}
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300">
                    {selectedItem.promo.discountPercentage}% de Descuento
                  </span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                    ${selectedItem.savings.actualSavings.toLocaleString('es-AR')}
                  </span>
                </div>
                <div className="text-xs text-emerald-800 dark:text-emerald-300">
                  {selectedItem.promo.issuer} ({selectedItem.promo.paymentInstrument})
                </div>
              </div>

              {/* Integración con Uber */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <Car className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <span>Estimación de Viaje con Uber:</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-600">
                    {selectedItem.uber.formattedEstimate}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Tiempo en auto: ~{selectedItem.uber.durationMinutes} min</span>
                  <span>Distancia: {selectedItem.distanceKm} km</span>
                </div>

                <a
                  href={selectedItem.uber.deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 bg-black text-white hover:bg-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Navigation2 className="w-3.5 h-3.5" />
                  <span>Pedir Uber a esta sucursal</span>
                </a>
              </div>

              {/* Botón de ficha completa */}
              <div>
                <button
                  onClick={() => onOpenPromoDetail(selectedItem.promo)}
                  className="w-full py-2.5 px-3 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Ver Ficha Completa y Auditoría</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500">
              <MapPin className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Selecciona una sucursal en el mapa
              </div>
              <div className="text-xs text-slate-400 mt-1 max-w-xs">
                Haz clic en los pines para ver distancias, cotizaciones de Uber y promociones vigentes.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
