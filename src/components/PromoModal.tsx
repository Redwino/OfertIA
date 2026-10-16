import React from 'react';
import { 
  X, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  CreditCard, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  ExternalLink,
  Percent,
  Calendar
} from 'lucide-react';
import { Promotion, UserLocation, UserPaymentMethod } from '../types/index.ts';
import { CATEGORY_LABELS } from '../data/promotions.ts';
import { checkPaymentCompatibility } from '../utils/discount-engine.ts';
import { calculateHaversineDistance, estimateTravelTime } from '../utils/geo-distance.ts';

interface PromoModalProps {
  promo: Promotion | null;
  onClose: () => void;
  userLocation: UserLocation;
  userPaymentMethods: UserPaymentMethod[];
}

export const PromoModal: React.FC<PromoModalProps> = ({
  promo,
  onClose,
  userLocation,
  userPaymentMethods,
}) => {
  if (!promo) return null;

  const distanceKm = promo.isOnlineOnly
    ? 0
    : calculateHaversineDistance(
        userLocation.lat,
        userLocation.lng,
        promo.coordinates.lat,
        promo.coordinates.lng
      );

  const payment = checkPaymentCompatibility(promo, userPaymentMethods);
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const daysText = promo.applicableDays.map((d) => dayNames[d]).join(', ');

  const reachCapAmount =
    promo.maxCashback > 0
      ? Math.round(promo.maxCashback / (promo.discountPercentage / 100))
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
        role="dialog"
        aria-labelledby="promo-detail-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="capitalize">{CATEGORY_LABELS[promo.category]?.label || promo.category}</span>
            <span aria-hidden="true">·</span>
            <span>ID: {promo.id}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Cerrar ficha de promoción"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Título principal y estado de verificación */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                  promo.verificationStatus === 'VERIFIED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : promo.verificationStatus === 'PARTIAL'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  {promo.verificationStatus === 'VERIFIED'
                    ? 'Promoción Oficial Verificada'
                    : promo.verificationStatus === 'PARTIAL'
                    ? 'Información Parcial'
                    : 'En Proceso de Confirmación'}
                </span>
              </span>

              <span className="text-xs text-slate-400">
                Confianza: {promo.confidenceScore}% · Verificado el {promo.verifiedAt}
              </span>
            </div>

            <h1 id="promo-detail-title" className="text-xl font-bold text-slate-900 leading-snug">
              {promo.title}
            </h1>
            <div className="text-xs text-slate-600 font-medium mt-1">
              {promo.storeName} — {promo.branchName}
            </div>
          </div>

          {/* Tarjetas de Métricas Clave */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">% Descuento</div>
              <div className="text-2xl font-bold font-mono text-emerald-700 mt-0.5">
                {promo.discountPercentage}%
              </div>
              <div className="text-[10px] text-slate-400">Nominal en caja/resumen</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">Tope de Reintegro</div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5">
                {promo.maxCashback > 0 ? `$${promo.maxCashback.toLocaleString('es-AR')}` : 'Sin tope'}
              </div>
              <div className="text-[10px] text-slate-400">Por cuenta / período</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">Gasto Óptimo</div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5">
                {reachCapAmount ? `$${reachCapAmount.toLocaleString('es-AR')}` : 'Cualquiera'}
              </div>
              <div className="text-[10px] text-slate-400">Monto para saturar tope</div>
            </div>
          </div>

          {/* Información Geográfica y Sucursal */}
          <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs border border-slate-100">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Sucursal y Coordenadas de Referencia</span>
            </div>
            <div className="text-slate-600">
              {promo.isOnlineOnly ? (
                <span>Válido exclusivamente para compras por internet o app oficial.</span>
              ) : (
                <>
                  <div>Dirección: <strong>{promo.coordinates.address}</strong></div>
                  <div>Distancia aproximada desde tu ubicación actual ({userLocation.label}): <strong>{distanceKm} km</strong> ({estimateTravelTime(distanceKm, 'car')})</div>
                </>
              )}
            </div>
          </div>

          {/* Instrumento y Compatibilidad */}
          <div className="space-y-3 text-xs">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-slate-600" />
              <span>Medio de Pago y Requisitos</span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-500">Entidad emisora:</span>
                <div className="font-semibold text-slate-800">{promo.issuer}</div>
              </div>
              <div>
                <span className="text-slate-500">Instrumento admitido:</span>
                <div className="font-semibold text-slate-800">{promo.paymentInstrument}</div>
              </div>
              <div>
                <span className="text-slate-500">Días habilitados:</span>
                <div className="font-semibold text-slate-800">{daysText}</div>
              </div>
              <div>
                <span className="text-slate-500">Modalidad de acreditación:</span>
                <div className="font-semibold text-slate-800 capitalize">
                  {promo.benefitType.replace('_', ' ')}
                </div>
              </div>
            </div>

            {/* Estado con tus medios */}
            <div>
              {payment.isCompatible ? (
                <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Cumples las condiciones. Aplica con tu <strong>{payment.matchingMethod?.name}</strong>.
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{payment.reasons.join(' ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Letra chica y Exclusiones */}
          <div className="space-y-2 text-xs">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-600" />
              <span>Términos, Restricciones y Letra Chica</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-slate-600 leading-relaxed">
              <p>{promo.terms}</p>
              {promo.exclusions.length > 0 && (
                <div>
                  <strong className="text-slate-800">Productos o rubros excluidos:</strong> {promo.exclusions.join(', ')}.
                </div>
              )}
              {promo.compatibilityNotes && (
                <div>
                  <strong className="text-slate-800">Compatibilidad:</strong> {promo.compatibilityNotes}
                </div>
              )}
            </div>
          </div>

          {/* Fuente Oficial y Auditoría */}
          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100">
            <div>
              Fuente de información: <strong className="text-slate-600">{promo.source}</strong>
            </div>
            <div>
              Vigencia: {promo.startDate} al {promo.endDate}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
