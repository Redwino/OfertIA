import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Tag, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { Category, Promotion, UserLocation, UserPaymentMethod } from '../types/index.ts';
import { CATEGORY_LABELS } from '../data/promotions.ts';
import { checkPaymentCompatibility } from '../utils/discount-engine.ts';

interface CalendarViewProps {
  promotions: Promotion[];
  userLocation: UserLocation;
  userPaymentMethods: UserPaymentMethod[];
  onOpenPromoDetail: (promo: Promotion) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  promotions,
  userLocation,
  userPaymentMethods,
  onOpenPromoDetail,
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [onlyCompatible, setOnlyCompatible] = useState<boolean>(true);

  const daysOfWeek = [
    { index: 1, label: 'Lunes', short: 'Lun' },
    { index: 2, label: 'Martes', short: 'Mar' },
    { index: 3, label: 'Miércoles', short: 'Mié' },
    { index: 4, label: 'Jueves', short: 'Jue' },
    { index: 5, label: 'Viernes', short: 'Vie' },
    { index: 6, label: 'Sábado', short: 'Sáb' },
    { index: 0, label: 'Domingo', short: 'Dom' },
  ];

  // Organizar promociones por día de la semana
  const dayPromotions = promotions.filter((promo) => {
    if (promo.verificationStatus === 'EXPIRED') return false;
    if (!promo.applicableDays.includes(selectedDay)) return false;
    if (selectedCategory !== 'todas' && promo.category !== selectedCategory) return false;

    if (onlyCompatible) {
      const compatibility = checkPaymentCompatibility(promo, userPaymentMethods);
      if (!compatibility.isCompatible) return false;
    }

    return true;
  });

  const currentDayInfo = daysOfWeek.find((d) => d.index === selectedDay) || daysOfWeek[0];
  const isToday = selectedDay === new Date().getDay();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
              <CalendarIcon className="w-4 h-4 text-emerald-600" />
              <span>Cronograma Semanal de Ahorro</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              ¿Qué día conviene comprar cada rubro?
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Planifica tu semana para coordinar carnicería, combustible, farmacia y supermercado en sus días de máxima bonificación.
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl cursor-pointer self-start md:self-auto">
            <input
              type="checkbox"
              checked={onlyCompatible}
              onChange={(e) => setOnlyCompatible(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <span>Solo ofertas compatibles con mis tarjetas</span>
          </label>
        </div>

        {/* Selector de días de la semana (Lunes a Domingo) */}
        <div className="grid grid-cols-7 gap-2 mt-6 pt-6 border-t border-slate-100">
          {daysOfWeek.map((day) => {
            const isSelected = selectedDay === day.index;
            const isTodayDay = day.index === new Date().getDay();

            // Contar promociones para ese día
            const countForDay = promotions.filter((p) => {
              if (!p.applicableDays.includes(day.index)) return false;
              if (onlyCompatible) {
                return checkPaymentCompatibility(p, userPaymentMethods).isCompatible;
              }
              return true;
            }).length;

            return (
              <button
                key={day.index}
                onClick={() => setSelectedDay(day.index)}
                className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all border text-center ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="text-[11px] font-medium uppercase tracking-wider">
                  {day.short}
                </div>
                <div className="text-base font-bold mt-0.5">
                  {day.label}
                </div>
                {isTodayDay && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded mt-1 ${isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-100 text-emerald-800'}`}>
                    HOY
                  </span>
                )}
                <div className={`text-[10px] mt-1 font-mono ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {countForDay} ofertas
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Regla de prudencia financiera */}
      <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Consejo del Planificador:</strong> No gastes de más solo porque existe un descuento. Agrupa las compras que ya tenías previstas (como llenar el tanque o reponer despensa) en el día exacto de la promoción para maximizar el reintegro sin sobreendeudarte.
        </div>
      </div>

      {/* Listado de Oportunidades para el Día Seleccionado */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Promociones recomendadas para el {currentDayInfo.label} {isToday && '(Hoy)'}
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {dayPromotions.length} oportunidades encontradas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dayPromotions.map((promo) => {
            const payment = checkPaymentCompatibility(promo, userPaymentMethods);

            return (
              <div
                key={promo.id}
                className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 capitalize">
                      {CATEGORY_LABELS[promo.category]?.label || promo.category}
                    </span>
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {promo.discountPercentage}% OFF
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">{promo.title}</h3>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {promo.storeName} · {promo.branchName}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-100">
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-500">Medio a utilizar:</span>
                      <strong className="text-slate-900">{promo.issuer} ({promo.paymentInstrument})</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-500">Tope de reintegro:</span>
                      <strong className="font-mono text-slate-900">
                        {promo.maxCashback > 0 ? `$${promo.maxCashback.toLocaleString('es-AR')}` : 'Sin tope'}
                      </strong>
                    </div>
                    {promo.applicableHours && (
                      <div className="flex justify-between text-slate-600">
                        <span className="text-slate-500">Horario habilitado:</span>
                        <span>{promo.applicableHours.start} a {promo.applicableHours.end} hs</span>
                      </div>
                    )}
                  </div>

                  {payment.isCompatible ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 p-2 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Tienes medio compatible: <strong>{payment.matchingMethod?.name}</strong></span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 p-2 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{payment.reasons[0]}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => onOpenPromoDetail(promo)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <span>Ver detalles y exclusiones</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {dayPromotions.length === 0 && (
            <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500">
              <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="font-semibold text-slate-800">No hay promociones registradas para este día</div>
              <div className="text-xs text-slate-400 mt-1">
                Prueba desmarcar &quot;Solo ofertas compatibles&quot; o consulta otro día de la semana.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
