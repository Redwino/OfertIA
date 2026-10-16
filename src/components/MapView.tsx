import React, { useState } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  InfoWindow, 
  Pin 
} from '@vis.gl/react-google-maps';
import { 
  MapPin, 
  Navigation, 
  Filter, 
  ExternalLink, 
  CheckCircle2, 
  Car, 
  Calendar,
  Footprints,
  Info,
  DollarSign,
  Store,
  Layers,
  ChevronRight
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
  onScheduleInCalendar?: (promo: Promotion) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  promotions,
  userLocation,
  userPaymentMethods,
  searchRadiusKm,
  onSelectRadius,
  onOpenPromoDetail,
  onOpenLocationModal,
  onScheduleInCalendar,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const [onlyCompatible, setOnlyCompatible] = useState<boolean>(false);
  const [isTripDedicated, setIsTripDedicated] = useState<boolean>(true);
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');

  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

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
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Google Maps — Comercios y Descuentos OfertIA</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                Oficial GMP
              </span>
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

          {/* Toggle de Modo de Mapa */}
          <button
            onClick={() => setMapType(mapType === 'roadmap' ? 'hybrid' : 'roadmap')}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5"
            title="Cambiar capa de mapa"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{mapType === 'roadmap' ? 'Satélite' : 'Mapa estándar'}</span>
          </button>

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

      {/* Contenedor del Mapa Interactivo con Google Maps Platform */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-slate-950 rounded-3xl overflow-hidden relative border border-slate-800 shadow-md h-[550px] flex flex-col">
          {apiKey ? (
            <APIProvider apiKey={apiKey}>
              <Map
                id="ofertia-google-map"
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                defaultCenter={{ lat: userLocation.lat, lng: userLocation.lng }}
                defaultZoom={13}
                gestureHandling="greedy"
                disableDefaultUI={false}
                mapTypeId={mapType}
                style={{ width: '100%', height: '100%' }}
              >
                {/* AdvancedMarker para la ubicación del usuario */}
                <AdvancedMarker
                  position={{ lat: userLocation.lat, lng: userLocation.lng }}
                  title={`Tu ubicación (${userLocation.label})`}
                >
                  <div className="relative flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-60"></span>
                    <div className="relative w-6 h-6 rounded-full bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-bold">
                      Tú
                    </div>
                  </div>
                </AdvancedMarker>

                {/* AdvancedMarkers para cada sucursal/comercio con promoción */}
                {filteredPromos.map((item) => {
                  const isSelected = selectedPromoId === item.promo.id;
                  const isCompatible = item.paymentStatus.isCompatible;

                  return (
                    <AdvancedMarker
                      key={item.promo.id}
                      position={{
                        lat: item.promo.coordinates.lat,
                        lng: item.promo.coordinates.lng,
                      }}
                      title={`${item.promo.storeName} - ${item.promo.discountPercentage}%`}
                      onClick={() => setSelectedPromoId(item.promo.id)}
                    >
                      <Pin
                        background={isCompatible ? '#059669' : '#d97706'}
                        borderColor="#ffffff"
                        glyphColor="#ffffff"
                        scale={isSelected ? 1.25 : 1.0}
                      />
                    </AdvancedMarker>
                  );
                })}

                {/* InfoWindow al seleccionar una sucursal */}
                {selectedItem && (
                  <InfoWindow
                    position={{
                      lat: selectedItem.promo.coordinates.lat,
                      lng: selectedItem.promo.coordinates.lng,
                    }}
                    onCloseClick={() => setSelectedPromoId(null)}
                  >
                    <div className="p-1 max-w-[260px] text-slate-900 font-sans">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {CATEGORY_LABELS[selectedItem.promo.category]?.label || selectedItem.promo.category}
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-slate-500">
                          {selectedItem.distanceKm} km
                        </span>
                      </div>

                      <h4 className="font-bold text-sm leading-tight text-slate-900">
                        {selectedItem.promo.storeName}
                      </h4>
                      <p className="text-xs text-slate-600 font-medium">
                        {selectedItem.promo.branchName} — {selectedItem.promo.coordinates.address}
                      </p>

                      <div className="my-2 p-2 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-emerald-700">
                            {selectedItem.promo.discountPercentage}% de descuento
                          </span>
                          <span className="font-mono text-slate-700">
                            Tope: ${selectedItem.promo.maxCashback.toLocaleString('es-AR')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Pagas con: <strong>{selectedItem.promo.paymentInstrument}</strong> ({selectedItem.promo.issuer})
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center justify-between">
                          <span>Viaje Uber estimado:</span>
                          <span className="font-mono">{selectedItem.uber.formattedEstimate}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mt-2">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${selectedItem.promo.coordinates.lat},${selectedItem.promo.coordinates.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 text-center py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>Cómo llegar</span>
                        </a>

                        <button
                          onClick={() => {
                            if (onScheduleInCalendar) {
                              onScheduleInCalendar(selectedItem.promo);
                            }
                          }}
                          className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                          title="Agendar en Google Calendar"
                        >
                          <Calendar className="w-3 h-3 text-emerald-600" />
                          <span>Agendar</span>
                        </button>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <MapPin className="w-12 h-12 text-emerald-500 mb-3 animate-bounce" />
              <p className="font-semibold text-slate-200">Inicializando Google Maps Platform...</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Configurando la clave de API oficial de Google Maps con soporte para AdvancedMarker y cálculo de rutas.
              </p>
            </div>
          )}
        </div>

        {/* Panel lateral de Comercios y Sucursales */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col shadow-xs h-[550px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Comercios Cercanos
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {filteredPromos.length} sucursales activas
              </div>
            </div>

            {/* Selector de Categoría */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="todas">Todos los rubros</option>
              {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => (
                <option key={catKey} value={catKey}>
                  {label.label}
                </option>
              ))}
            </select>
          </div>

          {/* Lista scrolleable de comercios */}
          <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1">
            {filteredPromos.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No hay comercios con las promociones seleccionadas en este radio. Prueba ampliar a 10 km o 20 km.
              </div>
            ) : (
              filteredPromos.map((item) => {
                const isSelected = selectedPromoId === item.promo.id;
                const isCompatible = item.paymentStatus.isCompatible;

                return (
                  <div
                    key={item.promo.id}
                    onClick={() => setSelectedPromoId(item.promo.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs'
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {item.promo.storeName}
                      </div>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                        {item.distanceKm} km
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {item.promo.branchName} • {item.promo.coordinates.address}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {item.promo.discountPercentage}% OFF
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        Tope ${item.promo.maxCashback.toLocaleString('es-AR')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                      <span className="truncate max-w-[170px]">{item.promo.issuer}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPromoDetail(item.promo);
                        }}
                        className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center"
                      >
                        <span>Ver detalles</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
