import React, { useState } from 'react';
import { 
  MapPin, 
  Navigation, 
  Search, 
  Star, 
  Check, 
  X, 
  AlertCircle, 
  LocateFixed 
} from 'lucide-react';
import { UserLocation } from '../types/index.ts';
import { DEFAULT_LOCATIONS } from '../data/promotions.ts';

interface LocationSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: UserLocation;
  onSelectLocation: (location: UserLocation) => void;
  searchRadiusKm: number;
  onSelectRadius: (radius: number) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
  searchRadiusKm,
  onSelectRadius,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Manejo de geolocalización con el navegador
  const handleRequestGPS = () => {
    setGpsLoading(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('La geolocalización no es compatible con tu navegador actual.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation: UserLocation = {
          type: 'gps',
          label: 'Ubicación actual del dispositivo',
          lat: latitude,
          lng: longitude,
          address: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
          city: 'Ubicación GPS detectada',
        };
        onSelectLocation(newLocation);
        setGpsLoading(false);
        onClose();
      },
      (error) => {
        setGpsLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError('Permiso de ubicación denegado. Puedes seleccionar o buscar manualmente tu barrio o ciudad.');
        } else {
          setGpsError('No se pudo determinar tu posición geográfica actual. Selecciona una ubicación predeterminada.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const filteredPresetLocations = DEFAULT_LOCATIONS.filter((loc) =>
    loc.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (loc.neighborhood && loc.neighborhood.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-labelledby="location-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h2 id="location-modal-title" className="text-base font-semibold text-slate-900">
              Seleccionar tu ubicación de compra
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Cerrar selector de ubicación"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Opción 1: Activar GPS */}
          <div>
            <button
              onClick={handleRequestGPS}
              disabled={gpsLoading}
              className="w-full flex items-center justify-between p-3.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <LocateFixed className={`w-5 h-5 ${gpsLoading ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-emerald-950">
                    {gpsLoading ? 'Detectando posición...' : 'Usar mi ubicación GPS actual'}
                  </div>
                  <div className="text-xs text-emerald-700">
                    Detecta automáticamente comercios y sucursales alrededor tuyo
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded">
                Automático
              </span>
            </button>

            {gpsError && (
              <div className="mt-2.5 flex items-start gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-xs border border-amber-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>{gpsError}</span>
              </div>
            )}
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-xs text-slate-400 font-medium absolute">
              o selecciona manualmente
            </span>
          </div>

          {/* Buscador de zonas */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar barrio, calle o ciudad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Lista de ubicaciones sugeridas */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {filteredPresetLocations.map((loc) => {
              const isSelected =
                currentLocation.lat === loc.lat && currentLocation.lng === loc.lng;

              return (
                <button
                  key={loc.label}
                  onClick={() => {
                    onSelectLocation(loc);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors text-xs ${
                    isSelected
                      ? 'bg-slate-900 text-white font-medium'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-semibold">{loc.label}</div>
                      <div className={isSelected ? 'text-slate-300' : 'text-slate-500'}>
                        {loc.address}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Radio de búsqueda */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Radio de búsqueda de comercios:
              </label>
              <span className="text-xs font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Hasta {searchRadiusKm} km
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[2, 5, 10, 25].map((km) => (
                <button
                  key={km}
                  onClick={() => onSelectRadius(km)}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    searchRadiusKm === km
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {km} km
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>La ubicación se utiliza únicamente para calcular distancias a sucursales.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
